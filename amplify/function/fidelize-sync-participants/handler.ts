/**
 * @file fidelize-sync-participants/handler.ts
 * @description Sync Fidelize cards as event participants.
 *
 * Flow:
 * 1. Extract userId, verify event access (OWNER / CO_MANAGER)
 * 2. Decrypt API key from FidelizeIntegration
 * 3. Fetch GET /api/v2/cards with pagination
 * 4. Filter cards (status != deleted, optionally by templateIds)
 * 5. Load existing participants → build dedup index
 * 6. For each card: match by internalId → email → phone
 *    - If found: non-destructive merge (only fill empty fields), update internalId
 *    - If new: create participant with resolveRoleId(), owner = eventOwner
 * 7. Timeout control: if > 25s, return { hasMore: true, nextPage }
 * 8. Return summary { created, updated, skipped, errors }
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { randomUUID, createHash } from 'crypto';
import {
  ensureEventWritable,
  ensureIntegrationsAllowed,
  ensureWithinLimit,
  isBillingGateError,
} from '../shared/entitlementGate';

// ── Interfaces ──

interface SyncArgs {
  eventId: string;
  templateIds?: number[];
  page?: number;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  totalCards: number;
  errors: string[];
  hasMore: boolean;
  nextPage: number | null;
}

interface FidelizeCard {
  id: string;
  templateId: number;
  status: string;
  customer: {
    firstName?: string;
    email?: string;
    phone?: string;
  };
  customFields: Array<{
    name: string;
    type: string;
    value: string | null;
  }>;
  membershipTier?: {
    name?: string;
  };
}

interface ExistingParticipant {
  id: string;
  internalId?: string;
  participantEmail?: string;
  participantPhone?: string;
  participantStatus?: string;
  roleId?: string;
  [key: string]: unknown;
}

// ── Constants ──

const FIDELIZE_BASE_URL = 'https://api.fidelize.pt/api/v2';
const TIMEOUT_MS = 25_000; // 25s safety margin for 30s Lambda timeout

const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const ddb = new DynamoDBClient({ region });
const kms = new KMSClient({ region });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const ROLE_TABLE = process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '';
const INTEGRATION_TABLE = process.env.FIDELIZE_INTEGRATION_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const KMS_KEY_ID = process.env.KMS_KEY_ID || '';

// Tier name → role name mapping
const TIER_TO_ROLE: Record<string, string> = {
  'Participant': 'Participant',
  'Volunteer': 'Volunteer',
  'Speaker': 'Speaker',
  'Partner': 'Partner',
  'Organization': 'Organization',
  'Ambassador': 'Ambassador',
  'Potenciais': 'Human Leaders',
};

// Statuses that should never be overwritten
const FINAL_STATUSES = new Set(['ATTENDED', 'CANCELLED']);

// ── Helpers ──

const normalizeUserId = (id: string): string => id?.split('::')[0] || id;

const normalizeEmail = (email?: string | null): string | null =>
  email ? email.trim().toLowerCase() : null;

const normalizePhone = (phone?: string | null): string | null =>
  phone ? phone.replace(/\D/g, '') : null;

/** Normalize string for comparison: trim, lowercase, collapse whitespace, normalize separators */
const norm = (s: string): string => s.trim().toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');

/** Extract a custom field value by type or name (normalized matching) */
const getCustomField = (fields: FidelizeCard['customFields'], typeOrName: string): string | null => {
  const key = norm(typeOrName);
  const field = fields.find(f => norm(f.type) === key || norm(f.name) === key);
  return field?.value?.trim() || null;
};

/** Map Fidelize card status → participant status */
const mapStatus = (cardStatus: string): string => {
  switch (cardStatus?.toLowerCase().trim()) {
    case 'installed': return 'CONFIRMED';
    case 'not_installed': return 'REGISTERED';
    case 'deleted': return 'CANCELLED';
    default: return 'REGISTERED';
  }
};

/** Decrypt a KMS-encrypted value (base64-encoded) */
const decryptToken = async (encryptedBase64: string): Promise<string> => {
  const result = await kms.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedBase64, 'base64'),
      KeyId: KMS_KEY_ID,
    })
  );
  if (!result.Plaintext) throw new Error('KMS decryption returned empty plaintext');
  return Buffer.from(result.Plaintext).toString('utf-8');
};

