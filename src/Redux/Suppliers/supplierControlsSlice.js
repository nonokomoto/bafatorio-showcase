import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  searchQuery: '',
  filterCategory: 'all', // 'all' or specific category name
  sortCriterion: 'nameAsc', // e.g., 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'
  currentPage: 1,
  itemsPerPage: 50, // Or your preferred default
};

const supplierControlsSlice = createSlice({
  name: 'supplierControls',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1; // Reset page when searching
    },
    setFilterCategory: (state, action) => {
      state.filterCategory = action.payload;
      state.currentPage = 1; // Reset page when filtering
    },
    setSortCriterion: (state, action) => {
      state.sortCriterion = action.payload;
      // Resetting page on sort might be optional, depending on UX preference
      // state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    resetSupplierControls: () => initialState, // Action to reset all controls
  },
});

export const {
  setSearchQuery,
  setFilterCategory,
  setSortCriterion,
  setCurrentPage,
  resetSupplierControls,
} = supplierControlsSlice.actions;

export default supplierControlsSlice.reducer; 