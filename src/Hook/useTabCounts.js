import { useMemo } from 'react';
import { useListEventSuppliersByEventEnhancedQuery } from '../Api/services/eventSupplierApi';
import { useListEventCollaboratorsQuery } from '../Api/services/collaboratorApi';
import { useListScheduleEntriesByEventQuery } from '../Api/services/scheduleApi';
import { parseIsoDate } from '../Utils/eventDateConversion';

const countTodayOrFutureScheduleEntries = (items = []) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return items.filter((entry) => {
    const entryDate = parseIsoDate(entry?.date);
    return entryDate && entryDate >= today;
  }).length;
};

/**
 * Hook that provides item counts and pending status for EventDetails tabs.
 * Uses RTK Query for suppliers/team/schedule (shared cache with child components).
 *
 * @param {string} eventId
 * @param {object} options - { showSuppliersTab, showTeamTab, showScheduleTab }
 * @returns {{ suppliers, team, schedule }}
 */
export function useTabCounts(eventId, { showSuppliersTab = false, showTeamTab = false, showScheduleTab = false } = {}) {
  // Suppliers — RTK Query shares cache with EventSupplierList
  const { data: suppliersResponse } = useListEventSuppliersByEventEnhancedQuery(
    { eventId },
    { skip: !eventId || !showSuppliersTab }
  );

  const suppliersData = useMemo(() => {
    const items = suppliersResponse?.items ?? [];
    return {
      count: items.length,
      pendingCount: items.filter(s => s.status === 'PENDING').length,
    };
  }, [suppliersResponse]);

  // Team — RTK Query shares cache with TeamManagement
  const { data: collaborators = [] } = useListEventCollaboratorsQuery(
    { eventId },
    { skip: !eventId || !showTeamTab }
  );

  const teamData = useMemo(() => ({
    count: collaborators.length,
    pendingCount: collaborators.filter(c => c.status === 'PENDING').length,
  }), [collaborators]);

  // Schedule — RTK Query shares cache with EventSchedule
  const { data: scheduleResponse } = useListScheduleEntriesByEventQuery(
    { eventId },
    { skip: !eventId || !showScheduleTab }
  );
  const scheduleCount = useMemo(
    () => countTodayOrFutureScheduleEntries(scheduleResponse?.items),
    [scheduleResponse?.items]
  );

  return {
    suppliers: suppliersData,
    team: teamData,
    schedule: { count: scheduleCount },
  };
}
