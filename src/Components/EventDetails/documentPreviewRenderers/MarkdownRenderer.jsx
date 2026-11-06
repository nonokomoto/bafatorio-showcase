import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import { getUrl } from 'aws-amplify/storage';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle } from 'react-icons/fi';

// remark-gfm + remark-emoji re-parse the entire string on every render, and
// each node maps to a wrapped component. Above ~500KB this freezes the tab.
const MAX_PREVIEW_CHARS = 500 * 1024;
const PREVIEW_LIMIT_LABEL = '500 KB';

const S3_PREFIX = 's3://';

// Module-level cache keyed by s3 path. Amplify getUrl() returns a signed URL
// that expires after a while, so we also keep a fetched-at timestamp and
// invalidate after 10 minutes — well below the default 15-60min signing
// window. Prevents a storm of getUrl() calls when the markdown AST is rebuilt.
const S3_URL_CACHE_TTL_MS = 10 * 60 * 1000;
const s3UrlCache = new Map(); // s3Path -> { url, fetchedAt }

const readCachedS3Url = (s3Path) => {
  const entry = s3UrlCache.get(s3Path);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > S3_URL_CACHE_TTL_MS) {
    s3UrlCache.delete(s3Path);
    return null;
  }
  return entry.url;
};

const S3Image = memo(function S3Image({ s3Path, alt, className }) {
  const [src, setSrc] = useState(() => readCachedS3Url(s3Path));

  useEffect(() => {
    const cached = readCachedS3Url(s3Path);
    if (cached) {
      setSrc(cached);
      return undefined;
    }
    let cancelled = false;
    getUrl({ path: s3Path }).then(({ url }) => {
      if (cancelled) return;
      const urlStr = url.toString();
      s3UrlCache.set(s3Path, { url: urlStr, fetchedAt: Date.now() });
      setSrc(urlStr);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [s3Path]);

  if (!src) return null;
  return <img src={src} alt={alt || ''} className={className} />;
});

S3Image.propTypes = {
  s3Path: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
};

const markdownComponents = {
  p: ({ children }) => (
    <p className="mb-4 last:mb-0 leading-relaxed text-foreground">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside mb-4 last:mb-0 space-y-1.5 ml-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside mb-4 last:mb-0 space-y-1.5 ml-5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-foreground">{children}</li>
  ),
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-foreground border-b border-border pb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-foreground">{children}</h4>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = /language-/.test(className || '');
    if (isBlock) {
      return (
        <code className={`font-mono text-[0.85em] ${className || ''}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-muted text-primary-700 dark:text-primary-300 text-[0.85em] font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <div className="mb-4 last:mb-0 rounded-lg overflow-hidden border border-border">
      <pre className="p-4 bg-muted overflow-x-auto text-sm leading-relaxed">
        {children}
      </pre>
    </div>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-primary-400 dark:border-primary-500 pl-4 my-4 text-muted-foreground bg-primary-50/30 dark:bg-primary-900/10 py-2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 dark:text-primary-400 underline underline-offset-2 hover:text-primary-600 dark:hover:text-primary-300 transition-colors">
      {children}
    </a>
  ),
  hr: () => (
    <hr className="my-6 border-border" />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border border-border rounded-lg">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-sm font-medium text-foreground border-b border-border">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-muted-foreground border-b border-border">{children}</td>
  ),
  img: ({ src, alt }) => {
    if (src?.startsWith(S3_PREFIX)) {
      return <S3Image s3Path={src.slice(S3_PREFIX.length)} alt={alt} className="max-w-full h-auto rounded-lg my-4" />;
    }
    return <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-lg my-4" />;
  },
};

const MarkdownRenderer = ({ url, name, onLoaded, onError, onSaveAsPdfReady }) => {
  const { t } = useTranslation('event');
  const [rawContent, setRawContent] = useState('');
  const articleRef = useRef(null);

  // Truncate before feeding to ReactMarkdown. Remark re-runs the full pipeline
  // on every content change; beyond ~500KB that is multi-second jank on each
  // keystroke / re-render and can freeze the tab outright.
  const { content, isTruncated } = useMemo(() => {
    if (rawContent.length <= MAX_PREVIEW_CHARS) {
      return { content: rawContent, isTruncated: false };
    }
    return {
      content: rawContent.slice(0, MAX_PREVIEW_CHARS),
      isTruncated: true,
    };
  }, [rawContent]);

  const handleSaveAsPdf = useCallback(() => {
    if (!articleRef.current) return;
    const title = name?.replace(/\.md$/, '') || 'document';
    const htmlContent = articleRef.current.innerHTML;

    const fullHtml = [
      '<!DOCTYPE html><html><head><meta charset="utf-8">',
      '<title>', title, '</title>',
      '<style>',
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }',
      'h1 { font-size: 1.8em; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }',
      'h2 { font-size: 1.4em; } h3 { font-size: 1.2em; }',
      'code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }',
      'pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }',
      'blockquote { border-left: 3px solid #6366f1; padding-left: 16px; margin-left: 0; color: #555; }',
      'table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #e5e5e5; padding: 8px 12px; text-align: left; }',
      'th { background: #f9f9f9; } img { max-width: 100%; } a { color: #6366f1; }',
      '@media print { body { margin: 0; } }',
      '</style></head><body>',
      htmlContent,
      '</body></html>',
    ].join('');

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      return;
    }

    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(blobUrl);
    };
  }, [name]);

  useEffect(() => {
    if (onSaveAsPdfReady) onSaveAsPdfReady(handleSaveAsPdf);
  }, [handleSaveAsPdf, onSaveAsPdfReady]);

  const fetchContent = useCallback(async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setRawContent(text);
      onLoaded();
    } catch (err) {
      console.error('[MarkdownRenderer] Fetch error:', err);
      onError(t('eventDetails.documents.preview.fetchError'));
    }
  }, [url, t, onLoaded, onError]);

  useEffect(() => {
    if (url) fetchContent();
    return () => setRawContent('');
  }, [url, fetchContent]);

  return (
    <div className="flex flex-col gap-3">
      {isTruncated && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-lg max-w-[680px]
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
      <article ref={articleRef} className="prose-custom max-w-[680px]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkEmoji]}
          components={markdownComponents}
          urlTransform={(url) => {
            if (url.startsWith('s3://') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
            return '';
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
};

MarkdownRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onSaveAsPdfReady: PropTypes.func,
};

export default MarkdownRenderer;
