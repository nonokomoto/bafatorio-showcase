/**
 * @file create-event-role/handler.ts
 * @description Lambda function to create a new Role for an event.
 * Bypasses Amplify authorization — verifies the caller's role on the event.
 *
 * Role aqui é a categoria de participante ("Palestrante", "VIP"), não o acesso
 * ao evento — por isso quem gere participantes também as cria (ADR-019).
 *
 * Access rules:
 * - OWNER, CO_MANAGER, STAFF_LOGISTICS: Can create roles
 * - STAFF_CHECKIN: Cannot create roles
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { ensureEventWritable } from '../shared/entitlementGate';

interface CreateEventRoleArgs {
  eventId: string;
  name: string;
}

interface RoleData {
  id: string;
  eventId: string;
  name: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ROLES_WITH_CREATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats.
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const ROLE_TABLE = process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<CreateEventRoleArgs>
): Promise<RoleData> => {
  const { eventId, name } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!eventId || !name?.trim()) {
    throw new Error('Event ID and role name are required');
  }

  const trimmedName = name.trim();
  console.log(`[createEventRole] User ${userId} creating role "${trimmedName}" for event ${eventId}`);

  // 1. Verify event exists and get owner
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
      ProjectionExpression: '#owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
    })
  );

  if (!eventResult.Item) {
    throw new Error('Event not found');
  }

  const eventData = unmarshall(eventResult.Item);
  const eventOwner = eventData.owner as string;
  const isOwner = normalizeUserId(eventOwner) === userId;

  // 2. Determine user role and verify create permission
  let userRole: string;

  if (isOwner) {
    userRole = 'OWNER';
  } else {
    const collabQuery = await client.send(
      new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'userId = :uid AND #st = :accepted',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':uid': userId,
          ':accepted': 'ACCEPTED',
        }),
      })
    );

    if (!collabQuery.Items || collabQuery.Items.length === 0) {
      throw new Error('Unauthorized: You do not have access to this event');
    }

    const collaboration = unmarshall(collabQuery.Items[0]);
    userRole = collaboration.role as string;

    if (!ROLES_WITH_CREATE.has(userRole)) {
      throw new Error(`Access denied: Role ${userRole} cannot create roles`);
    }
  }



  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });

  // 3. Check for duplicate role name in this event
  const existingRoles = await client.send(
    new QueryCommand({
      TableName: ROLE_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      FilterExpression: '#n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: marshall({
        ':eid': eventId,
        ':name': trimmedName,
      }),
    })
  );

  if (existingRoles.Items?.length) {
    const existingRole = unmarshall(existingRoles.Items[0]);

    if (existingRole.archived === true) {
      const now = new Date().toISOString();
      const revived = await client.send(
        new UpdateItemCommand({
          TableName: ROLE_TABLE,
          Key: marshall({ id: existingRole.id }),
          UpdateExpression: 'SET archived = :false, #u = :now',
          ExpressionAttributeNames: { '#u': 'updatedAt' },
          ExpressionAttributeValues: marshall({
            ':false': false,
            ':now': now,
          }),
          ReturnValues: 'ALL_NEW',
        })
      );

      const row = unmarshall(revived.Attributes ?? {});
      console.log(`[createEventRole] Revived archived role ${row.id}`);
       return {
          id: row.id as string,
          eventId: row.eventId as string,
          name: row.name as string,
          owner: row.owner as string,
          createdAt: row.createdAt as string,
          updatedAt: row.updatedAt as string,
        };

    }

    throw new Error(`A role named "${trimmedName}" already exists in this event`);
  }

  // 4. Create the role record (owner = event owner for DDB auth consistency)
  const now = new Date().toISOString();
  const roleId = randomUUID();

  const roleRecord = {
    id: roleId,
    eventId,
    name: trimmedName,
    owner: eventOwner,
    createdAt: now,
    updatedAt: now,
    __typename: 'Role',
  };

  await client.send(
    new PutItemCommand({
      TableName: ROLE_TABLE,
      Item: marshall(roleRecord, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(id)',
    })
  );

  console.log(`[createEventRole] Role ${roleId} created successfully`);

  return {
    id: roleId,
    eventId,
    name: trimmedName,
    owner: eventOwner,
    createdAt: now,
    updatedAt: now,
  };
};
