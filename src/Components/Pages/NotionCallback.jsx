import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { Text } from '../UI';
import { useExchangeNotionTokenMutation } from '../../Api/services/notionApi';
import { NOTION_REDIRECT_URI } from '../../Utils/notionConstants';

const NotionCallback = () => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exchangeToken] = useExchangeNotionTokenMutation();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const hasExchanged = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    const savedState = sessionStorage.getItem('notion_oauth_state');
    sessionStorage.removeItem('notion_oauth_state');

    if (error) {
      setStatus('error');
      setMessage(t('notion.callback.denied'));
      return;
    }

    if (!state || state !== savedState) {
      setStatus('error');
      setMessage(t('notion.callback.invalidState'));
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage(t('notion.callback.noCode'));
      return;
    }

    (async () => {
      try {
        const result = await exchangeToken({
          code,
          redirectUri: NOTION_REDIRECT_URI,
        }).unwrap();

        if (result.success) {
          setStatus('success');
          setMessage(result.workspaceName
            ? t('notion.callback.successWorkspace', { workspace: result.workspaceName })
            : t('notion.callback.success')
          );
          timerRef.current = setTimeout(() => navigate('/app/settings/integration', { replace: true }), 2000);
        } else {
          setStatus('error');
          setMessage(result.error || t('notion.callback.exchangeFailed'));
        }
      } catch {
        setStatus('error');
        setMessage(t('notion.callback.exchangeFailed'));
      }
    })();
  }, [searchParams, exchangeToken, navigate, t]);

  const icons = {
    loading: <FiLoader className="w-8 h-8 text-primary-500 animate-spin" />,
    success: <FiCheck className="w-8 h-8 text-success-500" />,
    error: <FiX className="w-8 h-8 text-error-500" />,
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card rounded-xl border border-border p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-background-700 flex items-center justify-center">
          {icons[status]}
        </div>
        <Text variant="h5" weight="medium" className="mb-2 text-foreground">
          {status === 'loading' ? t('notion.callback.connecting') : status === 'success' ? t('notion.callback.connected') : t('notion.callback.failed')}
        </Text>
        <Text variant="body2" className="text-muted-foreground">
          {status === 'loading' ? t('notion.callback.pleaseWait') : message}
        </Text>
        {status === 'error' && (
          <button
            onClick={() => navigate('/app/settings/integration', { replace: true })}
            className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t('notion.callback.backToSettings')}
          </button>
        )}
      </div>
    </div>
  );
};

export default NotionCallback;
