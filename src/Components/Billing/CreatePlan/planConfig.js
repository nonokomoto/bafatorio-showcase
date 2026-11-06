import i18next from 'i18next';
import { FiClock, FiCheckCircle, FiFolder, FiUpload } from 'react-icons/fi';
import { PLAN_KEYS } from 'src/Utils/plans';

/**
 * Display-only. O checkout (priceIds, contrato com a Lambda) vive em
 * src/Api/billingCheckout.js — este módulo não conhece Stripe.
 */

/**
 * Formata cêntimos como EUR no locale ativo (29,99 € / €29.99).
 */
export const formatEUR = (cents) =>
  new Intl.NumberFormat(i18next.language || 'pt-PT', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);

// Partilhado entre PlanCard.jsx (CTA do próprio cartão) e PostSignupPlanModal.jsx
// (rótulo do botão externo "Continuar") — texto contextual do plano em vez de
// um rótulo genérico.
export const CTA_KEYS = {
  [PLAN_KEYS.STARTER]: 'plans.grid.cta.starter',
  [PLAN_KEYS.PRO]: 'plans.grid.cta.pro',
  [PLAN_KEYS.PAY_PER_EVENT]: 'plans.grid.cta.payPerEvent',
};

// Legenda curta por plano (política de reembolso/cancelamento), mostrada como
// nota de confiança por baixo do botão de confirmação — partilhado entre
// PlanSelection.jsx e PostSignupPlanModal.jsx.
export const POLICY_NOTE_KEYS = {
  [PLAN_KEYS.STARTER]: 'plans.policy.refund.starter',
  [PLAN_KEYS.PRO]: 'plans.policy.refund.pro',
  [PLAN_KEYS.PAY_PER_EVENT]: 'plans.policy.refund.payPerEvent',
};

// Direitos comuns aos 3 planos (§2 do modelo canónico) — mostrados uma vez,
// fora dos cartões, em vez de repetidos em cada um. Partilhado entre
// PlanSelection.jsx e PostSignupPlanModal.jsx.
export const UNIVERSAL_FEATURES = [
  { labelKey: 'plans.grid.universal.agenda', Icon: FiClock },
  { labelKey: 'plans.grid.universal.confirmations', Icon: FiCheckCircle },
  { labelKey: 'plans.grid.universal.documents', Icon: FiFolder },
  { labelKey: 'plans.grid.universal.excel', Icon: FiUpload },
];
