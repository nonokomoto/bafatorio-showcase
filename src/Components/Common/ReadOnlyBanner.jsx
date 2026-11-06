/**
 * @file ReadOnlyBanner.jsx
 * @description Banner de evento read-only (padrão Trello/Airtable): o evento
 * nunca é escondido — consulta e PDF ficam; a escrita fecha (§4 do modelo).
 * A copy e o CTA derivam do reason servido pelo backend (useAuthz).
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiLock } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { Card, Text, Button } from '../UI';

// reasons com CTA de reativação (a subscrição devolve a escrita)
const REACTIVATE_REASONS = new Set(['PRO_LAPSED', 'PRO_PAUSED']);

const ReadOnlyBanner = ({ reason, hasReport = true }) => {
  const { t } = useTranslation('event');
  const navigate = useNavigate();

  const reasonKey = ['WINDOW_EXPIRED', 'PRO_LAPSED', 'PRO_PAUSED'].includes(reason)
    ? reason
    : 'WINDOW_EXPIRED';
  // Starter nunca teve relatório — prometê-lo aqui contradiria o lock do
  // CompletedEventBanner no mesmo ecrã.
  const messageKey =
    reasonKey === 'WINDOW_EXPIRED' && !hasReport ? 'WINDOW_EXPIRED_NO_REPORT' : reasonKey;

  return (
    <Card variant="warning" bordered padded="md" className="mt-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FiLock className="shrink-0 text-warning-600 dark:text-warning-400 text-xl" />
          <div>
            <Text variant="h6" className="font-medium text-warning-800 dark:text-warning-100">
              {t('readOnlyBanner.title')}
            </Text>
            <Text variant="body2" className="text-warning-700 dark:text-warning-200">
              {t(`readOnlyBanner.${messageKey}`)}
            </Text>
          </div>
        </div>
        {REACTIVATE_REASONS.has(reasonKey) && (
          <Button size="sm" onClick={() => navigate('/app/plan-selection')}>
            {t('readOnlyBanner.reactivateCta')}
          </Button>
        )}
      </div>
    </Card>
  );
};

ReadOnlyBanner.propTypes = {
  reason: PropTypes.string,
  hasReport: PropTypes.bool,
};

export default ReadOnlyBanner;
