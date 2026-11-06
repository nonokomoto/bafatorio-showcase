import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FiLink, FiLink2, FiLoader } from 'react-icons/fi';
import { Text, Button } from '../UI';
import { useFidelizeStatus } from '../../Hook/useFidelizeStatus';
import { useSaveFidelizeApiKeyMutation } from '../../Api/services/fidelizeApi';

const FidelizeIntegrationSettings = () => {
  const { t } = useTranslation('settings');
  const userId = useSelector((state) => state.user?.user?.sub);
  const { isConnected, lastSyncAt, isLoading, disconnect, refetch } = useFidelizeStatus(userId);
  const [saveFidelizeApiKey, { isLoading: isSaving }] = useSaveFidelizeApiKeyMutation();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    setError(null);

    try {
      const result = await saveFidelizeApiKey({ apiKey: apiKeyInput.trim() }).unwrap();
      if (result?.success) {
        setApiKeyInput('');
        await refetch();
      } else {
        setError(result?.error || 'Unknown error');
      }
    } catch (err) {
      const msg = err?.message || err?.errors?.[0]?.message || err?.data?.errors?.[0]?.message || 'Failed to save API key';
      setError(msg);
    }
  }, [apiKeyInput, saveFidelizeApiKey, refetch]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } catch {
      // Error logged in hook
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnect]);

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <FiLoader className="w-5 h-5 text-primary-500 animate-spin" />
          <Text variant="body2" className="text-muted-foreground">
            {t('fidelize.loading')}
          </Text>
        </div>
      </div>
    );
  }

  const formattedLastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString()
    : null;

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Fidelize logo */}
        <img src="/fidelize-icon-192.png" alt="Fidelize" className="w-10 h-10 rounded-lg object-contain flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Text variant="body1" weight="semibold" className="text-foreground">
              {t('fidelize.title')}
            </Text>
            {isConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">
                {t('fidelize.status.connected')}
              </span>
            )}
          </div>

          <Text variant="body2" className="text-muted-foreground mb-3">
            {isConnected
              ? (formattedLastSync
                  ? t('fidelize.connectedDescription', { lastSync: formattedLastSync })
                  : t('fidelize.neverSynced'))
              : t('fidelize.description')
            }
          </Text>

          {error && (
            <Text variant="body2" className="text-error-600 dark:text-error-400 mb-3">
              {error}
            </Text>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                color="error"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                <span className="flex items-center gap-1.5">
                  {isDisconnecting ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiLink2 className="w-3.5 h-3.5" />}
                  {t('fidelize.disconnect')}
                </span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={t('fidelize.apiKeyPlaceholder')}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                disabled={isSaving || !apiKeyInput.trim()}
              >
                <span className="flex items-center gap-1.5">
                  {isSaving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiLink className="w-3.5 h-3.5" />}
                  {isSaving ? t('fidelize.connecting') : t('fidelize.connect')}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FidelizeIntegrationSettings;
