import { SUPPLIER_TEMPLATE_COLUMNS, EVENT_SUPPLIER_TEMPLATE_COLUMNS } from './exportSuppliers';

// Regression: ExcelJS types a cell from the JS type of the value written into
// it. A numeric-looking example given as a string (e.g. '500') writes a TEXT
// cell, which the legacy upload-supplier Lambda then rejects as
// "Must be a number" — so anyone who imports the template unmodified gets a
// validation error on its own example row. These fields must stay JS numbers.
const NUMERIC_FIELDS = new Set(['estimateMinAmount', 'estimateMaxAmount', 'quoteAmount']);

describe('supplier import template column definitions', () => {
  it.each([
    ['SUPPLIER_TEMPLATE_COLUMNS', SUPPLIER_TEMPLATE_COLUMNS],
    ['EVENT_SUPPLIER_TEMPLATE_COLUMNS', EVENT_SUPPLIER_TEMPLATE_COLUMNS],
  ])('%s: numeric fields have a numeric (not string) example value', (_label, columns) => {
    columns
      .filter((col) => NUMERIC_FIELDS.has(col.key))
      .forEach((col) => {
        expect(typeof col.example).toBe('number');
      });
  });

  it('every column has a non-empty key and i18n path', () => {
    [...SUPPLIER_TEMPLATE_COLUMNS, ...EVENT_SUPPLIER_TEMPLATE_COLUMNS].forEach((col) => {
      expect(col.key).toEqual(expect.any(String));
      expect(col.key.length).toBeGreaterThan(0);
      expect(col.i18n).toEqual(expect.any(String));
      expect(col.i18n.length).toBeGreaterThan(0);
    });
  });
});
