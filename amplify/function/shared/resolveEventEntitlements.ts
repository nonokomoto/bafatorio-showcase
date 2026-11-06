/**
 * @file resolveEventEntitlements.ts
 * @description Autoridade do gate por evento (§4/§4b do modelo canónico).
 *
 * O gate é por EVENTO, não por requester: resolve-se o plano do DONO do evento
 * e aplica-se a qualquer ação nele (colaboradores herdam o nível do dono e não
 * contam para limites). Toda a mutation gated chama isto ANTES de executar,
 * no mesmo pipeline do check de role (ADR-019).
 *
 * Duas camadas:
 *  - deriveEventEntitlements — núcleo PURO sobre os registos (testável sem mocks)
 *  - resolveEventEntitlements — wrapper que carrega Event + UserSubscription do DynamoDB
 */
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import {
  isAdminPlanName,
  PLANS,
  PLAN_KEYS,
  isEventWritable,
  resolvePlanKey,
  type Entitlements,
  type PlanKey,
} from './plans';
import { fetchEventRecord, normalizeUserId } from './resolveEventAccess';

let cachedClient: DynamoDBClient | null = null;
const getDynamoClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedClient;
};

export type EntitlementReason =
  | 'ADMIN'           // dono é conta de administração (ADR-036) — Pro-equivalente, sempre writable
  | 'PRO_ACTIVE'      // subscrição a cobrir escrita (active ou past_due em dunning)
  | 'PRO_PAUSED'      // save offer: sem cobrança, sem escrita, subscrição intacta
  | 'PRO_LAPSED'      // evento criado sob Pro; subscrição caiu → read-only até reativar
  | 'WITHIN_WINDOW'   // evento coberto (PPE/Starter) dentro de min(fim+30d, criação+14m)
  | 'WINDOW_EXPIRED'; // janela fechada → read-only (consulta + PDF se o nível o tinha)

export type ResolvedEventEntitlements = {
  planKey: PlanKey;
  entitlements: Entitlements;
  writable: boolean;
  reason: EntitlementReason;
  // Registo já carregado para a decisão — os handlers leem daqui os contadores
  // desnormalizados (participantCount) para os limites, sem reads extra.
  eventRecord: EventEntitlementsRecord;
};

export type EventEntitlementsRecord = {
  planKey?: string;            // snapshot imutável escrito na criação; ausente = STARTER (§8)
  participantLimit?: number;   // teto do escalão comprado (ADR-038); ausente = o do plano
  eventDateType?: string;
  eventEndDate?: string;
  eventSpecificDates?: string[];
  createdAt?: string;          // server-set; âncora do teto de 14 meses (§4)
  owner?: string;
  [key: string]: unknown;
};

type SubscriptionRecord = {
  planName?: string;
  status?: string;
  [key: string]: unknown;
} | null | undefined;

// Escrita coberta pela subscrição: active, e past_due durante os retries da
// Stripe (§4b — corta só em unpaid/canceled). Pause é estado próprio (§1).
const PRO_WRITABLE_STATUSES = ['active', 'past_due'];

/**
 * Fim do evento para a janela de edição: range → eventEndDate;
 * specific → a última data. Sem data derivável, só o teto de 14 meses gateia.
 */
const deriveEventEndDate = (event: EventEntitlementsRecord): string | null => {
  if (event.eventDateType === 'specific') {
    const dates = (event.eventSpecificDates || []).filter(Boolean).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }
  return event.eventEndDate || null;
};

/**
 * Direitos do evento, com o teto de participantes congelado na compra a
 * sobrepor-se ao default do catálogo (ADR-038).
 *
 * Só o Por Evento congela teto. O Grátis vem sempre do catálogo, e é isso que
 * permitiu a subida de 25 para 50 valer também nos eventos grátis já criados.
 * Campo ausente = escalão sem teto ou compra anterior aos escalões: em ambos os
 * casos vale o `Infinity` do plano, que foi o que essas compras deram.
 */
const entitlementsForEvent = (
  planKey: PlanKey,
  event: EventEntitlementsRecord
): Entitlements => {
  const catalog = PLANS[planKey].entitlements;
  if (planKey !== PLAN_KEYS.PAY_PER_EVENT || !Number.isFinite(event.participantLimit)) {
    return catalog;
  }
  return { ...catalog, participants: event.participantLimit as number };
};

