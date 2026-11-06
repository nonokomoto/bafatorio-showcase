import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCalendar, FiUsers, FiTruck, FiFileText, FiZap, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { PLANS, PLAN_KEYS, getDiscountedAmount } from 'src/Utils/plans';
import { formatEUR, CTA_KEYS } from './planConfig';
import { Button, Text } from '../../UI';

// Linhas da matriz de direitos (§2 do modelo canónico) mostradas em cada card.
const ROWS = [
  { entitlement: 'events', labelKey: 'plans.grid.rows.events', Icon: FiCalendar },
  { entitlement: 'participants', labelKey: 'plans.grid.rows.participants', Icon: FiUsers },
  { entitlement: 'suppliers', labelKey: 'plans.grid.rows.suppliers', Icon: FiTruck },
  { entitlement: 'report', labelKey: 'plans.grid.rows.report', Icon: FiFileText },
  { entitlement: 'integrations', labelKey: 'plans.grid.rows.integrations', Icon: FiZap },
];

const NAME_KEYS = {
  [PLAN_KEYS.STARTER]: 'plans.grid.names.starter',
  [PLAN_KEYS.PRO]: 'plans.grid.names.pro',
  [PLAN_KEYS.PAY_PER_EVENT]: 'plans.grid.names.payPerEvent',
};

