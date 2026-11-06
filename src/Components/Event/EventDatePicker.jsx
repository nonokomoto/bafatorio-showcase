import { useId, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { pt, enUS, fr } from 'react-day-picker/locale';
import { differenceInCalendarDays, format, isSameDay, isSameMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { FiCalendar } from 'react-icons/fi';
import PropTypes from 'prop-types';
import 'react-day-picker/style.css';
import './EventDatePicker.css';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { useIsMobile } from '../../Hook/useIsMobile';

const RDP_LOCALES = {
  'pt-PT': pt,
  'en-US': enUS,
  'fr-FR': fr,
};

const formatDayMonth = (date, locale) => format(date, 'd MMM', { locale }).replace('.', '');
const formatFull = (date, locale) => format(date, 'd MMM yyyy', { locale }).replace('.', '');
const formatWeekdayShort = (date, locale) => format(date, 'EEE', { locale }).replace('.', '');

const summarize = (range, locale) => {
  if (!range?.from) return null;
  const isSingleDay = !range.to || isSameDay(range.from, range.to);
  return {
    primary: isSingleDay
      ? formatFull(range.from, locale)
      : `${formatDayMonth(range.from, locale)} – ${formatFull(range.to, locale)}`,
    days: isSingleDay ? 1 : differenceInCalendarDays(range.to, range.from) + 1,
    weekdays: isSingleDay
      ? formatWeekdayShort(range.from, locale)
      : `${formatWeekdayShort(range.from, locale)} – ${formatWeekdayShort(range.to, locale)}`,
  };
};

const summarizeSpecific = (dates, locale) => {
  if (!dates?.length) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const allSameMonth = sorted.every((d) => isSameMonth(d, sorted[0]));
  let primary;
  if (sorted.length === 1) {
    primary = formatFull(sorted[0], locale);
  } else if (allSameMonth) {
    const days = sorted.slice(0, -1).map((d) => String(d.getDate())).join(', ');
    primary = `${days}, ${formatFull(sorted[sorted.length - 1], locale)}`;
  } else {
    primary = sorted.map((d) => formatFull(d, locale)).join(', ');
  }
  return { primary, count: sorted.length };
};

const ModeButton = ({ controls, active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    aria-controls={controls}
    onClick={onClick}
    className={[
      'flex-1 min-h-11 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold',
      'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      active
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-muted-foreground hover:text-foreground cursor-pointer',
    ].join(' ')}
  >
    {children}
  </button>
);

ModeButton.propTypes = {
  controls: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const TriggerButton = ({ value, locale, onClick, t, hasError }) => {
  const rangeSummary = value?.type === 'range'
    ? summarize({ from: value.from, to: value.to }, locale)
    : null;
  const specificSummary = value?.type === 'specific'
    ? summarizeSpecific(value.dates, locale)
    : null;
  const summary = rangeSummary ?? specificSummary;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={[
        'w-full flex items-center px-4 py-3 rounded-md',
        'bg-card border text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        hasError
          ? 'border-destructive'
          : 'border-border hover:border-primary-300 dark:hover:border-primary-600',
      ].join(' ')}
    >
      <span className="flex-1 min-w-0">
        {summary ? (
          <span className="block text-sm font-semibold text-foreground truncate">{summary.primary}</span>
        ) : (
          <span className="block text-sm text-muted-foreground">{t('eventDatePicker.trigger.placeholder')}</span>
        )}
        {rangeSummary && (
          <span className="block text-xs text-muted-foreground truncate">
            {t('eventDatePicker.summary.dayCount', { count: rangeSummary.days })} · {rangeSummary.weekdays}
          </span>
        )}
        {specificSummary && (
          <span className="block text-xs text-muted-foreground truncate">
            {t('eventDatePicker.summary.dateCount', { count: specificSummary.count })}
          </span>
        )}
      </span>
    </button>
  );
};

TriggerButton.propTypes = {
  value: PropTypes.object,
  locale: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  hasError: PropTypes.bool,
};

const EventDatePickerPanel = ({
  initialValue,
  onConfirm,
  onClear,
  dateLocale,
  panelId,
  t,
}) => {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState(initialValue ?? null);
  const [mode, setMode] = useState(initialValue?.type === 'specific' ? 'specific' : 'range');

  const today = new Date();
  const initialDates = initialValue?.type === 'specific'
    ? (initialValue.dates ?? [])
    : [initialValue?.from, initialValue?.to].filter(Boolean);
  const initialYears = initialDates.map((date) => date.getFullYear());
  const startYear = Math.min(today.getFullYear() - 10, ...initialYears);
  const endYear = Math.max(today.getFullYear() + 20, ...initialYears);
  const calendarNavigationProps = {
    captionLayout: 'dropdown',
    navLayout: 'after',
    startMonth: new Date(startYear, 0),
    endMonth: new Date(endYear, 11),
  };

  const handleSwitchMode = (next) => {
    setMode(next);
    setDraft(null);
  };

  const draftRange = draft?.type === 'range' && draft.from
    ? { from: draft.from, to: draft.to ?? undefined }
    : undefined;
  const draftDates = draft?.type === 'specific' ? (draft.dates ?? []) : [];

  const handleSelectRange = (next) => {
    if (!next?.from) {
      setDraft(null);
      return;
    }
    setDraft({ type: 'range', from: next.from, to: next.to ?? null });
  };

  const handleSelectSpecific = (next) => {
    if (!next?.length) {
      setDraft(null);
      return;
    }
    setDraft({ type: 'specific', dates: next });
  };

  const handleConfirm = () => onConfirm(draft);
  const handleClear = () => onClear();

  const rangeSummary = summarize(draftRange, dateLocale);
  const specificSummary = summarizeSpecific(draftDates, dateLocale);
  const canConfirm = mode === 'range' ? !!draftRange?.from : draftDates.length > 0;

  return (
    <div className="event-date-picker p-4 pt-12 sm:p-6">
      <div className="mb-4 pr-8 sm:mb-5">
        <h2 id={`${panelId}-title`} className="text-lg font-bold text-foreground sm:text-xl">
        {t('eventDatePicker.modal.title')}
        </h2>
        <p id={`${panelId}-description`} className="mt-1 text-sm text-muted-foreground">
          {t(`eventDatePicker.instructions.${mode}`)}
        </p>
      </div>

      <div role="group" aria-label={t('eventDatePicker.modeSwitcher.label')} className="inline-flex w-full max-w-md bg-muted rounded-full p-1 gap-0.5 mb-4 sm:mb-5">
        <ModeButton
          controls={panelId}
          active={mode === 'range'}
          onClick={() => handleSwitchMode('range')}
        >
          {t('eventDatePicker.modes.range')}
        </ModeButton>
        <ModeButton
          controls={panelId}
          active={mode === 'specific'}
          onClick={() => handleSwitchMode('specific')}
        >
          {t('eventDatePicker.modes.specific')}
        </ModeButton>
      </div>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-title`}
        aria-describedby={`${panelId}-description`}
        className={mode === 'specific' ? 'flex justify-center' : undefined}
      >
        {mode === 'range' ? (
          <DayPicker
            mode="range"
            selected={draftRange}
            onSelect={handleSelectRange}
            locale={dateLocale}
            numberOfMonths={isMobile ? 1 : 2}
            pagedNavigation={!isMobile}
            weekStartsOn={1}
            showOutsideDays
            fixedWeeks
            {...calendarNavigationProps}
          />
        ) : (
          <div className="event-date-picker-specific">
            <DayPicker
              mode="multiple"
              selected={draftDates}
              onSelect={handleSelectSpecific}
              locale={dateLocale}
              numberOfMonths={1}
              weekStartsOn={1}
              showOutsideDays
              fixedWeeks
              {...calendarNavigationProps}
            />
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 sm:mt-5 sm:pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-500 dark:text-primary-400 inline-flex items-center justify-center flex-shrink-0">
            <FiCalendar className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0" aria-live="polite" aria-atomic="true">
            {rangeSummary && (
              <>
                <span className="text-sm font-bold text-foreground truncate">{rangeSummary.primary}</span>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {t('eventDatePicker.summary.dayCount', { count: rangeSummary.days })} · {rangeSummary.weekdays}
                </span>
              </>
            )}
            {specificSummary && (
              <>
                <span className="text-sm font-bold text-foreground truncate">{specificSummary.primary}</span>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {t('eventDatePicker.summary.dateCount', { count: specificSummary.count })}
                </span>
              </>
            )}
            {!rangeSummary && !specificSummary && (
              <span className="text-sm text-muted-foreground">{t('eventDatePicker.summary.empty')}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:flex-shrink-0">
          <Button variant="ghost" onClick={handleClear} className="min-h-11">
            {t('eventDatePicker.actions.clear')}
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm} className="min-h-11">
            {t('eventDatePicker.actions.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

EventDatePickerPanel.propTypes = {
  initialValue: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  dateLocale: PropTypes.object.isRequired,
  panelId: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};

const EventDatePicker = ({ value, onChange, hasError = false }) => {
  const { i18n, t } = useTranslation('event');
  const [isOpen, setIsOpen] = useState(false);

  const dateLocale = RDP_LOCALES[i18n.language] || pt;
  const panelId = useId();

  const handleConfirm = (draft) => {
    onChange(draft);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  return (
    <>
      <TriggerButton
        value={value}
        locale={dateLocale}
        onClick={() => setIsOpen(true)}
        t={t}
        hasError={hasError}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="3xl"
        fullWidth
        animation="scale"
        ariaLabelledby={`${panelId}-title`}
        ariaDescribedby={`${panelId}-description`}
        className="max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]"
        contentClassName="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-2rem)]"
        closeButtonLabel={t('eventDatePicker.actions.close')}
      >
        {isOpen && (
          <EventDatePickerPanel
            initialValue={value}
            onConfirm={handleConfirm}
            onClear={handleClear}
            dateLocale={dateLocale}
            panelId={panelId}
            t={t}
          />
        )}
      </Modal>
    </>
  );
};

EventDatePicker.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.oneOf([null]),
    PropTypes.shape({
      type: PropTypes.oneOf(['range', 'specific']).isRequired,
      from: PropTypes.instanceOf(Date),
      to: PropTypes.instanceOf(Date),
      dates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    }),
  ]),
  onChange: PropTypes.func.isRequired,
  hasError: PropTypes.bool,
};

export default EventDatePicker;
