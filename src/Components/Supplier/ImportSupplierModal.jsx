import { useState, useEffect, useCallback } from 'react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import PropTypes from 'prop-types';
import { FiX, FiUpload, FiCheck, FiAlertTriangle, FiUserPlus, FiInfo, FiDownload } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Text, Button, Modal } from '../UI';
import { useImportNormalizedSuppliersMutation, useUploadSupplierMutation } from '../../Api/services/supplierApi';
import { useSelector } from 'react-redux';
import { selectAllSuppliers } from '../../Redux/Suppliers/supplierSlice';
import { useNormalizeFile } from '../../Hook/useNormalizeFile';
import { downloadSupplierImportTemplate, SUPPLIER_TEMPLATE_COLUMNS } from './utils/exportSuppliers';
import { findSupplierNameColumnIndex } from './utils/supplierNameHeader';

// ── Step indicator components ──

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

StepDot.propTypes = { active: PropTypes.bool, completed: PropTypes.bool, label: PropTypes.string };

const StepLine = ({ active }) => (
  <div className={`flex-1 h-0.5 mt-3.5 transition-colors ${active ? 'bg-primary' : 'bg-border'}`} />
);

StepLine.propTypes = { active: PropTypes.bool };

const RowErrorDetailsList = ({ rowErrorDetails, approximate, t }) => (
  <div className="w-full max-w-sm mt-4 text-left">
    <Text variant="caption" weight="semibold" className="text-muted-foreground block mb-1.5">
      {t('importModal.error.rowErrorsTitle')}
    </Text>
    <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-muted/50 divide-y divide-border">
      {rowErrorDetails.slice(0, 20).map((rowError, index) => (
        <div key={`${rowError.row}-${index}`} className="px-3 py-1.5">
          <Text variant="caption" className="text-foreground">
            <span className="font-semibold">
              {t('importModal.error.rowLabel', { row: approximate ? `~${rowError.row}` : rowError.row })}
            </span>{' '}
            {rowError.message}
          </Text>
        </div>
      ))}
    </div>
    {rowErrorDetails.length > 20 && (
      <Text variant="caption" className="text-muted-foreground mt-1 block">
        {t('importModal.error.rowErrorsMore', { count: rowErrorDetails.length - 20 })}
      </Text>
    )}
    {approximate && (
      <Text variant="caption" className="text-muted-foreground mt-1.5 block italic">
        {t('importModal.error.rowErrorsApproximateNote')}
      </Text>
    )}
  </div>
);

RowErrorDetailsList.propTypes = {
  rowErrorDetails: PropTypes.arrayOf(PropTypes.shape({
    row: PropTypes.number,
    message: PropTypes.string,
  })).isRequired,
  approximate: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

function rowHasValues(row) {
  return (row.values || []).some((value, index) => index > 0 && String(value ?? '').trim() !== '');
}

async function buildWorkbookFromCsv(file) {
  const text = await file.text();
  const result = Papa.parse(text, { skipEmptyLines: true });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message || 'Failed to parse CSV file');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  result.data.forEach((row) => {
    worksheet.addRow(Array.isArray(row) ? row : Object.values(row));
  });

  return workbook;
}

async function getFallbackPreviewStats(file) {
  const workbook = file.name.match(/\.csv$/i)
    ? await buildWorkbookFromCsv(file)
    : new ExcelJS.Workbook();

  if (!file.name.match(/\.csv$/i)) {
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
  if (!worksheet) {
    return { validCount: 0, invalidCount: 0 };
  }

  const nameColumnIndex = findSupplierNameColumnIndex(worksheet.getRow(1));
  if (nameColumnIndex <= 0) {
    let invalidCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowHasValues(row)) invalidCount++;
    });
    return { validCount: 0, invalidCount };
  }

  let validCount = 0;
  let invalidCount = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || !rowHasValues(row)) return;
    const name = (row.getCell(nameColumnIndex).text || '').trim();
    if (name) validCount++;
    else invalidCount++;
  });

  return { validCount, invalidCount };
}

