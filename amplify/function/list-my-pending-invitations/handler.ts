/**
 * @file list-my-pending-invitations/handler.ts
 * @description Lambda function to list pending invitations for the current user
 * Returns EventCollaborator records where userEmail matches and status is PENDING
 */

import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { getUserEmail } from '../shared/getUserEmail';
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

// AWS clients
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table name from environment
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

/**
 * Main handler for listing pending invitations
 */
export const handler = async (
  event: AppSyncResolverEvent<Record<string, never>>
): Promise<EventCollaborator[]> => {
  // 1. Extract user identity
  const identity = event.identity as any;
  const userId = identity?.sub || identity?.claims?.sub;
  const username = identity?.claims?.username || identity?.username || userId;

  if (!userId) {
    console.error(
      '[listMyPendingInvitations] Identity error: user sub not found'
    );
    throw new Error('User identity not found');
  }

  // 2. Get user email from Cognito (reliable — does not depend on token claims)
  const { email: userEmail } = await getUserEmail({
    userPoolId: process.env.BAFATORIO_APP_USER_POOL_ID || '',
    username,
  });

  const userEmailLower = userEmail.toLowerCase();
  console.log(
    `[listMyPendingInvitations] Fetching pending invitations for user ${userId}`
  );

  // 3. Query invitations by email using the byUserEmail index
  const queryResult = await client.send(
    new QueryCommand({
      TableName: COLLABORATOR_TABLE,
      IndexName: 'byUserEmail',
      KeyConditionExpression: 'userEmail = :email',
      FilterExpression: '#st = :pending',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':email': userEmailLower,
        ':pending': 'PENDING',
      }),
    })
  );

  const invitations = (queryResult.Items || []).map(
    (item) => unmarshall(item) as EventCollaborator
  );

  console.log(
    `[listMyPendingInvitations] Found ${invitations.length} pending invitations`
  );

  return invitations;
};
