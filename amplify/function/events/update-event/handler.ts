/**
 * @file update-event/handler.ts
 * @description Edição de eventos gated (§4/§4b): role event:edit + janela de
 * escrita. Substitui a mutation automática do modelo Event — o cliente nunca
 * toca em planKey/owner/organizerId/createdAt nem nos contadores do stream.
 */
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../../shared/eventPermissions';
import { resolveEventAccess } from '../../shared/resolveEventAccess';
import { ensureEventWritable, billingGateMessage } from '../../shared/entitlementGate';

interface UpdateEventResult {
  success: boolean;
  message?: string;
  event?: Record<string, unknown>;
}

// Allowlist fail-closed: só os campos editáveis pelo utilizador (espelha os
// args da custom mutation no schema). Campos novos ficam bloqueados por
// omissão — identidade, snapshot de plano e contadores do stream nunca entram.
const CLIENT_EDITABLE_FIELDS = new Set([
  'eventTitle',
  'eventManager',
  'eventManagerEmail',
  'eventManagerPhone',
  'eventLocation',
  'eventDateType',
  'eventStartDate',
  'eventEndDate',
  'eventSpecificDates',
  'eventTime',
  'eventStatus',
  'eventType',
  'description',
  'categories',
  'budget',
  'currency',
]);

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

export const handler = async (
  event: AppSyncResolverEvent<Record<string, unknown>>
): Promise<UpdateEventResult> => {
  const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
  const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
  const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity?.sub;
  if (!userId) {
    return { success: false, message: 'UNAUTHENTICATED' };
  }

  const { eventId, ...args } = event.arguments as { eventId: string } & Record<string, unknown>;

  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId,
    userId,
  });
  if (!access.hasPermission(EVENT_PERMISSIONS.EVENT_EDIT)) {
    return { success: false, message: 'FORBIDDEN' };
  }

  try {
    await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
      // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
      eventRecord: access.eventRecord,
    });
  } catch (error) {
    return { success: false, message: billingGateMessage(error) };
  }

  // O título nunca pode ser limpo. Null aqui é quase sempre um documento
  // GraphQL que declara $eventTitle sem o fornecer (o AppSync coage variáveis
  // ausentes a null) — gravá-lo seria data loss silencioso; recusar é visível.
  const { eventTitle } = args;
  if (eventTitle !== undefined && (typeof eventTitle !== 'string' || eventTitle.trim() === '')) {
    return { success: false, message: 'INVALID_EVENT_TITLE' };
  }

  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };
  const sets = ['#updatedAt = :updatedAt'];
  names['#updatedAt'] = 'updatedAt';

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || !CLIENT_EDITABLE_FIELDS.has(key)) {
      continue;
    }
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  }

  const result = await client.send(
    new UpdateItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return {
    success: true,
    event: result.Attributes ? unmarshall(result.Attributes) : undefined,
  };
};
