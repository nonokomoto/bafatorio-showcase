import { DynamoDBClient, BatchWriteItemCommand, WriteRequest } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverEvent, Context } from 'aws-lambda';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { buildSupplierDuplicateKey, fetchExistingSuppliersByOwner, normalizeHeaderLabel } from '../shared/importUtils';
import { normalizeSupplierCategory } from '../shared/categoryMatching';

// --- Configuration ---
const SUPPLIER_TABLE_NAME = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME;
const REGION = process.env.BAFATORIO_APP_REGION || 'eu-west-1';

if (!SUPPLIER_TABLE_NAME) {
    console.error("FATAL ERROR: SUPPLIER_TABLE_NAME environment variable is not set.");
    throw new Error("Supplier table name is not configured.");
}

const client = new DynamoDBClient({ region: REGION });

// --- Types ---

// Based on Supplier schema inferred from frontend components and Redux
type Supplier = {
    id: string;
    name: string; // Required
    category?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    country?: string | null;
    estimateMinAmount?: number | null;
    estimateMaxAmount?: number | null;
    estimateUnit?: string | null; // e.g., 'FIXED', 'PER_EVENT'
    currency?: string | null; // e.g., 'EUR', 'USD'
    tags?: string[] | null; // Array of strings
    notes?: string | null;
    website?: string | null;
    vatNumber?: string | null;
    status?: string | null; // e.g., 'ACTIVE', 'INACTIVE' (if needed)
    createdAt: string;
    updatedAt: string;
    owner?: string; // Assuming owner field for authorization
    __typename?: string;
};

// Expected arguments from AppSync mutation
interface UploadSuppliersArguments {
    file: string; // base64 encoded file content
}

// Structure for reporting errors during processing (Internal)
interface UploadError {
    row: number;
    column?: string; // Optional: specific column with error
    message: string;
}

// Structure for the GraphQL mutation's return value (Matches resource.ts)
interface UploadMutationResult {
    success: boolean;
    message: string;
    supplierCount: number;
    reason?: string;
    skippedCount?: number;
    duplicateCount?: number;
    validationErrorCount?: number;
    writeErrorCount?: number;
    // Per-row detail (which line, why) so the UI can show more than a bare count.
    rowErrors?: { row: number; message: string }[];
}

type SupplierImportReason =
    | 'SUCCESS'
    | 'SUCCESS_WITH_SKIPS'
    | 'ALL_DUPLICATES'
    | 'ALL_SKIPPED'
    | 'NO_SUPPLIERS_TO_IMPORT'
    | 'INVALID_INPUT'
    | 'INVALID_FILE_CONTENT'
    | 'UNAUTHENTICATED'
    | 'FILE_MISSING'
    | 'IMPORT_FAILED';

// --- Constants ---
// Define canonical internal field names (used as keys)
const CANONICAL_FIELDS = [
    'Name', 'Category', 'Contact Name', 'Contact Email', 'Contact Phone',
    'Address', 'Country', 'VAT Number', 'Estimate Min Amount', 'Estimate Max Amount',
    'Estimate Unit', 'Currency', 'Tags', 'Notes', 'Website'
];

// Map possible header names to canonical field names. Entries are matched
// after normalizeHeaderLabel() (accent/period/case-insensitive), so only
// genuinely different wording needs its own entry here — not every
// accented/punctuation spelling of the same word.
//
// The downloadable template (src/Components/Supplier/utils/exportSuppliers.js)
// reads its headers directly from this SAME app's `form.fields.*.label`
// translations (en-US/pt-PT/fr-FR supplier.json), so every one of those
// labels must have an entry here too — that's the exact text real users
// will upload back.
export const HEADER_VARIANTS: { [key: string]: string[] } = {
    'Name': ['name', 'nome', 'nom', 'supplier name', 'nome do fornecedor', 'nom du fournisseur'],
    'Category': ['category', 'categoria', 'catégorie'],
    'Contact Name': ['contact name', 'nome de contato', 'nome de contacto', 'nome do contato', 'nom du contact'],
    'Contact Email': ['contact email', 'email de contato', 'email de contacto', 'email do contato', 'email contact', 'email du contact', 'courriel contact'],
    'Contact Phone': ['contact phone', 'telefone de contato', 'telefone de contacto', 'telefone do contato', 'telemóvel', 'téléphone contact', 'téléphone du contact', 'portable'],
    'Address': ['address', 'endereço', 'morada', 'adresse'],
    'Country': ['country', 'país', 'pays'],
    'VAT Number': ['vat number', 'nif', 'nipc', 'nif/nipc', 'numéro de tva', 'numero de tva'],
    'Estimate Min Amount': [
        'estimate min amount', 'valor mínimo estimado', 'montant minimum estimé', 'orçamento min', 'estimativa min',
        'min budget', 'budget min', 'minimum budget', 'preço mínimo',
    ],
    'Estimate Max Amount': [
        'estimate max amount', 'valor máximo estimado', 'montant maximum estimé', 'orçamento max', 'estimativa max',
        'max budget', 'budget max', 'maximum budget', 'preço máximo', 'montant max',
    ],
    'Estimate Unit': ['estimate unit', 'unidade estimada', 'unité estimée', 'unidade', 'unit', 'unité'],
    'Currency': ['currency', 'moeda', 'devise'],
    'Tags': ['tags', 'etiquetas'],
    'Notes': ['notes', 'notas', 'remarques'],
    'Website': ['website', 'site', 'site web']
    // Add other fields/variants as needed
};

