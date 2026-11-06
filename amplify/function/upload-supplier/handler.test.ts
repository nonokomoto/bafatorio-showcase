/**
 * Regression coverage: the downloadable import template
 * (src/Components/Supplier/utils/exportSuppliers.js) generates translated
 * column headers per locale. This legacy fallback Lambda (used whenever the
 * AI /normalize/suppliers endpoint is unavailable — see ImportSupplierModal's
 * dual-path submit) must recognize its OWN template's headers in every
 * supported locale, or filled-in data silently imports as null.
 */
import ExcelJS from 'exceljs';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    BatchWriteItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('../shared/importUtils', () => ({
  ...jest.requireActual('../shared/importUtils'),
  fetchExistingSuppliersByOwner: jest.fn().mockResolvedValue(new Set()),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (e: any) => Promise<any>;

beforeAll(() => {
  process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = 'supplier-table';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  handler = require('./handler').handler;
});

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ UnprocessedItems: {} });
});

async function buildBase64Workbook(headers: string[], row: (string | number)[]) {
  return buildBase64WorkbookMultiRow(headers, [row]);
}

async function buildBase64WorkbookMultiRow(headers: string[], rows: (string | number)[][]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString('base64');
}

function getWrittenSupplier() {
  const { marshall, unmarshall } = jest.requireActual('@aws-sdk/util-dynamodb');
  const call = mockSend.mock.calls[0][0] as {
    RequestItems: { 'supplier-table': Array<{ PutRequest: { Item: unknown } }> };
  };
  return unmarshall(call.RequestItems['supplier-table'][0].PutRequest.Item as Parameters<typeof marshall>[0]);
}

describe('upload-supplier handler — template header recognition', () => {
  // Headers below are the EXACT strings the template now renders — read
  // straight from src/i18n/locales/{locale}/supplier.json `form.fields.*.label`
  // (see exportSuppliers.js SUPPLIER_TEMPLATE_COLUMNS).
  it('recognizes the pt-PT downloadable template headers', async () => {
    const base64 = await buildBase64Workbook(
      ['Nome do Fornecedor', 'Categoria', 'Nome do Contato', 'Email do Contato', 'Telefone do Contato', 'Endereço', 'País', 'Website', 'NIF/NIPC', 'Preço Mínimo', 'Preço Máximo', 'Unidade', 'Moeda', 'Notas'],
      ['Catering Bom Gosto', 'CATERING', 'Ana Silva', 'ana@bomgosto.pt', '+351 912 345 678', 'Rua das Flores 10', 'Portugal', 'https://bomgosto.pt', '123456789', 500, 1500, 'PER_EVENT', 'EUR', 'Fornecedor preferencial'],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });
    expect(result.success).toBe(true);
    expect(result.supplierCount).toBe(1);

    const supplier = getWrittenSupplier();
    expect(supplier.name).toBe('Catering Bom Gosto');
    expect(supplier.contactName).toBe('Ana Silva');
    expect(supplier.contactEmail).toBe('ana@bomgosto.pt');
    expect(supplier.contactPhone).toBe('+351 912 345 678');
    expect(supplier.vatNumber).toBe('123456789');
    expect(supplier.estimateMinAmount).toBe(500);
    expect(supplier.estimateMaxAmount).toBe(1500);
    expect(supplier.estimateUnit).toBe('PER_EVENT');
    expect(supplier.website).toBe('https://bomgosto.pt');
  });

  it('recognizes the en-US downloadable template headers', async () => {
    const base64 = await buildBase64Workbook(
      ['Supplier Name', 'Category', 'Contact Name', 'Contact Email', 'Contact Phone', 'Address', 'Country', 'Website', 'VAT Number', 'Minimum Budget', 'Maximum Budget', 'Unit', 'Currency', 'Notes'],
      ['Good Taste Catering', 'CATERING', 'Ann Smith', 'ann@goodtaste.com', '+1 555 0100', '10 Flower St', 'USA', 'https://goodtaste.com', 'GB123456789', 500, 1500, 'PER_EVENT', 'USD', 'Preferred supplier'],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });
    expect(result.success).toBe(true);

    const supplier = getWrittenSupplier();
    expect(supplier.name).toBe('Good Taste Catering');
    expect(supplier.contactName).toBe('Ann Smith');
    expect(supplier.contactEmail).toBe('ann@goodtaste.com');
    expect(supplier.contactPhone).toBe('+1 555 0100');
    expect(supplier.vatNumber).toBe('GB123456789');
    expect(supplier.estimateMinAmount).toBe(500);
    expect(supplier.estimateMaxAmount).toBe(1500);
    expect(supplier.estimateUnit).toBe('PER_EVENT');
    expect(supplier.website).toBe('https://goodtaste.com');
  });

  it('recognizes the fr-FR downloadable template headers', async () => {
    const base64 = await buildBase64Workbook(
      ['Nom du Fournisseur', 'Catégorie', 'Nom du Contact', 'Email du Contact', 'Téléphone du Contact', 'Adresse', 'Pays', 'Site Web', 'Numéro de TVA', 'Budget Min.', 'Montant Max.', 'Unité', 'Devise', 'Notes'],
      ['Bon Goût Traiteur', 'CATERING', 'Anne Dupont', 'anne@bongout.fr', '+33 6 12 34 56 78', '10 Rue des Fleurs', 'France', 'https://bongout.fr', 'FR12345678901', 500, 1500, 'PER_EVENT', 'EUR', 'Fournisseur préféré'],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });
    expect(result.success).toBe(true);

    const supplier = getWrittenSupplier();
    expect(supplier.name).toBe('Bon Goût Traiteur');
    expect(supplier.contactName).toBe('Anne Dupont');
    expect(supplier.contactEmail).toBe('anne@bongout.fr');
    expect(supplier.contactPhone).toBe('+33 6 12 34 56 78');
    expect(supplier.vatNumber).toBe('FR12345678901');
    expect(supplier.estimateMinAmount).toBe(500);
    expect(supplier.estimateMaxAmount).toBe(1500);
    expect(supplier.estimateUnit).toBe('PER_EVENT');
    expect(supplier.website).toBe('https://bongout.fr');
  });
});

