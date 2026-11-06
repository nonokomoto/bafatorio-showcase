import { createSelector } from '@reduxjs/toolkit';
import { dependentApi } from './dependentsApi'; // Import the API slice

// Base selector for the listDependentsByParticipantIds query result
// Takes state and the participantIds argument used for the query
export const selectListDependentsResult = (state, participantIds) =>
  dependentApi.endpoints.listDependentsByParticipantIds.select({ participantIds })(state);

// Selector to get the actual dependents array from the query result
export const selectDependentsForParticipants = createSelector(
  [selectListDependentsResult],
  (queryResult) => queryResult?.data ?? [] // Return data or empty array
);

// Selector to get dependents grouped by participant ID from the cached query result
export const selectDependentsByParticipantFromCache = createSelector(
  [selectDependentsForParticipants],
  (dependents) => {
    const grouped = {};
    dependents.forEach(dep => {
      // Ensure participantId exists before grouping
      if (dep?.participantId) {
        if (!grouped[dep.participantId]) {
          grouped[dep.participantId] = [];
        }
        grouped[dep.participantId].push(dep);
      }
    });
    return grouped;
  }
);

// Helper function (not a selector) to count dependents by participant from a given list
// This can be used within components after getting the dependents list.
export const countDependentsByParticipant = (dependentsList) => {
  if (!dependentsList || !Array.isArray(dependentsList)) return {}; // Add check for array
  const counts = {};
  dependentsList.forEach(dependent => {
    if (dependent?.participantId) { // Add safety check for dependent and participantId
      counts[dependent.participantId] = (counts[dependent.participantId] || 0) + 1;
    }
  });
  return counts;
};

// Keep selection state selectors if selection is still managed in eventSlice
// Ensure this part of the state ('event.selectedDependentIds') still exists if you keep this selector
export const selectSelectedDependentIds = state => state.event?.selectedDependentIds ?? []; // Add safety check

// NOTE: All old selectors based on eventSlice.dependents are intentionally removed.
// Any component using those removed selectors must be updated.

// If you need to select a single dependent's details, use the getDependent query hook directly in the component:
// Example: const { data: dependentDetails } = useGetDependentQuery(dependentId);