function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function buildLegacyUploadBase64(file) {
  if (!file.name.match(/\.csv$/i)) {
    return readBlobAsBase64(file);
  }

  const workbook = await buildWorkbookFromCsv(file);
  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  const xlsxBlob = new Blob(
    [xlsxBuffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );

  return readBlobAsBase64(xlsxBlob);
}

const NON_FATAL_IMPORT_REASONS = new Set([
  'SUCCESS',
  'SUCCESS_WITH_SKIPS',
  'ALL_SKIPPED',
  'NO_SUPPLIERS_TO_IMPORT',
]);

function createEmptyImportStats() {
  return {
    count: 0,
    skippedCount: 0,
    duplicateCount: 0,
    validationErrorCount: 0,
    writeErrorCount: 0,
    reason: null,
  };
}

function mergeImportStats(current, result) {
  return {
    count: current.count + (result?.supplierCount ?? 0),
    skippedCount: current.skippedCount + (result?.skippedCount ?? 0),
    duplicateCount: current.duplicateCount + (result?.duplicateCount ?? 0),
    validationErrorCount: current.validationErrorCount + (result?.validationErrorCount ?? 0),
    writeErrorCount: current.writeErrorCount + (result?.writeErrorCount ?? 0),
    reason: result?.reason || current.reason,
  };
}

function applyPreviewInvalidRows(stats, previewInvalidCount) {
  if (!previewInvalidCount) {
    return stats;
  }

  const nextStats = {
    ...stats,
    skippedCount: (stats.skippedCount ?? 0) + previewInvalidCount,
    validationErrorCount: (stats.validationErrorCount ?? 0) + previewInvalidCount,
  };

  if (nextStats.count > 0) {
    nextStats.reason = 'SUCCESS_WITH_SKIPS';
    return nextStats;
  }

  if ((nextStats.duplicateCount ?? 0) > 0) {
    nextStats.reason = 'ALL_SKIPPED';
    return nextStats;
  }

  nextStats.reason = 'ALL_SKIPPED';
  return nextStats;
}

function getImportMessage(result, t) {
  switch (result?.reason) {
    case 'ALL_DUPLICATES':
      return t('importModal.success.allDuplicates');
    case 'ALL_SKIPPED':
      if ((result?.duplicateCount ?? 0) > 0 && (result?.validationErrorCount ?? 0) > 0) {
        return t('importModal.error.allSkippedMixed', {
          duplicates: result.duplicateCount,
          invalid: result.validationErrorCount,
        });
      }
      if ((result?.validationErrorCount ?? 0) > 0) {
        return t('importModal.error.allInvalidRows', { count: result.validationErrorCount });
      }
      if ((result?.skippedCount ?? 0) > 0) {
        return t('importModal.error.allSkipped', { count: result.skippedCount });
      }
      return t('importModal.error.defaultMessage');
    case 'NO_SUPPLIERS_TO_IMPORT':
      return t('importModal.error.emptySupplierData');
    default:
      return result?.message || t('importModal.error.defaultMessage');
  }
}

// ── Main component ──

const ImportSuppliersModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation('supplier');

  // State
  const [phase, setPhase] = useState('idle'); // idle | normalizing | preview | importing | success | error
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [importStats, setImportStats] = useState(createEmptyImportStats);
  const [fallbackSummary, setFallbackSummary] = useState({ valid: 0, invalid: 0 });
  const [rowErrorDetails, setRowErrorDetails] = useState([]);
  // True when rowErrorDetails came from the AI-normalized path: its row
  // numbers are computed against normalizedData's array index, which can
  // drift from the real file row if the normalizer merged/dropped rows
  // (issue #212). The legacy/CSV path's rows come straight from ExcelJS's
  // own row iteration and are always exact.
  const [rowNumbersApproximate, setRowNumbersApproximate] = useState(false);

  // Hooks
  const [importNormalizedSuppliers] = useImportNormalizedSuppliersMutation();
  const [uploadSupplier] = useUploadSupplierMutation();
  const { normalize, reset: resetNormalize, data: normalizedData, summary } = useNormalizeFile('supplier');

  const currentSuppliers = useSelector(selectAllSuppliers);
  const currentSupplierCount = currentSuppliers.length;

  const previewCount = summary?.valid ?? fallbackSummary.valid;
  const invalidCount = summary?.invalid ?? fallbackSummary.invalid;
  const totalAfterImport = currentSupplierCount + previewCount;

  // Phase helpers
  const isLocked = phase === 'normalizing' || phase === 'importing';
  const isAtOrPast = (target) => {
    const order = ['idle', 'normalizing', 'preview', 'importing', 'success', 'error'];
    return order.indexOf(phase) >= order.indexOf(target);
  };

  // Reset on open/close
  useEffect(() => {
    setPhase('idle');
    setFile(null);
    setError(null);
    setImportStats(createEmptyImportStats());
    setFallbackSummary({ valid: 0, invalid: 0 });
    setRowErrorDetails([]);
    setRowNumbersApproximate(false);
    resetNormalize();
  }, [isOpen, resetNormalize]);

  const handleClose = useCallback(() => {
    if (!isLocked) onClose();
  }, [isLocked, onClose]);

  const handleRetry = useCallback(() => {
    setPhase('idle');
    setFile(null);
    setError(null);
    setFallbackSummary({ valid: 0, invalid: 0 });
    setRowErrorDetails([]);
    setRowNumbersApproximate(false);
    resetNormalize();
  }, [resetNormalize]);

  // ── Template download (ExcelJS) ──

  const handleDownloadTemplate = async () => {
    try {
      await downloadSupplierImportTemplate({
        t,
        columns: SUPPLIER_TEMPLATE_COLUMNS,
        sheetName: t('importModal.template.sheetName', 'Fornecedores'),
        filename: 'bafatorio_template_fornecedores.xlsx',
      });
    } catch (err) {
      console.error('Template download failed:', err);
      setError(t('importModal.error.templateDownloadFailed'));
      setPhase('error');
    }
  };

  // ── File selection ──

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(null);
    setError(null);
    setFallbackSummary({ valid: 0, invalid: 0 });
    resetNormalize();

    if (!selectedFile) return;

    try {
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        throw new Error(t('importModal.error.invalidFileType'));
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        throw new Error(t('importModal.error.fileTooLarge'));
      }

      setFile(selectedFile);
      setPhase('normalizing');

      try {
        const result = await normalize(selectedFile);
        if (result?.data && result.data.length > 0) {
          setPhase('preview');
          return;
        }
      } catch {
        // Fall back to local preview and legacy upload when normalization is unavailable.
      }

      const fallbackStats = await getFallbackPreviewStats(selectedFile);
      setFallbackSummary({
        valid: fallbackStats.validCount,
        invalid: fallbackStats.invalidCount,
      });

      // Fallback: keep file for legacy base64 upload, with local preview counts
      setPhase('preview');
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message || t('importModal.error.fileReadError'));
      setFile(null);
      setPhase('error');
      if (e.target) e.target.value = null;
    }
  };

  // ── Submit ──

  const handleSubmit = async () => {
    if (!file) return;

    setPhase('importing');
    setError(null);

    let hasSkips = false;

    try {
      if (normalizedData && normalizedData.length > 0) {
        setRowNumbersApproximate(true);
        // Primary: normalized JSON in chunks
        const CHUNK_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < normalizedData.length; i += CHUNK_SIZE) {
          chunks.push({ rows: normalizedData.slice(i, i + CHUNK_SIZE), rowOffset: i });
        }

        let aggregateStats = createEmptyImportStats();
        let aggregateRowErrors = [];
        for (const { rows: chunk, rowOffset } of chunks) {
          const result = await importNormalizedSuppliers({ suppliers: chunk, rowOffset }).unwrap();
          if (Array.isArray(result?.rowErrors)) {
            aggregateRowErrors = aggregateRowErrors.concat(result.rowErrors);
          }
          if (!result?.success && !NON_FATAL_IMPORT_REASONS.has(result?.reason)) {
            setRowErrorDetails(aggregateRowErrors);
            throw new Error(getImportMessage(result, t));
          }
          aggregateStats = mergeImportStats(aggregateStats, result);
        }

        setRowErrorDetails(aggregateRowErrors);
        const finalStats = applyPreviewInvalidRows(aggregateStats, summary?.invalid ?? 0);
        setImportStats(finalStats);
        hasSkips = (finalStats.skippedCount ?? 0) > 0;

        if (finalStats.count === 0 && ['ALL_DUPLICATES', 'ALL_SKIPPED'].includes(finalStats.reason)) {
          setError(getImportMessage(finalStats, t));
          setPhase('error');
          return;
        }
      } else {
        // Fallback: base64 file — rows come straight from ExcelJS's own row
        // iteration on the server, so these row numbers are always exact.
        setRowNumbersApproximate(false);
        const base64String = await buildLegacyUploadBase64(file);

        const result = await uploadSupplier(base64String).unwrap();
        setRowErrorDetails(Array.isArray(result?.rowErrors) ? result.rowErrors : []);
        if (!result?.success && !NON_FATAL_IMPORT_REASONS.has(result?.reason)) {
          throw new Error(getImportMessage(result, t));
        }

        const nextStats = mergeImportStats(createEmptyImportStats(), result);
        setImportStats(nextStats);
        hasSkips = (nextStats.skippedCount ?? 0) > 0;

        if (nextStats.count === 0 && ['ALL_DUPLICATES', 'ALL_SKIPPED'].includes(nextStats.reason)) {
          setError(getImportMessage(nextStats, t));
          setPhase('error');
          return;
        }
      }

      setPhase('success');
      // Skips mean there's row-error detail worth reading — don't auto-close under it.
      if (!hasSkips) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError(err?.data?.reason ? getImportMessage(err.data, t) : (err?.data?.message || err?.message || t('importModal.error.defaultMessage')));
      setPhase('error');
    }
  };

  // ── Render ──

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        fullWidth
        showCloseButton={false}
        disableEscapeKeyDown={isLocked}
        disableBackdropClick={isLocked}
      >
        <div>
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Text variant="body1" weight="semibold" className="text-foreground">
                {t('importModal.title')}
              </Text>
              <Button variant="ghost" size="sm" iconOnly onClick={handleClose} disabled={isLocked} aria-label="Close">
                <FiX size={20} />
              </Button>
            </div>

            {/* Step indicator */}
            <div className="flex items-start mt-4 px-4">
              <StepDot active={phase === 'idle'} completed={phase !== 'idle'} label={t('importModal.steps.upload')} />
              <StepLine active={isAtOrPast('normalizing')} />
              <StepDot active={phase === 'normalizing'} completed={isAtOrPast('preview')} label={t('importModal.steps.analyze')} />
              <StepLine active={isAtOrPast('preview')} />
              <StepDot active={phase === 'preview'} completed={isAtOrPast('importing')} label={t('importModal.steps.preview')} />
              <StepLine active={isAtOrPast('importing')} />
              <StepDot active={phase === 'success' || phase === 'error'} completed={phase === 'success'} label={t('importModal.steps.result')} />
            </div>
          </div>

          {/* Body */}
          <Modal.Body className="h-[340px]">

            {/* IDLE — Upload zone */}
            {phase === 'idle' && (
              <div className="animate-fade-in">
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 mb-3">
                  <FiInfo className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <Text variant="caption" className="text-primary-800 dark:text-primary-200">
                    {t('importModal.upload.globalScopeBanner')}
                  </Text>
                </div>
                <label
                  htmlFor="supplier-upload-input"
                  className="block border-2 border-dashed border-neutral hover:border-primary rounded-xl p-8 text-center cursor-pointer transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-3">
                    <FiUpload className="w-5 h-5 text-primary" />
                  </div>
                  <Text variant="body2" weight="medium" className="text-foreground">
                    {t('importModal.upload.dropzone')}
                  </Text>
                  <Text variant="caption" className="text-muted-foreground mt-1 block">
                    {t('importModal.upload.hint')}
                  </Text>
                  <div className="flex justify-center gap-2 mt-3">
                    {['.xlsx', '.xls', '.csv'].map(fmt => (
                      <span key={fmt} className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <input
                    id="supplier-upload-input"
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

            {/* NORMALIZING — AI analyzing */}
            {phase === 'normalizing' && (
              <div className="flex flex-col items-center justify-center py-10 animate-fade-in" role="status" aria-live="polite">
                <div className="relative w-16 h-16 mb-5">
                  <div className="w-full h-full rounded-full border-[3px] border-primary-200 dark:border-primary-800 border-t-primary-500 dark:border-t-primary-400 animate-spin" />
                </div>
                <Text variant="body1" weight="semibold" className="text-foreground mb-1">
                  {t('importModal.normalizing.title')}
                </Text>
                <Text variant="body2" className="text-muted-foreground text-center">
                  {t('importModal.normalizing.description')}
                </Text>
                <div className="w-48 h-1 rounded bg-muted mt-4 overflow-hidden relative">
                  <div className="absolute inset-y-0 w-1/3 rounded bg-primary" style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
                  <style>{`@keyframes shimmer { 0% { left: -33%; } 100% { left: 100%; } }`}</style>
                </div>
              </div>
            )}

            {/* PREVIEW — Summary */}
            {phase === 'preview' && (
              <div className="animate-fade-in space-y-3">
                <div className="bg-muted rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Text variant="body2" className="text-muted-foreground">{t('importModal.preview.suppliersToImport')}</Text>
                    <Text variant="body2" weight="semibold">{previewCount || '—'}</Text>
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center justify-between">
                      <Text variant="body2" className="text-warning-600 dark:text-warning-400">
                        {t('importModal.preview.invalidRows', { count: invalidCount })}
                      </Text>
                    </div>
                  )}
                  {currentSupplierCount > 0 && (
                    <>
                      <div className="border-t border-border my-1" />
                      <div className="flex items-center justify-between">
                        <Text variant="body2" className="text-muted-foreground">{t('importModal.preview.currentSuppliers')}</Text>
                        <Text variant="body2" className="text-muted-foreground">{currentSupplierCount}</Text>
                      </div>
                      <div className="flex items-center justify-between">
                        <Text variant="body2" className="text-muted-foreground">{t('importModal.preview.totalAfterImport')}</Text>
                        <Text variant="body2" weight="semibold">{totalAfterImport}</Text>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* IMPORTING — Loading */}
            {phase === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in" role="status" aria-live="polite">
                <div className="w-14 h-14 rounded-full border-[3px] border-primary-200 dark:border-primary-800 border-t-primary-500 dark:border-t-primary-400 animate-spin mb-5" />
                <Text variant="body1" weight="semibold" className="text-foreground mb-1">
                  {t('importModal.importing.title')}
                </Text>
                <Text variant="body2" className="text-muted-foreground">
                  {t('importModal.importing.description', { count: previewCount || '—' })}
                </Text>
              </div>
            )}

            {/* SUCCESS */}
            {phase === 'success' && (
              <div className="flex flex-col items-center animate-fade-in" role="status" aria-live="polite">
                <div className="w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-3">
                  <FiCheck className="w-7 h-7 text-success-600 dark:text-success-400" />
                </div>
                <Text variant="h5" weight="semibold" className="text-foreground">
                  {t('importModal.success.title')}
                </Text>
                <Text variant="body2" className="text-muted-foreground mt-0.5 mb-5">
                  {importStats.skippedCount > 0
                    ? t('importModal.success.subtitleWithSkipped', { count: importStats.count, skipped: importStats.skippedCount })
                    : t('importModal.success.subtitle', { count: importStats.count })}
                </Text>

                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-5">
                  <div className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-500 w-full" />
                </div>

                <div className="w-48 text-center p-4 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200/50 dark:border-success-800/30">
                  <FiUserPlus className="w-5 h-5 text-success-500 mx-auto mb-1" />
                  <Text variant="h4" weight="bold" className="text-success-700 dark:text-success-400">{importStats.count}</Text>
                  <Text variant="caption" className="text-success-600 dark:text-success-500">{t('importModal.success.suppliers')}</Text>
                </div>

                {rowErrorDetails.length > 0 && (
                  <RowErrorDetailsList rowErrorDetails={rowErrorDetails} approximate={rowNumbersApproximate} t={t} />
                )}
              </div>
            )}

            {/* ERROR */}
            {phase === 'error' && (
              <div className="flex flex-col items-center py-8 animate-fade-in" role="alert" aria-live="assertive">
                <div className="w-14 h-14 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mb-3">
                  <FiAlertTriangle className="w-7 h-7 text-error-600 dark:text-error-400" />
                </div>
                <Text variant="h5" weight="semibold" className="text-foreground mb-2">
                  {t('importModal.error.title')}
                </Text>
                <Text variant="body2" className="text-error-600 dark:text-error-400 text-center max-w-sm">
                  {error || t('importModal.error.description')}
                </Text>

                {rowErrorDetails.length > 0 && (
                  <RowErrorDetailsList rowErrorDetails={rowErrorDetails} approximate={rowNumbersApproximate} t={t} />
                )}
              </div>
            )}

          </Modal.Body>

          {/* Footer */}
          <Modal.Footer>
            {phase === 'idle' && (
              <>
                <Button variant="ghost" onClick={handleClose}>{t('importModal.buttons.cancel')}</Button>
                <Button variant="primary" disabled>{t('importModal.buttons.import', { count: 0 })}</Button>
              </>
            )}
            {phase === 'normalizing' && (
              <Button variant="ghost" disabled>{t('importModal.buttons.cancel')}</Button>
            )}
            {phase === 'preview' && (
              <>
                <Button variant="ghost" onClick={handleClose}>{t('importModal.buttons.cancel')}</Button>
                <Button variant="primary" onClick={handleSubmit}>
                  {t('importModal.buttons.import', { count: previewCount || '?' })}
                </Button>
              </>
            )}
            {phase === 'importing' && (
              <Button variant="ghost" disabled>{t('importModal.buttons.importing')}</Button>
            )}
            {phase === 'success' && (
              <Button variant="primary" onClick={handleClose}>{t('importModal.buttons.done')}</Button>
            )}
            {phase === 'error' && (
              <>
                <Button variant="ghost" onClick={handleClose}>{t('importModal.buttons.close')}</Button>
                <Button variant="primary" onClick={handleRetry}>{t('importModal.buttons.tryAgain')}</Button>
              </>
            )}
          </Modal.Footer>
        </div>
      </Modal>
    </>
  );
};

ImportSuppliersModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ImportSuppliersModal;
