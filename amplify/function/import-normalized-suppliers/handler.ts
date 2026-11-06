import type { AppSyncResolverEvent, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  batchWriteItems,
  buildSupplierDuplicateKey,
  fetchExistingSuppliersByOwner,
} from '../shared/importUtils';
import { normalizeSupplierCategory } from '../shared/categoryMatching';

const SUPPLIER_TABLE = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';

const MAX_BATCH_SIZE = 500;

interface ImportNormalizedSuppliersArguments {
  suppliers: string; // JSON-stringified array of normalized supplier objects
  // Starting index of this chunk within the full normalized file (see
  // amplify/data/resource.ts) — lets rowErrors report the real row number
  // when the client has split a large file into multiple chunked calls.
  rowOffset?: number | null;
}

type SupplierImportReason =
  | 'SUCCESS'
  | 'SUCCESS_WITH_SKIPS'
  | 'ALL_DUPLICATES'
  | 'ALL_SKIPPED'
  | 'NO_SUPPLIERS_TO_IMPORT'
  | 'INVALID_INPUT'
  | 'BATCH_LIMIT_EXCEEDED'
  | 'UNAUTHENTICATED'
  | 'IMPORT_FAILED';

interface NormalizedSupplier {
  name?: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  country?: string;
  vatNumber?: string;
  estimateMinAmount?: number;
  estimateMaxAmount?: number;
  estimateUnit?: string;
  currency?: string;
  tags?: string[];
  notes?: string;
  website?: string;
}

const VALID_ESTIMATE_UNITS = ['FIXED', 'PER_EVENT', 'PER_HOUR', 'PER_DAY', 'PER_ITEM', 'PER_GUEST'];

function buildResult({
  success,
  message,
  supplierCount = 0,
  reason,
  skippedCount = 0,
  duplicateCount = 0,
  validationErrorCount = 0,
  writeErrorCount = 0,
  rowErrors,
}: {
  success: boolean;
  message: string;
  supplierCount?: number;
  reason: SupplierImportReason;
  skippedCount?: number;
  duplicateCount?: number;
  validationErrorCount?: number;
  writeErrorCount?: number;
  rowErrors?: { row: number; message: string }[];
}) {
  return {
    success,
    message,
    supplierCount,
    reason,
    skippedCount,
    duplicateCount,
    validationErrorCount,
    writeErrorCount,
    rowErrors,
  };
}

