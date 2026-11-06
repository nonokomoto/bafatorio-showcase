import { DynamoDBClient, GetItemCommand, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const client = new DynamoDBClient({ region });

type HandlerArguments = { supplierId: string };
type HandlerReturn = { success: boolean; message: string; eventCount?: number };

const normalizeUserId = (id: string): string => id.split('::')[0];

export const handler = async (
  event: AppSyncResolverEvent<HandlerArguments>,
): Promise<HandlerReturn> => {
  const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME;
  const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) throw new Error('User identity not found');
  if (!SUPPLIER_TABLE || !EVENT_SUPPLIER_TABLE) throw new Error('Internal server configuration error');

  const { supplierId } = event.arguments;
  if (!supplierId) throw new Error('supplierId is required');

  const supplierResult = await client.send(
    new GetItemCommand({ TableName: SUPPLIER_TABLE, Key: marshall({ id: supplierId }) }),
  );

  if (!supplierResult.Item) throw new Error('Supplier not found');

  const supplier = unmarshall(supplierResult.Item);
  if (normalizeUserId(supplier.owner ?? '') !== normalizeUserId(userId)) {
    throw new Error('Unauthorized: you do not own this supplier');
  }

  // Count references across the whole EventSupplier table. A single Scan reads at
  // most 1MB, so we must paginate via LastEvaluatedKey — otherwise a supplier whose
  // links sit beyond the first page reports 0 and gets deleted while still linked,
  // leaving orphan EventSupplier rows. Early-exit as soon as any page has a match.
  let count = 0;
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined;

  do {
    const refResult = await client.send(
      new ScanCommand({
        TableName: EVENT_SUPPLIER_TABLE,
        FilterExpression: 'supplierId = :sid',
        ExpressionAttributeValues: marshall({ ':sid': supplierId }),
        Select: 'COUNT',
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
      }),
    );

    count += refResult.Count ?? 0;
    if (count > 0) {
      return {
        success: false,
        message: 'SUPPLIER_LINKED_TO_EVENTS',
        eventCount: count,
      };
    }

    lastEvaluatedKey = refResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  await client.send(
    new DeleteItemCommand({ TableName: SUPPLIER_TABLE, Key: marshall({ id: supplierId }) }),
  );

  return { success: true, message: 'Supplier deleted successfully' };
};
