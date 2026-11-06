import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiRefreshCw, FiCheck, FiAlertTriangle, FiUsers, FiUserPlus, FiMinusCircle } from 'react-icons/fi';
import { Text, Button, Modal } from '../UI';
import { useSyncFidelizeParticipantsMutation } from '../../Api/services/fidelizeApi';
import { billingGateErrorKey } from '../../Hook/useAuthz';

// Default Fidelize role templates (Human Leaders Congress).
// When "All card types" is selected, no templateIds filter is sent
// and the Lambda imports all cards regardless of template.
const FIDELIZE_TEMPLATES = [
  { id: 1024312, name: 'Participant', color: 'primary' },
  { id: 1024321, name: 'Volunteer', color: 'success' },
  { id: 1024323, name: 'Speaker', color: 'info' },
  { id: 1024325, name: 'Partner', color: 'warning' },
  { id: 1029846, name: 'Organization', color: 'secondary' },
  { id: 1029847, name: 'Ambassador', color: 'error' },
  { id: 1030208, name: 'Human Leaders', color: 'primary' },
];

const CHIP_STYLES = {
  primary: {
    active: 'bg-primary-100 dark:bg-primary-900/30 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300',
    inactive: 'bg-muted border-border text-muted-foreground',
  },
  success: {
    active: 'bg-success-100 dark:bg-success-900/30 border-success-400 dark:border-success-600 text-success-700 dark:text-success-300',
    inactive: 'bg-muted border-border text-muted-foreground',
  },
  info: {
    active: 'bg-info-100 dark:bg-info-900/30 border-info-400 dark:border-info-600 text-info-700 dark:text-info-300',
    inactive: 'bg-muted border-border text-muted-foreground',
  },
  warning: {
    active: 'bg-warning-100 dark:bg-warning-900/30 border-warning-400 dark:border-warning-600 text-warning-700 dark:text-warning-300',
    inactive: 'bg-muted border-border text-muted-foreground',
  },
  secondary: {
    active: 'bg-secondary-100 dark:bg-secondary-900/30 border-secondary-400 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300',
    inactive: 'bg-muted border-border text-muted-foreground',
  },
  error: {
    active: 'bg-error-100 dark:bg-error-900/30 border-error-400 dark:border-error-600 text-error-700 dark:text-error-300',
    inactive: 'bg-muted border-border text-muted-foreground',
  },
};

// Step indicator dot
const StepDot = ({ active, completed, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`
      w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
      ${completed
        ? 'bg-success-500 text-white'
        : active
          ? 'bg-primary-500 text-white'
          : 'bg-border text-muted-foreground'
      }
    `}>
      {completed ? <FiCheck className="w-3.5 h-3.5" /> : null}
    </div>
    <span className={`text-[10px] font-medium transition-colors ${
      active || completed ? 'text-foreground' : 'text-muted-foreground'
    }`}>
      {label}
    </span>
  </div>
);

StepDot.propTypes = {
  active: PropTypes.bool,
  completed: PropTypes.bool,
  label: PropTypes.string,
};

const StepLine = ({ active }) => (
  <div className={`flex-1 h-0.5 mt-3.5 transition-colors ${
    active ? 'bg-primary' : 'bg-border'
  }`} />
);

StepLine.propTypes = { active: PropTypes.bool };

