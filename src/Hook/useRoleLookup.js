import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useListEventRolesQuery } from '../Api/services/roleApi';
import { selectSelectedEventId } from '../Api/eventSelectors';

/**
 * Hook that provides roleId → roleName / highlight color lookups.
 * Accepts an optional explicit eventId; defaults to the globally selected event.
 */
export const useRoleLookup = (eventId) => {
  const selectedEventId = useSelector(selectSelectedEventId);
  const effectiveEventId = eventId || selectedEventId;

  const { data: roles, isLoading } = useListEventRolesQuery(
    { eventId: effectiveEventId },
    { skip: !effectiveEventId }
  );

  const roleMap = useMemo(() => {
    if (!roles) return {};
    return roles.reduce((map, role) => {
      map[role.id] = role.name;
      return map;
    }, {});
  }, [roles]);

  const roleColorMap = useMemo(() => {
    if (!roles) return {};
    return roles.reduce((map, role) => {
      if (role.color) map[role.id] = role.color;
      return map;
    }, {});
  }, [roles]);

  const getRoleName = (roleId, fallback = null) =>
    roleId ? (roleMap[roleId] || fallback) : fallback;

  // Highlight color key chosen for the role (Role.color); null = automatic.
  const getRoleColor = (roleId) => (roleId ? roleColorMap[roleId] || null : null);

  // `roles` comes from the same cache entry as roleMap, so consumers that need the
  // ordered list (filters, per-role counters) pay no extra request.
  return { roles: roles || [], roleMap, getRoleName, getRoleColor, isLoading };
};
