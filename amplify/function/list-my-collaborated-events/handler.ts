/**
 * @file list-my-collaborated-events/handler.ts
 * @description Lambda function to list events where the user is a collaborator
 * Returns EventCollaborator records with complete Event data
 */

import { DynamoDBClient, QueryCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
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

interface Event {
  id: string;
  eventTitle: string;
  eventManager: string;
  eventManagerEmail: string;
  eventManagerPhone: string;
  eventLocation: string;
  eventCreationDate: string;
  eventStatus: string;
  eventType: string;
  organizerId: string;
  description: string;
  categories: string[];
  budget: number;
  committedExpenses: number;
  effectiveExpenses: number;
  participantCount: number;
  dependentCount: number;
  totalRegistrations: number;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

interface CollaboratedEventResult {
  collaboration: EventCollaborator;
  event: Event | null;
  userRole: string;
}

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';

/**
 * Main handler for listing collaborated events
 */
export const handler = async (
  event: AppSyncResolverEvent<Record<string, never>>
): Promise<CollaboratedEventResult[]> => {
  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    console.error(
      '[listMyCollaboratedEvents] Identity error: user sub not found'
    );
    throw new Error('User identity not found');
  }

  console.log(
    `[listMyCollaboratedEvents] Fetching collaborated events for user ${userId}`
  );

  // 2. Query collaborations by userId using the byUserId index
  const queryResult = await client.send(
    new QueryCommand({
      TableName: COLLABORATOR_TABLE,
      IndexName: 'byUserId',
      KeyConditionExpression: 'userId = :uid',
      FilterExpression: '#st = :accepted',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':uid': userId,
        ':accepted': 'ACCEPTED',
      }),
    })
  );

  const collaborations = (queryResult.Items || []).map(
    (item) => unmarshall(item) as EventCollaborator
  );

  console.log(
    `[listMyCollaboratedEvents] Found ${collaborations.length} collaborated events`
  );

  // 3. Batch-fetch all Event data in one call (max 100 per batch)
  if (collaborations.length === 0) {
    return [];
  }

  // Deduplicate event IDs (a user could theoretically have multiple collab records for same event)
  const uniqueEventIds = [...new Set(collaborations.map((c) => c.eventId))];

  // Build event map from BatchGetItem (DynamoDB supports max 100 keys per batch)
  const eventMap = new Map<string, Event>();

  for (let i = 0; i < uniqueEventIds.length; i += 100) {
    const batch = uniqueEventIds.slice(i, i + 100);
    try {
      const batchResult = await client.send(
        new BatchGetItemCommand({
          RequestItems: {
            [EVENT_TABLE]: {
              Keys: batch.map((id) => marshall({ id })),
            },
          },
        })
      );

      const items = batchResult.Responses?.[EVENT_TABLE] || [];
      for (const item of items) {
        const eventData = unmarshall(item) as Event;
        eventMap.set(eventData.id, eventData);
      }
    } catch (error) {
      console.error(
        `[listMyCollaboratedEvents] Error in batch fetch (batch ${i / 100 + 1}):`,
        error
      );
    }
  }

  // 4. Combine collaborations with event data
  const results: CollaboratedEventResult[] = collaborations.map((collaboration) => ({
    collaboration,
    event: eventMap.get(collaboration.eventId) || null,
    userRole: collaboration.role,
  }));

  console.log(
    `[listMyCollaboratedEvents] Returning ${results.length} collaborated events (${eventMap.size} events fetched)`
  );

  return results;
};
