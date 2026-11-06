import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useEventRole, EVENT_PERMISSIONS } from "../../Hook/useEventRole";
import { roleHasPermission } from "../../Utils/eventRolesConfig";
import { formatEventDateDisplay } from "../../Utils/formatDate";
import { getEventPrimaryDate, eventHasEnded } from "../../Utils/eventDateConversion";
import { useTabCounts } from "../../Hook/useTabCounts";
import { useGetEventAsCollaboratorQuery } from "../../Api/services/collaboratorApi";
import { useListScheduleEntriesByEventQuery } from "../../Api/services/scheduleApi";
import { setSelectedEventId } from "../../Redux/Event/eventSlice";
import HeaderWithButton from '../HeaderWithButton';
import EventForm from '../Event/EventForm';
import EventDetailsCard from '../EventDetails/EventDetailsCard';
import EventTab from '../EventDetails/EventTab';
import EventDocuments from '../EventDetails/Documents';
import CompletedEventBanner from '../EventDetails/CompletedEventBanner';
import ReadOnlyBanner from '../Common/ReadOnlyBanner';
import { useAuthz } from '../../Hook/useAuthz';
import EventSupplierList from '../Supplier/EventSupplierList';
import TeamManagement from '../Team/TeamManagement';
import EventSchedule from '../EventSchedule/EventSchedule';
import EventParticipants from '../EventDetails/EventParticipants';
import { Card, Text,  Badge, AnimatedContent } from '../UI';
import PullToRefresh from '../UI/PullToRefresh';
import PropTypes from 'prop-types';

import { FiClock, FiFileText, FiTruck, FiUsers, FiCalendar, FiUserCheck } from 'react-icons/fi';

import { AnimatePresence } from 'framer-motion';

// Memoized utility components
const StatusComponent = memo(({ title, message, className }) => (
  <Card 
    variant="default" 
    className={`animate-fade-in ${className} shadow-sm`}
    padded="md"
    elevated
  >
    <Text 
      variant="h4" 
      className="mb-4 font-medium"
    >
      {title}
    </Text>
    <Text 
      variant="body2"
      className="text-muted-foreground"
    >
      {message}
    </Text>
  </Card>
));

StatusComponent.displayName = 'StatusComponent';

