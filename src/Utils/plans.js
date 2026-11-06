/**
 * @file plans.js
 * @description FONTE ÚNICA DE VERDADE dos planos (docs/plans/2026-07-11-billing-subscription-model.md §2–§4).
 * planConfig (display) e backend derivam daqui — onde divergirem, este ficheiro ganha.
 * O gate por plano deriva daqui: Lambdas (shared/plans.ts, autoridade) e useAuthz (UI).
 *
 * Módulo puro: sem env, sem i18n, sem side-effects. Os price IDs Stripe vivem
 * no servidor (Lambda createCheckoutSession) — o frontend não conhece preços da Stripe.
 */

export const PLAN_KEYS = {
  STARTER: 'STARTER',
  PAY_PER_EVENT: 'PAY_PER_EVENT',
  PRO: 'PRO',
};

// Bypass de administração (ADR-036): valor de UserSubscription.planName que os
// núcleos de decisão tratam como Pro-equivalente e sempre writable. NÃO é um
// plano vendável — nunca entra em PLANS nem no resolvePlanKey; o
// reconhecimento é sempre um check explícito contra esta constante.
export const ADMIN_PLAN_NAME = 'ADMIN';

/** Fonte única do reconhecimento ADMIN — gates, webhook e UI usam isto. */
export const isAdminPlanName = (planName) => planName === ADMIN_PLAN_NAME;

// Preços em cêntimos, IVA incluído (§8 — Stripe Tax, tax_behavior: 'inclusive').
export const PLANS = {
  [PLAN_KEYS.STARTER]: {
    key: PLAN_KEYS.STARTER,
    type: 'free',
    // Documentos e pastas saem do gate: a organização do evento é a porta de
    // entrada, não o que se vende. O que separa do pago é relatório/integrações.
    entitlements: { events: 1, participants: 50, suppliers: 10, documents: Infinity, folders: Infinity, report: false, integrations: false },
  },
  [PLAN_KEYS.PAY_PER_EVENT]: {
    key: PLAN_KEYS.PAY_PER_EVENT,
    type: 'one_time',
    // Escalões por dimensão (ADR-038). Ordenados do mais barato ao mais caro:
    // resolveTierForCount devolve o primeiro que cobre, portanto a ordem é
    // contrato, não estilo. O escalão é atributo da compra, não um plano.
    tiers: [
      { key: 'PPE_100', maxParticipants: 100, amount: 999, currency: 'eur' },
      { key: 'PPE_200', maxParticipants: 200, amount: 1999, currency: 'eur' },
      { key: 'PPE_UNLIMITED', maxParticipants: Infinity, amount: 3499, currency: 'eur' },
    ],
    // `participants` aqui é o default do catálogo. A autoridade por evento é o
    // limite numérico gravado no Event na compra (ADR-038); eventos vendidos
    // antes disso não o têm e resolvem para ilimitado, que foi o que compraram.
    entitlements: { events: 1, participants: Infinity, suppliers: Infinity, documents: Infinity, folders: Infinity, report: true, integrations: true },
  },
  [PLAN_KEYS.PRO]: {
    key: PLAN_KEYS.PRO,
    type: 'subscription',
    // Anual = 12×mensal, sem desconto anual estrutural — o cupão de lançamento É o desconto.
    prices: {
      monthly: { amount: 2999, currency: 'eur' },
      annual: { amount: 35988, currency: 'eur' },
    },
    entitlements: { events: Infinity, participants: Infinity, suppliers: Infinity, documents: Infinity, folders: Infinity, report: true, integrations: true },
  },
};

/**
 * Lookup guardado de um direito. Devolve o valor do direito ou `null` para
 * plano/direito desconhecido — fail closed.
 */
export const getEntitlement = (planKey, entitlementKey) => {
  const value = PLANS[planKey]?.entitlements?.[entitlementKey];
  return value === undefined ? null : value;
};

/**
 * Normaliza um valor guardado na DB para uma chave canónica de plano.
 * Nomes legados ('Plano Organizador', 'Plano Flex') devolvem `null` — sem
 * clientes pagantes no modelo antigo (§8), o gate fecha para eles.
 */
export const resolvePlanKey = (storedValue) =>
  Object.prototype.hasOwnProperty.call(PLANS, storedValue) ? storedValue : null;

/**
 * Distingue "tem um plano pago" de "tem uma linha na UserSubscription". Desde
 * que o modal pós-signup passou a gravar a escolha do grátis, ter `planKey`
 * deixou de significar ser cliente: a UI que mostrava badge de plano, portal de
 * faturação ou escondia o CTA de subscrever tem de perguntar isto, não a mera
 * existência do registo. O gate de acesso é outra coisa e vive no backend.
 */