// Define valid enum values (align with formOptions.js if possible, use uppercase keys)
const VALID_ESTIMATE_UNITS = ['FIXED', 'PER_EVENT', 'PER_HOUR', 'PER_DAY', 'PER_ITEM', 'PER_GUEST'];

// The UI only ever renders the first 20 (ImportSupplierModal's row-error
// list), so there's no reason to ship the full list for a huge file —
// cap it server-side instead of relying on the client to truncate.
const MAX_ROW_ERRORS = 50;

// --- Helper Functions ---

/**
 * Finds the 0-based index for a canonical field by checking its header variants.
 * Case-insensitive comparison. Returns -1 if no matching variant is found.
 */
function findCanonicalColumnIndex(headerRow: ExcelJS.Row, canonicalFieldName: string): number {
    // Get the list of possible headers for the canonical field, default to the field name itself if not found
    const possibleHeaders = (HEADER_VARIANTS[canonicalFieldName] || [canonicalFieldName.toLowerCase()])
        .map(normalizeHeaderLabel);
    let index = -1;
    headerRow.eachCell((cell, colNumber) => {
        // Find the first matching header variant for this canonical field
        if (index === -1 && cell.value && typeof cell.value === 'string') {
            const normalizedCellValue = normalizeHeaderLabel(cell.value);
            if (possibleHeaders.includes(normalizedCellValue)) {
                index = colNumber - 1; // Adjust to 0-based index
            }
        }
    });
    return index;
}

/**
 * Validates if a value is a non-empty string.
 */
function isValidString(value: any): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates if a value is a positive number (or null/undefined).
 */
function isValidPositiveNumberOrNull(value: any): boolean {
    return value === null || value === undefined || (typeof value === 'number' && value >= 0);
}

/**
 * Caps the row-error detail sent back to the client at MAX_ROW_ERRORS.
 */
function buildRowErrors(errors: { row: number; message: string }[]): { row: number; message: string }[] {
    return errors.slice(0, MAX_ROW_ERRORS).map((e) => ({ row: e.row, message: e.message }));
}

/**
 * Estimate amounts arrive as native numbers from real .xlsx files, but as
 * strings when the workbook was synthesized from a CSV on the client (Papa
 * Parse without dynamicTyping — see ImportSupplierModal's buildWorkbookFromCsv).
 * Accepts numeric strings so both origins validate the same way; anything
 * else passes through untouched so the typeof check below still rejects it.
 */
function coerceEstimateAmount(value: any): any {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed === '') return value;

    const direct = Number(trimmed);
    if (!isNaN(direct)) return direct;

    // US format ("1,234.56" / "5,000"): ',' groups of exactly 3 digits as
    // thousands, optional '.' decimal. Checked before the PT branch because
    // blindly applying the PT swap to these values corrupts them ~1000x
    // ("2,500.00" → 2.5). The bare "1,234" case is read as thousands: a
    // 3-decimal money amount is implausible, and this mirrors how the
    // direct parse above already reads "1.234" as an en-US decimal.
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed.replace(/,/g, ''));
    }

    // PT format ("1.234,56" / "234,56"): '.' groups of exactly 3 digits as
    // thousands, ',' as decimal separator. Anything that fits neither
    // pattern (e.g. "12,34,56") falls through untouched so the typeof
    // check at the call site rejects it with a row error.
    if (/^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(trimmed)) {
        return Number(trimmed.replace(/\./g, '').replace(',', '.'));
    }

    return value;
}

