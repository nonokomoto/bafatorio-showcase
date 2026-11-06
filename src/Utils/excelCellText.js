/**
 * Convert any ExcelJS cell value into a plain display string for table
 * rendering. ExcelJS surfaces 10 distinct value shapes; without explicit
 * coverage, anything that's an object falls through to `String(v)` which
 * produces the infamous "[object Object]" UI bug.
 *
 * Branch order matters:
 *   - `{error}` and `{richText}` MUST be checked BEFORE `{result}` because
 *     a formula's `result` can itself be `{error: '#DIV/0!'}` or a richText
 *     object. Without that order, recursing on `result` would land on the
 *     fallback again.
 *   - Recursion on `{result}` is safe and required: ExcelJS does not nest
 *     `result.result`, so the recursion is bounded at depth 2.
 *
 * Reference for value types:
 *   https://github.com/exceljs/exceljs#value-types
 */
const isPlainObject = (v) =>
  typeof v === 'object' && v !== null && !(v instanceof Date);

export const getExcelCellText = (value) => {
  // Null / undefined / empty
  if (value === null || value === undefined) return '';

  // Primitives — number, string, boolean
  if (typeof value !== 'object') return String(value);

  // Date — format as ISO date (YYYY-MM-DD). Cell-level locale formatting
  // is the renderer's job; this helper produces deterministic text.
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }

  // Error cell or formula-result-error: { error: '#DIV/0!' }
  // MUST come before the {result} branch because a formula result can be an
  // error object — e.g. { formula: 'A1/0', result: { error: '#DIV/0!' } }.
  if (typeof value.error === 'string') return value.error;

  // Rich text: { richText: [{ font, text }, ...] }
  // MUST come before {result} branch — formula results can be richText too.
  if (Array.isArray(value.richText)) {
    return value.richText
      .map((segment) => (segment && typeof segment.text === 'string' ? segment.text : ''))
      .join('');
  }

  // Formula / shared formula / array formula: { formula, result } or
  // { sharedFormula, result }. Recurse on the result because it can itself
  // be a primitive, an error object, or richText (handled above on recurse).
  if ('result' in value) {
    return getExcelCellText(value.result);
  }

  // Hyperlink: { text, hyperlink, tooltip? }. Tooltip is sometimes a string,
  // sometimes absent — ignore. Render the visible text only.
  if (typeof value.text === 'string') return value.text;

  // Forward-compat: unknown object shape. Returning '' is safer than
  // String(v) which would resurface the original "[object Object]" bug.
  // Primitives are caught earlier so this branch is reachable only for
  // novel ExcelJS shapes.
  if (isPlainObject(value)) return '';

  // Defensive last resort. Should not be reachable.
  return String(value);
};

export default getExcelCellText;
