/**
 * @file plans.ts
 * @description Espelho BACKEND da fonte única de planos
 * (docs/plans/2026-07-11-billing-subscription-model.md §2–§4).
 *
 * O original é `src/Utils/plans.js` (frontend). Qualquer alteração tem de ser
 * feita NOS DOIS ficheiros — `plans.sync.test.ts` falha se divergirem.
 * As Lambdas gateiam por este módulo; nunca por valores hardcoded.
 *
 * Módulo puro: sem env, sem AWS SDK, sem side-effects.
 */
// fallow-ignore-file duplicate-export
//   O espelho é a decisão, não um descuido: o shared/ das Lambdas não importa de
//   src/, e a paridade é imposta por plans.sync.test.ts. Cada símbolo novo
//   aparece nos dois lados de propósito.

export const PLAN_KEYS = {
  STARTER: 'STARTER',
  PAY_PER_EVENT: 'PAY_PER_EVENT',
  PRO: 'PRO',
} as const;

// Bypass de administração (ADR-036): valor de UserSubscription.planName que os
// núcleos de decisão tratam como Pro-equivalente e sempre writable. NÃO é um
// plano vendável — nunca entra em PLANS nem no resolvePlanKey; o
// reconhecimento é sempre um check explícito contra esta constante.
export const ADMIN_PLAN_NAME = 'ADMIN';

/** Fonte única do reconhecimento ADMIN — gates, webhook e UI usam isto. */
export const isAdminPlanName = (planName: string | null | undefined): boolean =>
  planName === ADMIN_PLAN_NAME;

export type PlanKey = keyof typeof PLAN_KEYS;

export interface Entitlements {
  events: number;
  participants: number;
  suppliers: number;
  documents: number;
  folders: number;
  report: boolean;
  integrations: boolean;
}

// Preços em cêntimos, IVA incluído (§8 — Stripe Tax, tax_behavior: 'inclusive').
// Espelho de src/Utils/plans.js — ver o cabeçalho do ficheiro.
// fallow-ignore-next-line code-duplication
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
} as const;

/**
 * Lookup guardado de um direito. Devolve o valor do direito ou `null` para
 * plano/direito desconhecido — fail closed.
 */
export const getEntitlement = (planKey: string, entitlementKey: string): number | boolean | null => {
  const plan = (PLANS as Record<string, { entitlements: Entitlements }>)[planKey];
  const value = plan?.entitlements?.[entitlementKey as keyof Entitlements];
  return value === undefined ? null : value;
};

/**
 * Normaliza um valor guardado na DB para uma chave canónica de plano.
 * Nomes legados ('Plano Organizador', 'Plano Flex') devolvem `null` — sem
 * clientes pagantes no modelo antigo (§8), o gate fecha para eles.
 */
export const resolvePlanKey = (storedValue: string | null | undefined): PlanKey | null =>
  storedValue != null && Object.prototype.hasOwnProperty.call(PLANS, storedValue)
    ? (storedValue as PlanKey)
    : null;

export interface PayPerEventTier {
  key: string;
  maxParticipants: number;
  amount: number;
  currency: string;
}

/** Escalões do Por Evento, do mais barato ao mais caro. Quem os quer em bruto lê
 *  `PLANS.PAY_PER_EVENT.tiers`; isto serve os lookups abaixo. */
const getPayPerEventTiers = (): readonly PayPerEventTier[] =>
  PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers;

/**
 * Escalão mais barato que cobre `count` participantes. Nunca devolve undefined:
 * o último escalão não tem teto, portanto qualquer contagem encontra casa.
 */
export const resolveTierForCount = (count: number): PayPerEventTier => {
  const n = Number(count) || 0;
  return getPayPerEventTiers().find((tier) => n <= tier.maxParticipants)!;
};

/** Lookup por chave. Chave desconhecida devolve `null` — fail closed. */
export const getTierByKey = (tierKey: string | null | undefined): PayPerEventTier | null =>
  getPayPerEventTiers().find((tier) => tier.key === tierKey) ?? null;

/**
 * Escalão a que corresponde o teto gravado no evento. Ausente é o escalão SEM
 * teto — é essa equivalência que dispensa a sentinela. Um teto que não bate com
 * escalão nenhum devolve `null` (fail closed): não se infere o escalão errado.
 */
export const getTierByLimit = (participantLimit: number | null | undefined): PayPerEventTier | null =>
  // Espelho de src/Utils/plans.js — ver o cabeçalho do ficheiro.
  // fallow-ignore-next-line code-duplication
  participantLimit == null
    ? getPayPerEventTiers().find((tier) => !Number.isFinite(tier.maxParticipants)) ?? null
    : getPayPerEventTiers().find((tier) => tier.maxParticipants === participantLimit) ?? null;

/**
 * Diferença a cobrar num upgrade de escalão (ADR-034: compra nova, só a
 * diferença). Devolve `null` se algum escalão for desconhecido ou se o destino
 * não for mais caro que a origem — não existe downgrade de escalão.
 */
export const getTierUpgradeAmount = (
  fromTierKey: string | null | undefined,
  toTierKey: string | null | undefined
): number | null => {
  // Espelho de src/Utils/plans.js — ver o cabeçalho do ficheiro.
  // fallow-ignore-next-line code-duplication
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
} as const;

/**
 * Valor em cêntimos após o cupão de lançamento (floor — 14,99 e não 15,00).
 */
export const getDiscountedAmount = (planKey: string, amount: number): number =>
  (LAUNCH_DISCOUNT.appliesTo as readonly string[]).includes(planKey)
    ? Math.floor(amount * (1 - LAUNCH_DISCOUNT.percentOff / 100))
    : amount;

// Janela de edição pós-evento (§4): min(fim do evento + 30 dias, criação + 14 meses)
export const EDIT_WINDOW = {
  postEventDays: 30,
  maxMonthsFromCreation: 14,
} as const;

export interface EventWritableParams {
  planKey: string;
  subscriptionActive?: boolean;
  eventEndDate: string | Date;
  eventCreatedAt: string | Date;
  now: Date;
}

/**
 * Regra universal de escrita (§4) — no backend esta É a autoridade do gate (§4b).
 *
 *   escrita = Pro ativo
 *          OU (evento coberto E hoje ≤ min(fimDoEvento + 30d, criação + 14 meses))
 */
export const isEventWritable = ({ planKey, subscriptionActive, eventEndDate, eventCreatedAt, now }: EventWritableParams): boolean => {
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