/**
 * Validates if an estimate unit is in the predefined list (case-insensitive).
 * Returns the uppercase valid unit or null.
 */
function validateEstimateUnit(value: any): string | null {
    if (!value || typeof value !== 'string') return null;
    const upperValue = value.trim().toUpperCase();
    return VALID_ESTIMATE_UNITS.includes(upperValue) ? upperValue : null;
}

/**
 * Parses comma-separated tags into an array of strings.
 */
function parseTags(value: any): string[] | null {
    if (!value || typeof value !== 'string') return null;
    return value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
}

/**
 * Writes items to DynamoDB in batches of 25.
 */
async function batchWriteItems(items: Supplier[], tableName: string): Promise<{ successCount: number, errorCount: number }> {
    if (!items.length) return { successCount: 0, errorCount: 0 };

    let processedCount = 0;
    let failedCount = 0; // Track failed items more explicitly
    const batchSize = 25;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const writeRequests: WriteRequest[] = batch.map(item => ({
            PutRequest: {
                Item: marshall(item, { removeUndefinedValues: true }),
            },
        }));

        const command = new BatchWriteItemCommand({
            RequestItems: {
                [tableName]: writeRequests,
            },
        });

        try {
            const result = await client.send(command);
            const unprocessed = result.UnprocessedItems?.[tableName];
            const currentBatchFailed = unprocessed?.length || 0;
            const currentBatchSuccess = batch.length - currentBatchFailed;

            processedCount += currentBatchSuccess;
            failedCount += currentBatchFailed;

            if (unprocessed && unprocessed.length > 0) {
                console.warn(`BatchWrite: ${unprocessed.length} items were unprocessed in batch starting at index ${i}.`);
                // Optionally, you could retry unprocessed items here, but for simplicity, we count them as errors.
            }
        } catch (error) {
            console.error(`BatchWrite Error processing batch starting at index ${i}:`, error);
            // Assume the entire batch failed if the command throws an error
            failedCount += batch.length;
        }
    }
    // Ensure counts add up correctly
    const totalItems = items.length;
    const calculatedSuccess = totalItems - failedCount;
    // If calculation mismatch, log a warning but proceed
    if (processedCount !== calculatedSuccess) {
        console.warn(`BatchWrite count mismatch: processedCount=${processedCount}, calculatedSuccess=${calculatedSuccess}, failedCount=${failedCount}`);
    }

    return { successCount: calculatedSuccess, errorCount: failedCount };
}

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
}): UploadMutationResult {
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


// --- Main Handler ---
export const handler = async (
    event: AppSyncResolverEvent<UploadSuppliersArguments, Supplier | null>,
    context: Context
): Promise<UploadMutationResult> => { // Adjusted return type

    const { file: base64File } = event.arguments;
    // Safely access 'sub' by checking if identity exists and has 'sub' property
    const owner = (event.identity && 'sub' in event.identity) ? event.identity.sub : undefined; // Use Cognito sub as owner identifier

    const internalErrors: UploadError[] = []; // Keep track of parsing/validation errors

    if (!base64File) {
        console.error("Validation Error: Base64 file content is missing.");
        internalErrors.push({ row: 0, message: "File content is missing." });
        return buildResult({ success: false, message: "File content is missing.", reason: 'FILE_MISSING' });
    }
     if (!owner) {
        console.error("Authorization Error: User identity (sub) not found or not a Cognito user.");
        internalErrors.push({ row: 0, message: "User not authenticated or identity missing." });
        return buildResult({ success: false, message: "User not authenticated.", reason: 'UNAUTHENTICATED' });
    }

    const suppliersToCreate: Supplier[] = [];
    const existingKeys = owner ? await fetchExistingSuppliersByOwner(owner) : new Set<string>();


    try {
        const buffer = Buffer.from(base64File, 'base64');
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error("Workbook contains no worksheets.");
        }

        const headerRow = worksheet.getRow(1);
        const colIndices: { [key: string]: number } = {}; // Keys will be CANONICAL_FIELDS

        // Populate colIndices using canonical names and checking variants
        CANONICAL_FIELDS.forEach(field => {
            colIndices[field] = findCanonicalColumnIndex(headerRow, field);
        });

        // Basic header validation (check if the canonical 'Name' was found)
        if (colIndices['Name'] === -1) {
             // Improve error message to show expected variants
             const nameVariants = HEADER_VARIANTS['Name'].join("', '");
             const message = `Required header for 'Name' (e.g., '${nameVariants}') not found.`;
             internalErrors.push({ row: 1, message: message });
             return buildResult({
                success: false,
                message,
                reason: 'INVALID_FILE_CONTENT',
                validationErrorCount: 1,
                skippedCount: 1,
             });
        }

        const now = new Date().toISOString();

        // Iterate through rows, starting from the second row (index 2)
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowErrors: string[] = [];

            // Helper to get cell value safely using the CANONICAL field name
            const getCellValue = (canonicalField: string): any => {
                const index = colIndices[canonicalField]; // Use canonical name to get index
                return index !== -1 ? row.getCell(index + 1).value : null;
            };

            // Use canonical names to get values
            const name = getCellValue('Name');
            const category = getCellValue('Category');
            const contactName = getCellValue('Contact Name');
            const contactEmail = getCellValue('Contact Email');
            const contactPhone = getCellValue('Contact Phone');
            const address = getCellValue('Address');
            const country = getCellValue('Country');
            const vatNumber = getCellValue('VAT Number');
            const estimateMinAmount = coerceEstimateAmount(getCellValue('Estimate Min Amount'));
            const estimateMaxAmount = coerceEstimateAmount(getCellValue('Estimate Max Amount'));
            const estimateUnit = getCellValue('Estimate Unit');
            const currency = getCellValue('Currency');
            const tags = getCellValue('Tags');
            const notes = getCellValue('Notes');
            const website = getCellValue('Website');

            // --- Validation (operates on extracted values, column names in errors are now canonical) ---
            if (!isValidString(name)) {
                // Only add error if other cells have values, otherwise it's likely just an empty row
                 if (Array.isArray(row.values) && row.values.slice(1).some(v => v !== null && v !== undefined && v !== '')) {
                    rowErrors.push("Value for required field 'Name' is missing or empty.");
                 } else {
                    continue; // Skip entirely empty rows silently
                 }
            }

            const processedCategory = normalizeSupplierCategory(category) ?? null;

            if (estimateMinAmount !== null && estimateMinAmount !== undefined && typeof estimateMinAmount !== 'number') {
                 rowErrors.push(`Invalid value for 'Estimate Min Amount': ${estimateMinAmount}. Must be a number.`);
            }
            if (estimateMaxAmount !== null && estimateMaxAmount !== undefined && typeof estimateMaxAmount !== 'number') {
                 rowErrors.push(`Invalid value for 'Estimate Max Amount': ${estimateMaxAmount}. Must be a number.`);
            }
            if (typeof estimateMinAmount === 'number' && typeof estimateMaxAmount === 'number' && estimateMinAmount > estimateMaxAmount) {
                rowErrors.push("'Estimate Min Amount' cannot be greater than 'Estimate Max Amount'.");
            }

            const validEstimateUnit = estimateUnit ? validateEstimateUnit(estimateUnit) : null;
            if (estimateUnit && !validEstimateUnit) {
                rowErrors.push(`Invalid value for 'Estimate Unit': ${estimateUnit}. Must be one of [${VALID_ESTIMATE_UNITS.join(', ')}].`);
            }

            const processedCurrency = isValidString(currency) ? currency.trim().toUpperCase() : null;

            // --- Collect Errors or Prepare Item ---
            if (rowErrors.length > 0) {
                internalErrors.push({ row: i, message: rowErrors.join('; ') });
            } else {
                // Check name validity again *after* row validation
                 if (isValidString(name)) {
                    const normalizedName = name.trim();
                    const normalizedContactEmail = isValidString(contactEmail) ? contactEmail.trim() : null;
                    const normalizedContactPhone = isValidString(contactPhone) ? contactPhone.trim() : null;
                    const duplicateKey = buildSupplierDuplicateKey(
                        normalizedName,
                        normalizedContactEmail || undefined,
                        normalizedContactPhone || undefined
                    );

                    if (existingKeys.has(duplicateKey)) {
                        internalErrors.push({ row: i, message: 'Duplicate supplier skipped.' });
                        continue;
                    }
                    existingKeys.add(duplicateKey);

                    const supplier: Supplier = {
                        id: uuidv4(),
                        name: normalizedName,
                        category: processedCategory,
                        contactName: isValidString(contactName) ? contactName.trim() : null,
                        contactEmail: normalizedContactEmail,
                        contactPhone: normalizedContactPhone,
                        address: isValidString(address) ? address.trim() : null,
                        country: isValidString(country) ? country.trim() : null,
                        vatNumber: isValidString(vatNumber) ? vatNumber.trim() : null,
                        estimateMinAmount: typeof estimateMinAmount === 'number' ? estimateMinAmount : null,
                        estimateMaxAmount: typeof estimateMaxAmount === 'number' ? estimateMaxAmount : null,
                        estimateUnit: validEstimateUnit,
                        currency: processedCurrency,
                        tags: parseTags(tags),
                        notes: isValidString(notes) ? notes.trim() : null,
                        website: isValidString(website) ? website.trim() : null,
                        createdAt: now,
                        updatedAt: now,
                        owner: owner,
                        __typename: "Supplier"
                    };
                    suppliersToCreate.push(supplier);
                }
                // No 'else' needed here as invalid name rows are already skipped or added to internalErrors
            }
        } // End row loop

        // --- Batch Write to DynamoDB ---
        let writeSuccess = 0;
        let writeError = 0; // DynamoDB write errors specifically
        let message = "";

        if (suppliersToCreate.length > 0) {
            const batchResult = await batchWriteItems(suppliersToCreate, SUPPLIER_TABLE_NAME);
            writeSuccess = batchResult.successCount;
            writeError = batchResult.errorCount; // Errors during the DynamoDB write operation

            const duplicateCount = internalErrors.filter((error) => error.message === 'Duplicate supplier skipped.').length;
            const validationErrorCount = internalErrors.length - duplicateCount;
            const skippedCount = duplicateCount + validationErrorCount;

             if (writeSuccess > 0 && writeError === 0 && skippedCount === 0) {
                message = `Successfully imported ${writeSuccess} suppliers.`;
            } else if (writeSuccess > 0 && (skippedCount > 0 || writeError > 0)) {
                 message = `Imported ${writeSuccess} suppliers. ${skippedCount > 0 ? `${skippedCount} rows were skipped. ` : ''}${writeError > 0 ? `${writeError} failed during database write.` : ''}`.trim();
            } else {
                 message = `Import failed. ${writeError > 0 ? `${writeError} failed during database write. ` : ''}${skippedCount > 0 ? `${skippedCount} rows were skipped.` : 'No valid suppliers found to import.'}`.trim();
            }

            // Log detailed errors server-side
            if(writeError > 0) {
                 console.error(`DynamoDB BatchWrite Errors: ${writeError} items failed to write.`);
            }

            return buildResult({
                success: writeSuccess > 0,
                message,
                supplierCount: writeSuccess,
                reason: writeSuccess > 0
                    ? ((skippedCount > 0 || writeError > 0) ? 'SUCCESS_WITH_SKIPS' : 'SUCCESS')
                    : 'IMPORT_FAILED',
                skippedCount,
                duplicateCount,
                validationErrorCount,
                writeErrorCount: writeError,
                rowErrors: buildRowErrors(internalErrors),
            });

        } else {
             const duplicateErrorCount = internalErrors.filter((error) => error.message === 'Duplicate supplier skipped.').length;
             const nonDuplicateErrorCount = internalErrors.length - duplicateErrorCount;
             message = "No suppliers were imported.";
             if (duplicateErrorCount > 0) {
                 message += ` ${duplicateErrorCount} rows were skipped as duplicates.`;
             }
             if (nonDuplicateErrorCount > 0) {
                 message += ` ${nonDuplicateErrorCount} rows had validation errors.`;
             }
             if (internalErrors.length === 0) {
                 message = "No valid suppliers found in the file to import.";
             }
            return buildResult({
                success: duplicateErrorCount > 0 && nonDuplicateErrorCount === 0,
                message,
                reason: duplicateErrorCount > 0 && nonDuplicateErrorCount === 0
                    ? 'ALL_DUPLICATES'
                    : (internalErrors.length > 0 ? 'ALL_SKIPPED' : 'NO_SUPPLIERS_TO_IMPORT'),
                skippedCount: internalErrors.length,
                duplicateCount: duplicateErrorCount,
                validationErrorCount: nonDuplicateErrorCount,
                rowErrors: buildRowErrors(internalErrors),
            });
        }

    } catch (error: any) {
        console.error("Error processing supplier upload:", error);
        const errorMessage = `Upload failed: ${error.message || 'An unexpected error occurred.'}`;
        internalErrors.push({ row: 0, message: errorMessage });
        // Log detailed errors server-side
        console.error("Internal Errors during exception:", JSON.stringify(internalErrors));
        return buildResult({
            success: false,
            message: errorMessage,
            reason: 'IMPORT_FAILED',
        });
    }
};
