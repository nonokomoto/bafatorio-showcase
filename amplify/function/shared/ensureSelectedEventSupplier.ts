import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

let cachedClient: DynamoDBClient | null = null;
const getClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
  }
  return cachedClient;
};

const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';
const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';

const normalizeUserId = (id: string): string => (id ? id.split('::')[0] : id);

/**
 * Links a supplier to an event as PENDING.
 */
export async function ensureSelectedEventSupplier({
  eventId,
  supplierId,
  eventOwnerRaw,
  now,
  callerUserId,
  callerRole,
  sharedSupplierIds,
}: {
  eventId: string;
  supplierId: string;
  eventOwnerRaw: string;  // raw "sub::sub" — written as EventSupplier owner for rules.owner()
  now: string;
  callerUserId: string;
  callerRole: string;
  sharedSupplierIds: string[];
}): Promise<void> {
  const client = getClient();

  // 1. First check if already linked to the event by any mutation path (e.g. selectEventSupplier).
  // If it's already linked, we don't need to check ownership/sharing permissions for the caller
  // because the "selection" is already established and authorized in the event context.
  // This allows any collaborator with SCHEDULE_EDIT permission to update entries even if 
  // they don't "own" the underlying Supplier record globally.
  const existing = await client.send(new QueryCommand({
    TableName: EVENT_SUPPLIER_TABLE,
    IndexName: 'byEventId',
    KeyConditionExpression: 'eventId = :eid',
    FilterExpression: 'supplierId = :sid',
    ProjectionExpression: 'id',
    ExpressionAttributeValues: marshall({ ':eid': eventId, ':sid': supplierId }),
  }));

  if (existing.Items && existing.Items.length > 0) return;

  // 2. Only if NOT linked yet, verify supplier exists + collaborator access check.
  const supplierResult = await client.send(new GetItemCommand({
    TableName: SUPPLIER_TABLE,
    Key: marshall({ id: supplierId }),
    ProjectionExpression: 'id, #owner',
    ExpressionAttributeNames: { '#owner': 'owner' },
  }));

  if (!supplierResult.Item) {
    throw new Error(`Supplier not found: ${supplierId}`);
  }

  if (callerRole !== 'OWNER') {
    const supplierOwner = normalizeUserId(
      (unmarshall(supplierResult.Item).owner as string) || ''
    );
    const isOwn = supplierOwner === callerUserId;
    const isShared = sharedSupplierIds.includes(supplierId);
    if (!isOwn && !isShared) {
      throw new Error('Unauthorized: no access to this supplier');
    }
  }

  // 3. Deterministic id makes concurrent writes to the same pair atomic:
  //    ConditionalCheckFailedException means another call already succeeded.
  const approvalStatus = callerRole === 'STAFF_LOGISTICS' ? 'PENDING_APPROVAL' : 'DIRECT';
  const requestedBy = callerRole === 'STAFF_LOGISTICS' ? callerUserId : undefined;

  try {
    await client.send(new PutItemCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      Item: marshall({
        id: `${eventId}#${supplierId}`,
        eventId,
        supplierId,
        status: 'PENDING',
        approvalStatus,
        ...(requestedBy && { requestedBy }),
        owner: eventOwnerRaw,
        createdAt: now,
        updatedAt: now,
        __typename: 'EventSupplier',
      }, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name === 'ConditionalCheckFailedException') return; // concurrent call won, idempotent
    throw err;
  }
}
