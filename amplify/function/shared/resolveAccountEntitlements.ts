/**
 * @file resolveAccountEntitlements.ts
 * @description Gate de CONTA — "podes criar um evento?" (§3/§4 do modelo canónico).
 *
 * Complementa resolveEventEntitlements (gate por evento). Núcleo puro sobre o
 * estado da conta; o wrapper com I/O entra quando o schema tiver o modelo
 * PlanPurchase (rewrite do backend) — os inputs ficam desde já contratados:
 *
 *  - subscription: registo UserSubscription do utilizador (planName canónico,
 *    status Stripe + convenção 'paused' para pause_collection)
 *  - ownedEventCount: nº de eventos de que o utilizador é dono
 *  - unconsumedPurchaseCount: compras Pay-per-event ainda não consumidas
 *
 * Precedência: Pro a cobrir escrita → compra por consumir (coberturas
 * independentes; a compra não expira, §4) → pause bloqueia → contagem Starter.
 */
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { isAdminPlanName, PLANS, PLAN_KEYS, resolvePlanKey, type PlanKey } from './plans';

export type AccountEntitlementReason =
  | 'ADMIN'                 // conta de administração (ADR-036) — Pro-equivalente, sem ciclo Stripe
  | 'PRO_ACTIVE'            // subscrição cobre escrita (active ou past_due em dunning)
  | 'PURCHASE_AVAILABLE'    // compra Pay-per-event por consumir
  | 'PRO_PAUSED'            // save offer: sem escrita até retomar
  | 'WITHIN_STARTER_LIMIT'  // Starter com margem (< 1 evento)
  | 'STARTER_LIMIT_REACHED';// Starter esgotado → upsell

export type ResolvedAccountEntitlements = {
  planKey: PlanKey;
  canCreateEvent: boolean;
  reason: AccountEntitlementReason;
};

type SubscriptionRecord = {
  planName?: string;
  status?: string;
  [key: string]: unknown;
} | null | undefined;

// Mesma semântica do gate por evento (§4b): past_due mantém acesso no dunning.
const PRO_WRITABLE_STATUSES = ['active', 'past_due'];

export const deriveAccountEntitlements = ({
  subscription,
  ownedEventCount,
  unconsumedPurchaseCount,
}: {
  subscription: SubscriptionRecord;
  ownedEventCount: number;
  unconsumedPurchaseCount: number;
}): ResolvedAccountEntitlements => {
  // ADMIN primeiro na precedência (ADR-036): antes das compras, senão um admin
  // com PlanPurchase pendente consumi-la-ia (o create-event consome quando o
  // reason é PURCHASE_AVAILABLE). Sem check de status — não há ciclo Stripe.
  if (isAdminPlanName(subscription?.planName)) {
    return { planKey: PLAN_KEYS.PRO, canCreateEvent: true, reason: 'ADMIN' };
  }

  const subPlanKey = resolvePlanKey(subscription?.planName);
  const status = subscription?.status ?? '';
  const isPro = subPlanKey === PLAN_KEYS.PRO;

  if (isPro && PRO_WRITABLE_STATUSES.includes(status)) {
    return { planKey: PLAN_KEYS.PRO, canCreateEvent: true, reason: 'PRO_ACTIVE' };
  }

  if (unconsumedPurchaseCount > 0) {
    return { planKey: PLAN_KEYS.PAY_PER_EVENT, canCreateEvent: true, reason: 'PURCHASE_AVAILABLE' };
  }

  if (isPro && status === 'paused') {
    return { planKey: PLAN_KEYS.PRO, canCreateEvent: false, reason: 'PRO_PAUSED' };
  }

  // Default de qualquer conta (§8): nível Starter, gate por contagem.
  const withinLimit = ownedEventCount < PLANS.STARTER.entitlements.events;
  return {
    planKey: PLAN_KEYS.STARTER,
    canCreateEvent: withinLimit,
    reason: withinLimit ? 'WITHIN_STARTER_LIMIT' : 'STARTER_LIMIT_REACHED',
  };
};

// Lazy singleton — mesma razão do resolveEventAccess: shared/ tem o seu próprio
// node_modules, nunca aceitar o client como parâmetro (incompatibilidade de tipos).
let cachedClient: DynamoDBClient | null = null;
const getDynamoClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedClient;
};

export type ResolvedAccountEntitlementsIO = ResolvedAccountEntitlements & {
  firstUnconsumedPurchaseId: string | null;
  // Escalão da MESMA compra que vai ser consumida — é ele que fixa o teto do
  // evento (ADR-038). Null nas compras anteriores aos escalões: sem teto.
  firstUnconsumedPurchaseTierKey: string | null;
};

/**
 * Wrapper com I/O sobre o núcleo puro — a única fonte das 3 leituras do gate
 * de conta (create-event e getAccountAccess consomem daqui; duplicá-las era
 * o caminho para decisões divergentes entre Lambdas).
 */
export const resolveAccountEntitlements = async ({
  userId,
  eventTableName,
  subscriptionTableName,
  planPurchaseTableName,
}: {
  userId: string;
  eventTableName: string;
  subscriptionTableName: string;
  planPurchaseTableName: string;
}): Promise<ResolvedAccountEntitlementsIO> => {
  const client = getDynamoClient();

  const subscriptionResult = await client.send(new GetItemCommand({
    TableName: subscriptionTableName,
    Key: marshall({ id: userId }),
  }));
  const subscription = subscriptionResult.Item ? unmarshall(subscriptionResult.Item) : null;

  // Curto-circuito Pro/ADMIN: a precedência do núcleo dá estes reasons
  // independentemente das contagens — sondar com zeros evita as duas queries.
  const proProbe = deriveAccountEntitlements({
    subscription, ownedEventCount: 0, unconsumedPurchaseCount: 0,
  });
  if (proProbe.reason === 'PRO_ACTIVE' || proProbe.reason === 'ADMIN') {
    return { ...proProbe, firstUnconsumedPurchaseId: null, firstUnconsumedPurchaseTierKey: null };
  }

  // As duas leituras restantes são independentes — paralelas.
  const [eventCountResult, purchasesResult] = await Promise.all([
    client.send(new QueryCommand({
      TableName: eventTableName,
      IndexName: 'byOrganizerId',
      KeyConditionExpression: 'organizerId = :userId',
      ExpressionAttributeValues: marshall({ ':userId': userId }),
      Select: 'COUNT',
    })),
    client.send(new QueryCommand({
      TableName: planPurchaseTableName,
      IndexName: 'byUserId',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'attribute_not_exists(consumedByEventId) AND attribute_not_exists(refundedAt)',
      ExpressionAttributeValues: marshall({ ':userId': userId }),
    })),
  ]);

  const entitlements = deriveAccountEntitlements({
    subscription,
    ownedEventCount: eventCountResult.Count ?? 0,
    unconsumedPurchaseCount: purchasesResult.Count ?? 0,
  });

  const firstPurchase = purchasesResult.Items?.[0]
    ? unmarshall(purchasesResult.Items[0])
    : null;

  return {
    ...entitlements,
    firstUnconsumedPurchaseId: (firstPurchase?.id as string) ?? null,
    firstUnconsumedPurchaseTierKey: (firstPurchase?.tierKey as string) ?? null,
  };
};
