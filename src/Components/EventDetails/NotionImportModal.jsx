import { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FiSearch, FiCheck, FiLoader, FiFile, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Modal, Text, Button, Card } from '../UI';
import {
  useLazyListNotionPagesQuery,
  useImportNotionPagesMutation,
} from '../../Api/services/notionApi';
import { useCreateFolderMutation } from '../../Api/services/folderApi';

const MAX_SELECTION = 5;

const NotionImportModal = ({ isOpen, onClose, eventId, folderId, onImportComplete }) => {
  const { t } = useTranslation('event');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPages, setSelectedPages] = useState(new Map());
  const [importStatus, setImportStatus] = useState('browse'); // browse | importing | done
  const [importError, setImportError] = useState(null);
  const [allPages, setAllPages] = useState([]);
  const closeTimerRef = useRef(null);

  const [fetchPages, { data: pagesData, isFetching }] = useLazyListNotionPagesQuery();
  const [importPages, { isLoading: isImporting }] = useImportNotionPagesMutation();
  const [createFolder] = useCreateFolderMutation();

  const hasMore = pagesData?.hasMore || false;
  const nextCursor = pagesData?.nextCursor || null;
  const connectionError = pagesData?.error;

  // Accumulate pages from paginated responses (only for "load more")
  useEffect(() => {
    if (pagesData?.pages && allPages.length > 0) {
      setAllPages((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPages = pagesData.pages.filter((p) => !existingIds.has(p.id));
        return newPages.length > 0 ? [...prev, ...newPages] : prev;
      });
    }
  }, [pagesData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state on modal open — fetch initial pages directly via unwrap
  useEffect(() => {
    if (isOpen) {
      setAllPages([]);
      setSelectedPages(new Map());
      setSearchQuery('');
      setImportStatus('browse');
      setImportError(null);
      fetchPages({}).unwrap().then((result) => {
        setAllPages(result?.pages || []);
      }).catch(() => {});
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [isOpen, fetchPages]);

  const handleSearch = useCallback(() => {
    setAllPages([]);
    fetchPages({ query: searchQuery || undefined }).unwrap().then((result) => {
      setAllPages(result?.pages || []);
    }).catch(() => {});
  }, [fetchPages, searchQuery]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      fetchPages({ query: searchQuery || undefined, cursor: nextCursor });
    }
  }, [fetchPages, searchQuery, nextCursor]);

  const togglePage = useCallback((page) => {
    setSelectedPages((prev) => {
      const next = new Map(prev);
      if (next.has(page.id)) {
        next.delete(page.id);
      } else if (next.size < MAX_SELECTION) {
        next.set(page.id, page);
      }
      return next;
    });
  }, []);

  const handleImport = useCallback(async () => {
    setImportStatus('importing');
    setImportError(null);

    try {
      let targetFolderId = folderId;

      if (!targetFolderId) {
        const folderResult = await createFolder({ eventId, name: 'Notion' }).unwrap();
        targetFolderId = folderResult.id;
      }

      const result = await importPages({
        eventId,
        folderId: targetFolderId,
        pageIds: Array.from(selectedPages.keys()),
      }).unwrap();

      setImportStatus('done');

      if (result.failed > 0) {
        setImportError(t('eventDetails.notion.partialFailure', {
          imported: result.imported,
          failed: result.failed,
        }));
      }

      if (result.imported > 0 && onImportComplete) {
        onImportComplete(result);
      }

      if (result.success) {
        closeTimerRef.current = setTimeout(() => onClose(), 500);
      }
    } catch {
      setImportStatus('done');
      setImportError(t('eventDetails.notion.importFailed'));
    }
  }, [selectedPages, eventId, folderId, createFolder, importPages, onImportComplete, onClose, t]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={importStatus === 'importing' ? undefined : onClose} size="2xl" fullWidth>
      <Card variant="default" className="shadow-none rounded-none sm:rounded-lg flex flex-col h-[600px]">
      <Modal.Header>
        {t('eventDetails.notion.importTitle')}
      </Modal.Header>

      <Modal.Body className="flex-1 overflow-hidden flex flex-col">
        {connectionError ? (
          <div className="flex flex-col items-center py-8 text-center">
            <FiAlertCircle className="w-10 h-10 text-error-400 mb-3" />
            <Text variant="body1" weight="medium" className="mb-1 text-foreground">
              {t('eventDetails.notion.notConnected')}
            </Text>
            <Text variant="body2" className="text-muted-foreground">
              {t('eventDetails.notion.connectFirst')}
            </Text>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('eventDetails.notion.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder-text-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  disabled={importStatus !== 'browse'}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearch}
                disabled={isFetching || importStatus !== 'browse'}
              >
                {t('eventDetails.notion.search')}
              </Button>
            </div>

            {/* Selection counter */}
            <div className="flex items-center justify-between mb-3">
              <Text variant="caption" className="text-muted-foreground">
                {t('eventDetails.notion.selected', { count: selectedPages.size, max: MAX_SELECTION })}
              </Text>
              {selectedPages.size > 0 && importStatus === 'browse' && (
                <button
                  onClick={() => setSelectedPages(new Map())}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {t('eventDetails.notion.clearSelection')}
                </button>
              )}
            </div>

            {/* Page list */}
            <div className="flex-1 min-h-0 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {isFetching && allPages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <FiLoader className="w-5 h-5 text-primary-500 animate-spin mr-2" />
                  <Text variant="body2" className="text-text-500">{t('eventDetails.notion.loadingPages')}</Text>
                </div>
              ) : allPages.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <FiFile className="w-8 h-8 text-text-300 dark:text-text-600 mb-2" />
                  <Text variant="body2" className="text-muted-foreground">
                    {t('eventDetails.notion.noPages')}
                  </Text>
                </div>
              ) : (
                allPages.filter((p) => p.type !== 'database').map((page) => {
                  const isSelected = selectedPages.has(page.id);
                  const isDisabled = !isSelected && selectedPages.size >= MAX_SELECTION;

                  return (
                    <button
                      key={page.id}
                      onClick={() => !isDisabled && importStatus === 'browse' && togglePage(page)}
                      disabled={importStatus !== 'browse'}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                        ${isSelected
                          ? 'bg-primary-50/50 dark:bg-primary-900/20'
                          : isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-accent'
                        }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4.5 h-4.5 rounded border flex-shrink-0 flex items-center justify-center
                        ${isSelected
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-border'
                        }`}
                      >
                        {isSelected && <FiCheck className="w-3 h-3" />}
                      </div>

                      {/* Icon */}
                      {page.icon ? (
                        <span className="text-base flex-shrink-0">{page.icon}</span>
                      ) : (
                        <FiFile className="w-4 h-4 text-text-400 flex-shrink-0" />
                      )}

                      {/* Title & date */}
                      <div className="flex-1 min-w-0">
                        <Text variant="body2" weight="medium" className="truncate text-foreground">
                          {page.title}
                        </Text>
                        {page.lastEditedAt && (
                          <Text variant="caption" className="text-muted-foreground">
                            {formatDate(page.lastEditedAt)}
                          </Text>
                        )}
                      </div>
                    </button>
                  );
                })
              )}

              {/* Load more */}
              {hasMore && !isFetching && (
                <button
                  onClick={handleLoadMore}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-accent transition-colors"
                >
                  <FiChevronRight className="w-3.5 h-3.5" />
                  {t('eventDetails.notion.loadMore')}
                </button>
              )}

              {/* Loading indicator for pagination */}
              {isFetching && allPages.length > 0 && (
                <div className="flex items-center justify-center py-3">
                  <FiLoader className="w-4 h-4 text-primary-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Import progress */}
            {importStatus === 'importing' && (
              <div className="mt-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <FiLoader className="w-4 h-4 animate-spin" />
                <Text variant="body2">
                  {t('eventDetails.notion.importing', { count: selectedPages.size })}
                </Text>
              </div>
            )}

            {/* Import error */}
            {importStatus === 'done' && importError && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400">
                <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                <Text variant="body2">{importError}</Text>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={importStatus === 'importing'}
        >
          {importStatus === 'done' ? t('eventDetails.notion.close') : t('eventDetails.notion.cancel')}
        </Button>
        {importStatus !== 'done' && !connectionError && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={selectedPages.size === 0 || importStatus === 'importing'}
          >
            <span className="flex items-center gap-1.5">
              {isImporting && <FiLoader className="w-3.5 h-3.5 animate-spin" />}
              {t('eventDetails.notion.importButton', { count: selectedPages.size })}
            </span>
          </Button>
        )}
      </Modal.Footer>
      </Card>
    </Modal>
  );
};

NotionImportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.string.isRequired,
  folderId: PropTypes.string,
  onImportComplete: PropTypes.func,
};

export default NotionImportModal;
