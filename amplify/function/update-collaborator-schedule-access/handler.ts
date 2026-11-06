/**
 * @file update-collaborator-schedule-access/handler.ts
 * @description Liga/desliga a visibilidade da agenda da equipa para um
 * STAFF_LOGISTICS. Só o dono do evento altera (ADR-029, revisão 2026-07-16).
 * A flag não faz sentido em CO_MANAGER (vê sempre tudo) nem STAFF_CHECKIN
 * (não tem schedule:view), por isso o handler recusa esses roles.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { resolveEventAccess } from '../shared/resolveEventAccess';

interface UpdateScheduleAccessArgs {
  collaboratorId: string;
  canViewTeamSchedule: boolean;
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userId?: string;
  role: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  canViewTeamSchedule?: boolean;
  [key: string]: unknown;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<UpdateScheduleAccessArgs>
): Promise<EventCollaborator> => {
  const { collaboratorId, canViewTeamSchedule } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  if (!userId) {
    throw new Error('User identity not found');
  }

  if (typeof canViewTeamSchedule !== 'boolean') {
    throw new Error('canViewTeamSchedule must be a boolean');
  }

  // 1. Buscar o colaborador
  const getResult = await client.send(
    new GetItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
    })
  );
  if (!getResult.Item) {
    throw new Error('Collaborator not found');
  }
  const collaborator = unmarshall(getResult.Item) as EventCollaborator;

  // 2. A flag só se aplica ao STAFF_LOGISTICS. Recusar cedo em vez de gravar um
  // campo inerte numa linha de CO_MANAGER/STAFF_CHECKIN.
  if (collaborator.role !== 'STAFF_LOGISTICS') {
    throw new Error(
      `Schedule visibility only applies to STAFF_LOGISTICS, not ${collaborator.role}`
    );
  }

  // 3. Verificar que quem chama é o dono do evento (ADR-015: via resolveEventAccess)
  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId: collaborator.eventId,
    userId,
  });
  if (access.role !== 'OWNER') {
    throw new Error('Unauthorized: Only the event owner can change schedule visibility');
  }

  // 4. No-op se já está no estado pedido
  if (collaborator.canViewTeamSchedule === canViewTeamSchedule) {
    return collaborator;
  }

  const now = new Date().toISOString();
  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
      UpdateExpression: 'SET canViewTeamSchedule = :v, updatedAt = :now',
      ExpressionAttributeValues: marshall({ ':v': canViewTeamSchedule, ':now': now }),
      ReturnValues: 'ALL_NEW',
    })
  );

  return updateResult.Attributes
    ? (unmarshall(updateResult.Attributes) as EventCollaborator)
    : { ...collaborator, canViewTeamSchedule, updatedAt: now };
};
