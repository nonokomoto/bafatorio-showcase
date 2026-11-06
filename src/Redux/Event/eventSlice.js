// ==================== IMPORTS ====================
// Import necessary functions and APIs
import { createSlice } from '@reduxjs/toolkit';
import { eventApi } from '../../Api/services/eventApi';
import { participantApi } from '../../Api/services/participantApi';
// import { dependentApi } from '../../Api/services/dependentsApi'; // No longer needed for extraReducers here

// ==================== INITIAL STATE ====================
// Define the initial state for the event slice
const initialState = {
  selectedEventId: null,
  
  // Participant related state
  selectedParticipantIds: [],
  participantFilters: {
    status: null,
    role: null,
    searchTerm: '',
  },
  
  selectedDependentIds: [],
};

// ==================== SLICE DEFINITION ====================
// Create the event slice using createSlice
const eventSlice = createSlice({
  name: 'event',
  initialState,
  
  // ==================== REDUCERS ====================
  // Define basic reducers for synchronous state updates
  reducers: {
    setSelectedEventId: (state, action) => {
      state.selectedEventId = action.payload;
      state.selectedParticipantIds = []; // Reset participant selection
      state.selectedDependentIds = []; // Reset dependent selection
    },

    setSelectedParticipantIds: (state, action) => {
      state.selectedParticipantIds = action.payload;
    },

    clearSelectedParticipants: (state) => {
      state.selectedParticipantIds = [];
    },

    clearSelectedDependents: (state) => {
      state.selectedDependentIds = [];
    },
  },
  
  // ==================== EXTRA REDUCERS ====================
  // Handle asynchronous actions and API interactions
  extraReducers: (builder) => {
    builder
      // ==================== EVENT HANDLERS ====================
      // (Existing event handlers, adjusted if they relied on removed state)
      .addMatcher(
        eventApi.endpoints.createEvent.matchFulfilled,
        () => {
          // No change needed here for dependents
        }
      )
      .addMatcher(
        eventApi.endpoints.deleteEventCascade.matchFulfilled,
        (state, action) => {
          // O payload é o relatório do cascade (ADR-035); o eventId vem do argumento.
          const eventId = action.meta?.arg?.originalArgs;
          if (action.payload?.success && eventId) {
            // KEEP: Reset selectedEventId if it matches the deleted event
            if (state.selectedEventId === eventId) {
              state.selectedEventId = null;
              state.selectedParticipantIds = []; // Also clear selections
              state.selectedDependentIds = [];
            }
          }
        }
      )
      // ==================== PARTICIPANT HANDLERS ====================
      // (Existing participant handlers, adjusted if they relied on removed state)
      .addMatcher(
        participantApi.endpoints.uploadParticipants.matchFulfilled,
        () => {
          // REMOVED: Dependent loading/error state updates
        }
      )
      .addMatcher(
        participantApi.endpoints.uploadParticipants.matchRejected,
        () => {
           // REMOVED: Dependent loading/error state updates
        }
      )
      .addMatcher(
        participantApi.endpoints.deleteParticipants.matchFulfilled,
        () => {
           // REMOVED: Logic related to dependents state
        }
      )

      // REMOVED: All extraReducers related to dependentApi endpoints
      
      // REMOVED: Logic related to initialDataLoaded based on dependentApi
      ;
  },
});

// ==================== EXPORTS ====================
// Export actions and reducer
export const {
  setSelectedEventId,
  setSelectedParticipantIds,
  clearSelectedParticipants,
  clearSelectedDependents,
} = eventSlice.actions;
export default eventSlice.reducer;