/* eslint-env jest */
import { getExcelCellText } from '../excelCellText';

describe('getExcelCellText — full ExcelJS value-type coverage', () => {
  describe('null / undefined / empty', () => {
    test('null → ""', () => expect(getExcelCellText(null)).toBe(''));
    test('undefined → ""', () => expect(getExcelCellText(undefined)).toBe(''));
  });

  describe('primitives', () => {
    test('string passes through', () => {
      expect(getExcelCellText('hello')).toBe('hello');
    });
    test('number → String(n)', () => {
      expect(getExcelCellText(42)).toBe('42');
      expect(getExcelCellText(-1.5)).toBe('-1.5');
      expect(getExcelCellText(0)).toBe('0');
    });
    test('boolean → String(b)', () => {
      expect(getExcelCellText(true)).toBe('true');
      expect(getExcelCellText(false)).toBe('false');
    });
  });

  describe('Date', () => {
    test('valid Date → ISO YYYY-MM-DD', () => {
      // Use a deterministic UTC date.
      const d = new Date('2026-04-25T14:30:00.000Z');
      expect(getExcelCellText(d)).toBe('2026-04-25');
    });
    test('invalid Date → ""', () => {
      expect(getExcelCellText(new Date('not-a-date'))).toBe('');
    });
  });

  describe('Error cell — { error: "#REF!" }', () => {
    test('renders the error code', () => {
      expect(getExcelCellText({ error: '#REF!' })).toBe('#REF!');
      expect(getExcelCellText({ error: '#DIV/0!' })).toBe('#DIV/0!');
    });
  });

  describe('Rich text — { richText: [{font, text}, ...] }', () => {
    test('joins segments by .text', () => {
      expect(
        getExcelCellText({
          richText: [
            { font: { bold: true }, text: 'Bold' },
            { font: {}, text: ' and ' },
            { font: { italic: true }, text: 'italic' },
          ],
        }),
      ).toBe('Bold and italic');
    });
    test('handles segments missing .text without crashing', () => {
      expect(
        getExcelCellText({
          richText: [
            { font: {}, text: 'Hello' },
            { font: {} }, // no text field
            { font: {}, text: ' world' },
          ],
        }),
      ).toBe('Hello world');
    });
    test('empty richText array → ""', () => {
      expect(getExcelCellText({ richText: [] })).toBe('');
    });
  });

  describe('Formula — { formula, result }', () => {
    test('result is primitive', () => {
      expect(getExcelCellText({ formula: 'A1+B1', result: 42 })).toBe('42');
    });
    test('result is string', () => {
      expect(getExcelCellText({ formula: 'A1', result: 'hi' })).toBe('hi');
    });
    test('result is null/undefined → ""', () => {
      expect(getExcelCellText({ formula: 'A1', result: null })).toBe('');
      expect(getExcelCellText({ formula: 'A1', result: undefined })).toBe('');
    });
    test('result is an error object — recursion picks it up', () => {
      // This is the "tricky" case the helper order is built around.
      expect(
        getExcelCellText({ formula: 'A1/0', result: { error: '#DIV/0!' } }),
      ).toBe('#DIV/0!');
    });
    test('result is rich text — recursion picks it up', () => {
      expect(
        getExcelCellText({
          formula: 'CONCAT(...)',
          result: { richText: [{ font: {}, text: 'Hi' }] },
        }),
      ).toBe('Hi');
    });
  });

  describe('Shared formula — { sharedFormula, result }', () => {
    test('treated identically to a regular formula', () => {
      expect(getExcelCellText({ sharedFormula: 'A1', result: 7 })).toBe('7');
    });
  });

  describe('Hyperlink — { text, hyperlink, tooltip? }', () => {
    test('renders the visible text', () => {
      expect(
        getExcelCellText({
          text: 'Click me',
          hyperlink: 'https://example.com',
          tooltip: 'opens the docs',
        }),
      ).toBe('Click me');
    });
    test('hyperlink without text → "" (forward-compat fallback, not "[object Object]")', () => {
      expect(getExcelCellText({ hyperlink: 'https://example.com' })).toBe('');
    });
  });

  describe('Forward-compat fallback', () => {
    test('unknown object shape → "" (NEVER "[object Object]")', () => {
      expect(getExcelCellText({ someUnknownShape: 'x' })).toBe('');
      expect(getExcelCellText({})).toBe('');
    });
  });
});
