// eventControlsSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState= {
    filter: 'all',
    sortCriterion: '',
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 8
}

const eventControls = createSlice({
    name: 'eventControls',
    initialState,
    reducers: {
        setFilter(state, action) {
            state.filter = action.payload;
            state.currentPage = 1; // Reset to first page when filter changes
        },
        setSortCriterion(state, action) {
            state.sortCriterion = action.payload;

        },
        setSearchQuery(state, action) {
            state.searchQuery = action.payload;
            state.currentPage = 1;
        },
        setCurrentPage(state, action) {
            state.currentPage = action.payload;
        },
        setItemsPerPage(state, action) {
            state.itemsPerPage = action.payload;
            state.currentPage = 1;
        },
    },
});

export const {
    setFilter,
    setSortCriterion,
    setSearchQuery,
    setCurrentPage,
    setItemsPerPage,
} = eventControls.actions;

export default eventControls.reducer;