/** Resolve or create a role by name for an event */
const resolveRoleId = async (
  roleName: string,
  eventId: string,
  eventOwner: string,
  roleCache: Map<string, string>
): Promise<string | null> => {
  if (!roleName) return null;

  const cacheKey = roleName.toLowerCase();
  if (roleCache.has(cacheKey)) return roleCache.get(cacheKey)!;

  // Query existing roles for this event
  const rolesResult = await ddb.send(
    new QueryCommand({
      TableName: ROLE_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
    })
  );

  if (rolesResult.Items) {
    for (const item of rolesResult.Items) {
      const role = unmarshall(item);
      if ((role.name as string).toLowerCase() === cacheKey) {
        const id = role.id as string;

        // Re-introducing an archived role unarchives it. Name uniqueness is
        // global within an event; `archived` controls visibility, not identity.
        if (role.archived === true) {
          await ddb.send(
            new UpdateItemCommand({
              TableName: ROLE_TABLE,
              Key: marshall({ id }),
              UpdateExpression: 'SET archived = :false, #u = :now',
              ExpressionAttributeNames: { '#u': 'updatedAt' },
              ExpressionAttributeValues: marshall({
                ':false': false,
                ':now': new Date().toISOString(),
              }),
            })
          );
          console.log(`[fidelizeSync] Revived archived role ${id} (name=${roleName}, eventId=${eventId})`);
        }

        roleCache.set(cacheKey, id);
        return id;
      }
    }
  }

  // Create role if not found — use deterministic ID to prevent duplicates from concurrent invocations
  const roleId = createHash('sha256').update(`${eventId}:${cacheKey}`).digest('hex').slice(0, 36);
  const now = new Date().toISOString();
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: ROLE_TABLE,
        Item: marshall(
          {
            id: roleId,
            eventId,
            name: roleName,
            owner: eventOwner,
            createdAt: now,
            updatedAt: now,
            __typename: 'Role',
          },
          { removeUndefinedValues: true }
        ),
        ConditionExpression: 'attribute_not_exists(id)',
      })
    );
    console.log(`[fidelizeSync] Created role "${roleName}" (${roleId})`);
  } catch (err: unknown) {
    // Role already exists (concurrent invocation or prior sync) — safe to use the deterministic ID
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      console.log(`[fidelizeSync] Role "${roleName}" already exists (${roleId}), reusing`);
    } else {
      throw err;
    }
  }

  roleCache.set(cacheKey, roleId);
  return roleId;
};

// ── Main Handler ──

