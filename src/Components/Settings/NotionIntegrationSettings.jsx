import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FiLink, FiLink2, FiExternalLink, FiLoader } from 'react-icons/fi';
import { Text, Button } from '../UI';
import { useNotionStatus } from '../../Hook/useNotionStatus';
import { NOTION_CLIENT_ID, NOTION_REDIRECT_URI } from '../../Utils/notionConstants';
import FidelizeIntegrationSettings from './FidelizeIntegrationSettings';

const NotionIntegrationSettings = () => {
  const { t } = useTranslation('settings');
  const userId = useSelector((state) => state.user?.user?.sub);
  const { isConnected, workspaceName, isLoading, disconnect, refetch } = useNotionStatus(userId);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = useCallback(() => {
    const state = crypto.randomUUID();
    sessionStorage.setItem('notion_oauth_state', state);

    const params = new URLSearchParams({
      client_id: NOTION_CLIENT_ID,
      redirect_uri: NOTION_REDIRECT_URI,
      response_type: 'code',
      owner: 'user',
      state,
    });
    window.location.href = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }, []);

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
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3">
          <FiLoader className="w-5 h-5 text-primary-500 animate-spin" />
          <Text variant="body2" className="text-muted-foreground">
            {t('notion.loading')}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6">
        <Text variant="h5" weight="medium" className="mb-1 text-foreground">
          {t('page.integrations')}
        </Text>
        <Text variant="body2" className="mb-6 text-muted-foreground">
          {t('notion.subtitle')}
        </Text>

        {/* Fidelize card */}
        <FidelizeIntegrationSettings />

        {/* Notion card */}
        <div className="border border-border rounded-lg p-4 mt-4">
          <div className="flex items-start gap-4">
            {/* Notion logo */}
            <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" className="fill-white dark:fill-neutral-900"/>
                <path d="M61.35.227L6.017 4.313C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723.967 5.053 3.3 8.167l12.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.437-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.82-2.843-3.443-4.733L74.167 3.143C69.893.04 68.147-.357 61.35.227zM25.047 17.3c-5.33.393-6.533.483-9.557-1.947L8.577 9.78c-.777-.78-.34-1.753 1.553-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.543 2.527l8.347 6.04c.39.193 1.36 1.36.193 1.36l-55.06 3.233-.3.193zM19.043 88.66V30.3c0-2.53.78-3.697 3.107-3.893L86.2 22.7c2.14-.193 3.107 1.167 3.107 3.693v57.97c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.497.193-5.003-.97-5.003-4.067zM78.083 34.2c.39 1.75 0 3.5-1.75 3.7l-2.917.577v42.773c-2.527 1.36-4.853 2.14-6.797 2.14-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.02 1.363s0 3.5-4.857 3.5l-13.39.78c-.39-.78 0-2.723 1.357-3.11l3.497-.97V38.283l-4.857-.39c-.39-1.75.583-4.277 3.3-4.473l14.357-.967 19.803 30.327V36.923l-5.047-.583c-.39-2.143 1.163-3.7 3.103-3.89l13.997-.25z" className="fill-neutral-900 dark:fill-white"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Text variant="body1" weight="semibold" className="text-foreground">
                  Notion
                </Text>
                {isConnected && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">
                    {t('notion.status.connected')}
                  </span>
                )}
              </div>

              <Text variant="body2" className="text-muted-foreground mb-3">
                {isConnected
                  ? t('notion.connectedDescription', { workspace: workspaceName || 'Notion' })
                  : t('notion.description')
                }
              </Text>

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
                      {t('notion.disconnect')}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refetch}
                  >
                    {t('notion.refresh')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnect}
                  disabled={!NOTION_CLIENT_ID}
                >
                  <span className="flex items-center gap-1.5">
                    <FiLink className="w-3.5 h-3.5" />
                    {t('notion.connect')}
                  </span>
                </Button>
              )}
            </div>

            {isConnected && (
              <a
                href="https://www.notion.so"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={t('notion.openNotion')}
              >
                <FiExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotionIntegrationSettings;
