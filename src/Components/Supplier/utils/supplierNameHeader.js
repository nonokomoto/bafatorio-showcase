/**
 * Client-side "which column is the supplier Name?" check, used by
 * ImportSupplierModal's fallback preview (getFallbackPreviewStats, active
 * when AI normalization is unavailable) to count valid/invalid rows before
 * submission. Mirrors HEADER_VARIANTS['Name'] in
 * amplify/function/upload-supplier/handler.ts — this list and that
 * server-side parser must recognize the exact same header text (the
 * downloadable template's Name column, sourced from form.fields.name.label
 * in en-US/pt-PT/fr-FR supplier.json), or the preview count and the actual
 * import silently disagree.
 *
 * normalizeHeaderText below is a deliberate mirror of the server's
 * normalizeHeaderLabel (amplify/function/shared/importUtils.ts) — same
 * accent-stripping/period-removal/whitespace-collapsing rules — so a header
 * the user edited by hand still matches on both sides. The two can't share
 * one module (importUtils.ts pulls in the AWS SDK, which doesn't belong in
 * the frontend bundle), so amplify/function/upload-supplier/nameHeader.sync.test.ts
 * asserts they agree instead — the repo's existing pattern for frontend/backend
 * mirrors (see plans.sync.test.ts).
 *
 * Kept in a dependency-free file (no exceljs import) so it can be unit
 * tested without pulling in ImportSupplierModal's heavy static imports.
 */
export const SUPPLIER_NAME_HEADERS = ['name', 'nome', 'nom', 'supplier name', 'nome do fornecedor', 'nom du fournisseur'];

export function normalizeHeaderText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSupplierNameColumnIndex(headerRow) {
  const headers = (headerRow.values || []).map(normalizeHeaderText);
  return headers.findIndex(header => header && SUPPLIER_NAME_HEADERS.includes(header));
}
