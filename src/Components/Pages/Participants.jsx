/**
 * Participants Page Component (V2)
 *
 * Compact page header replaces PageHeader + EventSelection.
 * Centralizes data fetching following the EventDetails pattern:
 * - useEventRole() for event data + permissions (single source of truth)
 * - useParticipantData() called once, data passed as props
 * - Permissions computed at top level and passed down
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ParticipantTableSkeleton } from '../Skeletons';
import { useEventRole, EVENT_PERMISSIONS } from '../../Hook/useEventRole';
import { roleHasPermission } from '../../Utils/eventRolesConfig';
import { Card, Text } from '../UI';
import { useParticipantData } from '../Participant/ParticipantTable/hooks/useParticipantData';
import { useEventsList } from '../../Hook/useEventsList';
import { useListEventRolesQuery } from '../../Api/services/roleApi';
import { setSelectedEventId, clearSelectedParticipants } from '../../Redux/Event/eventSlice';
import { getEventPrimaryTimestamp } from '../../Utils/eventDateConversion';
import { formatEventDateDisplay } from '../../Utils/formatDate';
import ParticipantDetailPanel from '../Participant/ParticipantDetailPanel';
import ParticipantFormModal from '../Participant/ParticipantForm/ParticipantFormModal';

// Lazy-loaded components to improve initial load performance
const ParticipantTable = lazy(() => import('../Participant/ParticipantTable'));
const SendEmail = lazy(() => import('../Participant/SendEmail'));

// --- Event Status Dot ---
const EVENT_STATUS_STYLES = {
  SCHEDULED: { className: 'bg-primary-100 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200', dot: '#4069FF', label: 'statusScheduled' },
  ONGOING: { className: 'bg-success-100 dark:bg-success-900/30 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200', dot: '#10B981', label: 'statusOngoing' },
  COMPLETED: { className: 'bg-muted border-border text-muted-foreground', dot: '#9CA3AF', label: 'statusCompleted' },
  CANCELLED: { className: 'bg-error-100 dark:bg-error-900/30 border-error-200 dark:border-error-800 text-error-800 dark:text-error-200', dot: '#EF4444', label: 'statusCancelled' },
};

const EventStatusPill = ({ status, t }) => {
  const style = EVENT_STATUS_STYLES[status] || EVENT_STATUS_STYLES.SCHEDULED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${style.className}`}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
      {t(`participantsV2.eventSelector.${style.label}`, style.label)}
    </span>
  );
};

EventStatusPill.propTypes = {
  status: PropTypes.string,
  t: PropTypes.func.isRequired,
};

const Participants = () => {
  const { t } = useTranslation(['participant', 'common']);
  const dispatch = useDispatch();

  // Get selected event from Redux store
  const selectedEventId = useSelector(state => state.event.selectedEventId);

  // Event list for inline selector
  const { allEvents, isLoading: isEventsLoading } = useEventsList();

  // Filter and sort events for selector
  const eventOptions = useMemo(() => {
    if (!allEvents) return [];
    return allEvents
      .filter(event => event.eventStatus !== 'CANCELED')
      .sort((a, b) => getEventPrimaryTimestamp(b) - getEventPrimaryTimestamp(a));
  }, [allEvents]);

  // --------------------------------
  // Central data source: useEventRole (same pattern as EventDetails)
  // --------------------------------
  const {
    eventData: selectedEvent,
    role,
    isOwner,
    isCoManager,
    isStaffLogistics,
    isLoading: isRoleLoading,
    error: roleError,
  } = useEventRole(selectedEventId);

  // --------------------------------
  // Participant data: single instance, passed as props to children
  // --------------------------------
  const {
    participantsByEvent: participants,
    participantsByEventCount,
    allDependents,
    isLoading: isParticipantsLoading,
    isFetching: isParticipantsFetching,
    error: participantsError,
    refetch: refetchParticipants,
  } = useParticipantData();

  // --------------------------------
  // Load roles for the event
  // --------------------------------
  const { data: rolesData = [] } = useListEventRolesQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  // Create a map of roleId -> roleName for quick lookup
  const roleIdToNameMap = useMemo(() => {
    const map = {};
    rolesData?.forEach(role => {
      map[role.id] = role.name;
    });
    return map;
  }, [rolesData]);

  // --------------------------------
  // Pre-compute permissions object (stable ref via useMemo)
  // --------------------------------
  const permissions = useMemo(() => ({
    role,
    isOwner,
    isCoManager,
    isStaffLogistics,
    canManageParticipants: roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_CREATE) || roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_EDIT),
    canSendEmails: roleHasPermission(role, EVENT_PERMISSIONS.EMAIL_SEND),
    canCheckIn: roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_CHECKIN),
  }), [role, isOwner, isCoManager, isStaffLogistics]);

  // --------------------------------
  // Calculate participant counts by role name (for RoleManagerPanel)
  // --------------------------------
  const participantCounts = useMemo(() => {
    if (!participants || !roleIdToNameMap) return {};
    const counts = {};
    participants.forEach(p => {
      const roleName = roleIdToNameMap[p.roleId];
      if (roleName) {
        counts[roleName] = (counts[roleName] || 0) + 1;
      }
    });
    return counts;
  }, [participants, roleIdToNameMap]);

  // --------------------------------
  // Detail panel state (Phase 3)
  // --------------------------------
  const [detailParticipant, setDetailParticipant] = useState(null);
  const [emailParticipant, setEmailParticipant] = useState(null);

  // --------------------------------
  // Form modal state management (V2 — ParticipantFormModal)
  // --------------------------------
  const [formMode, setFormMode] = useState({
    isOpen: false,
    type: null,      // 'create' or 'edit'
    participant: null // participant object for edit mode
  });

  const handleEventChange = (e) => {
    const newEventId = e.target.value || null;
    dispatch(setSelectedEventId(newEventId));
  };

  const closeForm = () => {
    if (formMode.type === 'edit') dispatch(clearSelectedParticipants());
    setFormMode({ isOpen: false, type: null, participant: null });
  };

  const checkAndOpenForm = (type, participant = null) => {
    setFormMode({ isOpen: true, type, participant });
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Compact Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('participantsV2.pageTitle', { ns: 'participant', defaultValue: 'Participantes' })}
        </h1>
        <p className="text-sm mt-1 text-muted-foreground">
          {t('participantsV2.pageSubtitle', { ns: 'participant', defaultValue: 'Gerir participantes do evento' })}
        </p>
      </div>

      {/* Inline Event Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <label className="text-[13px] font-medium whitespace-nowrap text-muted-foreground">
          {t('participantsV2.eventSelector.label', { ns: 'participant', defaultValue: 'Evento' })}
        </label>
        <select
          value={selectedEventId || ''}
          onChange={handleEventChange}
          disabled={isEventsLoading}
          className="flex-1 min-w-[200px] max-w-[440px] text-sm bg-card text-foreground appearance-none cursor-pointer py-2.5 pl-3.5 pr-9 rounded-[10px] border border-border focus:border-primary focus:outline-none bg-no-repeat bg-[length:16px] bg-[position:right_12px_center]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          }}
        >
          <option value="">
            {t('participantsV2.eventSelector.placeholder', { ns: 'participant', defaultValue: 'Selecionar evento...' })}
          </option>
          {eventOptions.map(event => (
            <option key={event.id} value={event.id}>
              {event.eventTitle} — {formatEventDateDisplay(event) || t('participantsV2.eventSelector.dateUnavailable', { ns: 'participant', defaultValue: 'Data indisponível' })}
              {event.eventStatus === 'ONGOING' ? ` (${t('participantsV2.eventSelector.statusOngoing', { ns: 'participant', defaultValue: 'Em curso' })})` : ''}
            </option>
          ))}
        </select>
        {selectedEvent && (
          <EventStatusPill status={selectedEvent.eventStatus} t={(key, fallback) => t(key, { ns: 'participant', defaultValue: fallback })} />
        )}
      </div>

      {/* Loading state */}
      {isRoleLoading && selectedEventId && <ParticipantTableSkeleton />}

      {/* Error state */}
      {!isRoleLoading && roleError && (
        <Card
          variant="default"
          className="animate-fade-in bg-error-50 dark:bg-error-900/20 shadow-sm"
          padded="md"
          elevated
        >
          <Text variant="h5" weight="medium" className="mb-2">
            {t('error.title', {ns: 'common'})}
          </Text>
          <Text variant="body2" className="text-muted-foreground mb-2">
            {t('error.message', {ns: 'common'})}
          </Text>
        </Card>
      )}

      {/* Main Content */}
      {selectedEvent && (
        <>
          <Suspense fallback={<ParticipantTableSkeleton />}>
            <ParticipantTable
              handleAddParticipants={() => checkAndOpenForm('create')}
              selectedEvent={selectedEvent}
              participants={participants}
              allDependents={allDependents}
              isParticipantsLoading={isParticipantsLoading}
              isFetching={isParticipantsFetching}
              participantsError={participantsError}
              refetchParticipants={refetchParticipants}
              permissions={permissions}
              onRowClick={setDetailParticipant}
              onEditParticipant={(p) => checkAndOpenForm('edit', p)}
            />
          </Suspense>

          {/* Detail Panel (Phase 3) */}
          <ParticipantDetailPanel
            participant={detailParticipant}
            onClose={() => setDetailParticipant(null)}
            onEdit={(p) => {
              setDetailParticipant(null);
              checkAndOpenForm('edit', p);
            }}
            onEmail={(p) => {
              setDetailParticipant(null);
              setEmailParticipant(p);
            }}
            permissions={permissions}
          />

          {/* Email from Detail Panel */}
          <Suspense fallback={null}>
            <SendEmail
              isOpen={!!emailParticipant}
              onClose={() => setEmailParticipant(null)}
              selectedParticipants={emailParticipant ? [emailParticipant] : []}
              eventId={selectedEventId}
              selectedEvent={selectedEvent}
              clearSelectedParticipants={() => setEmailParticipant(null)}
            />
          </Suspense>

          {/* V2 Form Modal */}
          <ParticipantFormModal
            isOpen={formMode.isOpen}
            onClose={closeForm}
            mode={formMode.type || 'create'}
            participant={formMode.participant}
            existingDependents={
              formMode.participant
                ? (allDependents || []).filter(d => d.participantId === formMode.participant.id)
                : []
            }
            participantCount={participantsByEventCount || 0}
            participantCounts={participantCounts}
          />
        </>
      )}
    </div>
  );
};

export default Participants;
