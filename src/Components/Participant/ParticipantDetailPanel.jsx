import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import {
  FiMail, FiEdit2, FiChevronDown,
  FiUser, FiCreditCard, FiNavigation, FiHome, FiUsers,
} from 'react-icons/fi';
import DetailPanelShell from '../UI/DetailPanelShell';
import ParticipantAvatar from './ParticipantAvatar';
import RoleBadge from './RoleBadge';
import StatusBadge from './StatusBadge';
import { useRoleLookup } from '../../Hook/useRoleLookup';
import { useListDependentsByParticipantEnhancedQuery } from '../../Api/services/dependentsApi';
import { Text } from '../UI';

// --- Simple field display (2-col grid item) ---
const Field = ({ label, value, noValue }) => (
  <div className="py-1.5">
    <Text variant="caption" className="font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>
      {label}
    </Text>
    <Text variant="body2" className={`font-medium mt-0.5 break-words ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
      {value || noValue}
    </Text>
  </div>
);

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  noValue: PropTypes.node,
};

// --- Boolean tag ---
const BoolTag = ({ label, active }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      active
        ? 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400'
        : 'bg-muted text-muted-foreground'
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        active ? 'bg-success' : 'bg-border'
      }`}
    />
    {label}
  </span>
);

BoolTag.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
};

// --- Collapsible Section ---
const SECTION_COLORS = {
  contact: '#3B82F6',
  identification: '#F59E0B',
  travel: '#10B981',
  accommodation: '#8B5CF6',
  dependents: '#EC4899',
};

const CollapsibleSection = ({ icon: Icon, sectionKey, title, children, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const color = SECTION_COLORS[sectionKey] || '#6B7280';

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent transition-colors"
      >
        <span
          className="flex items-center justify-center flex-shrink-0 rounded-lg"
          style={{
            width: 30,
            height: 30,
            backgroundColor: color + '14',
            color,
          }}
        >
          <Icon size={15} />
        </span>
        <Text variant="body2" className="font-semibold flex-1 text-left text-foreground">
          {title}
        </Text>
        {badge != null && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: color + '18', color }}
          >
            {badge}
          </span>
        )}
        <FiChevronDown
          size={16}
          className="text-neutral-400 dark:text-neutral-500 flex-shrink-0 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
};

CollapsibleSection.propTypes = {
  icon: PropTypes.elementType.isRequired,
  sectionKey: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  defaultOpen: PropTypes.bool,
  badge: PropTypes.number,
};

// --- Currency formatter ---
const formatCurrency = (amount, currency) => {
  if (amount == null || amount === '') return null;
  return currency ? `${amount} ${currency}` : String(amount);
};

