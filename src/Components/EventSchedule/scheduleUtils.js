import { format } from 'date-fns';

// Shared pure utilities for EventSchedule components.

// Formats the time label for a schedule entry.
// Returns the time range (e.g. "10:00 – 11:00"), or the allDay translation key value.
export function formatTimeLabel(entry, t) {
  const hasTime = entry.startTime || entry.endTime;
  return hasTime
    ? [entry.startTime, entry.endTime].filter(Boolean).join(' – ')
    : t('entryDetail.allDay');
}

// Returns a predicate (date: Date) => boolean, true when the date is one of the
// event's own days. Range events use eventStartDate..eventEndDate inclusive;
// specific events use eventSpecificDates. An event with no dates configured has
// no event days — the agenda still works, it just has nothing to highlight.
export function buildIsEventDay(event) {
  if (!event) return () => false;

  if (event.eventDateType === 'range') {
    const start = event.eventStartDate;
    const end = event.eventEndDate;
    if (!start || !end) return () => false;
    return (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return dateStr >= start && dateStr <= end;
    };
  }

  if (event.eventDateType === 'specific') {
    const dates = event.eventSpecificDates;
    if (!dates?.length) return () => false;
    const set = new Set(dates);
    return (date) => set.has(format(date, 'yyyy-MM-dd'));
  }

  return () => false;
}
