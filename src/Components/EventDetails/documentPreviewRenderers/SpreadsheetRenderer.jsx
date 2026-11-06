import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import ExcelJS from 'exceljs';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getExcelCellText } from '../../../Utils/excelCellText';

const MAX_SHEETS = 10;
const ROW_HEIGHT = 28; // px — compact Excel-like row height
const HEADER_MIN_HEIGHT = 38; // px — grows if header text wraps
const DEFAULT_COL_WIDTH = 140; // px
// ExcelJS column.width is in character units — ~7px per char is a close Excel approximation.
const CHAR_TO_PX = 7;

const SpreadsheetRenderer = ({ url, onLoaded, onError }) => {
  const { t } = useTranslation('event');
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [totalSheetCount, setTotalSheetCount] = useState(0);
  const scrollRef = useRef(null);

  const fetchContent = useCallback(async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const parsed = [];
      let sheetCount = 0;
      workbook.eachSheet((worksheet) => {
        sheetCount++;
        if (parsed.length >= MAX_SHEETS) return;

        const headers = [];
        const rows = [];
        let headerAligns = [];
        const rowAligns = [];

        // Collect every row with values (no row-1-special-case). We decide
        // which row is the "real" header after the fact, using a heuristic
        // that tolerates title banners, merged titles, and blank rows above
        // the data grid.
        const allRows = []; // Array<{ cells: string[], aligns: string[] }>

        worksheet.eachRow((row) => {
          const values = row.values.slice(1);
          const cells = [];
          const aligns = [];
          const spans = []; // 0 = slave (skip render), 1 = normal, N>1 = master spanning N cols
          for (let i = 0; i < values.length; i++) {
            const cell = row.getCell(i + 1);
            const isMergedDuplicate = cell.master && cell.master !== cell;
            const isMergedMaster = cell.isMerged && cell.master === cell;

            // Suppress merged-cell duplicates: only the master keeps the value,
            // other cells in the range render as blank so the title doesn't
            // repeat across every column. The master text comes through the
            // shared excelCellText helper, which covers all 10 ExcelJS value
            // shapes (formula, richText, error, hyperlink, ...) instead of
            // the previous two-branch heuristic that produced "[object Object]"
            // on rich text and error cells.
            const text = isMergedDuplicate ? '' : getExcelCellText(values[i]);
            cells.push(text);

            // Short path: capture per-cell horizontal alignment from xlsx style.
            // Fall back to number-vs-text heuristic when no explicit alignment
            // (xlsx "general" horizontal maps to right for numbers, left for text).
            const explicit = cell.alignment?.horizontal;
            let align;
            if (explicit && explicit !== 'general') align = explicit;
            else align = typeof cell.value === 'number' ? 'right' : 'left';
            aligns.push(align);

            // Compute horizontal span for visual merge rendering. Count
            // consecutive slaves of *this* master to the right in the same
            // row. Vertical merges don't get visual treatment — master shows
            // value, slaves in rows below stay blank.
            // Distinguish horizontal vs vertical merge slaves:
            //   horizontal slave → master is to the left in this same row,
            //     already covered by the master's colspan → skip render (0)
            //   vertical slave → master is in a different row → render
            //     empty cell with normal width so column alignment is kept (1)
            if (isMergedDuplicate) {
              const m = typeof cell.master.address === 'string'
                ? cell.master.address.match(/\d+$/)
                : null;
              const masterRow = m ? parseInt(m[0], 10) : 0;
              spans.push(masterRow === row.number ? 0 : 1);
            } else if (isMergedMaster) {
              // Count only right-adjacent slaves in the SAME row so vertical
              // merges don't inflate the horizontal span.
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

        // Find the real header row: the first row with ≥2 distinct non-empty
        // cells. Rows above it are title/banner rows (merged titles, FONTE
        // captions, etc.). This fixes Excel files that keep a styled title
        // banner above the actual data grid — common in hand-authored sheets.
        const nonEmptyCount = (r) => r.cells.filter((c) => c !== '').length;
        let headerIdx = allRows.findIndex((r) => nonEmptyCount(r) >= 2);
        if (headerIdx < 0) {
          // Fallback: no row has ≥2 non-empty cells — fall back to first row
          // with any content so we still render something.
          headerIdx = allRows.findIndex((r) => nonEmptyCount(r) >= 1);
        }

        const titleRows = headerIdx > 0 ? allRows.slice(0, headerIdx) : [];
        let headerSpans = [];
        const rowSpans = [];
        if (headerIdx >= 0) {
          headers.push(...allRows[headerIdx].cells);
          headerAligns = allRows[headerIdx].aligns;
          headerSpans = allRows[headerIdx].spans;
          for (let i = headerIdx + 1; i < allRows.length; i++) {
            rows.push(allRows[i].cells);
            rowAligns.push(allRows[i].aligns);
            rowSpans.push(allRows[i].spans);
          }
        }

        // Capture column widths from the xlsx for Excel-faithful rendering
        const colWidths = (worksheet.columns || []).map((c) =>
          c?.width ? Math.round(c.width * CHAR_TO_PX) : DEFAULT_COL_WIDTH
        );

        parsed.push({
          name: worksheet.name,
          headers,
          rows,
          headerAligns,
          headerSpans,
          aligns: rowAligns,
          spans: rowSpans,
          titleRows,
          colWidths,
        });
      });

      setSheets(parsed);
      setActiveSheet(0);
      setTotalSheetCount(sheetCount);
      onLoaded();
    } catch (err) {
      console.error('[SpreadsheetRenderer] Fetch/parse error:', err);
      onError(t('eventDetails.documents.preview.parseError'));
    }
  }, [url, t, onLoaded, onError]);

  useEffect(() => {
    if (url) fetchContent();
    return () => {
      setSheets([]);
      setActiveSheet(0);
      setTotalSheetCount(0);
    };
  }, [url, fetchContent]);

  const current = sheets[activeSheet];

  // Derive column count from widest row/header — some xlsx files (e.g.
  // exported from Google Sheets) have a stylistic blank row 1 which ExcelJS
  // skips, leaving headers empty. Iterating by header length alone would
  // render zero cells.
  //
  // Iterate + reduce instead of `Math.max(...rows.map(r => r.length))`. The
  // spread creates a temporary argument array for every row — for a sheet
  // with 50k rows that is 50k array allocations per render plus a huge
  // argument list that can hit engine limits. Reduce is O(n) with no
  // allocations. Memoized so the walk only repeats when the active sheet
  // actually changes, not on every scroll tick.
  const colCount = useMemo(() => {
    if (!current) return 0;
    let max = current.headers.length;
    for (let i = 0; i < current.rows.length; i++) {
      const len = current.rows[i].length;
      if (len > max) max = len;
    }
    return max;
  }, [current]);

  // Pad column widths to colCount (xlsx may declare fewer columns than
  // exist). Memoized so downstream virtualized row renders consume a stable
  // array reference.
  const colWidths = useMemo(
    () =>
      Array.from({ length: colCount }, (_, i) =>
        current?.colWidths?.[i] || DEFAULT_COL_WIDTH,
      ),
    [colCount, current],
  );
  const totalWidth = useMemo(
    () => colWidths.reduce((sum, w) => sum + w, 0),
    [colWidths],
  );

  const rowVirtualizer = useVirtualizer({
    count: current?.rows.length || 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (sheets.length === 0) return null;

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

      {/* Virtualized grid — Excel-like */}
      {current && (
        <>
          <div
            ref={scrollRef}
            className="h-[65vh] overflow-auto rounded-lg border border-border bg-background"
            role="table"
            aria-label={current.name}
          >
            <div style={{ width: totalWidth, minWidth: '100%' }}>
              {/* Title / banner rows (merged title, FONTE captions, etc.) —
                  non-sticky, scroll with content. Each row shows the master's
                  value (the only non-empty cell after merge-dedup). */}
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
                        style={{ width: totalWidth }}
                        title={text}
                      >
                        {text}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sticky header row */}
              {current.headers.length > 0 && (
                <div
                  role="row"
                  className="sticky top-0 z-20 flex bg-neutral-200 dark:bg-neutral-700
                    border-b-2 border-neutral-400 dark:border-neutral-500 shadow-md"
                  style={{ minHeight: HEADER_MIN_HEIGHT }}
                >
                  {Array.from({ length: colCount }).map((_, i) => {
                    const span = current.headerSpans?.[i] ?? 1;
                    if (span === 0) return null; // merged slave, skip
                    const align = current.headerAligns?.[i] || 'left';
                    const justify =
                      align === 'right' ? 'justify-end'
                        : align === 'center' ? 'justify-center'
                        : 'justify-start';
                    const width = colWidths
                      .slice(i, i + span)
                      .reduce((s, w) => s + w, 0);
                    return (
                      <div
                        key={i}
                        role="columnheader"
                        className={`flex items-center px-2 py-1.5 text-xs font-bold
                          text-neutral-900 dark:text-neutral-100 uppercase tracking-wider
                          border-r border-neutral-400 dark:border-neutral-600
                          whitespace-normal leading-tight break-words ${justify}`}
                        style={{ width, flexShrink: 0 }}
                        title={current.headers[i] || ''}
                      >
                        {current.headers[i] || ''}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Virtualized rows */}
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = current.rows[virtualRow.index];
                  const isEven = virtualRow.index % 2 === 0;
                  return (
                    <div
                      key={virtualRow.key}
                      role="row"
                      className={`absolute left-0 top-0 flex border-b border-border
                        hover:bg-accent/60 transition-colors ${
                          isEven ? 'bg-background' : 'bg-muted/30'
                        }`}
                      style={{
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                        width: totalWidth,
                      }}
                    >
                      {Array.from({ length: colCount }).map((_, ci) => {
                        const span = current.spans?.[virtualRow.index]?.[ci] ?? 1;
                        if (span === 0) return null; // merged slave, skip
                        const value = row[ci] ?? '';
                        const align = current.aligns?.[virtualRow.index]?.[ci] || 'left';
                        const justify =
                          align === 'right' ? 'justify-end'
                            : align === 'center' ? 'justify-center'
                            : 'justify-start';
                        const isRight = align === 'right';
                        const width = colWidths
                          .slice(ci, ci + span)
                          .reduce((s, w) => s + w, 0);
                        return (
                          <div
                            key={ci}
                            role="cell"
                            className={`flex items-center px-2 text-xs text-foreground
                              border-r border-border whitespace-nowrap overflow-hidden
                              text-ellipsis ${justify} ${isRight ? 'tabular-nums' : ''}`}
                            style={{ width, flexShrink: 0 }}
                            title={value}
                          >
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

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
};

SpreadsheetRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default SpreadsheetRenderer;