describe('upload-supplier handler — rowErrors detail', () => {
  const HEADERS = ['Nome do Fornecedor', 'Preço Mínimo'];

  it('reports the row number and reason for an invalid budget value, alongside the valid row', async () => {
    const base64 = await buildBase64WorkbookMultiRow(HEADERS, [
      ['Valid Supplier', 500],
      ['Broken Supplier', 'not-a-number'],
    ]);

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    expect(result.reason).toBe('SUCCESS_WITH_SKIPS');
    expect(result.supplierCount).toBe(1);
    expect(result.rowErrors).toEqual([
      { row: 3, message: expect.stringContaining("Estimate Min Amount") },
    ]);
  });

  it('reports every skipped row when nothing gets imported', async () => {
    const base64 = await buildBase64WorkbookMultiRow(HEADERS, [
      ['', 500], // missing name, other cells filled -> validation error, not a silent skip
    ]);

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(false);
    expect(result.rowErrors).toEqual([
      { row: 2, message: expect.stringContaining("Name") },
    ]);
  });

  // Bug reported by nonokomoto on PR #209: buildWorkbookFromCsv (client side)
  // parses CSV without dynamicTyping, so every cell — including amounts —
  // arrives here as a string, unlike a real .xlsx where the cell already has
  // a numeric type. Numeric strings must validate the same as real numbers.
  it('accepts numeric strings for Estimate Min/Max Amount (CSV-synthesized workbook)', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo', 'Preço Máximo'],
      [['CSV Supplier', '500', '1500']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    expect(result.reason).toBe('SUCCESS');
    expect(result.rowErrors).toEqual([]);

    const supplier = getWrittenSupplier();
    expect(supplier.estimateMinAmount).toBe(500);
    expect(supplier.estimateMaxAmount).toBe(1500);
  });

  // Issue #212 item 2: coerceEstimateAmount only handled plain numeric
  // strings — a PT-formatted decimal ('.' thousands separator, ',' decimal
  // separator) from a CSV still failed with "Must be a number".
  it('accepts PT-formatted decimal strings for Estimate Min/Max Amount', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo', 'Preço Máximo'],
      [['PT Format Supplier', '1.234,56', '2.500,00']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    expect(result.reason).toBe('SUCCESS');
    expect(result.rowErrors).toEqual([]);

    const supplier = getWrittenSupplier();
    expect(supplier.estimateMinAmount).toBe(1234.56);
    expect(supplier.estimateMaxAmount).toBe(2500);
  });

  it('accepts a comma-only PT decimal string (no thousands separator)', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo'],
      [['Comma Decimal Supplier', '234,56']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    const supplier = getWrittenSupplier();
    expect(supplier.estimateMinAmount).toBe(234.56);
  });

  // PR #218 review: the PT fallback blindly stripped '.' and swapped ',',
  // so a US-formatted amount ("1,234.56") was silently corrupted ~1000x
  // (→ 1.23456) instead of parsing as thousands. US formats must parse
  // correctly, not just "not crash".
  it('accepts US-formatted amounts with thousands separator and decimal point', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo', 'Preço Máximo'],
      [['US Format Supplier', '1,234.56', '2,500.00']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    expect(result.rowErrors).toEqual([]);

    const supplier = getWrittenSupplier();
    expect(supplier.estimateMinAmount).toBe(1234.56);
    expect(supplier.estimateMaxAmount).toBe(2500);
  });

  it('reads a bare comma-plus-3-digits group as US thousands, not a 3-decimal amount', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo', 'Preço Máximo'],
      [['US Thousands Supplier', '1,234', '5,000']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    expect(result.rowErrors).toEqual([]);

    const supplier = getWrittenSupplier();
    expect(supplier.estimateMinAmount).toBe(1234);
    expect(supplier.estimateMaxAmount).toBe(5000);
  });

  it('accepts a multi-group US thousands amount', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo'],
      [['Big US Supplier', '1,234,567']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    const supplier = getWrittenSupplier();
    expect(supplier.estimateMinAmount).toBe(1234567);
  });

  it('rejects a malformed separator mix instead of guessing', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo'],
      [['Malformed Supplier', '12,34,56']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.rowErrors).toEqual([
      { row: 2, message: expect.stringContaining("Estimate Min Amount") },
    ]);
  });

  it('still rejects a genuinely non-numeric string', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Preço Mínimo'],
      [['Broken Supplier', 'not-a-number']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.rowErrors).toEqual([
      { row: 2, message: expect.stringContaining("Estimate Min Amount") },
    ]);
  });
});

