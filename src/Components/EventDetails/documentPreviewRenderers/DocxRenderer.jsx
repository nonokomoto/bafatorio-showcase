import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle } from 'react-icons/fi';

// mammoth expands docx content significantly (wrapper tags, inline styles,
// base64 images). dangerouslySetInnerHTML commits the whole tree in one go
// — past ~2MB of output the tab freezes on layout. Truncate to stay
// responsive; user can still download the original .docx for the full doc.
const MAX_HTML_CHARS = 2 * 1024 * 1024; // ~2MB
const PREVIEW_LIMIT_LABEL = '2 MB';

const DocxRenderer = ({ url, onLoaded, onError }) => {
  const { t } = useTranslation('event');
  const [rawHtml, setRawHtml] = useState('');

  const fetchContent = useCallback(async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();

      const result = await mammoth.convertToHtml({ arrayBuffer });
      if (result.messages.length > 0) {
        console.warn('[DocxRenderer] Conversion warnings:', result.messages);
      }

      // SECURITY: Sanitize mammoth output with DOMPurify to prevent XSS
      const sanitized = DOMPurify.sanitize(result.value);
      setRawHtml(sanitized);
      onLoaded();
    } catch (err) {
      console.error('[DocxRenderer] Fetch/convert error:', err);
      onError(t('eventDetails.documents.preview.parseError'));
    }
  }, [url, t, onLoaded, onError]);

  useEffect(() => {
    if (url) fetchContent();
    return () => setRawHtml('');
  }, [url, fetchContent]);

  // Truncate after sanitization so we never feed a giant string into
  // dangerouslySetInnerHTML. Cutting at a char boundary may leave an open
  // tag — the browser parser tolerates it by closing the orphan silently,
  // and DOMPurify already ran on the full string so the visible output
  // remains safe.
  const { html, isTruncated } = useMemo(() => {
    if (rawHtml.length <= MAX_HTML_CHARS) {
      return { html: rawHtml, isTruncated: false };
    }
    return {
      html: rawHtml.slice(0, MAX_HTML_CHARS),
      isTruncated: true,
    };
  }, [rawHtml]);

  if (!html) return null;

  return (
    <div className="flex flex-col gap-3">
      {isTruncated && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-lg
            bg-warning-50 dark:bg-warning-900/20
            border border-warning-200 dark:border-warning-800/50"
        >
          <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning-600 dark:text-warning-400" />
          <div className="text-sm text-warning-800 dark:text-warning-200">
            <div className="font-medium">
              {t('eventDetails.documents.preview.truncated.title')}
            </div>
            <div className="mt-0.5">
              {t('eventDetails.documents.preview.truncated.message', { limit: PREVIEW_LIMIT_LABEL })}
            </div>
          </div>
        </div>
      )}
      <div
        className="prose-docx p-4 bg-card rounded-lg border border-border
        text-foreground
        [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:first:mt-0
        [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4
        [&_p]:mb-3 [&_p]:last:mb-0 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:space-y-1
        [&_li]:leading-relaxed
        [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4
        [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium
        [&_th]:border [&_th]:border-border
        [&_th]:bg-muted
        [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
        [&_td]:border [&_td]:border-border
        [&_a]:text-primary-500 [&_a]:underline [&_a]:underline-offset-2
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

DocxRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default DocxRenderer;
