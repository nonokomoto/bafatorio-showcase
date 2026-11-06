import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { PLAN_KEYS } from 'src/Utils/plans';
import { startCheckout } from '../../../Api/billingCheckout';
import ErrorModal from '../../Layout/hook/ErrorModal';
import PlanCard from './PlanCard';
import { UNIVERSAL_FEATURES } from './planConfig';

// Ordem de display: Pro (destaque, centro) → Por evento (âncora de preço).
// Grátis não é mostrado — é o default de qualquer conta, sem checkout.
const DISPLAY_ORDER = [PLAN_KEYS.PRO, PLAN_KEYS.PAY_PER_EVENT];

const PlanSelection = () => {
  const { t } = useTranslation('billing');
  
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [error, setError] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const user = useSelector((state) => state.user.user);
  const userEmail = user.email;

  // Sem formulário intermédio: os dados de faturação são recolhidos na página
  // da Stripe, que os valida por país. Aqui só se escolhe o plano.
  const handlePlanSelect = useCallback(async (planKey, tierKey) => {
    setPendingPlan(planKey);
    try {
      const sessionUrl = await startCheckout({
        planKey,
        billingCycle,
        // Escalão escolhido no cartão do Por Evento; o preço resolve-se no
        // servidor a partir dele (ADR-038).
        tierKey,
        customerEmail: userEmail,
        successUrl: `${window.location.origin}/app/events`,
        cancelUrl: `${window.location.origin}/app/plan-selection`,
      });
      window.location.href = sessionUrl;
    } catch (err) {
      console.error('startCheckout', err);
      setError(t('error.payment'));
      setPendingPlan(null);
    }
  }, [billingCycle, userEmail, t]);

  return (
    <div className="min-h-screen bg-background dark:bg-black px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-5xl mx-auto">
        <header className="text-center pt-12 mb-12 flex flex-col items-center gap-3">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">
            {t('plans.grid.title')}
          </h1>
          <div
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-background-200 dark:border-background-700 bg-background-surface dark:bg-background-surface-dark p-1"
            role="group"
            aria-label={t('fields.billingCycle.label')}
          >
            {['monthly', 'annual'].map((cycle) => (
              <button
                key={cycle}
                type="button"
                aria-pressed={billingCycle === cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors
                  ${billingCycle === cycle
                    ? 'bg-primary-500 text-white'
                    : 'text-text-600 dark:text-text-300 hover:text-foreground'}`}
              >
                {t(`plans.billing.cycles.${cycle}`)}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 items-stretch max-w-md mx-auto lg:max-w-3xl">
          {DISPLAY_ORDER.map((planKey) => (
            <PlanCard
              key={planKey}
              planKey={planKey}
              billingCycle={billingCycle}
              onSelect={handlePlanSelect}
              pending={pendingPlan === planKey}
            />
          ))}
        </div>

        <section className="mt-14 text-center" aria-label={t('plans.grid.universal.lead')}>
          <p className="mb-6 text-[15px] text-text-600 dark:text-text-300">
            <strong className="text-foreground">{t('plans.grid.universal.lead')}</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-7">
            {UNIVERSAL_FEATURES.map(({ labelKey, Icon }) => (
              <div key={labelKey} className="grid justify-items-center gap-2.5 text-sm font-semibold text-text-600 dark:text-text-300">
                <span className="grid h-[60px] w-[60px] place-items-center rounded-[14px] border border-background-200 dark:border-background-700 bg-background-surface dark:bg-background-surface-dark shadow-sm">
                  <Icon className="h-6 w-6 text-primary-500 dark:text-primary-400" aria-hidden="true" />
                </span>
                {t(labelKey)}
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-text-400 dark:text-text-500">
          {t('plans.grid.footer')}
        </p>

        {error && (
          <ErrorModal
            title={t('error.title')}
            errorMessage={error}
            errorMessage2={t('error.profileMessage')}
            onClose={() => setError(null)}
          />
        )}
      </div>
    </div>
  );
};

export default PlanSelection;
