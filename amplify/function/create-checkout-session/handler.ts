import { Context } from 'aws-lambda';
import Stripe from 'stripe';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

import {
  isAdminPlanName,
  PLAN_KEYS,
  LAUNCH_DISCOUNT,
  resolvePlanKey,
  getTierByKey,
  getTierByLimit,
  getTierUpgradeAmount,
} from '../shared/plans';

// Subscrição que ainda cobre (ou pode retomar) o Pro — bloquear nova subscrição
// evita dupla cobrança; paused deve retomar no portal, não subscrever de novo.
const PRO_BLOCKING_STATUSES = ['active', 'past_due', 'paused'];

const ddbClient = new DynamoDBClient({});

// Os dados de faturação recolhem-se na página da Stripe, não num formulário nosso.
// A morada é obrigatória porque toda a compra emite fatura e no 'auto' a Stripe
// não a pede de todo. O NIF fica opcional: com required 'if_supported' a Stripe
// passa a exigir TAMBÉM o nome da empresa, e um particular fica impedido de pagar
// (verificado no sandbox a 02/08 — NIF válido e empresa vazia continua a recusar).
// Sem customer_update nada disto chega ao customer: a Stripe recolhe e descarta.
const BILLING_COLLECTION = {
  billing_address_collection: 'required',
  tax_id_collection: { enabled: true },
  customer_update: { address: 'auto', name: 'auto' },
} as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const logger = new Logger({ serviceName: 'create-checkout-session' });

const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';

// Subida de escalão de um evento já comprado, distinta de uma compra nova.
const INTENT_TIER_UPGRADE = 'TIER_UPGRADE';

// Um price por escalão do Por Evento (ADR-038). O mapa vive aqui e não no
// plans.ts partilhado: os IDs são do ambiente (test vs live), o catálogo é puro.
const TIER_PRICE_ENV: Record<string, string> = {
  PPE_100: 'STRIPE_PRICE_PPE_100',
  PPE_200: 'STRIPE_PRICE_PPE_200',
  PPE_UNLIMITED: 'STRIPE_PRICE_PPE_UNLIMITED',
};

/**
 * Contrato por intenção: o cliente envia planKey + billingCycle (Pro) ou
 * planKey + tierKey (Por Evento); o preço resolve-se AQUI, do ambiente do
 * servidor. O cliente nunca escolhe preços.
 *
 * Escalão desconhecido falha fechado: não há default. Cobrar o escalão errado
 * é pior do que recusar a compra, e o teto do evento sai daqui.
 * Lido lazy para fail-fast com mensagem clara se o ambiente estiver incompleto.
 */
const resolvePriceId = (planKey: string, billingCycle?: string, tierKey?: string): string => {
  if (planKey === PLAN_KEYS.PRO) {
    const priceId = billingCycle === 'annual'
      ? process.env.STRIPE_PRICE_PRO_ANNUAL
      : process.env.STRIPE_PRICE_PRO_MONTHLY;
    if (!priceId) {
      throw new Error(`Price ID em falta no ambiente para PRO/${billingCycle ?? 'monthly'}.`);
    }
    return priceId;
  }

  if (!getTierByKey(tierKey)) {
    throw new Error(`Escalão inválido para o plano Por Evento: ${tierKey ?? '-'}.`);
  }
  const priceId = process.env[TIER_PRICE_ENV[tierKey!]];
  if (!priceId) {
    throw new Error(`Price ID em falta no ambiente para o escalão ${tierKey}.`);
  }
  return priceId;
};

/**
 * Diferença a cobrar para subir o escalão de um evento já comprado (ADR-034).
 *
 * O teto gravado no evento é a autoridade do escalão de origem, não o histórico
 * de compras: é o teto que o gate lê, e é ele que o upgrade sobe. A diferença
 * calcula-se aqui e nunca chega do cliente.
 */
type TierUpgrade = { amount: number; currency: string };

