import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { FiX, FiLoader, FiAlertCircle, FiDownload, FiFileText, FiEdit2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { getUrl } from 'aws-amplify/storage';
import { Text, Button } from '../UI';
import { getRenderer, supportsSaveAsPdf } from './documentPreviewRenderers';
import { getFileExtension, getFileTypeIcon, FILE_TYPE_COLORS, DEFAULT_FILE_COLOR } from './utils/fileUtils';
import { showToast } from '../../Redux/UI/toastSlice';
import { useSaveSpreadsheetEdit } from '../../Hook/useSaveSpreadsheetEdit';
import EditableSpreadsheetRenderer from './documentPreviewRenderers/EditableSpreadsheetRenderer';

const DEFAULT_PANEL_WIDTH = 1000;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 1400;
const LS_KEY = 'docPreviewWidth';

const formatFileSize = (size) => {
  if (!size) return null;
  if (typeof size === 'string' && /[A-Za-z]/.test(size)) return size;
  const bytes = parseInt(size, 10);
  if (isNaN(bytes)) return size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentPreviewModal = ({
  isOpen,
  onClose,
  document: doc,
  // Permission props
  eventId = null,
  canManageDocuments = false,
  isOwner = false,
  currentFolder = null,
  userId = null,
  // Callbacks
  onDocumentSaved = null,
  invalidateDocumentCache = null,
}) => {
  const { t } = useTranslation('event');
  const dispatch = useDispatch();

  // Document preview state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [freshUrl, setFreshUrl] = useState(null);
  const [saveAsPdfHandler, setSaveAsPdfHandler] = useState(null);
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? Number(saved) : DEFAULT_PANEL_WIDTH;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasDirtyChanges, setHasDirtyChanges] = useState(false);

  const panelWidthRef = useRef(panelWidth);
  const dragCleanupRef = useRef(null);
  const editableRendererRef = useRef(null);

  // Hooks
  const { isSaving: isSavingEdit, saveEdit } = useSaveSpreadsheetEdit();

  const extension = getFileExtension(doc?.name);
  const isSpreadsheet = ['xlsx', 'csv'].includes(extension);
  const RendererComponent = isEditMode && isSpreadsheet
    ? EditableSpreadsheetRenderer
    : getRenderer(extension);
  const showSaveAsPdf = supportsSaveAsPdf(extension);
  const typeColor = FILE_TYPE_COLORS[extension] || DEFAULT_FILE_COLOR;
  const fileSize = formatFileSize(doc?.size);

  // Determine if user can edit this document
  const canEditDocument = useCallback(() => {
    if (!canManageDocuments || !isSpreadsheet) return false;
    if (isOwner) return true;
    if (!currentFolder) return false; // root-level only owner
    const normalizedOwner = currentFolder.owner?.split('::')[0];
    return normalizedOwner === userId;
  }, [canManageDocuments, isOwner, currentFolder, userId, isSpreadsheet]);

  // Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEditMode && hasDirtyChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditMode, hasDirtyChanges]);

  // Refresh S3 signed URL on open, reset state on close
  useEffect(() => {
    if (!isOpen || !doc) {
      dragCleanupRef.current?.();
      setFreshUrl(null);
      setError(null);
      setIsLoading(true);
      setSaveAsPdfHandler(null);
      setIsDragging(false);
      setIsEditMode(false);
      setHasDirtyChanges(false);
      return;
    }

    let cancelled = false;

    const refreshUrl = async () => {
      try {
        const path = doc.path || doc.id;
        const result = await getUrl({ path });
        if (!cancelled) {
          setFreshUrl(result.url.toString());
        }
      } catch (err) {
        console.error('[DocumentPreviewModal] URL refresh error:', err);
        if (!cancelled) {
          setFreshUrl(doc.url);
        }
      }
    };

    refreshUrl();
    return () => { cancelled = true; };
  }, [isOpen, doc]);

  // Block body scroll while panel is open
  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = 'hidden';
      return () => { window.document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean up drag listeners on unmount
  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

  const handleLoaded = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback((msg) => {
    setError(msg);
    setIsLoading(false);
  }, []);

  const handleSaveAsPdfReady = useCallback((handler) => {
    setSaveAsPdfHandler(() => handler);
  }, []);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = panelWidthRef.current;

    const onPointerMove = (ev) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.min(
        Math.max(startWidth + delta, MIN_PANEL_WIDTH),
        MAX_PANEL_WIDTH,
        window.innerWidth * 0.95
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
      localStorage.setItem(LS_KEY, String(panelWidthRef.current));
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = cleanup;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', cleanup);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleResetWidth = useCallback(() => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    panelWidthRef.current = DEFAULT_PANEL_WIDTH;
    localStorage.setItem(LS_KEY, String(DEFAULT_PANEL_WIDTH));
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleClose = useCallback(() => {
    if (isEditMode && hasDirtyChanges) {
      if (window.confirm(t('eventDetails.documents.edit.unsavedWarning'))) {
        setIsEditMode(false);
        onClose();
      }
    } else {
      onClose();
    }
  }, [isEditMode, hasDirtyChanges, onClose, t]);

  const handleDownload = useCallback(() => {
    const a = window.document.createElement('a');
    a.href = freshUrl || doc?.url;
    a.download = doc?.name || '';
    a.click();
  }, [freshUrl, doc]);

  const handleSaveEdit = useCallback(async () => {
    if (!editableRendererRef.current || !hasDirtyChanges) return;

    try {
      // Reconstruct the edited payload (xlsx buffer or csv text, wrapped in a Blob)
      const reconstructed = await editableRendererRef.current.getReconstructedBlob();
      if (!reconstructed?.blob || !reconstructed?.contentType) {
        throw new Error('Failed to prepare edited content');
      }

      // Save to S3 via useSaveSpreadsheetEdit hook
      const documentPath = doc.path || doc.id;
      if (!documentPath) {
        throw new Error('Document path is missing');
      }
      if (!eventId || !currentFolder?.id) {
        throw new Error('Event or folder context is missing');
      }

      await saveEdit(reconstructed.blob, reconstructed.contentType, {
        eventId,
        folderId: currentFolder.id,
        documentPath,
      });

      // Success feedback
      dispatch(showToast({
        message: t('eventDetails.documents.edit.saveSuccess'),
        variant: 'success',
      }));

      // Refresh the signed URL so the view-mode renderer fetches the just-saved
      // object instead of serving a cached response keyed on the previous URL.
      // If the refresh fails we keep the user in edit mode so they can retry —
      // exiting to view mode with a stale URL would make their changes appear lost.
      try {
        const refreshed = await getUrl({ path: documentPath });
        setFreshUrl(refreshed.url.toString());
      } catch (refreshErr) {
        console.warn('[DocumentPreviewModal] Post-save URL refresh failed:', refreshErr);
        return;
      }

      // Clear edits and exit edit mode
      setHasDirtyChanges(false);
      setIsEditMode(false);

      // Invalidate cache and notify parent for list refresh
      if (invalidateDocumentCache) {
        invalidateDocumentCache();
      }
      if (onDocumentSaved) {
        onDocumentSaved();
      }
    } catch (err) {
      console.error('[DocumentPreviewModal] Save edit error:', err);
      dispatch(showToast({
        message: t('eventDetails.documents.edit.saveError'),
        variant: 'error',
      }));
    }
  }, [
    hasDirtyChanges,
    doc,
    eventId,
    currentFolder,
    saveEdit,
    dispatch,
    t,
    invalidateDocumentCache,
    onDocumentSaved,
  ]);

  if (!isOpen || !doc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-end animate-fade-in bg-black/30"
      onClick={handleBackdropClick}
    >
      {/* Side panel wrapper — relative container for drag handle */}
      <div className="relative h-screen flex-shrink-0">
        {/* Drag handle — outside overflow-hidden panel so it isn't clipped */}
        <div
          className="hidden sm:block absolute top-0 -left-1 w-3 h-full cursor-col-resize z-50 group"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('eventDetails.documents.preview.resizeHandle')}
          title={t('eventDetails.documents.preview.resizeHandle')}
          onPointerDown={handleDragStart}
          onDoubleClick={handleResetWidth}
        >
          {/* Grip dots in the middle — visual indicator for drag handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
            <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground group-hover:bg-primary-600" />
          </div>
        </div>

        {/* Side panel — slides from right, full viewport height */}
        <div
          className={`max-w-[95vw] max-sm:w-full h-full bg-card shadow-2xl dark:shadow-dark-elevated flex flex-col animate-slide-in-right overflow-hidden ${isDragging ? '' : 'transition-[width] duration-200 ease-out'}`}
          style={{ width: panelWidth }}
        >
        {/* Top accent line — file-type colored */}
        <div className="h-0.5 w-full flex-shrink-0" style={{ backgroundColor: typeColor }} />

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* File type icon */}
              <span
                className="flex items-center justify-center flex-shrink-0 rounded-xl"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: (FILE_TYPE_COLORS[extension] || DEFAULT_FILE_COLOR) + '18',
                }}
              >
                {getFileTypeIcon(extension, 20)}
              </span>

              <div className="min-w-0">
                <Text variant="subtitle1" className="font-semibold truncate">
                  {doc.name}
                </Text>
                <div className="flex items-center gap-2 mt-0.5">
                  {extension && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: typeColor + '18', color: typeColor }}
                    >
                      .{extension}
                    </span>
                  )}
                  {fileSize && (
                    <Text variant="caption" className="text-muted-foreground">
                      {fileSize}
                    </Text>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={handleClose}
              aria-label={t('eventDetails.documents.preview.close')}
            >
              <FiX size={18} />
            </Button>
          </div>
        </div>

        {/* Content — scrollable, takes remaining height */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <FiLoader className="w-5 h-5 text-primary-500 animate-spin mr-2" />
              <Text variant="body2" className="text-muted-foreground">
                {t('eventDetails.documents.preview.loading')}
              </Text>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FiAlertCircle className="w-8 h-8 text-error-400 mb-3" />
              <Text variant="body2" className="text-muted-foreground">{error}</Text>
            </div>
          )}

          {/* Renderer */}
          {freshUrl && !error && (
            <Suspense fallback={null}>
              {isEditMode && isSpreadsheet ? (
                <EditableSpreadsheetRenderer
                  ref={editableRendererRef}
                  url={freshUrl}
                  name={doc.name}
                  onLoaded={handleLoaded}
                  onError={handleError}
                  onDirtyChange={(dirty) => {
                    setHasDirtyChanges(dirty);
                  }}
                />
              ) : (
                <RendererComponent
                  url={freshUrl}
                  name={doc.name}
                  onLoaded={handleLoaded}
                  onError={handleError}
                  onSaveAsPdfReady={showSaveAsPdf ? handleSaveAsPdfReady : undefined}
                />
              )}
            </Suspense>
          )}
        </div>

        {/* Footer — action buttons */}
        <div className="flex-shrink-0 border-t border-border px-5 py-3.5">
          <div className="flex items-center gap-2 justify-end">
            {(freshUrl || doc.url) && (
              <>
                {/* Edit button (spreadsheet only) */}
                {isSpreadsheet && (
                  canEditDocument() ? (
                    <Button
                      variant="outline"
                      size="sm"
                      startIcon={<FiEdit2 size={14} />}
                      onClick={() => setIsEditMode(!isEditMode)}
                      disabled={isLoading}
                    >
                      {isEditMode ? t('eventDetails.documents.edit.buttonCancel') : t('eventDetails.documents.edit.buttonEdit')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      startIcon={<FiEdit2 size={14} />}
                      disabled
                      title={t('eventDetails.documents.edit.noPermission')}
                    >
                      {t('eventDetails.documents.edit.buttonEdit')}
                    </Button>
                  )
                )}

                {/* Save button (visible only in edit mode with dirty changes) */}
                {isEditMode && hasDirtyChanges && (
                  <Button
                    variant="primary"
                    size="sm"
                    startIcon={isSavingEdit ? <FiLoader size={14} className="animate-spin" /> : <FiDownload size={14} />}
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? t('eventDetails.documents.edit.buttonSaving') : t('eventDetails.documents.edit.buttonSave')}
                  </Button>
                )}

                {/* Save as PDF button */}
                {showSaveAsPdf && saveAsPdfHandler && !isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<FiFileText size={14} />}
                    onClick={saveAsPdfHandler}
                    disabled={isLoading || !!error}
                  >
                    {t('eventDetails.documents.preview.saveAsPdf')}
                  </Button>
                )}

                {/* Download button */}
                {!isEditMode && (
                  <Button
                    variant="primary"
                    size="sm"
                    startIcon={<FiDownload size={14} />}
                    onClick={handleDownload}
                  >
                    {t('eventDetails.documents.preview.download')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>,
    window.document.body
  );
};

DocumentPreviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  document: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    path: PropTypes.string,
    id: PropTypes.string,
    size: PropTypes.string,
    contentType: PropTypes.string,
  }),
  // Permission props
  eventId: PropTypes.string,
  canManageDocuments: PropTypes.bool,
  isOwner: PropTypes.bool,
  currentFolder: PropTypes.shape({
    id: PropTypes.string,
    owner: PropTypes.string,
  }),
  userId: PropTypes.string,
  // Callbacks
  onDocumentSaved: PropTypes.func,
  invalidateDocumentCache: PropTypes.func,
};

export default DocumentPreviewModal;
