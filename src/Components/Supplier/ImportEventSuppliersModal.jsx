import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiUpload, FiCheck, FiAlertTriangle, FiDownload } from 'react-icons/fi';
import { Text, Button, Modal } from '../UI';
import { useNormalizeFile } from '../../Hook/useNormalizeFile';
import { useEventRole } from '../../Hook/useEventRole';
import { billingGateReasonFromError, billingGateMessageKey } from '../../Hook/useAuthz';
import { useImportNormalizedEventSuppliersMutation } from '../../Api/services/eventSupplierApi';
import { getSafeCurrency } from '../../Utils/currencyOptions';
import { downloadSupplierImportTemplate, EVENT_SUPPLIER_TEMPLATE_COLUMNS } from './utils/exportSuppliers';

/**
 * Dual-write importer: uploads an Excel/CSV under the event context,
 * normalizes it via api-bafatorio, previews the result, then creates
 * Supplier + EventSupplier records in a single Lambda call.
 *
 * Design decisions (Option B plan):
 *   - Lives in EventSupplierList (event context, has eventId).
 *   - No legacy fallback — if the normalize API fails, the user sees the
 *     error and retries. We deliberately don't write partial data.
 *   - Preview shows Supplier + EventSupplier columns together so the user
 *     can see exactly what will land before confirming.
 *   - Already-linked rows (same supplier name on this event) are marked
 *     in the preview but still submitted: the Lambda skips them on the
 *     server side and returns a count.
 */

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPT_EXTENSIONS = /\.(xlsx|xls|csv)$/i;
const PHASE_ORDER = ['idle', 'normalizing', 'preview', 'importing', 'success', 'error'];

function getSkippedCount(result) {
  return (result?.rowsAlreadyLinkedOnEvent ?? 0)
    + (result?.rowsDuplicatedInBatch ?? 0)
    + (result?.validationErrorCount ?? 0);
}

function getSkippedReasonDetails(result, t) {
  const reasons = [];

  if ((result?.rowsAlreadyLinkedOnEvent ?? 0) > 0) {
    reasons.push(
      t('importEventSuppliersModal.error.skippedReasons.alreadyLinked', {
        count: result.rowsAlreadyLinkedOnEvent,
      }),
    );
  }

  if ((result?.rowsDuplicatedInBatch ?? 0) > 0) {
    reasons.push(
      t('importEventSuppliersModal.error.skippedReasons.duplicateRows', {
        count: result.rowsDuplicatedInBatch,
      }),
    );
  }

  if ((result?.validationErrorCount ?? 0) > 0) {
    reasons.push(
      t('importEventSuppliersModal.error.skippedReasons.invalidRows', {
        count: result.validationErrorCount,
      }),
    );
  }

  return reasons.join(', ');
}

