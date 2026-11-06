import ExcelJS from 'exceljs';
import { format, parseISO } from 'date-fns';

/*
 * 5 export groups matching modal tabs. Each group can contain sub-groups
 * for visual separation within large sections (e.g. Viagem).
 *
 * Header hierarchy:
 *   Row 1 — Group headers (merged, dark solid colour, white text)
 *   Row 2 — Sub-group headers within Viagem; other groups merge this row
 *   Row 3 — Column headers (light tint, dark text)
 *   Row 4+ — Data with zebra striping
 */
const F = 'participantsV2.formModal.fields';
const S = 'participantsV2.formModal.sections';
const T = 'participantsV2.table.columns';
const E = 'participantsV2.export';

// ── Darkened group header colours (WCAG AA contrast with white text) ──
export const COLORS = {
  basic:          { header: 'FF1E40AF', sub: 'FF3B82F6', light: 'FFDBEAFE', text: 'FF1E3A5F' },
  identification: { header: 'FF92400E', sub: 'FFF59E0B', light: 'FFFEF3C7', text: 'FF78350F' },
  travel:         { header: 'FF065F46', sub: 'FF10B981', light: 'FFD1FAE5', text: 'FF064E3B' },
  accommodation:  { header: 'FF5B21B6', sub: 'FF8B5CF6', light: 'FFEDE9FE', text: 'FF4C1D95' },
  other:          { header: 'FF9D174D', sub: 'FFEC4899', light: 'FFFCE7F3', text: 'FF831843' },
};

// Sub-group shades within Viagem
export const TRAVEL_SUB = {
  arrival:   { color: 'FF10B981', light: 'FFD1FAE5' },
  transfer:  { color: 'FF34D399', light: 'FFA7F3D0' },
  departure: { color: 'FF059669', light: 'FF6EE7B7' },
  costs:     { color: 'FF047857', light: 'FFA7F3D0' },
};

