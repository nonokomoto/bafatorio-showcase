/**
 * @file TierUpgradeModal.jsx
 * @description Subir o escalão de um evento já comprado (ADR-034/038).
 *
 * O escalão de origem deriva do TETO gravado no evento, que é a autoridade do
 * gate, e não do histórico de compras. O preço mostrado é a DIFERENÇA, mas
 * quem a cobra é o servidor: daqui só vai a intenção (evento + escalão destino).
 * O teto só sobe no webhook, depois do pagamento confirmado.
 */
import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import {
  PLANS,
  PLAN_KEYS,
  getTierByLimit,
  getTierUpgradeAmount,
} from '../../Utils/plans';
import { startCheckout } from '../../Api/billingCheckout';
import { formatEUR } from './CreatePlan/planConfig';
import { Button, Modal } from '../UI';

const INTENT_TIER_UPGRADE = 'TIER_UPGRADE';

const TierUpgradeModal = ({ eventId, currentLimit, isOpen, onClose }) => {
  const { t } = useTranslation('billing');
  const userEmail = useSelector((state) => state.user.user?.email);

  const [tierKey, setTierKey] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  // Teto que não corresponde a escalão nenhum devolve null (fail closed): mais
  // vale não oferecer upgrade do que inferir o escalão errado e cobrar mal.
  const currentTier = getTierByLimit(currentLimit);

  const options = useMemo(() => {
    if (!currentTier) return [];
    return PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers
      .map((tier) => ({ tier, diff: getTierUpgradeAmount(currentTier.key, tier.key) }))
      // diff null = mesmo escalão ou inferior; não existe downgrade (ADR-034).
      .filter(({ diff }) => diff !== null);
  }, [currentTier]);

  const tierLabel = (tier) =>
    Number.isFinite(tier.maxParticipants)
      ? t('plans.grid.tiers.capped', { max: tier.maxParticipants })
      : t('plans.grid.tiers.uncapped');

  const handleConfirm = async () => {
    setPending(true);
    setError(false);
    try {
      // Volta à página onde estava: o upgrade é uma interrupção do trabalho,
      // não um fluxo de compra que mereça um destino próprio.
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const sessionUrl = await startCheckout({
        planKey: PLAN_KEYS.PAY_PER_EVENT,
        intent: INTENT_TIER_UPGRADE,
        eventId,
        tierKey,
        customerEmail: userEmail,
        successUrl: returnUrl,
        cancelUrl: returnUrl,
      });
      window.location.href = sessionUrl;
    } catch (err) {
      console.error('startCheckout (tier upgrade)', err);
      setError(true);
      setPending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      {/* O ModalHeader já rende o <h3>; um Text variant="h3" aqui aninhava h3
          dentro de h3, que é HTML inválido. */}
      <Modal.Header>{t('plans.grid.upgrade.title')}</Modal.Header>

      <Modal.Body>
        <p className="mb-4 text-sm text-text-600 dark:text-text-300">
          {currentTier && Number.isFinite(currentTier.maxParticipants)
            ? t('plans.grid.upgrade.current', { max: currentTier.maxParticipants })
            : t('plans.grid.upgrade.currentUncapped')}
        </p>

        {options.length === 0 ? (
          <p className="text-sm text-text-600 dark:text-text-300">
            {t('plans.grid.upgrade.alreadyMax')}
          </p>
        ) : (
          <>
            <div className="grid gap-2">
              {options.map(({ tier, diff }) => (
                <label
                  key={tier.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors
                    ${tier.key === tierKey
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-foreground'
                      : 'border-background-200 dark:border-background-700 text-text-600 dark:text-text-300'}`}
                >
                  <input
                    type="radio"
                    name="tier-upgrade"
                    value={tier.key}
                    checked={tier.key === tierKey}
                    onChange={() => setTierKey(tier.key)}
                    className="accent-primary-500"
                  />
                  <span className="flex-1">{tierLabel(tier)}</span>
                  <span className="font-display tabular-nums">
                    {t('plans.grid.upgrade.diff', { price: formatEUR(diff) })}
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-3 text-xs text-text-400 dark:text-text-500">
              {t('plans.grid.upgrade.note')}
            </p>
          </>
        )}

        {error && (
          <p className="mt-3 text-sm text-error-600 dark:text-error-400">
            {t('plans.grid.upgrade.error')}
          </p>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          {t('plans.grid.upgrade.cancel')}
        </Button>
        {options.length > 0 && (
          <Button onClick={handleConfirm} disabled={!tierKey || pending}>
            {t('plans.grid.upgrade.confirm')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

TierUpgradeModal.propTypes = {
  eventId: PropTypes.string.isRequired,
  // Teto atual do evento; null/undefined = sem teto (ADR-038).
  currentLimit: PropTypes.number,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TierUpgradeModal;
