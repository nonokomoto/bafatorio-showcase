/**
 * Sync test: the client-side "which column is Name?" check
 * (src/Components/Supplier/utils/supplierNameHeader.js, used by
 * ImportSupplierModal's fallback preview) and the server-side parser
 * (amplify/function/upload-supplier/handler.ts's HEADER_VARIANTS['Name'],
 * matched via amplify/function/shared/importUtils.ts's normalizeHeaderLabel)
 * must recognize the exact same header text, or the preview count and the
 * actual import silently disagree.
 *
 * They can't share one module — importUtils.ts pulls in the AWS SDK, which
 * doesn't belong in the frontend bundle — so this test asserts the two
 * independently-maintained normalizers agree instead. Same pattern as
 * plans.sync.test.ts / scheduleColors.sync.test.ts.
 */
import { normalizeHeaderLabel } from '../shared/importUtils';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — módulo JS do frontend, sem declarações; só comparamos valores
import * as frontend from '../../../src/Components/Supplier/utils/supplierNameHeader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HEADER_VARIANTS: { [key: string]: string[] };

beforeAll(() => {
  process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = 'supplier-table';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  HEADER_VARIANTS = require('./handler').HEADER_VARIANTS;
});

// A hand-edited header rarely stays as clean as the downloadable template's
// (see ImportSupplierModal.nameHeader.test.js for that baseline coverage) —
// these exercise the accent/period/whitespace normalization both sides claim.
const HEADER_VARIANTS_TO_CHECK = [
  'Nome do Fornecedor',
  '  Nome   do    Fornecedor  ',
  'Nome. do. Fornecedor.',
  'NOME DO FORNECEDOR',
  'Supplier Name',
  'Supplier  Name.',
  'nom du fournisseur',
  'Nome do Fornecedor.',
  'Nome  do Fornecedor',
];

describe('supplier Name header: frontend (supplierNameHeader.js) ≡ backend (importUtils.normalizeHeaderLabel)', () => {
  test.each(HEADER_VARIANTS_TO_CHECK)('normalizeHeaderText/normalizeHeaderLabel agree on %j', (header) => {
    expect(frontend.normalizeHeaderText(header)).toBe(normalizeHeaderLabel(header));
  });

  test.each(HEADER_VARIANTS_TO_CHECK)('Name-column recognition agrees for %j', (header) => {
    const backendRecognizes = HEADER_VARIANTS['Name'].includes(normalizeHeaderLabel(header));
    const frontendRecognizes = frontend.SUPPLIER_NAME_HEADERS.includes(frontend.normalizeHeaderText(header));
    expect(frontendRecognizes).toBe(backendRecognizes);
  });

  test('SUPPLIER_NAME_HEADERS is a subset of HEADER_VARIANTS[\'Name\'] (already-normalized entries)', () => {
    for (const header of frontend.SUPPLIER_NAME_HEADERS) {
      expect(HEADER_VARIANTS['Name']).toContain(header);
    }
  });
});
