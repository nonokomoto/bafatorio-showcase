import { SUPPLIER_NAME_HEADERS, findSupplierNameColumnIndex } from '../utils/supplierNameHeader';
import enUS from '../../../i18n/locales/en-US/supplier.json';
import ptPT from '../../../i18n/locales/pt-PT/supplier.json';
import frFR from '../../../i18n/locales/fr-FR/supplier.json';

// Regression: the client-side fallback preview (getFallbackPreviewStats, used
// when AI normalization is unavailable) locates the Name column with its own
// SUPPLIER_NAME_HEADERS list, separate from the server-side
// HEADER_VARIANTS['Name'] in amplify/function/upload-supplier/handler.ts. A
// mismatch silently zeroes the preview count and shows "?" in the Import
// button — this test reads the REAL translated `form.fields.name.label` from
// each locale so a future edit there can't silently break recognition again.
//
// findSupplierNameColumnIndex only needs the `.values` shape of an ExcelJS
// Row (1-indexed, index 0 unused) — a plain object avoids importing exceljs
// itself, which resolves to a browser bundle under Jest's jsdom "frontend"
// project and fails to parse (see exportSuppliers.js's lazy-import comment).
function buildHeaderRow(headerText) {
  return { values: [undefined, headerText] };
}

describe('SUPPLIER_NAME_HEADERS stays in sync with form.fields.name.label', () => {
  it.each([
    ['en-US', enUS.form.fields.name.label],
    ['pt-PT', ptPT.form.fields.name.label],
    ['fr-FR', frFR.form.fields.name.label],
  ])('recognizes the %s template Name header ("%s")', (_locale, label) => {
    expect(SUPPLIER_NAME_HEADERS).toContain(label.toLowerCase());

    // ExcelJS Row.values is 1-indexed (index 0 is always unused), so the
    // first real column comes back as index 1, not 0.
    const headerRow = buildHeaderRow(label);
    expect(findSupplierNameColumnIndex(headerRow)).toBe(1);
  });
});