function getImportMessage(result, t) {
  const linkedCount = result?.rowsAlreadyLinkedOnEvent ?? 0;
  const duplicateCount = result?.rowsDuplicatedInBatch ?? 0;
  const invalidCount = result?.validationErrorCount ?? 0;
  const skippedCount = getSkippedCount(result);

  switch (result?.reason) {
    case 'SUCCESS_WITH_SKIPS':
      return t('importEventSuppliersModal.success.subtitleWithSkipped', {
        count: result?.eventSuppliersCreated ?? 0,
        skipped: skippedCount,
      });
    case 'SUCCESS':
      return t('importEventSuppliersModal.success.subtitle', {
        count: result?.eventSuppliersCreated ?? 0,
      });
    case 'ALL_ALREADY_LINKED':
      return t('importEventSuppliersModal.error.allAlreadyLinked');
    case 'ALL_SKIPPED':
      if (duplicateCount > 0 && linkedCount === 0 && invalidCount === 0) {
        return t('importEventSuppliersModal.error.allDuplicateRows', { count: duplicateCount });
      }

      if (invalidCount > 0 && linkedCount === 0 && duplicateCount === 0) {
        return t('importEventSuppliersModal.error.allInvalidRows', { count: invalidCount });
      }

      return t('importEventSuppliersModal.error.allSkippedMixed', {
        count: skippedCount,
        reasons: getSkippedReasonDetails(result, t),
      });
    case 'NO_ROWS_TO_IMPORT':
      return t('importEventSuppliersModal.error.emptySupplierData');
    case 'INVALID_INPUT':
      return t('importEventSuppliersModal.error.invalidInput');
    case 'BATCH_LIMIT_EXCEEDED':
      return t('importEventSuppliersModal.error.batchLimitExceeded');
    case 'UNAUTHENTICATED':
      return t('importEventSuppliersModal.error.unauthenticated');
    case 'UNAUTHORIZED':
      return t('importEventSuppliersModal.error.unauthorized');
    case 'EVENT_NOT_FOUND':
      return t('importEventSuppliersModal.error.eventNotFound');
    case 'IMPORT_FAILED':
      return t('importEventSuppliersModal.error.importFailed');
    default:
      if (result?.success) {
        return t('importEventSuppliersModal.success.subtitle', {
          count: result?.eventSuppliersCreated ?? 0,
        });
      }

      return t('importEventSuppliersModal.error.defaultMessage');
  }
}