export const handler = async (
  event: AppSyncResolverEvent<ImportNormalizedSuppliersArguments>,
  context: Context
) => {
  try {
    // Auth check
    const owner = (event.identity && 'sub' in event.identity) ? event.identity.sub : undefined;
    if (!owner) {
      return buildResult({
        success: false,
        message: 'User not authenticated.',
        reason: 'UNAUTHENTICATED',
      });
    }

    const { suppliers: suppliersJson, rowOffset } = event.arguments;
    const safeRowOffset = typeof rowOffset === 'number' && rowOffset > 0 ? rowOffset : 0;

    if (!suppliersJson) {
      return buildResult({
        success: false,
        message: 'No supplier data provided.',
        reason: 'INVALID_INPUT',
      });
    }

    // Parse JSON
    let suppliers: NormalizedSupplier[];
    try {
      suppliers = JSON.parse(suppliersJson);
    } catch {
      return buildResult({
        success: false,
        message: 'Invalid supplier data. Malformed JSON.',
        reason: 'INVALID_INPUT',
      });
    }

    if (!Array.isArray(suppliers)) {
      return buildResult({
        success: false,
        message: 'Supplier data must be an array.',
        reason: 'INVALID_INPUT',
      });
    }

    if (suppliers.length === 0) {
      return buildResult({
        success: true,
        message: 'No suppliers to import.',
        reason: 'NO_SUPPLIERS_TO_IMPORT',
      });
    }

    if (suppliers.length > MAX_BATCH_SIZE) {
      return buildResult({
        success: false,
        message: `Maximum ${MAX_BATCH_SIZE} suppliers per batch. Received: ${suppliers.length}.`,
        reason: 'BATCH_LIMIT_EXCEEDED',
      });
    }

    const now = new Date().toISOString();
    const suppliersToCreate: Record<string, any>[] = [];
    let duplicateCount = 0;
    let validationErrorCount = 0;
    const rowErrors: { row: number; message: string }[] = [];
    const existingKeys = await fetchExistingSuppliersByOwner(owner);

    for (let i = 0; i < suppliers.length; i++) {
      const s = suppliers[i];
      // Row 1 is the header in the original file; data starts at row 2 —
      // matches the numbering used by upload-supplier's rowErrors. Offset by
      // the chunk's starting index so chunk 2+ doesn't renumber from row 2.
      const row = i + 2 + safeRowOffset;
      const name = (s.name || '').trim();
      const contactEmail = s.contactEmail ? s.contactEmail.trim() : undefined;
      const contactPhone = s.contactPhone ? s.contactPhone.trim() : undefined;

      if (!name) {
        validationErrorCount++;
        rowErrors.push({ row, message: 'Missing required field: name' });
        continue;
      }

      const duplicateKey = buildSupplierDuplicateKey(name, contactEmail, contactPhone);
      if (existingKeys.has(duplicateKey)) {
        duplicateCount++;
        rowErrors.push({ row, message: 'Duplicate supplier skipped' });
        continue;
      }
      existingKeys.add(duplicateKey);

      // Validate estimate unit if present
      const estimateUnit = s.estimateUnit
        ? (VALID_ESTIMATE_UNITS.includes(s.estimateUnit.toUpperCase()) ? s.estimateUnit.toUpperCase() : null)
        : null;

      suppliersToCreate.push({
        id: uuidv4(),
        name,
        category: normalizeSupplierCategory(s.category),
        contactName: s.contactName ? s.contactName.trim() : undefined,
        contactEmail,
        contactPhone,
        address: s.address ? s.address.trim() : undefined,
        country: s.country ? s.country.trim() : undefined,
        vatNumber: s.vatNumber ? s.vatNumber.trim() : undefined,
        estimateMinAmount: typeof s.estimateMinAmount === 'number' ? s.estimateMinAmount : undefined,
        estimateMaxAmount: typeof s.estimateMaxAmount === 'number' ? s.estimateMaxAmount : undefined,
        estimateUnit,
        currency: s.currency ? s.currency.trim().toUpperCase() : undefined,
        tags: Array.isArray(s.tags) ? s.tags : undefined,
        notes: s.notes ? s.notes.trim() : undefined,
        website: s.website ? s.website.trim() : undefined,
        createdAt: now,
        updatedAt: now,
        owner,
        __typename: 'Supplier',
      });
    }

    const skippedCount = duplicateCount + validationErrorCount;

    if (suppliersToCreate.length === 0) {
      if (duplicateCount > 0 && validationErrorCount === 0) {
        return buildResult({
          success: true,
          message: 'All suppliers already exist and were skipped.',
          reason: 'ALL_DUPLICATES',
          duplicateCount,
          skippedCount,
          rowErrors,
        });
      }

      const message = skippedCount > 0
        ? `No suppliers were imported. ${skippedCount} rows were skipped (missing name or duplicate).`
        : 'No valid suppliers found to import.';

      return buildResult({
        success: false,
        message,
        reason: skippedCount > 0 ? 'ALL_SKIPPED' : 'NO_SUPPLIERS_TO_IMPORT',
        duplicateCount,
        validationErrorCount,
        skippedCount,
        rowErrors,
      });
    }

    await batchWriteItems(suppliersToCreate, SUPPLIER_TABLE);

    const message = skippedCount > 0
      ? `Successfully imported ${suppliersToCreate.length} suppliers. ${skippedCount} rows skipped (missing name or duplicate).`
      : `Successfully imported ${suppliersToCreate.length} suppliers.`;

    return buildResult({
      success: true,
      message,
      supplierCount: suppliersToCreate.length,
      reason: skippedCount > 0 ? 'SUCCESS_WITH_SKIPS' : 'SUCCESS',
      duplicateCount,
      validationErrorCount,
      skippedCount,
      rowErrors,
    });

  } catch (error: any) {
    console.error('Error processing supplier import:', error);
    return buildResult({
      success: false,
      message: `Import failed: ${error.message || 'An unexpected error occurred.'}`,
      reason: 'IMPORT_FAILED',
    });
  }
};