export const EXPORT_GROUPS = [
  // ── 1. Dados Basicos ──
  {
    id: 'basic',
    label: 'participantsV2.formModal.tabs.basic',
    fallback: 'Dados Basicos',
    columns: [
      { key: 'participantName',   i18n: `${F}.participantName`,   width: 28 },
      { key: 'participantEmail',  i18n: `${F}.participantEmail`,  width: 28 },
      { key: 'participantPhone',  i18n: `${F}.participantPhone`,  width: 16 },
      { key: 'role',              i18n: `${F}.roleId`,            width: 16 },
      { key: 'participantJob',    i18n: `${F}.participantJob`,    width: 20 },
      { key: 'participantStatus', i18n: `${F}.participantStatus`, width: 14 },
      { key: 'organization',      i18n: `${F}.organization`,      width: 20 },
      { key: 'hasDependent',      i18n: `${E}.fields.hasDependent`,  width: 16 },
      { key: 'dependentCount',    i18n: `${E}.fields.dependentCount`, width: 18 },
      { key: 'registrationDate',  i18n: `${T}.registration`,      width: 14 },
      { key: 'participantNote',   i18n: `${F}.participantNote`,   width: 26 },
    ],
  },
  // ── 2. Identificacao ──
  {
    id: 'identification',
    label: 'participantsV2.formModal.tabs.identification',
    fallback: 'Identificacao',
    columns: [
      { key: 'documentationType', i18n: `${F}.documentationType`, width: 18 },
      { key: 'documentLast4',     i18n: `${F}.documentLast4`,     width: 16 },
      { key: 'nationality',       i18n: `${F}.nationality`,       width: 16 },
      { key: 'residenceCountry',  i18n: `${F}.residenceCountry`,  width: 18 },
      { key: 'emergencyContact',  i18n: `${F}.emergencyContact`,  width: 20 },
      { key: 'internalId',        i18n: `${F}.internalId`,        width: 14 },
      { key: 'visaRequired',      i18n: `${S}.visaRequired`,      width: 16 },
      { key: 'visaSupport',       i18n: `${S}.visaSupport`,       width: 16 },
    ],
  },
  // ── 3. Viagem (with sub-groups) ──
  {
    id: 'travel',
    label: 'participantsV2.formModal.tabs.travel',
    fallback: 'Viagem',
    subGroups: [
      {
        id: 'arrival',
        label: `${S}.arrival`,
        fallback: 'Chegada',
        columns: [
          { key: 'arrivalDate',     i18n: `${F}.arrivalDate`,     width: 14 },
          { key: 'arrivalTime',     i18n: `${F}.arrivalTime`,     width: 14 },
          { key: 'arrivalFlight',   i18n: `${F}.arrivalFlight`,   width: 16 },
          { key: 'arrivalAirport',  i18n: `${E}.fields.arrivalAirport`,  width: 16 },
          { key: 'arrivalLayovers', i18n: `${F}.arrivalLayovers`, width: 14 },
        ],
      },
      {
        id: 'transfer',
        label: `${S}.transfer`,
        fallback: 'Transfer',
        columns: [
          { key: 'transferRequired', i18n: `${S}.transferRequired`,       width: 16 },
          { key: 'transferDetails',  i18n: `${F}.transferDetails`,        width: 18 },
          { key: 'transferCost',     i18n: `${E}.fields.transferCost`,    width: 14 },
          { key: 'transferCurrency', i18n: `${E}.fields.transferCurrency`, width: 12 },
        ],
      },
      {
        id: 'departure',
        label: `${S}.departure`,
        fallback: 'Partida',
        columns: [
          { key: 'departureDate',    i18n: `${F}.departureDate`,    width: 14 },
          { key: 'departureTime',    i18n: `${F}.departureTime`,    width: 14 },
          { key: 'departureFlight',  i18n: `${F}.departureFlight`,  width: 16 },
          { key: 'departureAirport', i18n: `${E}.fields.departureAirport`, width: 16 },
        ],
      },
      {
        id: 'costs',
        label: `${S}.travelCosts`,
        fallback: 'Custos de Viagem',
        columns: [
          { key: 'ticketFare',          i18n: `${F}.ticketFare`,          width: 14 },
          { key: 'ticketCurrency',      i18n: `${E}.fields.ticketCurrency`,      width: 12 },
          { key: 'taxesExtras',         i18n: `${F}.taxesExtras`,         width: 14 },
          { key: 'taxesCurrency',       i18n: `${E}.fields.taxesCurrency`,       width: 12 },
          { key: 'totalTravelCost',     i18n: `${F}.totalTravelCost`,     width: 14 },
          { key: 'totalTravelCurrency', i18n: `${E}.fields.totalCurrency`,       width: 12 },
          { key: 'paymentStatus',       i18n: `${F}.paymentStatus`,       width: 18 },
          { key: 'bookingReference',    i18n: `${F}.bookingReference`,    width: 18 },
          { key: 'bookingAgency',       i18n: `${F}.bookingAgency`,       width: 18 },
        ],
      },
    ],
  },
  // ── 4. Alojamento ──
  {
    id: 'accommodation',
    label: 'participantsV2.formModal.tabs.accommodation',
    fallback: 'Alojamento',
    columns: [
      { key: 'hotel',             i18n: `${F}.hotelName`,         width: 22 },
      { key: 'roomType',          i18n: `${F}.roomType`,          width: 16 },
      { key: 'checkInDate',       i18n: `${F}.checkInDate`,       width: 14 },
      { key: 'checkOutDate',      i18n: `${F}.checkOutDate`,      width: 14 },
      { key: 'nights',            i18n: `${F}.nights`,            width: 10 },
      { key: 'ratePerNight',      i18n: `${F}.ratePerNight`,      width: 14 },
      { key: 'rateCurrency',      i18n: `${E}.fields.accommodationCurrency`, width: 12 },
      { key: 'accommodationCost', i18n: `${F}.accommodationCost`, width: 18 },
    ],
  },
  // ── 5. Outros ──
  {
    id: 'other',
    label: `${E}.groups.other`,
    fallback: 'Outros',
    columns: [
      { key: 'dietaryRestriction', i18n: `${E}.fields.dietaryRestriction`, width: 20 },
      { key: 'protocol',           i18n: `${E}.fields.protocol`,           width: 16 },
    ],
  },
];

// ── Helpers to flatten groups (including sub-groups) ──
export function getGroupColumns(group) {
  if (group.subGroups) return group.subGroups.flatMap(sg => sg.columns);
  return group.columns;
}
export const ALL_COLUMNS = EXPORT_GROUPS.flatMap(getGroupColumns);

// ── Field type sets ──
const DATE_FIELDS = new Set([
  'registrationDate', 'arrivalDate', 'departureDate', 'checkInDate', 'checkOutDate',
]);
const BOOL_FIELDS = new Set([
  'visaRequired', 'visaSupport', 'transferRequired',
]);
const NUMERIC_FIELDS = new Set([
  'nights', 'ratePerNight', 'accommodationCost', 'transferCost',
  'ticketFare', 'taxesExtras', 'totalTravelCost',
]);
const WRAP_FIELDS = new Set([
  'participantNote',
]);

// ── Status translation map ──
const STATUS_KEYS = {
  REGISTERED: 'participantsV2.status.registered',
  CONFIRMED:  'participantsV2.status.confirmed',
  CANCELLED:  'participantsV2.status.cancelled',
  ATTENDED:   'participantsV2.status.attended',
};
const PAYMENT_KEYS = {
  PENDING: `${F}.paymentStatusOptions.pending`,
  PAID:    `${F}.paymentStatusOptions.paid`,
  PARTIAL: `${F}.paymentStatusOptions.partial`,
};

// ── Border styles ──
const GROUP_BORDER = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const CELL_BORDER = { style: 'thin', color: { argb: 'FFE2E8F0' } };

