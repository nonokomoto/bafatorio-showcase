import { memo, useCallback, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Button } from '../UI';
import { useIsMobile } from '../../Hook/useIsMobile';
import ScheduleCalendarMiniPicker from './ScheduleCalendarMiniPicker';
import ScheduleAuthorFilter from './ScheduleAuthorFilter';
import { AuthorFilterCtx } from './scheduleCalendarContexts';

// react-big-calendar `components.toolbar` contract:
//   onNavigate('PREV' | 'NEXT' | 'TODAY' | 'DATE', targetDate?)
//   onView(viewKey)  — viewKey is one of `views`
//   `label` arrives pre-formatted by the localizer; do not reformat.

function ChevronButton({ direction, onClick, ariaLabel }) {
  const Icon = direction === 'prev' ? FiChevronLeft : FiChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

ChevronButton.propTypes = {
  direction: PropTypes.oneOf(['prev', 'next']).isRequired,
  onClick: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

const ScheduleCalendarToolbar = memo(({ label, date, view, views, onView, onNavigate }) => {
  const { t } = useTranslation('schedule');
  const isMobile = useIsMobile();
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const pickerOpen = pickerAnchor !== null;
  // Via context, não props: o rbc instancia a toolbar e só passa o contrato dele.
  const authorFilter = useContext(AuthorFilterCtx);

  const goPrev = useCallback(() => onNavigate('PREV'), [onNavigate]);
  const goNext = useCallback(() => onNavigate('NEXT'), [onNavigate]);
  const goToday = useCallback(() => onNavigate('TODAY'), [onNavigate]);

  const openPicker = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
  }, []);
  const closePicker = useCallback(() => setPickerAnchor(null), []);
  const handlePickDate = useCallback((targetDate) => {
    onNavigate('DATE', targetDate);
    setPickerAnchor(null);
  }, [onNavigate]);

  const labelClasses = 'capitalize tabular-nums rounded-md hover:bg-accent transition-colors cursor-pointer';

  const picker = pickerOpen && (
    <ScheduleCalendarMiniPicker
      anchor={pickerAnchor}
      currentDate={date}
      onSelect={handlePickDate}
      onClose={closePicker}
    />
  );

  const authorRow = authorFilter && (
    <ScheduleAuthorFilter
      authors={authorFilter.authors}
      hiddenAuthorIds={authorFilter.hiddenAuthorIds}
      onToggleAuthor={authorFilter.onToggleAuthor}
    />
  );

  if (isMobile) {
    return (
      <div className="py-2">
        <div className="flex items-center justify-center gap-1">
          <ChevronButton direction="prev" onClick={goPrev} ariaLabel={t('calendar.previous')} />
          <button
            type="button"
            onClick={openPicker}
            aria-label={t('calendar.openPicker')}
            aria-haspopup="dialog"
            className={`font-semibold text-foreground text-sm px-2 py-1 min-w-[140px] text-center ${labelClasses}`}
          >
            {label}
          </button>
          <ChevronButton direction="next" onClick={goNext} ariaLabel={t('calendar.next')} />
          {picker}
        </div>
        {authorRow && <div className="flex justify-center mt-1.5">{authorRow}</div>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 mb-1">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToday}>
          {t('calendar.today')}
        </Button>
        <div className="flex items-center">
          <ChevronButton direction="prev" onClick={goPrev} ariaLabel={t('calendar.previous')} />
          <ChevronButton direction="next" onClick={goNext} ariaLabel={t('calendar.next')} />
        </div>
        <button
          type="button"
          onClick={openPicker}
          aria-label={t('calendar.openPicker')}
          aria-haspopup="dialog"
          className={`font-semibold text-foreground text-base ml-1 px-2 py-1 ${labelClasses}`}
        >
          {label}
        </button>
        {/* Fila de autores no grupo da navegação, depois do mês — é onde o
            olho já está quando se orienta no calendário. Solta no meio do
            justify-between ficava a flutuar sem pertencer a nada. */}
        {authorRow && <div className="ml-2">{authorRow}</div>}
      </div>

      {views.length > 1 && (
        <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg" role="tablist">
          {views.map((v) => {
            const isActive = view === v;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onView(v)}
                className={[
                  'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {t(`calendar.${v}`)}
              </button>
            );
          })}
        </div>
      )}
      {picker}
    </div>
  );
});

ScheduleCalendarToolbar.displayName = 'ScheduleCalendarToolbar';

ScheduleCalendarToolbar.propTypes = {
  label: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  view: PropTypes.string.isRequired,
  views: PropTypes.arrayOf(PropTypes.string).isRequired,
  onView: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

export default ScheduleCalendarToolbar;
