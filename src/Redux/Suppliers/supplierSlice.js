import { createSlice, createSelector } from '@reduxjs/toolkit';
import { supplierApi } from '../../Api/services/supplierApi';

const initialState = {
  selectedSupplierId: null,
};

const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    setSelectedSupplier: (state, action) => {
      state.selectedSupplierId = action.payload;
    },
  },
});

export const { setSelectedSupplier } = supplierSlice.actions;

// ==================== SELECTORS ====================

const selectListSuppliersResult = supplierApi.endpoints.listSuppliers.select();

const EMPTY_ARRAY = [];

const selectSuppliersData = (state) => selectListSuppliersResult(state)?.data?.items;

export const selectAllSuppliers = createSelector(
  selectSuppliersData,
  (items) => items ?? EMPTY_ARRAY,
);

export const selectSupplierById = (state, supplierId) => {
  const items = selectAllSuppliers(state);
  return items.find(s => s.id === supplierId);
};

export const selectSuppliersLoading = (state) => {
  const result = selectListSuppliersResult(state);
  return result?.isLoading ?? false;
};

export const selectSelectedSupplier = createSelector(
  selectAllSuppliers,
  (state) => state.supplier.selectedSupplierId,
  (suppliers, selectedId) => {
    if (!selectedId) return null;
    return suppliers.find(s => s.id === selectedId) ?? null;
  },
);

export const selectSupplierError = (state) => {
  const result = selectListSuppliersResult(state);
  return result?.error ?? null;
};

export default supplierSlice.reducer;