/**
 * Exports participants to .xlsx with 5 colour-coded groups matching modal tabs.
 *
 * Row 1 — Group headers (merged, dark solid, white text)
 * Row 2 — Sub-group headers for Viagem; other groups merge this row
 * Row 3 — Column headers (light tint, dark text, auto-filter)
 * Row 4+ — Data rows with zebra striping
 */
export async function exportParticipants({ participants, t, getRoleName, eventName, allDependents = [] }) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = t('participantsV2.pageTitle', 'Participantes');
  const worksheet = workbook.addWorksheet(sheetName);

  const boolYes = t(`${E}.yes`, 'Yes');
  const boolNo = t(`${E}.no`, 'No');

  // Index dependents by participantId
  const depsByParticipant = {};
  for (const dep of allDependents) {
    if (!dep.participantId) continue;
    (depsByParticipant[dep.participantId] ||= []).push(dep);
  }

  // Track first column index of each group (for vertical borders)
  const groupStartCols = [];

  // ── Column widths ──
  worksheet.columns = ALL_COLUMNS.map(col => ({ key: col.key, width: col.width }));

  // ═══════════════════════════════════════════
  // ROW 1: Group headers (dark, high contrast)
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // ROW 2: Sub-group headers (Viagem splits; others merge)
  // ═══════════════════════════════════════════
  const row2 = worksheet.getRow(2);
  row2.height = 22;
  colIdx = 1;

  for (const group of EXPORT_GROUPS) {
    const c = COLORS[group.id];

    if (group.subGroups) {
      // Viagem — render each sub-group
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
      // Other groups — merge row 2 with a subtle tint
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

  // ═══════════════════════════════════════════
  // ROW 3: Column headers
  // ═══════════════════════════════════════════
  const row3 = worksheet.getRow(3);
  row3.height = 28;
  colIdx = 1;

  for (const group of EXPORT_GROUPS) {
    const c = COLORS[group.id];
    const cols = getGroupColumns(group);

    // For Viagem, use sub-group-specific tints
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
      for (const col of cols) {
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

  // ═══════════════════════════════════════════
  // DATA ROWS
  // ═══════════════════════════════════════════
  const zebraFill = 'FFF0F4F8';

  participants.forEach((p, rowIndex) => {
    const row = {};
    for (const col of ALL_COLUMNS) {
      const key = col.key;

      if (key === 'role') {
        row[key] = getRoleName(p.roleId, p.role?.name) || '';
      } else if (key === 'participantStatus') {
        const statusKey = STATUS_KEYS[p.participantStatus];
        row[key] = statusKey ? t(statusKey, p.participantStatus) : (p.participantStatus || '');
      } else if (key === 'paymentStatus') {
        const payKey = PAYMENT_KEYS[p.paymentStatus];
        row[key] = payKey ? t(payKey, p.paymentStatus) : (p.paymentStatus || '');
      } else if (key === 'hasDependent') {
        row[key] = (depsByParticipant[p.id]?.length > 0) ? boolYes : boolNo;
      } else if (key === 'dependentCount') {
        const depCount = depsByParticipant[p.id]?.length || 0;
        row[key] = depCount > 0 ? depCount : '';
      } else if (DATE_FIELDS.has(key)) {
        row[key] = p[key] ? format(parseISO(p[key]), 'dd/MM/yyyy') : '';
      } else if (BOOL_FIELDS.has(key)) {
        row[key] = p[key] == null ? '' : (p[key] ? boolYes : boolNo);
      } else if (NUMERIC_FIELDS.has(key)) {
        row[key] = p[key] != null ? Number(p[key]) : '';
      } else {
        row[key] = p[key] || '';
      }
    }

    const excelRow = worksheet.addRow(row);

    // Cell borders + zebra striping
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: CELL_BORDER,
        bottom: CELL_BORDER,
        left: CELL_BORDER,
        right: CELL_BORDER,
      };
      if (rowIndex % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraFill } };
      }
    });

    // Wrap text for long-content columns (dependents, notes)
    ALL_COLUMNS.forEach((col, i) => {
      if (WRAP_FIELDS.has(col.key)) {
        excelRow.getCell(i + 1).alignment = { wrapText: true, vertical: 'top' };
      }
    });

    // Stronger vertical group borders (override left border on group start columns)
    for (const startCol of groupStartCols) {
      excelRow.getCell(startCol).border = {
        ...excelRow.getCell(startCol).border,
        left: GROUP_BORDER,
      };
    }
  });

  // Also apply vertical borders to header rows
  for (const r of [1, 2, 3]) {
    for (const startCol of groupStartCols) {
      const cell = worksheet.getRow(r).getCell(startCol);
      cell.border = { ...cell.border, left: GROUP_BORDER };
    }
  }

  // ═══════════════════════════════════════════
  // FREEZE + FILTER
  // ═══════════════════════════════════════════
  worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: ALL_COLUMNS.length },
  };

  // ═══════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeName = (eventName || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName ? `${safeName}_participantes.xlsx` : 'participantes.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
