import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import { PLANS, PLAN_KEYS } from 'src/Utils/plans';
import { startCheckout } from '../../../Api/billingCheckout';
import Modal from '../../UI/Modal';
import ErrorModal from '../../Layout/hook/ErrorModal';
import { Button } from '../../UI';
import PlanCard from './PlanCard';
import { CTA_KEYS, POLICY_NOTE_KEYS, UNIVERSAL_FEATURES } from './planConfig';

// Grátis primeiro (pré-selecionado), depois Pro, e Por evento por último.
const DISPLAY_ORDER = [PLAN_KEYS.STARTER, PLAN_KEYS.PRO, PLAN_KEYS.PAY_PER_EVENT];

const CHEAPEST_TIER_KEY = PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers[0].key;

const STEP_WELCOME = 0;
const STEP_PLANS = 1;

/**
 * Modal obrigatório de escolha de plano: sem botão de fechar, sem ESC, sem
 * clicar fora — só sai depois de confirmar (Grátis) ou ao abandonar o
 * browser para a Stripe (planos pagos). Grátis vem pré-selecionado; os
 * cartões funcionam como opções tipo rádio e um único botão "Continuar"
 * confirma o que estiver selecionado no momento.
 *
 * Duas telas para caber sem scroll: a primeira só com o contexto
 * (boas-vindas + o que todos os planos incluem), a segunda só com a escolha
 * em si (toggle de ciclo + cartões). Só a tela ativa é montada — cada uma
 * tem a sua própria altura em vez de ficarem presas à mais alta das duas.
 */
