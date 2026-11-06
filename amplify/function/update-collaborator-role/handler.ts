/**
 * @file update-collaborator-role/handler.ts
 * @description Lambda function to update a collaborator's role
 * Only OWNER can change roles per ACCESS_LEVELS_STRATEGY.md
 * When downgrading to STAFF_CHECKIN, sharedFolderIds and sharedSupplierIds are cleared
 */

import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { resolveEventAccess } from '../shared/resolveEventAccess';

// Types
interface UpdateCollaboratorRoleArgs {
  collaboratorId: string;
  newRole: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  role: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
  sharedFolderIds: string[];
  sharedSupplierIds: string[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

const VALID_ROLES = ['CO_MANAGER', 'STAFF_CHECKIN', 'STAFF_LOGISTICS'];

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

/**
 * Main handler for updating collaborator role
 */
export const handler = async (
  event: AppSyncResolverEvent<UpdateCollaboratorRoleArgs>
): Promise<EventCollaborator> => {
  const { collaboratorId, newRole } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    console.error('[updateCollaboratorRole] Identity error: user not found');
    throw new Error('User identity not found');
  }

  // 2. Validate new role
  if (!VALID_ROLES.includes(newRole)) {
    console.error(`[updateCollaboratorRole] Invalid role: ${newRole}`);
    throw new Error(`Invalid role: ${newRole}. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  console.log(
    `[updateCollaboratorRole] Update request for ${collaboratorId} to role ${newRole} by ${userId}`
  );

  // 3. Get the collaborator record
  const getResult = await client.send(
    new GetItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
    })
  );

  if (!getResult.Item) {
    console.error(`[updateCollaboratorRole] Collaborator not found: ${collaboratorId}`);
    throw new Error('Collaborator not found');
  }

  const collaborator = unmarshall(getResult.Item) as EventCollaborator;

  if (collaborator.status !== 'ACCEPTED') {
    throw new Error('Can only update role of accepted collaborators');
  }

  // 4. No-op if role is the same
  if (collaborator.role === newRole) {
    console.log(`[updateCollaboratorRole] Role already ${newRole}, no change needed`);
    return collaborator;
  }

  // 5. Verify requester is the event owner. Delega no resolveEventAccess
  //    partilhado (ADR-015): resolve o acesso do caller ao evento em vez de
  //    replicar o GetItem + normalizeUserId aqui.
  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId: collaborator.eventId,
    userId,
  });

  if (access.role !== 'OWNER') {
    console.error(`[updateCollaboratorRole] User ${userId} is not the event owner`);
    throw new Error('Unauthorized: Only event owner can change collaborator roles');
  }

  // 6. Update the role. Clear sharedFolderIds + sharedSupplierIds when dropping
  //    to STAFF_CHECKIN, and clear canViewTeamSchedule whenever leaving
  //    STAFF_LOGISTICS — a visibilidade da agenda é exclusiva desse role, e
  //    deixá-la ligada reanimava o acesso se a pessoa voltasse a STAFF_LOGISTICS
  //    (ADR-029, 2026-07-16). Limpar à saída chega: ao regressar já vem false.
  const now = new Date().toISOString();
  const clearSharing = newRole === 'STAFF_CHECKIN';
  const clearScheduleAccess = newRole !== 'STAFF_LOGISTICS';

  const setClauses = ['#role = :newRole', 'updatedAt = :now'];
  const expressionValues: Record<string, any> = {
    ':newRole': newRole,
    ':now': now,
  };
  if (clearSharing) {
    setClauses.push('sharedFolderIds = :emptyList', 'sharedSupplierIds = :emptyList');
    expressionValues[':emptyList'] = [];
  }
  if (clearScheduleAccess) {
    setClauses.push('canViewTeamSchedule = :false');
    expressionValues[':false'] = false;
  }
  const updateExpression = `SET ${setClauses.join(', ')}`;

  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: marshall(expressionValues),
      ReturnValues: 'ALL_NEW',
    })
  );

  const updatedCollaborator = updateResult.Attributes
    ? (unmarshall(updateResult.Attributes) as EventCollaborator)
    : { ...collaborator, role: newRole, updatedAt: now };

  console.log(
    `[updateCollaboratorRole] Updated role for ${collaboratorId}: ${collaborator.role} → ${newRole}${clearSharing ? ' (folders+suppliers cleared)' : ''}`
  );

  return updatedCollaborator;
};
