import { useSelector, useDispatch } from 'react-redux';
import { useMemo, useCallback } from 'react';
import { 
  selectSelectedEventId,
} from '../../../../Api/eventSelectors';
import {
  useListParticipantsByEventLambdaQuery,
} from '../../../../Api/services/participantApi';
import { participantApi } from '../../../../Api/services/participantApi';

export const useParticipantData = () => {
  const dispatch = useDispatch();
  // Event selectors from Redux store (Kept for context)
  const selectedEventId = useSelector(selectSelectedEventId);

  // Participants data query - Uses Lambda for collaborator-aware access
  const {
    data: participantsData,
    isLoading: isParticipantsLoading,
    isFetching: isParticipantsFetching,
    error: participantsError,

  } = useListParticipantsByEventLambdaQuery(
    { eventId: selectedEventId },
    {
      // Skip only if no event ID is selected
      skip: !selectedEventId,
      refetchOnMountOrArgChange: true, // Keep caching optimizations
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  // Log any errors from the query
  if (participantsError) {
    console.error('useParticipantData - Query error:', participantsError);
  }

  // Derive participantsByEvent directly from API data
  const participantsByEvent = useMemo(() => {
    // Use data directly from the RTK Query result
    return participantsData?.items || [];
  }, [participantsData?.items]); // Dependency is only the API data

  // Count for the current event's participants
  const participantsByEventCount = participantsByEvent.length;

  // Loading and error states directly from the query hook
  const isLoading = isParticipantsLoading;
  const error = participantsError;

  // Extrair todos os dependentes (Lambda returns dependents as flat array, not .items)
  const allDependents = useMemo(() => {
    return participantsByEvent.reduce((acc, participant) => {
      const deps = participant.dependents || [];
      if (deps.length > 0) {
        acc.push(...deps);
      }
      return acc;
    }, []);
  }, [participantsByEvent]);

  // Organizar dependentes por participante (Lambda returns dependents as flat array)
  const dependentsByParticipant = useMemo(() => {
    return participantsByEvent.reduce((acc, participant) => {
      const deps = participant.dependents || [];
      if (deps.length > 0) {
        acc[participant.id] = deps;
      }
      return acc;
    }, {});
  }, [participantsByEvent]);

  // Calcular total de dependentes usando o dependentsCount dos participantes
  const totalDependents = useMemo(() => {
    return participantsByEvent.reduce((total, participant) => {
      return total + (participant.dependentsCount || 0);
    }, 0);
  }, [participantsByEvent]);


  // Custom refetch function using invalidateTags for better cache management
  const refetch = useCallback(async () => {
    try {
      if (selectedEventId) {
        // Invalidate tags to trigger refetch through RTK Query cache
        dispatch(
          participantApi.util.invalidateTags([
            { type: 'Participant', id: `LIST_${selectedEventId}` }
          ])
        );
      }
    } catch (error) {
      console.error('Error refetching participants:', error);
    }
  }, [dispatch, selectedEventId]);

  // Return data derived from query and minimal selectors
  return {
    selectedEventId,      // Keep
    participantsByEventCount, // Count for current event
    participantsByEvent,  // Data from RTK Query
    totalDependents,      // Derived from participantsByEvent
    isLoading,            // From RTK Query
    isFetching: isParticipantsFetching, // Background refetch indicator
    error,                // From RTK Query
    refetch,              // Custom refetch
    allDependents,        // Derived from participantsByEvent
    dependentsByParticipant, // Derived from participantsByEvent
  };
};