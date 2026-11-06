/**
 * @file list-event-folders/handler.ts
 * @description Lambda function to list all DocumentFolders for an event
 * Bypasses Amplify authorization to return folders based on user's event role
 *
 * Per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER: sees ALL folders
 * - CO_MANAGER: sees own folders + folders shared by Owner (sharedFolderIds)
 * - STAFF_LOGISTICS: sees own folders + folders shared by Owner (sharedFolderIds)
 * - STAFF_CHECKIN: no folder access
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface ListEventFoldersArgs {
  eventId: string;
}

interface DocumentFolder {
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

interface EventCollaboration {
  id: string;
  eventId: string;
  userId: string;
  role: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
  sharedFolderIds?: string[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
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
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const FOLDER_TABLE = process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME || '';

/**
 * Main handler for listing event folders
 */
export const handler = async (
  event: AppSyncResolverEvent<ListEventFoldersArgs>
): Promise<{ items: DocumentFolder[] }> => {
  const { eventId } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    console.error('[listEventFolders] Identity error: user not found');
    throw new Error('User identity not found');
  }

  // Format owner for Amplify Gen 2 storage pattern — used for DynamoDB key lookups and folder ownership
  const userOwner = `${userId}::${userId}`;
  console.log(`[listEventFolders] Listing folders for event ${eventId} by user ${userId}`);

  // 2. Verify event exists and check if user is owner (using normalized comparison for Gen 1/Gen 2 resilience)
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
      ProjectionExpression: '#owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
    })
  );

  if (!eventResult.Item) {
    console.error(`[listEventFolders] Event not found: ${eventId}`);
    throw new Error('Event not found');
  }

  const eventData = unmarshall(eventResult.Item);
  const isOwner = normalizeUserId(eventData.owner) === userId;

  console.log(`[listEventFolders] User is ${isOwner ? 'OWNER' : 'not owner'}`);

  // 3. If not owner, check if user is a collaborator
  let userRole: 'OWNER' | 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS' | null = null;
  let sharedFolderIds: string[] = [];

  if (isOwner) {
    userRole = 'OWNER';
  } else {
    // Check if user is an accepted collaborator
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
      console.error(`[listEventFolders] User ${userId} is not authorized to access event ${eventId}`);
      throw new Error('Unauthorized: You do not have access to this event');
    }

    const collaboration = unmarshall(collabQuery.Items[0]) as EventCollaboration;
    userRole = collaboration.role;
    sharedFolderIds = collaboration.sharedFolderIds || [];

    console.log(`[listEventFolders] User is ${userRole}, sharedFolderIds:`, sharedFolderIds);

    // STAFF_CHECKIN has no folder access
    if (userRole === 'STAFF_CHECKIN') {
      console.log(`[listEventFolders] STAFF_CHECKIN has no folder access`);
      return { items: [] };
    }
    // STAFF_LOGISTICS can see shared folders (ACCESS_LEVELS_STRATEGY.md)
  }

  // 4. Query all folders for this event
  const foldersQuery = await client.send(
    new QueryCommand({
      TableName: FOLDER_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: marshall({
        ':eid': eventId,
      }),
    })
  );

  if (!foldersQuery.Items || foldersQuery.Items.length === 0) {
    console.log(`[listEventFolders] No folders found for event ${eventId}`);
    return { items: [] };
  }

  const allFolders = foldersQuery.Items.map(item => unmarshall(item) as DocumentFolder);
  console.log(`[listEventFolders] Found ${allFolders.length} total folders`);

  // 5. Filter folders based on user role (ACCESS_LEVELS_STRATEGY.md)
  let filteredFolders: DocumentFolder[];

  if (userRole === 'OWNER') {
    // Owner sees all folders
    filteredFolders = allFolders;
  } else if (userRole === 'CO_MANAGER') {
    // Co-Manager sees own folders + shared folders (same filter as STAFF_LOGISTICS)
    filteredFolders = allFolders.filter(folder =>
      normalizeUserId(folder.owner) === userId || sharedFolderIds.includes(folder.id)
    );
    console.log(`[listEventFolders] CO_MANAGER filtered to ${filteredFolders.length} folders (own + shared)`);
  } else if (userRole === 'STAFF_LOGISTICS') {
    // Staff Logistics sees own folders + shared folders
    filteredFolders = allFolders.filter(folder =>
      normalizeUserId(folder.owner) === userId || sharedFolderIds.includes(folder.id)
    );
    console.log(`[listEventFolders] STAFF_LOGISTICS filtered to ${filteredFolders.length} folders (own + shared)`);
  } else {
    // Default: no access (should not reach here due to earlier check)
    filteredFolders = [];
  }

  // 6. Sort folders by order, then by name
  filteredFolders.sort((a, b) => {
    if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });

  console.log(`[listEventFolders] Returning ${filteredFolders.length} folders for ${userRole}`);

  return { items: filteredFolders };
};
