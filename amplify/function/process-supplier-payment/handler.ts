import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverEvent } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

/**
 * Type definitions for the domain entities
 */
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

type Supplier = {
    id: string;
    name?: string;
};

/**
 * Type definitions for handler input/output
 */
type HandlerArguments = {
    eventSupplierId: string;
};

type HandlerReturn = EventSupplier | null;

/**
 * DynamoDB client configuration
 */
const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const client = new DynamoDBClient({ region });

const EVENT_SUPPLIER_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME;
const EVENT_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_TABLE_NAME;
const COLLABORATOR_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME;
const USER_SUBSCRIPTION_TABLE_NAME = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

/**
 * Processes payment for an approved EventSupplier (APPROVED -> PAID).
 * Updates EventSupplier status and paidAt timestamp, decrements Event.committedExpenses,
 * and increments Event.effectiveExpenses.
 * Only the event OWNER can perform this action.
 */
export const handler = async (
    event: AppSyncResolverEvent<HandlerArguments>
): Promise<HandlerReturn> => {
    const { eventSupplierId } = event.arguments;

    // Access control: extract caller identity
    const identity = event.identity as { sub?: string };
    const userId = identity?.sub;
    if (!userId) {
        throw new Error('User identity not found');
    }

    if (!EVENT_SUPPLIER_TABLE_NAME || !EVENT_TABLE_NAME || !COLLABORATOR_TABLE_NAME) {
        throw new Error("Internal server configuration error");
    }
    if (!eventSupplierId) {
        throw new Error("eventSupplierId is required");
    }

    try {
        // 1. Fetch the EventSupplier
        const supplierResult = await client.send(new GetItemCommand({
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ id: eventSupplierId }),
        }));
        const eventSupplier = supplierResult.Item ? unmarshall(supplierResult.Item) as EventSupplier : null;

        if (!eventSupplier) {
            throw new Error(`EventSupplier with ID ${eventSupplierId} not found`);
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

        // 3. Validate supplier state
        if (eventSupplier.status !== 'APPROVED') {
            const errorMsg = eventSupplier.status === 'PAID'
                ? `EventSupplier ${eventSupplierId} is already paid`
                : `EventSupplier ${eventSupplierId} must be APPROVED before payment (current status: ${eventSupplier.status})`;
            throw new Error(errorMsg);
        }

        const { eventId, quoteAmount } = eventSupplier;
        if (!quoteAmount || quoteAmount <= 0) {
            throw new Error(`Invalid quote amount for EventSupplier ${eventSupplierId}`);
        }

        // Prepare transaction items
        const now = new Date().toISOString();
        const transactItems = [
            // Update EventSupplier: Set status to PAID and paidAt timestamp
            {
                Update: {
                    TableName: EVENT_SUPPLIER_TABLE_NAME,
                    Key: marshall({ id: eventSupplierId }),
                    UpdateExpression: "SET #status = :paidStatus, paidAt = :paidAt",
                    ConditionExpression: "#status = :approvedStatus",
                    ExpressionAttributeNames: {
                        "#status": "status"
                    },
                    ExpressionAttributeValues: marshall({
                        ":paidStatus": "PAID",
                        ":approvedStatus": "APPROVED",
                        ":paidAt": now
                    })
                }
            },
            // Update Event: Move amount from committedExpenses to effectiveExpenses
            {
                Update: {
                    TableName: EVENT_TABLE_NAME,
                    Key: marshall({ id: eventId }),
                    UpdateExpression: "SET committedExpenses = committedExpenses - :quoteVal, effectiveExpenses = if_not_exists(effectiveExpenses, :zero) + :quoteVal",
                    ConditionExpression: "attribute_exists(id) AND committedExpenses >= :quoteVal",
                    ExpressionAttributeValues: marshall({
                        ":quoteVal": quoteAmount,
                        ":zero": 0
                    })
                }
            }
        ];

        // Execute transaction
        console.log(`Executing payment transaction for EventSupplier ${eventSupplierId}`);
        const transactCmd = new TransactWriteItemsCommand({ TransactItems: transactItems });
        await client.send(transactCmd);
        console.log(`Payment transaction successful for EventSupplier ${eventSupplierId}`);

        // Return updated EventSupplier
        const getUpdatedSupplierCmd = new GetItemCommand({
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ id: eventSupplierId }),
        });
        
        const updatedSupplierResult = await client.send(getUpdatedSupplierCmd);
        if (!updatedSupplierResult.Item) {
            console.error(`Failed to fetch updated EventSupplier ${eventSupplierId} after successful transaction`);
            throw new Error("Failed to fetch updated supplier after payment");
        }

        return unmarshall(updatedSupplierResult.Item) as EventSupplier;

    } catch (error: any) {
        console.error(`Error processing payment for EventSupplier ${eventSupplierId}:`, error);

        // Handle specific error cases
        if (error instanceof ConditionalCheckFailedException || 
            (error.name === 'TransactionCanceledException' && 
             error.CancellationReasons?.some((reason: any) => reason.Code === 'ConditionalCheckFailed'))) {
            throw new Error(`Payment failed: Supplier must be in APPROVED status and have sufficient committed expenses`);
        }

        if (error.name === 'ResourceNotFoundException') {
            throw new Error(`Resource not found during payment processing: ${error.message}`);
        }

        if (error.name === 'ValidationException') {
            throw new Error(`Data validation error during payment processing: ${error.message}`);
        }

        // Re-throw unexpected errors with context
        throw new Error(`Failed to process payment for EventSupplier ${eventSupplierId}: ${error.message || error.name}`);
    }
};
