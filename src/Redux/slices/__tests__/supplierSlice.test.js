// Unmock @reduxjs/toolkit so createSlice produces a real reducer.
// The global mock in setupTests.js replaces createSlice with jest.fn(),
// which returns a mock reducer that doesn't handle state transitions.
jest.unmock('@reduxjs/toolkit');

// Mock supplierApi with the minimal interface needed by supplierSlice's lazy require.
// The mock provides endpoints.listSuppliers.select() that reads from RTK Query cache state.
jest.mock('../../../Api/services/supplierApi', () => ({
    supplierApi: {
        reducerPath: 'supplierApi',
        endpoints: {
            listSuppliers: {
                select: () => (state) => {
                    const queries = state?.supplierApi?.queries || {};
                    return queries['listSuppliers(undefined)'] || { status: 'uninitialized' };
                },
            },
        },
    },
}));

// Use require() after jest.mock/unmock declarations (which are hoisted by Babel).
const supplierSliceModule = require('../../Suppliers/supplierSlice');
const supplierReducer = supplierSliceModule.default;
const { setSelectedSupplier, selectAllSuppliers, selectSupplierById,
    selectSelectedSupplier, selectSuppliersLoading, selectSupplierError } = supplierSliceModule;

// Phase 3 (ADR-016): Tests updated for simplified slice.
// Data now lives in RTK Query cache. Selectors derive from
// supplierApi.endpoints.listSuppliers.select() via lazy require.

const initialState = {
    selectedSupplierId: null,
};

// Helper: create mock Redux state with RTK Query cache for suppliers.
const createMockStateWithSuppliers = (suppliers = [], selectedSupplierId = null) => ({
    supplier: { selectedSupplierId },
    supplierApi: {
        queries: {
            'listSuppliers(undefined)': {
                status: 'fulfilled',
                data: { items: suppliers },
            },
        },
    },
});

const createMockStateEmpty = (selectedSupplierId = null) => ({
    supplier: { selectedSupplierId },
    supplierApi: {
        queries: {},
    },
});

describe('supplierSlice', () => {

    // Test Reducers
    it('should handle initial state', () => {
        expect(supplierReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle setSelectedSupplier', () => {
        const supplierId = 'sup123';
        const actual = supplierReducer(initialState, setSelectedSupplier(supplierId));
        expect(actual.selectedSupplierId).toEqual(supplierId);
    });

    it('should handle clearing selected supplier', () => {
        const state = { selectedSupplierId: 'sup123' };
        const actual = supplierReducer(state, setSelectedSupplier(null));
        expect(actual.selectedSupplierId).toBeNull();
    });

    // Test Selectors (derived from RTK Query cache)
    describe('selectors', () => {
        const mockSuppliers = [
            { id: 's1', name: 'Supplier 1' },
            { id: 's2', name: 'Supplier 2' },
        ];

        const mockState = createMockStateWithSuppliers(mockSuppliers, 's1');

        it('selectAllSuppliers should return all suppliers from RTK Query cache', () => {
            expect(selectAllSuppliers(mockState)).toEqual(mockSuppliers);
        });

        it('selectAllSuppliers should return empty array when cache is empty', () => {
            const emptyState = createMockStateEmpty();
            expect(selectAllSuppliers(emptyState)).toEqual([]);
        });

        it('selectSupplierById should return the correct supplier', () => {
            expect(selectSupplierById(mockState, 's2')).toEqual({ id: 's2', name: 'Supplier 2' });
            expect(selectSupplierById(mockState, 's3')).toBeUndefined();
        });

        it('selectSupplierById should return undefined when cache is empty', () => {
            const emptyState = createMockStateEmpty();
            expect(selectSupplierById(emptyState, 's1')).toBeUndefined();
        });

        it('selectSelectedSupplier should return the selected supplier', () => {
            expect(selectSelectedSupplier(mockState)).toEqual({ id: 's1', name: 'Supplier 1' });
        });

        it('selectSelectedSupplier should return null when none selected', () => {
            const stateNoSelection = createMockStateWithSuppliers(mockSuppliers, null);
            expect(selectSelectedSupplier(stateNoSelection)).toBeNull();
        });

        it('selectSuppliersLoading should return false when data is loaded', () => {
            expect(selectSuppliersLoading(mockState)).toBe(false);
        });

        it('selectSuppliersLoading should return false when cache is uninitialized', () => {
            const emptyState = createMockStateEmpty();
            expect(selectSuppliersLoading(emptyState)).toBe(false);
        });

        it('selectSupplierError should return null when no error', () => {
            expect(selectSupplierError(mockState)).toBeNull();
        });
    });
});
