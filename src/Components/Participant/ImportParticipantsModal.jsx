import { useState, useEffect, useRef, useCallback } from 'react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { FiX, FiUpload, FiCheck, FiAlertTriangle, FiDownload, FiUserPlus, FiUsers, FiMinusCircle } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useImportNormalizedParticipantsMutation, useUploadParticipantsMutation } from '../../Api/services/participantApi';
import { useGetEventAsCollaboratorQuery } from '../../Api/services/collaboratorApi';
import { selectSelectedEventId } from '../../Api/eventSelectors';
import { useParticipantData } from './ParticipantTable/hooks/useParticipantData';
import { Text, Button, Modal } from '../UI';
import { COLORS, TRAVEL_SUB, getGroupColumns, EXPORT_GROUPS, ALL_COLUMNS } from './ParticipantTable/utils/exportParticipants';
import { useNormalizeFile } from '../../Hook/useNormalizeFile';
import { billingGateErrorKey } from '../../Hook/useAuthz';

// ── Fallback helpers (used when LLM normalization is unavailable) — column matching mirrors the template, see COLUMN_MAPPINGS in upload-participant Lambda ──

const FRONTEND_COLUMN_MAPPINGS = {
  name: ['nome completo', 'nome', 'name', 'full name', 'participante', 'participant'],
  email: ['email', 'e-mail', 'correio', 'mail'],
  phone: ['telefone', 'phone', 'telemóvel', 'celular', 'tel'],
  hasDependent: ['acompanhante', 'acompanhantes', 'dependent', 'dependente'],
  dependentCount: ['qtd. acompanhantes', 'qtd acompanhantes', 'quantidade', 'qtd', 'quantity', 'número acompanhantes'],
};

function findHeaderRowIndex(worksheet) {
  const maxScan = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxScan; r++) {
    const row = worksheet.getRow(r);
    const cells = (row.values || []).map(v => (v ?? '').toString().toLowerCase().trim());
    const hasName = cells.some(c => c === 'nome' || c === 'nome completo' || c === 'name' || c === 'full name' || c === 'participante');
    const hasEmail = cells.some(c => c === 'email' || c === 'e-mail' || c === 'correio' || c === 'mail');
    if (hasName && hasEmail) return r;
  }
  return 1;
}

function findFrontendColumnIndex(headerRow, columnNames) {
  const headers = (headerRow.values || []).map(v => (v ?? '').toString().toLowerCase().trim());
  const exactIdx = headers.findIndex(h => h && columnNames.some(n => h === n.toLowerCase().trim()));
  if (exactIdx !== -1) return exactIdx;
  const containsIdx = headers.findIndex(h => h && columnNames.some(n => h.includes(n.toLowerCase().trim())));
  if (containsIdx !== -1) return containsIdx;
  return -1;
}

function buildDuplicateKey(name, email, phone) {
  const normName = (name || '').trim().toLowerCase();
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/[\s\-()+ .]/g, '').toLowerCase();
  return `${normName}||${normEmail}||${normPhone}`;
}

function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