const resolveTierUpgrade = async (
  userId: string,
  eventId: string,
  toTierKey: string
): Promise<TierUpgrade> => {
  if (!eventId) {
    throw new Error('Evento em falta para o upgrade de escalão.');
  }
  const toTier = getTierByKey(toTierKey);
  if (!toTier) {
    throw new Error(`Escalão inválido: ${toTierKey ?? '-'}.`);
  }

  const result = await ddbClient.send(new GetItemCommand({
    TableName: EVENT_TABLE,
    Key: { id: { S: eventId } },
  }));
  if (!result.Item) {
    throw new Error('Evento não encontrado.');
  }

  // owner canónico é sub::sub (ADR-013); o upgrade é do dono, não de quem
  // colabora — quem paga o teto é quem comprou o evento.
  const owner = (result.Item.owner?.S ?? '').split('::')[0];
  if (owner !== userId) {
    throw new Error('Só o dono do evento pode subir o escalão.');
  }
  if (resolvePlanKey(result.Item.planKey?.S) !== PLAN_KEYS.PAY_PER_EVENT) {
    throw new Error('Só eventos do plano Por Evento têm escalão.');
  }

  const currentLimit = result.Item.participantLimit?.N
    ? Number(result.Item.participantLimit.N)
    : null;
  const fromTier = getTierByLimit(currentLimit);
  if (!fromTier) {
    throw new Error('Escalão atual do evento não reconhecido.');
  }

  // null cobre o downgrade e o "já lá está": não existe downgrade de escalão,
  // porque reduzir a lista não devolve dinheiro (ADR-034).
  const amount = getTierUpgradeAmount(fromTier.key, toTier.key);
  if (amount === null) {
    throw new Error('Este evento já tem um escalão igual ou superior.');
  }
  return { amount, currency: toTier.currency };
};

type SessionCommon = {
  successUrl: string;
  cancelUrl: string;
  customerId: string;
  userId: string;
};

/**
 * Sessão do Pro. O metadata é o contrato com o webhook: planKey canónico, nunca
 * nicknames. A Stripe não copia o metadata da sessão para a subscrição e o
 * webhook lê `subscription.metadata` — daí a repetição em `subscription_data`.
 */
const subscriptionSessionParams = (
  { successUrl, cancelUrl, customerId, userId, priceId, billingCycle }:
  SessionCommon & { priceId: string; billingCycle?: string }
): Stripe.Checkout.SessionCreateParams => {
  const metadata = {
    userId,
    planKey: PLAN_KEYS.PRO,
    billingCycle: billingCycle === 'annual' ? 'annual' : 'monthly',
  };
  return {
    ...BILLING_COLLECTION,
    // Sem payment_method_types — a Stripe decide dinamicamente (Dashboard).
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    // Preço de lançamento 50% forever — exclusivo do Pro (§1).
    discounts: [{ coupon: LAUNCH_DISCOUNT.couponId }],
    saved_payment_method_options: { payment_method_save: 'enabled' },
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer: customerId,
    metadata,
    subscription_data: { metadata },
  };
};

/**
 * Sessão do Por Evento: compra de um evento ou subida de escalão de um já
 * comprado. Sem cupão — o LAUNCH_50 é exclusivo do Pro (ADR-038): num pagamento
 * único não compra retenção e punha o escalão de entrada a 4,99 €.
 */