// --- Step dot ---
const StepDot = ({ active, completed, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
        completed
          ? 'bg-success-500 text-white'
          : active
            ? 'bg-primary-500 text-white'
            : 'bg-border text-muted-foreground'
      }`}
    >
      {completed ? <FiCheck className="w-3.5 h-3.5" /> : null}
    </div>
    <span
      className={`text-[10px] font-medium transition-colors ${
        active || completed ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
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
  <div
    className={`flex-1 h-0.5 mt-3.5 transition-colors ${
      active ? 'bg-primary' : 'bg-border'
    }`}
  />
);
StepLine.propTypes = { active: PropTypes.bool };

// --- Main ---
const ImportEventSuppliersModal = ({ isOpen, onClose, eventId, eventCurrency }) => {
  const { t } = useTranslation('supplier');
  const eventCurrencyCode = getSafeCurrency(eventCurrency);
  const isForeignCurrency = (code) =>
    typeof code === 'string' && code.trim() !== '' && code.trim().toUpperCase() !== eventCurrencyCode;

  const [phase, setPhase] = useState('idle'); // idle | normalizing | preview | importing | success | error
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [normalizingElapsedSeconds, setNormalizingElapsedSeconds] = useState(0);

  const { normalize, reset: resetNormalize, data: rows, summary, isNormalizing } = useNormalizeFile('event-supplier');
  const [importNormalizedEventSuppliers] = useImportNormalizedEventSuppliersMutation();
  const { isStaffLogistics } = useEventRole(eventId);

  // Backend forces status=PENDING for STAFF_LOGISTICS regardless of what the
  // Excel said (see import-normalized-event-suppliers/handler.ts). Surface
  // that explicitly in the preview so the user isn't surprised by downgraded
  // rows after submit.
  const logisticsDowngradeCount = useMemo(() => {
    if (!isStaffLogistics || !rows?.length) return 0;
    return rows.filter(
      (r) => typeof r.status === 'string' && r.status.toUpperCase() !== 'PENDING',
    ).length;
  }, [isStaffLogistics, rows]);

  // The event is single-currency (Event.currency). Rows quoted in another
  // currency can't be summed into the event budget meaningfully, so surface
  // them in the preview before the user commits to the import.
  const currencyMismatchCount = useMemo(() => {
    if (!rows?.length) return 0;
    return rows.filter((r) => isForeignCurrency(r.currency)).length;
  }, [rows, eventCurrencyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLocked = phase === 'normalizing' || phase === 'importing';
  const previewCount = summary?.valid ?? 0;
  const invalidCount = summary?.invalid ?? 0;
  const isAtOrPast = (targetPhase) => PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(targetPhase);
  const normalizingStatusKey =
    normalizingElapsedSeconds >= 20
      ? 'importEventSuppliersModal.normalizing.longRunningHint'
      : normalizingElapsedSeconds >= 8
        ? 'importEventSuppliersModal.normalizing.takingLongerHint'
        : 'importEventSuppliersModal.normalizing.description';

  // Reset when opened/closed
  useEffect(() => {
    setPhase('idle');
    setFile(null);
    setError(null);
    setImportResult(null);
    setNormalizingElapsedSeconds(0);
    resetNormalize();
  }, [isOpen, resetNormalize]);

  useEffect(() => {
    if (phase !== 'normalizing') {
      setNormalizingElapsedSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      setNormalizingElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [phase]);

  const handleClose = useCallback(() => {
    if (!isLocked) onClose();
  }, [isLocked, onClose]);

  const handleRetry = useCallback(() => {
    setPhase('idle');
    setFile(null);
    setError(null);
    setImportResult(null);
    resetNormalize();
  }, [resetNormalize]);

  const handleDownloadTemplate = async () => {
    try {
      await downloadSupplierImportTemplate({
        t,
        columns: EVENT_SUPPLIER_TEMPLATE_COLUMNS,
        sheetName: t('importEventSuppliersModal.template.sheetName', 'Fornecedores do Evento'),
        filename: 'bafatorio_template_fornecedores_evento.xlsx',
      });
    } catch (err) {
      console.error('Template download failed:', err);
      setError(t('importModal.error.templateDownloadFailed'));
      setPhase('error');
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    setFile(null);
    setError(null);
    resetNormalize();
    if (!selected) return;

    if (!ACCEPT_EXTENSIONS.test(selected.name)) {
      setError(t('importModal.error.invalidFileType'));
      setPhase('error');
      if (e.target) e.target.value = null;
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(t('importModal.error.fileTooLarge'));
      setPhase('error');
      if (e.target) e.target.value = null;
      return;
    }

    try {
      setFile(selected);
      setPhase('normalizing');

      const result = await normalize(selected);
      if (!result?.data?.length) {
        setError(t('importEventSuppliersModal.error.emptySupplierData'));
        setPhase('error');
        return;
      }
      setPhase('preview');
    } catch (err) {
      console.error('Event supplier normalize failed:', err);
      setError(t('importEventSuppliersModal.error.normalize'));
      setPhase('error');
      if (e.target) e.target.value = null;
    }
  };

  const handleSubmit = async () => {
    if (!rows?.length) return;
    setPhase('importing');
    setError(null);

    try {
      const result = await importNormalizedEventSuppliers({ eventId, rows }).unwrap();
      setImportResult(result);

      if (!result?.success) {
        setError(getImportMessage(result, t));
        setPhase('error');
        return;
      }

      setPhase('success');
    } catch (err) {
      console.error('Event supplier import failed:', err);
      const gateReason = billingGateReasonFromError(err);
      setError(
        gateReason
          ? t(`common:${billingGateMessageKey(gateReason)}`)
          : err?.data?.reason
            ? getImportMessage(err.data, t)
            : t('importEventSuppliersModal.error.importFailed')
      );
      setPhase('error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pr-14 border-b border-border">
          <div className="flex flex-col">
            <Text variant="h6" weight="semibold">
              {t('importEventSuppliersModal.title')}
            </Text>
            <Text variant="caption" className="text-muted-foreground mt-0.5">
              {t('importEventSuppliersModal.subtitle')}
            </Text>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-8 py-4 border-b border-border bg-muted/30">
          <StepDot active={phase === 'idle'} completed={phase !== 'idle'} label={t('importModal.steps.upload')} />
          <StepLine active={isAtOrPast('normalizing')} />
          <StepDot
            active={phase === 'normalizing'}
            completed={isAtOrPast('preview')}
            label={t('importModal.steps.analyze')}
          />
          <StepLine active={isAtOrPast('preview')} />
          <StepDot
            active={phase === 'preview'}
            completed={isAtOrPast('importing')}
            label={t('importModal.steps.preview')}
          />
          <StepLine active={isAtOrPast('importing')} />
          <StepDot
            active={phase === 'success' || phase === 'error'}
            completed={phase === 'success'}
            label={t('importModal.steps.result')}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {phase === 'idle' && (
            <div>
              <label className="flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                <FiUpload className="w-10 h-10 text-muted-foreground" />
                <Text variant="body2" weight="medium">
                  {t('importModal.upload.dropzone')}
                </Text>
                <Text variant="caption" className="text-muted-foreground">
                  {t('importEventSuppliersModal.uploadHint')}
                </Text>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="flex items-center justify-between mt-3 px-3 py-2.5 bg-muted rounded-lg border border-border">
                <Text variant="caption" className="text-muted-foreground">
                  {t('importModal.upload.templateHint')}
                </Text>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <FiDownload className="w-3 h-3" />
                  {t('importModal.upload.templateButton')}
                </button>
              </div>
            </div>
          )}

          {phase === 'normalizing' && (
            <div className="animate-fade-in" role="status" aria-live="polite">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-16 h-16 mb-5">
                  <div className="w-full h-full rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                </div>
                <div
                  className="relative w-56 h-1.5 rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-label={t('importEventSuppliersModal.normalizing.progressAriaLabel')}
                >
                  <div
                    className="absolute inset-y-0 w-1/3 rounded-full bg-primary"
                    style={{ animation: 'eventSupplierImportShimmer 1.5s ease-in-out infinite' }}
                  />
                </div>

                <Text variant="body1" weight="semibold" className="mt-5 text-foreground text-center">
                  {t('importEventSuppliersModal.normalizing.title')}
                </Text>
                <Text variant="body2" className="mt-1 text-center text-muted-foreground max-w-md">
                  {t(normalizingStatusKey)}
                </Text>
                <Text variant="caption" className="mt-3 text-muted-foreground">
                  {t('importEventSuppliersModal.normalizing.durationHint')}
                </Text>

                <style>{`@keyframes eventSupplierImportShimmer { 0% { left: -33%; } 100% { left: 100%; } }`}</style>
              </div>
            </div>
          )}

          {phase === 'preview' && (
            <div className="flex flex-col gap-4">
              {isStaffLogistics && (
                <div className="flex gap-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/50">
                  <FiAlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <Text variant="caption" className="text-warning-800 dark:text-warning-200">
                    {logisticsDowngradeCount > 0
                      ? t('importEventSuppliersModal.logisticsNote.withDowngrade', {
                          count: logisticsDowngradeCount,
                        })
                      : t('importEventSuppliersModal.logisticsNote.generic')}
                  </Text>
                </div>
              )}
              {currencyMismatchCount > 0 && (
                <div className="flex gap-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/50">
                  <FiAlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <Text variant="caption" className="text-warning-800 dark:text-warning-200">
                    {t('importEventSuppliersModal.currencyMismatch.note', {
                      count: currencyMismatchCount,
                      currency: eventCurrencyCode,
                    })}
                  </Text>
                </div>
              )}
              <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50">
                <div>
                  <Text variant="caption" className="text-muted-foreground uppercase tracking-wide">
                    {t('importEventSuppliersModal.preview.valid')}
                  </Text>
                  <Text variant="h5" weight="semibold" className="text-success">
                    {previewCount}
                  </Text>
                </div>
                {invalidCount > 0 && (
                  <div>
                    <Text variant="caption" className="text-muted-foreground uppercase tracking-wide">
                      {t('importEventSuppliersModal.preview.invalid')}
                    </Text>
                    <Text variant="h5" weight="semibold" className="text-warning">
                      {invalidCount}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          )}

          {phase === 'importing' && (
            <div className="flex flex-col items-center gap-3 p-12">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <Text variant="body2">
                {t('importEventSuppliersModal.importing.title')}
              </Text>
            </div>
          )}

          {phase === 'success' && importResult && (
            <div className="flex flex-col items-center gap-3 p-10">
              <div className="w-14 h-14 rounded-full bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
                <FiCheck className="w-8 h-8 text-success" />
              </div>
              <Text variant="h6" weight="semibold">
                {t('importModal.success.title')}
              </Text>
              <Text variant="body2" className="text-center text-muted-foreground max-w-md">
                {getImportMessage(importResult, t)}
              </Text>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <Stat
                  label={t('importEventSuppliersModal.stats.suppliersCreated')}
                  value={importResult.suppliersCreated}
                />
                <Stat
                  label={t('importEventSuppliersModal.stats.suppliersReused')}
                  value={importResult.suppliersReused}
                />
                <Stat
                  label={t('importEventSuppliersModal.stats.linked')}
                  value={importResult.eventSuppliersCreated}
                />
                <Stat
                  label={t('importEventSuppliersModal.stats.alreadyLinked')}
                  value={importResult.rowsAlreadyLinkedOnEvent}
                />
                {importResult.suppliersDeduplicatedInBatch > 0 && (
                  <Stat
                    label={t('importEventSuppliersModal.stats.duplicateNames')}
                    value={importResult.suppliersDeduplicatedInBatch}
                  />
                )}
                {importResult.validationErrorCount > 0 && (
                  <Stat
                    label={t('importEventSuppliersModal.stats.invalidRows')}
                    value={importResult.validationErrorCount}
                  />
                )}
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3 p-10">
              <div className="w-14 h-14 rounded-full bg-error-50 dark:bg-error-900/30 flex items-center justify-center">
                <FiAlertTriangle className="w-8 h-8 text-error" />
              </div>
              <Text variant="h6" weight="semibold">
                {t('importModal.error.title')}
              </Text>
              <Text variant="body2" className="text-center text-muted-foreground max-w-md">
                {error || t('importEventSuppliersModal.error.description')}
              </Text>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
          <div>
            {file && phase !== 'idle' && phase !== 'success' && (
              <Text variant="caption" className="text-muted-foreground truncate max-w-xs">
                {file.name}
              </Text>
            )}
          </div>
          <div className="flex gap-2">
            {phase === 'idle' && (
              <Button variant="ghost" size="sm" onClick={handleClose}>
                {t('importModal.buttons.cancel')}
              </Button>
            )}
            {phase === 'normalizing' && (
              <Button variant="ghost" size="sm" disabled>
                {t('importModal.buttons.cancel')}
              </Button>
            )}
            {phase === 'preview' && (
              <>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  {t('importModal.buttons.cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!previewCount || isNormalizing}
                >
                  {t('importModal.buttons.import', { count: previewCount || '?' })}
                </Button>
              </>
            )}
            {phase === 'importing' && (
              <Button variant="ghost" size="sm" disabled>
                {t('importModal.buttons.importing')}
              </Button>
            )}
            {phase === 'success' && (
              <Button variant="primary" size="sm" onClick={handleClose}>
                {t('importModal.buttons.done')}
              </Button>
            )}
            {phase === 'error' && (
              <>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  {t('importModal.buttons.close')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleRetry}>
                  {t('importModal.buttons.tryAgain')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

ImportEventSuppliersModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.string.isRequired,
  eventCurrency: PropTypes.string,
};

// --- Small stat block ---
const Stat = ({ label, value }) => (
  <div className="text-center">
    <Text variant="caption" className="text-muted-foreground uppercase tracking-wide">
      {label}
    </Text>
    <Text variant="h6" weight="semibold">
      {value ?? 0}
    </Text>
  </div>
);
Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
};

export default ImportEventSuppliersModal;
