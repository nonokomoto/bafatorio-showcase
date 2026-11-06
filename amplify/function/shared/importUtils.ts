import { DynamoDBClient, BatchWriteItemCommand, WriteRequest, GetItemCommand, QueryCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Roles allowed to import participants (per ACCESS_LEVELS_STRATEGY.md — PARTICIPANT_CREATE)
const ROLES_WITH_CREATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
export const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Normalizes a spreadsheet header label for matching: strips accents, drops
 * periods (e.g. "Mín." / "Min. Budget"), lowercases, and collapses
 * whitespace. Used so header-variant lists don't have to spell out every
 * accented/punctuation permutation of a label — only genuinely different
 * wording (e.g. "contacto" vs "contato") needs its own variant entry.
 */
export function normalizeHeaderLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface UploadAccessResult {
  role: string;
  eventOwner: string; // The event owner's sub in "sub::sub" format for record ownership
}

/**
 * Verify the calling user has permission to import participants for the given event.
 * Returns the user's role AND the event owner's ID (for setting record ownership).
 */
export async function verifyUploadAccess(userId: string, eventId: string): Promise<UploadAccessResult> {
  const eventTable = requireEnv('BAFATORIO_APP_EVENT_TABLE_NAME');
  const collaboratorTable = requireEnv('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME');

  const eventResult = await client.send(new GetItemCommand({
    TableName: eventTable,
    Key: marshall({ id: eventId }),
    ProjectionExpression: '#owner',
    ExpressionAttributeNames: { '#owner': 'owner' },
  }));

  if (!eventResult.Item) {
    throw new Error(`Event ${eventId} not found`);
  }

  const eventRecord = unmarshall(eventResult.Item);
  const eventOwner = (eventRecord.owner as string) || '';
  const normalizedOwner = normalizeUserId(eventOwner);

  if (normalizedOwner === userId) {
    return { role: 'OWNER', eventOwner };
  }

  const collabResult = await client.send(new QueryCommand({
    TableName: collaboratorTable,
    IndexName: 'byEventId',
    KeyConditionExpression: 'eventId = :eid',
    FilterExpression: 'userId = :uid AND #st = :accepted',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: marshall({
      ':eid': eventId,
      ':uid': userId,
      ':accepted': 'ACCEPTED',
    }),
  }));

  const collabs = (collabResult.Items || []).map(item => unmarshall(item));
  if (collabs.length > 0) {
    const role = collabs[0].role as string;
    if (ROLES_WITH_CREATE.has(role)) {
      return { role, eventOwner };
    }
    throw new Error(`Access denied: Role ${role} cannot import participants`);
  }

  throw new Error('Access denied: You do not have permission to import participants');
}

/**
 * Build a normalized key for duplicate detection.
 * Combines name + email + phone in lowercase, trimmed, with phone stripped of non-digits.
 */
export function buildDuplicateKey(name: string, email: string, phone: string): string {
  const normName = (name || '').trim().toLowerCase();
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/[\s\-\(\)\+\.]/g, '').toLowerCase();
  return `${normName}||${normEmail}||${normPhone}`;
}

export function buildSupplierDuplicateKey(name: string, contactEmail?: string, contactPhone?: string): string {
  const normName = (name || '').trim().toLowerCase();
  const normEmail = (contactEmail || '').trim().toLowerCase();
  const normPhone = (contactPhone || '').replace(/[\s\-\(\)\+\.]/g, '').toLowerCase();

  if (normEmail) return `${normName}||email:${normEmail}`;
  if (normPhone) return `${normName}||phone:${normPhone}`;
  return `${normName}||name`;
}

/**
 * Fetch all existing participants for an event and return a Set of normalized duplicate keys.
 * Uses the GSI gsi-Event.participants with pagination.
 */
