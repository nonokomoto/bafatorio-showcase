import { isValidScheduleColor } from './scheduleColors';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Throws unless date is a well-formed ISO calendar date.
// Until the schedule opened to any day, the event-window check was the only
// thing rejecting malformed input — nothing else parses this field before it
// reaches DynamoDB.
export function validateDateFormat(date: string): void {
  if (!ISO_DATE.test(date) || !isRealCalendarDate(date)) {
    throw new Error(`Invalid date: ${date} (expected YYYY-MM-DD)`);
  }
}

// Throws unless color is one of the curated palette entries. Arbitrary hex is
// refused on purpose: the palette is a shared constant, and validating against
// it keeps the door open to rename or regroup colours without migrating rows.
// Absent is valid — it means "default", resolved once at render so that legacy
// entries (written before this field existed) take the same path as new ones.
export function validateScheduleColor(color: string | null | undefined): void {
  if (color === undefined || color === null || color === '') return;
  if (!isValidScheduleColor(color)) {
    throw new Error(`Invalid color: ${color} (not in the schedule palette)`);
  }
}

// Date.UTC normalizes overflow (Feb 30 → Mar 2), so round-tripping back to a
// string is what catches days that never existed.
function isRealCalendarDate(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d
  );
}
