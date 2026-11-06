/**
 * Column definitions for the downloadable import templates. Header labels
 * are read from the SAME `form.fields.*.label` keys the Supplier create/edit
 * form uses (namespace `supplier`, passed in as `t`) — not a separate
 * translation block — so the template can never drift from what the user
 * sees when filling in a supplier by hand. The global template's headers
 * also have to survive the legacy fallback importer's exact-match column
 * lookup (amplify/function/upload-supplier/handler.ts HEADER_VARIANTS) when
 * AI normalization is unavailable, which is why this alignment matters.
 */

const HEADER_FILL = 'FF4069FF'; // primary-500
const HEADER_FONT = 'FFFFFFFF';
const EXAMPLE_FONT = 'FF808080';

export const SUPPLIER_TEMPLATE_COLUMNS = [
  { key: 'name', i18n: 'form.fields.name.label', fallback: 'Name', width: 24, example: 'Catering Bom Gosto' },
  { key: 'category', i18n: 'form.fields.category.label', fallback: 'Category', width: 16, example: 'CATERING' },
  { key: 'contactName', i18n: 'form.fields.contactName.label', fallback: 'Contact Name', width: 20, example: 'Ana Silva' },
  { key: 'contactEmail', i18n: 'form.fields.contactEmail.label', fallback: 'Contact Email', width: 26, example: 'ana@bomgosto.pt' },
  { key: 'contactPhone', i18n: 'form.fields.contactPhone.label', fallback: 'Contact Phone', width: 18, example: '+351 912 345 678' },
  { key: 'address', i18n: 'form.fields.address.label', fallback: 'Address', width: 26, example: 'Rua das Flores 10, Lisboa' },
  { key: 'country', i18n: 'form.fields.country.label', fallback: 'Country', width: 14, example: 'Portugal' },
  { key: 'website', i18n: 'form.fields.website.label', fallback: 'Website', width: 22, example: 'https://bomgosto.pt' },
  { key: 'vatNumber', i18n: 'form.fields.vatNumber.label', fallback: 'VAT Number', width: 16, example: '123456789' },
  { key: 'estimateMinAmount', i18n: 'form.fields.estimateMin.label', fallback: 'Minimum Budget', width: 16, example: 500 },
  { key: 'estimateMaxAmount', i18n: 'form.fields.estimateMax.label', fallback: 'Maximum Budget', width: 16, example: 1500 },
  { key: 'estimateUnit', i18n: 'form.fields.estimateUnit.label', fallback: 'Unit', width: 14, example: 'PER_EVENT' },
  { key: 'currency', i18n: 'form.fields.currency.label', fallback: 'Currency', width: 12, example: 'EUR' },
  { key: 'notes', i18n: 'form.fields.notes.label', fallback: 'Notes', width: 30, example: 'Fornecedor preferencial' },
];

export const EVENT_SUPPLIER_TEMPLATE_COLUMNS = [
  { key: 'name', i18n: 'importEventSuppliersModal.columns.name', fallback: 'Supplier', width: 24, example: 'Catering Bom Gosto' },
  { key: 'category', i18n: 'form.fields.category.label', fallback: 'Category', width: 16, example: 'CATERING' },
  { key: 'contactEmail', i18n: 'form.fields.contactEmail.label', fallback: 'Contact Email', width: 26, example: 'ana@bomgosto.pt' },
  { key: 'contactPhone', i18n: 'form.fields.contactPhone.label', fallback: 'Contact Phone', width: 18, example: '+351 912 345 678' },
  { key: 'quoteAmount', i18n: 'importEventSuppliersModal.columns.quote', fallback: 'Quote', width: 14, example: 1250 },
  { key: 'currency', i18n: 'form.fields.currency.label', fallback: 'Currency', width: 12, example: 'EUR' },
  { key: 'status', i18n: 'importEventSuppliersModal.columns.status', fallback: 'Status', width: 14, example: 'PENDING' },
  { key: 'description', i18n: 'importEventSuppliersModal.columns.description', fallback: 'Description', width: 30, example: 'Catering para 80 pessoas' },
  { key: 'externalRef', i18n: 'importEventSuppliersModal.columns.ref', fallback: 'Ref.', width: 14, example: 'ALO-001' },
];

/**
 * Builds and downloads a single-sheet .xlsx template: one bold header row
 * plus one italic example row, matching `columns`. No file is written to
 * disk — the workbook is generated in-memory and downloaded via Blob, same
 * mechanism as ImportParticipantsModal's handleDownloadTemplate.
 */
export async function downloadSupplierImportTemplate({ t, columns, sheetName, filename }) {
  // Lazy-loaded: exceljs is only needed for this rare action, and importing it
  // eagerly drags a large dependency into every consumer's bundle/module graph.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((col) => ({ key: col.key, width: col.width }));

  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = t(col.i18n, col.fallback);
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  const exampleData = {};
  columns.forEach((col) => { exampleData[col.key] = col.example || ''; });
  worksheet.addRow(exampleData);
  worksheet.getRow(2).font = { italic: true, color: { argb: EXAMPLE_FONT }, size: 10 };

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
