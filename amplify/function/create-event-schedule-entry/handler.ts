import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';
import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import type { ScheduleEntry } from '../shared/scheduleTypes';
import { validateDateFormat, validateScheduleColor } from '../shared/scheduleValidation';
import { ensureSelectedEventSupplier } from '../shared/ensureSelectedEventSupplier';
import { assertParticipantsInEvent } from '../shared/assertParticipantsInEvent';

interface CreateEventScheduleEntryArgs {
  eventId: string;
  title: string;
  date: string;        // YYYY-MM-DD
  startTime?: string;  // HH:MM — absent means all-day
  endTime?: string;
  description?: string;
  location?: string;
  supplierId?: string;
  order?: number;
  color?: string;      // hex da paleta curada; ausente significa default
  participantIds?: string[];  // FK → Participant, event-scoped
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const SCHEDULE_TABLE = process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<CreateEventScheduleEntryArgs>
): Promise<ScheduleEntry> => {
  const { eventId, title, date, startTime, endTime, description, location, supplierId, order, color, participantIds } =
    event.arguments;
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) throw new Error('User identity not found');
  if (!eventId || !title?.trim() || !date) throw new Error('eventId, title, and date are required');

  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId,
    userId,
  });

  if (!access.hasPermission(EVENT_PERMISSIONS.SCHEDULE_CREATE)) {
    throw new Error(`Access denied: role ${access.role} cannot create schedule entries`);
  }
  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
    // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
    eventRecord: access.eventRecord,
  });


  validateDateFormat(date);
  validateScheduleColor(color);

  if (participantIds?.length) {
    await assertParticipantsInEvent({
      participantTableName: PARTICIPANT_TABLE,
      eventId,
      participantIds,
    });
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  const entry: ScheduleEntry = {
    id,
    eventId,
    date,
    title: title.trim(),
    owner: `${userId}::${userId}`,
    createdAt: now,
    updatedAt: now,
    ...(startTime && { startTime }),
    ...(endTime && { endTime }),
    ...(description && { description }),
    ...(location && { location }),
    ...(supplierId && { supplierId }),
    ...(order !== undefined && order !== null && { order }),
    ...(color && { color }),
    ...(participantIds?.length && { participantIds }),
  };

  if (supplierId) {
    await ensureSelectedEventSupplier({
      eventId,
      supplierId,
      eventOwnerRaw: access.eventRecord.owner as string,
      now,
      callerUserId: userId,
      callerRole: access.role,
      sharedSupplierIds: access.sharedSupplierIds,
    });
  }

  await client.send(
    new PutItemCommand({
      TableName: SCHEDULE_TABLE,
      Item: marshall(entry, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(id)',
    })
  );

  return entry;
};
