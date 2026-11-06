import { createSelector } from '@reduxjs/toolkit';

// Selector for selected participant IDs
export const selectSelectedParticipantIds = state => state.event.selectedParticipantIds;

// Selector to count selected participants
export const selectSelectedParticipantsCount = createSelector(
  selectSelectedParticipantIds,
  (selectedIds) => selectedIds.length
);

// Selector to check if a specific participant is selected
export const selectIsParticipantSelected = createSelector(
  [selectSelectedParticipantIds, (_, participantId) => participantId],
  (selectedIds, participantId) => selectedIds.includes(participantId)
);