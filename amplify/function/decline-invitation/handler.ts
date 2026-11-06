/**
 * @file decline-invitation/handler.ts
 * @description Lambda function to decline an event collaboration invitation
 * Updates EventCollaborator status from PENDING to DECLINED
 *
 * Follows ADR-013 pattern for DynamoDB owner keys
 */

import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { getUserEmail } from '../shared/getUserEmail';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface DeclineInvitationArgs {
  invitationId: string;
}

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
 * Redacts email for logging (shows first 3 chars + domain)
 * Example: john.doe@example.com -> joh***@example.com
 */
const redactEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.substring(0, 3)}***@${domain}`;
};

/**
 * Main handler for declining invitations
 */
export const handler = async (
  event: AppSyncResolverEvent<DeclineInvitationArgs>
): Promise<EventCollaborator> => {
  const { invitationId } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as any;
  const userId = identity?.sub || identity?.claims?.sub;
  const username = identity?.claims?.username || identity?.username || userId;

  if (!userId) {
    console.error('[declineInvitation] Identity error: user sub not found');
    throw new Error('User identity not found');
  }

  // 2. Get user email from Cognito (reliable — does not depend on token claims)
  const { email: userEmail } = await getUserEmail({
    userPoolId: process.env.BAFATORIO_APP_USER_POOL_ID || '',
    username,
  });
  console.log(`[declineInvitation] Got user email from Cognito: ${redactEmail(userEmail)}`);

  const userEmailLower = userEmail.toLowerCase();
  console.log(
    `[declineInvitation] Decline invitation: ${invitationId} by user ${userId} (${redactEmail(userEmailLower)})`
  );

  // 3. Find the invitation by email and invitationId
  const inviteQuery = await client.send(
    new QueryCommand({
      TableName: COLLABORATOR_TABLE,
      IndexName: 'byUserEmail',
      KeyConditionExpression: 'userEmail = :email',
      FilterExpression: 'id = :id AND #st = :pending',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':email': userEmailLower,
        ':id': invitationId,
        ':pending': 'PENDING',
      }),
    })
  );

  const invitationItem = inviteQuery.Items?.[0];
  if (!invitationItem) {
    console.error(
      `[declineInvitation] Invitation not found: ${invitationId} for email ${redactEmail(userEmailLower)}`
    );
    throw new Error('Invitation not found or already processed');
  }

  const invitation = unmarshall(invitationItem) as EventCollaborator;

  // 4. Verify the invitation belongs to this user's email
  if (invitation.userEmail !== userEmailLower) {
    console.error(
      `[declineInvitation] Email mismatch for invitation ${invitationId}`
    );
    throw new Error('This invitation is not for your email address');
  }

  // 5. Update the invitation status to DECLINED
  const now = new Date().toISOString();

  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: invitationId }),
      UpdateExpression: 'SET #st = :declined, updatedAt = :now',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':declined': 'DECLINED',
        ':now': now,
        ':pending': 'PENDING',
      }),
      ConditionExpression: '#st = :pending',
      ReturnValues: 'ALL_NEW',
    })
  );

  const updatedCollaborator = updateResult.Attributes
    ? (unmarshall(updateResult.Attributes) as EventCollaborator)
    : { ...invitation, status: 'DECLINED' as const, updatedAt: now };

  console.log(
    `[declineInvitation] Invitation declined: ${invitationId} by ${userId}`
  );

  return updatedCollaborator;
};
