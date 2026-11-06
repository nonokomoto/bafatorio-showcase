/**
 * @file list-event-roles/handler.ts
 * @description Lambda function to list all Roles for an event.
 * Bypasses Amplify authorization to return roles based on user's event role.
 *
 * Access rules:
 * - OWNER, CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN: See all event roles
 *   (any collaborator who manages participants needs access to roles)
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

interface ListEventRolesArgs {
  eventId: string;
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

export const handler = async (
  event: AppSyncResolverEvent<ListEventRolesArgs>
): Promise<{ items: RoleData[] }> => {
  const { eventId } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  console.log(`[listEventRoles] Listing roles for event ${eventId} by user ${userId}`);

  // 1. Verify event exists and check if user is owner
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
  const isOwner = normalizeUserId(eventData.owner) === userId;

  // 2. If not owner, check if user is an accepted collaborator
  if (!isOwner) {
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

    // All collaborator roles can see event roles (needed for participant management)
    const collaboration = unmarshall(collabQuery.Items[0]);
    console.log(`[listEventRoles] User is ${collaboration.role}`);
  } else {
    console.log(`[listEventRoles] User is OWNER`);
  }

  // 3. Query all roles for this event using byEventId GSI
  const allRoles: RoleData[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const rolesQuery = await client.send(
      new QueryCommand({
        TableName: ROLE_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'attribute_not_exists(archived) OR archived = :false',
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':false': false,
        }),
        ...(lastEvaluatedKey && { ExclusiveStartKey: marshall(lastEvaluatedKey) }),
      })
    );

    if (rolesQuery.Items) {
      for (const item of rolesQuery.Items) {
        const role = unmarshall(item);
        allRoles.push({
          id: role.id as string,
          eventId: role.eventId as string,
          name: role.name as string,
          color: (role.color as string | undefined) ?? null,
          owner: role.owner as string | undefined,
          createdAt: role.createdAt as string | undefined,
          updatedAt: role.updatedAt as string | undefined,
        });
      }
    }

    lastEvaluatedKey = rolesQuery.LastEvaluatedKey
      ? unmarshall(rolesQuery.LastEvaluatedKey)
      : undefined;
  } while (lastEvaluatedKey);

  // 4. Sort roles alphabetically by name
  allRoles.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`[listEventRoles] Returning ${allRoles.length} roles for event ${eventId}`);

  return { items: allRoles };
};
