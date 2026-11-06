import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
import PropTypes from 'prop-types';
import ExcelJS from 'exceljs';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiPlusSquare, FiX } from 'react-icons/fi';
import Papa from 'papaparse';
import { useEditableSpreadsheet } from '../../../Hook/useEditableSpreadsheet';
import { parseCsv } from '../../../Utils/parseCsv';
import { getExcelCellText } from '../../../Utils/excelCellText';
import Button from '../../UI/Button';
import Input from '../../UI/Input';

const MAX_ROWS = 200;
const MAX_SHEETS = 10;
// Defence-in-depth against accidental DoS / runaway memory: a user pasting
// 10MB of text into a single cell would inflate editableCells and slow every
// subsequent render. 32KB is comfortably more than any human-typed value.
const CELL_INPUT_MAX_LENGTH = 32_768;
// Stable reference for rows with no edits — keeps React.memo happy.
const EMPTY_EDITS = Object.freeze({});
const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_CONTENT_TYPE = 'text/csv';

const getExtension = (name) => {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
};

/**
 * Single table row in the editable grid. Memoized so a keystroke in one cell
 * only re-renders that cell's row instead of the entire visible grid.
 *
 * The custom equality comparator is intentional. The default shallow compare
 * cannot tell that two `editsForRow` objects represent the same data when the
 * parent rebuilds the per-row map on every keystroke (which is the cheapest
 * implementation of editsByRow). Stabilizing the per-row reference would
 * require either an extra useRef Map with manual diff bookkeeping or wider
 * changes to the hook to track per-row versions — both with their own bug
 * surface. The comparator is small, well-bounded (O(edits per row), typically
 * 0-3), and documented inline.
 *
 * If the project ever adopts the React Compiler, this manual memo can be
 * deleted in one go.
 */
const EditableRow = memo(
  function EditableRow({
    activeSheet,
    rowIdx,
    rowData,
    rowAligns,
    rowSpans,
    colCount,
    editsForRow,
    savedCells,
    editingColIdx,
    inputRef,
    onCellClick,
    onCellEdit,
    onCellKeyDown,
    onCellBlur,
  }) {
    const isEvenRow = rowIdx % 2 === 0;
    return (
      <tr
        className={`transition-colors ${isEvenRow ? 'bg-background' : 'bg-muted/30'} hover:bg-accent/60`}
      >
        {Array.from({ length: colCount }).map((_, ci) => {
          const span = rowSpans?.[ci] ?? 1;
          if (span === 0) return null; // merged-cell horizontal slave
          const originalValue = rowData[ci] ?? '';
          const editedValue = editsForRow[ci];
          const cellValue = editedValue !== undefined ? editedValue : originalValue;
          const isDirty = editedValue !== undefined;
          const isActiveCell = editingColIdx === ci;
          const align = rowAligns?.[ci] || 'left';
          const alignClass =
            align === 'right' ? 'text-right tabular-nums'
              : align === 'center' ? 'text-center'
              : 'text-left';

          const cellKey = `c_${activeSheet}_${rowIdx}_${ci}`;
          const isSaved = savedCells.has(cellKey);

          return (
            <td
              key={ci}
              colSpan={span > 1 ? span : undefined}
              className={`px-2 py-1 text-xs border-b border-r border-border relative
                whitespace-nowrap ${alignClass} transition-colors duration-500 ${
                isSaved
                  ? 'bg-success-50 dark:bg-success-900/20 !border-success-300 dark:!border-success-600'
                  : isDirty
                  ? 'bg-warning-50 dark:bg-warning-900/20 !border-warning-300 dark:!border-warning-600'
                  : ''
              }`}
              onClick={() => onCellClick(activeSheet, rowIdx, ci)}
            >
              {isActiveCell ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={cellValue}
                  maxLength={CELL_INPUT_MAX_LENGTH}
                  onChange={(e) => onCellEdit(activeSheet, rowIdx, ci, e.target.value)}
                  onKeyDown={onCellKeyDown}
                  onBlur={onCellBlur}
                  className="w-full px-1 py-0 text-xs border border-primary-500
                    bg-background dark:bg-neutral-800
                    focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <div className="cursor-pointer hover:opacity-75 overflow-hidden text-ellipsis" title={cellValue}>
                  {cellValue}
                </div>
              )}
              {isDirty && !isActiveCell && (
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-warning-500 rounded-full" />
              )}
            </td>
          );
        })}
      </tr>
    );
  },
  (prev, next) => {
    // Reference checks first — these are the cheapest and cover most paths.
    if (prev.rowData !== next.rowData) return false;
    if (prev.rowAligns !== next.rowAligns) return false;
    if (prev.rowSpans !== next.rowSpans) return false;
    if (prev.colCount !== next.colCount) return false;
    if (prev.activeSheet !== next.activeSheet) return false;
    if (prev.rowIdx !== next.rowIdx) return false;
    if (prev.editingColIdx !== next.editingColIdx) return false;
    if (prev.inputRef !== next.inputRef) return false;
    // All callbacks are useCallback-stable in the parent.
    if (prev.onCellClick !== next.onCellClick) return false;
    if (prev.onCellEdit !== next.onCellEdit) return false;
    if (prev.onCellKeyDown !== next.onCellKeyDown) return false;
    if (prev.onCellBlur !== next.onCellBlur) return false;
    // editsForRow: shallow per-key/value compare. Fast path: same reference
    // (e.g. both EMPTY_EDITS) → exit immediately.
    if (prev.editsForRow === next.editsForRow) return true;
    const prevKeys = Object.keys(prev.editsForRow);
    const nextKeys = Object.keys(next.editsForRow);
    if (prevKeys.length !== nextKeys.length) return false;
    for (const k of prevKeys) {
      if (prev.editsForRow[k] !== next.editsForRow[k]) return false;
    }
    return true;
  },
);

