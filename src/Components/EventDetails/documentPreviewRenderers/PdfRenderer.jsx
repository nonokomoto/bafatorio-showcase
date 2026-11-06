import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useTranslation } from 'react-i18next';
import { FiZoomIn, FiZoomOut } from 'react-icons/fi';

// Configure pdfjs worker — Vite-compatible via import.meta.url
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.25;

// How far outside the viewport to start mounting real <Page> components.
// pdf.js says to keep concurrent renders under 25; with this margin the peak
// is typically 3–6 pages at once regardless of document length.
const PAGE_MOUNT_MARGIN_PX = 1000;

// Fallback aspect ratio (A4 portrait) used while page metadata is still loading.
const FALLBACK_ASPECT_RATIO = 842 / 595;

/**
 * Single lazily-rendered page. Keeps a placeholder of the correct size (so the
 * scroll length matches the real document) and only mounts the real <Page>
 * when the placeholder is near the viewport. Unmounts again when it scrolls
 * far away — pdf.js caches page metadata internally so re-render is fast.
 */
const VirtualizedPdfPage = ({ pageNumber, size, pageWidth }) => {
  const holderRef = useRef(null);
  const [isInRange, setIsInRange] = useState(false);

  useEffect(() => {
    const target = holderRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInRange(entry.isIntersecting),
      { rootMargin: `${PAGE_MOUNT_MARGIN_PX}px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Height derived from actual page size so scroll position and placeholder
  // match the real page exactly once it mounts. Falls back to A4 while the
  // size metadata hasn't arrived yet.
  const placeholderHeight = size
    ? (size.height * pageWidth) / size.width
    : pageWidth * FALLBACK_ASPECT_RATIO;

  return (
    <div
      ref={holderRef}
      style={{ width: pageWidth, minHeight: placeholderHeight }}
      className="flex items-center justify-center"
      data-page-number={pageNumber}
    >
      {isInRange ? (
        <Page
          pageNumber={pageNumber}
          width={pageWidth}
          renderTextLayer
          renderAnnotationLayer
          className="shadow-sm"
        />
      ) : (
        <div
          style={{ width: pageWidth, height: placeholderHeight }}
          className="bg-muted/40 rounded"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

VirtualizedPdfPage.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  size: PropTypes.shape({ width: PropTypes.number, height: PropTypes.number }),
  pageWidth: PropTypes.number.isRequired,
};

const PdfRenderer = ({ url, onLoaded, onError }) => {
  const { t } = useTranslation('event');
  const [numPages, setNumPages] = useState(null);
  // Per-page { width, height } in PDF user units. Populated lazily on load.
  const [pageSizes, setPageSizes] = useState([]);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  // Measure container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLoadSuccess = useCallback(async (pdf) => {
    setNumPages(pdf.numPages);
    onLoaded();

    // Pre-fetch dimensions of every page in parallel. This is pdf.js metadata,
    // not a full render — fast even for 100+ page documents. Without this
    // the virtualized placeholders default to A4 and cause minor layout
    // adjustments when each page is first scrolled into view.
    try {
      const sizes = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const page = await pdf.getPage(i + 1);
          const viewport = page.getViewport({ scale: 1 });
          return { width: viewport.width, height: viewport.height };
        }),
      );
      setPageSizes(sizes);
    } catch (err) {
      // Non-fatal: placeholders fall back to A4 ratio.
      console.warn('[PdfRenderer] Could not prefetch page sizes:', err);
    }
  }, [onLoaded]);

  const handleLoadError = useCallback((error) => {
    console.error('[PdfRenderer] Load error:', error);
    onError(t('eventDetails.documents.preview.fetchError'));
  }, [onError, t]);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }, []);

  // Internal-link navigation. PDFs with a Table of Contents emit clickable
  // page links; without an `onItemClick` on <Document>, react-pdf's default
  // PDFLinkService logs a warning and the click is a no-op once we virtualize
  // pages (the target page may not yet be mounted). The placeholder always
  // exists at the correct offset thanks to the page-size pre-fetch above, so
  // scrolling its data-page-number element into view both (a) silences the
  // warning and (b) lets IntersectionObserver mount the real <Page>.
  // Uses behavior:'auto' (instant) instead of 'smooth' — a smooth scroll over
  // many pages would mount-then-unmount every page it animates past, which
  // is expensive on large docs.
  const scrollToPage = useCallback((pageNumber) => {
    const el = containerRef.current?.querySelector(`[data-page-number="${pageNumber}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);

  const handleItemClick = useCallback(({ pageNumber }) => {
    scrollToPage(pageNumber);
  }, [scrollToPage]);

  // Calculate page width based on container and scale
  const pageWidth = containerWidth ? containerWidth * scale : undefined;

  // Build array of page numbers for rendering
  const pageNumbers = useMemo(
    () => (numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : []),
    [numPages],
  );

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {/* Toolbar — zoom only */}
      {numPages && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-3 py-2 px-4 mb-3
          bg-muted rounded-lg border border-border w-full">
          <span className="text-sm text-muted-foreground">
            {t('eventDetails.documents.preview.pageCount', {
              count: numPages,
              defaultValue: '{{count}} pages',
            })}
          </span>

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label={t('eventDetails.documents.preview.zoomOut')}
            className="p-1 rounded hover:bg-accent
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <FiZoomOut className="w-4 h-4 text-foreground" />
          </button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label={t('eventDetails.documents.preview.zoomIn')}
            className="p-1 rounded hover:bg-accent
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <FiZoomIn className="w-4 h-4 text-foreground" />
          </button>
        </div>
      )}

      {/* PDF document — continuous scroll with virtualized pages */}
      <div className={`${scale > 1 ? 'overflow-x-auto w-full' : ''}`}>
        <Document
          file={url}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          onItemClick={handleItemClick}
          loading={null}
          className="flex flex-col items-center gap-4"
        >
          {pageWidth && pageNumbers.map((pageNum) => (
            <VirtualizedPdfPage
              key={pageNum}
              pageNumber={pageNum}
              size={pageSizes[pageNum - 1]}
              pageWidth={pageWidth}
            />
          ))}
        </Document>
      </div>
    </div>
  );
};

PdfRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default PdfRenderer;
