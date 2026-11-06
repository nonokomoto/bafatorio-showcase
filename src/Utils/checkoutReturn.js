/**
 * @file checkoutReturn.js
 * @description Fonte única do marcador de regresso da Stripe: escrita
 * (withCheckoutMarker, chamado pelo startCheckout), leitura
 * (readCheckoutReturn, chamado pelo Layout via useCheckoutReturn) e a lista
 * de params a limpar vivem juntas — um param novo entra num sítio só.
 *
 * O marcador é um SINAL DE UI, não prova de pagamento: a query string é
 * forjável por qualquer utilizador e nada aqui concede direitos — a
 * autoridade é o webhook da Stripe. O que o torna útil é o cancelUrl nunca
 * o transportar: no fluxo real só se aterra nele vindo de um pagamento,
 * por isso serve para fechar o onboarding e mostrar o ecrã de sucesso.
 * Campos inválidos normalizam para null em vez de descartar o regresso —
 * a UI degrada para a mensagem genérica, nunca para o silêncio.
 */
import { getTierByKey, isPaidPlanKey, resolvePlanKey } from './plans';

const BILLING_CYCLES = ['monthly', 'annual'];

/** Params que o marcador escreve — e que a limpeza pós-consumo apaga. */
export const CHECKOUT_MARKER_PARAMS = ['checkout', 'plan', 'tier', 'cycle', 'intent'];

/**
 * Marca o successUrl para o regresso da Stripe ser detetável.
 * @param {string} successUrl
 * @param {Object} marker
 * @param {string} marker.planKey
 * @param {string} [marker.tierKey]
 * @param {string} [marker.billingCycle]
 * @param {string} [marker.intent] - TIER_UPGRADE suprime o ecrã "cria o teu evento"
 * @returns {string}
 */
export const withCheckoutMarker = (successUrl, { planKey, tierKey, billingCycle, intent }) => {
  try {
    const url = new URL(successUrl);
    url.searchParams.set('checkout', 'success');
    url.searchParams.set('plan', planKey);
    if (tierKey) url.searchParams.set('tier', tierKey);
    if (billingCycle) url.searchParams.set('cycle', billingCycle);
    if (intent) url.searchParams.set('intent', intent);
    return url.toString();
  } catch {
    return successUrl;
  }
};

/**
 * @param {URLSearchParams} searchParams
 * @returns {{planKey: string|null, tierKey: string|null, billingCycle: string|null, isTierUpgrade: boolean}|null}
 *   null quando não há regresso de checkout nesta navegação. `isTierUpgrade`
 *   distingue a subida de escalão de um evento existente (ADR-034) — aí o
 *   ecrã "cria o teu evento" não faz sentido.
 */
export const readCheckoutReturn = (searchParams) => {
  if (searchParams.get('checkout') !== 'success') return null;

  const plan = resolvePlanKey(searchParams.get('plan'));
  const planKey = plan && isPaidPlanKey(plan) ? plan : null;

  const tier = searchParams.get('tier');
  const tierKey = tier && getTierByKey(tier) ? tier : null;

  const cycle = searchParams.get('cycle');
  const billingCycle = BILLING_CYCLES.includes(cycle) ? cycle : null;

  return {
    planKey,
    tierKey,
    billingCycle,
    isTierUpgrade: searchParams.get('intent') === 'TIER_UPGRADE',
  };
};