const PostSignupPlanModal = ({ isOpen, onDecided }) => {
  const { t } = useTranslation(['billing', 'common']);

  const [step, setStep] = useState(STEP_WELCOME);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(PLAN_KEYS.STARTER);
  const [selectedTier, setSelectedTier] = useState(CHEAPEST_TIER_KEY);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const user = useSelector((state) => state.user.user);
  const userEmail = user?.email;
  const firstName = user?.name?.trim().split(' ')[0];

  const handleCardSelect = useCallback((planKey, tierKey) => {
    setSelectedPlan(planKey);
    if (tierKey) setSelectedTier(tierKey);
  }, []);

  const handleContinue = useCallback(async () => {
    setConfirming(true);
    try {
      // Nada a gravar: o gate de conta já trata qualquer conta sem subscrição
      // como Starter (resolveAccountEntitlements cai nesse default), por isso
      // escrever a linha não mudava um único direito. Quem sabe que a decisão
      // foi tomada é o marcador de sessão que o onDecided limpa.
      if (selectedPlan === PLAN_KEYS.STARTER) {
        onDecided();
        return;
      }

      const sessionUrl = await startCheckout({
        planKey: selectedPlan,
        billingCycle,
        tierKey: selectedPlan === PLAN_KEYS.PAY_PER_EVENT ? selectedTier : undefined,
        customerEmail: userEmail,
        successUrl: `${window.location.origin}/app/events`,
        // Cancelar no Stripe volta para o signup — o modal reabre (Layout.jsx)
        // e o utilizador pode tentar outro plano, nunca cai fora da escolha.
        cancelUrl: `${window.location.origin}/signup`,
      });
      window.location.href = sessionUrl;
    } catch (err) {
      console.error('PostSignupPlanModal/handleContinue', err);
      setError(err.message || t('error.payment'));
      setConfirming(false);
    }
  }, [selectedPlan, selectedTier, billingCycle, userEmail, onDecided, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      size="6xl"
      fullWidth
      centered
      animation="scale"
      disableEscapeKeyDown
      disableBackdropClick
      showCloseButton={false}
    >
      <div className="bg-background dark:bg-black max-h-[92vh] overflow-y-auto">
        {step === STEP_WELCOME && (
          /* Slide 1 — contexto: boas-vindas, no mesmo molde do email de
             boas-vindas (saudação + conta criada + próximo passo). Sem
             cartão a envolver o texto — é só a informação, com mais
             destaque tipográfico já que ocupa o slide sozinha. */
          <div key="welcome" className="animate-fade-in px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">
              {firstName ? t('plans.welcome.greeting', { name: firstName }) : t('plans.welcome.greetingFallback')}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-text-600 dark:text-text-300 max-w-lg mx-auto">
              {t('plans.welcome.intro')}
            </p>
            <p className="mt-2 text-base sm:text-lg text-text-600 dark:text-text-300 max-w-lg mx-auto">
              {t('plans.welcome.next')}
            </p>

            <div className="mt-12">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-400 dark:text-text-500">
                {t('plans.grid.universal.lead')}
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {UNIVERSAL_FEATURES.map(({ labelKey, Icon }) => (
                  <span
                    key={labelKey}
                    className="inline-flex items-center gap-2 rounded-full border border-background-200 dark:border-background-700 bg-background-surface dark:bg-background-surface-dark px-4 py-2 text-sm font-medium text-text-600 dark:text-text-300"
                  >
                    <Icon className="h-4 w-4 text-primary-500 dark:text-primary-400" aria-hidden="true" />
                    {t(labelKey)}
                  </span>
                ))}
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full max-w-xs mx-auto block"
                onClick={() => setStep(STEP_PLANS)}
              >
                {t('actions.next', { ns: 'common' })}
              </Button>
            </div>
          </div>
        )}

        {step === STEP_PLANS && (
          /* Slide 2 — escolha: toggle de ciclo + cartões dos planos */
          <div key="plans" className="animate-fade-in px-4 sm:px-6 lg:px-8 pt-6 pb-6 sm:pt-7 sm:pb-7">
            <button
              type="button"
              onClick={() => setStep(STEP_WELCOME)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-600 dark:text-text-300 hover:text-foreground transition-colors"
            >
              <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('actions.back', { ns: 'common' })}
            </button>

            <header className="text-center mt-2 mb-4 flex flex-col items-center gap-3">
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground">
                {t('plans.grid.title')}
              </h2>

              <div
                className="inline-flex items-center gap-1 rounded-full border border-background-200 dark:border-background-700 bg-background-surface dark:bg-background-surface-dark p-1"
                role="group"
                aria-label={t('fields.billingCycle.label')}
              >
                {['monthly', 'annual'].map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    aria-pressed={billingCycle === cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors
                      ${billingCycle === cycle
                        ? 'bg-primary-500 text-white'
                        : 'text-text-600 dark:text-text-300 hover:text-foreground'}`}
                  >
                    {t(`plans.billing.cycles.${cycle}`)}
                  </button>
                ))}
              </div>
            </header>

            <div
              role="radiogroup"
              aria-label={t('plans.grid.title')}
              className="grid gap-4 lg:grid-cols-3 items-stretch max-w-md mx-auto lg:max-w-5xl"
            >
              {DISPLAY_ORDER.map((planKey) => (
                <PlanCard
                  key={planKey}
                  planKey={planKey}
                  billingCycle={billingCycle}
                  onSelect={handleCardSelect}
                  selectable
                  selected={selectedPlan === planKey}
                  compact
                />
              ))}
            </div>

            <div className="mt-5 max-w-xs mx-auto flex flex-col items-center gap-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={confirming}
              >
                {confirming ? t('loading.processing') : t(CTA_KEYS[selectedPlan])}
              </Button>
              <p className="text-xs text-center text-text-400 dark:text-text-500">
                {t(POLICY_NOTE_KEYS[selectedPlan])}
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-text-400 dark:text-text-500">
              {t('plans.grid.footer')}
            </p>
          </div>
        )}
      </div>

      {error && (
        <ErrorModal
          title={t('error.title')}
          errorMessage={error}
          errorMessage2={t('error.profileMessage')}
          onClose={() => setError(null)}
        />
      )}
    </Modal>
  );
};

PostSignupPlanModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onDecided: PropTypes.func.isRequired,
};

export default PostSignupPlanModal;
