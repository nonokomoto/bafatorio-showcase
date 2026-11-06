import { useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { setSelectedEventId } from "../../Redux/Event/eventSlice";
import { useEventsList } from "../../Hook/useEventsList";
import { useCreateEventGate } from "../../Hook/useCreateEventGate";
import BillingGateNotice from '../Common/BillingGateNotice';
import NoDataImage from '../../assets/NoData.svg';
import { Text, Button, Select } from '../UI';
import { EventSelectionSkeleton } from '../Skeletons';
import { getEventPrimaryTimestamp } from '../../Utils/eventDateConversion';
import { formatEventDateDisplay } from '../../Utils/formatDate';

// Lazy loaded components
const Spinner = lazy(() => import('../UI/spinner'));
const EventForm = lazy(() => import('../Event/EventForm'));

/**
 * EventSelection Component
 * Handles the selection and display of events
 * Uses useEventsList() for consistency with Events page (includes collaborated events)
 */
const EventSelection = ({ isConfirmPresence = false, compact = false }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation('participant');
  const selectedEventId = useSelector(state => state.event.selectedEventId);
  const [showEventForm, setShowEventForm] = useState(false);

  // Use same hook as Events page — includes owned + collaborated events
  const { allEvents, isLoading, error } = useEventsList();

  // Messages based on context
  const messages = {
    title: isConfirmPresence
      ? t('pages.eventSelection.titles.private')
      : t('pages.eventSelection.titles.regular'),
    description: isConfirmPresence
      ? t('pages.eventSelection.descriptions.private')
      : t('pages.eventSelection.descriptions.regular'),
    noEventsTitle: isConfirmPresence
      ? t('pages.eventSelection.noEvents.title.private')
      : t('pages.eventSelection.noEvents.title.regular'),
    noEventsDescription: isConfirmPresence
      ? t('pages.eventSelection.noEvents.message.private')
      : t('pages.eventSelection.noEvents.message.regular'),
    createButtonText: isConfirmPresence
      ? t('pages.eventSelection.buttons.create.private')
      : t('pages.eventSelection.buttons.create.regular')
  };

  // Mesmo pré-gate do + da página de Eventos — todos os pontos de entrada
  // para /app/register-event partilham o hook.
  const { gateReason, handleCreateEventClick } = useCreateEventGate();
  const handleCloseForm = () => setShowEventForm(false);

  const handleEventSelect = (e) => {
    const newEventId = e.target.value || null;
    dispatch(setSelectedEventId(newEventId));
    // RTK Query auto-refetches participants when selectedEventId changes
    // (useParticipantData skips when no eventId, re-runs when eventId changes)
  };

  if (isLoading) {
    if (compact) return <EventSelectionSkeleton compact />;
    return <EventSelectionSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 bg-error-light border border-error rounded-lg text-error text-center">
        {error.message}
      </div>
    );
  }

  // Compact empty state — no events exist
  if (!allEvents?.length && compact) {
    return (
      <div className="flex flex-col gap-3">
        {gateReason && <BillingGateNotice reason={gateReason} />}
        <Button
          variant="outline"
          onClick={handleCreateEventClick}
          size="md"
        >
          {messages.createButtonText}
        </Button>
      </div>
    );
  }

  // Render empty state
  if (!allEvents?.length) {
    return (
      <>
        {showEventForm ? (
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-[200px]">
              <Spinner status='loading' />
            </div>
          }>
            <EventForm onClose={handleCloseForm} isPrivate={isConfirmPresence} />
          </Suspense>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center animate-fade-in">
            <img
              src={NoDataImage}
              alt={t('pages.eventSelection.noEvents.altImage')}
              className="mb-6 w-32 h-32 opacity-75"
            />
            <Text
              variant="h5"
              className="font-medium mb-2"
            >
              {messages.noEventsTitle}
            </Text>
            <Text
              variant="body2"
              className="text-muted-foreground mb-6 max-w-md text-center"
            >
              {messages.noEventsDescription}
            </Text>
            {gateReason && (
              <div className="mb-4">
                <BillingGateNotice reason={gateReason} />
              </div>
            )}
            <Button
              variant="primary"
              onClick={handleCreateEventClick}
              size="md"
            >
              {messages.createButtonText}
            </Button>
          </div>
        )}
      </>
    );
  }

  // Filter and sort events
  const events = allEvents
    .filter(event => event.eventStatus !== 'CANCELED')
    .sort((a, b) => getEventPrimaryTimestamp(b) - getEventPrimaryTimestamp(a));

  // Prepare options for select component
  const eventOptions = [
    { value: '', label: t('pages.eventSelection.select.placeholder'), disabled: true },
    ...events.map(event => ({
      value: event.id,
      label: `${event.eventTitle} - ${formatEventDateDisplay(event) || t('pages.eventSelection.select.dateUnavailable', 'Data indisponível')}${
        !isConfirmPresence && event.eventStatus === 'ONGOING' ? ` (${t('pages.eventSelection.eventStatus.active')})` : ''
      }`
    }))
  ];

  // Compact render — just select + button, no card wrapper
  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Select
            options={eventOptions}
            value={selectedEventId || ""}
            onChange={handleEventSelect}
            placeholder={t('pages.eventSelection.select.placeholder')}
            size="md"
            name="eventSelect"
          />
          <Button
            variant="outline"
            onClick={handleCreateEventClick}
            size="md"
            className="shrink-0"
          >
            {messages.createButtonText}
          </Button>
        </div>
        {gateReason && <BillingGateNotice reason={gateReason} />}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white dark:bg-background-800 rounded-lg border border-border p-6">
        {gateReason && (
          <div className="mb-4">
            <BillingGateNotice reason={gateReason} />
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1">
            <Text
              variant="h5"
              weight="medium"
              className=" mb-2"
            >
              {messages.title}
            </Text>
            <Text
              variant="body2"
              className="text-muted-foreground"
            >
              {messages.description}
            </Text>
          </div>
          <Button
            variant="outline"
            onClick={handleCreateEventClick}
            size="md"
          >
            {messages.createButtonText}
          </Button>
        </div>

        {/* Event Select */}
        <div className="group relative">
          <Select
            options={eventOptions}
            value={selectedEventId || ""}
            onChange={handleEventSelect}
            placeholder={t('pages.eventSelection.select.placeholder')}
            size="lg"
            fullWidth
            name="eventSelect"
          />
        </div>
      </div>
    </div>
  );
};

EventSelection.propTypes = {
  isConfirmPresence: PropTypes.bool,
  compact: PropTypes.bool,
};

export default EventSelection;
