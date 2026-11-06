// React import needed for classic JSX runtime (Jest/Babel config)
// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';

/**
 * Lateral slide-in panel used for row-level detail views. Extracted from the
 * existing ParticipantDetailPanel so Supplier / EventSupplier / future
 * tables can share the same container (backdrop, close button, Esc handler,
 * portal target) without each duplicating the markup.
 *
 * Children render INSIDE the panel body and are free to bring their own
 * header content. Keep one `h*` as the first focusable so Esc + click
 * feels consistent across tables.
 *
 * When `resizable` is enabled, a drag handle on the left edge lets users
 * widen/narrow the panel (double-click resets to defaultWidth). Width is
 * persisted to localStorage if `storageKey` is provided.
 *
 * `headerActions` renders in the top bar, grouped with the close button on
 * the right, for row-level actions (edit, delete) scoped to the currently
 * open item.
 */
function DetailPanelShell({
  isOpen,
  onClose,
  children,
  ariaLabel,
  widthClass = 'w-[520px]',
  resizable = false,
  defaultWidth = 520,
  minWidth = 380,
  maxWidth = 1400,
  storageKey,
  headerActions,
}) {
  const [panelWidth, setPanelWidth] = useState(() => {
    if (!resizable) return defaultWidth;
    if (!storageKey) return defaultWidth;
    if (typeof window === 'undefined') return defaultWidth;
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? parsed : defaultWidth;
  });
  const [isDragging, setIsDragging] = useState(false);
  const panelWidthRef = useRef(panelWidth);
  const dragCleanupRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Ensure any in-flight drag is torn down when the panel closes or unmounts.
  useEffect(() => () => { dragCleanupRef.current?.(); }, []);
  useEffect(() => {
    if (!isOpen) dragCleanupRef.current?.();
  }, [isOpen]);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = panelWidthRef.current;

    const onPointerMove = (ev) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.min(
        Math.max(startWidth + delta, minWidth),
        maxWidth,
        window.innerWidth * 0.98,
      );
      panelWidthRef.current = newWidth;
      setPanelWidth(newWidth);
    };

    const cleanup = () => {
      setIsDragging(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', cleanup);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (storageKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, String(panelWidthRef.current));
      }
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = cleanup;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', cleanup);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [minWidth, maxWidth, storageKey]);

  const handleResetWidth = useCallback(() => {
    setPanelWidth(defaultWidth);
    panelWidthRef.current = defaultWidth;
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(defaultWidth));
    }
  }, [defaultWidth, storageKey]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  const asideClassName = resizable
    ? `max-w-[98vw] max-sm:w-full h-screen bg-card shadow-2xl dark:shadow-dark-elevated flex flex-col animate-slide-in-right overflow-hidden ${isDragging ? '' : 'transition-[width] duration-200 ease-out'}`
    : `${widthClass} max-w-[90vw] max-sm:w-full h-screen bg-card shadow-2xl dark:shadow-dark-elevated flex flex-col animate-slide-in-right overflow-hidden`;

  const asideStyle = resizable ? { width: panelWidth } : undefined;

  const panelBody = (
    <aside aria-label={ariaLabel} className={asideClassName} style={asideStyle}>
      <div className="flex items-center justify-end gap-1 p-2 border-b border-border">
        {headerActions}
        <button
          type="button"
          onClick={() => onClose?.()}
          aria-label="Close"
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <FiX size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </aside>
  );

  return createPortal(
    <div
      data-testid="detail-panel-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-end animate-fade-in bg-black/30"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {resizable ? (
        <div className="relative h-screen flex-shrink-0">
          <div
            className="hidden sm:block absolute top-0 -left-1 w-3 h-full cursor-col-resize z-50 group"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            title="Drag to resize — double-click to reset"
            onPointerDown={handleDragStart}
            onDoubleClick={handleResetWidth}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
            </div>
          </div>
          {panelBody}
        </div>
      ) : (
        panelBody
      )}
    </div>,
    portalTarget,
  );
}

DetailPanelShell.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  ariaLabel: PropTypes.string,
  widthClass: PropTypes.string,
  resizable: PropTypes.bool,
  defaultWidth: PropTypes.number,
  minWidth: PropTypes.number,
  maxWidth: PropTypes.number,
  storageKey: PropTypes.string,
  headerActions: PropTypes.node,
};

export default DetailPanelShell;
