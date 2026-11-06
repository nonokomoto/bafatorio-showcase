/**
 * @file import-normalized-event-suppliers/handler.ts
 *
 * Dual-write import: creates Supplier records (deduped by name+email+phone)
 * AND links each to an event via EventSupplier, in a single call.
 *
 * Auth: reuses the select-event-supplier pattern — OWNER/CO_MANAGER act
 * directly (approvalStatus=DIRECT), STAFF_LOGISTICS gets PENDING_APPROVAL,
 * STAFF_CHECKIN is rejected.
 *
 * Dedup rules (per user decision in the Option B plan):
 *   - Supplier: reuse existing if buildSupplierDuplicateKey(name, contactEmail,
 *     contactPhone) already hashes to an existing row under the event owner.
 *     The helper keys off name+email when an email is present, otherwise
 *     name+phone when a phone is present, otherwise name alone (see
 *     shared/importUtils.ts). Intentional trade-off: a supplier with only a
 *     contactEmail and the same name as another supplier with only a
 *     contactPhone will NOT collapse.
 *   - EventSupplier: if (eventId, supplierId) pair already linked,
 *     SKIP the row with a counter — do not update.
 *
 * Record ownership follows ADR-013: both Supplier and EventSupplier are
 * owned by the EVENT owner (not the calling user), so that the owner can
 * see everything imported by their staff.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  batchWriteItems,
  buildSupplierDuplicateKey,
  normalizeUserId,
} from '../shared/importUtils';
import { ensureEventWritable, ensureWithinLimit, billingGateMessage } from '../shared/entitlementGate';
import { normalizeSupplierCategory } from '../shared/categoryMatching';

// ============================================
// Types
// ============================================

type ApprovalStatus = 'DIRECT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
type SupplierStatus = 'PENDING' | 'COUNTING_ON' | 'APPROVED' | 'PAID' | 'REJECTED';
type UserRole = 'OWNER' | 'CO_MANAGER' | 'STAFF_LOGISTICS' | 'STAFF_CHECKIN';

type ImportReason =
  | 'SUCCESS'
  | 'SUCCESS_WITH_SKIPS'
  | 'NO_ROWS_TO_IMPORT'
  | 'ALL_SKIPPED'
  | 'ALL_ALREADY_LINKED'
  | 'INVALID_INPUT'
  | 'BATCH_LIMIT_EXCEEDED'
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'EVENT_NOT_FOUND'
  | 'BILLING_GATE'
  | 'IMPORT_FAILED';

interface NormalizedEventSupplierRow {
  // Supplier side
  name?: string;
  category?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  // EventSupplier side
  quoteAmount?: number | null;
  currency?: string | null;
  status?: SupplierStatus;
  description?: string | null;
  externalRef?: string | null;
}

interface Args {
  eventId: string;
  rows: string; // JSON-stringified array of NormalizedEventSupplierRow
}

interface ImportResult {
  success: boolean;
  message: string;
  reason: ImportReason;
  /** Unique supplier names that were new and got created under the event owner. */
  suppliersCreated: number;
  /** Unique supplier names that already existed in the user's Supplier table and were linked as-is. */
  suppliersReused: number;
  /** Rows that collapsed onto an earlier row in THIS batch because the name was duplicated in the file. */
  suppliersDeduplicatedInBatch: number;
  /** New EventSupplier links created by this import. */
  eventSuppliersCreated: number;
  /** Rows whose supplier was already linked to this event BEFORE this import (true pre-existing links). */
  rowsAlreadyLinkedOnEvent: number;
  /** Rows with a supplier name already seen earlier in this batch (mirrors suppliersDeduplicatedInBatch). */
  rowsDuplicatedInBatch: number;
  /** Rows rejected before any write (e.g. empty name after trim). */
  validationErrorCount: number;
}

// ============================================
// AWS clients & env
// ============================================

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';
const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

const MAX_ROWS = 500;
const ROLES_WITH_CREATE = new Set<UserRole>(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);
const VALID_STATUSES = new Set<SupplierStatus>(['PENDING', 'COUNTING_ON', 'APPROVED', 'PAID', 'REJECTED']);