export const isPaidPlanKey = (planKey) => {
  const type = PLANS[planKey]?.type;
  return Boolean(type) && type !== 'free';
};

/** Escalões do Por Evento, do mais barato ao mais caro. Quem os quer em bruto lê
 *  `PLANS.PAY_PER_EVENT.tiers`; isto serve os lookups abaixo. */
const getPayPerEventTiers = () => PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers;

/**
 * Escalão mais barato que cobre `count` participantes. Nunca devolve null: o
 * último escalão não tem teto, portanto qualquer contagem encontra casa.
 */
export const resolveTierForCount = (count) => {
  const n = Number(count) || 0;
  return getPayPerEventTiers().find((tier) => n <= tier.maxParticipants);
};

/** Lookup por chave. Chave desconhecida devolve `null` — fail closed. */
export const getTierByKey = (tierKey) =>
  getPayPerEventTiers().find((tier) => tier.key === tierKey) ?? null;

/**
 * Escalão a que corresponde o teto gravado no evento. Ausente é o escalão SEM
 * teto — é essa equivalência que dispensa a sentinela. Um teto que não bate com
 * escalão nenhum devolve `null` (fail closed): não se infere o escalão errado.
 */
export const getTierByLimit = (participantLimit) =>
  participantLimit == null
    ? getPayPerEventTiers().find((tier) => !Number.isFinite(tier.maxParticipants)) ?? null
    : getPayPerEventTiers().find((tier) => tier.maxParticipants === participantLimit) ?? null;

/**
 * Diferença a cobrar num upgrade de escalão (ADR-034: compra nova, só a
 * diferença). Devolve `null` se algum escalão for desconhecido ou se o destino
 * não for mais caro que a origem — não existe downgrade de escalão.
 */
export const getTierUpgradeAmount = (fromTierKey, toTierKey) => {
  const from = getTierByKey(fromTierKey);
  const to = getTierByKey(toTierKey);
  if (!from || !to || to.amount <= from.amount) return null;
  return to.amount - from.amount;
};

// Cupão de lançamento — 50% só no Pro (ADR-038). Saiu do Por Evento: com o
// escalão de entrada a 9,99 € punha a venda a 4,99 €, e num pagamento único o
// desconto não compra retenção nenhuma, ao contrário do Pro, onde é vitalício.
export const LAUNCH_DISCOUNT = {
  percentOff: 50,
  couponId: 'LAUNCH_50',
  appliesTo: [PLAN_KEYS.PRO],
};

/**
 * Valor em cêntimos após o cupão de lançamento (floor — 14,99 e não 15,00).
 * Só display: quem cobra é a Stripe com o cupão na sessão de checkout.
 */
export const getDiscountedAmount = (planKey, amount) =>
  LAUNCH_DISCOUNT.appliesTo.includes(planKey)
    ? Math.floor(amount * (1 - LAUNCH_DISCOUNT.percentOff / 100))
    : amount;

// Janela de edição pós-evento (§4): min(fim do evento + 30 dias, criação + 14 meses)
export const EDIT_WINDOW = {
  postEventDays: 30,
  maxMonthsFromCreation: 14,
};

/**
 * Regra universal de escrita (§4) — versão COSMÉTICA para a UI; a autoridade
 * do gate é a Lambda (§4b).
 *
 *   escrita = Pro ativo
 *          OU (evento coberto E hoje ≤ min(fimDoEvento + 30d, criação + 14 meses))
 *
 * @param {Object} params
 * @param {string} params.planKey - Plano que cobre o evento (chave canónica)
 * @param {boolean} [params.subscriptionActive] - Estado da subscrição Pro
 * @param {string|Date} params.eventEndDate - Fim do evento
 * @param {string|Date} params.eventCreatedAt - Criação do evento (imutável)
 * @param {Date} params.now - Instante da avaliação (injetado para testabilidade)
 * @returns {boolean}
 */
export const isEventWritable = ({ planKey, subscriptionActive, eventEndDate, eventCreatedAt, now }) => {
  if (planKey === PLAN_KEYS.PRO) {
    return subscriptionActive === true;
  }
  if (planKey !== PLAN_KEYS.PAY_PER_EVENT && planKey !== PLAN_KEYS.STARTER) {
    return false;
  }

  // Âncora na data serve o uso legítimo; o teto trava a reciclagem — a data do
  // evento é editável pelo cliente, a data de criação não (§4).
  const windowEnd = new Date(eventEndDate);
  windowEnd.setDate(windowEnd.getDate() + EDIT_WINDOW.postEventDays);

  const hardCap = new Date(eventCreatedAt);
  hardCap.setMonth(hardCap.getMonth() + EDIT_WINDOW.maxMonthsFromCreation);

  return now <= windowEnd && now <= hardCap;
};