const ParticipantDetailPanel = ({ participant, onClose, onEdit, onEmail, permissions }) => {
  const { t } = useTranslation('participant');
  const { getRoleName, getRoleColor } = useRoleLookup();
  const nv = t('participantsV2.detailPanel.noValue', '—');

  // Fetch dependents for this participant
  const { data: dependentsData } = useListDependentsByParticipantEnhancedQuery(
    { participantId: participant?.id },
    { skip: !participant?.id }
  );
  const dependents = dependentsData?.items || [];

  // Block body scroll when panel is open
  useEffect(() => {
    if (participant) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [participant]);

  // Panel opens at 85% of the viewport by default; the resize handle then
  // lets the user adjust it to whatever size they want.
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1600;
  const defaultWidth = Math.round(viewportWidth * 0.85);
  const maxWidth = Math.round(viewportWidth * 0.98);

  const p = participant;
  const roleName = p ? getRoleName(p.roleId, p.role?.name) : null;

  return (
    <DetailPanelShell
      isOpen={!!participant}
      onClose={onClose}
      ariaLabel={p?.participantName || t('participantsV2.detailPanel.title', 'Participant details')}
      resizable
      defaultWidth={defaultWidth}
      minWidth={520}
      maxWidth={maxWidth}
      storageKey="participantDetailPanelWidth"
      headerActions={p && (
        <>
          {permissions?.canManageParticipants && (
            <button
              type="button"
              onClick={() => onEdit?.(p)}
              aria-label={t('participantsV2.detailPanel.actions.edit', 'Editar Participante')}
              title={t('participantsV2.detailPanel.actions.edit', 'Editar Participante')}
              className="p-2 rounded-full text-muted-foreground hover:text-secondary-600 dark:hover:text-secondary-400 hover:bg-muted transition-colors"
            >
              <FiEdit2 size={16} />
            </button>
          )}
          {permissions?.canSendEmails && onEmail && (
            <button
              type="button"
              onClick={() => onEmail(p)}
              aria-label={t('participantTable.actionButtons.sendEmail', 'Send Email')}
              title={t('participantTable.actionButtons.sendEmail', 'Send Email')}
              className="p-2 rounded-full text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 hover:bg-muted transition-colors"
            >
              <FiMail size={16} />
            </button>
          )}
        </>
      )}
    >
      {p && (
        <>
          {/* Identity header */}
          <div className="px-5 py-5 border-b border-border">
            <div className="flex items-center gap-3.5 min-w-0">
              <ParticipantAvatar participant={p} size="lg" />
              <div className="min-w-0">
                <Text variant="subtitle1" className="font-semibold truncate">
                  {p.participantName}
                </Text>
                {(p.participantJob || p.organization) && (
                  <Text variant="body2" className="truncate text-muted-foreground">
                    {[p.participantJob, p.organization].filter(Boolean).join(' · ')}
                  </Text>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge roleName={roleName} colorKey={getRoleColor(p?.roleId)} />
                  <StatusBadge status={p.participantStatus} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Basic */}
          <CollapsibleSection
            icon={FiUser}
            sectionKey="contact"
            title={t('participantsV2.detailPanel.sections.contact', 'Contacto & Info')}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <Field label={t('participantsV2.detailPanel.fields.email', 'Email')} value={p.participantEmail} noValue={nv} />
              <Field label={t('participantsV2.detailPanel.fields.phone', 'Telefone')} value={p.participantPhone} noValue={nv} />
              <Field label={t('participantsV2.detailPanel.fields.organization', 'Organizacao')} value={p.organization} noValue={nv} />
              <Field label={t('participantsV2.detailPanel.fields.job', 'Cargo')} value={p.participantJob} noValue={nv} />
            </div>
            {p.participantNote && (
              <div className="mt-2 pt-2 border-t border-border">
                <Field label={t('participantsV2.detailPanel.fields.notes', 'Notas')} value={p.participantNote} noValue={nv} />
              </div>
            )}
          </CollapsibleSection>

          {/* Identification */}
          <CollapsibleSection
            icon={FiCreditCard}
            sectionKey="identification"
            title={t('participantsV2.formModal.tabs.identification', 'Identificacao')}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <Field label={t('participantsV2.formModal.fields.documentationType', 'Tipo de Documento')} value={p.documentationType} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.documentLast4', 'Ultimos 4 digitos')} value={p.documentLast4} noValue={nv} />
              <Field label={t('participantsV2.detailPanel.fields.nationality', 'Nacionalidade')} value={p.nationality} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.residenceCountry', 'Pais de Residencia')} value={p.residenceCountry} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.emergencyContact', 'Contacto Emergencia')} value={p.emergencyContact} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.internalId', 'ID Interno')} value={p.internalId} noValue={nv} />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <BoolTag label={t('participantsV2.formModal.sections.visaRequired', 'Visto Necessario')} active={p.visaRequired} />
              <BoolTag label={t('participantsV2.formModal.sections.visaSupport', 'Suporte de Visto')} active={p.visaSupport} />
            </div>
          </CollapsibleSection>

          {/* Travel */}
          <CollapsibleSection
            icon={FiNavigation}
            sectionKey="travel"
            title={t('participantsV2.formModal.tabs.travel', 'Viagem')}
          >
            {/* Arrival */}
            <div className="mb-3">
              <Text variant="caption" className="font-semibold uppercase tracking-wide text-success" style={{ letterSpacing: '0.04em' }}>
                {t('participantsV2.formModal.sections.arrival', 'Chegada')}
              </Text>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1">
                <Field label={t('participantsV2.formModal.fields.arrivalDate', 'Data')} value={p.arrivalDate} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.arrivalTime', 'Hora')} value={p.arrivalTime} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.arrivalFlight', 'Voo')} value={p.arrivalFlight} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.arrivalAirport', 'Aeroporto')} value={p.arrivalAirport} noValue={nv} />
              </div>
              {p.arrivalLayovers && (
                <Field label={t('participantsV2.formModal.fields.arrivalLayovers', 'Escalas')} value={p.arrivalLayovers} noValue={nv} />
              )}
            </div>

            {/* Departure */}
            <div className="mb-3 pt-3 border-t border-border">
              <Text variant="caption" className="font-semibold uppercase tracking-wide text-error" style={{ letterSpacing: '0.04em' }}>
                {t('participantsV2.formModal.sections.departure', 'Partida')}
              </Text>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1">
                <Field label={t('participantsV2.formModal.fields.departureDate', 'Data')} value={p.departureDate} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.departureTime', 'Hora')} value={p.departureTime} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.departureFlight', 'Voo')} value={p.departureFlight} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.departureAirport', 'Aeroporto')} value={p.departureAirport} noValue={nv} />
              </div>
            </div>

            {/* Transfer */}
            <div className="mb-3 pt-3 border-t border-border">
              <div className="flex items-center gap-3 mb-1">
                <BoolTag label={t('participantsV2.formModal.sections.transferRequired', 'Transfer necessario')} active={p.transferRequired} />
              </div>
              {p.transferRequired && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1">
                  <Field label={t('participantsV2.formModal.fields.transferDetails', 'Detalhes')} value={p.transferDetails} noValue={nv} />
                  <Field label={t('participantsV2.formModal.fields.transferCost', 'Custo')} value={formatCurrency(p.transferCost, p.transferCurrency)} noValue={nv} />
                </div>
              )}
            </div>

            {/* Travel Costs */}
            <div className="pt-3 border-t border-border">
              <Text variant="caption" className="font-semibold uppercase tracking-wide text-warning" style={{ letterSpacing: '0.04em' }}>
                {t('participantsV2.formModal.sections.travelCosts', 'Custos de Viagem')}
              </Text>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1">
                <Field label={t('participantsV2.formModal.fields.ticketFare', 'Valor do Bilhete')} value={formatCurrency(p.ticketFare, p.ticketCurrency)} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.taxesExtras', 'Taxas / Extras')} value={formatCurrency(p.taxesExtras, p.taxesCurrency)} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.totalTravelCost', 'Custo Total')} value={formatCurrency(p.totalTravelCost, p.totalTravelCurrency)} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.paymentStatus', 'Estado Pagamento')} value={p.paymentStatus} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.bookingReference', 'Ref. Reserva')} value={p.bookingReference} noValue={nv} />
                <Field label={t('participantsV2.formModal.fields.bookingAgency', 'Agencia')} value={p.bookingAgency} noValue={nv} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Accommodation */}
          <CollapsibleSection
            icon={FiHome}
            sectionKey="accommodation"
            title={t('participantsV2.formModal.tabs.accommodation', 'Alojamento')}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <Field label={t('participantsV2.formModal.fields.hotel', 'Hotel')} value={p.hotel} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.roomType', 'Tipo de Quarto')} value={p.roomType} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.checkIn', 'Check-in')} value={p.checkInDate} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.checkOut', 'Check-out')} value={p.checkOutDate} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.nights', 'Noites')} value={p.nights != null ? String(p.nights) : null} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.ratePerNight', 'Tarifa/Noite')} value={formatCurrency(p.ratePerNight, p.rateCurrency)} noValue={nv} />
              <Field label={t('participantsV2.formModal.fields.accommodationCost', 'Custo Total')} value={formatCurrency(p.accommodationCost, p.rateCurrency)} noValue={nv} />
            </div>
          </CollapsibleSection>

          {/* Dependents */}
          <CollapsibleSection
            icon={FiUsers}
            sectionKey="dependents"
            title={t('participantsV2.formModal.tabs.dependents', 'Acompanhantes')}
            badge={dependents.length > 0 ? dependents.length : null}
          >
            {dependents.length > 0 ? (
              <div className="space-y-3">
                {dependents.map((dep, idx) => (
                  <div
                    key={dep.id}
                    className="p-3 rounded-lg border border-border bg-muted"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Text variant="body2" className="font-semibold text-foreground">
                          {dep.name || `${t('participantsV2.detailPanel.fields.dependent', 'Acompanhante')} ${idx + 1}`}
                        </Text>
                        {dep.category && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase"
                            style={{
                              backgroundColor: dep.category === 'child' ? '#FEF3C7' : dep.category === 'baby' ? '#DBEAFE' : '#F3E8FF',
                              color: dep.category === 'child' ? '#92400E' : dep.category === 'baby' ? '#1E40AF' : '#6B21A8',
                            }}
                          >
                            {t(`participantsV2.formModal.dependents.category.${dep.category}`, dep.category)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {dep.age != null && (
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500">{t('participantsV2.formModal.dependents.age', 'Idade')}:</span>{' '}
                          <span className="text-foreground font-medium">{dep.age}</span>
                        </div>
                      )}
                      {dep.documentNumber && (
                        <div className="col-span-2">
                          <span className="text-neutral-400 dark:text-neutral-500">{t('participantsV2.formModal.dependents.documentNumber', 'Documento')}:</span>{' '}
                          <span className="text-foreground font-medium">{dep.documentNumber}</span>
                        </div>
                      )}
                      {dep.notes && (
                        <div className="col-span-2 mt-1 pt-2 border-t border-border">
                          <span className="text-neutral-400 dark:text-neutral-500 text-[10px] uppercase font-semibold">{t('participantsV2.formModal.dependents.notes', 'Notas')}:</span>
                          <p className="text-muted-foreground mt-0.5">{dep.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text variant="body2" className="text-muted-foreground">{nv}</Text>
            )}
          </CollapsibleSection>
        </>
      )}
    </DetailPanelShell>
  );
};

ParticipantDetailPanel.propTypes = {
  participant: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onEmail: PropTypes.func,
  permissions: PropTypes.object,
};

export default ParticipantDetailPanel;