const paymentSessionParams = (
  { successUrl, cancelUrl, customerId, userId, priceId, tierKey, upgrade, eventId }:
  SessionCommon & {
    priceId: string | null;
    tierKey?: string;
    upgrade: TierUpgrade | null;
    eventId?: string;
  }
): Stripe.Checkout.SessionCreateParams => ({
  ...BILLING_COLLECTION,
  // Sem payment_method_types: métodos diferidos (Multibanco, SEPA) são
  // permitidos de propósito. A sessão fecha 'unpaid' e o webhook só regista a
  // PlanPurchase no async_payment_succeeded (liquidação real).
  //
  // Compra normal: price do catálogo. Upgrade: a diferença por price_data inline
  // sobre um produto dedicado — pôr as diferenças no catálogo faria o número de
  // preços crescer com o quadrado dos escalões, e mudar um escalão obrigaria a
  // reemitir todas.
  line_items: [
    upgrade
      ? {
          quantity: 1,
          price_data: {
            currency: upgrade.currency,
            unit_amount: upgrade.amount,
            tax_behavior: 'inclusive',
            product: process.env.STRIPE_PRODUCT_TIER_UPGRADE,
          },
        }
      // Não-nulo garantido: só o upgrade dispensa price de catálogo.
      : { price: priceId!, quantity: 1 },
  ],
  mode: 'payment',
  invoice_creation: { enabled: true },
  saved_payment_method_options: { payment_method_save: 'enabled' },
  success_url: successUrl,
  cancel_url: cancelUrl,
  customer: customerId,
  // tierKey segue para o webhook: é o que grava PlanPurchase.tierKey e o teto do
  // evento (ADR-038). No upgrade junta-se o evento a subir — o teto só sobe lá,
  // depois do pagamento confirmado.
  metadata: upgrade
    ? { userId, planKey: PLAN_KEYS.PAY_PER_EVENT, tierKey: tierKey!, intent: INTENT_TIER_UPGRADE, eventId: eventId! }
    : { userId, planKey: PLAN_KEYS.PAY_PER_EVENT, tierKey: tierKey! },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: { arguments: any; identity?: { sub?: string } }, context?: Context) => {
  if (context) logger.addContext(context);

  const {
    planKey: rawPlanKey,
    billingCycle,
    tierKey,
    intent,
    eventId,
    successUrl,
    cancelUrl,
    customerEmail,
  } = event.arguments;

  const isTierUpgrade = intent === INTENT_TIER_UPGRADE;

  try {
    // O requester é quem o Cognito diz — nunca o argumento userId (ADR-019).
    const userId = event.identity?.sub;
    if (!userId) {
      throw new Error('Não autenticado.');
    }

    // Só planos pagos têm checkout; STARTER/legados falham fechados.
    const planKey = resolvePlanKey(rawPlanKey);
    if (planKey !== PLAN_KEYS.PRO && planKey !== PLAN_KEYS.PAY_PER_EVENT) {
      throw new Error(`Plano sem checkout: ${rawPlanKey ?? '-'}.`);
    }

    // Só o Por Evento tem escalões: o Pro é ilimitado por definição, e uma
    // sessão de upgrade sobre ele cobraria uma diferença que não existe.
    if (isTierUpgrade && planKey !== PLAN_KEYS.PAY_PER_EVENT) {
      throw new Error('Upgrade de escalão só existe no plano Por Evento.');
    }

    if (!customerEmail || !validateEmail(customerEmail)) {
      throw new Error('Endereço de e-mail inválido.');
    }

    // O upgrade não tem price de catálogo: a diferença resolve-se do evento,
    // depois do gate ADMIN, e cobra-se por price_data inline.
    const priceId = isTierUpgrade ? null : resolvePriceId(planKey, billingCycle, tierKey);

    // Reutiliza o customer Stripe se a conta já tiver um; senão cria.
    const userSubscription = await getUserSubscription(userId);

    // Contas ADMIN não subscrevem (ADR-036): o webhook faz PutItem de
    // substituição total da UserSubscription — uma subscrição Stripe numa
    // conta ADMIN reescreveria o registo na renovação e destruiria o bypass.
    if (isAdminPlanName(userSubscription?.planName?.S)) {
      throw new Error('Contas de administração não subscrevem planos (ADR-036).');
    }

    // Gate de conta: já-Pro não subscreve outra vez (dupla cobrança).
    if (
      planKey === PLAN_KEYS.PRO
      && resolvePlanKey(userSubscription?.planName?.S) === PLAN_KEYS.PRO
      && PRO_BLOCKING_STATUSES.includes(userSubscription?.status?.S ?? '')
    ) {
      throw new Error('Já tens uma subscrição Pro ativa - gere-a nas definições de faturação.');
    }

    const upgrade = isTierUpgrade
      ? await resolveTierUpgrade(userId, eventId, tierKey)
      : null;

    let customerId: string;
    if (userSubscription?.stripeCustomerId?.S) {
      const existingCustomer = await stripe.customers.retrieve(userSubscription.stripeCustomerId.S);
      customerId = existingCustomer.id;
      logger.info('Cliente existente encontrado', { customerId });

      // Segunda linha do gate anti-duplo-Pro: a UserSubscription só é escrita
      // pelo webhook (fica atrás segundos/minutos) — a verdade ao vivo está no
      // Stripe. Fecha a janela em que dois checkouts seguidos criavam duas
      // subscrições. 'paused' (pause_collection) mantém status 'active' no Stripe.
      if (planKey === PLAN_KEYS.PRO) {
        const liveSubs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
        const hasLive = liveSubs.data.some((s) => ['active', 'past_due'].includes(s.status));
        if (hasLive) {
          throw new Error('Já tens uma subscrição Pro ativa - gere-a nas definições de faturação.');
        }
      }
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const common = { successUrl, cancelUrl, customerId, userId };
    const session = await stripe.checkout.sessions.create(
      planKey === PLAN_KEYS.PRO
        ? subscriptionSessionParams({ ...common, priceId: priceId!, billingCycle })
        : paymentSessionParams({ ...common, priceId, tierKey, upgrade, eventId })
    );

    return {
      success: true,
      sessionUrl: session.url,
    };
  } catch (error) {
    logger.error('Erro ao criar a sessão de checkout', { error });
    return {
      success: false,
      message: `Ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
};

const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const getUserSubscription = async (userId: string) => {
  const command = new GetItemCommand({
    TableName: USER_SUBSCRIPTION_TABLE,
    Key: { id: { S: userId } },
  });
  const response = await ddbClient.send(command);
  return response.Item;
};
