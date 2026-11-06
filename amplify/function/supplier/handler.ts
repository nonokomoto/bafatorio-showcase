import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall, NativeAttributeValue } from "@aws-sdk/util-dynamodb"; // Helper to convert JS objects to/from DynamoDB format
import type { AppSyncResolverEvent } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

// Define the structure for EventSupplier based on the GraphQL schema
type EventSupplier = {
    id: string;
    eventId: string;
    supplierId: string;
    quoteAmount?: number | null;
    status?: 'PENDING' | 'COUNTING_ON' | 'APPROVED' | 'PAID' | 'REJECTED' | null;
    invoiceS3Key?: string;
    paidAt?: string;
    event?: Event;
    supplier?: Supplier;
};

// Define the structure for Event based on the GraphQL schema
type Event = {
    id: string;
    eventTitle?: string;
    eventManager?: string;
    eventManagerEmail?: string;
    eventManagerPhone?: string;
    eventLocation?: string;
    eventCreationDate?: string;
    eventStatus?: string;
    eventType?: string;
    organizerId?: string;
    description?: string;
    categories?: string[];
    budget?: number | null;
    participantCount?: number;
    committedExpenses?: number | null;
    effectiveExpenses?: number | null;
};

// Define minimal Supplier structure needed for references
type Supplier = {
    id: string;
    name?: string;
};

// Arguments expected from the AppSync mutation
type HandlerArguments = {
    eventSupplierId: string;
    quoteAmount?: number | null;
};

// Return type matching the GraphQL schema definition for the mutation
type HandlerReturn = EventSupplier | null;

// Initialize DynamoDB client using the AWS region from environment variables
const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const client = new DynamoDBClient({ region });

// Retrieve DynamoDB table names from environment variables set by Amplify
const EVENT_SUPPLIER_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME;
const EVENT_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_TABLE_NAME;
const COLLABORATOR_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME;
const USER_SUBSCRIPTION_TABLE_NAME = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

/**
 * Handles the APPROVAL of an EventSupplier (PENDING/COUNTING_ON/REJECTED -> APPROVED).
 * Updates EventSupplier status, increments Event.committedExpenses,
 * and decrements Event.budget if a valid quote exists.
 * Only the event OWNER can perform this action.
 */
