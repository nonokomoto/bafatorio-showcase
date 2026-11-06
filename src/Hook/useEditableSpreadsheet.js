import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';

// CSV injection mitigation (OWASP). Cells whose first character is one of
// =, +, -, @, \t or \r are interpreted as formulas by Excel/Sheets/Numbers
// when the file is opened. A user editing a cell to e.g.
// `=HYPERLINK("http://evil","click me")` and saving the round-trip CSV to
// shared storage would weaponize the file against any teammate that opens
// it in Excel. We prefix the literal payload with a single quote on the
// SAVE path only — display in our own renderer is unaffected.
//
// IMPORTANT: legitimate signed numerics (`-1.5`, `+42`, `-1e+5`) also begin
// with a trigger char but ARE valid numeric data. Quoting them would turn
// every negative number on a saved CSV into a text cell, breaking sums and
// charts when the file is reopened. So we sanitize only when the value is
// NOT a finite number — formula payloads (`=SUM(...)`, `+CMD()`, `-2+2`,
// `@hyperlink`) all parse to NaN and are correctly trapped.
//
// Reference: https://owasp.org/www-community/attacks/CSV_Injection
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const isFiniteNumericString = (value) => {
  const trimmed = value.trim();
  if (trimmed === '') return false;
  return Number.isFinite(Number(trimmed));
};
const sanitizeForCsv = (value) => {
  if (typeof value !== 'string') return value;
  if (!FORMULA_PREFIX.test(value)) return value;
  if (isFiniteNumericString(value)) return value;
  return `'${value}`;
};

/**
 * Hook to manage editable spreadsheet state
 * Tracks cell edits, dirty rows, and reconstruction
 */
export const useEditableSpreadsheet = (originalSheets) => {
  // Map<"sheet_row_col", newValue> for edited cells
  const [editableCells, setEditableCells] = useState({});
  // Set<"sheet_row"> of rows with unsaved changes
  const [dirtyRows, setDirtyRows] = useState(new Set());

  const getCellKey = (sheetIdx, rowIdx, colIdx) => `${sheetIdx}_${rowIdx}_${colIdx}`;
  const getRowKey = (sheetIdx, rowIdx) => `${sheetIdx}_${rowIdx}`;

  /**
   * Update a single cell value
   */
  const updateCell = useCallback((sheetIdx, rowIdx, colIdx, newValue) => {
    const key = getCellKey(sheetIdx, rowIdx, colIdx);
    setEditableCells((prev) => ({
      ...prev,
      [key]: newValue,
    }));
    // Mark row as dirty
    setDirtyRows((prev) => new Set([...prev, getRowKey(sheetIdx, rowIdx)]));
  }, []);

  /**
   * Get the edited value of a cell (or original if not edited)
   */
  const getCellValue = useCallback(
    (sheetIdx, rowIdx, colIdx, originalValue) => {
      const key = getCellKey(sheetIdx, rowIdx, colIdx);
      return editableCells[key] !== undefined ? editableCells[key] : originalValue;
    },
    [editableCells]
  );

  /**
   * Check if a cell has been edited
   */
  const isCellDirty = useCallback((sheetIdx, rowIdx, colIdx) => {
    const key = getCellKey(sheetIdx, rowIdx, colIdx);
    return editableCells[key] !== undefined;
  }, [editableCells]);

  /**
   * Count of dirty cells
   */
  const dirtyCount = useMemo(() => Object.keys(editableCells).length, [editableCells]);

  /**
   * Whether there are any unsaved changes
   */
  const hasDirty = useMemo(() => dirtyCount > 0, [dirtyCount]);

  /**
   * Reconstruct ExcelJS workbook with edited values
   * Preserves original formatting and formulas where possible
   * @param {object} originalWorkbook - ExcelJS workbook to modify
   * @param {Array} sheetsToCopy - (Optional) Updated sheets with structural changes. If not provided, uses originalSheets.
   */
  const reconstructWorkbook = useCallback(async (originalWorkbook, sheetsToCopy) => {
    if (!originalWorkbook || !originalSheets) {
      throw new Error('Original workbook and sheets required');
    }

    const sheetsToUse = sheetsToCopy || originalSheets;

    sheetsToUse.forEach((sheetData, sheetIdx) => {
      const originalSheet = originalWorkbook.worksheets[sheetIdx];
      if (!originalSheet) return;

      const titleRowCount = sheetData.titleRows?.length || 0;
      const headerRowCount = sheetData.headers?.length ? 1 : 0;
      const firstDataRowNumber = titleRowCount + headerRowCount + 1;

      sheetData.rows.forEach((row, rowIdx) => {
        const worksheetRow = originalSheet.getRow(firstDataRowNumber + rowIdx);
        row.forEach((cell, colIdx) => {
          const key = getCellKey(sheetIdx, rowIdx, colIdx);
          if (editableCells[key] === undefined) return;
          worksheetRow.getCell(colIdx + 1).value = editableCells[key];
        });
      });
    });

    return originalWorkbook;
  }, [originalSheets, editableCells]);

  /**
   * Reconstruct CSV text from the (single) sheet with edited values applied.
   * Only the first sheet is used — CSV has no notion of multiple sheets.
   */
  const reconstructCsv = useCallback(() => {
    if (!originalSheets || originalSheets.length === 0) {
      throw new Error('Original sheet data required');
    }
    const sheet = originalSheets[0];
    const headers = (sheet.headers || []).map(sanitizeForCsv);
    const rows = (sheet.rows || []).map((row, rowIdx) =>
      row.map((cell, colIdx) => sanitizeForCsv(getCellValue(0, rowIdx, colIdx, cell)))
    );
    const titleRows = (sheet.titleRows || []).map((tr) => tr.cells.map(sanitizeForCsv));
    const data = [
      ...titleRows,
      ...(headers.length > 0 ? [headers] : []),
      ...rows,
    ];
    return Papa.unparse(data);
  }, [originalSheets, getCellValue]);

  /**
   * Clear all edits
   */
  const clear = useCallback(() => {
    setEditableCells({});
    setDirtyRows(new Set());
  }, []);

  return {
    editableCells,
    dirtyRows,
    dirtyCount,
    hasDirty,
    updateCell,
    getCellValue,
    isCellDirty,
    reconstructWorkbook,
    reconstructCsv,
    clear,
  };
};

export default useEditableSpreadsheet;
