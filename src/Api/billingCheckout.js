/**
 * @file billingCheckout.js
 * @description Contrato de checkout por intenção: a UI envia planKey + billingCycle
 * e a Lambda resolve o preço e aplica o cupão LAUNCH_50 no servidor.
 * O frontend não conhece price IDs — quem cobra decide o preço.
 * Os dados de faturação são recolhidos na página da Stripe, não aqui.
 */
import { createCheckoutSession } from '../../Graphql/mutations';
import { getClient } from './amplifyClient.js';
import { track } from '../Utils/analytics';
import { withCheckoutMarker } from '../Utils/checkoutReturn';

/**
 * Inicia o checkout Stripe para um plano pago.
 *
 * @param {Object} params
 * @param {string} params.planKey - PLAN_KEYS.PRO | PLAN_KEYS.PAY_PER_EVENT
 * @param {'monthly'|'annual'} [params.billingCycle] - só relevante para o Pro
 * @param {string} [params.tierKey] - escalão do Por Evento (ADR-038)
 * @param {'TIER_UPGRADE'} [params.intent] - subir o escalão de um evento já comprado
 * @param {string} [params.eventId] - evento a subir (só com intent TIER_UPGRADE)
 * @param {string} params.customerEmail
 * @param {string} params.successUrl
 * @param {string} params.cancelUrl
 * @returns {Promise<string>} URL da sessão de checkout Stripe
 * @throws {Error} com a mensagem da Lambda ou do transporte
 */
export const startCheckout = async ({
  planKey,
  billingCycle,
  tierKey,
  intent,
  eventId,
  customerEmail,
  successUrl,
  cancelUrl,
}) => {
  track('checkout_started', { plan: planKey });

  const response = await getClient().graphql({
    query: createCheckoutSession,
    variables: {
      planKey,
      billingCycle,
      tierKey,
      intent,
      eventId,
      customerEmail,
      // O marcador faz o Layout detetar o regresso: fecha o onboarding,
      // mostra o ecrã de sucesso e regista `checkout_completed` — cobre
      // todos os callers (PlanSelection, PostSignupPlanModal, TierUpgradeModal).
      successUrl: withCheckoutMarker(successUrl, { planKey, tierKey, billingCycle, intent }),
      cancelUrl,
    },
  });

  const result = response.data.createCheckoutSession;
  if (!result.success) {
    throw new Error(result.message || 'Checkout falhou.');
  }
  return result.sessionUrl;
};
