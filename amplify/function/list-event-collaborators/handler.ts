/**
 * @file list-event-collaborators/handler.ts
 * @description Lambda function to list all collaborators for a specific event
 * Implements permission checks per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER: Can see all collaborators
 * - CO_MANAGER: Can see all collaborators (to manage team)
 * - STAFF: Cannot access this endpoint
 */

import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface EventCollaborator {
  id: string;
  eventId: string;
  userId?: string;
  userEmail: string;
  role: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
  sharedFolderIds: string[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

interface ListEventCollaboratorsResult {
  items: EventCollaborator[];
}

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats.
 * Ensures consistent owner comparison across all Lambda handlers.
 * @see get-event-as-collaborator/handler.ts for canonical implementation
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';

/**
 * Main handler for listing event collaborators
 */
export const handler = async (
  event: AppSyncResolverEvent<{ eventId: string }>
): Promise<ListEventCollaboratorsResult> => {
  const { eventId } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    console.error('[listEventCollaborators] Identity error: user sub not found');
    throw new Error('User identity not found');
  }

  if (!eventId) {
    throw new Error('eventId is required');
  }

  console.log(
    `[listEventCollaborators] User ${userId} requesting collaborators for event ${eventId}`
  );

  // 2. Check if user is the event owner (using normalized comparison for Gen 1/Gen 2 resilience)
  let isOwner = false;
  try {
    const eventResult = await client.send(
      new GetItemCommand({
        TableName: EVENT_TABLE,
        Key: marshall({ id: eventId }),
        ConsistentRead: true,
        ProjectionExpression: '#owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
      })
    );

    if (eventResult.Item) {
      const eventItem = unmarshall(eventResult.Item);
      if (normalizeUserId(eventItem.owner) === userId) {
        isOwner = true;
        console.log(`[listEventCollaborators] User is event owner`);
      }
    } else {
      throw new Error('Event not found');
    }
  } catch (error) {
    console.error('[listEventCollaborators] Error checking event ownership:', error);
    throw new Error('Failed to verify event access');
  }

  // 3. If not owner, check if user is CO_MANAGER collaborator
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

    const userCollab = collabQuery.Items?.[0]
      ? unmarshall(collabQuery.Items[0])
      : null;

    // Per ACCESS_LEVELS_STRATEGY.md: Only OWNER and CO_MANAGER can view team
    if (!userCollab || userCollab.role !== 'CO_MANAGER') {
      console.error(
        `[listEventCollaborators] User ${userId} is not authorized to view collaborators (not owner or co-manager)`
      );
      throw new Error('Unauthorized: Only event owner and co-managers can view team members');
    }

    console.log(`[listEventCollaborators] User is CO_MANAGER collaborator`);
  }

  // 4. User is authorized - fetch all collaborators
  const queryResult = await client.send(
    new QueryCommand({
      TableName: COLLABORATOR_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eventId',
      ExpressionAttributeValues: marshall({
        ':eventId': eventId,
      }),
    })
  );

  const collaborators = (queryResult.Items || []).map(
    (item) => unmarshall(item) as EventCollaborator
  );

  console.log(
    `[listEventCollaborators] Returning ${collaborators.length} collaborators to authorized user`
  );

  return {
    items: collaborators,
  };
};
