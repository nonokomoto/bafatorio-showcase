import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { roleHasPermission, type EVENT_PERMISSIONS, type EVENT_ROLES } from './eventPermissions';

type EventRole = (typeof EVENT_ROLES)[keyof typeof EVENT_ROLES];
type EventPermission = (typeof EVENT_PERMISSIONS)[keyof typeof EVENT_PERMISSIONS];

let cachedClient: DynamoDBClient | null = null;
const getDynamoClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedClient;
};

type ResolveEventAccessInput = {
  eventTableName: string;
  collaboratorTableName: string;
  eventId: string;
  userId: string;
};

type EventRecord = {
  id: string;
  owner?: string;
  [key: string]: unknown;
};

type CollaboratorRecord = {
  id: string;
  eventId: string;
  userId: string;
  role: EventRole;
  status: string;
  sharedSupplierIds?: string[];
  canViewTeamSchedule?: boolean;
  [key: string]: unknown;
};

export type ResolvedEventAccess = {
  role: EventRole;
  eventOwner: string;
  eventRecord: EventRecord;
  collaboratorRecord: CollaboratorRecord | null;
  sharedSupplierIds: string[];
  hasPermission: (permission: EventPermission) => boolean;
};

export const normalizeUserId = (id: string): string => {
  if (!id) {
    return id;
  }

  return id.split('::')[0];
};

/**
 * Carrega o registo do Event ou falha com 'Event not found'. Partilhado pelos
 * resolvers de acesso (role) e de entitlements (plano).
 */
export async function fetchEventRecord(
  eventTableName: string,
  eventId: string
): Promise<Record<string, unknown>> {
  const eventResult = await getDynamoClient().send(
    new GetItemCommand({
      TableName: eventTableName,
      Key: marshall({ id: eventId }),
    })
  );

  if (!eventResult.Item) {
    throw new Error('Event not found');
  }

  return unmarshall(eventResult.Item);
}

export async function resolveEventAccess({
  eventTableName,
  collaboratorTableName,
  eventId,
  userId,
}: ResolveEventAccessInput): Promise<ResolvedEventAccess> {
  const eventRecord = (await fetchEventRecord(eventTableName, eventId)) as EventRecord;
  const eventOwner = normalizeUserId(eventRecord.owner || '');

  if (eventOwner === normalizeUserId(userId)) {
    return {
      role: 'OWNER',
      eventOwner,
      eventRecord,
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: EventPermission) => roleHasPermission('OWNER', permission),
    };
  }

  const collaboratorResult = await getDynamoClient().send(
    new QueryCommand({
      TableName: collaboratorTableName,
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

  const collaboratorRecord = (collaboratorResult.Items || [])
    .map((item: Record<string, AttributeValue>) => unmarshall(item) as CollaboratorRecord)[0];

  if (!collaboratorRecord) {
    throw new Error('Unauthorized: user does not have access to this event');
  }

  return {
    role: collaboratorRecord.role,
    eventOwner,
    eventRecord,
    collaboratorRecord,
    sharedSupplierIds: collaboratorRecord.sharedSupplierIds || [],
    hasPermission: (permission: EventPermission) =>
      roleHasPermission(collaboratorRecord.role, permission),
  };
}
