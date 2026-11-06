/**
 * @file update-collaborator-folders/handler.ts
 * @description Lambda function to update shared folders for a CO_MANAGER or STAFF_LOGISTICS
 * Only OWNER can update folder sharing per ACCESS_LEVELS_STRATEGY.md
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
interface UpdateCollaboratorFoldersArgs {
  collaboratorId: string;
  sharedFolderIds: string[];
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userId: string;
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

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

/**
 * Main handler for updating collaborator shared folders
 */
export const handler = async (
  event: AppSyncResolverEvent<UpdateCollaboratorFoldersArgs>
): Promise<EventCollaborator> => {
  const { collaboratorId, sharedFolderIds } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    console.error('[updateCollaboratorFolders] Identity error: user not found');
    throw new Error('User identity not found');
  }

  console.log(
    `[updateCollaboratorFolders] Update request for ${collaboratorId} by ${userId}`
  );

  // 2. Get the collaborator record
  const getResult = await client.send(
    new GetItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
    })
  );

  if (!getResult.Item) {
    console.error(
      `[updateCollaboratorFolders] Collaborator not found: ${collaboratorId}`
    );
    throw new Error('Collaborator not found');
  }

  const collaborator = unmarshall(getResult.Item) as EventCollaborator;

  // 3. Verify collaborator role supports shared folders (CO_MANAGER or STAFF_LOGISTICS)
  if (collaborator.role !== 'CO_MANAGER' && collaborator.role !== 'STAFF_LOGISTICS') {
    console.error(
      `[updateCollaboratorFolders] Cannot update folders for role: ${collaborator.role}`
    );
    throw new Error('Only CO_MANAGER and STAFF_LOGISTICS roles can have shared folders');
  }

  // 4. Verify requester is the event owner (ADR-015: via resolveEventAccess)
  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId: collaborator.eventId,
    userId,
  });

  if (access.role !== 'OWNER') {
    console.error(
      `[updateCollaboratorFolders] User ${userId} is not the event owner`
    );
    throw new Error('Unauthorized: Only event owner can update folder sharing');
  }

  // 5. Update the sharedFolderIds
  const now = new Date().toISOString();

  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
      UpdateExpression: 'SET sharedFolderIds = :folders, updatedAt = :now',
      ExpressionAttributeValues: marshall({
        ':folders': sharedFolderIds || [],
        ':now': now,
      }),
      ReturnValues: 'ALL_NEW',
    })
  );

  const updatedCollaborator = updateResult.Attributes
    ? (unmarshall(updateResult.Attributes) as EventCollaborator)
    : { ...collaborator, sharedFolderIds, updatedAt: now };

  console.log(
    `[updateCollaboratorFolders] Updated folders for ${collaboratorId}: ${sharedFolderIds.length} folders`
  );

  return updatedCollaborator;
};
