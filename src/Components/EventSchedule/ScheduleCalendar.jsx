import { useState, useMemo, useCallback, memo, useContext } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { pt, enUS, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './rbc-overrides.css';
import PropTypes from 'prop-types';
import ScheduleEntryDetailPopover from './ScheduleEntryDetailPopover';
import ScheduleAuthorAvatar from './ScheduleAuthorAvatar';
import ScheduleDaySheet from './ScheduleDaySheet';
import ScheduleCalendarToolbar from './ScheduleCalendarToolbar';
import ScheduleMonthDateHeader from './ScheduleMonthDateHeader';
import ScheduleShowMore from './ScheduleShowMore';
import { buildIsEventDay } from './scheduleUtils';
import { DEFAULT_SCHEDULE_COLOR } from '../../Utils/scheduleColors';
import { normalizeOwnerId } from '../../Utils/ownerId';
import { DayEventsCtx, EventDayCtx, ShowMoreCtx, AuthorFilterCtx } from './scheduleCalendarContexts';
import { useIsMobile } from '../../Hook/useIsMobile';

const LOCALE_MAP = { 'pt-PT': pt, 'en-US': enUS, 'fr-FR': fr };

// ─── Desktop event block ───────────────────────────────────────────────────────
// Defined at module level — stable reference prevents react-big-calendar
// from unmounting/remounting event elements on parent re-renders. Everything
// the block shows must therefore ride on the event object itself.
// Single-line in month view; the popover/sheet show the full detail on click.
function EventBlock({ event }) {
  return (
    <span className="flex items-center gap-1 min-w-0">
      {event.showAuthorAvatar && event.authorId && (
        <ScheduleAuthorAvatar
          userId={event.authorId}
          name={event.authorName}
          className="w-5 h-5 text-[0.6rem]"
        />
      )}
      <span className="font-medium truncate">{event.title}</span>
    </span>
  );
}

EventBlock.propTypes = {
  event: PropTypes.shape({
    title: PropTypes.string.isRequired,
    authorId: PropTypes.string,
    authorName: PropTypes.string,
    showAuthorAvatar: PropTypes.bool,
  }).isRequired,
};

// Contexts moved to scheduleCalendarContexts.js so Fast Refresh keeps working.

// Hide event blocks in month view on mobile — dots in dateCellWrapper replace them.
function MobileEventBlock() { return null; }
MobileEventBlock.displayName = 'MobileEventBlock';

// dateCellWrapper: wraps each day BG cell in month view.
// Renders colored dots (max 3) + "+N" when there are more.
// Clicking anywhere in the cell opens the day sheet.
function MobileDateCell({ value, children }) {
  const ctx = useContext(DayEventsCtx);
  const dayEvts = ctx ? ctx.getEventsForDay(value) : [];

  const handleClick = () => ctx?.onDayClick(value, dayEvts);

  return (
    <div className="relative w-full h-full flex flex-col cursor-pointer" onClick={handleClick}>
      {children}
      {dayEvts.length > 0 && (
        <div
          className="absolute bottom-1 left-0 right-0 flex justify-center items-center gap-0.5 pointer-events-none"
          aria-hidden="true"
        >
          {dayEvts.slice(0, 3).map((evt, i) => {
            return (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary-500"
                style={{ backgroundColor: evt.calendarColor }}
              />
            );
          })}
          {dayEvts.length > 3 && (
            <span className="text-[9px] text-muted-foreground leading-none ml-0.5">
              +{dayEvts.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

MobileDateCell.propTypes = {
  value: PropTypes.instanceOf(Date).isRequired,
  children: PropTypes.node,
};

MobileDateCell.displayName = 'MobileDateCell';

const CALENDAR_COMPONENTS = {
  event: EventBlock,
  toolbar: ScheduleCalendarToolbar,
  showMore: ScheduleShowMore,
  month: { dateHeader: ScheduleMonthDateHeader },
};
const MOBILE_CALENDAR_COMPONENTS = {
  event: MobileEventBlock,
  dateCellWrapper: MobileDateCell,
  toolbar: ScheduleCalendarToolbar,
  month: { dateHeader: ScheduleMonthDateHeader },
};

// ─── Event style ──────────────────────────────────────────────────────────────
function eventPropGetter(event) {
  return { style: { backgroundColor: event.calendarColor, borderColor: event.calendarColor } };
}

// ─── Localisers ───────────────────────────────────────────────────────────────
const localizersByLocale = Object.fromEntries(
  Object.entries(LOCALE_MAP).map(([key, locale]) => [
    key,
    dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { [key]: locale } }),
  ])
);

// ─── Time bounds for week/day views ───────────────────────────────────────────
// Constants — date portion is irrelevant, only the H/M is read.
const MIN_TIME = new Date(1970, 0, 1, 6, 0);
const MAX_TIME = new Date(1970, 0, 1, 23, 59, 59);
const SCROLL_TIME = new Date(1970, 0, 1, 8, 0);

// ─── Formats (24h, "–" separator) ─────────────────────────────────────────────
// Range keys receive { start, end } and require functions; singular date keys
// accept date-fns format strings directly.
function buildFormats(localizer) {
  const range = ({ start, end }, culture) =>
    `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(end, 'HH:mm', culture)}`;
  return {
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: range,
    selectRangeFormat: range,
    agendaTimeRangeFormat: range,
  };
}

// ─── ScheduleCalendar ─────────────────────────────────────────────────────────
const ScheduleCalendar = memo(({ event, entries, authors, supplierMap, participantMap, canCreate, onSlotSelect, onEditEntry }) => {
  const { t, i18n } = useTranslation('schedule');
  const locale = i18n.language in LOCALE_MAP ? i18n.language : 'pt-PT';
  const localizer = localizersByLocale[locale];
  const isMobile = useIsMobile();

  const formats = useMemo(() => buildFormats(localizer), [localizer]);

  // A agenda aceita qualquer data (ADR-029, Leitura A) — os dias do evento são
  // só uma pista visual, nunca um bloqueio.
  const isEventDay = useMemo(() => buildIsEventDay(event), [event]);
  const dayPropGetter = useCallback(
    (date) => (isEventDay(date) ? { className: 'rbc-event-day' } : {}),
    [isEventDay]
  );
  const messages = useMemo(() => ({
    today: t('calendar.today'),
    previous: t('calendar.previous'),
    next: t('calendar.next'),
    month: t('calendar.month'),
    week: t('calendar.week'),
    day: t('calendar.day'),
    date: t('calendar.date'),
    time: t('calendar.time'),
    event: t('calendar.event'),
    allDay: t('entryDetail.allDay'),
    noEventsInRange: t('calendar.noEventsInRange'),
    showMore: (count) => t('calendar.showMore', { count }),
  }), [t]);

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [daySheet, setDaySheet] = useState(null); // { date: Date, events: [] }

  const authorNameById = useMemo(
    () => new Map(authors.map((a) => [a.userId, a.name])),
    [authors]
  );
  // A mesma regra da fila de avatares: com um autor só, o círculo em cada
  // bloco não diz nada que o calendário inteiro já não diga.
  const showAuthorAvatars = authors.length > 1;

  const events = useMemo(
    () =>
      entries.map((entry) => {
        // Normalizado para casar com authors[].userId (a entrada guarda
        // sub::sub, o autor vem em sub cru).
        const authorId = normalizeOwnerId(entry.owner);
        const [year, month, day] = entry.date.split('-').map(Number);
        const start = entry.startTime
          ? new Date(year, month - 1, day, ...entry.startTime.split(':').map(Number))
          : new Date(year, month - 1, day);
        const end = entry.endTime
          ? new Date(year, month - 1, day, ...entry.endTime.split(':').map(Number))
          : start;
        const supplier = entry.supplierId ? supplierMap.get(entry.supplierId) : null;

        return {
          ...entry,
          start,
          end,
          allDay: !entry.startTime,
          title: entry.title,
          // Ausente significa default: entradas legadas (escritas antes do campo
          // existir) e entradas nunca pintadas seguem o mesmo caminho.
          calendarColor: entry.color ?? DEFAULT_SCHEDULE_COLOR,
          supplierName: supplier?.name ?? null,
          authorId,
          authorName: authorNameById.get(authorId),
          showAuthorAvatar: showAuthorAvatars,
          // Um id sem participante correspondente é saltado, não mostrado cru:
          // o utilizador não tem o que fazer com um UUID.
          participantNames: (entry.participantIds ?? [])
            .map((id) => participantMap.get(id)?.participantName)
            .filter(Boolean),
        };
      }),
    [entries, supplierMap, participantMap, authorNameById, showAuthorAvatars]
  );

  // ── Filtro por autor (vista, não permissão) ───────────────────────────────
  // Esconder afeta só o ecrã de quem carrega: o backend já decidiu o que este
  // utilizador pode ver. useState e não localStorage — um filtro que sobrevive
  // à sessão em silêncio é entradas "desaparecidas" semanas depois, sem nada
  // no ecrã a dizer porquê.
  const [hiddenAuthorIds, setHiddenAuthorIds] = useState(() => new Set());

  const handleToggleAuthor = useCallback((authorId) => {
    setHiddenAuthorIds((prev) => {
      const next = new Set(prev);
      if (next.has(authorId)) {
        next.delete(authorId);
      } else {
        next.add(authorId);
      }
      return next;
    });
  }, []);

  const authorFilterValue = useMemo(
    () => ({ authors, hiddenAuthorIds, onToggleAuthor: handleToggleAuthor }),
    [authors, hiddenAuthorIds, handleToggleAuthor]
  );

  // Memo separado do mapping acima: alternar o filtro não re-deriva as datas
  // nem os nomes de fornecedores/participantes das N entradas.
  const visibleEvents = useMemo(
    () =>
      hiddenAuthorIds.size === 0
        ? events
        : events.filter((e) => !hiddenAuthorIds.has(e.authorId)),
    [events, hiddenAuthorIds]
  );

  const allHiddenByFilter = events.length > 0 && visibleEvents.length === 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectEvent = useCallback((event, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedEntry(event);
    setAnchor({ x: rect.left, y: rect.bottom, width: rect.width });
  }, []);

  const handleClosePopover = useCallback(() => {
    setSelectedEntry(null);
    setAnchor(null);
  }, []);

  // Mobile: clicking a slot (any day) opens the day sheet.
  // Desktop month view: day with entries → day sheet (popover); empty day → form modal.
  // Desktop week/day view (timed slot): always form modal pre-filled with time.
  const handleSelectSlot = useCallback(({ start, action, bounds, box }) => {
    if (isMobile) {
      const dayEvents = visibleEvents.filter((e) => isSameDay(e.start, start));
      setDaySheet({ date: start, events: dayEvents, anchor: null });
      return;
    }
    if (!onSlotSelect) return;

    const dayEvents = visibleEvents.filter((e) => isSameDay(e.start, start));
    const isTimedSlot = action === 'click' && (start.getHours() !== 0 || start.getMinutes() !== 0);

    if (dayEvents.length > 0 && !isTimedSlot) {
      const anchor = bounds
        ? { x: bounds.left, y: bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top }
        : box
          ? { x: box.x, y: box.y, width: 1, height: 1 }
        : null;
      setDaySheet({ date: start, events: dayEvents, anchor });
      return;
    }

    const date = format(start, 'yyyy-MM-dd');
    const time = isTimedSlot ? format(start, 'HH:mm') : undefined;
    onSlotSelect({ date, time });
  }, [isMobile, visibleEvents, onSlotSelect]);

  const handleDaySheetClose = useCallback(() => setDaySheet(null), []);

  // From day sheet: close sheet, open detail (which renders as bottom sheet on mobile).
  const handleDaySheetEntrySelect = useCallback((entry) => {
    const sheetAnchor = daySheet?.anchor;
    setDaySheet(null);
    setSelectedEntry(entry);
    
    // Desktop: if we have a sheet anchor, reuse it for the detail popover 
    // so it appears in the same place.
    if (!isMobile && sheetAnchor) {
      setAnchor(sheetAnchor);
    } else {
      setAnchor(null);
    }
  }, [daySheet, isMobile]);

  // From day sheet: close sheet, open the create form pre-filled with the day's date.
  const handleDaySheetAddEntry = useCallback((date) => {
    setDaySheet(null);
    if (!onSlotSelect) return;
    onSlotSelect({ date: format(date, 'yyyy-MM-dd') });
  }, [onSlotSelect]);

  // Custom showMore button captures its own DOM rect and calls this via context.
  const handleShowMoreOpen = useCallback(({ date, anchor }) => {
    const dayEvents = visibleEvents.filter((e) => isSameDay(e.start, date));
    setDaySheet({ date, events: dayEvents, anchor });
  }, [visibleEvents]);

  // ── Context for mobile date cells ─────────────────────────────────────────

  // visibleEvents, não events: os dots do mobile e o day sheet têm de
  // respeitar o filtro tal como os blocos do desktop.
  const getEventsForDay = useCallback(
    (date) => visibleEvents.filter((e) => isSameDay(e.start, date)),
    [visibleEvents]
  );

  const handleDayClick = useCallback((date, dayEvents) => {
    setDaySheet({ date, events: dayEvents, anchor: null });
  }, []);

  const dayCtxValue = useMemo(
    () => ({ getEventsForDay, onDayClick: handleDayClick }),
    [getEventsForDay, handleDayClick]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="h-[600px]" data-manage={!isMobile && !!onSlotSelect ? 'true' : undefined}>
        <DayEventsCtx.Provider value={isMobile ? dayCtxValue : null}>
        <EventDayCtx.Provider value={isEventDay}>
        <ShowMoreCtx.Provider value={handleShowMoreOpen}>
        <AuthorFilterCtx.Provider value={authorFilterValue}>
          {allHiddenByFilter && (
            <div className="text-sm text-muted-foreground text-center py-1.5" role="status">
              {t('authorFilter.allHidden')}
            </div>
          )}
          <Calendar
            localizer={localizer}
            culture={locale}
            events={isMobile ? [] : visibleEvents}
            formats={formats}
            messages={messages}
            defaultView="month"
            views={isMobile ? ['month'] : ['month', 'week', 'day']}
            dayLayoutAlgorithm="no-overlap"
            min={MIN_TIME}
            max={MAX_TIME}
            scrollToTime={SCROLL_TIME}
            onSelectEvent={handleSelectEvent}
            selectable={isMobile || !!onSlotSelect}
            onSelectSlot={handleSelectSlot}
            doShowMoreDrillDown={false}
            style={{ height: '100%' }}
            components={isMobile ? MOBILE_CALENDAR_COMPONENTS : CALENDAR_COMPONENTS}
            eventPropGetter={isMobile ? undefined : eventPropGetter}
            dayPropGetter={dayPropGetter}
          />
        </AuthorFilterCtx.Provider>
        </ShowMoreCtx.Provider>
        </EventDayCtx.Provider>
        </DayEventsCtx.Provider>
      </div>

      {selectedEntry && (
        <ScheduleEntryDetailPopover
          entry={selectedEntry}
          anchor={anchor}
          onClose={handleClosePopover}
          onEdit={onEditEntry}
        />
      )}

      {daySheet && (
        <ScheduleDaySheet
          date={daySheet.date}
          events={daySheet.events}
          anchor={daySheet.anchor}
          canCreate={canCreate && !!onSlotSelect}
          onClose={handleDaySheetClose}
          onSelectEntry={handleDaySheetEntrySelect}
          onAddEntry={handleDaySheetAddEntry}
        />
      )}
    </>
  );
});

ScheduleCalendar.displayName = 'ScheduleCalendar';

ScheduleCalendar.propTypes = {
  event: PropTypes.shape({
    eventDateType: PropTypes.oneOf(['range', 'specific']),
    eventStartDate: PropTypes.string,
    eventEndDate: PropTypes.string,
    eventSpecificDates: PropTypes.arrayOf(PropTypes.string),
  }),
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      startTime: PropTypes.string,
      endTime: PropTypes.string,
      supplierId: PropTypes.string,
      participantIds: PropTypes.arrayOf(PropTypes.string),
      color: PropTypes.string,
    })
  ).isRequired,
  authors: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  supplierMap: PropTypes.instanceOf(Map).isRequired,
  participantMap: PropTypes.instanceOf(Map).isRequired,
  canCreate: PropTypes.bool,
  onSlotSelect: PropTypes.func,
  onEditEntry: PropTypes.func,
};

export default ScheduleCalendar;