EditableRow.propTypes = {
  activeSheet: PropTypes.number.isRequired,
  rowIdx: PropTypes.number.isRequired,
  rowData: PropTypes.array.isRequired,
  rowAligns: PropTypes.array,
  rowSpans: PropTypes.array,
  colCount: PropTypes.number.isRequired,
  editsForRow: PropTypes.object.isRequired,
  savedCells: PropTypes.instanceOf(Set).isRequired,
  editingColIdx: PropTypes.number.isRequired, // -1 when not editing this row
  inputRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  onCellClick: PropTypes.func.isRequired,
  onCellEdit: PropTypes.func.isRequired,
  onCellKeyDown: PropTypes.func.isRequired,
  onCellBlur: PropTypes.func.isRequired,
};

const EditableSpreadsheetRenderer = forwardRef(({ url, name, onLoaded, onError, onDirtyChange }, ref) => {
  const { t } = useTranslation('event');
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [totalSheetCount, setTotalSheetCount] = useState(0);
  const [originalWorkbook, setOriginalWorkbook] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { sheetIdx, rowIdx, colIdx }
  const [editingHeader, setEditingHeader] = useState(null); // { sheetIdx, colIdx }
  const [savedCells, setSavedCells] = useState(new Set()); // células/headers salvos para mostrar feedback
  const [hasStructuralChanges, setHasStructuralChanges] = useState(false);
  const [hasHeaderChanges, setHasHeaderChanges] = useState(false); // Rastreia mudanças de headers
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnName, setColumnName] = useState('');
  const inputRef = useRef(null);
  const headerInputRef = useRef(null);
  const columnInputRef = useRef(null);
  const parsedSheetsRef = useRef([]);
  // Per-key timers so concurrent saves don't cancel each other's success-flash
  const saveTimeoutsRef = useRef(new Map());
  const extension = getExtension(name);
  const isCsv = extension === 'csv';

  const {
    editableCells,
    dirtyCount,
    hasDirty,
    updateCell,
    reconstructWorkbook,
    clear: clearEdits,
  } = useEditableSpreadsheet(sheets);

  // Detect header changes by comparing current sheets with parsed original
  useEffect(() => {
    if (parsedSheetsRef.current.length === 0) return;
    const hasChanges = sheets.some((sheet, sheetIdx) => {
      const original = parsedSheetsRef.current[sheetIdx];
      if (!original) return false;
      // Check if headers changed
      const currentHeaders = sheet.headers || [];
      const originalHeaders = original.headers || [];
      if (currentHeaders.length !== originalHeaders.length) return true;
      return currentHeaders.some((h, i) => h !== originalHeaders[i]);
    });
    setHasHeaderChanges(hasChanges);
  }, [sheets]);

  // Notify parent of dirty state changes
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(hasDirty || hasStructuralChanges || hasHeaderChanges, dirtyCount);
    }
  }, [hasDirty, hasStructuralChanges, hasHeaderChanges, dirtyCount, onDirtyChange]);

  const fetchContent = useCallback(async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      if (isCsv) {
        const text = await response.text();
        // parseCsv routes through Papa's worker when supported; synchronous
        // fallback for prod/CSP edge cases.
        const result = await parseCsv(text);
        if (result.errors.length > 0) {
          console.warn('[EditableSpreadsheetRenderer] CSV parse warnings:', result.errors);
        }
        const data = (result.data || []).map((r) =>
          r.map((c) => (c == null ? '' : String(c)))
        );

        // Same header-detection heuristic as xlsx: first row with ≥2
        // non-empty cells is the real header; rows above are title/banner.
        const nonEmptyCount = (r) => r.filter((c) => c !== '').length;
        let headerIdx = data.findIndex((r) => nonEmptyCount(r) >= 2);
        if (headerIdx < 0) {
          headerIdx = data.findIndex((r) => nonEmptyCount(r) >= 1);
        }

        const inferAlign = (v) => (v !== '' && !isNaN(Number(v)) ? 'right' : 'left');

        const headers = headerIdx >= 0 ? data[headerIdx] : [];
        const headerAligns = headers.map(inferAlign);
        // Pad each data row to the header width so edits in right-side cells
        // of ragged rows are preserved on save (reconstructCsv iterates by
        // cell presence, not by header count).
        const width = headers.length;
        const dataRows = (headerIdx >= 0 ? data.slice(headerIdx + 1) : data).map((r) => {
          const normalized = [...r];
          while (normalized.length < width) normalized.push('');
          return normalized;
        });
        const totalRows = dataRows.length;
        const rows = dataRows;
        const aligns = rows.map((r) => r.map(inferAlign));

        const titleRows = headerIdx > 0
          ? data.slice(0, headerIdx).map((r) => ({ cells: r, aligns: r.map(inferAlign) }))
          : [];

        const parsedSheets = [{ name: 'Sheet1', headers, rows, totalRows, headerAligns, aligns, titleRows }];
        setOriginalWorkbook(null);
        parsedSheetsRef.current = parsedSheets;
        setSheets(parsedSheets);
        setActiveSheet(0);
        setTotalSheetCount(1);
        onLoaded();
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      setOriginalWorkbook(workbook);

      const parsed = [];
      let sheetCount = 0;
      workbook.eachSheet((worksheet) => {
        sheetCount++;
        if (parsed.length >= MAX_SHEETS) return;

        // Collect every row (with merged-cell deduplication). Decide which
        // row is the real header afterwards — same heuristic as the preview
        // renderer so edit ↔ preview stay consistent.
        const allRows = []; // Array<{ cells: string[], aligns: string[] }>

        worksheet.eachRow((row) => {
          const values = row.values.slice(1); // exceljs row.values is 1-indexed
          const cells = [];
          const aligns = [];
          const spans = []; // 0 = slave (skip render), 1 = normal, N>1 = master spanning N cols
          for (let i = 0; i < values.length; i++) {
            const cell = row.getCell(i + 1);
            const isMergedDuplicate = cell.master && cell.master !== cell;
            const isMergedMaster = cell.isMerged && cell.master === cell;

            // Master text via the shared excelCellText helper, which covers
            // all 10 ExcelJS value shapes (formula / sharedFormula /
            // arrayFormula / richText / error / hyperlink / Date / null /
            // primitives / fallback). The previous two-branch heuristic
            // produced "[object Object]" on rich text and error cells.
            const text = isMergedDuplicate ? '' : getExcelCellText(values[i]);
            cells.push(text);

            const explicit = cell.alignment?.horizontal;
            let align;
            if (explicit && explicit !== 'general') align = explicit;
            else align = typeof cell.value === 'number' ? 'right' : 'left';
            aligns.push(align);

            // Horizontal slave → skip (0); vertical slave → render empty (1).
            if (isMergedDuplicate) {
              const m = typeof cell.master.address === 'string'
                ? cell.master.address.match(/\d+$/)
                : null;
              const masterRow = m ? parseInt(m[0], 10) : 0;
              spans.push(masterRow === row.number ? 0 : 1);
            } else if (isMergedMaster) {
              let count = 1;
              while (i + count < values.length) {
                const next = row.getCell(i + count + 1);
                if (next.master === cell) count++;
                else break;
              }
              spans.push(count);
            } else {
              spans.push(1);
            }
          }
          allRows.push({ cells, aligns, spans });
        });

        // Detect real header row (first with ≥2 non-empty cells); rows above
        // become title/banner rows.
        const nonEmptyCount = (r) => r.cells.filter((c) => c !== '').length;
        let headerIdx = allRows.findIndex((r) => nonEmptyCount(r) >= 2);
        if (headerIdx < 0) {
          headerIdx = allRows.findIndex((r) => nonEmptyCount(r) >= 1);
        }

        const titleRows = headerIdx > 0 ? allRows.slice(0, headerIdx) : [];
        const headers = [];
        let headerAligns = [];
        let headerSpans = [];
        const allDataRows = [];
        if (headerIdx >= 0) {
          headers.push(...allRows[headerIdx].cells);
          headerAligns = allRows[headerIdx].aligns;
          headerSpans = allRows[headerIdx].spans;
          for (let i = headerIdx + 1; i < allRows.length; i++) {
            allDataRows.push(allRows[i]);
          }
        }

        const totalRows = allDataRows.length;
        const rows = allDataRows.map((r) => r.cells);
        const rowAligns = allDataRows.map((r) => r.aligns);
        const rowSpans = allDataRows.map((r) => r.spans);

        parsed.push({
          name: worksheet.name,
          headers,
          rows,
          totalRows,
          headerAligns,
          headerSpans,
          aligns: rowAligns,
          spans: rowSpans,
          titleRows,
        });
      });

      parsedSheetsRef.current = parsed;
      setSheets(parsed);
      setActiveSheet(0);
      setTotalSheetCount(sheetCount);
      onLoaded();
    } catch (err) {
      console.error('[EditableSpreadsheetRenderer] Fetch/parse error:', err);
      onError(t('eventDetails.documents.preview.parseError'));
    }
  }, [url, isCsv, t, onLoaded, onError]);

  useEffect(() => {
    const timers = saveTimeoutsRef.current;
    if (url) fetchContent();
    return () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      setSheets([]);
      setActiveSheet(0);
      setTotalSheetCount(0);
      setEditingCell(null);
      setEditingHeader(null);
      clearEdits();
    };
  }, [url, fetchContent, clearEdits]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Focus column input when adding column mode is activated
  useEffect(() => {
    if (addingColumn && columnInputRef.current) {
      columnInputRef.current.focus();
    }
  }, [addingColumn]);

  // Focus header input when editing header
  useEffect(() => {
    if (editingHeader && headerInputRef.current) {
      headerInputRef.current.focus();
      headerInputRef.current.select();
    }
  }, [editingHeader]);

  // Flash the success indicator on `key` for 800ms. One timer per key so
  // rapid edits to different cells/headers don't cancel each other's flash.
  const markSaved = useCallback((key) => {
    setSavedCells((prev) => new Set([...prev, key]));
    const existing = saveTimeoutsRef.current.get(key);
    if (existing) clearTimeout(existing);
    const id = setTimeout(() => {
      setSavedCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      saveTimeoutsRef.current.delete(key);
    }, 800);
    saveTimeoutsRef.current.set(key, id);
  }, []);

  // All four handlers are wrapped in useCallback with empty/stable deps so the
  // memoized <EditableRow> can rely on referential equality. updateCell from
  // useEditableSpreadsheet is itself wrapped in useCallback([]).
  const handleCellClick = useCallback((sheetIdx, rowIdx, colIdx) => {
    setEditingCell({ sheetIdx, rowIdx, colIdx });
  }, []);

  // Receives explicit (sheetIdx, rowIdx, colIdx) instead of reading editingCell
  // from a closure — the closure version was a fresh function per render and
  // defeated row memoization.
  const handleCellEdit = useCallback((sheetIdx, rowIdx, colIdx, value) => {
    updateCell(sheetIdx, rowIdx, colIdx, value);
  }, [updateCell]);

  const handleCellKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (e.key === 'Enter' && editingCell) {
        markSaved(`c_${editingCell.sheetIdx}_${editingCell.rowIdx}_${editingCell.colIdx}`);
      }
      setEditingCell(null);
    }
  }, [editingCell, markSaved]);

  const handleHeaderClick = useCallback((sheetIdx, colIdx) => {
    setEditingHeader({ sheetIdx, colIdx });
  }, []);

  const handleHeaderEdit = useCallback((sheetIdx, colIdx, value) => {
    setSheets((prev) =>
      prev.map((s, i) => {
        if (i !== sheetIdx) return s;
        const newHeaders = [...(s.headers || [])];
        newHeaders[colIdx] = value.slice(0, CELL_INPUT_MAX_LENGTH);
        return { ...s, headers: newHeaders };
      })
    );
  }, []);

  const handleHeaderKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (e.key === 'Enter' && editingHeader) {
        markSaved(`h_${editingHeader.sheetIdx}_${editingHeader.colIdx}`);
      }
      setEditingHeader(null);
    }
  }, [editingHeader, markSaved]);

  const handleHeaderBlur = useCallback(() => {
    if (editingHeader) {
      markSaved(`h_${editingHeader.sheetIdx}_${editingHeader.colIdx}`);
    }
    setEditingHeader(null);
  }, [editingHeader, markSaved]);

  const handleCellBlurWithFeedback = useCallback(() => {
    if (editingCell) {
      markSaved(`c_${editingCell.sheetIdx}_${editingCell.rowIdx}_${editingCell.colIdx}`);
    }
    setEditingCell(null);
  }, [editingCell, markSaved]);

  const handleAddRow = useCallback(() => {
    setSheets((prev) =>
      prev.map((s, i) => {
        if (i !== activeSheet) return s;
        const colCount = Math.max(
          s.headers?.length || 0,
          ...s.rows.map((r) => r.length),
          0
        );
        return {
          ...s,
          rows: [...s.rows, Array(colCount).fill('')],
          aligns: [...(s.aligns || []), Array(colCount).fill('left')],
          spans: [...(s.spans || []), Array(colCount).fill(1)],
        };
      })
    );
    setHasStructuralChanges(true);
  }, [activeSheet]);

  const handleAddColumn = useCallback((headerName = '') => {
    setSheets((prev) =>
      prev.map((s, i) => {
        if (i !== activeSheet) return s;
        // Se não houver nome, gera um padrão baseado no número de colunas
        const finalName = headerName.trim() || t('eventDetails.documents.spreadsheet.defaultColumnName', { number: (s.headers?.length || 0) + 1 });
        return {
          ...s,
          headers: [...(s.headers || []), finalName],
          headerAligns: [...(s.headerAligns || []), 'left'],
          headerSpans: [...(s.headerSpans || []), 1],
          rows: s.rows.map((row) => [...row, '']),
          aligns: (s.aligns || []).map((rowAligns) => [...rowAligns, 'left']),
          spans: (s.spans || []).map((rowSpans) => [...rowSpans, 1]),
        };
      })
    );
    setHasStructuralChanges(true);
    setAddingColumn(false);
    setColumnName('');
  }, [activeSheet, t]);

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      getReconstructedBlob: async () => {
        if (isCsv) {
          // Use current sheets (with edited headers) for CSV reconstruction
          const sanitizeForCsv = (value) => {
            const FORMULA_PREFIX = /^[=+\-@\t\r]/;
            const isFiniteNumericString = (v) => {
              const trimmed = String(v).trim();
              if (trimmed === '') return false;
              return Number.isFinite(Number(trimmed));
            };
            if (typeof value !== 'string') return value;
            if (!FORMULA_PREFIX.test(value)) return value;
            if (isFiniteNumericString(value)) return value;
            return `'${value}`;
          };

          const sheet = sheets[0];
          const headers = (sheet.headers || []).map(sanitizeForCsv);
          const rows = (sheet.rows || []).map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const key = `0_${rowIdx}_${colIdx}`;
              const value = editableCells[key] !== undefined ? editableCells[key] : cell;
              return sanitizeForCsv(value);
            })
          );
          const titleRows = (sheet.titleRows || []).map((tr) => tr.cells.map(sanitizeForCsv));
          const data = [
            ...titleRows,
            ...(headers.length > 0 ? [headers] : []),
            ...rows,
          ];
          const csvText = Papa.unparse(data);
          return {
            blob: new Blob([csvText], { type: CSV_CONTENT_TYPE }),
            contentType: CSV_CONTENT_TYPE,
          };
        }

        // For XLSX, prepare the workbook with structural changes (new rows/columns)
        // before applying edited cell values
        const sheetData = sheets[0];
        const originalSheet = originalWorkbook.worksheets[0];
        if (originalSheet && sheetData) {
          const titleRowCount = sheetData.titleRows?.length || 0;
          const headerRowCount = sheetData.headers?.length ? 1 : 0;
          const firstDataRowNumber = titleRowCount + headerRowCount + 1;

          // Update/add headers (row 1 for now, assuming no title rows for headers)
          const headerRow = originalSheet.getRow(titleRowCount + 1);
          if (headerRow && sheetData.headers) {
            sheetData.headers.forEach((header, colIdx) => {
              headerRow.getCell(colIdx + 1).value = header;
            });
          }

          // Ensure all data rows exist in the workbook (this creates new rows if needed)
          sheetData.rows.forEach((row, rowIdx) => {
            const worksheetRow = originalSheet.getRow(firstDataRowNumber + rowIdx);
            // Initialize the row with data from sheets (merges edited values via reconstructWorkbook)
            row.forEach((cell, colIdx) => {
              worksheetRow.getCell(colIdx + 1).value = cell;
            });
          });
        }

        const workbook = await reconstructWorkbook(originalWorkbook, sheets);
        const buffer = await workbook.xlsx.writeBuffer();
        return {
          blob: new Blob([buffer], { type: XLSX_CONTENT_TYPE }),
          contentType: XLSX_CONTENT_TYPE,
        };
      },
      hasDirty: () => hasDirty || hasStructuralChanges || hasHeaderChanges,
      getDirtyCount: () => dirtyCount,
      clearEdits: () => {
        clearEdits();
        setHasStructuralChanges(false);
        setHasHeaderChanges(false);
        setSheets(parsedSheetsRef.current);
        setEditingHeader(null);
      },
    }),
    [isCsv, reconstructWorkbook, originalWorkbook, hasDirty, hasStructuralChanges, hasHeaderChanges, dirtyCount, clearEdits, sheets, editableCells]
  );

  // Pre-compute the edits map keyed by rowIdx for the active sheet. Rebuilds
  // on every keystroke (editableCells changes), but downstream <EditableRow>
  // memo skips render unless THIS row's slice actually changed — see the
  // custom areEqual on EditableRow.
  const editsByRow = useMemo(() => {
    const map = new Map();
    for (const key in editableCells) {
      const [s, r, c] = key.split('_').map(Number);
      if (s !== activeSheet) continue;
      if (!map.has(r)) map.set(r, {});
      map.get(r)[c] = editableCells[key];
    }
    return map;
  }, [editableCells, activeSheet]);

  if (sheets.length === 0) return null;

  const current = sheets[activeSheet];
  const isEditing = editingCell?.sheetIdx === activeSheet;
  const visibleRows = current?.rows?.slice(0, MAX_ROWS) || [];
  const visibleAligns = current?.aligns?.slice(0, MAX_ROWS) || [];
  const visibleSpans = current?.spans?.slice(0, MAX_ROWS) || [];
  // Derive column count from widest row/header — some xlsx files (e.g. exported
  // from Google Sheets) have a stylistic blank row 1 which ExcelJS skips, leaving
  // headers empty. Iterating by header length alone would render zero cells.
  const colCount = current
    ? Math.max(current.headers.length, ...visibleRows.map((r) => r.length), 0)
    : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
          {sheets.map((sheet, i) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(i)}
              role="tab"
              aria-selected={i === activeSheet}
              aria-label={`${t('eventDetails.documents.preview.sheet')}: ${sheet.name}`}
              className={`px-3 py-1.5 text-sm rounded-t-lg whitespace-nowrap transition-colors ${
                i === activeSheet
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Editable table */}
      {current && (
        <>
          {/* Toolbar de expansão — sempre visível (renderer só montado em edit mode) */}
          <div className="flex items-center gap-2 px-1 py-2 border-b border-border">
            <Button
              variant="outline"
              size="sm"
              startIcon={<FiPlus size={14} />}
              onClick={handleAddRow}
            >
              {t('eventDetails.documents.spreadsheet.addRow')}
            </Button>

            {addingColumn ? (
              <div className="flex items-center gap-1">
                <Input
                  ref={columnInputRef}
                  name="columnName"
                  size="sm"
                  placeholder={t('eventDetails.documents.spreadsheet.columnNamePlaceholder')}
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddColumn(columnName);
                    }
                    if (e.key === 'Escape') {
                      setAddingColumn(false);
                      setColumnName('');
                    }
                  }}
                  fullWidth={false}
                  className="w-36"
                />
                <Button size="sm" variant="primary" onClick={() => handleAddColumn(columnName)}>
                  {t('eventDetails.documents.spreadsheet.confirm')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  iconOnly
                  onClick={() => {
                    setAddingColumn(false);
                    setColumnName('');
                  }}
                >
                  <FiX size={14} />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                startIcon={<FiPlusSquare size={14} />}
                onClick={() => setAddingColumn(true)}
              >
                {t('eventDetails.documents.spreadsheet.addColumn')}
              </Button>
            )}
          </div>

          <div className="max-h-[65vh] overflow-auto rounded-lg border border-border bg-background">
            {/* Title / banner rows (merged title, captions, etc.) — read-only.
                Editing title rows would break the merge on save, so they sit
                above the grid and are not clickable. */}
            {current.titleRows?.length > 0 && (
              <div className="flex flex-col">
                {current.titleRows.map((tr, i) => {
                  const text = tr.cells.find((c) => c !== '') || '';
                  if (!text) return null;
                  const isFirst = i === 0;
                  return (
                    <div
                      key={i}
                      className={`flex items-center px-3 py-1.5 border-b border-border
                        ${isFirst
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 font-semibold text-sm'
                          : 'bg-muted/40 text-muted-foreground text-xs italic'
                        }`}
                      title={text}
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            )}
            <table className="min-w-full border-collapse">
              {current.headers.length > 0 && (
                <thead className="sticky top-0 z-20 bg-neutral-200 dark:bg-neutral-700 shadow-md">
                  <tr>
                    {Array.from({ length: colCount }).map((_, i) => {
                      const span = current.headerSpans?.[i] ?? 1;
                      if (span === 0) return null; // merged slave, skip
                      const align = current.headerAligns?.[i] || 'left';
                      const alignClass =
                        align === 'right' ? 'text-right'
                          : align === 'center' ? 'text-center'
                          : 'text-left';
                      const isEditingHeader = editingHeader?.sheetIdx === activeSheet && editingHeader?.colIdx === i;
                      const headerKey = `h_${activeSheet}_${i}`;
                      const isHeaderSaved = savedCells.has(headerKey);
                      const headerValue = current.headers[i] ?? '';

                      return (
                        <th
                          key={i}
                          colSpan={span > 1 ? span : undefined}
                          className={`px-2 py-1.5 ${alignClass} text-xs font-bold align-middle
                            text-neutral-900 dark:text-neutral-100 uppercase tracking-wider
                            border-b-2 border-neutral-400 dark:border-neutral-500
                            border-r border-neutral-400 dark:border-neutral-600
                            whitespace-normal leading-tight break-words cursor-pointer hover:opacity-75
                            transition-colors duration-500
                            ${isHeaderSaved
                              ? 'bg-success-100 dark:bg-success-900/30'
                              : isEditingHeader
                              ? 'bg-warning-50 dark:bg-warning-900/20'
                              : ''}`}
                          onClick={() => handleHeaderClick(activeSheet, i)}
                          title={headerValue}
                        >
                          {isEditingHeader ? (
                            <input
                              ref={headerInputRef}
                              type="text"
                              value={headerValue}
                              maxLength={CELL_INPUT_MAX_LENGTH}
                              onChange={(e) => handleHeaderEdit(activeSheet, i, e.target.value)}
                              onKeyDown={handleHeaderKeyDown}
                              onBlur={handleHeaderBlur}
                              className="w-full px-1 py-0 text-xs border border-primary-500
                                bg-background dark:bg-neutral-800
                                focus:outline-none focus:ring-2 focus:ring-primary-500
                                text-neutral-900 dark:text-neutral-100"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            headerValue
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              )}
              <tbody>
                {visibleRows.map((row, ri) => (
                  <EditableRow
                    key={ri}
                    activeSheet={activeSheet}
                    rowIdx={ri}
                    rowData={row}
                    rowAligns={visibleAligns[ri]}
                    rowSpans={visibleSpans[ri]}
                    colCount={colCount}
                    editsForRow={editsByRow.get(ri) || EMPTY_EDITS}
                    savedCells={savedCells}
                    editingColIdx={isEditing && editingCell.rowIdx === ri ? editingCell.colIdx : -1}
                    inputRef={inputRef}
                    onCellClick={handleCellClick}
                    onCellEdit={handleCellEdit}
                    onCellKeyDown={handleCellKeyDown}
                    onCellBlur={handleCellBlurWithFeedback}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {current.totalRows > MAX_ROWS && (
            <p className="text-sm text-muted-foreground text-center">
              {t('eventDetails.documents.preview.moreRows', { count: current.totalRows - MAX_ROWS })}
            </p>
          )}
        </>
      )}

      {/* More sheets message */}
      {totalSheetCount > MAX_SHEETS && (
        <p className="text-sm text-muted-foreground text-center">
          {t('eventDetails.documents.preview.moreSheets', { count: totalSheetCount - MAX_SHEETS })}
        </p>
      )}
    </div>
  );
});

EditableSpreadsheetRenderer.displayName = 'EditableSpreadsheetRenderer';

EditableSpreadsheetRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onDirtyChange: PropTypes.func, // Called with (hasDirty, dirtyCount)
};

export default EditableSpreadsheetRenderer;