// Memoized content component
const EventContent = memo(({
  event,
  handleEditEventClick,
  canEdit = false,
}) => {
  const { t } = useTranslation(['event']);
  const { eventTitle, eventStatus, eventType, eventLocation } = event;

  // Status mapping (Badge variants)
  const EVENT_STATUS_MAP = {
    SCHEDULED: { variant: 'primary', text: t('status.label.SCHEDULED') },
    COMPLETED: { variant: 'success', text: t('status.label.COMPLETED') },
    CANCELLED: { variant: 'error', text: t('status.label.CANCELLED') },
    ONGOING: { variant: 'warning', text: t('status.label.ONGOING') },
    UNKNOWN: { variant: 'neutral', text: t('status.label.UNKNOWN') }
  };

  // Access Type mapping (Badge variants)
  const EVENT_ACCESS_MAP = {
    public: { variant: 'info', text: t('accessTypes.label.public') },
    private: { variant: 'secondary', text: t('accessTypes.label.private') }
  };

  const statusInfo = EVENT_STATUS_MAP[eventStatus] || EVENT_STATUS_MAP.UNKNOWN;
  const accessInfo = EVENT_ACCESS_MAP[eventType];

  // Subtitle: "25 Dez 2024 · Pavilhão Municipal"
  const subtitle = useMemo(() => {
    const parts = [];
    const dateDisplay = formatEventDateDisplay(event);
    if (dateDisplay) parts.push(dateDisplay);
    if (eventLocation) parts.push(eventLocation);
    if (parts.length === 0) return null;
    return parts.join(' · ');
  }, [event, eventLocation]);

  // Countdown to event
  const countdown = useMemo(() => {
    if (eventStatus === 'COMPLETED' || eventStatus === 'CANCELLED') return null;
    const now = new Date();
    const target = getEventPrimaryDate(event);
    if (!target) return null;
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((targetMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
  }, [event, eventStatus]);

  const countdownChip = useMemo(() => {
    if (countdown === null) return null;
    if (countdown < 0) return null;
    if (countdown === 0) return { text: t('header.countdown.today'), color: 'success' };
    if (countdown === 1) return { text: t('header.countdown.tomorrow'), color: 'warning' };
    return { text: t('header.countdown.daysRemaining', { count: countdown }), color: 'warning' };
  }, [countdown, t]);

  // Title with inline badges
  const titleWithBadges = (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Text variant="h4" as="span" className="font-semibold tracking-tight text-lg sm:text-xl md:text-2xl">{eventTitle}</Text>
      <Badge variant={statusInfo.variant} tone="soft" size="sm">{statusInfo.text}</Badge>
      {accessInfo && <Badge variant={accessInfo.variant} tone="soft" size="sm">{accessInfo.text}</Badge>}
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Title + badges + quick actions */}
      {canEdit ? (
        <HeaderWithButton
          title={titleWithBadges}
          paragraph={subtitle && <Text variant="body2" className="text-muted-foreground">{subtitle}</Text>}
          buttonText={t('buttons.edit')}
          onButtonClick={handleEditEventClick}
          type="edit"
        />
      ) : (
        <div className="mb-3 sm:mb-4">
          <div className="mb-1">{titleWithBadges}</div>
          {subtitle && (
            <Text variant="body2" className="text-muted-foreground">{subtitle}</Text>
          )}
        </div>
      )}

      {/* Countdown chip — own line */}
      {countdownChip && (
        <div className="mt-2">
          <span
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-sm font-medium leading-tight rounded-full
              border
              ${countdownChip.color === 'success'
                ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border-success-200 dark:border-success-700/30'
                : 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-700/30'
              }
            `}
            role="status"
            aria-label={countdownChip.text}
          >
            <FiClock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {countdownChip.text}
          </span>
        </div>
      )}

    </div>
  );
});

EventContent.displayName = 'EventContent';

// ============================================================
// MAIN EVENT DETAILS COMPONENT
// ============================================================

// Tab content rendering. No AnimatedContent wrapper on purpose: the previous
// setup wrapped each tab in a keyed motion.div inside AnimatePresence mode=wait,
// which added a ~400ms transition where the panel went blank between the old
// tab fading out and the new one fading in. Tab switching should feel instant —
// each tab component renders its own skeleton (e.g. EventDocuments'
// isFoldersLoading, EventSupplierList's Skeleton) while data loads.
const TabContent = memo(({ activeTab, eventId, eventCurrency, showDocumentsTab, showSuppliersTab, showTeamTab, showScheduleTab, showParticipantsTab, permissions }) => {
  return (
    <>
      {activeTab === 'schedule' && showScheduleTab && (
        <EventSchedule
          eventId={eventId}
          canCreate={permissions.canCreateScheduleEntry}
        />
      )}
      {activeTab === 'participants' && showParticipantsTab && (
        <EventParticipants
          eventId={eventId}
          canManageParticipants={permissions.canManageParticipants}
        />
      )}
      {activeTab === 'suppliers' && showSuppliersTab && (
        <EventSupplierList
          eventId={eventId}
          eventCurrency={eventCurrency}
          canManageSuppliers={permissions.canManageSuppliers}
          canEditSuppliers={permissions.canEditSuppliers}
          canDeleteSuppliers={permissions.canDeleteSuppliers}
          canSelectSupplier={permissions.canSelectSupplier}
          canApproveSuppliers={permissions.canApproveSuppliers}
        />
      )}
      {activeTab === 'documents' && showDocumentsTab && (
        <EventDocuments
          eventId={eventId}
          isOwner={permissions.isOwner}
          isCoManager={permissions.isCoManager}
          isStaffLogistics={permissions.isStaffLogistics}
          canManageDocuments={permissions.canManageDocuments}
          sharedFolderIds={permissions.sharedFolderIds}
        />
      )}
      {activeTab === 'team' && showTeamTab && (
        <TeamManagement
          eventId={eventId}
          role={permissions.role}
          isOwner={permissions.isOwner}
          canInviteStaff={permissions.canInviteStaff}
          canInviteCoManager={permissions.canInviteCoManager}
          canRemoveTeamMember={permissions.canRemoveTeamMember}
        />
      )}
    </>
  );
});

TabContent.displayName = 'TabContent';

TabContent.propTypes = {
  activeTab: PropTypes.string.isRequired,
  eventId: PropTypes.string.isRequired,
  eventCurrency: PropTypes.string,
  permissions: PropTypes.object,
  showDocumentsTab: PropTypes.bool,
  showSuppliersTab: PropTypes.bool,
  showTeamTab: PropTypes.bool,
  showScheduleTab: PropTypes.bool,
  showParticipantsTab: PropTypes.bool,
};

const EventDetails = () => {
  const { t } = useTranslation(['event', 'common', 'documents']);
  const { id: eventId } = useParams();
  const dispatch = useDispatch();

  // --------------------------------
  // Role-based permissions and event data
  // --------------------------------
  const {
    eventData: event,
    role,
    isOwner,
    isCoManager,
    isStaffLogistics,
    sharedFolderIds,
    canEditEvent,
    canViewFinancial,
    canViewOwnDocuments,
    canViewSharedDocuments,
    canViewAllDocuments,
    canViewSuppliers,
    canInviteStaff,
    canInviteCoManager,
    canRemoveTeamMember,
    canViewSchedule,
    canViewParticipants,
    isLoading: isRoleLoading,
    error: roleError
  } = useEventRole(eventId);

  // Entitlements do plano (cosmético — a autoridade é a Lambda, §4b)
  const { writable, reason: accessReason, entitlements } = useAuthz(eventId);

  // Fim do evento derivado das datas — não do eventStatus, que é uma escrita
  // manual e fecha com a janela de edição (o relatório é leitura).
  const eventEnded = useMemo(() => eventHasEnded(event, new Date()), [event]);


  // --------------------------------
  // Estado local
  // --------------------------------
  const [showEventForm, setShowEventForm] = useState(false);

  // --------------------------------
  // Determine visible tabs based on permissions
  // --------------------------------
  const canViewDocuments = canViewOwnDocuments() || canViewSharedDocuments() || canViewAllDocuments();
  const showDocumentsTab = canViewDocuments;
  const showSuppliersTab = canViewSuppliers();
  const showTeamTab = canInviteStaff() || canInviteCoManager() || canRemoveTeamMember(); // Owner and Co-Manager can manage team
  const showScheduleTab = canViewSchedule(); // OWNER, CO_MANAGER, STAFF_LOGISTICS
  const showParticipantsTab = canViewParticipants(); // PARTICIPANT_VIEW — todos os roles

  // Pre-compute permissions object for child components (stable ref for memo)
  // Uses roleHasPermission directly so deps are explicit — no closures involved
  const permissions = useMemo(() => ({
    role,
    isOwner,
    isCoManager,
    isStaffLogistics,
    sharedFolderIds,
    canManageDocuments: roleHasPermission(role, EVENT_PERMISSIONS.DOCUMENT_CREATE),
    canManageSuppliers: roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_CREATE),
    // Split edit/delete from create so STAFF_LOGISTICS (create-only) does not
    // see Edit/Delete UI that the backend would reject.
    canEditSuppliers: roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_EDIT),
    canDeleteSuppliers: roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_DELETE),
    canSelectSupplier: roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_SELECT),
    canApproveSuppliers: roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_APPROVE),
    canInviteStaff: roleHasPermission(role, EVENT_PERMISSIONS.TEAM_INVITE_STAFF),
    canInviteCoManager: roleHasPermission(role, EVENT_PERMISSIONS.TEAM_INVITE_COMANAGER),
    canRemoveTeamMember: roleHasPermission(role, EVENT_PERMISSIONS.TEAM_REMOVE),
    canCreateScheduleEntry: roleHasPermission(role, EVENT_PERMISSIONS.SCHEDULE_CREATE),
    // Só quem pode criar/editar participantes vê o atalho "Gerir participantes"
    canManageParticipants: roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_CREATE)
      || roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_EDIT),
  }), [role, isOwner, isCoManager, isStaffLogistics, sharedFolderIds]);

  // Tab counts and pending indicators (shared RTK Query cache with child components)
  const tabCounts = useTabCounts(eventId, { showSuppliersTab, showTeamTab, showScheduleTab });

  const [activeTab, setActiveTab] = useState('schedule'); // State for active tab

  // Default active tab segue a ordem visual das tabs (Agenda → Participantes →
  // Fornecedores → Documentos → Equipa): cai na primeira visível ao role.
  useEffect(() => {
    if (!isRoleLoading) {
      if (showScheduleTab) {
        setActiveTab('schedule');
      } else if (showParticipantsTab) {
        setActiveTab('participants');
      } else if (showSuppliersTab) {
        setActiveTab('suppliers');
      } else if (showDocumentsTab) {
        setActiveTab('documents');
      } else if (showTeamTab) {
        setActiveTab('team');
      }
    }
  }, [isRoleLoading, showDocumentsTab, showSuppliersTab, showTeamTab, showScheduleTab, showParticipantsTab, eventId]);

  // Definir o ID do evento selecionado no Redux
  useEffect(() => {
    dispatch(setSelectedEventId(eventId));
  }, [dispatch, eventId]);

  // --------------------------------
  // Data Fetching - Carregar dados
  // --------------------------------
  // Get refetch function for event data (uses same cache as useEventRole)
  // Os contadores do evento são escritos pelo stream ~1,4s depois do upload
  // responder, fora do ciclo da mutation. Refazer no mount garante que o perfil
  // mostra o valor atual ao entrar, em vez de servir cache pré-stream.
  const { refetch } = useGetEventAsCollaboratorQuery(
    { eventId },
    { skip: !eventId, refetchOnMountOrArgChange: true }
  );

  // Prefetch da Agenda em paralelo com o fetch do evento. A Agenda é a tab
  // default, mas o bloco das tabs (e portanto o EventSchedule) só monta depois
  // de o event estar resolvido — sem isto, a query da agenda ficava em série
  // atrás do getEventAsCollaborator (arrancava tarde e via-se a carregar ao
  // fazer scroll). Ambas só dependem do eventId, logo correm juntas; o RTK
  // Query deduplica e o EventSchedule reusa esta cache já quente ao montar.
  useListScheduleEntriesByEventQuery({ eventId }, { skip: !eventId });


  // --------------------------------
  // Handlers para o evento
  // --------------------------------
  const handleEditEventClick = useCallback(() => {
    setShowEventForm(true);
  }, []);

  // Só fecha depois de a cache ter os dados novos — fechar primeiro devolvia a
  // vista de detalhes com os valores antigos até o refetch responder, e isso
  // lê-se como "a edição não gravou". Cancelar (saved falso) não refetcha.
  const handleCloseForm = useCallback(async (saved) => {
    if (saved) await refetch();
    setShowEventForm(false);
  }, [refetch]);

  // --------------------------------
  // Renderização condicional: Error, No Data (only after loading completes)
  // --------------------------------
  if (!isRoleLoading && roleError) {
    return <StatusComponent
      title={t('error.title')}
      message={t('error.message')}
      className="bg-error-50 dark:bg-error-900/20"
    />;
  }

  if (!isRoleLoading && !event) {
    return <StatusComponent
      title={t('error.missing.title')}
      message={t('error.missing.message')}
      className="bg-warning-50 dark:bg-warning-900/20"
    />;
  }

  // --------------------------------
  // Renderização principal — layout always renders, skeletons only on async data
  // --------------------------------
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {showEventForm && event ? (
        <AnimatedContent key="event-form">
          <EventForm
            onClose={handleCloseForm}
            id={eventId}
            existingEvent={event}
            isEventLoading={isRoleLoading}
            eventError={roleError}
          />
        </AnimatedContent>
      ) : (
        <div key="event-details-view" className="flex flex-col gap-4 sm:gap-6">
          {/* Header + Key Details */}
          {event ? (
            <EventContent
              event={event}
              handleEditEventClick={handleEditEventClick}
              // Gate no botão: RBAC (role permite editar) E entitlement (janela
              // de escrita aberta). Quando !writable o botão sai e o
              // ReadOnlyBanner acima explica o motivo — o evento fica em consulta.
              canEdit={canEditEvent() && writable}
            />
          ) : (
            <div className="animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-48 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded-full" />
                    <div className="h-5 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="h-4 w-80 bg-muted rounded" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 w-32 bg-muted rounded-full" />
                ))}
              </div>
            </div>
          )}

          {/* Evento read-only (janela fechada / Pro caído): visível, nunca escondido (§4) */}
          {event && !writable && (
            <AnimatedContent key="readonly-banner">
              {/* Só promete o relatório se ele for mesmo alcançável: plano com
                  report E evento terminado (o CompletedEventBanner só existe aí). */}
              <ReadOnlyBanner
                reason={accessReason}
                hasReport={Boolean(entitlements.report) && eventEnded}
              />
            </AnimatedContent>
          )}

          {/* CompletedEventBanner — full width, above cards (Owner only).
              Gate por data, não por status: marcar COMPLETED é uma escrita que
              fecha com a janela; o relatório é leitura e não pode depender dela. */}
          {event && isOwner && (
            <AnimatePresence>
              {eventEnded && (
                <AnimatedContent key="completed-banner">
                  <CompletedEventBanner
                    eventId={eventId}
                    event={event}
                    markedCompleted={event.eventStatus === 'COMPLETED'}
                    canMarkCompleted={canEditEvent() && writable}
                  />
                </AnimatedContent>
              )}
            </AnimatePresence>
          )}

          {/* Event Details — financeiro é agora a 4ª secção do card (gated) */}
          {event ? (
            <EventDetailsCard
              event={event}
              participantCount={event.participantCount ?? 0}
              totalDependents={event.dependentCount ?? 0}
              budget={event.budget}
              effectiveExpenses={event.effectiveExpenses}
              committedExpenses={event.committedExpenses}
              canViewFinancial={canViewFinancial()}
            />
          ) : (
            <Card variant="default" padded="md" elevated className="animate-pulse">
              <div className="space-y-4">
                <div className="h-5 w-1/3 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-5/6 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded mt-2" />
              </div>
            </Card>
          )}

          {/* Tabs */}
          {event ? (
            <div className="mt-0">
              {/* Sticky tab bar — frosted glass */}
              <div className="sticky top-16 lg:top-0 z-20 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 py-2.5">
                <div>
                  <nav
                    className="flex gap-1 overflow-x-auto scrollbar-hide bg-gray-100/80 dark:bg-background-800/60 rounded-xl p-1"
                    role="tablist"
                    aria-label={t('event:tabs.ariaLabel', 'Event sections')}
                  >
                    {showScheduleTab && (
                      <EventTab
                        label={t('event:tabs.schedule')}
                        tabKey="schedule"
                        icon={FiCalendar}
                        isActive={activeTab === 'schedule'}
                        count={tabCounts.schedule?.count}
                        onClick={() => setActiveTab('schedule')}
                      />
                    )}
                    {showParticipantsTab && (
                      <EventTab
                        label={t('event:tabs.participants', 'Participantes')}
                        tabKey="participants"
                        icon={FiUserCheck}
                        isActive={activeTab === 'participants'}
                        count={event.participantCount ?? 0}
                        onClick={() => setActiveTab('participants')}
                      />
                    )}
                    {showSuppliersTab && (
                      <EventTab
                        label={t('event:tabs.suppliers')}
                        tabKey="suppliers"
                        icon={FiTruck}
                        isActive={activeTab === 'suppliers'}
                        count={tabCounts.suppliers.count}
                        hasPending={tabCounts.suppliers.pendingCount > 0}
                        pendingType="approval"
                        pendingLabel={t('event:tabs.pendingApproval', 'pending approval')}
                        onClick={() => setActiveTab('suppliers')}
                      />
                    )}
                    {showDocumentsTab && (
                      <EventTab
                        label={t('event:tabs.documents')}
                        tabKey="documents"
                        icon={FiFileText}
                        isActive={activeTab === 'documents'}
                        onClick={() => setActiveTab('documents')}
                      />
                    )}
                    {showTeamTab && (
                      <EventTab
                        label={t('event:tabs.team')}
                        tabKey="team"
                        icon={FiUsers}
                        isActive={activeTab === 'team'}
                        count={tabCounts.team.count}
                        hasPending={tabCounts.team.pendingCount > 0}
                        pendingType="invite"
                        pendingLabel={t('event:tabs.pendingInvites', 'pending invitations')}
                        onClick={() => setActiveTab('team')}
                      />
                    )}
                  </nav>
                </div>
              </div>

              {/* Tab panel */}
              <PullToRefresh onRefresh={refetch}>
                <div
                  id={`tabpanel-${activeTab}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${activeTab}`}
                  className="mt-4 relative"
                >
                  <TabContent
                    activeTab={activeTab}
                    eventId={eventId}
                    eventCurrency={event?.currency}
                    showDocumentsTab={showDocumentsTab}
                    showSuppliersTab={showSuppliersTab}
                    showTeamTab={showTeamTab}
                    showScheduleTab={showScheduleTab}
                    showParticipantsTab={showParticipantsTab}
                    permissions={permissions}
                  />
                </div>
              </PullToRefresh>
            </div>
          ) : (
            <div className="animate-pulse mt-0">
              <div className="py-2.5">
                <div className="flex gap-1 bg-gray-100/80 dark:bg-background-800/60 rounded-xl p-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-muted/60 rounded-lg" />
                  ))}
                </div>
              </div>
              <Card variant="default" padded="md" elevated className="mt-4">
                <div className="space-y-4">
                  <div className="h-5 w-48 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

// ============================================================
// PROP TYPES
// ============================================================

StatusComponent.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  className: PropTypes.string
};

EventContent.propTypes = {
  event: PropTypes.object.isRequired,
  handleEditEventClick: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
};

export default memo(EventDetails);
