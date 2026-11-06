/**
 * @file accept-invitation/handler.ts
 * @description Lambda function to accept an event collaboration invitation
 * Updates EventCollaborator status from PENDING to ACCEPTED
 * Sets userId to the accepting user's Cognito sub
 *
 * Follows ADR-013 pattern for DynamoDB owner keys
 */

import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getUserEmail } from '../shared/getUserEmail';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface AcceptInvitationArgs {
  invitationId: string;
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
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
const dynamoClient = new DynamoDBClient({
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
 * Main handler for accepting invitations
 */
export const handler = async (
  event: AppSyncResolverEvent<AcceptInvitationArgs>
): Promise<EventCollaborator> => {
  const { invitationId } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as any;
  const userId = identity?.sub || identity?.claims?.sub;
  const username = identity?.claims?.username || identity?.username || userId;

  if (!userId) {
    console.error('[acceptInvitation] Identity error: user sub not found');
    throw new Error('User identity not found');
  }

  console.log(`[acceptInvitation] User ID: ${userId}, Username: ${username}`);

  // 2. Get user email from Cognito
  // Access tokens don't contain email, so we fetch it from Cognito User Pool
  const { email: userEmail, name: userName } = await getUserEmail({
    userPoolId: process.env.BAFATORIO_APP_USER_POOL_ID || '',
    username,
  });
  console.log(`[acceptInvitation] Got user email from Cognito: ${redactEmail(userEmail)}, name: ${userName || '(not set)'}`);

  const userEmailLower = userEmail.toLowerCase();
  console.log(
    `[acceptInvitation] Accept invitation: ${invitationId} by user ${userId} (${redactEmail(userEmailLower)})`
  );

  // 3. Find the invitation by email and invitationId
  // We use the byUserEmail index because the user doesn't know the owner
  const inviteQuery = await dynamoClient.send(
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
      `[acceptInvitation] Invitation not found: ${invitationId} for email ${userEmailLower}`
    );
    throw new Error('Invitation not found or already processed');
  }

  const invitation = unmarshall(invitationItem) as EventCollaborator;

  // 3. Verify the invitation belongs to this user's email
  if (invitation.userEmail !== userEmailLower) {
    console.error(
      `[acceptInvitation] Email mismatch: invitation email ${invitation.userEmail} vs user email ${userEmailLower}`
    );
    throw new Error('This invitation is not for your email address');
  }

  // 4. Update the invitation status to ACCEPTED
  const now = new Date().toISOString();

  // Build update expression — include userName only if available
  const updateExpression = userName
    ? 'SET #st = :accepted, userId = :uid, userName = :uname, acceptedAt = :now, updatedAt = :now'
    : 'SET #st = :accepted, userId = :uid, acceptedAt = :now, updatedAt = :now';

  const expressionValues: Record<string, any> = {
    ':accepted': 'ACCEPTED',
    ':uid': userId,
    ':now': now,
    ':pending': 'PENDING',
  };
  if (userName) {
    expressionValues[':uname'] = userName;
  }

  const updateResult = await dynamoClient.send(
    new UpdateItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: invitationId }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall(expressionValues),
      // Only update if still pending
      ConditionExpression: '#st = :pending',
      ReturnValues: 'ALL_NEW',
    })
  );

  const updatedCollaborator = updateResult.Attributes
    ? (unmarshall(updateResult.Attributes) as EventCollaborator)
    : ({ ...invitation, status: 'ACCEPTED' as const, userId, acceptedAt: now } as EventCollaborator);

  console.log(
    `[acceptInvitation] Invitation accepted: ${invitationId} by ${userId}`
  );

  return updatedCollaborator;
};
