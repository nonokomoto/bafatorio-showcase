import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';
import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import type { ScheduleEntry } from '../shared/scheduleTypes';
import { validateDateFormat, validateScheduleColor } from '../shared/scheduleValidation';
import { getScheduleEntry } from '../shared/scheduleEntry';
import { assertCanEditEntry } from '../shared/scheduleEntryAccess';
import { ensureSelectedEventSupplier } from '../shared/ensureSelectedEventSupplier';
import { assertParticipantsInEvent } from '../shared/assertParticipantsInEvent';

// Nullable fields signal "clear this attribute" via DynamoDB REMOVE expression.
// Absent fields (undefined) are not touched at all.
// SET field = null writes DynamoDB NULL type — wrong; REMOVE is the correct operation.
interface UpdateScheduleEntryArgs {
  id: string;
  eventId: string;
  title?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  location?: string | null;
  supplierId?: string | null;
  order?: number | null;
  color?: string | null;   // null volta ao default (REMOVE), como as legadas
  participantIds?: string[] | null;  // null ou [] limpam a lista
}

const NULLABLE_FIELDS = ['startTime', 'endTime', 'description', 'location', 'supplierId', 'order', 'color', 'participantIds'] as const;

const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const SCHEDULE_TABLE = process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<UpdateScheduleEntryArgs>
): Promise<ScheduleEntry> => {
  const { id, eventId, title, date, startTime, endTime, description, location, supplierId, order, color, participantIds } =
    event.arguments;
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) throw new Error('User identity not found');
  if (!id || !eventId) throw new Error('id and eventId are required');

  const [access, entry] = await Promise.all([
    resolveEventAccess({ eventTableName: EVENT_TABLE, collaboratorTableName: COLLABORATOR_TABLE, eventId, userId }),
    getScheduleEntry(SCHEDULE_TABLE, id),
  ]);

  if (!access.hasPermission(EVENT_PERMISSIONS.SCHEDULE_EDIT)) {
    throw new Error(`Access denied: role ${access.role} cannot edit schedule entries`);
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

  assertCanEditEntry({
    role: access.role,
    entryOwnerUserId: entry.owner,
    currentUserId: userId,
  });

  if (date !== undefined) {
    validateDateFormat(date);
  }
  validateScheduleColor(color);

  if (participantIds?.length) {
    await assertParticipantsInEvent({
      participantTableName: PARTICIPANT_TABLE,
      eventId,
      participantIds,
    });
  }

  const now = new Date().toISOString();
  const setExpressions: string[] = ['#updatedAt = :updatedAt'];
  const removeExpressions: string[] = [];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (title !== undefined) {
    setExpressions.push('#title = :title');
    names['#title'] = 'title';
    values[':title'] = title;
  }
  if (date !== undefined) {
    setExpressions.push('#date = :date');
    names['#date'] = 'date';
    values[':date'] = date;
  }

  // Lista vazia é "tirei todos", não "não mexas": colapsa para null e cai no
  // REMOVE, senão gravaríamos uma lista vazia que o render tem de distinguir
  // de ausente sem ter razão para isso.
  const participantIdsArg = participantIds?.length === 0 ? null : participantIds;

  const nullableArgs: Record<string, unknown> = { startTime, endTime, description, location, supplierId, order, color, participantIds: participantIdsArg };
  for (const field of NULLABLE_FIELDS) {
    const val = nullableArgs[field];
    if (val === undefined) continue;
    if (val === null) {
      removeExpressions.push(`#${field}`);
      names[`#${field}`] = field;
    } else {
      setExpressions.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = val;
    }
  }

  let updateExpression = `SET ${setExpressions.join(', ')}`;
  if (removeExpressions.length > 0) {
    updateExpression += ` REMOVE ${removeExpressions.join(', ')}`;
  }

  if (supplierId !== undefined && supplierId !== null) {
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

  const result = await client.send(
    new UpdateItemCommand({
      TableName: SCHEDULE_TABLE,
      Key: marshall({ id }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values, { removeUndefinedValues: true }),
      ReturnValues: 'ALL_NEW',
    })
  );

  return unmarshall(result.Attributes ?? {}) as ScheduleEntry;
};
