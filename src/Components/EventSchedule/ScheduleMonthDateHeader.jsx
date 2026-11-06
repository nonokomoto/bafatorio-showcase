import { memo, useContext } from 'react';
import PropTypes from 'prop-types';
import { isSameDay } from 'date-fns';
import { EventDayCtx } from './scheduleCalendarContexts';

// `components.month.dateHeader` replaces the date number cell in the month view.
// Renders:
//   - a circular brand-coloured pill on today (Google Calendar style)
//   - a weighted number on the event's own days (matches BG tint so the cue
//     lands on both layers — see ScheduleCalendar dayPropGetter)
//   - the default link affordance for every other day

const ScheduleMonthDateHeader = memo(({ label, date, drilldownView, onDrillDown }) => {
  const isToday = isSameDay(date, new Date());
  const isEventDay = useContext(EventDayCtx);
  const isOnEventDay = Boolean(isEventDay?.(date));
  const handleClick = drilldownView ? onDrillDown : undefined;

  if (isToday) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={isOnEventDay ? 'rbc-button-link font-semibold text-primary' : 'rbc-button-link'}
    >
      {label}
    </button>
  );
});

ScheduleMonthDateHeader.displayName = 'ScheduleMonthDateHeader';

ScheduleMonthDateHeader.propTypes = {
  label: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  drilldownView: PropTypes.string,
  onDrillDown: PropTypes.func,
};

export default ScheduleMonthDateHeader;
