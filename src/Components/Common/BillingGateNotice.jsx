/**
 * @file BillingGateNotice.jsx
 * @description Aviso inline para recusas BILLING_GATE:* das mutations gated
 * (agenda, roles de participante, suppliers) — mesmo padrão visual do banner
 * do EventForm. A copy vive em common:billingGate.*; o CTA de upgrade só
 * aparece para reasons conhecidos (o genérico não promete que um upgrade
 * resolve).
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { Text, Button } from '../UI';
import { BILLING_GATE_KNOWN_REASONS, billingGateMessageKey } from '../../Hook/useAuthz';

const BillingGateNotice = ({ reason }) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-warning-300 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30 px-4 py-3">
      <div className="flex items-center gap-2 text-warning-800 dark:text-warning-100">
        <FiAlertCircle className="shrink-0" />
        <Text variant="body2">{t(billingGateMessageKey(reason))}</Text>
      </div>
      {BILLING_GATE_KNOWN_REASONS.has(reason) && (
        <Button size="sm" onClick={() => navigate('/app/plan-selection')}>
          {t('billingGate.upgradeCta')}
        </Button>
      )}
    </div>
  );
};

BillingGateNotice.propTypes = {
  reason: PropTypes.string,
};

export default BillingGateNotice;
