import { normalizeUserId } from './resolveEventAccess';

// Per ADR-030 — schedule edit/delete permission split.
//
// `assertCanEditEntry` and `assertCanDeleteEntry` are second-stage gates that
// run after `resolveEventAccess()` has confirmed the caller holds the relevant
// matrix permission (SCHEDULE_EDIT / SCHEDULE_DELETE). They encode ownership
// rules that the matrix alone cannot express.

export interface CanViewInput {
  role: string;
  entryOwnerUserId: string;
  currentUserId: string;
  canViewTeamSchedule: boolean;
}

export interface AssertEditInput {
  role: string;
  entryOwnerUserId: string;
  currentUserId: string;
}

export interface AssertDeleteInput {
  role: string;
  entryOwnerUserId: string;
  eventOwnerUserId: string;
  currentUserId: string;
}

const ACCESS_DENIED_EDIT =
  'Access denied: insufficient permissions to edit this schedule entry';
const ACCESS_DENIED_DELETE =
  'Access denied: insufficient permissions to delete this schedule entry';

// Per ADR-029 (revisão 2026-07-16) — schedule view visibility.
//
// View gate that runs after `resolveEventAccess()` confirmed SCHEDULE_VIEW.
// Co-located with the edit/delete gates on purpose: the STAFF_LOGISTICS
// ownership rule and the `canViewTeamSchedule` grant must not drift apart from
// what that same staff may edit/delete.
export function canViewEntry({
  role,
  entryOwnerUserId,
  currentUserId,
  canViewTeamSchedule,
}: CanViewInput): boolean {
  if (role === 'OWNER' || role === 'CO_MANAGER') return true;

  if (role === 'STAFF_LOGISTICS') {
    if (canViewTeamSchedule) return true;
    // Fail-closed: empty IDs would compare equal and silently allow.
    if (!entryOwnerUserId || !currentUserId) return false;
    return normalizeUserId(entryOwnerUserId) === normalizeUserId(currentUserId);
  }

  return false;
}

export function assertCanEditEntry({
  role,
  entryOwnerUserId,
  currentUserId,
}: AssertEditInput): void {
  if (role === 'OWNER' || role === 'CO_MANAGER') return;

  if (role === 'STAFF_LOGISTICS') {
    // Fail-closed: empty IDs would compare equal and silently allow.
    if (!entryOwnerUserId || !currentUserId) throw new Error(ACCESS_DENIED_EDIT);
    if (normalizeUserId(entryOwnerUserId) === normalizeUserId(currentUserId)) {
      return;
    }
    throw new Error(ACCESS_DENIED_EDIT);
  }

  throw new Error(ACCESS_DENIED_EDIT);
}

export function assertCanDeleteEntry({
  role,
  entryOwnerUserId,
  eventOwnerUserId,
  currentUserId,
}: AssertDeleteInput): void {
  if (role === 'OWNER') return;

  if (role === 'CO_MANAGER') {
    // Fail-closed: empty IDs would compare unequal and silently allow.
    if (!entryOwnerUserId || !eventOwnerUserId) throw new Error(ACCESS_DENIED_DELETE);
    // Protect entries authored by the event OWNER from collaborator deletion.
    if (normalizeUserId(entryOwnerUserId) !== normalizeUserId(eventOwnerUserId)) {
      return;
    }
    throw new Error(ACCESS_DENIED_DELETE);
  }

  if (role === 'STAFF_LOGISTICS') {
    // Fail-closed: empty IDs would compare equal and silently allow.
    if (!entryOwnerUserId || !currentUserId) throw new Error(ACCESS_DENIED_DELETE);
    // Own entries only.
    if (normalizeUserId(entryOwnerUserId) === normalizeUserId(currentUserId)) {
      return;
    }
    throw new Error(ACCESS_DENIED_DELETE);
  }

  throw new Error(ACCESS_DENIED_DELETE);
}
