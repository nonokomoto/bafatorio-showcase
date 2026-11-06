import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverHandler } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

// Define local types consistent with other handlers
type EventSupplier = {
    id: string;
    eventId: string;
    supplierId: string;
    quoteAmount?: number | null;
    status?: 'PENDING' | 'COUNTING_ON' | 'APPROVED' | 'PAID' | 'REJECTED' | null;
    invoiceS3Key?: string | null;
    paidAt?: string | null;
};

type Event = {
    id: string;
    committedExpenses?: number | null;
};

// Define the expected input arguments
type AdjustApprovedEventSupplierQuoteArgs = {
  eventSupplierId: string;
  newQuoteAmount: number;
};

// Define the expected return type
type AdjustApprovedEventSupplierQuoteResult = EventSupplier | null;

// Environment variables for table names
const EVENT_SUPPLIER_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME;
const EVENT_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_TABLE_NAME;
const COLLABORATOR_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME;
const USER_SUBSCRIPTION_TABLE_NAME = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// Initialize DynamoDB Client
const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const client = new DynamoDBClient({ region });

export const handler: AppSyncResolverHandler<
    AdjustApprovedEventSupplierQuoteArgs,
    AdjustApprovedEventSupplierQuoteResult
> = async (event) => {
    const { eventSupplierId, newQuoteAmount } = event.arguments;

    // Access control: extract caller identity
    const identity = event.identity as { sub?: string };
    const userId = identity?.sub;
    if (!userId) {
        throw new Error('User identity not found');
    }

    // --- Validate Configuration and Input --- //
    if (!EVENT_SUPPLIER_TABLE_NAME || !EVENT_TABLE_NAME || !COLLABORATOR_TABLE_NAME) {
        throw new Error("Internal server configuration error. Missing table names.");
    }

    if (!eventSupplierId || newQuoteAmount === undefined || newQuoteAmount === null) {
        throw new Error("Missing required arguments.");
    }

    if (typeof newQuoteAmount !== 'number' || newQuoteAmount < 0) {
        throw new Error("Invalid quote amount provided. Must be zero or positive.");
    }

    try {
        // --- Step 1: Fetch the current EventSupplier --- //
        const getItemCmd = new GetItemCommand({
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ id: eventSupplierId }),
        });
        const response = await client.send(getItemCmd);

        if (!response.Item) {
            throw new Error(`EventSupplier not found.`);
        }
        const currentEventSupplier = unmarshall(response.Item) as EventSupplier;

        // --- Step 2: Access control — delegate to shared event permission matrix (ADR-015) --- //
        const access = await resolveEventAccess({
            eventTableName: EVENT_TABLE_NAME,
            collaboratorTableName: COLLABORATOR_TABLE_NAME,
            eventId: currentEventSupplier.eventId,
            userId,
        });
        if (!access.hasPermission(EVENT_PERMISSIONS.SUPPLIER_EDIT)) {
            throw new Error('Unauthorized: caller lacks supplier:edit permission');
        }

        // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
        await ensureEventWritable({
            eventTableName: EVENT_TABLE_NAME,
            subscriptionTableName: USER_SUBSCRIPTION_TABLE_NAME,
            eventId: currentEventSupplier.eventId,
            // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
            eventRecord: access.eventRecord,
        });

        // --- Step 3: Validate current status --- //
        if (currentEventSupplier.status !== 'APPROVED') {
            throw new Error(`Cannot adjust quote. Supplier status is currently ${currentEventSupplier.status}.`);
        }

        // --- Step 4: Calculate difference and prepare transaction --- //
        const { eventId } = currentEventSupplier;
        const oldQuoteAmount = Number(currentEventSupplier.quoteAmount || 0);
        const amountDifference = newQuoteAmount - oldQuoteAmount;

        if (!eventId) {
            throw new Error("Cannot adjust quote. Associated event ID is missing.");
        }

        // Prepare transaction items
        const transactItems = [
            {
                // Update Event: Adjust committedExpenses by the difference
                Update: {
                    TableName: EVENT_TABLE_NAME,
                    Key: marshall({ id: eventId }),
                    // Use ADD for atomic increment/decrement. Handles initialization if committedExpenses doesn't exist.
                    UpdateExpression: "ADD committedExpenses :diff",
                    ConditionExpression: "attribute_exists(id)", // Ensure the event exists
                    ExpressionAttributeValues: marshall({
                        ":diff": amountDifference,
                    })
                }
            },
            {
                // Update EventSupplier: Set the new quoteAmount
                Update: {
                    TableName: EVENT_SUPPLIER_TABLE_NAME,
                    Key: marshall({ id: eventSupplierId }),
                    UpdateExpression: "SET quoteAmount = :newAmount, #status = :approvedStatus", // Keep status as APPROVED
                    // Ensure status is still APPROVED when we write
                    ConditionExpression: "#status = :approvedStatus",
                    ExpressionAttributeNames: {
                         "#status": "status"
                    },
                    ExpressionAttributeValues: marshall({
                        ":newAmount": newQuoteAmount,
                        ":approvedStatus": "APPROVED"
                    })
                }
            }
        ];

        // --- Step 5: Execute Transaction --- //
        const transactCmd = new TransactWriteItemsCommand({ TransactItems: transactItems });
        await client.send(transactCmd);

        // --- Step 6: Fetch and return the updated EventSupplier --- //
        const getUpdatedItemCmd = new GetItemCommand({
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ id: eventSupplierId }),
        });
        const updatedResponse = await client.send(getUpdatedItemCmd);

        if (!updatedResponse.Item) {
             throw new Error("Failed to fetch updated supplier details after adjustment.");
        }

        return unmarshall(updatedResponse.Item) as EventSupplier;

    } catch (error: any) {
        // Handle specific transaction errors
        if (error.name === 'TransactionCanceledException') {
            const reasons = error.CancellationReasons || [];
            const conditionFailed = reasons.some((r: any) => r.Code === 'ConditionalCheckFailed');
            if (conditionFailed) {
                throw new Error(`Adjustment failed: Condition check failed. Event might not exist or Supplier status might have changed from APPROVED.`);
            }
            throw new Error(`Adjustment failed due to a transaction conflict.`);
        }

        if (error.name === 'ResourceNotFoundException') {
            throw new Error(`Resource not found during quote adjustment.`);
        }
        if (error.name === 'ValidationException') {
            throw new Error(`Data validation error during quote adjustment.`);
        }

        // Re-throw if already a handled error (access control, validation, etc.)
        throw error;
    }
};
