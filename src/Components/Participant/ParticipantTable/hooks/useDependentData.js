import { useMemo } from 'react';
import { useSelector } from 'react-redux';
// Use enhanced queries with relational data
import { useListDependentsByEventEnhancedQuery } from '../../../../Api/services/dependentsApi';
// REMOVED: import { selectParticipantsForEvent } from '../../../../Api/services/participantSelectors';

/**
 * Fetches dependent data for participants of the currently selected event.
 * Uses enhanced query with nested relations: Event -> Participants -> Dependents (1 query!)
 */
export const useDependentData = () => {
  const selectedEventId = useSelector(state => state.event.selectedEventId);

  // Single query fetches event with all participants and their dependents
  const {
    data: dependentsData,
    isLoading,
    error
  } = useListDependentsByEventEnhancedQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  // Dependents are already filtered by the query
  const dependents = useMemo(() => {
    return dependentsData?.items || [];
  }, [dependentsData?.items]);

  return {
    dependents,
    isLoading,
    error,
  };
};