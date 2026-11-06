/**
 * @file useEventsList.js
 * @description Hook for listing all events (owned + collaborated)
 * Combines events where user is owner with events where user is collaborator
 */

import { useMemo } from 'react';
import { useListEventsMinimalQuery } from '../Api/services/eventApi';
import { useListMyCollaboratedEventsQuery } from '../Api/services/collaboratorApi';

/**
 * Custom hook for listing all user's events
 * Merges owned events with collaborated events
 *
 * @returns {Object} Events list and loading state
 *
 * @example
 * const { allEvents, isLoading, error } = useEventsList();
 */
export const useEventsList = () => {
  // Query for owned events
  const {
    data: eventsData,
    isLoading: isOwnedLoading,
    error: ownedError,
  } = useListEventsMinimalQuery(undefined, {
    // participantCount/totalRegistrations são escritos pelo stream do DynamoDB
    // ~1,4s depois do upload responder. O refetch da invalidação chega antes e
    // cacha o valor pré-stream; sem refetch no mount ficava preso até F5.
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: false,
  });

  // Query for collaborated events
  const {
    data: collaboratedEventsData,
    isLoading: isCollaboratedLoading,
    error: collaboratedError,
  } = useListMyCollaboratedEventsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: false,
  });

  // Extract and merge events
  const allEvents = useMemo(() => {
    const ownedEvents = eventsData?.items || [];

    // Extract events from collaborated data
    const collaboratedEvents = (collaboratedEventsData || [])
      .filter(item => item.event !== null)
      .map(item => ({
        ...item.event,
        userRole: item.userRole,
      }));

    // Merge without duplicates (use Map to dedupe by event ID)
    const eventMap = new Map();

    ownedEvents.forEach(event => {
      eventMap.set(event.id, { ...event, userRole: 'OWNER' });
    });

    collaboratedEvents.forEach(event => {
      if (!eventMap.has(event.id)) {
        eventMap.set(event.id, event);
      }
    });

    return Array.from(eventMap.values());
  }, [eventsData?.items, collaboratedEventsData]);

  return {
    allEvents,
    ownedEvents: eventsData?.items || [],
    collaboratedEvents: collaboratedEventsData || [],
    isLoading: isOwnedLoading || isCollaboratedLoading,
    error: ownedError || collaboratedError,
  };
};

export default useEventsList;
