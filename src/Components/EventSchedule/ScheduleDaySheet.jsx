import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { pt, enUS, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Text, Button } from '../UI';
import { FiClock, FiUser, FiX, FiPlus } from 'react-icons/fi';
import { formatTimeLabel } from './scheduleUtils';
import ScheduleAuthorAvatar from './ScheduleAuthorAvatar';
import { useIsMobile } from '../../Hook/useIsMobile';
import { useClickOutside } from '../../Hook/useClickOutside';

const LOCALE_MAP = { 'pt-PT': pt, 'en-US': enUS, 'fr-FR': fr };

const POPOVER_WIDTH = 340;
const GAP = 6;

function computePosition(anchor, height) {
  let left = anchor.x;
  if (left + POPOVER_WIDTH > window.innerWidth - GAP) {
    left = anchor.x + anchor.width - POPOVER_WIDTH;
  }
  left = Math.max(GAP, left);

  let top = anchor.y + anchor.height + GAP;
  if (top + height > window.innerHeight - GAP) {
    top = anchor.y - height - GAP;
  }
  if (top < GAP) top = GAP;
  return { top, left };
}

const ScheduleDaySheet = memo(({ date, events, anchor, canCreate = false, onClose, onSelectEntry, onAddEntry }) => {
  const { t, i18n } = useTranslation(['schedule', 'event']);
  const isMobile = useIsMobile();
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  const locale = LOCALE_MAP[i18n.language] ?? pt;

  const dayLabel = format(date, 'EEEE, d MMMM', { locale });
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const handleAdd = useCallback(() => onAddEntry?.(date), [onAddEntry, date]);
  const showAddButton = canCreate && typeof onAddEntry === 'function';

  // Desktop popover positioning: measure then place. Mobile skips this entirely.
  useLayoutEffect(() => {
    if (isMobile || !ref.current || !anchor) return;
    setPosition(computePosition(anchor, ref.current.offsetHeight));
  }, [anchor, isMobile, sorted.length]);

  useClickOutside(ref, isMobile ? () => {} : onClose);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    if (!isMobile) {
      const onScroll = (e) => {
        // Only close if the scroll happens OUTSIDE the sheet (e.g. on the window or main calendar).
        // If the target is a descendant of the sheet, ignore it.
        if (ref.current && !ref.current.contains(e.target)) {
          onClose();
        }
      };
      const onResize = () => onClose();
      document.addEventListener('scroll', onScroll, { capture: true });
      window.addEventListener('resize', onResize);
      return () => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onResize);
      };
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isMobile]);

  const header = (
    <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-border flex-shrink-0">
      <Text variant="subtitle1" weight="semibold" className="capitalize">{dayLabel}</Text>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={t('schedule:entryDetail.close')}
      >
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );

  const list = (
    <div className="overflow-y-auto flex-1 py-2 pb-1">
      {sorted.length === 0 ? (
        <Text variant="body2" className="text-muted-foreground text-center py-6">
          {t('schedule:daySheet.empty')}
        </Text>
      ) : (
        sorted.map((entry) => {
          const timeLabel = formatTimeLabel(entry, t);
          return (
            <button
              key={entry.id}
              type="button"
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
              onClick={() => onSelectEntry(entry)}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-primary-500"
                style={{ backgroundColor: entry.calendarColor }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Em mobile o day sheet é a única vista de lista — sem isto,
                      o "de quem é, num relance" só existia no desktop. */}
                  {entry.showAuthorAvatar && entry.authorId && (
                    <ScheduleAuthorAvatar
                      userId={entry.authorId}
                      name={entry.authorName}
                      className="w-5 h-5 text-[0.6rem]"
                    />
                  )}
                  <Text variant="body2" weight="medium" className="truncate">{entry.title}</Text>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                  <FiClock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  <Text variant="caption">{timeLabel}</Text>
                </div>
                {entry.supplierName && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                    <FiUser className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <Text variant="caption">{entry.supplierName}</Text>
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const addFooter = showAddButton && (
    <div className="flex-shrink-0 px-4 py-3 border-t border-border">
      <Button variant="primary" size="sm" fullWidth onClick={handleAdd}>
        <FiPlus className="w-4 h-4 mr-1.5" aria-hidden="true" />
        {t('event:fab.addScheduleEntry')}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div
          ref={ref}
          className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-2xl border border-border animate-modal-slide-up overflow-hidden max-h-[70vh] flex flex-col"
          role="dialog"
          aria-label={dayLabel}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          {header}
          {list}
          {addFooter}
        </div>
      </>
    );
  }

  if (!anchor) return null;

  return (
    <div
      ref={ref}
      style={{
        width: POPOVER_WIDTH,
        top: position ? position.top : -9999,
        left: position ? position.left : -9999,
        maxHeight: '70vh',
      }}
      className="fixed z-50 bg-card rounded-xl shadow-2xl border border-border animate-modal-fade overflow-hidden flex flex-col"
      role="dialog"
      aria-label={dayLabel}
    >
      {header}
      {list}
      {addFooter}
    </div>
  );
});

ScheduleDaySheet.displayName = 'ScheduleDaySheet';

ScheduleDaySheet.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      start: PropTypes.instanceOf(Date).isRequired,
      calendarColor: PropTypes.string,
      supplierName: PropTypes.string,
      authorId: PropTypes.string,
      authorName: PropTypes.string,
      showAuthorAvatar: PropTypes.bool,
    })
  ).isRequired,
  anchor: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }),
  canCreate: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSelectEntry: PropTypes.func.isRequired,
  onAddEntry: PropTypes.func,
};

export default ScheduleDaySheet;
