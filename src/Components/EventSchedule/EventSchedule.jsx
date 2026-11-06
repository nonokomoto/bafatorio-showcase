import { memo, useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiInfo } from 'react-icons/fi';
import { useGetEventAsCollaboratorQuery } from '../../Api/services/collaboratorApi';
import { useListScheduleEntriesByEventQuery } from '../../Api/services/scheduleApi';
import { useListSuppliersEnhancedQuery } from '../../Api/services/supplierApi';
import { useListEventSuppliersByEventEnhancedQuery } from '../../Api/services/eventSupplierApi';
import { useListParticipantsByEventLambdaQuery } from '../../Api/services/participantApi';
import { useAuthz } from '../../Hook/useAuthz';
import { Text, Card, Button } from '../UI';
import ScheduleCalendar from './ScheduleCalendar';
import ScheduleEntryFormModal from './ScheduleEntryFormModal';

const EventSchedule = memo(({ eventId, canCreate: canCreateRole = false }) => {
  const { t } = useTranslation(['schedule', 'event']);

  const { data: accessData } = useGetEventAsCollaboratorQuery({ eventId }, { skip: !eventId });
  const event = accessData?.event;

  // Staff restrito (ADR-029, 2026-07-16): vê só as suas entradas até o organizador
  // ligar o acesso. Sem esta nota, a agenda quase vazia parecia um bug.
  const isRestrictedStaff =
    accessData?.userRole === 'STAFF_LOGISTICS' && !accessData?.canViewTeamSchedule;

  // RBAC ∧ entitlement: em evento read-only o botão de criar, o slot select e
  // o editar-ao-clicar saem — o ReadOnlyBanner da página explica o motivo.
  // (O submit do FormModal já era gated; isto trava na porta de entrada.)
  const { writable } = useAuthz(eventId);
  const canCreate = canCreateRole && writable;

  const { data, isLoading } = useListScheduleEntriesByEventQuery(
    { eventId },
    { skip: !eventId }
  );
  const entries = data?.items ?? [];
  const authors = data?.authors ?? [];

  const { data: suppliersData } = useListSuppliersEnhancedQuery(undefined, { skip: !eventId });
  
  const { data: eventSuppliersData } = useListEventSuppliersByEventEnhancedQuery(
    { eventId },
    { skip: !eventId }
  );

  const supplierMap = useMemo(() => {
    const map = new Map();
    // 1. Add global suppliers owned by the user (if any)
    (suppliersData?.items || []).forEach((s) => map.set(s.id, s));
    // 2. Add suppliers linked to this event (collaborator-aware)
    (eventSuppliersData?.items || []).forEach((es) => {
      if (es.supplier) map.set(es.supplier.id, es.supplier);
    });
    return map;
  }, [suppliersData, eventSuppliersData]);

  // Só pedimos participantes se alguma entrada os usar. A Agenda é a primeira
  // tab do evento, portanto a cache da tab de Participantes está fria quando
  // isto corre — o pedido é real, e a query devolve o participante inteiro
  // (documentos, vistos, hotel, contacto de emergência) para resolvermos nomes.
  // Numa agenda sem participantes ligados, custaria isso tudo por nada.
  const needsParticipantNames = entries.some((e) => e.participantIds?.length > 0);
  const { data: participantsData } = useListParticipantsByEventLambdaQuery(
    { eventId },
    { skip: !eventId || !needsParticipantNames }
  );

  // Map, não .find(): resolver os nomes de N entradas contra P participantes
  // seria O(N×P) — com hash lookup é O(N), e um evento tem centenas de
  // participantes.
  const participantMap = useMemo(() => {
    const map = new Map();
    (participantsData?.items || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [participantsData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState({ date: undefined, time: undefined });
  const [editingEntry, setEditingEntry] = useState(null);

  const handleOpenForm = useCallback(({ date, time } = {}) => {
    setEditingEntry(null);
    setFormDefaults({ date, time });
    setIsFormOpen(true);
  }, []);

  const handleEditEntry = useCallback((entry) => {
    setEditingEntry(entry);
    setFormDefaults({ date: undefined, time: undefined });
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingEntry(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Text variant="body2">{t('schedule:loading')}</Text>
      </div>
    );
  }

  const formModal = (
    <ScheduleEntryFormModal
      eventId={eventId}
      isOpen={isFormOpen}
      onClose={handleCloseForm}
      entry={editingEntry}
      defaultDate={formDefaults.date}
      defaultTime={formDefaults.time}
    />
  );

  return (
    <Card variant="default" padded="lg" elevated className="animate-fade-in">
      {canCreate && (
        <div className="flex justify-end mb-3 lg:flex hidden">
          <Button variant="primary" size="sm" onClick={handleOpenForm}>
            {t('event:fab.addScheduleEntry')}
          </Button>
        </div>
      )}
      {/* Hidden trigger for ContextualFAB (mobile) */}
      <button id="fab-action-schedule" type="button" className="sr-only" aria-hidden="true" onClick={handleOpenForm} />
      {isRestrictedStaff && (
        <div className="flex items-start gap-2 mb-3 p-3 bg-background-50 dark:bg-background-800/30 rounded-lg border border-border">
          <FiInfo className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <Text variant="caption" className="text-muted-foreground">
            {t('schedule:restrictedStaffNotice')}
          </Text>
        </div>
      )}
      <ScheduleCalendar
        event={event}
        entries={entries}
        authors={authors}
        supplierMap={supplierMap}
        participantMap={participantMap}
        canCreate={canCreate}
        onSlotSelect={canCreate ? handleOpenForm : undefined}
        onEditEntry={canCreate ? handleEditEntry : undefined}
      />
      {formModal}
    </Card>
  );
});

EventSchedule.displayName = 'EventSchedule';

EventSchedule.propTypes = {
  eventId: PropTypes.string.isRequired,
  canCreate: PropTypes.bool,
};

export default EventSchedule;
