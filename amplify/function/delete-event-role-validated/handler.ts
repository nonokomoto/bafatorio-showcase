/**
 * @file delete-event-role-validated/handler.ts
 * @description Lambda function to safely delete an event role after validating no participants are assigned.
 * Verifies user is OWNER or CO_MANAGER with ROLE_MANAGE permission.
 *
 * Access rules:
 * - OWNER, CO_MANAGER (with ROLE_MANAGE): Can delete roles
 * - STAFF_*: Cannot delete roles
 *
 * Deletion rules:
 * - If participants are assigned to the role → return { success: false, participantCount: N }
 * - If no participants → soft-delete role (archived: true) and return { success: true, participantCount: 0 }
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

interface DeleteEventRoleArgs {
  eventId: string;
  roleId: string;
}

interface DeleteRoleResult {
  success: boolean;
  participantCount: number;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const ROLE_TABLE = process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<DeleteEventRoleArgs>
): Promise<DeleteRoleResult> => {
  const { eventId, roleId } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!eventId?.trim() || !roleId?.trim()) {
    throw new Error('Event ID and role ID are required');
  }

  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId,
    userId,
  });

  if (!access.hasPermission('role:manage')) {
    throw new Error('Access denied: You do not have permission to manage roles');
  }
  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
    // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
    eventRecord: access.eventRecord,
  });


  const roleResult = await client.send(
    new GetItemCommand({
      TableName: ROLE_TABLE,
      Key: marshall({ id: roleId }),
    })
  );

  if (!roleResult.Item) {
    throw new Error('Role not found');
  }

  const roleData = unmarshall(roleResult.Item);

  if (roleData.eventId !== eventId) {
    throw new Error('Role does not belong to this event');
  }

  // Count participants using this role via the implicit GSI created by
  // Role.participants: hasMany('Participant', 'roleId'). The GSI is keyed on
  // roleId, so a Query hits only matching items (vs scanning the table).
  let totalCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const page = await client.send(
      new QueryCommand({
        TableName: PARTICIPANT_TABLE,
        IndexName: 'gsi-Role.participants',
        KeyConditionExpression: 'roleId = :rid',
        ExpressionAttributeValues: marshall({ ':rid': roleId }),
        Select: 'COUNT',
        ExclusiveStartKey: lastEvaluatedKey ? marshall(lastEvaluatedKey) : undefined,
      })
    );

    totalCount += page.Count ?? 0;
    lastEvaluatedKey = page.LastEvaluatedKey
      ? (unmarshall(page.LastEvaluatedKey) as Record<string, unknown>)
      : undefined;
  } while (lastEvaluatedKey);

  if (totalCount > 0) {
    return {
      success: false,
      participantCount: totalCount,
    };
  }

  // Soft-delete: set archived: true to avoid the race condition where a new
  // Participant could be created between the count check and a hard delete,
  // leaving orphaned references to a non-existent role.
  const now = new Date().toISOString();
  await client.send(
    new UpdateItemCommand({
      TableName: ROLE_TABLE,
      Key: marshall({ id: roleId }),
      UpdateExpression: 'SET archived = :true, #u = :now',
      ExpressionAttributeNames: {
        '#u': 'updatedAt',
      },
      ExpressionAttributeValues: marshall({
        ':true': true,
        ':now': now,
      }),
    })
  );

  return {
    success: true,
    participantCount: 0,
  };
};
