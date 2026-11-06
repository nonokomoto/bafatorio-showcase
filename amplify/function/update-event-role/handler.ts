/**
 * @file update-event-role/handler.ts
 * @description Lambda function to update (rename / recolor) an event role.
 * Verifies user is OWNER or CO_MANAGER with ROLE_MANAGE permission.
 *
 * Access rules:
 * - OWNER, CO_MANAGER (with ROLE_MANAGE): Can update roles
 * - STAFF_*: Cannot update roles
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

interface UpdateEventRoleArgs {
  eventId: string;
  roleId: string;
  name: string;
  color?: string | null;
}

interface RoleData {
  id: string;
  eventId: string;
  name: string;
  color: string | null;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Must match ROLE_COLORS in src/Components/Participant/roleBadgeConfig.js
const ROLE_COLOR_KEYS = new Set([
  'blue', 'violet', 'amber', 'green', 'pink', 'red', 'indigo', 'orange', 'teal', 'slate',
]);

const ROLE_TABLE = process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<UpdateEventRoleArgs>
): Promise<RoleData> => {
  const { eventId, roleId, name, color } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!eventId?.trim() || !roleId?.trim() || !name?.trim()) {
    throw new Error('Event ID, role ID, and role name are required');
  }

  const trimmedName = name.trim();

  // undefined = keep current color; '' / null = back to the automatic color
  const clearColor = color === null || color === '';
  if (color !== undefined && !clearColor && !ROLE_COLOR_KEYS.has(color as string)) {
    throw new Error(`Invalid role color: ${color}`);
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

  const currentNameLower = (roleData.name as string).toLowerCase();
  const newNameLower = trimmedName.toLowerCase();

  if (currentNameLower !== newNameLower) {
    let duplicateFound = false;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const rolesPage = await client.send(
        new QueryCommand({
          TableName: ROLE_TABLE,
          IndexName: 'byEventId',
          KeyConditionExpression: 'eventId = :eid',
          ExpressionAttributeValues: marshall({ ':eid': eventId }),
          ExclusiveStartKey: lastEvaluatedKey ? marshall(lastEvaluatedKey) : undefined,
        })
      );

      for (const item of rolesPage.Items ?? []) {
        const role = unmarshall(item);
        if (
          role.id !== roleId &&
          (role.name as string).toLowerCase() === newNameLower
        ) {
          duplicateFound = true;
          break;
        }
      }

      if (duplicateFound) break;

      lastEvaluatedKey = rolesPage.LastEvaluatedKey
        ? (unmarshall(rolesPage.LastEvaluatedKey) as Record<string, unknown>)
        : undefined;
    } while (lastEvaluatedKey);

    if (duplicateFound) {
      throw new Error(`A role named "${trimmedName}" already exists in this event`);
    }
  }

  const now = new Date().toISOString();

  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: ROLE_TABLE,
      Key: marshall({ id: roleId }),
      UpdateExpression: [
        `SET #n = :name, #u = :now${color && !clearColor ? ', #c = :color' : ''}`,
        clearColor ? 'REMOVE #c' : '',
      ].join(' ').trim(),
      ExpressionAttributeNames: {
        '#n': 'name',
        '#u': 'updatedAt',
        ...(color !== undefined && { '#c': 'color' }),
      },
      ExpressionAttributeValues: marshall({
        ':name': trimmedName,
        ':now': now,
        ...(color && !clearColor && { ':color': color }),
      }),
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!updateResult.Attributes) {
    throw new Error('Failed to update role');
  }

  const updatedRole = unmarshall(updateResult.Attributes);

  return {
    id: updatedRole.id as string,
    eventId: updatedRole.eventId as string,
    name: updatedRole.name as string,
    color: (updatedRole.color as string | undefined) ?? null,
    owner: updatedRole.owner as string,
    createdAt: updatedRole.createdAt as string,
    updatedAt: updatedRole.updatedAt as string,
  };
};