const PlanCard = React.memo(({ planKey, billingCycle, onSelect, pending = false, selectable = false, selected = false, compact = false }) => {
  const { t } = useTranslation('billing');
  const plan = PLANS[planKey];
  const isPro = planKey === PLAN_KEYS.PRO;
  const isPayPerEvent = planKey === PLAN_KEYS.PAY_PER_EVENT;

  // O escalão é atributo da compra, não um plano (ADR-038): um cartão só, com o
  // seletor lá dentro. Arranca no de entrada, o mais barato.
  const [tierKey, setTierKey] = useState(isPayPerEvent ? plan.tiers[0].key : null);
  const selectedTier = isPayPerEvent
    ? plan.tiers.find((tier) => tier.key === tierKey)
    : null;

  // Modo selectable (ex.: modal obrigatório pós-signup): o cartão inteiro é a
  // opção (tipo rádio), quem confirma é um botão externo — por isso não tem
  // CTA próprio nem dispara onSelect ao clicar, só ao mudar de escalão (o que
  // implicitamente escolhe este cartão). No modo default (PlanSelection.jsx)
  // nada disto se aplica: o clique no CTA continua a agir imediatamente.
  const handleCardSelect = () => {
    if (!selectable || pending) return;
    onSelect(planKey, tierKey);
  };
  const handleCardKeyDown = (e) => {
    if (!selectable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardSelect();
    }
  };

  const tierLabel = (tier) =>
    Number.isFinite(tier.maxParticipants)
      ? t('plans.grid.tiers.capped', { max: tier.maxParticipants })
      : t('plans.grid.tiers.uncapped');

  const rowValue = (entitlement) => {
    // O teto do escalão escolhido sobrepõe-se ao default do catálogo, como o
    // gate faz do lado do servidor — senão o cartão prometia ilimitado.
    const value = entitlement === 'participants' && selectedTier
      ? selectedTier.maxParticipants
      : plan.entitlements[entitlement];
    if (value === true) {
      return (
        <span className="inline-flex items-center gap-1 text-foreground">
          <FiCheck className="w-4 h-4 text-success-500" aria-hidden="true" />
        </span>
      );
    }
    if (value === false) return <span className="text-text-400 dark:text-text-500">—</span>;
    if (value === Infinity) return <span className="font-display">{t('plans.grid.values.unlimited')}</span>;
    return <span className="font-display tabular-nums">{value}</span>;
  };

  // Preço: Grátis = 0 €; planos pagos = launch com riscado do base.
  const priceSizeClass = compact ? 'text-4xl' : 'text-5xl';
  const renderPrice = () => {
    if (planKey === PLAN_KEYS.STARTER) {
      return <span className={`${priceSizeClass} font-display font-normal tracking-tight text-secondary-500 dark:text-secondary-light`}>{formatEUR(0)}</span>;
    }
    if (isPayPerEvent) {
      // Sem riscado: saiu do cupão (ADR-038). O preço segue o escalão escolhido.
      return (
        <span className="flex items-baseline gap-2.5">
          <span className={`${priceSizeClass} font-display font-normal tracking-tight text-secondary-500 dark:text-secondary-light tabular-nums`}>
            {formatEUR(selectedTier.amount)}
          </span>
          <span className="text-sm text-text-400 dark:text-text-500">{t('plans.grid.perEvent')}</span>
        </span>
      );
    }
    const base = plan.prices[billingCycle].amount;
    const discounted = getDiscountedAmount(planKey, base);
    return (
      <span className="flex items-baseline gap-2.5">
        <span className={`${priceSizeClass} font-display font-normal tracking-tight text-secondary-500 dark:text-secondary-light tabular-nums`}>
          {formatEUR(discounted)}
        </span>
        <span className="flex flex-col">
          <span className="text-[15px] tabular-nums text-text-400 dark:text-text-500 line-through decoration-primary-500/70 decoration-2">
            {formatEUR(base)}
          </span>
          <span className="text-sm text-text-400 dark:text-text-500">
            {billingCycle === 'annual' ? t('plans.grid.perYear') : t('plans.grid.perMonth')}
          </span>
        </span>
      </span>
    );
  };

  return (
    <section
      aria-label={t(NAME_KEYS[planKey])}
      role={selectable ? 'radio' : undefined}
      aria-checked={selectable ? selected : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? handleCardSelect : undefined}
      onKeyDown={selectable ? handleCardKeyDown : undefined}
      className={`relative flex flex-col rounded-2xl ${compact ? 'p-5' : 'p-7'} bg-background-surface dark:bg-background-surface-dark transition-all
        ${selectable
          ? `cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
             ${selected
               ? 'border-2 border-primary-500 dark:border-primary-light ring-2 ring-primary-500/20 shadow-lg -translate-y-1'
               : 'border border-background-200 dark:border-background-700 shadow-sm hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'}`
          : isPro
            ? 'border-2 border-primary-500 dark:border-primary-light shadow-lg shadow-primary-500/15 lg:-translate-y-2.5'
            : 'border border-background-200 dark:border-background-700 shadow-sm'}`}
    >
      {selectable && selected && (
        <span className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 dark:bg-primary-light text-white shadow-sm ring-4 ring-background-surface dark:ring-background-surface-dark">
          <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
        </span>
      )}

      {isPro && !(selectable && selected) && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-500 dark:bg-primary-light px-3.5 py-1 text-xs font-bold text-white">
          {t('plans.grid.badge')}
        </span>
      )}

      <Text variant={compact ? 'h5' : 'h3'} className={`font-display font-semibold ${compact ? 'mb-3' : 'mb-6'}`}>
        {t(NAME_KEYS[planKey])}
      </Text>

      <div className={`${compact ? 'min-h-[44px]' : 'min-h-[56px]'} flex items-baseline`} data-testid="plan-price">{renderPrice()}</div>

      {isPayPerEvent && (
        <fieldset className={compact ? 'mt-3' : 'mt-5'}>
          <legend className={`${compact ? 'mb-1.5' : 'mb-2'} text-[13px] font-semibold text-text-600 dark:text-text-300`}>
            {t('plans.grid.tiers.label')}
          </legend>
          <div className={compact ? 'grid gap-1.5' : 'grid gap-2'}>
            {plan.tiers.map((tier) => (
              <label
                key={tier.key}
                // Escolhe o cartão aqui em vez de deixar subir até
                // handleCardSelect: a propagação leva o tierKey do estado, ainda
                // desatualizado neste render. Tem de ser no clique e não no
                // onChange do rádio — clicar no escalão JÁ marcado (o de
                // entrada, pré-selecionado) não emite change, e o cartão ficava
                // por selecionar.
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectable) onSelect(planKey, tier.key);
                }}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 ${compact ? 'py-1.5' : 'py-2'} text-sm transition-colors
                  ${tier.key === tierKey
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-foreground'
                    : 'border-background-200 dark:border-background-700 text-text-600 dark:text-text-300 hover:border-background-300 dark:hover:border-background-600'}`}
              >
                <input
                  type="radio"
                  name={`tier-${planKey}`}
                  value={tier.key}
                  checked={tier.key === tierKey}
                  onChange={() => setTierKey(tier.key)}
                  className="accent-primary-500"
                />
                <span className="flex-1">{tierLabel(tier)}</span>
                <span className="font-display tabular-nums">{formatEUR(tier.amount)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <ul className={`${compact ? 'mt-3 mb-4 gap-2 pt-3 text-sm' : 'mt-6 mb-7 gap-3 pt-5 text-[15px]'} grid border-t border-background-200 dark:border-background-700`}>
        {ROWS.map(({ entitlement, labelKey, Icon }) => (
          <li key={entitlement} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2.5 text-text-600 dark:text-text-300">
              <Icon
                className={`${compact ? 'w-4 h-4' : 'w-[17px] h-[17px]'} flex-none ${isPro ? 'text-primary-500 dark:text-primary-400' : 'text-text-400 dark:text-text-500'}`}
                aria-hidden="true"
              />
              {t(labelKey)}
            </span>
            <span className="text-right whitespace-nowrap">{rowValue(entitlement)}</span>
          </li>
        ))}
      </ul>

      {!selectable && (
        <Button
          variant={isPro ? 'primary' : 'outline'}
          className="w-full mt-auto"
          onClick={() => onSelect(planKey, tierKey)}
          disabled={pending}
        >
          {pending ? t('loading.processing') : t(CTA_KEYS[planKey])}
        </Button>
      )}
    </section>
  );
});

PlanCard.displayName = 'PlanCard';

PlanCard.propTypes = {
  planKey: PropTypes.oneOf(Object.values(PLAN_KEYS)).isRequired,
  billingCycle: PropTypes.oneOf(['monthly', 'annual']).isRequired,
  onSelect: PropTypes.func.isRequired,
  pending: PropTypes.bool,
  // Modo rádio (ex.: modal obrigatório pós-signup): o cartão inteiro escolhe,
  // sem CTA próprio — quem confirma é um botão externo ao grid de cartões.
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  // Espaçamento/tipografia reduzidos para caber os 3 cartões sem scroll no
  // modal pós-signup (PostSignupPlanModal.jsx). PlanSelection.jsx (só 2
  // cartões, página inteira) não usa — mantém o tamanho original.
  compact: PropTypes.bool,
};

export default PlanCard;
