import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiLoader, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Modal, Text, Button, Card } from '../UI';
import { getFileTypeIcon, FILE_TYPE_COLORS, DEFAULT_FILE_COLOR } from './utils/fileUtils';
import {
  useLazyCheckNotionUpdatesQuery,
  useImportNotionPagesMutation,
} from '../../Api/services/notionApi';

const NotionSyncModal = ({ isOpen, onClose, eventId, folderId, onSyncComplete }) => {
  const { t } = useTranslation('event');
  const [checkUpdates] = useLazyCheckNotionUpdatesQuery();
  const [syncPages] = useImportNotionPagesMutation();
  const [status, setStatus] = useState('checking'); // checking | results | syncing | done | error
  const [updates, setUpdates] = useState([]);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  // Check for updates when modal opens
  useEffect(() => {
    if (!isOpen || !eventId || !folderId) return;
    setStatus('checking');
    setUpdates([]);
    setTotal(0);
    setErrorMsg(null);
    setSyncResult(null);

    checkUpdates({ eventId, folderId }).unwrap().then((result) => {
      if (result.error) {
        setStatus('error');
        setErrorMsg(result.error);
        return;
      }
      setTotal(result.total || 0);
      setUpdates(result.updates || []);
      setStatus('results');
    }).catch(() => {
      setStatus('error');
      setErrorMsg(t('eventDetails.notion.sync.error'));
    });
  }, [isOpen, eventId, folderId, checkUpdates, t]);

  const handleSync = useCallback(async () => {
    if (updates.length === 0) return;
    setStatus('syncing');
    try {
      const pageIds = updates.map(u => u.notionPageId);
      const result = await syncPages({ eventId, pageIds, folderId }).unwrap();
      setSyncResult(result);
      setStatus('done');
      if (onSyncComplete) onSyncComplete(result);
    } catch {
      setStatus('error');
      setErrorMsg(t('eventDetails.notion.sync.error'));
    }
  }, [updates, eventId, folderId, syncPages, onSyncComplete, t]);

  const formatTimeAgo = (isoDate) => {
    if (!isoDate) return '';
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t('eventDetails.notion.sync.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('eventDetails.notion.sync.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('eventDetails.notion.sync.daysAgo', { count: days });
  };

  return (
    <Modal isOpen={isOpen} onClose={status === 'syncing' ? undefined : onClose} size="lg" fullWidth>
      <Card variant="default" className="shadow-none rounded-none sm:rounded-lg flex flex-col max-h-[500px]">
        <Modal.Header>
          {t('eventDetails.notion.sync.title')}
        </Modal.Header>

        <Modal.Body className="flex-1 overflow-hidden flex flex-col">
          {/* Checking */}
          {status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-12">
              <FiLoader className="w-6 h-6 text-primary-500 animate-spin mb-3" />
              <Text variant="body2" className="text-text-500 dark:text-text-400">
                {t('eventDetails.notion.sync.checking')}
              </Text>
            </div>
          )}

          {/* Results — no updates */}
          {status === 'results' && updates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FiCheck className="w-8 h-8 text-success-500 mb-3" />
              <Text variant="body1" weight="medium" className="text-text-700 dark:text-text-200 mb-1">
                {t('eventDetails.notion.sync.upToDate')}
              </Text>
              <Text variant="body2" className="text-text-400 dark:text-text-500">
                {t('eventDetails.notion.sync.allCurrent', { count: total })}
              </Text>
            </div>
          )}

          {/* Results — has updates */}
          {status === 'results' && updates.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <Text variant="body2" className="text-warning-600 dark:text-warning-400">
                  {t('eventDetails.notion.sync.available', { count: updates.length })}
                </Text>
                <Text variant="caption" className="text-text-400 dark:text-text-500">
                  {t('eventDetails.notion.sync.totalDocs', { count: total })}
                </Text>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto border border-neutral-200/60 dark:border-neutral-800/60 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-800">
                {updates.map((doc) => {
                  const ext = doc.s3Key?.split('.').pop()?.toLowerCase() || 'md';
                  const typeColor = FILE_TYPE_COLORS[ext] || DEFAULT_FILE_COLOR;
                  return (
                    <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="flex items-center justify-center flex-shrink-0 rounded-lg"
                        style={{ width: 32, height: 32, backgroundColor: typeColor + '18' }}
                      >
                        {getFileTypeIcon(ext, 16)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Text variant="body2" weight="medium" className="truncate text-text-800 dark:text-text-100">
                          {doc.title}
                        </Text>
                        <Text variant="caption" className="text-text-400 dark:text-text-500">
                          {t('eventDetails.notion.sync.editedInNotion')} {formatTimeAgo(doc.notionLastEditedAt)}
                        </Text>
                      </div>
                      <FiRefreshCw className="w-4 h-4 text-warning-500 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Syncing */}
          {status === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <FiLoader className="w-6 h-6 text-primary-500 animate-spin mb-3" />
              <Text variant="body2" className="text-text-500 dark:text-text-400">
                {t('eventDetails.notion.sync.syncing')}
              </Text>
            </div>
          )}

          {/* Done */}
          {status === 'done' && (
            <div className="flex flex-col items-center justify-center py-12">
              <FiCheck className="w-8 h-8 text-success-500 mb-3" />
              <Text variant="body1" weight="medium" className="text-text-700 dark:text-text-200 mb-1">
                {t('eventDetails.notion.sync.success', { count: syncResult?.imported || 0 })}
              </Text>
              {syncResult?.failed > 0 && (
                <Text variant="body2" className="text-error-500">
                  {t('eventDetails.notion.sync.partialFailure', { failed: syncResult.failed })}
                </Text>
              )}
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <FiAlertCircle className="w-8 h-8 text-error-400 mb-3" />
              <Text variant="body1" weight="medium" className="text-text-700 dark:text-text-200 mb-1">
                {t('eventDetails.notion.sync.error')}
              </Text>
              {errorMsg && (
                <Text variant="body2" className="text-text-400 dark:text-text-500">
                  {errorMsg}
                </Text>
              )}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={status === 'syncing'}>
            {status === 'done' || (status === 'results' && updates.length === 0)
              ? t('eventDetails.notion.close')
              : t('eventDetails.notion.cancel')}
          </Button>
          {status === 'results' && updates.length > 0 && (
            <Button variant="primary" size="sm" onClick={handleSync}>
              <span className="flex items-center gap-1.5">
                <FiRefreshCw className="w-3.5 h-3.5" />
                {t('eventDetails.notion.sync.updateAll', { count: updates.length })}
              </span>
            </Button>
          )}
        </Modal.Footer>
      </Card>
    </Modal>
  );
};

NotionSyncModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.string.isRequired,
  folderId: PropTypes.string.isRequired,
  onSyncComplete: PropTypes.func,
};

export default NotionSyncModal;
