/**
 * @file select-event-supplier/handler.ts
 * @description Lambda function to select/add a supplier to an event
 * Implements the approval workflow from ACCESS_LEVELS_STRATEGY.md:
 *
 * - OWNER/CO_MANAGER: Direct selection (approvalStatus = 'DIRECT')
 * - STAFF_LOGISTICS: Requires approval (approvalStatus = 'PENDING_APPROVAL')
 *
 * Follows ADR-013 pattern for DynamoDB owner keys and ADR-015 for access control.
 * Uses the same event-fetch-first pattern as get-event-as-collaborator and
 * list-event-suppliers (GetItem by id, then normalizeUserId for owner check).
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { ensureEventWritable, ensureWithinLimit } from '../shared/entitlementGate';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

// Types
type ApprovalStatus = 'DIRECT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
type SupplierStatus = 'PENDING' | 'COUNTING_ON' | 'APPROVED' | 'PAID' | 'REJECTED';
type UserRole = 'OWNER' | 'CO_MANAGER' | 'STAFF_LOGISTICS' | 'STAFF_CHECKIN';

interface SelectEventSupplierArgs {
  eventId: string;
  supplierId: string;
  quoteAmount?: number;
}

interface EventSupplier {
  id: string;
  eventId: string;
  supplierId: string;
  quoteAmount?: number;
  status: SupplierStatus;
  approvalStatus: ApprovalStatus;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  invoiceS3Key?: string;
  paidAt?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';
const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

/** Strip the ::sub suffix from Amplify owner keys (ADR-013 normalizeUserId pattern) */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

/**
 * Main handler for selecting an event supplier
 */
export const handler = async (
  event: AppSyncResolverEvent<SelectEventSupplierArgs>
): Promise<EventSupplier> => {
  const { eventId, supplierId, quoteAmount } = event.arguments;

  // 1. Extract user identity (following ADR-013 pattern)
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  // 2. Validate inputs
  if (!eventId || !supplierId) {
    throw new Error('eventId and supplierId are required');
  }

  // 3. Fetch the event record by id (same pattern as get-event-as-collaborator)
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
    })
  );

  if (!eventResult.Item) {
    throw new Error('Event not found');
  }

  const eventRecord = unmarshall(eventResult.Item);
  const eventOwner = eventRecord.owner as string; // The real event owner (e.g. "sub::sub")

  // 4. Determine user's role
  let userRole: UserRole | null = null;
  let collaboratorRecord: Record<string, any> | null = null;

  const normalizedOwner = normalizeUserId(eventOwner);
  if (normalizedOwner === userId) {
    userRole = 'OWNER';
  } else {
    // Query EventCollaborator by eventId GSI
    const collabQuery = await client.send(
      new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'userId = :uid AND #st = :accepted',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':uid': userId,
          ':accepted': 'ACCEPTED',
        }),
      })
    );

    collaboratorRecord = collabQuery.Items?.[0]
      ? unmarshall(collabQuery.Items[0])
      : null;

    if (collaboratorRecord) {
      userRole = collaboratorRecord.role as UserRole;
    }
  }

  if (!userRole) {
    throw new Error('Unauthorized: No access to this event');
  }

  // Per ACCESS_LEVELS_STRATEGY.md: STAFF_CHECKIN cannot select suppliers
  if (userRole === 'STAFF_CHECKIN') {
    throw new Error('Unauthorized: Staff Check-in cannot select suppliers');
  }

  // Gate de billing (§4): janela de escrita do plano do dono; o limite de
  // fornecedores é validado antes do Put (COUNT no GSI byEventId).
  const billingGate = await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
    // Event já carregado acima (fetch completo) — evita o segundo GetItem
    eventRecord,
  });

  // 4b. For collaborators, verify supplier access (own supplier or in sharedSupplierIds)
  if (userRole !== 'OWNER' && collaboratorRecord) {
    const sharedSupplierIds: string[] = collaboratorRecord.sharedSupplierIds || [];

    // Check if the supplier is owned by the collaborator or shared with them
    const supplierCheckResult = await client.send(
      new GetItemCommand({
        TableName: SUPPLIER_TABLE,
        Key: marshall({ id: supplierId }),
        ProjectionExpression: 'id, #owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
      })
    );

    if (supplierCheckResult.Item) {
      const supplierData = unmarshall(supplierCheckResult.Item);
      const supplierOwner = normalizeUserId(supplierData.owner || '');
      const isOwnSupplier = supplierOwner === userId;
      const isSharedSupplier = sharedSupplierIds.includes(supplierId);

      if (!isOwnSupplier && !isSharedSupplier) {
        throw new Error('Unauthorized: You do not have access to this supplier');
      }
    }
  }

  // 5. Verify supplier exists (Supplier has .identifier(['id']), PK = id only)
  const supplierResult = await client.send(
    new GetItemCommand({
      TableName: SUPPLIER_TABLE,
      Key: marshall({ id: supplierId }),
      ProjectionExpression: 'id',
    })
  );

  if (!supplierResult.Item) {
    throw new Error('Supplier not found');
  }

  // 6. Check if supplier is already linked to this event
  const existingQuery = await client.send(
    new QueryCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      FilterExpression: 'supplierId = :sid',
      ExpressionAttributeValues: marshall({
        ':eid': eventId,
        ':sid': supplierId,
      }),
    })
  );

  if (existingQuery.Items && existingQuery.Items.length > 0) {
    throw new Error('This supplier is already linked to this event');
  }

  // 7. Determine approval status based on role
  // Per ACCESS_LEVELS_STRATEGY.md:
  // - OWNER, CO_MANAGER: Direct (no approval needed)
  // - STAFF_LOGISTICS: Requires owner approval
  let approvalStatus: ApprovalStatus = 'DIRECT';
  let requestedBy: string | undefined;

  if (userRole === 'STAFF_LOGISTICS') {
    approvalStatus = 'PENDING_APPROVAL';
    requestedBy = userId;
  }

  const supplierCountResult = await client.send(
    new QueryCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
      Select: 'COUNT',
    })
  );
  ensureWithinLimit(billingGate.entitlements, 'suppliers', supplierCountResult.Count ?? 0);

  // 8. Create the EventSupplier record
  // CRITICAL: Use the real event owner so the record is visible to the event owner
  // via rules.owner() authorization (ADR-015)
  const now = new Date().toISOString();
  const eventSupplier: EventSupplier = {
    id: uuidv4(),
    eventId,
    supplierId,
    quoteAmount: quoteAmount || 0,
    status: 'PENDING',
    approvalStatus,
    requestedBy,
    owner: eventOwner, // Real event owner, not the calling user
    createdAt: now,
    updatedAt: now,
  };

  await client.send(
    new PutItemCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      Item: marshall(eventSupplier, { removeUndefinedValues: true }),
    })
  );

  // 9. TODO: If PENDING_APPROVAL, notify the event owner
  if (approvalStatus === 'PENDING_APPROVAL') {
    // await notifyOwnerOfPendingApproval(eventId, eventSupplier);
  }

  return eventSupplier;
};