export const handler = async (
  event: AppSyncResolverEvent<HandlerArguments>
): Promise<HandlerReturn> => {
    const { eventSupplierId, quoteAmount: incomingQuote } = event.arguments;

    // Access control: extract caller identity
    const identity = event.identity as { sub?: string };
    const userId = identity?.sub;
    if (!userId) {
        throw new Error('User identity not found');
    }

    // Pre-flight checks for configuration and input
    if (!EVENT_SUPPLIER_TABLE_NAME || !EVENT_TABLE_NAME || !COLLABORATOR_TABLE_NAME) {
        throw new Error("Internal server configuration error.");
    }
    if (!eventSupplierId) {
         throw new Error("eventSupplierId is required.");
    }

    try {
        // 1. Fetch the target EventSupplier with strong consistency
        const getSupplierCmd = new GetItemCommand({
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ id: eventSupplierId }),
            ConsistentRead: true,
        });
        const supplierResult = await client.send(getSupplierCmd);
        const eventSupplier = supplierResult.Item ? unmarshall(supplierResult.Item) as EventSupplier : undefined;

        if (!eventSupplier) {
            throw new Error(`Resource not found during approval: Requested resource not found`);
        }

        // 2. Access control: delegate to shared event permission matrix (ADR-015)
        const access = await resolveEventAccess({
            eventTableName: EVENT_TABLE_NAME,
            collaboratorTableName: COLLABORATOR_TABLE_NAME,
            eventId: eventSupplier.eventId,
            userId,
        });
        if (!access.hasPermission(EVENT_PERMISSIONS.SUPPLIER_APPROVE)) {
            throw new Error('Unauthorized: caller lacks supplier:approve permission');
        }

        // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
        await ensureEventWritable({
            eventTableName: EVENT_TABLE_NAME,
            subscriptionTableName: USER_SUBSCRIPTION_TABLE_NAME,
            eventId: eventSupplier.eventId,
            // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
            eventRecord: access.eventRecord,
        });

        // 3. Check conditions before proceeding
        const currentStatus = eventSupplier.status;
        if (currentStatus === 'APPROVED' || currentStatus === 'PAID') {
            console.log(`EventSupplier ${eventSupplierId} is already ${currentStatus}. No action needed for approval.`);
            return eventSupplier; // Return current state if already approved/paid
        }

        // Only proceed if status allows approval (PENDING, COUNTING_ON, REJECTED, or null/undefined)
        if (currentStatus && !['PENDING', 'COUNTING_ON', 'REJECTED'].includes(currentStatus)) {
             console.warn(`EventSupplier ${eventSupplierId} has status ${currentStatus}. Cannot approve from this state.`);
             // Consider throwing an error or returning current state based on desired behavior
             throw new Error(`Cannot approve EventSupplier from status: ${currentStatus}`);
             // return eventSupplier; // Alternative: return current state without error
        }

        const { eventId, quoteAmount } = eventSupplier;
        // Prefer incomingQuote (from UI) over stored value — bypasses AppSync rules.owner() on EventSupplier update
        const effectiveQuote = incomingQuote ?? quoteAmount;
        const validQuote = (typeof effectiveQuote === 'number' && effectiveQuote > 0);

        // 3. Prepare transaction items
        const transactItems = [];

        // Item 1: Update EventSupplier status + approvalStatus to APPROVED (+ quoteAmount if provided by caller)
        // approvalStatus is kept in sync with status so both fields always agree.
        const supplierUpdateExpression = incomingQuote != null
            ? "SET #st = :approvedStatus, approvalStatus = :approvedStatus, quoteAmount = :quote"
            : "SET #st = :approvedStatus, approvalStatus = :approvedStatus";
        const supplierAttributeValues: Record<string, NativeAttributeValue> = {
            ":approvedStatus": "APPROVED",
            ":paidStatus": "PAID",
        };
        if (incomingQuote != null) {
            supplierAttributeValues[":quote"] = incomingQuote;
        }
        transactItems.push({
            Update: {
                TableName: EVENT_SUPPLIER_TABLE_NAME,
                Key: marshall({ id: eventSupplierId }),
                UpdateExpression: supplierUpdateExpression,
                ExpressionAttributeNames: { "#st": "status" },
                ExpressionAttributeValues: marshall(supplierAttributeValues),
                // Condition: Ensure status is not already Approved or Paid
                ConditionExpression: "attribute_not_exists(#st) OR (#st <> :approvedStatus AND #st <> :paidStatus)",
            },
        });

        // Item 2: Update Event financials (committedExpenses) - ONLY if valid quote
        if (validQuote) {
            console.log(`EventSupplier ${eventSupplierId} approved with quote ${effectiveQuote}. Updating Event ${eventId} committedExpenses.`);
            transactItems.push({
                Update: {
                    TableName: EVENT_TABLE_NAME,
                    Key: marshall({ id: eventId }),
                    // Increment committedExpenses ONLY
                    // Initialize committedExpenses to 0 if it doesn't exist before adding
                    UpdateExpression: "SET committedExpenses = if_not_exists(committedExpenses, :zero) + :quote",
                    ExpressionAttributeValues: marshall({
                        ":quote": effectiveQuote,
                        ":zero": 0
                    }),
                    // Condition: Ensure the event exists (budget existence no longer required here)
                    ConditionExpression: "attribute_exists(id)",
                },
            });
        } else {
             console.warn(`EventSupplier ${eventSupplierId} approved WITHOUT a valid quote. Only status updated.`);
             // No changes needed for Event financials in this case
        }

        // 4. Execute the transaction to update both items
        console.log(`Preparing approval transaction for ${eventSupplierId} with ${transactItems.length} items.`);
        const transactCmd = new TransactWriteItemsCommand({ TransactItems: transactItems });

        await client.send(transactCmd);
        console.log(`Approval transaction successful for EventSupplier ${eventSupplierId}.`);

        // 5. Return Updated EventSupplier
        // Fetch the latest state to return the most accurate data
         const getUpdatedSupplierCmd = new GetItemCommand({
             TableName: EVENT_SUPPLIER_TABLE_NAME,
             Key: marshall({ id: eventSupplierId }),
         });
         const updatedSupplierResult = await client.send(getUpdatedSupplierCmd);
         if (updatedSupplierResult.Item) {
            return unmarshall(updatedSupplierResult.Item) as EventSupplier;
         } else {
            // Fallback: update local object if fetch fails (shouldn't happen ideally)
            console.warn(`Failed to fetch updated EventSupplier ${eventSupplierId} after transaction. Returning potentially stale local data.`);
            eventSupplier.status = 'APPROVED';
            return eventSupplier;
         }

    } catch (error: any) {
        console.error("Error processing event supplier APPROVAL:", error);

        if (error instanceof ConditionalCheckFailedException || (error.name === 'TransactionCanceledException' && error.CancellationReasons?.some((reason: any) => reason.Code === 'ConditionalCheckFailed'))) {
             console.warn(`Conditional check failed during approval for ${eventSupplierId}. Might be already processed or event budget missing.`);
             // Attempt to return the current state as it might be the desired one (e.g., already approved)
             try {
                 const currentSupplier = await client.send(new GetItemCommand({
                     TableName: EVENT_SUPPLIER_TABLE_NAME, Key: marshall({ id: eventSupplierId })
                 }));
                 if (currentSupplier.Item) {
                    console.log("Returning current supplier state after conditional check failure.");
                    return unmarshall(currentSupplier.Item) as EventSupplier;
                 }
             } catch (readError) {
                 console.error("Failed to re-read supplier state after conditional check failure:", readError);
             }
             // If re-read fails or item not found, throw a specific error
             throw new Error(`Approval failed due to conflict or missing data (e.g., Event budget). Original error: ${error.message}`);
        }

        // Handle other common errors
        if (error.name === 'ResourceNotFoundException') {
             throw new Error(`Resource not found during approval: ${error.message}`);
        }
        if (error.name === 'ValidationException') {
             throw new Error(`Data validation error during approval: ${error.message}`);
        }

        // Re-throw unexpected errors
        throw new Error(`Failed to process approval for EventSupplier ${eventSupplierId}: ${error.message || error.name}`);
    }
};

