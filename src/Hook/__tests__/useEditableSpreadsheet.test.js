/* eslint-env jest */

import Papa from 'papaparse';
import { renderHook, act } from '@testing-library/react';
import { useEditableSpreadsheet } from '../useEditableSpreadsheet';

const createSheet = (name, values) => ({
  name,
  _rows: values.map((row) => row.map((value) => ({ value }))),
  getRow(rowNumber) {
    const rowIndex = rowNumber - 1;
    if (!this._rows[rowIndex]) {
      this._rows[rowIndex] = [];
    }

    return {
      getCell: (colNumber) => {
        const colIndex = colNumber - 1;
        if (!this._rows[rowIndex][colIndex]) {
          this._rows[rowIndex][colIndex] = { value: undefined };
        }
        return this._rows[rowIndex][colIndex];
      },
    };
  },
  getCell(address) {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    const rowNumber = Number(match[2]);
    const colNumber = match[1].charCodeAt(0) - 64;
    return this._rows[rowNumber - 1][colNumber - 1];
  },
});

const buildWorkbook = () => {
  const sheet1 = createSheet('Sheet 1', [['Header'], ['sheet1-original']]);
  const sheet2 = createSheet('Sheet 2', [['Header'], ['sheet2-original']]);

  return {
    worksheets: [sheet1, sheet2],
    getWorksheet(name) {
      return this.worksheets.find((sheet) => sheet.name === name);
    },
  };
};

describe('useEditableSpreadsheet', () => {
  it('preserves rows beyond the UI cap when reconstructing CSV data', () => {
    const originalSheets = [
      {
        name: 'Sheet 1',
        headers: ['Header'],
        rows: Array.from({ length: 205 }, (_, index) => [`row-${index + 1}`]),
        titleRows: [],
      },
    ];

    const { result } = renderHook(() => useEditableSpreadsheet(originalSheets));

    const csv = result.current.reconstructCsv();
    const parsed = Papa.parse(csv).data;

    expect(parsed).toHaveLength(206);
    expect(parsed[1][0]).toBe('row-1');
    expect(parsed[205][0]).toBe('row-205');
  });

  it('keeps edits isolated per sheet when coordinates are the same', async () => {
    const originalSheets = [
      {
        name: 'Sheet 1',
        headers: ['Header'],
        rows: [['sheet1-original']],
        titleRows: [],
      },
      {
        name: 'Sheet 2',
        headers: ['Header'],
        rows: [['sheet2-original']],
        titleRows: [],
      },
    ];

    const workbook = buildWorkbook();
    const { result } = renderHook(() => useEditableSpreadsheet(originalSheets));

    act(() => {
      result.current.updateCell(0, 0, 0, 'sheet1-edited');
      result.current.updateCell(1, 0, 0, 'sheet2-edited');
    });

    let reconstructed;
    await act(async () => {
      reconstructed = await result.current.reconstructWorkbook(workbook);
    });

    expect(reconstructed.getWorksheet('Sheet 1').getCell('A2').value).toBe('sheet1-edited');
    expect(reconstructed.getWorksheet('Sheet 2').getCell('A2').value).toBe('sheet2-edited');
  });

  describe('reconstructCsv — formula injection sanitization', () => {
    // OWASP CSV Injection mitigation: cells starting with =, +, -, @, \t, \r
    // are formula triggers in Excel/Sheets. We prefix them with a single
    // quote on save so the literal payload is preserved without enabling
    // RCE-style attacks against teammates that open the saved file.
    const buildSheet = (rows, headers = ['col']) => [{
      name: 'Sheet 1', headers, rows, titleRows: [],
    }];

    it('prefixes a single quote before leading = in edited cells', () => {
      const original = buildSheet([['safe']]);
      const { result } = renderHook(() => useEditableSpreadsheet(original));

      act(() => {
        result.current.updateCell(0, 0, 0, '=HYPERLINK("http://evil","click")');
      });

      const csv = result.current.reconstructCsv();
      const data = Papa.parse(csv).data;
      // Row index 1 because data[0] is the header.
      expect(data[1][0]).toBe('\'=HYPERLINK("http://evil","click")');
    });

    it('sanitizes every trigger character: =, +, -, @, tab, CR', () => {
      // Each value starts with a trigger char AND coerces to NaN, so it is
      // a formula payload (not a legitimate number). `-2` would NOT belong
      // here — it is a real negative number, covered by the "signed numerics
      // pass through" test below.
      const triggers = ['=BAD()', '+1+1', '-2+2', '@foo', '\tx', '\rx'];
      const original = buildSheet(triggers.map(() => ['placeholder']));
      const { result } = renderHook(() => useEditableSpreadsheet(original));

      act(() => {
        triggers.forEach((value, idx) => {
          result.current.updateCell(0, idx, 0, value);
        });
      });

      const csv = result.current.reconstructCsv();
      const data = Papa.parse(csv).data;
      triggers.forEach((value, idx) => {
        expect(data[idx + 1][0]).toBe(`'${value}`);
      });
    });

    it('leaves benign cells untouched', () => {
      const original = buildSheet([['Hello'], ['123 Main St']]);
      const { result } = renderHook(() => useEditableSpreadsheet(original));

      const csv = result.current.reconstructCsv();
      const data = Papa.parse(csv).data;
      expect(data[1][0]).toBe('Hello');
      expect(data[2][0]).toBe('123 Main St');
      // Sanity: nothing was prefixed.
      expect(data[1][0]).not.toMatch(/^'/);
      expect(data[2][0]).not.toMatch(/^'/);
    });

    it('also sanitizes original (un-edited) cells with formula payloads', () => {
      // Defence-in-depth: even if an attacker uploaded a CSV with a formula
      // payload that we never edited, we still strip on save so the round-
      // trip cannot ferry a stale payload back out unchanged.
      const original = buildSheet([['=DANGER']]);
      const { result } = renderHook(() => useEditableSpreadsheet(original));

      const csv = result.current.reconstructCsv();
      const data = Papa.parse(csv).data;
      expect(data[1][0]).toBe("'=DANGER");
    });

    it('does NOT sanitize signed numerics — they are legitimate data', () => {
      // Critical: -1.5, +42, -1e+5 all start with a trigger char but are
      // real numbers. Quoting them would break sums/charts when the saved
      // CSV is reopened. Only formula-like payloads (NaN when coerced)
      // should get the leading quote.
      const numerics = ['-1.5', '+42', '-1e+5', '-0', '0', '3.14', '-100'];
      const original = buildSheet(numerics.map(() => ['placeholder']));
      const { result } = renderHook(() => useEditableSpreadsheet(original));

      act(() => {
        numerics.forEach((value, idx) => {
          result.current.updateCell(0, idx, 0, value);
        });
      });

      const csv = result.current.reconstructCsv();
      const data = Papa.parse(csv).data;
      numerics.forEach((value, idx) => {
        expect(data[idx + 1][0]).toBe(value); // unchanged, no leading quote
      });
    });

    it('sanitizes title rows too', () => {
      // Title rows go above the header in the rebuilt output. They are
      // user-controlled (anything in the original CSV's pre-header area)
      // and need the same treatment.
      const sheet = [{
        name: 'Sheet 1',
        headers: ['col'],
        rows: [['safe']],
        titleRows: [{ cells: ['=DANGER'], aligns: ['left'] }],
      }];
      const { result } = renderHook(() => useEditableSpreadsheet(sheet));

      const csv = result.current.reconstructCsv();
      const data = Papa.parse(csv).data;
      expect(data[0][0]).toBe("'=DANGER");
    });
  });
});