async function buildUploadBase64(file) {
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

// ── Template constants (used by handleDownloadTemplate) ──
// Column definitions are shared with the export util (EXPORT_GROUPS/ALL_COLUMNS)
// so the downloaded template and the exported file always stay in sync.

const TEMPLATE_EXAMPLES = {
  participantName: 'Maria Silva', participantEmail: 'maria@example.com',
  participantPhone: '+351 912 345 678', role: 'Speaker', participantJob: 'CTO',
  participantStatus: 'Inscrito', organization: 'TechCo', hasDependent: 'Sim',
  dependentCount: '2', registrationDate: '2026-06-01', participantNote: 'VIP',
  documentationType: 'Passaporte',
  documentLast4: '1234', nationality: 'Portuguesa', residenceCountry: 'Portugal',
  emergencyContact: '+351 963 000 000', internalId: 'P-001', visaRequired: 'Não',
  visaSupport: 'Não', arrivalDate: '2026-06-10', arrivalTime: '10:30',
  arrivalFlight: 'TP1234', arrivalAirport: 'LIS', arrivalLayovers: 'CDG',
  transferRequired: 'Sim', transferDetails: 'Hotel', transferCost: '50',
  transferCurrency: 'EUR', departureDate: '2026-06-14', departureTime: '18:00',
  departureFlight: 'TP5678', departureAirport: 'LIS', ticketFare: '350',
  ticketCurrency: 'EUR', taxesExtras: '45', taxesCurrency: 'EUR',
  totalTravelCost: '445', totalTravelCurrency: 'EUR', paymentStatus: 'Pago',
  bookingReference: 'ABC123', bookingAgency: 'Travel Agency', hotel: 'Hotel Luxo',
  roomType: 'Double', checkInDate: '2026-06-10', checkOutDate: '2026-06-14',
  nights: '4', ratePerNight: '120', rateCurrency: 'EUR', accommodationCost: '480',
  dietaryRestriction: 'Vegetariano', protocol: 'Mesa principal',
};


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

// ── Main component ──

const ImportParticipantsModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation('participant');

  // State
  const [phase, setPhase] = useState('idle'); // idle | normalizing | preview | importing | success | error
  const [file, setFile] = useState(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewDependentsCount, setPreviewDependentsCount] = useState(0);
  const [duplicatePreview, setDuplicatePreview] = useState([]);
  const [error, setError] = useState(null);
  const [importStats, setImportStats] = useState({ count: 0, dependentsCount: 0, skipped: 0 });
  const autoCloseTimerRef = useRef(null);

  // Hooks
  const selectedEventId = useSelector(selectSelectedEventId);
  const { data: eventAccessData } = useGetEventAsCollaboratorQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );
  const selectedEvent = eventAccessData?.event;
  const [importNormalizedParticipants] = useImportNormalizedParticipantsMutation();
  const [uploadParticipants] = useUploadParticipantsMutation();
  const { participantsByEvent } = useParticipantData();
  const { normalize, reset: resetNormalize, data: normalizedData } = useNormalizeFile('participant');
  const currentParticipantCount = selectedEvent?.participantCount || 0;

  const totalAfterImport = currentParticipantCount + previewCount + previewDependentsCount;

  // Reset on open/close
  useEffect(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setPhase('idle');
    setFile(null);
    setPreviewCount(0);
    setPreviewDependentsCount(0);
    setDuplicatePreview([]);
    setError(null);
    setImportStats({ count: 0, dependentsCount: 0, skipped: 0 });
    resetNormalize();
  }, [isOpen, selectedEventId, resetNormalize]);

  // Phase helpers
  const isLocked = phase === 'normalizing' || phase === 'importing';
  const handleClose = useCallback(() => {
    if (!isLocked) onClose();
  }, [isLocked, onClose]);

  const handleRetry = useCallback(() => {
    setPhase('idle');
    setFile(null);
    setError(null);
    setPreviewCount(0);
    setPreviewDependentsCount(0);
    setDuplicatePreview([]);
    resetNormalize();
  }, [resetNormalize]);

  // ── Template download (ExcelJS) ──

  const handleDownloadTemplate = async () => {
    const allCols = ALL_COLUMNS;
    const workbook = new ExcelJS.Workbook();
    const sheetName = t('pages.importModal.template.sheetName', 'Participantes');
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = allCols.map(col => ({ key: col.key, width: col.width }));
    const groupStartCols = [];
    const GROUP_BORDER = { style: 'thin', color: { argb: 'FFCBD5E1' } };

    // Row 1: Group headers
    const row1 = worksheet.getRow(1);
    row1.height = 26;
    let colIdx = 1;
    for (const group of EXPORT_GROUPS) {
      const cols = getGroupColumns(group);
      const start = colIdx;
      const end = colIdx + cols.length - 1;
      const c = COLORS[group.id];
      groupStartCols.push(start);
      if (end > start) worksheet.mergeCells(1, start, 1, end);
      const cell = row1.getCell(start);
      cell.value = t(group.label, group.fallback);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.header } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let i = start; i <= end; i++) {
        row1.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.header } };
      }
      colIdx = end + 1;
    }

    // Row 2: Sub-group headers
    const row2 = worksheet.getRow(2);
    row2.height = 22;
    colIdx = 1;
    for (const group of EXPORT_GROUPS) {
      const c = COLORS[group.id];
      if (group.subGroups) {
        for (const sg of group.subGroups) {
          const start = colIdx;
          const end = colIdx + sg.columns.length - 1;
          const sub = TRAVEL_SUB[sg.id];
          if (end > start) worksheet.mergeCells(2, start, 2, end);
          const cell = row2.getCell(start);
          cell.value = t(sg.label, sg.fallback);
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sub.color } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          for (let i = start; i <= end; i++) {
            row2.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sub.color } };
          }
          colIdx = end + 1;
        }
      } else {
        const cols = group.columns;
        const start = colIdx;
        const end = colIdx + cols.length - 1;
        if (end > start) worksheet.mergeCells(2, start, 2, end);
        for (let i = start; i <= end; i++) {
          row2.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.light } };
        }
        colIdx = end + 1;
      }
    }

    // Row 3: Column headers
    const row3 = worksheet.getRow(3);
    row3.height = 28;
    colIdx = 1;
    for (const group of EXPORT_GROUPS) {
      const c = COLORS[group.id];
      if (group.subGroups) {
        for (const sg of group.subGroups) {
          const sub = TRAVEL_SUB[sg.id];
          for (const col of sg.columns) {
            const cell = row3.getCell(colIdx);
            cell.value = t(col.i18n, col.key);
            cell.font = { bold: true, size: 10, color: { argb: c.text } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sub.light } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { bottom: { style: 'thin', color: { argb: sub.color } } };
            colIdx++;
          }
        }
      } else {
        for (const col of getGroupColumns(group)) {
          const cell = row3.getCell(colIdx);
          cell.value = t(col.i18n, col.key);
          cell.font = { bold: true, size: 10, color: { argb: c.text } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.light } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = { bottom: { style: 'thin', color: { argb: c.sub } } };
          colIdx++;
        }
      }
    }

    for (const r of [1, 2, 3]) {
      for (const startCol of groupStartCols) {
        const cell = worksheet.getRow(r).getCell(startCol);
        cell.border = { ...cell.border, left: GROUP_BORDER };
      }
    }

    const exampleData = {};
    allCols.forEach(col => { exampleData[col.key] = TEMPLATE_EXAMPLES[col.key] || ''; });
    worksheet.addRow(exampleData);
    worksheet.getRow(4).font = { italic: true, color: { argb: 'FF808080' }, size: 10 };
    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];
    worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: allCols.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bafatorio_template_participantes.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // ── File selection (LLM normalize + ExcelJS fallback) ──

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(null);
    setPreviewCount(0);
    setPreviewDependentsCount(0);
    setDuplicatePreview([]);
    setError(null);
    resetNormalize();

    if (!selectedFile) return;

    try {
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        throw new Error(t('pages.importModal.error.invalidFileType'));
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        throw new Error(t('pages.importModal.error.fileTooLarge'));
      }

      setFile(selectedFile);
      setPhase('normalizing');

      let usedNormalize = false;
      try {
        const result = await normalize(selectedFile);
        if (result?.data && result.data.length > 0) {
          usedNormalize = true;
          const validCount = result.summary?.valid ?? 0;
          const dependentsCount = result.summary?.dependentsCount ?? 0;

          const existingKeys = new Set();
          if (participantsByEvent?.length > 0) {
            for (const p of participantsByEvent) {
              existingKeys.add(buildDuplicateKey(p.participantName, p.participantEmail, p.participantPhone));
            }
          }

          const duplicates = [];
          result.data.forEach((participant, idx) => {
            const key = buildDuplicateKey(participant.participantName, participant.participantEmail, participant.participantPhone);
            if (existingKeys.has(key)) {
              duplicates.push({ row: idx + 2, name: participant.participantName, email: participant.participantEmail, phone: participant.participantPhone });
            }
          });

          setPreviewCount(validCount);
          setPreviewDependentsCount(dependentsCount);
          setDuplicatePreview(duplicates);
        }
      } catch {
        // Fall back to local preview and template-based upload when normalization is unavailable.
      }

      // Fallback: local ExcelJS preview (column matching mirrors the template)
      if (!usedNormalize) {
        resetNormalize();
        const workbook = selectedFile.name.match(/\.csv$/i)
          ? await buildWorkbookFromCsv(selectedFile)
          : new ExcelJS.Workbook();
        if (!selectedFile.name.match(/\.csv$/i)) {
          const buffer = await selectedFile.arrayBuffer();
          await workbook.xlsx.load(buffer);
        }
        const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
        if (!worksheet) throw new Error(t('pages.importModal.error.emptyParticipantData'));

        const headerRowNumber = findHeaderRowIndex(worksheet);
        const headerRow = worksheet.getRow(headerRowNumber);
        const nameIdx = findFrontendColumnIndex(headerRow, FRONTEND_COLUMN_MAPPINGS.name);
        const emailIdx = findFrontendColumnIndex(headerRow, FRONTEND_COLUMN_MAPPINGS.email);
        const phoneIdx = findFrontendColumnIndex(headerRow, FRONTEND_COLUMN_MAPPINGS.phone);
        const depIdx = findFrontendColumnIndex(headerRow, FRONTEND_COLUMN_MAPPINGS.hasDependent);
        const depCountIdx = findFrontendColumnIndex(headerRow, FRONTEND_COLUMN_MAPPINGS.dependentCount);

        let validCount = 0;
        let dependentsCount = 0;
        const existingKeys = new Set();
        if (participantsByEvent?.length > 0) {
          for (const p of participantsByEvent) {
            existingKeys.add(buildDuplicateKey(p.participantName, p.participantEmail, p.participantPhone));
          }
        }
        const duplicates = [];

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowNumber) return;
          const name = nameIdx > 0 ? (row.getCell(nameIdx).text || '').trim() : '';
          if (!name) return;
          validCount++;
          const email = emailIdx > 0 ? (row.getCell(emailIdx).text || '').trim() : '';
          const phone = phoneIdx > 0 ? (row.getCell(phoneIdx).text || '').trim() : '';

          let depCount = 0;
          if (depIdx > 0) {
            const val = (row.getCell(depIdx).text || '').trim().toLowerCase();
            if (['sim', 'yes', 's', 'y'].includes(val)) depCount = 1;
            else if (!isNaN(Number(val)) && Number(val) > 0) depCount = Number(val);
          }
          if (depCount === 0 && depCountIdx > 0) {
            const val = (row.getCell(depCountIdx).text || '').trim();
            if (val && !isNaN(Number(val))) depCount = parseInt(val);
          }
          dependentsCount += depCount;

          const key = buildDuplicateKey(name, email, phone);
          if (existingKeys.has(key)) duplicates.push({ row: rowNumber, name, email, phone });
        });

        if (validCount === 0) throw new Error(t('pages.importModal.error.emptyParticipantData'));

        setPreviewCount(validCount);
        setPreviewDependentsCount(dependentsCount);
        setDuplicatePreview(duplicates);
      }

      setPhase('preview');
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message || t('pages.importModal.error.fileReadError'));
      setFile(null);
      setPhase('error');
      if (e.target) e.target.value = null;
    }
  };

  // ── Submit (normalized JSON via LLM, or template-based Lambda fallback) ──

  const handleSubmit = async () => {
    if (!file || !selectedEventId) return;

    setPhase('importing');
    setError(null);

    try {
      if (normalizedData && normalizedData.length > 0) {
        // Primary path: normalized JSON in chunks
        const CHUNK_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < normalizedData.length; i += CHUNK_SIZE) {
          chunks.push(normalizedData.slice(i, i + CHUNK_SIZE));
        }

        let totalCount = 0, totalSkipped = 0, totalDependents = 0;
        for (const chunk of chunks) {
          const result = await importNormalizedParticipants({ eventId: selectedEventId, participants: chunk }).unwrap();
          const details = result?.importNormalizedParticipants;
          if (!details?.success) throw new Error(details?.message || t('pages.importModal.error.defaultMessage'));
          totalCount += details.details?.participantsCount ?? details.count ?? 0;
          totalSkipped += details.details?.skippedCount ?? details.skipped ?? 0;
          totalDependents += details.details?.dependentsCount ?? 0;
        }

        setImportStats({ count: totalCount, dependentsCount: totalDependents, skipped: totalSkipped });
        setPhase('success');
        autoCloseTimerRef.current = setTimeout(() => onClose(), totalSkipped > 0 ? 4000 : 2000);
      } else {
        // Fallback: base64 file to template-based Lambda column mapping
        const base64String = await buildUploadBase64(file);

        const result = await uploadParticipants({ file: base64String, eventId: selectedEventId }).unwrap();
        if (!result?.uploadParticipants?.success) {
          throw new Error(result?.uploadParticipants?.message || t('pages.importModal.error.defaultMessage'));
        }

        let uploadedCount = 0, dependentsCount = 0, skippedCount = 0;
        if (result?.uploadParticipants?.details) {
          uploadedCount = result.uploadParticipants.details.participantsCount ?? 0;
          dependentsCount = result.uploadParticipants.details.dependentsCount ?? 0;
          skippedCount = result.uploadParticipants.details.skippedCount ?? 0;
        } else if (result?.uploadParticipants?.count !== undefined) {
          uploadedCount = result.uploadParticipants.count;
          skippedCount = result.uploadParticipants.skipped ?? 0;
        }

        setImportStats({ count: uploadedCount, dependentsCount, skipped: skippedCount });
        setPhase('success');
        autoCloseTimerRef.current = setTimeout(() => onClose(), skippedCount > 0 ? 4000 : 2000);
      }
    } catch (err) {
      console.error('Import failed:', err);
      // BILLING_GATE:* (janela fechada / limite) tem copy própria com o porquê
      // — sem isto o utilizador via a mensagem crua da Lambda.
      const gateKey = billingGateErrorKey(err, null);
      setError(
        gateKey
          ? t(gateKey)
          : err?.data?.message || err?.message || t('pages.importModal.error.defaultMessage')
      );
      setPhase('error');
    }
  };

  // ── Render ──

  const isAtOrPast = (target) => {
    const order = ['idle', 'normalizing', 'preview', 'importing', 'success', 'error'];
    return order.indexOf(phase) >= order.indexOf(target);
  };

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
              <div>
                <Text variant="body1" weight="semibold" className="text-foreground">
                  {t('pages.importModal.title')}
                </Text>
                {selectedEvent?.name && (
                  <Text variant="caption" className="text-muted-foreground truncate block">
                    {selectedEvent.name}
                  </Text>
                )}
              </div>
              <Button variant="ghost" size="sm" iconOnly onClick={handleClose} disabled={isLocked} aria-label="Close">
                <FiX size={20} />
              </Button>
            </div>

            {/* Step indicator */}
            <div className="flex items-start mt-4 px-4">
              <StepDot active={phase === 'idle'} completed={phase !== 'idle'} label={t('pages.importModal.steps.upload')} />
              <StepLine active={isAtOrPast('normalizing')} />
              <StepDot active={phase === 'normalizing'} completed={isAtOrPast('preview')} label={t('pages.importModal.steps.analyze')} />
              <StepLine active={isAtOrPast('preview')} />
              <StepDot active={phase === 'preview'} completed={isAtOrPast('importing')} label={t('pages.importModal.steps.preview')} />
              <StepLine active={isAtOrPast('importing')} />
              <StepDot active={phase === 'success' || phase === 'error'} completed={phase === 'success'} label={t('pages.importModal.steps.result')} />
            </div>
          </div>

          {/* Body */}
          <Modal.Body className="h-[340px]">

            {/* IDLE — Upload zone */}
            {phase === 'idle' && (
              <div className="animate-fade-in">
                <label
                  htmlFor="file-upload"
                  className="block border-2 border-dashed border-neutral hover:border-primary rounded-xl p-8 text-center cursor-pointer transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-3">
                    <FiUpload className="w-5 h-5 text-primary" />
                  </div>
                  <Text variant="body2" weight="medium" className="text-foreground">
                    {t('pages.importModal.upload.dropzone')}
                  </Text>
                  <Text variant="caption" className="text-muted-foreground mt-1 block">
                    {t('pages.importModal.upload.hint')}
                  </Text>
                  <div className="flex justify-center gap-2 mt-3">
                    {['.xlsx', '.xls', '.csv'].map(fmt => (
                      <span key={fmt} className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center justify-between mt-3 px-3 py-2.5 bg-muted rounded-lg border border-border">
                  <Text variant="caption" className="text-muted-foreground">
                    {t('pages.importModal.upload.templateHint')}
                  </Text>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <FiDownload className="w-3 h-3" />
                    {t('pages.importModal.upload.templateButton')}
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
                  {t('pages.importModal.normalizing.title')}
                </Text>
                <Text variant="body2" className="text-muted-foreground text-center">
                  {t('pages.importModal.normalizing.description')}
                </Text>
                <div className="w-48 h-1 rounded bg-muted mt-4 overflow-hidden relative">
                  <div className="absolute inset-y-0 w-1/3 rounded bg-primary animate-pulse" style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
                  <style>{`@keyframes shimmer { 0% { left: -33%; } 100% { left: 100%; } }`}</style>
                </div>
              </div>
            )}

            {/* PREVIEW — Summary + duplicates */}
            {phase === 'preview' && (
              <div className="animate-fade-in space-y-3">
                <div className="bg-muted rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Text variant="body2" className="text-muted-foreground">{t('pages.importModal.preview.participantsToImport')}</Text>
                    <Text variant="body2" weight="semibold">{previewCount}</Text>
                  </div>
                  {previewDependentsCount > 0 && (
                    <div className="flex items-center justify-between">
                      <Text variant="body2" className="text-muted-foreground">{t('pages.importModal.preview.companions')}</Text>
                      <Text variant="body2" weight="semibold">{previewDependentsCount}</Text>
                    </div>
                  )}
                  {currentParticipantCount > 0 && (
                    <>
                      <div className="border-t border-border my-1" />
                      <div className="flex items-center justify-between">
                        <Text variant="body2" className="text-muted-foreground">{t('pages.importModal.preview.currentParticipants')}</Text>
                        <Text variant="body2" className="text-muted-foreground">{currentParticipantCount}</Text>
                      </div>
                      <div className="flex items-center justify-between">
                        <Text variant="body2" className="text-muted-foreground">{t('pages.importModal.preview.totalAfterImport')}</Text>
                        <Text variant="body2" weight="semibold">{totalAfterImport}</Text>
                      </div>
                    </>
                  )}
                </div>

                {duplicatePreview.length > 0 && (
                  <div className="flex gap-2.5 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/10 border border-warning-400 dark:border-warning-600/30">
                    <FiAlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <Text variant="body2" weight="semibold" className="text-warning-700 dark:text-warning-400">
                        {t('pages.importModal.duplicates.previewTitle', { count: duplicatePreview.length })}
                      </Text>
                      <Text variant="caption" className="text-muted-foreground">
                        {t('pages.importModal.duplicates.previewDescription')}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMPORTING — Loading */}
            {phase === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in" role="status" aria-live="polite">
                <div className="w-14 h-14 rounded-full border-[3px] border-primary-200 dark:border-primary-800 border-t-primary-500 dark:border-t-primary-400 animate-spin mb-5" />
                <Text variant="body1" weight="semibold" className="text-foreground mb-1">
                  {t('pages.importModal.importing.title')}
                </Text>
                <Text variant="body2" className="text-muted-foreground">
                  {t('pages.importModal.importing.description', { participants: previewCount, companions: previewDependentsCount })}
                </Text>
              </div>
            )}

            {/* SUCCESS — Stats grid */}
            {phase === 'success' && (
              <div className="flex flex-col items-center animate-fade-in" role="status" aria-live="polite">
                <div className="w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-3">
                  <FiCheck className="w-7 h-7 text-success-600 dark:text-success-400" />
                </div>
                <Text variant="h5" weight="semibold" className="text-foreground">
                  {t('pages.importModal.success.title')}
                </Text>
                <Text variant="body2" className="text-muted-foreground mt-0.5 mb-5">
                  {importStats.count === 0 && importStats.skipped > 0
                    ? t('pages.importModal.success.allDuplicates')
                    : t('pages.importModal.success.subtitle', { count: importStats.count + importStats.dependentsCount })
                  }
                </Text>

                {(importStats.count > 0 || importStats.dependentsCount > 0) && (
                  <>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-5">
                      <div className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-500 w-full" />
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 w-full">
                      <div className="text-center p-3.5 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200/50 dark:border-success-800/30">
                        <FiUserPlus className="w-4 h-4 text-success-500 mx-auto mb-1" />
                        <Text variant="h4" weight="bold" className="text-success-700 dark:text-success-400">{importStats.count}</Text>
                        <Text variant="caption" className="text-success-600 dark:text-success-500">{t('pages.importModal.success.participants')}</Text>
                      </div>
                      <div className="text-center p-3.5 rounded-lg bg-info-50 dark:bg-info-900/20 border border-info-200/50 dark:border-info-800/30">
                        <FiUsers className="w-4 h-4 text-info-500 mx-auto mb-1" />
                        <Text variant="h4" weight="bold" className="text-info-700 dark:text-info-400">{importStats.dependentsCount}</Text>
                        <Text variant="caption" className="text-info-600 dark:text-info-500">{t('pages.importModal.success.companions')}</Text>
                      </div>
                      <div className="text-center p-3.5 rounded-lg bg-muted border border-border/50">
                        <FiMinusCircle className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                        <Text variant="h4" weight="bold" className="text-muted-foreground">{importStats.skipped}</Text>
                        <Text variant="caption" className="text-muted-foreground">{t('pages.importModal.success.skipped')}</Text>
                      </div>
                    </div>
                  </>
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
                  {t('pages.importModal.error.title')}
                </Text>
                <Text variant="body2" className="text-error-600 dark:text-error-400 text-center max-w-sm">
                  {error || t('pages.importModal.error.description')}
                </Text>
              </div>
            )}

          </Modal.Body>

          {/* Footer */}
          <Modal.Footer>
            {phase === 'idle' && (
              <>
                <Button variant="ghost" onClick={handleClose}>{t('pages.importModal.buttons.cancel')}</Button>
                <Button variant="primary" disabled>{t('pages.importModal.buttons.import', { count: 0 })}</Button>
              </>
            )}
            {phase === 'normalizing' && (
              <Button variant="ghost" disabled>{t('pages.importModal.buttons.cancel')}</Button>
            )}
            {phase === 'preview' && (
              <>
                <Button variant="ghost" onClick={handleClose}>{t('pages.importModal.buttons.cancel')}</Button>
                <Button variant="primary" onClick={handleSubmit}>
                  {t('pages.importModal.buttons.import', { count: previewCount })}
                </Button>
              </>
            )}
            {phase === 'importing' && (
              <Button variant="ghost" disabled>{t('pages.importModal.buttons.importing')}</Button>
            )}
            {phase === 'success' && (
              <Button variant="primary" onClick={handleClose}>{t('pages.importModal.buttons.done')}</Button>
            )}
            {phase === 'error' && (
              <>
                <Button variant="ghost" onClick={handleClose}>{t('pages.importModal.buttons.close')}</Button>
                <Button variant="primary" onClick={handleRetry}>{t('pages.importModal.buttons.tryAgain')}</Button>
              </>
            )}
          </Modal.Footer>
        </div>
      </Modal>
    </>
  );
};

ImportParticipantsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ImportParticipantsModal;
