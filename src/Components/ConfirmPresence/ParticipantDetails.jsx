import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { FiUser, FiUsers, FiMail, FiPhone, FiBriefcase, FiFileText, FiCheck, FiCheckSquare, FiSquare } from "react-icons/fi";
import { useTranslation } from 'react-i18next';
import { Text, Button, Card, Badge } from '../UI';
import AlertPopup from '../Layout/AlertPopUp';
import RoleBadge from '../Participant/RoleBadge';
import { useRoleLookup } from '../../Hook/useRoleLookup';
import { useAuthz, writeBlockedTitle } from '../../Hook/useAuthz';

const ParticipantDetails = ({
  eventId,
  selectedParticipant = null,
  dependentCount = 0,
  dependents = [],
  searchedDependentId = null, // ID of dependent that was searched (for highlighting)
  isUpdating,
  confirmPresence,
  setLastUpdate,
  setSelectedParticipant,
  onDependentsUpdated
}) => {
  const { t } = useTranslation('participant');
  const { getRoleName, getRoleColor } = useRoleLookup();

  // Gate cosmético (§4b): check-in é escrita — fora da janela o botão desativa
  // com o motivo (a Lambda confirm-participant é a autoridade). No dia do
  // evento a janela está sempre aberta; isto só trava eventos velhos.
  const { writable, reason: accessReason } = useAuthz(eventId);

  // State for tracking which dependents are selected for confirmation
  const [selectedDependents, setSelectedDependents] = useState({});
  const [alertError, setAlertError] = useState(false);
  
  // State for including participant in confirmation (default: true when not already attended)
  const [includeParticipant, setIncludeParticipant] = useState(true);

  // Get dependents for this participant
  const participantDependents = useMemo(() => {
    if (!selectedParticipant || !dependents) return [];
    return dependents.filter(d => d.participantId === selectedParticipant.id);
  }, [selectedParticipant, dependents]);

  // Reset selections when participant changes
  useEffect(() => {
    if (selectedParticipant) {
      // Reset includeParticipant to true (only if not already attended)
      setIncludeParticipant(selectedParticipant.participantStatus !== 'ATTENDED');
      
      if (participantDependents.length > 0) {
        const initialSelection = {};
        participantDependents.forEach(dep => {
          // If this was the searched dependent, always pre-select it (if not already attended)
          if (searchedDependentId && dep.id === searchedDependentId) {
            initialSelection[dep.id] = dep.status !== 'ATTENDED';
          } else {
            // Pre-select if participant is not yet attended and dependent is not attended
            const isParticipantNotAttended = selectedParticipant.participantStatus !== 'ATTENDED';
            initialSelection[dep.id] = isParticipantNotAttended && dep.status !== 'ATTENDED';
          }
        });
        setSelectedDependents(initialSelection);
      } else {
        setSelectedDependents({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on participant id by design; depending on the whole object would reset selections on every optimistic status change
  }, [selectedParticipant?.id, searchedDependentId, participantDependents]);

  if (!selectedParticipant) return null;

  // Mapeamento de status para configurações visuais
  const statusConfig = {
    ATTENDED: { 
      variant: 'success', 
      tone: 'soft',
      text: t(`participantDetails.status.ATTENDED.label`)
    },
    PENDING: { 
      variant: 'warning', 
      tone: 'soft',
      text: t(`participantDetails.status.PENDING.label`)
    },
    CANCELLED: { 
      variant: 'error', 
      tone: 'soft',
      text: t(`participantDetails.status.CANCELLED.label`)
    },
    REGISTERED: { 
      variant: 'primary', 
      tone: 'soft',
      text: t(`participantDetails.status.REGISTERED.label`)
    }
  };

  const status = statusConfig[selectedParticipant.participantStatus] || statusConfig.REGISTERED;

  // Roles são livres e por evento (ADR-018): mostra-se o nome real via RoleBadge,
  // sem taxonomia fixa. Sem role, o badge não é renderizado.
  const roleName = getRoleName(selectedParticipant?.roleId);
  const roleColor = getRoleColor(selectedParticipant?.roleId);

  // Cores semânticas por ícone (padrão do projeto)
  const iconColors = {
    mail: 'text-sky-500',
    phone: 'text-green-500',
    job: 'text-violet-500',
    dependents: 'text-blue-500',
    note: 'text-amber-500',
  };

  // Age label mapping
  const getAgeLabel = (age) => {
    const ageLabels = {
      baby: t('participantDetails.dependents.ageLabels.baby', 'Bebé'),
      child: t('participantDetails.dependents.ageLabels.child', 'Criança'),
      adult: t('participantDetails.dependents.ageLabels.adult', 'Adulto')
    };
    return ageLabels[age] || age;
  };

  // Toggle individual dependent selection
  const toggleDependentSelection = (dependentId) => {
    setSelectedDependents(prev => ({
      ...prev,
      [dependentId]: !prev[dependentId]
    }));
  };

  // Select/deselect all unconfirmed dependents
  const toggleAllDependents = () => {
    const unconfirmed = participantDependents.filter(d => d.status !== 'ATTENDED');
    const allSelected = unconfirmed.every(d => selectedDependents[d.id]);
    const newSelection = { ...selectedDependents };
    unconfirmed.forEach(dep => {
      newSelection[dep.id] = !allSelected;
    });
    setSelectedDependents(newSelection);
  };

  // Count of selected dependents (excluding already attended)
  const selectedCount = participantDependents.filter(d => 
    selectedDependents[d.id] && d.status !== 'ATTENDED'
  ).length;

  // Count of already attended dependents
  const attendedCount = participantDependents.filter(d => d.status === 'ATTENDED').length;

  // Unconfirmed dependents list and flag
  const unconfirmedDependents = participantDependents.filter(d => d.status !== 'ATTENDED');
  const hasUnconfirmedDependents = unconfirmedDependents.length > 0;

  // Processing and status flags - defined early as needed by other logic
  const isProcessing = isUpdating;
  const isAlreadyAttended = selectedParticipant.participantStatus === "ATTENDED";

  // Can perform action: need at least one selection (participant or dependents)
  const canConfirm = (includeParticipant && !isAlreadyAttended) || selectedCount > 0;

  // Total count for button text
  const totalToConfirm = (includeParticipant && !isAlreadyAttended ? 1 : 0) + selectedCount;

  // Get button text based on context
  const getButtonText = () => {
    if (isProcessing) {
      return t('participantDetails.buttons.confirm.processing');
    }
    
    // Nothing selected
    if (totalToConfirm === 0) {
      if (isAlreadyAttended && !hasUnconfirmedDependents) {
        return t('participantDetails.buttons.confirm.confirmed');
      }
      return t('participantDetails.buttons.confirm.default');
    }
    
    // Only dependents (participant already attended or not included)
    if (!includeParticipant || isAlreadyAttended) {
      return t('participantDetails.buttons.confirm.dependentsOnly', { count: selectedCount }, `Confirmar ${selectedCount} acompanhante(s)`);
    }
    
    // Participant + dependents
    if (selectedCount > 0) {
      return t('participantDetails.buttons.confirm.withDependents', { count: totalToConfirm }, `Confirmar ${totalToConfirm} presenças`);
    }
    
    // Just participant
    return t('participantDetails.buttons.confirm.default');
  };

  const handleConfirmPresence = async () => {
    try {
      // Fail fast: never confirm a participant that belongs to a different event than
      // the one currently being viewed. Same-name participants exist across events, and a
      // stale selection would otherwise write attendance to the wrong event's record.
      if (selectedParticipant.eventId && selectedParticipant.eventId !== eventId) {
        console.error('Participante pertence a outro evento; confirmação abortada', {
          selected: selectedParticipant.eventId,
          current: eventId,
        });
        setAlertError(true);
        return;
      }

      const attendedTimestamp = new Date().toISOString();

      // Prepare dependent updates (only selected ones that aren't already attended)
      const dependentUpdates = participantDependents
        .filter(dep => selectedDependents[dep.id] && dep.status !== 'ATTENDED')
        .map(dep => ({
          id: dep.id,
          status: 'ATTENDED',
          attendedDate: attendedTimestamp
        }));

      const shouldUpdateParticipant = includeParticipant && !isAlreadyAttended;

      // Single Lambda call handles both participant + dependent check-in.
      // The confirmPresence mutation patches the list cache optimistically (onQueryStarted),
      // so the confirmed list updates instantly and rolls back itself on failure.
      // eventId comes from the current event context (prop), not from the participant
      // object — this makes the Lambda's `eventId = :eventId` ConditionExpression a real
      // guard against cross-event writes instead of an always-satisfied no-op.
      const response = await confirmPresence({
        eventId,
        ...(shouldUpdateParticipant && {
          participantId: selectedParticipant.id,
          participantStatus: "ATTENDED",
          attendedDate: attendedTimestamp,
        }),
        ...(dependentUpdates.length > 0 && {
          dependentUpdates,
        }),
      }).unwrap();

      if (!response?.success) {
        throw new Error(response?.message || t('participantDetails.feedback.error'));
      }

      if (shouldUpdateParticipant) {
        setSelectedParticipant({
          ...selectedParticipant,
          participantStatus: "ATTENDED",
          updatedAt: new Date()
        });
      }

      // Notify parent to refresh dependents
      if (dependentUpdates.length > 0 && onDependentsUpdated) {
        onDependentsUpdated();
      }

      setLastUpdate(new Date());

      // Clear dependent selections after successful confirmation
      if (dependentUpdates.length > 0) {
        const newSelection = { ...selectedDependents };
        dependentUpdates.forEach(dep => {
          newSelection[dep.id] = false;
        });
        setSelectedDependents(newSelection);
      }

    } catch (error) {
      // The mutation's onQueryStarted already rolled back the optimistic cache patch.
      console.error(t('participantDetails.feedback.error'), error);
      setAlertError(true);
    }
  };

  return (
    <>
    {/* Sem borda: o card já vive dentro do painel da pesquisa e o estado está no badge */}
    <Card
      elevated="sm"
      bordered={false}
      className="mt-4 animate__animated animate__fadeIn animate__faster overflow-hidden bg-card shadow-sm"
    >
      <div className="p-4">
        {/* Header com badge de status */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <FiUser className="text-primary-500 dark:text-primary-400" size={20} />
              <Text
                variant="h5"
                weight="medium"
              >
                {selectedParticipant.participantName}
              </Text>
            </div>
            {roleName && (
              <div className="mt-1.5 ml-8">
                <RoleBadge roleName={roleName} colorKey={roleColor} />
              </div>
            )}
          </div>
          
          <Badge 
            variant={status.variant} 
            tone={status.tone}
            size="sm"
          >
            {status.text}
          </Badge>
        </div>
        
        {/* Linha separadora */}
        <div className="h-px w-full bg-border mb-3"></div>
        
        {/* Informações do participante */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-foreground">
            <FiMail className={`${iconColors.mail} w-4 h-4 flex-shrink-0`} />
            <Text variant="body2" className="text-foreground">
              {selectedParticipant.participantEmail || t('states.unavailable')}
            </Text>
          </div>

          <div className="flex items-center gap-2 text-foreground">
            <FiPhone className={`${iconColors.phone} w-4 h-4 flex-shrink-0`} />
            <Text variant="body2" className="text-foreground">
              {selectedParticipant.participantPhone || t('states.unavailable')}
            </Text>
          </div>

          <div className="flex items-center gap-2 text-foreground">
            <FiBriefcase className={`${iconColors.job} w-4 h-4 flex-shrink-0`} />
            <Text variant="body2" className="text-foreground">
              {t('participantDetails.fields.job')}: {selectedParticipant.participantJob || t('states.unavailable')}
            </Text>
          </div>

          <div className="flex items-center gap-2 text-foreground">
            <FiUsers className={`${iconColors.dependents} w-4 h-4 flex-shrink-0`} />
            <Text variant="body2" className="text-foreground">
              {t('participantDetails.fields.dependents')}: {dependentCount}
            </Text>
          </div>

          {selectedParticipant.participantNote && (
            <div className="flex items-start gap-2 text-foreground mt-2 border-t border-border pt-3">
              <FiFileText className={`${iconColors.note} w-4 h-4 flex-shrink-0 mt-1`} />
              <div>
                <Text variant="small" color="muted" className="mb-0.5 text-muted-foreground">
                  {t('participantDetails.fields.note')}
                </Text>
                <Text variant="body2" className="text-foreground">
                  {selectedParticipant.participantNote}
                </Text>
              </div>
            </div>
          )}
        </div>

        {/* Dependents Section - Only show if there are dependents */}
        {participantDependents.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <Text variant="body1" weight="medium" className="text-foreground">
                {t('participantDetails.dependents.title', 'Acompanhantes')}
              </Text>
              {/* Show toggle if there are unconfirmed dependents */}
              {hasUnconfirmedDependents && (
                <button
                  onClick={toggleAllDependents}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1.5 transition-colors"
                >
                  {unconfirmedDependents.every(d => selectedDependents[d.id]) ? (
                    <>
                      <FiSquare size={14} />
                      {t('participantDetails.dependents.deselectAll', 'Desmarcar todos')}
                    </>
                  ) : (
                    <>
                      <FiCheckSquare size={14} />
                      {t('participantDetails.dependents.selectAll', 'Marcar todos')}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Dependents list with checkboxes */}
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {participantDependents.map((dependent) => {
                const isAttended = dependent.status === 'ATTENDED';
                const isSelected = selectedDependents[dependent.id];
                const isSearched = searchedDependentId === dependent.id;
                
                return (
                  <div
                    key={dependent.id}
                    onClick={() => !isAttended && toggleDependentSelection(dependent.id)}
                    className={`
                      flex items-center gap-3 p-2.5 rounded-lg transition-all
                      ${isSearched && !isAttended ? 'border-l-3 border-l-primary-500' : ''}
                      ${isAttended
                        ? 'bg-success-50 dark:bg-success-900/20 cursor-default'
                        : isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30'
                          : 'bg-muted cursor-pointer hover:bg-accent'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <div className={`
                      w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors
                      ${isAttended
                        ? 'bg-success-500 text-white'
                        : isSelected
                          ? 'bg-primary-500 text-white'
                          : 'border-2 border-border'
                      }
                    `}>
                      {(isAttended || isSelected) && <FiCheck size={14} />}
                    </div>

                    {/* Dependent info */}
                    <div className="flex-1 min-w-0">
                      <Text
                        variant="body2"
                        weight="medium"
                        className={`truncate ${isAttended ? 'text-success-700 dark:text-success-300' : 'text-foreground'}`}
                      >
                        {dependent.name}
                      </Text>
                      <Text
                        variant="small"
                        className={isAttended ? 'text-success-600 dark:text-success-400' : 'text-muted-foreground'}
                      >
                        {getAgeLabel(dependent.age)}
                      </Text>
                    </div>

                    {/* Status badge for attended */}
                    {isAttended && (
                      <Badge variant="success" tone="soft" size="xs">
                        {t('participantDetails.dependents.attended', 'Presente')}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary - show when there are unconfirmed dependents */}
            {hasUnconfirmedDependents && (
              <div className="mt-2 text-sm text-muted-foreground">
                {attendedCount > 0 && (
                  <span className="text-success-600 dark:text-success-400">
                    {t('participantDetails.dependents.alreadyAttended', { count: attendedCount }, `${attendedCount} já confirmado(s)`)}
                  </span>
                )}
                {attendedCount > 0 && selectedCount > 0 && ' • '}
                {selectedCount > 0 && (
                  <span>
                    {t('participantDetails.dependents.toConfirm', { count: selectedCount }, `${selectedCount} selecionado(s) para confirmar`)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Action section */}
        <div className="mt-4 pt-3 border-t border-border">
          {/* Participant toggle - only show if not already attended and has selected dependents */}
          {!isAlreadyAttended && selectedCount > 0 && (
            <div
              onClick={() => setIncludeParticipant(!includeParticipant)}
              className="mb-3 flex items-center gap-2.5 cursor-pointer group"
            >
              <div className={`
                w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors
                ${includeParticipant
                  ? 'bg-primary-500 text-white'
                  : 'border border-border'
                }
              `}>
                {includeParticipant && <FiCheck size={10} />}
              </div>
              <Text
                variant="small"
                className="text-muted-foreground group-hover:text-foreground transition-colors"
              >
                {t('participantDetails.includeParticipant', 'Incluir participante')}
              </Text>
            </div>
          )}
          
          <Button
            onClick={handleConfirmPresence}
            disabled={isProcessing || !canConfirm || !writable}
            title={writeBlockedTitle(t, { writable, reason: accessReason })}
            variant={isAlreadyAttended && !hasUnconfirmedDependents ? "success" : "primary"}
            size="lg"
            className="w-full"
            startIcon={<FiCheck />}
            loading={isProcessing}
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </Card>

    {alertError && (
      <AlertPopup
        title={t('participantDetails.feedback.errorTitle', 'Erro')}
        message={t('participantDetails.feedback.error')}
        onClose={() => setAlertError(false)}
        isConfirmation={false}
        confirmText={t('common.ok', 'OK')}
      />
    )}
  </>
  );
};

ParticipantDetails.propTypes = {
  eventId: PropTypes.string.isRequired,
  selectedParticipant: PropTypes.shape({
    id: PropTypes.string.isRequired,
    participantName: PropTypes.string.isRequired,
    participantEmail: PropTypes.string,
    participantPhone: PropTypes.string,
    participantJob: PropTypes.string,
    participantNote: PropTypes.string,
    roleId: PropTypes.string,
    participantStatus: PropTypes.string.isRequired,
    eventId: PropTypes.string.isRequired
  }),
  dependentCount: PropTypes.number,
  dependents: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    age: PropTypes.string,
    participantId: PropTypes.string.isRequired,
    status: PropTypes.string,
    attendedDate: PropTypes.string
  })),
  searchedDependentId: PropTypes.string, // ID of dependent that was searched
  isUpdating: PropTypes.bool,
  confirmPresence: PropTypes.func.isRequired,
  setLastUpdate: PropTypes.func.isRequired,
  setSelectedParticipant: PropTypes.func.isRequired,
  onDependentsUpdated: PropTypes.func
};

export default ParticipantDetails;