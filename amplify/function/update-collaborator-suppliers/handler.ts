/**
 * @file update-collaborator-suppliers/handler.ts
 * @description Lambda function to update shared suppliers for a CO_MANAGER or STAFF_LOGISTICS
 * Only OWNER can update supplier sharing per ADR-017
 * Pattern: identical to update-collaborator-folders
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
interface UpdateCollaboratorSuppliersArgs {
  collaboratorId: string;
  sharedSupplierIds: string[];
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  role: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
  sharedFolderIds: string[];
  sharedSupplierIds: string[];
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
 * Main handler for updating collaborator shared suppliers
 */
export const handler = async (
  event: AppSyncResolverEvent<UpdateCollaboratorSuppliersArgs>
): Promise<EventCollaborator> => {
  const { collaboratorId, sharedSupplierIds } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    console.error('[updateCollaboratorSuppliers] Identity error: user not found');
    throw new Error('User identity not found');
  }

  console.log(
    `[updateCollaboratorSuppliers] Update request for ${collaboratorId} by ${userId}`
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
      `[updateCollaboratorSuppliers] Collaborator not found: ${collaboratorId}`
    );
    throw new Error('Collaborator not found');
  }

  const collaborator = unmarshall(getResult.Item) as EventCollaborator;

  // 3. Verify collaborator role supports shared suppliers (CO_MANAGER or STAFF_LOGISTICS)
  if (collaborator.role !== 'CO_MANAGER' && collaborator.role !== 'STAFF_LOGISTICS') {
    console.error(
      `[updateCollaboratorSuppliers] Cannot update suppliers for role: ${collaborator.role}`
    );
    throw new Error('Only CO_MANAGER and STAFF_LOGISTICS roles can have shared suppliers');
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
      `[updateCollaboratorSuppliers] User ${userId} is not the event owner`
    );
    throw new Error('Unauthorized: Only event owner can update supplier sharing');
  }

  // 5. Update the sharedSupplierIds
  const now = new Date().toISOString();

  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
      UpdateExpression: 'SET sharedSupplierIds = :suppliers, updatedAt = :now',
      ExpressionAttributeValues: marshall({
        ':suppliers': sharedSupplierIds || [],
        ':now': now,
      }),
      ReturnValues: 'ALL_NEW',
    })
  );

  const updatedCollaborator = updateResult.Attributes
    ? (unmarshall(updateResult.Attributes) as EventCollaborator)
    : { ...collaborator, sharedSupplierIds, updatedAt: now };

  console.log(
    `[updateCollaboratorSuppliers] Updated suppliers for ${collaboratorId}: ${sharedSupplierIds.length} suppliers`
  );

  return updatedCollaborator;
};
