/**
 * @file create-event-folder/handler.ts
 * @description Lambda function to create a new DocumentFolder for an event.
 * Bypasses Amplify authorization — verifies user role before creating.
 *
 * Access rules (ADR-021):
 * - OWNER, CO_MANAGER, STAFF_LOGISTICS: Can create folders
 * - STAFF_CHECKIN: Cannot create folders
 *
 * If isDefault=true, idempotently returns existing default folder or creates one.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';

import { ensureEventWritable, ensureWithinLimit } from '../shared/entitlementGate';

interface CreateEventFolderArgs {
  eventId: string;
  name: string;
  description?: string;
  color?: string;
  order?: number;
  parentFolderId?: string;
  isDefault?: boolean;
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

const ROLES_WITH_CREATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

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
  event: AppSyncResolverEvent<CreateEventFolderArgs>
): Promise<DocumentFolderData> => {
  const { eventId, name, description, color, order, parentFolderId, isDefault } = event.arguments;

  // 1. Extract user identity
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!eventId || !name?.trim()) {
    throw new Error('Event ID and folder name are required');
  }

  const trimmedName = name.trim();
  console.log(`[createEventFolder] User ${userId} creating folder "${trimmedName}" for event ${eventId}`);

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
  const eventOwner = eventData.owner as string;
  const isOwner = normalizeUserId(eventOwner) === userId;

  // 3. Determine user role and verify create permission
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

    if (!ROLES_WITH_CREATE.has(userRole)) {
      throw new Error(`Access denied: Role ${userRole} cannot create folders`);
    }
  }

  console.log(`[createEventFolder] User role: ${userRole}`);

  // Gate de billing (§4): janela de escrita + limite de pastas do plano do dono.
  // A pasta default (sistema, idempotente) não conta para o limite do utilizador.
  const billingGate = await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });
  // Contar só quando há teto para impor. Pastas saíram do gate (ADR-038) e o
  // limite é Infinity nos três planos: sem esta guarda, cada criação pagava uma
  // Query cujo FilterExpression lê todas as pastas do evento antes de filtrar,
  // para alimentar uma comparação que nunca falha. A imposição fica — remover a
  // chamada era abrir o mesmo tipo de buraco que o fidelize-sync teve.
  if (!isDefault && Number.isFinite(billingGate.entitlements.folders)) {
    const folderCountResult = await client.send(
      new QueryCommand({
        TableName: FOLDER_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        // A default não consome slot do plano; atributo ausente conta como
        // pasta do utilizador (NOT x = true é true quando x não existe).
        FilterExpression: 'NOT isDefault = :isDefault',
        ExpressionAttributeValues: marshall({ ':eid': eventId, ':isDefault': true }),
        Select: 'COUNT',
      })
    );
    ensureWithinLimit(billingGate.entitlements, 'folders', folderCountResult.Count ?? 0);
  }

  // 4. If isDefault=true, check if a default folder already exists (idempotent)
  if (isDefault) {
    const existingDefaults = await client.send(
      new QueryCommand({
        TableName: FOLDER_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'isDefault = :def',
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':def': true,
        }),
      })
    );

    if (existingDefaults.Items && existingDefaults.Items.length > 0) {
      const existing = unmarshall(existingDefaults.Items[0]) as DocumentFolderData;
      console.log(`[createEventFolder] Default folder already exists: ${existing.id}`);
      return existing;
    }
  }

  // 5. Create the folder record
  // Use deterministic ID for default folders to prevent duplicates from concurrent requests
  const now = new Date().toISOString();
  const folderId = isDefault ? `default-${eventId}` : randomUUID();
  const folderOwner = `${userId}::${userId}`;

  const folderRecord: Record<string, unknown> = {
    id: folderId,
    eventId,
    name: trimmedName,
    owner: folderOwner,
    createdAt: now,
    updatedAt: now,
    __typename: 'DocumentFolder',
  };

  if (description) folderRecord.description = description;
  if (color) folderRecord.color = color;
  if (order !== undefined && order !== null) folderRecord.order = order;
  if (parentFolderId) folderRecord.parentFolderId = parentFolderId;
  if (isDefault) folderRecord.isDefault = true;

  try {
    await client.send(
      new PutItemCommand({
        TableName: FOLDER_TABLE,
        Item: marshall(folderRecord, { removeUndefinedValues: true }),
        ConditionExpression: 'attribute_not_exists(id)',
      })
    );
  } catch (err: unknown) {
    // For default folders with deterministic ID, a ConditionalCheckFailedException
    // means the folder already exists (concurrent creation). Return it instead.
    if (isDefault && (err as { name?: string })?.name === 'ConditionalCheckFailedException') {
      console.log(`[createEventFolder] Default folder already exists (concurrent create), fetching...`);
      const existingResult = await client.send(
        new GetItemCommand({
          TableName: FOLDER_TABLE,
          Key: marshall({ id: folderId }),
        })
      );
      if (existingResult.Item) {
        return unmarshall(existingResult.Item) as DocumentFolderData;
      }
    }
    throw err;
  }

  console.log(`[createEventFolder] Folder ${folderId} created successfully`);

  return {
    id: folderId,
    eventId,
    name: trimmedName,
    description,
    color,
    order,
    parentFolderId,
    isDefault: isDefault || undefined,
    owner: folderOwner,
    createdAt: now,
    updatedAt: now,
  };
};
