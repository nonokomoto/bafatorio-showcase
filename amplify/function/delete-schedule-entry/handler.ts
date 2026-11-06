import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';
import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { getScheduleEntry } from '../shared/scheduleEntry';
import { assertCanDeleteEntry } from '../shared/scheduleEntryAccess';

interface DeleteScheduleEntryArgs {
  id: string;
  eventId: string;
}

const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const SCHEDULE_TABLE = process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<DeleteScheduleEntryArgs>
): Promise<{ id: string }> => {
  const { id, eventId } = event.arguments;
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) throw new Error('User identity not found');
  if (!id || !eventId) throw new Error('id and eventId are required');

  const [access, entry] = await Promise.all([
    resolveEventAccess({ eventTableName: EVENT_TABLE, collaboratorTableName: COLLABORATOR_TABLE, eventId, userId }),
    getScheduleEntry(SCHEDULE_TABLE, id),
  ]);

  if (!access.hasPermission(EVENT_PERMISSIONS.SCHEDULE_DELETE)) {
    throw new Error(`Access denied: role ${access.role} cannot delete schedule entries`);
  }
  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
    // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
    eventRecord: access.eventRecord,
  });


  if (entry.eventId !== eventId) throw new Error('Schedule entry not found');

  assertCanDeleteEntry({
    role: access.role,
    entryOwnerUserId: entry.owner,
    eventOwnerUserId: access.eventOwner,
    currentUserId: userId,
  });

  await client.send(
    new DeleteItemCommand({
      TableName: SCHEDULE_TABLE,
      Key: marshall({ id }),
    })
  );

  return { id };
};