// ============================================
// Helpers
// ============================================

function buildResult(partial: Partial<ImportResult> & { reason: ImportReason; message: string; success: boolean }): ImportResult {
  return {
    suppliersCreated: 0,
    suppliersReused: 0,
    suppliersDeduplicatedInBatch: 0,
    eventSuppliersCreated: 0,
    rowsAlreadyLinkedOnEvent: 0,
    rowsDuplicatedInBatch: 0,
    validationErrorCount: 0,
    ...partial,
  };
}

interface SupplierLookup {
  keyToId: Map<string, string>; // duplicate-key → supplier.id
}

async function fetchSuppliersByOwnerWithIds(owner: string): Promise<SupplierLookup> {
  const keyToId = new Map<string, string>();
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(new QueryCommand({
      TableName: SUPPLIER_TABLE,
      IndexName: 'byOwner',
      KeyConditionExpression: '#owner = :owner',
      ProjectionExpression: '#id, #name, contactEmail, contactPhone',
      ExpressionAttributeNames: {
        '#owner': 'owner',
        '#name': 'name',
        '#id': 'id',
      },
      ExpressionAttributeValues: marshall({ ':owner': owner }),
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey as Record<string, never> }),
    }));

    for (const item of result.Items || []) {
      const record = unmarshall(item);
      const key = buildSupplierDuplicateKey(
        record.name as string,
        record.contactEmail as string | undefined,
        record.contactPhone as string | undefined,
      );
      keyToId.set(key, record.id as string);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return { keyToId };
}

async function fetchExistingEventSupplierLinks(eventId: string): Promise<Set<string>> {
  const linked = new Set<string>(); // set of supplierId
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(new QueryCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ProjectionExpression: 'supplierId',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey as Record<string, never> }),
    }));

    for (const item of result.Items || []) {
      const record = unmarshall(item);
      if (record.supplierId) linked.add(record.supplierId as string);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return linked;
}

// ============================================
// Handler
// ============================================

