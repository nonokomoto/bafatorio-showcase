import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, type TransactWriteItem } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverHandler } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

type EventSupplier = {
    id: string;
    eventId: string;
    supplierId: string;
    quoteAmount?: number | null;
    status?: 'PENDING' | 'COUNTING_ON' | 'APPROVED' | 'PAID' | 'REJECTED' | null;
};

type RevertEventSupplierApprovalArgs = {
  eventSupplierId: string;
  newStatus: EventSupplier['status'];
};

type RevertEventSupplierApprovalResult = EventSupplier | null;

const EVENT_SUPPLIER_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME;
const EVENT_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_TABLE_NAME;
const COLLABORATOR_TABLE_NAME = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME;
const USER_SUBSCRIPTION_TABLE_NAME = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const client = new DynamoDBClient({ region });

const REVERT_TARGET_STATUSES = new Set(['PENDING', 'COUNTING_ON', 'REJECTED']);

export const handler: AppSyncResolverHandler<
  RevertEventSupplierApprovalArgs,
  RevertEventSupplierApprovalResult
> = async (event) => {
  const { eventSupplierId, newStatus } = event.arguments;

  // Access control: extract caller identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  if (!userId) {
      throw new Error('User identity not found');
  }

  if (!EVENT_SUPPLIER_TABLE_NAME || !EVENT_TABLE_NAME || !COLLABORATOR_TABLE_NAME) {
    throw new Error("Internal server configuration error. Missing table names.");
  }
  if (!eventSupplierId || !newStatus) {
      throw new Error("Missing required arguments.");
  }
  // A revert only leaves APPROVED for a status that holds no balance. APPROVED
  // or PAID here would release committedExpenses without the matching move.
  if (!REVERT_TARGET_STATUSES.has(newStatus)) {
      throw new Error(`Invalid revert target status: ${newStatus}`);
  }

  // 1. Fetch the current EventSupplier
  const response = await client.send(new GetItemCommand({
    TableName: EVENT_SUPPLIER_TABLE_NAME,
    Key: marshall({ id: eventSupplierId }),
  }));

  if (!response.Item) {
    throw new Error('EventSupplier not found.');
  }
  const currentEventSupplier = unmarshall(response.Item) as EventSupplier;

  // 2. Access control: delegate to shared event permission matrix (ADR-015)
  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE_NAME,
    collaboratorTableName: COLLABORATOR_TABLE_NAME,
    eventId: currentEventSupplier.eventId,
    userId,
  });
  if (!access.hasPermission(EVENT_PERMISSIONS.SUPPLIER_APPROVE)) {
    throw new Error('Unauthorized: caller lacks supplier:approve permission');
  }

  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE_NAME,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE_NAME,
    eventId: currentEventSupplier.eventId,
    // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
    eventRecord: access.eventRecord,
  });

  // 3. Check if the current status is 'APPROVED'
  if (currentEventSupplier.status !== 'APPROVED') {
    throw new Error(`Cannot revert approval. Supplier status is currently ${currentEventSupplier.status}.`);
  }

  const { quoteAmount, eventId } = currentEventSupplier;
  const numericQuoteAmount = Number(quoteAmount);
  const needsBudgetRevert = numericQuoteAmount > 0 && eventId;

  // Map status → approvalStatus so the two fields stay in sync.
  // 'PENDING' has no direct counterpart — use 'PENDING_APPROVAL' (the canonical "awaiting review" value).
  const newApprovalStatus = newStatus === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL';

  // 4. Use a SINGLE transaction for both updates (atomic)
  const transactItems: TransactWriteItem[] = [
    // Update EventSupplier: keep status and approvalStatus in sync
    {
      Update: {
        TableName: EVENT_SUPPLIER_TABLE_NAME,
        Key: marshall({ id: eventSupplierId }),
        UpdateExpression: "SET #status = :newStatus, approvalStatus = :newApprovalStatus",
        ConditionExpression: "#status = :currentStatus",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({
          ":newStatus": newStatus,
          ":newApprovalStatus": newApprovalStatus,
          ":currentStatus": "APPROVED",
        }),
      },
    },
  ];

  // Add budget revert if needed.
  // Use if_not_exists so the subtraction works even when committedExpenses was never
  // initialized on the Event record (avoids TransactionCanceledException on missing attribute).
  if (needsBudgetRevert) {
    transactItems.push({
      Update: {
        TableName: EVENT_TABLE_NAME,
        Key: marshall({ id: eventId }),
        UpdateExpression: "SET committedExpenses = if_not_exists(committedExpenses, :zero) - :amount",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: marshall({ ":amount": numericQuoteAmount, ":zero": 0 }),
      },
    });
  }

  try {
    await client.send(new TransactWriteItemsCommand({ TransactItems: transactItems }));
  } catch (error: any) {
    if (error.name === 'TransactionCanceledException') {
      throw new Error('Revert failed: Status may have changed or insufficient committed expenses.');
    }
    throw new Error(`Failed to revert supplier approval: ${error.message}`);
  }

  // 5. Return updated EventSupplier
  const updatedResult = await client.send(new GetItemCommand({
    TableName: EVENT_SUPPLIER_TABLE_NAME,
    Key: marshall({ id: eventSupplierId }),
  }));

  return updatedResult.Item
    ? unmarshall(updatedResult.Item) as EventSupplier
    : { ...currentEventSupplier, status: newStatus };
};
