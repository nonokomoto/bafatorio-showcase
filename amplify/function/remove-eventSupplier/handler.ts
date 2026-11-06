import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, DeleteItemCommand, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverEvent } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

/**
 * Type definitions for domain entities
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

type HandlerReturn = {
    deletedEventSupplierId: string;
    message: string;
};

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
 * Handles the removal of an EventSupplier and reverts committed expenses if approved.
 * If status is APPROVED: Decrements committedExpenses and increases budget.
 * Otherwise: Simply removes the EventSupplier association.
 * Authorization delegates to the shared event permission matrix (ADR-015)
 * and requires the caller to hold `supplier:delete`.
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
        // 1. Fetch the EventSupplier to determine its status and quote amount
        const supplierResult = await client.send(new GetItemCommand({
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ id: eventSupplierId }),
            ProjectionExpression: "id, eventId, quoteAmount, #st",
            ExpressionAttributeNames: { "#st": "status" }
        }));

        if (!supplierResult.Item) {
            return {
                deletedEventSupplierId: eventSupplierId,
                message: "EventSupplier not found, assumed already removed.",
            };
        }

        const eventSupplier = unmarshall(supplierResult.Item) as Pick<EventSupplier, 'id' | 'eventId' | 'quoteAmount' | 'status'>;

        // 2. Access control: delegate to shared event permission matrix (ADR-015)
        const access = await resolveEventAccess({
            eventTableName: EVENT_TABLE_NAME,
            collaboratorTableName: COLLABORATOR_TABLE_NAME,
            eventId: eventSupplier.eventId,
            userId,
        });

        if (!access.hasPermission(EVENT_PERMISSIONS.SUPPLIER_DELETE)) {
            throw new Error('Unauthorized: caller lacks supplier:delete permission');
        }

        // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
        await ensureEventWritable({
            eventTableName: EVENT_TABLE_NAME,
            subscriptionTableName: USER_SUBSCRIPTION_TABLE_NAME,
            eventId: eventSupplier.eventId,
            // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
            eventRecord: access.eventRecord,
        });

        const { eventId, quoteAmount, status } = eventSupplier;

        // A supplier's quote lives in a different Event balance depending on its
        // status: APPROVED sits in committedExpenses, PAID in effectiveExpenses.
        // Removing it must reverse the matching balance. PENDING/COUNTING_ON/REJECTED never
        // touched either, so they just delete.
        const reversionField =
            status === 'APPROVED' ? 'committedExpenses'
            : status === 'PAID' ? 'effectiveExpenses'
            : undefined;

        // Only revert when the Event balance can actually sustain the decrement.
        // Orphan rows exist in the wild (e.g. imported with status=APPROVED/PAID
        // without ever incrementing the balance) — for those the transaction would
        // fail with ConditionalCheckFailed and leave the OWNER unable to clean up.
        // Fall back to a plain delete in that case.
        const eventBalance = reversionField
            ? (access.eventRecord?.[reversionField] as number | undefined)
            : undefined;
        const canRevert =
            reversionField != null
            && typeof eventBalance === 'number'
            && typeof quoteAmount === 'number'
            && quoteAmount > 0
            && eventBalance >= quoteAmount;

        if (reversionField && typeof quoteAmount === 'number' && quoteAmount > 0 && !canRevert) {
            console.warn(
                `[removeEventSupplier] ${status} EventSupplier ${eventSupplierId} has no matching ${reversionField} on Event ${eventId} (event=${eventBalance}, quote=${quoteAmount}). Skipping financial reversion and deleting directly.`
            );
        }

        if (canRevert) {
            const balanceLabel = reversionField === 'effectiveExpenses' ? 'effective' : 'committed';
            console.log(`EventSupplier ${eventSupplierId} is ${status} with quote ${quoteAmount}. Reverting ${balanceLabel} expenses ONLY.`);

            const transactItems = [
                // Update Event financials: Decrement the status-matched balance ONLY
                {
                    Update: {
                        TableName: EVENT_TABLE_NAME,
                        Key: marshall({ id: eventId }),
                        UpdateExpression: `SET ${reversionField} = ${reversionField} - :quote`,
                        ExpressionAttributeValues: marshall({
                            ":quote": quoteAmount,
                        }),
                        // Ensure the event exists and has enough balance to revert
                        ConditionExpression: `attribute_exists(id) AND attribute_exists(${reversionField}) AND ${reversionField} >= :quote`,
                    }
                },
                // Delete EventSupplier record, ensuring its status hasn't changed
                {
                    Delete: {
                        TableName: EVENT_SUPPLIER_TABLE_NAME,
                        Key: marshall({ id: eventSupplierId }),
                        ConditionExpression: "attribute_exists(id) AND #st = :expectedStatus",
                        ExpressionAttributeNames: { "#st": "status" },
                        ExpressionAttributeValues: marshall({ ":expectedStatus": status })
                    }
                }
            ];

            const transactCmd = new TransactWriteItemsCommand({ TransactItems: transactItems });
            await client.send(transactCmd);
            console.log(`Reversion transaction successful for ${status} EventSupplier ${eventSupplierId} (${reversionField} updated).`);

            return {
                deletedEventSupplierId: eventSupplierId,
                message: `EventSupplier ${eventSupplierId} removed and ${balanceLabel} expenses reverted.`,
            };

        } else {
            // For PENDING/REJECTED (never touched a balance), or an APPROVED/PAID
            // orphan whose balance can't sustain the revert - just delete the record.
            // The orphan case already logged a warn above; only log here for the
            // statuses that genuinely have no balance to revert.
            if (!reversionField) {
                console.log(`EventSupplier ${eventSupplierId} status (${status}) has no financial reversion. Performing direct deletion.`);
            }

            const deleteCmd = new DeleteItemCommand({
                TableName: EVENT_SUPPLIER_TABLE_NAME,
                Key: marshall({ id: eventSupplierId }),
                // Simple check if the item exists before deleting
                ConditionExpression: "attribute_exists(id)" 
            });

            try {
                await client.send(deleteCmd);
                 console.log(`Direct deletion successful for EventSupplier ${eventSupplierId}`);
                return {
                    deletedEventSupplierId: eventSupplierId,
                    message: `EventSupplier ${eventSupplierId} association removed successfully.`,
                };
            } catch (deleteError: any) {
                // Handle cases where the item might already be deleted by another process
                if (deleteError instanceof ConditionalCheckFailedException) {
                    console.log(`EventSupplier ${eventSupplierId} likely already removed.`);
                    return {
                        deletedEventSupplierId: eventSupplierId,
                        message: `EventSupplier ${eventSupplierId} association already removed.`,
                    };
                }
                // Re-throw other delete errors
                throw deleteError; 
            }
        }

    } catch (error: any) {
        console.error(`Error processing simplified removal for EventSupplier ${eventSupplierId}:`, error);

        // Re-throw domain errors (authorization, not-found) without rewrapping
        if (typeof error?.message === 'string' &&
            (error.message.startsWith('Unauthorized') || error.message === 'Event not found')) {
            throw error;
        }

        // Refined error handling for transaction failures
        if (error instanceof ConditionalCheckFailedException ||
            (error.name === 'TransactionCanceledException' &&
             error.CancellationReasons?.some((reason: any) => reason.Code === 'ConditionalCheckFailed'))) {
            throw new Error(`Reversion failed due to data inconsistency (e.g., status changed, insufficient committed expenses, or item already removed).`);
        }

        if (error.name === 'ResourceNotFoundException') {
            throw new Error(`Underlying resource not found during removal.`);
        }
        if (error.name === 'ValidationException') {
            throw new Error(`Data validation error during removal.`);
        }

        throw new Error(`Failed to remove EventSupplier ${eventSupplierId} due to an unexpected error.`);
    }
};
