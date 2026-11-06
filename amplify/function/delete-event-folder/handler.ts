/**
 * @file delete-event-folder/handler.ts
 * @description Lambda function to delete a DocumentFolder from an event.
 * Bypasses Amplify authorization — verifies user role before deleting.
 *
 * Access rules (ADR-021):
 * - Default (General) folder CANNOT be deleted by anyone
 * - OWNER: Can delete any non-default folder
 * - CO_MANAGER, STAFF_LOGISTICS: Can only delete own non-default folders
 * - STAFF_CHECKIN: Cannot delete folders
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { ensureEventWritable } from '../shared/entitlementGate';

interface DeleteEventFolderArgs {
  id: string;
  eventId: string;
}

interface DocumentFolder {
  id: string;
  eventId: string;
  name: string;
  isDefault?: boolean;
  owner: string;
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
const FOLDER_TABLE = process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<DeleteEventFolderArgs>
): Promise<{ success: boolean; id: string }> => {
  const { id, eventId } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!id || !eventId) {
    throw new Error('Folder ID and Event ID are required');
  }

  console.log(`[deleteEventFolder] User ${userId} deleting folder ${id} for event ${eventId}`);

  // 2. Verify event exists and get owner
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

  // 3. Get the folder to verify it exists, belongs to event, and check isDefault
  const folderResult = await client.send(
    new GetItemCommand({
      TableName: FOLDER_TABLE,
      Key: marshall({ id }),
    })
  );

  if (!folderResult.Item) {
    throw new Error('Folder not found');
  }

  const folder = unmarshall(folderResult.Item) as DocumentFolder;

  // Verify folder belongs to this event
  if (folder.eventId !== eventId) {
    throw new Error('Folder does not belong to this event');
  }

  // 4. Default folder cannot be deleted by anyone
  if (folder.isDefault) {
    throw new Error('Cannot delete the default folder');
  }

  // 5. Determine user role and verify delete permission
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
  }

  console.log(`[deleteEventFolder] User role: ${userRole}`);

  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });

  // 6. Check permissions
  if (userRole === 'STAFF_CHECKIN') {
    throw new Error('Access denied: STAFF_CHECKIN cannot delete folders');
  }

  if (userRole === 'CO_MANAGER' || userRole === 'STAFF_LOGISTICS') {
    if (normalizeUserId(folder.owner) !== userId) {
      throw new Error('Access denied: You can only delete your own folders');
    }
  }

  // 7. Delete the folder
  await client.send(
    new DeleteItemCommand({
      TableName: FOLDER_TABLE,
      Key: marshall({ id }),
    })
  );

  console.log(`[deleteEventFolder] Folder ${id} deleted successfully`);

  return { success: true, id };
};
