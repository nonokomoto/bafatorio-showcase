import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiCalendar, FiUsers, FiTruck, FiFileText, FiZap, FiCheck, FiClock, FiCheckCircle, FiFolder, FiUpload } from 'react-icons/fi';
import { Text, Container, Card } from '../../UI';
import { useTranslation } from 'react-i18next';
import { PLANS, PLAN_KEYS, getDiscountedAmount } from 'src/Utils/plans';
import { track } from 'src/Utils/analytics';
import 'animate.css';

const formatEUR = (cents, language) =>
  new Intl.NumberFormat(language || 'pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

// Protótipo: parte inteira a 48px, cêntimos/símbolo a 22px (`.price .cents`).
const PriceDisplay = ({ cents, language }) => {
  const parts = new Intl.NumberFormat(language || 'pt-PT', { style: 'currency', currency: 'EUR' })
    .formatToParts(cents / 100);
  const intPart = parts.filter((p) => p.type === 'integer' || p.type === 'group').map((p) => p.value).join('');
  const rest = parts.filter((p) => p.type !== 'integer' && p.type !== 'group').map((p) => p.value).join('');
  return (
    <span className="font-display text-5xl font-normal leading-none tracking-tight tabular-nums text-secondary-500 dark:text-secondary-light">
      {intPart}
      <span className="text-[22px]">{rest}</span>
    </span>
  );
};

PriceDisplay.propTypes = {
  cents: PropTypes.number.isRequired,
  language: PropTypes.string
};

const BillingToggle = ({ value, onChange }) => {
  const { t } = useTranslation('landingPageAlt');
  const options = [
    { id: 'monthly', label: t('pricing.billing.monthly') },
    { id: 'annual', label: t('pricing.billing.annual') }
  ];

  return (
    <div className="flex justify-center mb-10 animate__animated animate__fadeIn">
      <div
        className="inline-flex items-center p-1 rounded-full bg-background-100 dark:bg-background-700 border border-background-200 dark:border-background-600"
        role="group"
        aria-label={t('pricing.billing.annual')}
      >
        {options.map((option) => {
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={isActive}
              className={`relative px-5 py-2 rounded-full text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-text-600 dark:text-text-300 hover:text-text-900 dark:hover:text-text-100'}
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

BillingToggle.propTypes = {
  value: PropTypes.oneOf(['monthly', 'annual']).isRequired,
  onChange: PropTypes.func.isRequired
};

const PlanRow = ({ Icon, label, value, highlighted }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="inline-flex items-center gap-2.5 text-[15px] text-text-600 dark:text-text-300">
      <Icon
        className={`w-[17px] h-[17px] flex-none ${highlighted ? 'text-primary-500 dark:text-primary-light' : 'text-text-400 dark:text-text-500'}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
    <span className="text-[15px] text-right whitespace-nowrap">{value}</span>
  </div>
);

PlanRow.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  highlighted: PropTypes.bool
};

const PricingAlt = () => {
  const { t, i18n } = useTranslation('landingPageAlt');
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const eur = (cents) => formatEUR(cents, i18n.language);

  const yes = (
    <span className="inline-flex items-center text-text-900 dark:text-text-100">
      <FiCheck className="w-4 h-4 text-success-500" aria-hidden="true" />
    </span>
  );
  const no = <span className="text-text-400 dark:text-text-500">—</span>;

  const proBase = PLANS[PLAN_KEYS.PRO].prices[billingPeriod].amount;
  const proLaunch = getDiscountedAmount(PLAN_KEYS.PRO, proBase);

  // Linhas da matriz (§2): label à esquerda, valor à direita — derivadas da fonte única.
  const rowIcons = { events: FiCalendar, participants: FiUsers, suppliers: FiTruck, report: FiFileText, integrations: FiZap };
  const rowsFor = (planKey) =>
    Object.entries(rowIcons).map(([entitlement, Icon]) => {
      const raw = PLANS[planKey].entitlements[entitlement];
      let value;
      // O Por Evento escala por dimensão (ADR-038): o `Infinity` do catálogo é
      // só o default do escalão de topo, e afixá-lo ao lado do "a partir de
      // 9,99 €" prometia o teto maior pelo preço de entrada.
      if (planKey === PLAN_KEYS.PAY_PER_EVENT && entitlement === 'participants') {
        value = (
          <span className="font-display text-text-800 dark:text-text-100">
            {t('pricing.values.tierRange', {
              min: PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers[0].maxParticipants,
            })}
          </span>
        );
      }
      else if (raw === true) value = yes;
      else if (raw === false) value = no;
      else if (raw === Infinity) value = <span className="font-display text-text-800 dark:text-text-100">{t('pricing.values.unlimited')}</span>;
      else value = <span className="font-display tabular-nums text-text-800 dark:text-text-100">{raw}</span>;
      return { Icon, label: t(`pricing.rows.${entitlement}`), value };
    });

  const plans = [
    {
      key: 'starter',
      name: t('pricing.plans.starter.name'),
      cta: t('pricing.plans.starter.cta'),
      popular: false,
      price: <PriceDisplay cents={0} language={i18n.language} />,
      rows: rowsFor(PLAN_KEYS.STARTER),
    },
    {
      key: 'pro',
      name: t('pricing.plans.pro.name'),
      cta: t('pricing.plans.pro.cta'),
      popular: true,
      price: (
        <span className="flex items-baseline gap-2.5">
          <PriceDisplay cents={proLaunch} language={i18n.language} />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] tabular-nums text-text-400 dark:text-text-500 line-through decoration-primary-500/70 decoration-2">
              {eur(proBase)}
            </span>
            <span className="text-[13.5px] text-text-400 dark:text-text-500">
              {billingPeriod === 'annual' ? t('pricing.perYear') : t('pricing.perMonth')}
            </span>
          </span>
        </span>
      ),
      rows: rowsFor(PLAN_KEYS.PRO),
    },
    {
      key: 'perEvent',
      name: t('pricing.plans.perEvent.name'),
      cta: t('pricing.plans.perEvent.cta'),
      popular: false,
      price: (
        // Sem riscado: o Por Evento saiu do cupão de lançamento (ADR-038), logo
        // não há preço base a abater. O que se afixa é o escalão de entrada.
        // "a partir de" acima e fora do fluxo: à frente do valor lê-se ao
        // contrário, e empilhado no fluxo empurrava o 9,99 para baixo do 14,99
        // do Pro — o container alinha os preços pela baseline.
        <span className="relative flex items-baseline gap-2">
          <span className="absolute -top-[18px] left-0 whitespace-nowrap text-[13.5px] text-text-400 dark:text-text-500">
            {t('pricing.fromPrice')}
          </span>
          <PriceDisplay cents={PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers[0].amount} language={i18n.language} />
          <span className="text-[13.5px] text-text-400 dark:text-text-500">{t('pricing.perEvent')}</span>
        </span>
      ),
      rows: rowsFor(PLAN_KEYS.PAY_PER_EVENT),
    },
  ];

  const universal = [
    { Icon: FiClock, label: t('pricing.universal.agenda') },
    { Icon: FiCheckCircle, label: t('pricing.universal.confirmations') },
    { Icon: FiFolder, label: t('pricing.universal.documents') },
    { Icon: FiUpload, label: t('pricing.universal.excel') },
  ];

  return (
    <div className="py-16 lg:py-24 bg-background-100/60 dark:bg-background-900 animate__animated animate__fadeIn">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-8 animate__animated animate__fadeIn">
          <Text variant="h2" weight="bold" align="center" className="mb-3 text-text-900 dark:text-text-100">
            {t('pricing.title')}
          </Text>
        </div>

        <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto animate__animated animate__fadeIn">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              padded={false}
              variant="transparent"
              className={`relative h-full flex flex-col bg-white dark:bg-background-surface-dark text-text-900 dark:text-text-100
                ${plan.popular
                  ? 'border-2 border-primary-500 dark:border-primary-light lg:-translate-y-2.5 shadow-[0_4px_12px_rgba(64,105,255,0.12),0_16px_48px_rgba(64,105,255,0.18)] dark:shadow-[0_4px_16px_rgba(102,135,255,0.28),0_16px_48px_rgba(102,135,255,0.22)]'
                  : 'border border-background-200 dark:border-background-700 shadow-sm hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-lg'}
              `}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-500 dark:bg-primary-light px-3.5 py-1 text-xs font-bold tracking-wide text-white">
                  {t('pricing.badge')}
                </span>
              )}

              <div className="p-7 flex-grow flex flex-col">
                <h3 className="font-display text-xl font-semibold mb-6 text-text-900 dark:text-text-100">
                  {plan.name}
                </h3>

                <div className="min-h-[56px] flex items-baseline text-text-900 dark:text-text-100">
                  {plan.price}
                </div>

                <div className="mt-6 mb-7 grid gap-3 border-t border-background-200 dark:border-background-700 pt-5">
                  {plan.rows.map((row) => (
                    <PlanRow key={row.label} Icon={row.Icon} label={row.label} value={row.value} highlighted={plan.popular} />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    track('cta_click', { cta: 'pricing' });
                    navigate('/signup');
                  }}
                  className={`w-full mt-auto rounded-[10px] px-4 py-3.5 text-[15px] font-semibold text-center transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500
                    ${plan.popular
                      ? 'bg-primary-500 hover:bg-primary-600 dark:bg-primary-light dark:hover:bg-primary-400 text-white'
                      : 'border border-background-200 dark:border-background-700 bg-background-50 dark:bg-background-700/60 text-text-900 dark:text-text-100 hover:border-text-400 dark:hover:border-text-500'}`}
                >
                  {plan.cta}
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-14 text-center animate__animated animate__fadeIn">
          <Text variant="body2" align="center" className="block text-center mb-6 text-text-600 dark:text-text-300">
            <strong className="text-text-900 dark:text-text-100">{t('pricing.universal.lead')}</strong>
          </Text>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-7">
            {universal.map(({ Icon, label }) => (
              <div key={label} className="grid justify-items-center gap-2.5 text-sm font-semibold text-text-600 dark:text-text-300">
                <span className="grid h-[60px] w-[60px] place-items-center rounded-[14px] border border-background-200 dark:border-background-700 bg-white dark:bg-background-900 shadow-sm">
                  <Icon className="h-6 w-6 text-primary-500 dark:text-primary-400" aria-hidden="true" />
                </span>
                {label}
              </div>
            ))}
          </div>
          <Text variant="caption" align="center" className="block w-full text-center mt-8 text-text-500 dark:text-text-400">
            {t('pricing.footer')}
          </Text>
        </div>
      </Container>
    </div>
  );
};

export default PricingAlt;