describe('upload-supplier handler — category normalization', () => {
  // Bug flagged by nonokomoto on PR #209: this handler kept its own
  // category.trim().toUpperCase() instead of sharing normalizeSupplierCategory
  // with import-normalized-suppliers/import-normalized-event-suppliers, so the
  // same supplier could land as "FOTOGRAFIA" or "PHOTOGRAPHY" depending on
  // which import path it came through — splitting one supplier set across two
  // buckets in filters/dashboard aggregations.
  it('normalizes a free-text category the same way the other import paths do', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Categoria'],
      [['Foto Supplier', 'Fotografia']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    const supplier = getWrittenSupplier();
    expect(supplier.category).toBe('PHOTOGRAPHY');
  });

  it('still falls back to the trimmed/uppercased original text when nothing matches', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Categoria'],
      [['Odd Supplier', 'Pyrotechnics']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    const supplier = getWrittenSupplier();
    expect(supplier.category).toBe('PYROTECHNICS');
  });

  it('leaves category null when the cell is empty', async () => {
    const base64 = await buildBase64WorkbookMultiRow(
      ['Nome do Fornecedor', 'Categoria'],
      [['No Category Supplier', '']],
    );

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    const supplier = getWrittenSupplier();
    expect(supplier.category).toBeNull();
  });
});

describe('upload-supplier handler — rowErrors cap', () => {
  // Bug flagged by nonokomoto on PR #209: internalErrors.map had no cap, but
  // ImportSupplierModal only ever renders the first 20 — a large file with
  // every row skipped would ship an unbounded array back to the client.
  it('caps rowErrors at 50 even when many more rows were skipped', async () => {
    const rows = Array.from({ length: 60 }, () => ['Same Name Supplier']);
    const base64 = await buildBase64WorkbookMultiRow(['Nome do Fornecedor'], rows);

    const result = await handler({ arguments: { file: base64 }, identity: { sub: 'owner-1' } });

    expect(result.success).toBe(true);
    expect(result.supplierCount).toBe(1);
    expect(result.skippedCount).toBe(59);
    expect(result.rowErrors).toHaveLength(50);
  });
});