export const handler = async (
  event: AppSyncResolverEvent<Args>,
): Promise<ImportResult> => {
  try {
    // 1. Auth
    const identity = event.identity as { sub?: string } | undefined;
    const userId = identity?.sub;
    if (!userId) {
      return buildResult({
        success: false,
        reason: 'UNAUTHENTICATED',
        message: 'User not authenticated.',
      });
    }

    // 2. Validate args
    const { eventId, rows: rowsJson } = event.arguments;
    if (!eventId) {
      return buildResult({
        success: false,
        reason: 'INVALID_INPUT',
        message: 'eventId is required.',
      });
    }
    if (!rowsJson) {
      return buildResult({
        success: false,
        reason: 'INVALID_INPUT',
        message: 'No rows provided.',
      });
    }

    let rows: NormalizedEventSupplierRow[];
    try {
      rows = JSON.parse(rowsJson);
    } catch {
      return buildResult({
        success: false,
        reason: 'INVALID_INPUT',
        message: 'Invalid rows JSON.',
      });
    }
    if (!Array.isArray(rows)) {
      return buildResult({
        success: false,
        reason: 'INVALID_INPUT',
        message: 'Rows must be an array.',
      });
    }
    if (rows.length === 0) {
      return buildResult({
        success: true,
        reason: 'NO_ROWS_TO_IMPORT',
        message: 'No rows to import.',
      });
    }
    if (rows.length > MAX_ROWS) {
      return buildResult({
        success: false,
        reason: 'BATCH_LIMIT_EXCEEDED',
        message: `Maximum ${MAX_ROWS} rows per batch. Received: ${rows.length}.`,
      });
    }

    // 3. Fetch event + determine role
    const eventResult = await client.send(new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
    }));

    if (!eventResult.Item) {
      return buildResult({
        success: false,
        reason: 'EVENT_NOT_FOUND',
        message: 'Event not found.',
      });
    }

    const eventRecord = unmarshall(eventResult.Item);
    const eventOwner = (eventRecord.owner as string) || '';
    const normalizedOwner = normalizeUserId(eventOwner);

    let userRole: UserRole | null = null;
    if (normalizedOwner === userId) {
      userRole = 'OWNER';
    } else {
      const collabQuery = await client.send(new QueryCommand({
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
      }));

      if (collabQuery.Items && collabQuery.Items.length > 0) {
        userRole = unmarshall(collabQuery.Items[0]).role as UserRole;
      }
    }

    if (!userRole || !ROLES_WITH_CREATE.has(userRole)) {
      return buildResult({
        success: false,
        reason: 'UNAUTHORIZED',
        message: 'You do not have permission to import suppliers for this event.',
      });
    }

    // Gate de billing (§4): janela de escrita do plano do dono. Este handler
    // devolve resultados tipados em vez de lançar — a recusa vira buildResult.
    let billingGate;
    try {
      billingGate = await ensureEventWritable({
        eventTableName: EVENT_TABLE,
        subscriptionTableName: USER_SUBSCRIPTION_TABLE,
        eventId,
        // Event já carregado acima (fetch completo) — evita o segundo GetItem
        eventRecord,
      });
    } catch (gateError) {
      // message transporta o motivo exato (BILLING_GATE:<REASON>) p/ a UI
      return buildResult({ success: false, reason: 'BILLING_GATE', message: billingGateMessage(gateError) });
    }

    const approvalStatus: ApprovalStatus = userRole === 'STAFF_LOGISTICS' ? 'PENDING_APPROVAL' : 'DIRECT';
    const requestedBy = userRole === 'STAFF_LOGISTICS' ? userId : undefined;
    // STAFF_LOGISTICS has no SUPPLIER_APPROVE — any row coming from the Excel
    // with status=APPROVED/PAID would bypass the approval workflow (the status
    // value is LLM-inferred from free text during /normalize, so it's not even
    // a deliberate user action). Force PENDING here; OWNER/CO_MANAGER keep the
    // Excel-as-source-of-truth behaviour because they have the permission. See
    // ADR-015.
    const forcePendingStatus = userRole === 'STAFF_LOGISTICS';

    // 4. Load existing data for dedup
    const [supplierLookup, existingLinks] = await Promise.all([
      fetchSuppliersByOwnerWithIds(eventOwner),
      fetchExistingEventSupplierLinks(eventId),
    ]);

    // 5. Build dual writes.
    // Keep DB-level dedup separate from in-batch dedup so the counters reflect
    // what actually happened (important for the UI message).
    const now = new Date().toISOString();
    const suppliersToCreate: Record<string, unknown>[] = [];
    const eventSuppliersToCreate: Record<string, unknown>[] = [];

    // DB-level state snapshots loaded above.
    const dbSupplierKeyToId = supplierLookup.keyToId;        // keys of suppliers already in DB
    const dbExistingLinks = existingLinks;                   // supplierIds already linked to this event

    // In-batch bookkeeping so we don't double-write within the same request.
    const batchSupplierKeyToId = new Map<string, string>();  // name-dedup key → newly-queued supplierId
    const batchQueuedLinks = new Set<string>();              // supplierIds already queued for EventSupplier write in this batch

    let suppliersCreated = 0;
    let suppliersReused = 0;
    let suppliersDeduplicatedInBatch = 0;
    let eventSuppliersCreated = 0;
    let rowsAlreadyLinkedOnEvent = 0;
    let rowsDuplicatedInBatch = 0;
    let validationErrorCount = 0;
    // Sum of quoteAmount across APPROVED rows actually queued for write. Used
    // to keep the Event.committedExpenses invariant intact — the /approve flow
    // increments it per row, and the /remove flow decrements it; import must
    // do the same for directly-APPROVED imports or remove-eventSupplier cannot
    // cleanly revert. STAFF_LOGISTICS never reaches APPROVED here because
    // forcePendingStatus downgrades their rows.
    let totalApprovedQuote = 0;

    for (const row of rows) {
      const name = (row.name || '').trim();
      if (!name) {
        validationErrorCount++;
        continue;
      }

      const contactEmail = row.contactEmail?.trim() || undefined;
      const contactPhone = row.contactPhone?.trim() || undefined;
      const dupKey = buildSupplierDuplicateKey(name, contactEmail, contactPhone);

      // 1. Resolve supplierId: DB-existing > already-queued in this batch > new
      let supplierId: string;
      const dbHit = dbSupplierKeyToId.get(dupKey);
      const batchHit = batchSupplierKeyToId.get(dupKey);

      if (dbHit) {
        // True reuse: this supplier already lives in the user's Supplier table.
        supplierId = dbHit;
        suppliersReused++;
      } else if (batchHit) {
        // In-batch duplicate: we already created this supplier earlier in the loop.
        supplierId = batchHit;
        suppliersDeduplicatedInBatch++;
      } else {
        // Brand-new supplier for this user.
        supplierId = uuidv4();
        batchSupplierKeyToId.set(dupKey, supplierId);
        suppliersToCreate.push({
          id: supplierId,
          name,
          category: normalizeSupplierCategory(row.category),
          country: row.country || undefined,
          contactName: row.contactName || undefined,
          contactEmail,
          contactPhone,
          website: row.website || undefined,
          vatNumber: row.vatNumber || undefined,
          address: row.address || undefined,
          tags: Array.isArray(row.tags) ? row.tags : undefined,
          notes: row.notes || undefined,
          createdAt: now,
          updatedAt: now,
          owner: eventOwner, // event owner, per ADR-013
          __typename: 'Supplier',
        });
        suppliersCreated++;
      }

      // 2. Resolve EventSupplier link: already in DB > already queued in batch > create
      if (dbExistingLinks.has(supplierId)) {
        // This supplier was already linked to this event BEFORE the import.
        rowsAlreadyLinkedOnEvent++;
        continue;
      }
      if (batchQueuedLinks.has(supplierId)) {
        // We already queued a link for this supplier earlier in the same batch
        // (same name appeared twice in the Excel).
        rowsDuplicatedInBatch++;
        continue;
      }
      batchQueuedLinks.add(supplierId);

      const rawStatus = (row.status || 'PENDING') as SupplierStatus;
      const safeStatus: SupplierStatus = forcePendingStatus
        ? 'PENDING'
        : (VALID_STATUSES.has(rawStatus) ? rawStatus : 'PENDING');
      eventSuppliersToCreate.push({
        id: uuidv4(),
        eventId,
        supplierId,
        quoteAmount: typeof row.quoteAmount === 'number' ? row.quoteAmount : undefined,
        currency: row.currency ? String(row.currency).trim().toUpperCase() : undefined,
        status: safeStatus,
        description: row.description || undefined,
        externalRef: row.externalRef || undefined,
        approvalStatus,
        requestedBy,
        createdAt: now,
        updatedAt: now,
        owner: eventOwner,
        __typename: 'EventSupplier',
      });
      eventSuppliersCreated++;

      if (safeStatus === 'APPROVED'
          && typeof row.quoteAmount === 'number'
          && row.quoteAmount > 0) {
        totalApprovedQuote += row.quoteAmount;
      }
    }

    // 6. Batch write. Supplier first, EventSupplier second. If the second call
    // fails after the first succeeds, we end up with orphan Supplier rows, but
    // the next retry will dedup them via fetchSuppliersByOwnerWithIds so no
    // duplicates accumulate.
    // Limite de fornecedores do plano: existentes (links) + novos a criar.
    try {
      ensureWithinLimit(
        billingGate.entitlements,
        'suppliers',
        existingLinks.size,
        eventSuppliersToCreate.length
      );
    } catch (gateError) {
      return buildResult({ success: false, reason: 'BILLING_GATE', message: billingGateMessage(gateError) });
    }

    let supplierPhaseDone = false;
    try {
      if (suppliersToCreate.length > 0) {
        await batchWriteItems(suppliersToCreate, SUPPLIER_TABLE);
      }
      supplierPhaseDone = true;
      if (eventSuppliersToCreate.length > 0) {
        await batchWriteItems(eventSuppliersToCreate, EVENT_SUPPLIER_TABLE);
      }
    } catch (writeError) {
      console.error('[importNormalizedEventSuppliers] batch write failed', {
        supplierPhaseDone,
        suppliersQueued: suppliersToCreate.length,
        eventSuppliersQueued: eventSuppliersToCreate.length,
        error: writeError,
      });
      throw writeError;
    }

    // Keep Event.committedExpenses in sync with the APPROVED rows we just
    // wrote. Mirrors the increment in approve-supplier-selection (same
    // if_not_exists pattern) so remove-eventSupplier can later decrement it
    // cleanly. We do NOT fail the whole import if this call fails — the
    // supplier rows are already persisted and remove-eventSupplier has a
    // defensive fallback for orphan APPROVED rows. We just log loudly.
    if (totalApprovedQuote > 0) {
      try {
        await client.send(new UpdateItemCommand({
          TableName: EVENT_TABLE,
          Key: marshall({ id: eventId }),
          UpdateExpression:
            'SET committedExpenses = if_not_exists(committedExpenses, :zero) + :quote',
          ExpressionAttributeValues: marshall({
            ':quote': totalApprovedQuote,
            ':zero': 0,
          }),
          ConditionExpression: 'attribute_exists(id)',
        }));
      } catch (updateError) {
        console.error(
          '[importNormalizedEventSuppliers] committedExpenses update failed',
          { eventId, totalApprovedQuote, error: updateError },
        );
      }
    }

    // 7. Build reason + human-readable message.
    // `rowsAlreadyLinkedOnEvent` is the only "true skip" counter that matters
    // for the summary — `rowsDuplicatedInBatch` is a consequence of the file
    // having duplicate names and the user already knows about it from the preview.
    const totalSkipped = rowsAlreadyLinkedOnEvent + rowsDuplicatedInBatch + validationErrorCount;
    let reason: ImportReason;
    let message: string;
    let success = true;

    if (eventSuppliersCreated === 0) {
      success = false;
      if (rowsAlreadyLinkedOnEvent > 0 && validationErrorCount === 0 && rowsDuplicatedInBatch === 0) {
        reason = 'ALL_ALREADY_LINKED';
        message = 'All rows already linked to this event. Nothing imported.';
      } else {
        reason = totalSkipped > 0 ? 'ALL_SKIPPED' : 'NO_ROWS_TO_IMPORT';
        message = `No suppliers were imported. ${totalSkipped} rows skipped.`;
      }
    } else {
      // Build a clear summary: new vs reused suppliers, then skip reasons.
      const supplierSummary = `${suppliersCreated} new`
        + (suppliersReused > 0 ? ` + ${suppliersReused} reused` : '')
        + (suppliersDeduplicatedInBatch > 0 ? ` + ${suppliersDeduplicatedInBatch} duplicate name(s) collapsed` : '');

      const skipDetails: string[] = [];
      if (rowsAlreadyLinkedOnEvent > 0) skipDetails.push(`${rowsAlreadyLinkedOnEvent} already linked to this event`);
      if (rowsDuplicatedInBatch > 0) skipDetails.push(`${rowsDuplicatedInBatch} duplicate row(s) in the file`);
      if (validationErrorCount > 0) skipDetails.push(`${validationErrorCount} invalid`);

      if (skipDetails.length > 0) {
        reason = 'SUCCESS_WITH_SKIPS';
        message = `Imported ${eventSuppliersCreated} supplier(s) to this event (${supplierSummary}). ${skipDetails.join(', ')}.`;
      } else {
        reason = 'SUCCESS';
        message = `Imported ${eventSuppliersCreated} supplier(s) to this event (${supplierSummary}).`;
      }
    }

    return buildResult({
      success,
      reason,
      message,
      suppliersCreated,
      suppliersReused,
      suppliersDeduplicatedInBatch,
      eventSuppliersCreated,
      rowsAlreadyLinkedOnEvent,
      rowsDuplicatedInBatch,
      validationErrorCount,
    });
  } catch (error) {
    const err = error as { message?: string };
    console.error('[importNormalizedEventSuppliers] error', err);
    return buildResult({
      success: false,
      reason: 'IMPORT_FAILED',
      message: `Import failed: ${err.message || 'Unexpected error.'}`,
    });
  }
};