export async function fetchExistingParticipants(eventId: string): Promise<Set<string>> {
  const participantTable = requireEnv('BAFATORIO_APP_PARTICIPANT_TABLE_NAME');
  const existingKeys = new Set<string>();
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const result = await client.send(new QueryCommand({
      TableName: participantTable,
      IndexName: 'gsi-Event.participants',
      KeyConditionExpression: 'eventId = :eid',
      ProjectionExpression: 'participantName, participantEmail, participantPhone',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    }));

    for (const item of result.Items || []) {
      const record = unmarshall(item);
      const key = buildDuplicateKey(
        record.participantName as string,
        record.participantEmail as string,
        record.participantPhone as string
      );
      existingKeys.add(key);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return existingKeys;
}

export async function fetchExistingSuppliersByOwner(owner: string): Promise<Set<string>> {
  const supplierTable = requireEnv('BAFATORIO_APP_SUPPLIER_TABLE_NAME');
  const existingKeys = new Set<string>();
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const result = await client.send(new QueryCommand({
      TableName: supplierTable,
      IndexName: 'byOwner',
      KeyConditionExpression: '#owner = :owner',
      ProjectionExpression: '#name, contactEmail, contactPhone',
      ExpressionAttributeNames: {
        '#owner': 'owner',
        '#name': 'name',
      },
      ExpressionAttributeValues: marshall({ ':owner': owner }),
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    }));

    for (const item of result.Items || []) {
      const record = unmarshall(item);
      existingKeys.add(buildSupplierDuplicateKey(
        record.name as string,
        record.contactEmail as string | undefined,
        record.contactPhone as string | undefined
      ));
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return existingKeys;
}

/**
 * Resolve a role name to a role ID. Looks up existing roles in the ROLE_TABLE
 * by eventId (using byEventId GSI) and name. If not found, creates a new Role record.
 * The cache is passed in per-invocation to avoid stale data across warm Lambda restarts.
 */
export async function resolveRoleId(roleName: string, owner: string, eventId: string, roleCache: Map<string, string>): Promise<string | undefined> {
  if (!roleName || !roleName.trim()) return undefined;

  const roleTable = requireEnv('BAFATORIO_APP_ROLE_TABLE_NAME');
  const trimmedName = roleName.trim();
  const cacheKey = `${trimmedName.toLowerCase()}||${eventId}`;
  if (roleCache.has(cacheKey)) {
    return roleCache.get(cacheKey);
  }

  // Query ROLE_TABLE using byEventId GSI + filter by name
  const { Items } = await client.send(new QueryCommand({
    TableName: roleTable,
    IndexName: 'byEventId',
    KeyConditionExpression: 'eventId = :eid',
    FilterExpression: '#name = :name',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: marshall({ ':eid': eventId, ':name': trimmedName }),
  }));

  if (Items && Items.length > 0) {
    const existingRole = unmarshall(Items[0]);
    const id = existingRole.id as string;

    // Re-introducing an archived role unarchives it. Name uniqueness is
    // global within an event; `archived` controls visibility, not identity.
    if (existingRole.archived === true) {
      await client.send(new UpdateItemCommand({
        TableName: roleTable,
        Key: marshall({ id }),
        UpdateExpression: 'SET archived = :false, #u = :now',
        ExpressionAttributeNames: { '#u': 'updatedAt' },
        ExpressionAttributeValues: marshall({
          ':false': false,
          ':now': new Date().toISOString(),
        }),
      }));
      console.log(`[importUtils] Revived archived role ${id} (name=${trimmedName}, eventId=${eventId})`);
    }

    roleCache.set(cacheKey, id);
    return id;
  }

  // Role not found — create a new one with eventId
  const now = new Date().toISOString();
  const newRoleId = uuidv4();
  await client.send(new PutItemCommand({
    TableName: roleTable,
    Item: marshall({
      id: newRoleId,
      name: trimmedName,
      eventId,
      owner,
      createdAt: now,
      updatedAt: now,
      __typename: 'Role',
    }),
  }));

  roleCache.set(cacheKey, newRoleId);
  return newRoleId;
}

/**
 * Parse a date value into an AWSDateTime (ISO 8601) string.
 * Accepts dd/MM/yyyy (the format our own participant export writes into date
 * columns) as well as values already in ISO format. Returns undefined when the
 * text can't be parsed, so callers can fall back to "now" instead of storing an
 * invalid AWSDateTime that later breaks GraphQL reads.
 */
export function parseDateToISO(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dayStr, monthStr, year] = ddmmyyyy;
    const day = Number(dayStr);
    const month = Number(monthStr);
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    const date = new Date(Date.UTC(Number(year), month - 1, day));
    // Guard against rollover (e.g. 31/02 rolling into March) — Date.UTC never throws.
    if (date.getUTCMonth() !== month - 1) return undefined;
    return date.toISOString();
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Parse a participant status string (PT/EN) into a ParticipantStatus enum value.
 */
export type ParticipantStatus = 'REGISTERED' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';

export function parseParticipantStatus(value: string): ParticipantStatus | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (['inscrito', 'inscrita', 'registered'].includes(v)) return 'REGISTERED';
  if (['confirmado', 'confirmada', 'confirmed'].includes(v)) return 'CONFIRMED';
  if (['cancelado', 'cancelada', 'cancelled', 'canceled'].includes(v)) return 'CANCELLED';
  if (['presente', 'attended', 'compareceu'].includes(v)) return 'ATTENDED';
  return undefined;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL';

export function parsePaymentStatus(value: string): PaymentStatus | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (['pendente', 'pending'].includes(v)) return 'PENDING';
  if (['pago', 'paid'].includes(v)) return 'PAID';
  if (['parcial', 'partial'].includes(v)) return 'PARTIAL';
  return undefined;
}

/**
 * Batch write items to DynamoDB with retry for unprocessed items.
 * Generic function that works with any marshallable record type.
 */
export async function batchWriteItems(
  items: Record<string, any>[],
  tableName: string
): Promise<void> {
  const batchSize = 25;
  const MAX_RETRIES = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    let writeRequests: WriteRequest[] = batch.map(item => ({
      PutRequest: {
        Item: marshall(item, { removeUndefinedValues: true })
      }
    }));

    let retryCount = 0;
    while (writeRequests.length > 0) {
      try {
        const response = await client.send(new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: writeRequests
          }
        }));

        const unprocessed = response.UnprocessedItems?.[tableName] || [];
        if (unprocessed.length === 0) {
          break;
        }

        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          throw new Error(`Failed to write ${unprocessed.length} item(s) after ${MAX_RETRIES} retries`);
        }

        writeRequests = unprocessed;
        await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, retryCount), 3000)));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Failed to write')) {
          throw error;
        }
        throw new Error('Failed to write data to database');
      }
    }
  }
}
