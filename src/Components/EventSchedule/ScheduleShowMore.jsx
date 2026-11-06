import { memo, useContext } from 'react';
import PropTypes from 'prop-types';
import { ShowMoreCtx } from './scheduleCalendarContexts';

// Custom renderer for rbc's "+ N mais" indicator.
// rbc invokes `components.showMore` with { localizer, slotDate, slot, count,
// events, remainingEvents, onClick } and the localised label as children.
// We swallow the default onClick so rbc's popup/drill-down/onShowMore chain
// never fires; instead we forward the slotDate + DOM rect to our own day
// sheet handler via context.
const ScheduleShowMore = memo(({ slotDate, count, children }) => {
  const open = useContext(ShowMoreCtx);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    open({
      date: slotDate,
      anchor: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
    });
  };

  return (
    <button
      type="button"
      className="rbc-show-more"
      onClick={handleClick}
    >
      {children ?? `+ ${count}`}
    </button>
  );
});

ScheduleShowMore.displayName = 'ScheduleShowMore';

ScheduleShowMore.propTypes = {
  slotDate: PropTypes.instanceOf(Date).isRequired,
  count: PropTypes.number.isRequired,
  children: PropTypes.node,
};

export default ScheduleShowMore;
