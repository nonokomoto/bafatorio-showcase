import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { ScheduleEntry } from './scheduleTypes';

// Module-level client — reused across warm invocations within this shared context.
// Handlers use their own clients from their own node_modules to avoid cross-context type conflicts.
let cachedClient: DynamoDBClient | null = null;
const getClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
  }
  return cachedClient;
};

// Loads a schedule entry by id. Throws if not found.
export async function getScheduleEntry(tableName: string, id: string): Promise<ScheduleEntry> {
  const result = await getClient().send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ id }),
    })
  );

  if (!result.Item) {
    throw new Error('Schedule entry not found');
  }

  return unmarshall(result.Item) as ScheduleEntry;
}