const windowResult = (
  planKey: PlanKey,
  event: EventEntitlementsRecord,
  now: Date
): ResolvedEventEntitlements => {
  const endDate = deriveEventEndDate(event);
  // Sem fim derivável, a âncora da janela passa a ser a própria criação +14m
  // (o teto §4) — generoso para o uso legítimo, fechado para reciclagem.
  const writable = isEventWritable({
    planKey,
    eventEndDate: endDate ?? '9999-12-31',
    eventCreatedAt: event.createdAt ?? '1970-01-01',
    now,
  });
  return {
    planKey,
    entitlements: entitlementsForEvent(planKey, event),
    writable,
    reason: writable ? 'WITHIN_WINDOW' : 'WINDOW_EXPIRED',
    eventRecord: event,
  };
};

export const deriveEventEntitlements = ({
  eventRecord,
  ownerSubscription,
  now,
}: {
  eventRecord: EventEntitlementsRecord;
  ownerSubscription: SubscriptionRecord;
  now: Date;
}): ResolvedEventEntitlements => {
  // ADMIN primeiro (ADR-036): sem check de status (não há ciclo Stripe) e
  // antes do snapshot do evento — todos os eventos do admin são writable.
  if (isAdminPlanName(ownerSubscription?.planName)) {
    return {
      planKey: PLAN_KEYS.PRO,
      entitlements: PLANS.PRO.entitlements,
      writable: true,
      reason: 'ADMIN',
      eventRecord,
    };
  }

  const subPlanKey = resolvePlanKey(ownerSubscription?.planName);
  const status = ownerSubscription?.status ?? '';

  if (subPlanKey === PLAN_KEYS.PRO) {
    if (PRO_WRITABLE_STATUSES.includes(status)) {
      return {
        planKey: PLAN_KEYS.PRO,
        entitlements: PLANS.PRO.entitlements,
        writable: true,
        reason: 'PRO_ACTIVE',
        eventRecord,
      };
    }
    if (status === 'paused') {
      return {
        planKey: PLAN_KEYS.PRO,
        entitlements: PLANS.PRO.entitlements,
        writable: false,
        reason: 'PRO_PAUSED',
        eventRecord,
      };
    }
  }

  // Subscrição não cobre escrita — o gate passa para o nível do EVENTO
  // (snapshot na criação; ausente/legado normaliza para STARTER, §8).
  const eventPlanKey = resolvePlanKey(eventRecord.planKey) ?? PLAN_KEYS.STARTER;

  if (eventPlanKey === PLAN_KEYS.PRO) {
    // Criado sob Pro que entretanto caiu: read-only com o nível que tinha
    // (PDF mantém-se — read-only sem relatório seria uma rasteira, §4).
    return {
      planKey: PLAN_KEYS.PRO,
      entitlements: PLANS.PRO.entitlements,
      writable: false,
      reason: 'PRO_LAPSED',
      eventRecord,
    };
  }

  return windowResult(eventPlanKey, eventRecord, now);
};

/**
 * Wrapper com I/O: carrega o Event e a UserSubscription do dono e delega no núcleo.
 * `now` é injetável para testabilidade; default = agora.
 * `eventRecord` opcional: handlers que já carregaram o Event COMPLETO (via
 * resolveEventAccess/fetch próprio) passam-no e poupam o segundo GetItem —
 * nunca passar registos projetados (o gate precisa de planKey/datas/contadores).
 */
export async function resolveEventEntitlements({
  eventTableName,
  subscriptionTableName,
  eventId,
  eventRecord: preloadedEventRecord,
  now = new Date(),
}: {
  eventTableName: string;
  subscriptionTableName: string;
  eventId: string;
  eventRecord?: EventEntitlementsRecord;
  now?: Date;
}): Promise<ResolvedEventEntitlements> {
  const eventRecord =
    preloadedEventRecord ??
    ((await fetchEventRecord(eventTableName, eventId)) as EventEntitlementsRecord);
  const ownerId = normalizeUserId((eventRecord.owner as string) || '');

  const subscriptionResult = await getDynamoClient().send(
    new GetItemCommand({
      TableName: subscriptionTableName,
      Key: marshall({ id: ownerId }),
    })
  );

  const ownerSubscription = subscriptionResult.Item
    ? (unmarshall(subscriptionResult.Item) as SubscriptionRecord)
    : null;

  return deriveEventEntitlements({ eventRecord, ownerSubscription, now });
}
