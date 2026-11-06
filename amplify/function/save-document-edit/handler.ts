/**
 * @file save-document-edit/handler.ts
 * @description AppSync resolver Lambda that authorizes a document edit and returns
 * a short-lived S3 pre-signed PUT URL scoped to the exact document path.
 *
 * Why pre-signed URL + AppSync resolver:
 *   - Identity (`event.identity.sub`) is injected by Cognito via AppSync — cannot be forged.
 *   - The URL is signed for one specific S3 key + PUT method + short TTL. The user cannot
 *     redirect the write elsewhere, cannot keep writing after the window, and never
 *     writes directly to S3 with their own IAM credentials.
 *
 * Access rules (ADR-021):
 *   - OWNER: edit in ANY folder
 *   - CO_MANAGER / STAFF_LOGISTICS: edit ONLY in folders they own (shared folders are upload-only, NOT edit)
 *   - STAFF_CHECKIN: no edit
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { ensureEventWritable } from '../shared/entitlementGate';

interface SaveDocumentEditArgs {
  eventId: string;
  folderId: string;
  documentPath: string;
}

interface SaveDocumentEditResult {
  presignedUrl: string;
  expiresIn: number;
}

const ROLES_WITH_OWNER_OR_CO_MANAGER = new Set(['OWNER', 'CO_MANAGER']);
const ROLES_WITH_OWN_FOLDER_EDIT = new Set(['CO_MANAGER', 'STAFF_LOGISTICS']);

const PRESIGN_TTL_SECONDS = 60;

const normalizeUserId = (id: string | undefined): string | undefined => {
  if (!id) return undefined;
  return id.split('::')[0];
};

const region = () => process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const eventTable = () => process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const collaboratorTable = () => process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const folderTable = () => process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME || '';
const userSubscriptionTable = () => process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const bucket = () => process.env.BAFATORIO_APP_S3_BUCKET_NAME || '';

const dynamo = new DynamoDBClient({ region: region() });
const s3 = new S3Client({ region: region() });

const isValidDocumentPath = (path: string, eventId: string, folderId: string): boolean => {
  if (!path || path.includes('..') || path.includes('//')) return false;
  const pathRegex = /^event-documents\/([^/]+)\/([^/]+)\/(.+)$/;
  const match = path.match(pathRegex);
  if (!match) return false;
  if (match[1] !== eventId || match[2] !== folderId) return false;
  const filename = match[3];
  if (!filename || filename.includes('/')) return false;
  return true;
};

export const handler = async (
  event: AppSyncResolverEvent<SaveDocumentEditArgs>
): Promise<SaveDocumentEditResult> => {
  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  const { eventId, folderId, documentPath } = event.arguments || ({} as SaveDocumentEditArgs);

  if (!eventId || !folderId || !documentPath) {
    throw new Error('Missing required arguments: eventId, folderId, documentPath');
  }

  if (!isValidDocumentPath(documentPath, eventId, folderId)) {
    throw new Error('Invalid document path');
  }

  // 1. Fetch Event to determine ownership
  const eventResult = await dynamo.send(
    new GetItemCommand({
      TableName: eventTable(),
      Key: marshall({ id: eventId }),
      ProjectionExpression: '#owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
    })
  );

  if (!eventResult.Item) {
    throw new Error('Event not found');
  }

  const eventData = unmarshall(eventResult.Item);
  const eventOwner = normalizeUserId(eventData.owner as string);
  const isEventOwner = eventOwner === userId;

  // 2. Resolve user role
  let userRole: string;
  if (isEventOwner) {
    userRole = 'OWNER';
  } else {
    const collabResult = await dynamo.send(
      new QueryCommand({
        TableName: collaboratorTable(),
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

    if (!collabResult.Items || collabResult.Items.length === 0) {
      throw new Error('Unauthorized: user is not a collaborator on this event');
    }

    userRole = unmarshall(collabResult.Items[0]).role as string;
  }

  // 3. Fetch folder and verify it belongs to this event
  const folderResult = await dynamo.send(
    new GetItemCommand({
      TableName: folderTable(),
      Key: marshall({ id: folderId }),
    })
  );

  if (!folderResult.Item) {
    throw new Error('Folder not found');
  }

  const folder = unmarshall(folderResult.Item);
  if (folder.eventId !== eventId) {
    throw new Error('Folder does not belong to this event');
  }

  const isFolderOwner = normalizeUserId(folder.owner as string) === userId;

  // 4. Apply ADR-021 permission matrix for document edit
  const allowed =
    userRole === 'OWNER' ||
    (ROLES_WITH_OWN_FOLDER_EDIT.has(userRole) && isFolderOwner);

  if (!allowed) {
    throw new Error('Access denied: you do not have permission to edit documents in this folder');
  }

  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: eventTable(),
    subscriptionTableName: userSubscriptionTable(),
    eventId,
  });

  // Extra sanity: guard against an unexpected role value reaching here.
  // OWNER / CO_MANAGER / STAFF_LOGISTICS already covered above; anything else should have been rejected.
  if (!ROLES_WITH_OWNER_OR_CO_MANAGER.has(userRole) && userRole !== 'STAFF_LOGISTICS') {
    throw new Error(`Access denied: role ${userRole} cannot edit documents`);
  }

  // 5. Generate pre-signed PUT URL scoped to the exact documentPath
  const presignedUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket(),
      Key: documentPath,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS }
  );

  return {
    presignedUrl,
    expiresIn: PRESIGN_TTL_SECONDS,
  };
};
