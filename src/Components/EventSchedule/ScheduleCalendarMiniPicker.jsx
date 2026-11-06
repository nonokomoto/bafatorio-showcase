import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DayPicker } from 'react-day-picker';
import { pt, enUS, fr } from 'react-day-picker/locale';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../../Hook/useIsMobile';
import { useClickOutside } from '../../Hook/useClickOutside';
import 'react-day-picker/style.css';
import '../Event/EventDatePicker.css';

// Wrapped versions of date-fns locales (NOT the same object); reusing a wrong
// locale here breaks DayPicker silently.
const RDP_LOCALES = { 'pt-PT': pt, 'en-US': enUS, 'fr-FR': fr };

const PICKER_WIDTH = 320;
const GAP = 6;

function computePosition(anchor, height) {
  let left = anchor.x + anchor.width / 2 - PICKER_WIDTH / 2;
  if (left + PICKER_WIDTH > window.innerWidth - GAP) {
    left = window.innerWidth - PICKER_WIDTH - GAP;
  }
  left = Math.max(GAP, left);

  let top = anchor.y + anchor.height + GAP;
  if (top + height > window.innerHeight - GAP) {
    top = anchor.y - height - GAP;
  }
  return { top, left };
}

const ScheduleCalendarMiniPicker = memo(({ anchor, currentDate, onSelect, onClose }) => {
  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  const locale = RDP_LOCALES[i18n.language] ?? pt;

  useLayoutEffect(() => {
    if (isMobile || !ref.current || !anchor) return;
    setPosition(computePosition(anchor, ref.current.offsetHeight));
  }, [anchor, isMobile]);

  useClickOutside(ref, onClose);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);

    if (!isMobile) {
      const onScroll = () => onClose();
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

  const handleSelect = (date) => {
    if (!date) return;
    onSelect(date);
  };

  const picker = (
    <div className="event-date-picker">
      <DayPicker
        mode="single"
        locale={locale}
        defaultMonth={currentDate}
        selected={currentDate}
        onSelect={handleSelect}
        showOutsideDays
      />
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div
          ref={ref}
          className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-2xl border border-border animate-modal-slide-up overflow-hidden flex flex-col items-center pb-4"
          role="dialog"
        >
          <div className="flex justify-center pt-3 pb-1 self-stretch" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          {picker}
        </div>
      </>
    );
  }

  if (!anchor) return null;

  return (
    <div
      ref={ref}
      style={{
        width: PICKER_WIDTH,
        top: position ? position.top : -9999,
        left: position ? position.left : -9999,
      }}
      className="fixed z-50 bg-card rounded-xl shadow-2xl border border-border animate-modal-fade overflow-hidden p-2"
      role="dialog"
    >
      {picker}
    </div>
  );
});

ScheduleCalendarMiniPicker.displayName = 'ScheduleCalendarMiniPicker';

ScheduleCalendarMiniPicker.propTypes = {
  anchor: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }),
  currentDate: PropTypes.instanceOf(Date).isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ScheduleCalendarMiniPicker;
