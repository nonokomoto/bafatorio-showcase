/**
 * @file update-event-folder/handler.ts
 * @description Lambda function to update a DocumentFolder in an event.
 * Bypasses Amplify authorization — verifies user role before updating.
 *
 * Access rules (ADR-021):
 * - OWNER: Can update any folder
 * - CO_MANAGER, STAFF_LOGISTICS: Can only update own folders
 * - STAFF_CHECKIN: Cannot update folders
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { ensureEventWritable } from '../shared/entitlementGate';

interface UpdateEventFolderArgs {
  id: string;
  eventId: string;
  name?: string;
  description?: string;
  color?: string;
  order?: number;
}

interface DocumentFolderData {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  parentFolderId?: string;
  isDefault?: boolean;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

const ROLES_WITH_UPDATE_ANY = new Set(['OWNER']);

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
  event: AppSyncResolverEvent<UpdateEventFolderArgs>
): Promise<DocumentFolderData> => {
  const { id, eventId, name, description, color, order } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!id || !eventId) {
    throw new Error('Folder ID and Event ID are required');
  }

  console.log(`[updateEventFolder] User ${userId} updating folder ${id} for event ${eventId}`);

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

  // 3. Get the existing folder
  const folderResult = await client.send(
    new GetItemCommand({
      TableName: FOLDER_TABLE,
      Key: marshall({ id }),
    })
  );

  if (!folderResult.Item) {
    throw new Error('Folder not found');
  }

  const folder = unmarshall(folderResult.Item) as DocumentFolderData;

  // Verify folder belongs to this event
  if (folder.eventId !== eventId) {
    throw new Error('Folder does not belong to this event');
  }

  // Default folder cannot be renamed
  if (folder.isDefault && name !== undefined && name !== null) {
    throw new Error('Cannot rename the default folder');
  }

  // 4. Determine user role and verify update permission
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

  console.log(`[updateEventFolder] User role: ${userRole}`);

  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });

  // 5. Check permissions
  if (userRole === 'STAFF_CHECKIN') {
    throw new Error('Access denied: STAFF_CHECKIN cannot update folders');
  }

  if (userRole === 'CO_MANAGER' || userRole === 'STAFF_LOGISTICS') {
    if (normalizeUserId(folder.owner) !== userId) {
      throw new Error('Access denied: You can only update your own folders');
    }
  }

  // 6. Build update expression (only provided fields)
  const now = new Date().toISOString();
  const expressionParts: string[] = ['#updatedAt = :updatedAt'];
  const expressionNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const expressionValues: Record<string, unknown> = { ':updatedAt': now };

  if (name !== undefined && name !== null) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Folder name cannot be empty');
    }
    expressionParts.push('#name = :name');
    expressionNames['#name'] = 'name';
    expressionValues[':name'] = trimmedName;
  }

  if (description !== undefined) {
    expressionParts.push('#description = :description');
    expressionNames['#description'] = 'description';
    expressionValues[':description'] = description;
  }

  if (color !== undefined) {
    expressionParts.push('#color = :color');
    expressionNames['#color'] = 'color';
    expressionValues[':color'] = color;
  }

  if (order !== undefined && order !== null) {
    expressionParts.push('#order = :order');
    expressionNames['#order'] = 'order';
    expressionValues[':order'] = order;
  }

  // 7. Execute update
  const updateResult = await client.send(
    new UpdateItemCommand({
      TableName: FOLDER_TABLE,
      Key: marshall({ id }),
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: marshall(expressionValues),
      ReturnValues: 'ALL_NEW',
    })
  );

  const updatedFolder = unmarshall(updateResult.Attributes!) as DocumentFolderData;
  console.log(`[updateEventFolder] Folder ${id} updated successfully`);

  return updatedFolder;
};
