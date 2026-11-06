/**
 * @file get-supplier-for-event/handler.ts
 * @description Lambda function to get full supplier details scoped to an event.
 * Verifies user has event access AND supplier is associated with the event via EventSupplier.
 *
 * Per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER: can view supplier details
 * - CO_MANAGER: can view supplier details
 * - STAFF_LOGISTICS: can view supplier details
 * - STAFF_CHECKIN: no supplier access
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

interface GetSupplierForEventArgs {
  supplierId: string;
  eventId: string;
}

interface SupplierDetailResult {
  id: string;
  name: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  country?: string;
  address?: string;
  vatNumber?: string;
  paymentDetails?: string;
  estimateMinAmount?: number;
  estimateMaxAmount?: number;
  estimateUnit?: string;
  currency?: string;
  tags?: string[];
  notes?: string;
}

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats.
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<GetSupplierForEventArgs>
): Promise<SupplierDetailResult> => {
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  const { supplierId, eventId } = event.arguments;

  if (!userId) {
    throw new Error('User identity not found');
  }
  if (!supplierId || !eventId) {
    throw new Error('supplierId and eventId are required');
  }

  console.log(`[getSupplierForEvent] User ${userId} requesting supplier ${supplierId} for event ${eventId}`);

  // 1. Verify event exists and determine user role
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
      ProjectionExpression: '#owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
    })
  );

  if (!eventResult.Item) {
    throw new Error('Event not found');
  }

  const eventData = unmarshall(eventResult.Item);
  const normalizedOwner = normalizeUserId(eventData.owner || '');
  let userRole: string | null = null;

  if (normalizedOwner === userId) {
    userRole = 'OWNER';
  } else {
    const collabResult = await client.send(
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

    const collabs = (collabResult.Items || []).map((item) => unmarshall(item));
    if (collabs.length > 0) {
      userRole = collabs[0].role as string;
    }
  }

  if (!userRole) {
    throw new Error('Access denied: You do not have permission to view this event');
  }

  if (userRole === 'STAFF_CHECKIN') {
    throw new Error('Access denied: Staff Check-in cannot view suppliers');
  }

  console.log(`[getSupplierForEvent] User role: ${userRole}`);

  // 2. Verify supplier is associated with this event via EventSupplier table
  const esResult = await client.send(
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

  const eventSupplierItems = (esResult.Items || []).map((item) => unmarshall(item));
  if (eventSupplierItems.length === 0) {
    throw new Error('Access denied: Supplier is not associated with this event');
  }

  console.log(`[getSupplierForEvent] Supplier ${supplierId} is associated with event ${eventId}`);

  // 3. Fetch full supplier data
  const supplierResult = await client.send(
    new GetItemCommand({
      TableName: SUPPLIER_TABLE,
      Key: marshall({ id: supplierId }),
    })
  );

  if (!supplierResult.Item) {
    throw new Error('Supplier not found');
  }

  const s = unmarshall(supplierResult.Item);

  return {
    id: s.id as string,
    name: s.name as string,
    category: s.category as string | undefined,
    contactName: s.contactName as string | undefined,
    contactEmail: s.contactEmail as string | undefined,
    contactPhone: s.contactPhone as string | undefined,
    website: s.website as string | undefined,
    country: s.country as string | undefined,
    address: s.address as string | undefined,
    vatNumber: s.vatNumber as string | undefined,
    paymentDetails: s.paymentDetails as string | undefined,
    estimateMinAmount: s.estimateMinAmount as number | undefined,
    estimateMaxAmount: s.estimateMaxAmount as number | undefined,
    estimateUnit: s.estimateUnit as string | undefined,
    currency: s.currency as string | undefined,
    tags: s.tags as string[] | undefined,
    notes: s.notes as string | undefined,
  };
};
