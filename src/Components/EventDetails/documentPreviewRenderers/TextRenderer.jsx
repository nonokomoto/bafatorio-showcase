import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle } from 'react-icons/fi';

// Above this size the browser spends seconds or minutes laying out a single
// <pre> with whitespace-pre-wrap + break-words. Truncate and let the user
// download the original for the full content.
const MAX_PREVIEW_CHARS = 500 * 1024; // ~500KB
const PREVIEW_LIMIT_LABEL = '500 KB';

const TextRenderer = ({ url, onLoaded, onError }) => {
  const { t } = useTranslation('event');
  const [rawContent, setRawContent] = useState('');

  const fetchContent = useCallback(async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setRawContent(text);
      onLoaded();
    } catch (err) {
      console.error('[TextRenderer] Fetch error:', err);
      onError(t('eventDetails.documents.preview.fetchError'));
    }
  }, [url, t, onLoaded, onError]);

  useEffect(() => {
    if (url) fetchContent();
    return () => setRawContent('');
  }, [url, fetchContent]);

  // Truncate large content. Doing it in a memo keeps the <pre> text node stable
  // when the component re-renders for reasons other than content change.
  const { displayContent, isTruncated } = useMemo(() => {
    if (rawContent.length <= MAX_PREVIEW_CHARS) {
      return { displayContent: rawContent, isTruncated: false };
    }
    return {
      displayContent: rawContent.slice(0, MAX_PREVIEW_CHARS),
      isTruncated: true,
    };
  }, [rawContent]);

  return (
    <div className="flex flex-col gap-2">
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
      <pre className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words
        bg-muted text-foreground
        rounded-lg border border-border">
        {displayContent}
      </pre>
    </div>
  );
};

TextRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default TextRenderer;