export const handler = async (
  event: AppSyncResolverEvent<SyncArgs>
): Promise<SyncResult> => {
  const startTime = Date.now();
  const { eventId, templateIds, page } = event.arguments;
  const currentPage = page || 1;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) throw new Error('User identity not found');
  if (!eventId) throw new Error('Event ID is required');

  console.log(`[fidelizeSync] User ${userId}, event ${eventId}, page ${currentPage}`);

  // 1. Verify event access (OWNER or CO_MANAGER)
  const eventResult = await ddb.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
      ProjectionExpression: '#owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
    })
  );

  if (!eventResult.Item) throw new Error('Event not found');

  const eventData = unmarshall(eventResult.Item);
  const eventOwner = eventData.owner as string;
  const isOwner = normalizeUserId(eventOwner) === userId;

  if (!isOwner) {
    const collabQuery = await ddb.send(
      new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'userId = :uid AND #st = :accepted AND (#role = :owner OR #role = :cm)',
        ExpressionAttributeNames: { '#st': 'status', '#role': 'role' },
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':uid': userId,
          ':accepted': 'ACCEPTED',
          ':owner': 'OWNER',
          ':cm': 'CO_MANAGER',
        }),
      })
    );

    if (!collabQuery.Items || collabQuery.Items.length === 0) {
      throw new Error('Access denied: Only OWNER or CO_MANAGER can sync Fidelize participants');
    }
  }

  // Gate de billing (§4/§2): janela de escrita + integrações são do nível pago.
  const billingGate = await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });
  ensureIntegrationsAllowed(billingGate.entitlements);

  // 2. Decrypt API key
  const integrationResult = await ddb.send(
    new GetItemCommand({
      TableName: INTEGRATION_TABLE,
      Key: marshall({ id: userId }),
      ProjectionExpression: 'apiKey, isActive',
    })
  );

  if (!integrationResult.Item) {
    throw new Error('Fidelize integration not found. Please configure your API key in Settings.');
  }

  const integration = unmarshall(integrationResult.Item);
  if (!integration.isActive) {
    throw new Error('Fidelize integration is disabled');
  }

  const apiKey = await decryptToken(integration.apiKey as string);

  // 3. Fetch cards from Fidelize API
  const url = `${FIDELIZE_BASE_URL}/cards?page=${currentPage}`;
  console.log(`[fidelizeSync] Fetching cards page ${currentPage}`);

  const cardsResponse = await fetch(url, {
    method: 'GET',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  });

  if (!cardsResponse.ok) {
    if (cardsResponse.status === 429) {
      throw new Error('Fidelize API rate limit reached. Please wait a few minutes and try again.');
    }
    throw new Error(`Fidelize API error: status ${cardsResponse.status}`);
  }

  const cardsBody = await cardsResponse.json();
  const allCards: FidelizeCard[] = cardsBody.data || [];
  const meta = cardsBody.meta || {};
  const itemsPerPage = meta.itemsPerPage || meta.perPage || allCards.length || 15;
  const totalPages = Math.ceil((meta.totalItems || 0) / itemsPerPage);

  console.log(`[fidelizeSync] Page ${currentPage}: ${allCards.length} cards, totalPages=${totalPages}`);

  // 4. Filter cards (deleted cards are now imported as CANCELLED)
  const filteredCards = allCards.filter(card => {
    if (templateIds && templateIds.length > 0) {
      return templateIds.includes(card.templateId);
    }
    return true;
  });

  console.log(`[fidelizeSync] ${filteredCards.length}/${allCards.length} cards after filtering`);

  // 5. Load existing participants for dedup
  let existingParticipants: ExistingParticipant[] = [];
  let participantLastKey: Record<string, any> | undefined;

  do {
    const scanResult = await ddb.send(
      new QueryCommand({
        TableName: PARTICIPANT_TABLE,
        IndexName: 'gsi-Event.participants',
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: marshall({ ':eid': eventId }),
        ProjectionExpression: 'id, internalId, participantEmail, participantPhone, participantStatus, roleId',
        ...(participantLastKey ? { ExclusiveStartKey: participantLastKey } : {}),
      })
    );

    if (scanResult.Items) {
      existingParticipants.push(
        ...scanResult.Items.map(item => unmarshall(item) as ExistingParticipant)
      );
    }
    participantLastKey = scanResult.LastEvaluatedKey;
  } while (participantLastKey);

  // Build dedup indexes
  const byInternalId = new Map<string, ExistingParticipant>();
  const byEmail = new Map<string, ExistingParticipant>();
  const byPhone = new Map<string, ExistingParticipant>();

  for (const p of existingParticipants) {
    if (p.internalId) byInternalId.set(p.internalId, p);
    const email = normalizeEmail(p.participantEmail);
    if (email) byEmail.set(email, p);
    const phone = normalizePhone(p.participantPhone);
    if (phone) byPhone.set(phone, p);
  }

  console.log(`[fidelizeSync] Existing participants: ${existingParticipants.length}`);

  // 6. Process each card
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const roleCache = new Map<string, string>();
  const createdInBatch = new Set<string>(); // track IDs created in this sync batch

  for (let i = 0; i < filteredCards.length; i++) {
    const card = filteredCards[i];
    // Timeout check — retry same page if cards remain (dedup makes re-processing cheap),
    // advance to next page only if all cards on this page were processed
    if (Date.now() - startTime > TIMEOUT_MS) {
      const allProcessed = i >= filteredCards.length - 1;
      const nextPage = allProcessed ? currentPage + 1 : currentPage;
      console.log(`[fidelizeSync] Approaching timeout after ${i}/${filteredCards.length} cards (page ${currentPage}), nextPage=${nextPage}`);
      return {
        success: true,
        created,
        updated,
        skipped,
        totalCards: filteredCards.length,
        errors,
        hasMore: true,
        nextPage,
      };
    }

    try {
      const fidelizeId = `fidelize:${card.id}`;
      const cardEmail = normalizeEmail(card.customer?.email);
      const cardPhone = normalizePhone(card.customer?.phone);

      // Match by internalId → email → phone
      let match = byInternalId.get(fidelizeId);
      if (!match && cardEmail) match = byEmail.get(cardEmail);
      if (!match && cardPhone) match = byPhone.get(cardPhone);

      // Extract card data (trim to avoid whitespace-only names)
      const customerName = (card.customer?.firstName ||
        getCustomField(card.customFields, 'FName') || '').trim();
      const country = getCustomField(card.customFields, 'Country');
      const org = getCustomField(card.customFields, 'Company/Organization');
      const photo = getCustomField(card.customFields, 'Photo');
      const photoUrl = photo && photo !== 'avatar' ? photo : null;
      const participantStatus = mapStatus(card.status);

      // Resolve role from tier name
      const tierName = card.membershipTier?.name;
      const roleName = tierName ? (TIER_TO_ROLE[tierName] || tierName) : null;

      if (match) {
        const isBatchDuplicate = createdInBatch.has(match.id);

        // ── UPDATE existing participant (non-destructive) ──
        const expressionParts: string[] = [];
        const attrNames: Record<string, string> = {};
        const attrValues: Record<string, any> = {};

        // Always update internalId
        if (!match.internalId || match.internalId !== fidelizeId) {
          expressionParts.push('#iid = :iid');
          attrNames['#iid'] = 'internalId';
          attrValues[':iid'] = fidelizeId;
        }

        // Only fill empty fields (non-destructive merge)
        const fillIfEmpty = (field: string, value: string | null, alias: string) => {
          if (value && !(match as any)[field]) {
            expressionParts.push(`#${alias} = :${alias}`);
            attrNames[`#${alias}`] = field;
            attrValues[`:${alias}`] = value;
          }
        };

        fillIfEmpty('participantEmail', card.customer?.email || null, 'em');
        fillIfEmpty('participantPhone', card.customer?.phone || null, 'ph');
        fillIfEmpty('residenceCountry', country, 'rc');
        fillIfEmpty('organization', org, 'org');
        fillIfEmpty('photoUrl', photoUrl, 'pu');

        // Update status if not in a final state — upgrade REGISTERED → CONFIRMED
        if (!FINAL_STATUSES.has(match.participantStatus || '')) {
          if (participantStatus && participantStatus !== match.participantStatus) {
            expressionParts.push('#ps = :ps');
            attrNames['#ps'] = 'participantStatus';
            attrValues[':ps'] = participantStatus;
          }
        }

        // Only fill roleId if not already set
        if (!match.roleId && roleName) {
          const roleId = await resolveRoleId(roleName, eventId, eventOwner, roleCache);
          if (roleId) {
            expressionParts.push('#rid = :rid');
            attrNames['#rid'] = 'roleId';
            attrValues[':rid'] = roleId;
          }
        }

        if (expressionParts.length > 0) {
          // Add updatedAt
          expressionParts.push('#ua = :ua');
          attrNames['#ua'] = 'updatedAt';
          attrValues[':ua'] = new Date().toISOString();

          await ddb.send(
            new UpdateItemCommand({
              TableName: PARTICIPANT_TABLE,
              Key: marshall({ id: match.id }),
              UpdateExpression: `SET ${expressionParts.join(', ')}`,
              ExpressionAttributeNames: attrNames,
              ExpressionAttributeValues: marshall(attrValues),
            })
          );

          if (isBatchDuplicate) {
            // Duplicate card in same batch — data merged but count as skipped
            console.log(`[fidelizeSync] → SKIPPED card ${card.id} (batch duplicate of ${match.id}, merged fields: ${Object.values(attrNames).join(', ')})`);
            skipped++;
          } else {
            console.log(`[fidelizeSync] → UPDATED participant ${match.id} (fields: ${Object.values(attrNames).join(', ')})`);
            updated++;
          }
        } else {
          console.log(`[fidelizeSync] → SKIPPED card ${card.id} (matched ${match.id}, no fields to update)`);
          skipped++;
        }
      } else {
        // ── CREATE new participant ──
        if (!customerName) {
          console.log(`[fidelizeSync] → SKIPPED card ${card.id} (no name found)`);
          skipped++;
          continue;
        }

        // Teto de participantes (ADR-038): o sync cria gente e por isso conta
        // como qualquer outro caminho de criação. `created` é o que esta
        // invocação já acrescentou aos que estavam no evento.
        ensureWithinLimit(billingGate.entitlements, 'participants', existingParticipants.length + created);

        const participantId = randomUUID();
        const now = new Date().toISOString();

        let roleId: string | null = null;
        if (roleName) {
          roleId = await resolveRoleId(roleName, eventId, eventOwner, roleCache);
        }

        const participantRecord: Record<string, any> = {
          id: participantId,
          eventId,
          participantName: customerName,
          participantEmail: card.customer?.email || null,
          participantPhone: card.customer?.phone || null,
          participantStatus,
          internalId: fidelizeId,
          residenceCountry: country,
          organization: org,
          photoUrl: photoUrl,
          roleId,
          registrationDate: now,
          owner: eventOwner,
          createdAt: now,
          updatedAt: now,
          __typename: 'Participant',
        };

        console.log(`[fidelizeSync] → CREATED participant ${participantId}: status="${participantStatus}" role="${roleName}" (${roleId})`);
        await ddb.send(
          new PutItemCommand({
            TableName: PARTICIPANT_TABLE,
            Item: marshall(participantRecord, { removeUndefinedValues: true }),
            ConditionExpression: 'attribute_not_exists(id)',
          })
        );

        // Track this participant as created in this batch (for duplicate detection)
        createdInBatch.add(participantId);

        // Update dedup indexes for subsequent iterations
        byInternalId.set(fidelizeId, { id: participantId, internalId: fidelizeId, participantEmail: card.customer?.email, participantPhone: card.customer?.phone, participantStatus, roleId: roleId || undefined });
        if (cardEmail) byEmail.set(cardEmail, { id: participantId, internalId: fidelizeId, participantEmail: card.customer?.email, participantPhone: card.customer?.phone, participantStatus, roleId: roleId || undefined });
        if (cardPhone) byPhone.set(cardPhone, { id: participantId, internalId: fidelizeId, participantEmail: card.customer?.email, participantPhone: card.customer?.phone, participantStatus, roleId: roleId || undefined });

        created++;
      }
    } catch (err: unknown) {
      // A recusa do gate é sobre o evento, não sobre este cartão: engoli-la no
      // errors[] deixava o sync devolver success:true depois de bater no teto,
      // e o cartão seguinte tentaria na mesma.
      if (isBillingGateError(err)) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Card ${card.id}: ${message}`);
      console.error(`[fidelizeSync] Error processing card ${card.id}:`, message);
    }
  }

  // 7. Update lastSyncAt in FidelizeIntegration
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: INTEGRATION_TABLE,
        Key: marshall({ id: userId }),
        UpdateExpression: 'SET lastSyncAt = :ls, updatedAt = :ua',
        ExpressionAttributeValues: marshall({
          ':ls': new Date().toISOString(),
          ':ua': new Date().toISOString(),
        }),
      })
    );
  } catch (err) {
    console.warn('[fidelizeSync] Failed to update lastSyncAt:', err);
  }

  const hasMorePages = currentPage < totalPages;

  console.log(`[fidelizeSync] Done: created=${created}, updated=${updated}, skipped=${skipped}, errors=${errors.length}, hasMore=${hasMorePages}`);

  return {
    success: true,
    created,
    updated,
    skipped,
    totalCards: filteredCards.length,
    errors,
    hasMore: hasMorePages,
    nextPage: hasMorePages ? currentPage + 1 : null,
  };
};
