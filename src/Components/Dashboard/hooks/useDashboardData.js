import { useMemo } from 'react';
import { subYears, isAfter } from 'date-fns';
import { useEventsList } from '../../../Hook/useEventsList';
import { useListAllParticipantsQuery } from '../../../Api/services/participantApi';
import { useListAllDependentsQuery } from '../../../Api/services/dependentsApi';
import { getEventPrimaryDate } from '../../../Utils/eventDateConversion';

const calculateChange = (currentValue, previousValue) => {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
};

export const useDashboardData = () => {
  // Fetch all events (owned + collaborated) via EVENT_MINIMAL selection set
  const {
    allEvents: events,
    isLoading: isEventsLoading,
    error: eventsError
  } = useEventsList();

  // Fetch ALL participants (needed for DashboardInsights and DashboardChart)
  const {
    data: participantsData,
    isLoading: isParticipantsLoading,
    error: participantsError
  } = useListAllParticipantsQuery();

  // Fetch ALL dependents (needed for DashboardChart)
  const {
    data: dependentsData,
    isLoading: isDependentsLoading,
    error: dependentsError
  } = useListAllDependentsQuery();

  const error = eventsError || participantsError || dependentsError;
  const isLoading = isEventsLoading || isParticipantsLoading || isDependentsLoading;

  // Pre-compute header metrics from events data
  // Uses participantCount from events (maintained by DynamoDB Streams) for efficiency
  const headerMetrics = useMemo(() => {
    if (!events || !events.length) {
      return {
        totalEvents: 0,
        totalParticipants: 0,
        futureEvents: 0,
        doneEvents: 0,
        eventsChange: 0,
        participantsChange: 0,
        doneEventsChange: 0
      };
    }

    const now = new Date();
    const oneYearAgo = subYears(now, 1);
    const twoYearsAgo = subYears(now, 2);

    const validEvents = events.filter(e => getEventPrimaryDate(e));

    // Current period: last 12 months
    const currentYearEvents = validEvents.filter(e => {
      const d = getEventPrimaryDate(e);
      return d && isAfter(d, oneYearAgo);
    });

    // Previous period: 12-24 months ago (bounded window for fair YoY comparison)
    const previousYearEvents = validEvents.filter(e => {
      const d = getEventPrimaryDate(e);
      return d && isAfter(d, twoYearsAgo) && !isAfter(d, oneYearAgo);
    });

    const futureEvents = currentYearEvents.filter(e => {
      const d = getEventPrimaryDate(e);
      return d && isAfter(d, now);
    });

    const doneEvents = currentYearEvents.filter(e => e.eventStatus === 'COMPLETED');

    // Participant counts from event aggregates (maintained by DynamoDB Streams)
    const currentYearParticipants = currentYearEvents.reduce(
      (sum, e) => sum + (e.participantCount ?? 0), 0
    );
    const previousYearParticipants = previousYearEvents.reduce(
      (sum, e) => sum + (e.participantCount ?? 0), 0
    );

    const previousDoneEvents = previousYearEvents.filter(e => e.eventStatus === 'COMPLETED');

    return {
      totalEvents: validEvents.length,
      totalParticipants: validEvents.reduce((sum, e) => sum + (e.participantCount ?? 0), 0),
      futureEvents: futureEvents.length,
      doneEvents: doneEvents.length,
      eventsChange: calculateChange(currentYearEvents.length, previousYearEvents.length),
      participantsChange: calculateChange(currentYearParticipants, previousYearParticipants),
      doneEventsChange: calculateChange(doneEvents.length, previousDoneEvents.length)
    };
  }, [events]);

  const participants = participantsData?.items || [];
  const dependents = dependentsData?.items || [];

  return {
    headerMetrics,
    raw: {
      events: events || [],
      participants,
      dependents
    },
    isLoading,
    error: error ? { message: error.data?.message || error.message || 'Erro ao carregar dados do dashboard' } : null
  };
};
