import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { parseCsv } from '../../../Utils/parseCsv';

const MAX_ROWS = 500;

const CsvRenderer = ({ url, onLoaded, onError }) => {
  const { t } = useTranslation('event');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [titleRows, setTitleRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);

  const fetchContent = useCallback(async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();

      // Use array mode (no header:true) so we can run the same header-detection
      // heuristic as the xlsx renderer — CSVs occasionally start with a title
      // row above the real columns. parseCsv runs Papa in a worker when
      // available, with a synchronous fallback for prod/CSP edge cases.
      const result = await parseCsv(text);
      if (result.errors.length > 0) {
        console.warn('[CsvRenderer] Parse warnings:', result.errors);
      }
      const data = (result.data || []).map((r) =>
        r.map((c) => (c == null ? '' : String(c)))
      );

      const nonEmptyCount = (r) => r.filter((c) => c !== '').length;
      let headerIdx = data.findIndex((r) => nonEmptyCount(r) >= 2);
      if (headerIdx < 0) {
        headerIdx = data.findIndex((r) => nonEmptyCount(r) >= 1);
      }

      const detectedHeaders = headerIdx >= 0 ? data[headerIdx] : [];
      const dataRows = headerIdx >= 0 ? data.slice(headerIdx + 1) : data;
      const detectedTitles = headerIdx > 0 ? data.slice(0, headerIdx) : [];

      setHeaders(detectedHeaders);
      setTitleRows(detectedTitles);
      setTotalRows(dataRows.length);
      setRows(dataRows.slice(0, MAX_ROWS));
      onLoaded();
    } catch (err) {
      console.error('[CsvRenderer] Fetch/parse error:', err);
      onError(t('eventDetails.documents.preview.parseError'));
    }
  }, [url, t, onLoaded, onError]);

  useEffect(() => {
    if (url) fetchContent();
    return () => {
      setHeaders([]);
      setRows([]);
      setTitleRows([]);
      setTotalRows(0);
    };
  }, [url, fetchContent]);

  if (headers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[65vh] overflow-auto rounded-lg border border-border bg-background">
        {/* Title / banner rows above the data grid (rare in CSV but possible
            in hand-authored files with a title line). */}
        {titleRows.length > 0 && (
          <div className="flex flex-col">
            {titleRows.map((tr, i) => {
              const text = tr.find((c) => c !== '') || '';
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
          <thead className="sticky top-0 z-10 bg-neutral-200 dark:bg-neutral-700 shadow-md">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={`${header}-${i}`}
                  className="px-2 py-1.5 text-left text-xs font-bold align-middle
                    text-neutral-900 dark:text-neutral-100 uppercase tracking-wider
                    border-b-2 border-neutral-400 dark:border-neutral-500
                    border-r border-neutral-400 dark:border-neutral-600
                    whitespace-normal leading-tight break-words"
                  title={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isEven = i % 2 === 0;
              return (
                <tr
                  key={i}
                  className={`transition-colors ${isEven ? 'bg-background' : 'bg-muted/30'} hover:bg-accent/60`}
                >
                  {headers.map((header, ci) => {
                    const value = row[ci] ?? '';
                    const isNumeric = value !== '' && !isNaN(Number(value));
                    return (
                      <td
                        key={`${header}-${ci}`}
                        className={`px-2 py-1 text-xs text-foreground
                          border-b border-r border-border whitespace-nowrap
                          ${isNumeric ? 'text-right tabular-nums' : ''}`}
                        title={value}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalRows > MAX_ROWS && (
        <p className="text-sm text-muted-foreground text-center">
          {t('eventDetails.documents.preview.moreRows', { count: totalRows - MAX_ROWS })}
        </p>
      )}
    </div>
  );
};

CsvRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default CsvRenderer;
