/**
 * @file list-event-suppliers/handler.ts
 * @description Lambda function to list event suppliers for owners AND collaborators.
 * Bypasses DynamoDB owner-based authorization (rules.owner()) by querying
 * tables directly after verifying user access via EventCollaborator table.
 *
 * Per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER: Full access
 * - CO_MANAGER: Full CRUD (view suppliers)
 * - STAFF_LOGISTICS: Can view suppliers
 * - STAFF_CHECKIN: No supplier access
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface ListEventSuppliersInput {
  eventId: string;
}

interface SupplierData {
  id: string;
  name: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  estimateMinAmount?: number;
  estimateMaxAmount?: number;
}

interface EventSupplierItem {
  id: string;
  eventId: string;
  supplierId: string;
  quoteAmount?: number;
  status?: string;
  invoiceS3Key?: string;
  paidAt?: string;
  requestedBy?: string;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  supplier?: SupplierData;
}

interface EventDataSlice {
  id: string;
  eventTitle?: string;
  budget?: number;
  committedExpenses?: number;
  effectiveExpenses?: number;
}

interface ListEventSuppliersResult {
  items: EventSupplierItem[];
  eventData: EventDataSlice;
  sharedSuppliers: SupplierData[];
}

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

/**
 * Main handler
 */
export const handler = async (
  event: AppSyncResolverEvent<ListEventSuppliersInput>
): Promise<ListEventSuppliersResult> => {
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  const { eventId } = event.arguments;

  if (!userId) {
    throw new Error('User identity not found');
  }
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  console.log(`[listEventSuppliers] User ${userId} requesting suppliers for event ${eventId}`);

  // 1. Fetch event data
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
    })
  );

  if (!eventResult.Item) {
    throw new Error(`Event ${eventId} not found`);
  }

  const eventRecord = unmarshall(eventResult.Item);

  // 2. Determine user role
  const normalizedOwner = normalizeUserId(eventRecord.owner || '');
  let userRole: string | null = null;
  let sharedSupplierIds: string[] = [];

  if (normalizedOwner === userId) {
    userRole = 'OWNER';
  } else {
    // Check collaborator table
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
      sharedSupplierIds = (collabs[0].sharedSupplierIds as string[]) || [];
    }
  }

  console.log(`[listEventSuppliers] User role: ${userRole}`);

  if (!userRole) {
    throw new Error('Access denied: You do not have permission to view this event');
  }

  // STAFF_CHECKIN cannot view suppliers
  if (userRole === 'STAFF_CHECKIN') {
    throw new Error('Access denied: Staff Check-in cannot view suppliers');
  }

  // 3. Query EventSupplier records for this event using byEventId GSI
  const esResult = await client.send(
    new QueryCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
    })
  );
  const eventSupplierItems = (esResult.Items || []).map((item) => unmarshall(item));

  console.log(`[listEventSuppliers] Found ${eventSupplierItems.length} event suppliers`);

  // 4. Batch-get Supplier details
  const supplierIds = [...new Set(eventSupplierItems.map((es) => es.supplierId as string))];
  const suppliersMap = new Map<string, SupplierData>();

  if (supplierIds.length > 0) {
    // Supplier table PK is { id } only (.identifier(['id'])), owner is a regular attribute
    for (const supplierId of supplierIds) {
      try {
        const supplierResult = await client.send(
          new GetItemCommand({
            TableName: SUPPLIER_TABLE,
            Key: marshall({ id: supplierId }),
          })
        );

        if (supplierResult.Item) {
          const s = unmarshall(supplierResult.Item);
          suppliersMap.set(supplierId, {
            id: s.id as string,
            name: s.name as string,
            category: s.category as string | undefined,
            contactName: s.contactName as string | undefined,
            contactEmail: s.contactEmail as string | undefined,
            contactPhone: s.contactPhone as string | undefined,
            currency: s.currency as string | undefined,
            estimateMinAmount: s.estimateMinAmount as number | undefined,
            estimateMaxAmount: s.estimateMaxAmount as number | undefined,
          });
        } else {
          console.warn(`[listEventSuppliers] Supplier ${supplierId} not found`);
        }
      } catch (err) {
        console.warn(`[listEventSuppliers] Error fetching supplier ${supplierId}:`, err);
      }
    }
  }

  // 5. Combine EventSupplier + Supplier data
  const items: EventSupplierItem[] = eventSupplierItems.map((es) => ({
    id: es.id as string,
    eventId: es.eventId as string,
    supplierId: es.supplierId as string,
    quoteAmount: es.quoteAmount as number | undefined,
    status: es.status as string | undefined,
    invoiceS3Key: es.invoiceS3Key as string | undefined,
    paidAt: es.paidAt as string | undefined,
    requestedBy: es.requestedBy as string | undefined,
    approvalStatus: es.approvalStatus as string | undefined,
    approvedBy: es.approvedBy as string | undefined,
    approvedAt: es.approvedAt as string | undefined,
    rejectionReason: es.rejectionReason as string | undefined,
    owner: es.owner as string | undefined,
    createdAt: es.createdAt as string | undefined,
    updatedAt: es.updatedAt as string | undefined,
    supplier: suppliersMap.get(es.supplierId as string) || undefined,
  }));

  // 6. Fetch shared suppliers (for non-OWNER roles with sharedSupplierIds)
  const sharedSuppliersList: SupplierData[] = [];

  if (userRole !== 'OWNER' && sharedSupplierIds.length > 0) {
    const associatedSupplierIds = new Set(supplierIds);
    const idsToFetch = sharedSupplierIds.filter(id => !associatedSupplierIds.has(id));

    for (const sid of idsToFetch) {
      try {
        const result = await client.send(
          new GetItemCommand({
            TableName: SUPPLIER_TABLE,
            Key: marshall({ id: sid }),
          })
        );
        if (result.Item) {
          const s = unmarshall(result.Item);
          sharedSuppliersList.push({
            id: s.id as string,
            name: s.name as string,
            category: s.category as string | undefined,
            contactName: s.contactName as string | undefined,
            contactEmail: s.contactEmail as string | undefined,
            contactPhone: s.contactPhone as string | undefined,
            currency: s.currency as string | undefined,
            estimateMinAmount: s.estimateMinAmount as number | undefined,
            estimateMaxAmount: s.estimateMaxAmount as number | undefined,
          });
        }
      } catch (err) {
        console.warn(`[listEventSuppliers] Error fetching shared supplier ${sid}:`, err);
      }
    }
  }

  console.log(`[listEventSuppliers] Found ${sharedSuppliersList.length} shared suppliers`);

  // Build eventData — redact financial fields for STAFF_LOGISTICS
  // Per ACCESS_LEVELS_STRATEGY.md: only OWNER and CO_MANAGER see financial data
  const includeFinancial = userRole === 'OWNER' || userRole === 'CO_MANAGER';
  const eventData: EventDataSlice = {
    id: eventRecord.id as string,
    eventTitle: eventRecord.eventTitle as string | undefined,
    budget: includeFinancial ? (eventRecord.budget as number | undefined) : undefined,
    committedExpenses: includeFinancial ? (eventRecord.committedExpenses as number | undefined) : undefined,
    effectiveExpenses: includeFinancial ? (eventRecord.effectiveExpenses as number | undefined) : undefined,
  };

  console.log(`[listEventSuppliers] Returning ${items.length} items, ${sharedSuppliersList.length} shared suppliers for event ${eventId}`);

  return { items, eventData, sharedSuppliers: sharedSuppliersList };
};