const FidelizeSyncModal = ({ isOpen, onClose, eventId, eventName }) => {
  const { t } = useTranslation(['participant', 'common']);
  const [syncFidelizeParticipants] = useSyncFidelizeParticipantsMutation();

  // State machine: idle → syncing → success | error
  const [phase, setPhase] = useState('idle');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [allSelected, setAllSelected] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      setSelectedTemplateIds([]);
      setAllSelected(true);
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  const handleChipToggle = useCallback((templateId) => {
    if (allSelected) {
      // Switch from "all" to "only this one"
      setAllSelected(false);
      setSelectedTemplateIds([templateId]);
    } else {
      setSelectedTemplateIds(prev => {
        const next = prev.includes(templateId)
          ? prev.filter(id => id !== templateId)
          : [...prev, templateId];
        // If all are selected individually, switch to allSelected
        if (next.length === FIDELIZE_TEMPLATES.length) {
          setAllSelected(true);
          return [];
        }
        // If none selected, revert to all selected
        if (next.length === 0) {
          setAllSelected(true);
          return [];
        }
        return next;
      });
    }
  }, [allSelected]);

  const handleAllToggle = useCallback(() => {
    setAllSelected(true);
    setSelectedTemplateIds([]);
  }, []);

  const isChipActive = useCallback((templateId) => {
    return allSelected || selectedTemplateIds.includes(templateId);
  }, [allSelected, selectedTemplateIds]);

  const selectedCount = useMemo(() => {
    return allSelected ? FIDELIZE_TEMPLATES.length : selectedTemplateIds.length;
  }, [allSelected, selectedTemplateIds]);

  const handleSync = useCallback(async (page = 1) => {
    setPhase('syncing');
    setError(null);
    try {
      const templateIds = allSelected ? [] : selectedTemplateIds;
      const result = await syncFidelizeParticipants({
        eventId,
        templateIds: templateIds.length > 0 ? templateIds : undefined,
        page,
      }).unwrap();

      if (result.success) {
        setResults(prev => {
          if (prev && page > 1) {
            return {
              ...result,
              created: prev.created + result.created,
              updated: prev.updated + result.updated,
              skipped: prev.skipped + result.skipped,
              errors: [...(prev.errors || []), ...(result.errors || [])],
            };
          }
          return result;
        });
        setPhase('success');
      } else {
        setError(result.errors?.[0] || 'Sync failed');
        setPhase('error');
      }
    } catch (err) {
      // O sync passou a recusar quando bate no teto de participantes (ADR-038)
      // e a recusa chega como BILLING_GATE:<REASON> — sem esta tradução o
      // utilizador via a constante crua.
      const gateKey = billingGateErrorKey(err, null);
      setError(gateKey ? t(gateKey) : (err?.data?.message || err?.message || 'Sync failed'));
      setPhase('error');
    }
  }, [eventId, allSelected, selectedTemplateIds, syncFidelizeParticipants, t]);

  const isSyncing = phase === 'syncing';
  const canClose = !isSyncing;

  const handleClose = useCallback(() => {
    if (canClose) onClose();
  }, [canClose, onClose]);

  const totalProcessed = results ? results.created + results.updated + results.skipped : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      showCloseButton={false}
      disableEscapeKeyDown={isSyncing}
      disableBackdropClick={isSyncing}
      aria-label={t('fidelizeSync.title')}
      role="dialog"
      aria-modal="true"
    >
      <div>
        {/* Header with branding */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/fidelize-icon-192.png" alt="Fidelize" className="w-9 h-9 rounded-lg object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Text variant="body1" weight="semibold" className="text-foreground">
                {t('fidelizeSync.title')}
              </Text>
              {eventName && (
                <Text variant="caption" className="text-muted-foreground truncate block">
                  {eventName}
                </Text>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-start mt-4 px-4">
            <StepDot
              active={phase === 'idle'}
              completed={phase !== 'idle'}
              label={t('fidelizeSync.steps.select', 'Select')}
            />
            <StepLine active={phase !== 'idle'} />
            <StepDot
              active={phase === 'syncing'}
              completed={phase === 'success' || phase === 'error'}
              label={t('fidelizeSync.steps.sync', 'Sync')}
            />
            <StepLine active={phase === 'success' || phase === 'error'} />
            <StepDot
              active={phase === 'success' || phase === 'error'}
              completed={phase === 'success'}
              label={t('fidelizeSync.steps.results', 'Results')}
            />
          </div>
        </div>

        {/* Body */}
        <Modal.Body className="min-h-[280px]">
          {/* IDLE — Template selection */}
          {phase === 'idle' && (
            <div className="animate-fade-in">
              <Text variant="body2" className="text-muted-foreground mb-5">
                {t('fidelizeSync.description')}
              </Text>

              <div className="flex items-center justify-between mb-3">
                <Text variant="body2" weight="medium" className="text-foreground">
                  {t('fidelizeSync.selectTemplates')}
                </Text>
                <button
                  type="button"
                  onClick={handleAllToggle}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                    allSelected
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }`}
                >
                  {t('fidelizeSync.allTemplates')}
                </button>
              </div>

              {/* Chip grid */}
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('fidelizeSync.selectTemplates')}>
                {FIDELIZE_TEMPLATES.map(tmpl => {
                  const active = isChipActive(tmpl.id);
                  const styles = CHIP_STYLES[tmpl.color] || CHIP_STYLES.primary;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleChipToggle(tmpl.id)}
                      aria-pressed={active}
                      aria-label={`${tmpl.name} ${active ? t('fidelizeSync.selected', 'selected') : t('fidelizeSync.notSelected', 'not selected')}`}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium
                        transition-colors cursor-pointer select-none
                        ${active ? styles.active : styles.inactive}
                        hover:opacity-80
                        focus:outline-none focus:ring-2 focus:ring-primary-500/40
                      `}
                    >
                      {active && <FiCheck className="w-3 h-3" />}
                      {tmpl.name}
                    </button>
                  );
                })}
              </div>

              {/* Selection summary */}
              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-muted-foreground" />
                  <Text variant="caption" className="text-muted-foreground">
                    {t('fidelizeSync.selectedCount', {
                      count: selectedCount,
                      total: FIDELIZE_TEMPLATES.length,
                      defaultValue: '{{count}} of {{total}} card types selected',
                    })}
                  </Text>
                </div>
              </div>
            </div>
          )}

          {/* SYNCING — Loading state */}
          {phase === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in" role="status" aria-live="polite">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-[3px] border-primary-200 dark:border-primary-800 border-t-primary-500 dark:border-t-primary-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/fidelize-icon-192.png" alt="" className="w-8 h-8 rounded-lg object-contain" />
                </div>
              </div>
              <Text variant="body1" weight="semibold" className="text-foreground mb-1">
                {t('fidelizeSync.syncingTitle')}
              </Text>
              <Text variant="body2" className="text-muted-foreground text-center">
                {t('fidelizeSync.syncingMessage')}
              </Text>
            </div>
          )}

          {/* SUCCESS — Results */}
          {phase === 'success' && results && (
            <div className="animate-fade-in" role="status" aria-live="polite">
              {/* Success header */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-3">
                  <FiCheck className="w-7 h-7 text-success-600 dark:text-success-400" />
                </div>
                <Text variant="h5" weight="semibold" className="text-foreground">
                  {t('fidelizeSync.successTitle')}
                </Text>
                {totalProcessed > 0 && (
                  <Text variant="body2" className="text-muted-foreground mt-0.5">
                    {t('fidelizeSync.results.totalCards', { count: totalProcessed })}
                  </Text>
                )}
              </div>

              {/* Summary bar */}
              {totalProcessed > 0 && (
                <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-5">
                  <div className="h-full rounded-full bg-success w-full" />
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3.5 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200/50 dark:border-success-800/30">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <FiUserPlus className="w-4 h-4 text-success-500" />
                    <Text variant="h4" weight="bold" className="text-success-700 dark:text-success-400">
                      {results.created}
                    </Text>
                  </div>
                  <Text variant="caption" className="text-success-600 dark:text-success-500">
                    {t('fidelizeSync.results.created')}
                  </Text>
                </div>

                <div className="text-center p-3.5 rounded-lg bg-info-50 dark:bg-info-900/20 border border-info-200/50 dark:border-info-800/30">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <FiRefreshCw className="w-4 h-4 text-info-500" />
                    <Text variant="h4" weight="bold" className="text-info-700 dark:text-info-400">
                      {results.updated}
                    </Text>
                  </div>
                  <Text variant="caption" className="text-info-600 dark:text-info-500">
                    {t('fidelizeSync.results.updated')}
                  </Text>
                </div>

                <div className="text-center p-3.5 rounded-lg bg-muted border border-border/50">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <FiMinusCircle className="w-4 h-4 text-neutral-400" />
                    <Text variant="h4" weight="bold" className="text-muted-foreground">
                      {results.skipped}
                    </Text>
                  </div>
                  <Text variant="caption" className="text-muted-foreground">
                    {t('fidelizeSync.results.skipped')}
                  </Text>
                </div>
              </div>

              {/* Errors section */}
              {results.errors?.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200/50 dark:border-error-800/30">
                  <div className="flex items-center gap-2">
                    <FiAlertTriangle className="w-4 h-4 text-error-500 flex-shrink-0" />
                    <Text variant="body2" weight="medium" className="text-error-700 dark:text-error-400">
                      {results.errors.length} {t('fidelizeSync.results.errors')}
                    </Text>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ERROR — Error state */}
          {phase === 'error' && (
            <div className="animate-fade-in" role="alert" aria-live="assertive">
              <div className="flex flex-col items-center py-8">
                <div className="w-14 h-14 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mb-3">
                  <FiAlertTriangle className="w-7 h-7 text-error-600 dark:text-error-400" />
                </div>
                <Text variant="h5" weight="semibold" className="text-foreground mb-2">
                  {t('fidelizeSync.errorTitle')}
                </Text>
                <Text variant="body2" className="text-error-600 dark:text-error-400 text-center max-w-sm">
                  {t('fidelizeSync.errors.syncFailed', { error })}
                </Text>
              </div>
            </div>
          )}
        </Modal.Body>

        {/* Footer */}
        <Modal.Footer>
          {phase === 'idle' && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {t('fidelizeSync.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSync(1)}
                disabled={selectedCount === 0}
                startIcon={<FiRefreshCw className="w-4 h-4" />}
              >
                {t('fidelizeSync.syncButton')}
              </Button>
            </>
          )}

          {phase === 'syncing' && (
            <Button variant="ghost" disabled>
              {t('fidelizeSync.syncing')}
            </Button>
          )}

          {phase === 'success' && (
            <>
              {results?.hasMore && (
                <Button
                  variant="secondary"
                  onClick={() => handleSync(results.nextPage)}
                  startIcon={<FiRefreshCw className="w-4 h-4" />}
                >
                  {t('fidelizeSync.continueSync')}
                </Button>
              )}
              <Button variant="primary" onClick={handleClose}>
                {t('fidelizeSync.done')}
              </Button>
            </>
          )}

          {phase === 'error' && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {t('fidelizeSync.close')}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSync(1)}
                startIcon={<FiRefreshCw className="w-4 h-4" />}
              >
                {t('fidelizeSync.tryAgain')}
              </Button>
            </>
          )}
        </Modal.Footer>
      </div>
    </Modal>
  );
};

FidelizeSyncModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.string.isRequired,
  eventName: PropTypes.string,
};

export default FidelizeSyncModal;
