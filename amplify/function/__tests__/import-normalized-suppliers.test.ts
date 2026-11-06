jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-1') }));

jest.mock('../shared/importUtils', () => ({
  buildSupplierDuplicateKey: jest.fn((name: string) => name.toLowerCase()),
  fetchExistingSuppliersByOwner: jest.fn(),
  batchWriteItems: jest.fn(),
}));

const { fetchExistingSuppliersByOwner, batchWriteItems } = jest.requireMock(
  '../shared/importUtils'
) as {
  fetchExistingSuppliersByOwner: jest.Mock;
  batchWriteItems: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (e: any) => Promise<any>;

beforeAll(() => {
  process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = 'supplier-table';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  handler = require('../import-normalized-suppliers/handler').handler;
});

beforeEach(() => {
  fetchExistingSuppliersByOwner.mockReset().mockResolvedValue(new Set());
  batchWriteItems.mockReset().mockResolvedValue(undefined);
});

describe('import-normalized-suppliers handler', () => {
  it('rejects unauthenticated calls', async () => {
    const result = await handler({
      arguments: { suppliers: JSON.stringify([{ name: 'Acme' }]) },
      identity: {},
    });
    expect(result.reason).toBe('UNAUTHENTICATED');
    expect(batchWriteItems).not.toHaveBeenCalled();
  });

  it('rejects when no supplier data is provided', async () => {
    const result = await handler({ arguments: { suppliers: '' }, identity: { sub: 'owner-1' } });
    expect(result.reason).toBe('INVALID_INPUT');
  });

  it('normalizes a known synonym category before writing', async () => {
    const result = await handler({
      arguments: { suppliers: JSON.stringify([{ name: 'Transportes Lisboa', category: 'Transporte' }]) },
      identity: { sub: 'owner-1' },
    });

    expect(result.reason).toBe('SUCCESS');
    expect(batchWriteItems).toHaveBeenCalledTimes(1);
    const [items] = batchWriteItems.mock.calls[0];
    expect(items[0].category).toBe('TRANSPORTATION');
  });

  it('passes through an unmatched category uppercased', async () => {
    await handler({
      arguments: { suppliers: JSON.stringify([{ name: 'Guarda Segura', category: 'Segurança' }]) },
      identity: { sub: 'owner-1' },
    });

    const [items] = batchWriteItems.mock.calls[0];
    expect(items[0].category).toBe('SEGURANÇA');
  });

  it('carries vatNumber through to the write payload', async () => {
    await handler({
      arguments: { suppliers: JSON.stringify([{ name: 'Catering Bom Gosto', vatNumber: ' 123456789 ' }]) },
      identity: { sub: 'owner-1' },
    });

    const [items] = batchWriteItems.mock.calls[0];
    expect(items[0].vatNumber).toBe('123456789');
  });

  it('reports the row and reason for a row missing a name, alongside the valid row', async () => {
    const result = await handler({
      arguments: {
        suppliers: JSON.stringify([
          { name: 'Valid Supplier' },
          { name: '' },
        ]),
      },
      identity: { sub: 'owner-1' },
    });

    expect(result.reason).toBe('SUCCESS_WITH_SKIPS');
    expect(result.rowErrors).toEqual([
      { row: 3, message: expect.stringContaining('name') },
    ]);
  });

  it('reports a duplicate row against an existing supplier', async () => {
    fetchExistingSuppliersByOwner.mockResolvedValue(new Set(['existing supplier']));

    const result = await handler({
      arguments: { suppliers: JSON.stringify([{ name: 'Existing Supplier' }]) },
      identity: { sub: 'owner-1' },
    });

    expect(result.reason).toBe('ALL_DUPLICATES');
    expect(result.rowErrors).toEqual([
      { row: 2, message: expect.stringContaining('Duplicate') },
    ]);
  });

  // Bug flagged by nonokomoto on PR #209: ImportSupplierModal splits files
  // over 500 rows into chunks and calls this handler once per chunk. Without
  // an offset, chunk 2+ numbers its rows as if it were the whole file, so a
  // 1200-row file shows three overlapping "row 2 to 501" ranges.
  it('offsets rowErrors by rowOffset so a later chunk reports the real file row', async () => {
    const result = await handler({
      arguments: {
        suppliers: JSON.stringify([{ name: '' }]),
        rowOffset: 500,
      },
      identity: { sub: 'owner-1' },
    });

    // Row 1 within this chunk (i=0) + header row (+2) + the 500 rows already
    // processed in the previous chunk = row 502 in the original file.
    expect(result.rowErrors).toEqual([
      { row: 502, message: expect.stringContaining('name') },
    ]);
  });

  it('defaults rowOffset to 0 when not provided (single-chunk imports unaffected)', async () => {
    const result = await handler({
      arguments: { suppliers: JSON.stringify([{ name: '' }]) },
      identity: { sub: 'owner-1' },
    });

    expect(result.rowErrors).toEqual([
      { row: 2, message: expect.stringContaining('name') },
    ]);
  });
});
