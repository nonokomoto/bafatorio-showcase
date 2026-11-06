import { Context } from 'aws-lambda';
import Stripe from 'stripe';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { isAdminPlanName, PLAN_KEYS, getTierByKey } from '../shared/plans';

const ddbClient = new DynamoDBClient({});
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const logger = new Logger({ serviceName: 'handle-stripe-webhook' });

const PROCESSED_EVENTS_TABLE = process.env.BAFATORIO_APP_PROCESSED_EVENTS_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const INVOICE_TABLE = process.env.BAFATORIO_APP_INVOICE_TABLE_NAME || '';
const PAYMENT_METHOD_DATA_TABLE = process.env.BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME || '';
const PLAN_PURCHASE_TABLE = process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';

// Sessão que sobe o escalão de um evento já comprado, em vez de comprar outro.
const INTENT_TIER_UPGRADE = 'TIER_UPGRADE';

/**
 * Máquina de estados do billing (modelo canónico §4/§4b). Contratos com o gate:
 *  - UserSubscription.planName = chave canónica ('PRO'), nunca nicknames Stripe
 *  - pause_collection ativo → status 'paused' (a Stripe mantém 'active')
 *  - checkout mode=payment E payment_status 'paid' → PlanPurchase por consumir
 *    (Multibanco/SEPA liquidam depois: só o async_payment_succeeded a grava)
 * Exposto por Function URL (auth NONE); a autenticação é a assinatura Stripe.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handler(event: any, context?: Context) {
  if (context) logger.addContext(context);

  const signature = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];
  if (!signature) {
    logger.error('Missing Stripe signature');
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing Stripe signature' }) };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.error('Invalid Stripe signature', { error: err instanceof Error ? err.message : 'unknown' });
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  try {
    logger.info('Stripe event received', { eventType: stripeEvent.type, eventId: stripeEvent.id });

    const processedKey = `${stripeEvent.id}:${stripeEvent.type}`;
    if (await isEventProcessed(processedKey)) {
      logger.info('Event already processed, skipping', { processedKey });
      return { statusCode: 200, body: JSON.stringify({ received: true, alreadyProcessed: true }) };
    }

    await processEvent(stripeEvent);
    await markEventAsProcessed(processedKey, stripeEvent);

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    logger.error('Error processing Stripe webhook', { error: err instanceof Error ? err.message : 'Unknown error' });
    // 500 → a Stripe faz retry; a idempotência absorve reentregas parciais.
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}

async function processEvent(stripeEvent: Stripe.Event): Promise<void> {
  switch (stripeEvent.type) {
    case 'customer.created':
      await handleCustomerCreated(stripeEvent.data.object as Stripe.Customer);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await upsertSubscription(
        stripeEvent.data.object as Stripe.Subscription,
        stripeEvent.type === 'customer.subscription.created'
      );
      break;
    // completed: síncrono (cartão) chega já 'paid'; diferido (Multibanco, SEPA)
    // chega 'unpaid' e liquida depois no async_payment_succeeded. O handler só
    // regista a compra quando payment_status === 'paid', portanto ambos os
    // eventos passam pelo mesmo caminho. async_payment_failed cai no default: a
    // compra nunca chegou a ser gravada, não há nada a limpar.
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_method.attached':
      await handlePaymentMethodAttached(stripeEvent.data.object as Stripe.PaymentMethod);
      break;
    case 'payment_method.detached':
      await handlePaymentMethodDetached(
        stripeEvent.data.object as Stripe.PaymentMethod,
        (stripeEvent.data.previous_attributes as { customer?: string } | undefined)?.customer
      );
      break;
    // Refund e chargeback revogam o direito (fail closed §4), mas com critérios
    // diferentes alinhados ao ADR-034:
    //  - refund: só o TOTAL revoga (charge.refunded); um parcial/goodwill não
    //    retira serviço já prestado. charge.refunded dispara em ambos.
    //  - disputa: revoga sempre — o valor está em risco de sair.
    case 'charge.refunded': {
      const charge = stripeEvent.data.object as Stripe.Charge;
      if (!charge.refunded) {
        logger.info('Partial refund keeps entitlement', { chargeId: charge.id });
        break;
      }
      await handleChargeReversal(paymentIntentIdOf(charge.payment_intent));
      break;
    }
    case 'charge.dispute.created':
      await handleChargeReversal(paymentIntentIdOf((stripeEvent.data.object as Stripe.Dispute).payment_intent));
      break;
    // paid e falhas partilham o upsert — o status da fatura conta a história
    // ('paid' vs 'open'); a UI de faturação lê daqui.
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_action_required':
      await upsertInvoice(stripeEvent.data.object as Stripe.Invoice);
      break;
    default:
      logger.info(`Unhandled event type ${stripeEvent.type}`);
  }
}

/**
 * Estado canónico da subscrição. No modelo de 3 planos só existe UMA subscrição
 * possível (Pro) — o planName é a constante canónica, nunca o nickname Stripe.
 */
async function upsertSubscription(subscription: Stripe.Subscription, isCreated: boolean): Promise<void> {
  const stripeCustomerId = subscription.customer as string;
  const userId = subscription.metadata?.userId || (await getUserIdByCustomerId(stripeCustomerId));
  if (!userId) {
    logger.error('User ID not found for subscription', { subscriptionId: subscription.id, stripeCustomerId });
    return;
  }

  const existing = await ddbClient.send(new GetItemCommand({
    TableName: USER_SUBSCRIPTION_TABLE,
    Key: { id: { S: userId } },
  }));

  // Registo ADMIN nunca é sobrescrito (ADR-036) — defesa no ponto de escrita:
  // o guard do checkout fecha a porta da app, mas uma subscrição criada fora
  // dela (dashboard Stripe, customer pré-existente) chegaria aqui e o Put
  // destruiria o bypass em silêncio.
  if (isAdminPlanName(existing.Item?.planName?.S)) {
    logger.warn('Subscription event ignored for ADMIN account (ADR-036)', {
      userId, eventSubscriptionId: subscription.id,
    });
    return;
  }

  // created ganha sempre (subscrição nova substitui o registo); updated/deleted
  // só se disserem respeito à subscrição registada — um evento tardio de uma
  // subscrição antiga não pode sobrescrever o estado da atual.
  if (!isCreated) {
    const storedSubscriptionId = existing.Item?.subscriptionId?.S;
    if (storedSubscriptionId && storedSubscriptionId !== subscription.id) {
      logger.info('Stale subscription event ignored', {
        userId, eventSubscriptionId: subscription.id, storedSubscriptionId,
      });
      return;
    }
  }

  const item = subscription.items.data[0];

  // Convenção do gate: pause_collection (save offer §1) → 'paused'; a Stripe
  // mantém status 'active' durante a pausa, o que daria escrita sem cobrança.
  const status = subscription.pause_collection ? 'paused' : subscription.status;

  const billingCycle =
    subscription.metadata?.billingCycle
    || (item?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly');

  const record = {
    id: userId,
    // Leitura restrita ao dono (rules.owner().to(['read'])): escrita é só das
    // Lambdas via IAM. Sem owner o próprio dono não lê a subscrição no AppSync.
    owner: `${userId}::${userId}`,
    stripeCustomerId,
    subscriptionId: subscription.id,
    paymentMethodId: (subscription.default_payment_method as string) || '',
    planName: PLAN_KEYS.PRO,
    priceId: item?.price?.id || '',
    status,
    // API Basil+: os períodos vivem no SubscriptionItem, não na Subscription.
    currentPeriodStart: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : undefined,
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : undefined,
    // API Basil: o portal agenda o cancelamento via cancel_at (timestamp) e
    // deixa cancel_at_period_end a false — qualquer dos dois marca o agendamento.
    cancelAtPeriodEnd: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : undefined,
    billingCycle,
    createdAt: new Date(subscription.created * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ddbClient.send(new PutItemCommand({
    TableName: USER_SUBSCRIPTION_TABLE,
    Item: marshall(record, { removeUndefinedValues: true }),
  }));
  logger.info('UserSubscription upserted', { userId, status, subscriptionId: subscription.id });
}

/**
 * Pay-per-event (§3): o pagamento único regista a compra por consumir; a Lambda
 * de criação de eventos consome-a (consumedByEventId). Subscrições não passam
 * por aqui — o estado delas vem dos eventos customer.subscription.*.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'payment') {
    logger.info('Checkout session is not one-time payment, skipping', { sessionId: session.id, mode: session.mode });
    return;
  }

  // Autoridade do direito de criação = dinheiro liquidado, não sessão fechada.
  // Multibanco/SEPA fecham a sessão com 'unpaid' (só uma referência emitida); a
  // PlanPurchase só existe quando o pagamento entra de facto — senão uma
  // referência abandonada valia um evento pago grátis.
  if (session.payment_status !== 'paid') {
    logger.info('Checkout payment not settled yet, skipping', {
      sessionId: session.id, paymentStatus: session.payment_status,
    });
    return;
  }

  const userId = session.metadata?.userId;
  const planKey = session.metadata?.planKey;
  if (!userId || planKey !== PLAN_KEYS.PAY_PER_EVENT) {
    logger.error('Checkout session missing canonical metadata', { sessionId: session.id, userId, planKey });
    return;
  }

  // Escalão comprado (ADR-038). Desconhecido ou ausente grava-se sem o campo: o
  // dinheiro já entrou, e recusar registar a compra seria pior do que uma compra
  // sem escalão — essa resolve para ilimitado, que é o que as compras anteriores
  // aos escalões deram. Um valor desconhecido é bug nosso (o checkout valida-o).
  const rawTierKey = session.metadata?.tierKey;
  const tierKey = getTierByKey(rawTierKey)?.key;
  if (rawTierKey && !tierKey) {
    logger.error('Checkout session with unknown tierKey', { sessionId: session.id, tierKey: rawTierKey });
  }

  const now = new Date().toISOString();

  // Race refund/disputa-antes-de-purchase: a Stripe não garante ordem entre
  // tipos de evento e o retry-on-500 do completed alarga a janela. Se o dinheiro
  // já foi revertido no momento em que gravamos, a compra nasce revogada — o
  // handleChargeReversal, ao chegar antes, não encontrou registo para marcar.
  // Mesmo critério do §charge.refunded: só o reembolso TOTAL (ou disputa) conta.
  const paymentIntentId = paymentIntentIdOf(session.payment_intent);
  let refundedAt: string | undefined;
  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const charge = pi.latest_charge as Stripe.Charge | null;
    if (charge?.refunded || charge?.disputed) {
      refundedAt = now;
      logger.warn('PlanPurchase born revoked - reversal preceded checkout completion', { sessionId: session.id });
    }
  }

  const upgradeEventId = tierUpgradeEventIdOf(session);
  if (upgradeEventId) {
    if (!tierKey) {
      logger.error('Tier upgrade without a valid tierKey', { sessionId: session.id, eventId: upgradeEventId });
      return;
    }
    await raiseEventTier(upgradeEventId, tierKey, now);
  }

  const record = {
    id: session.id,
    userId,
    // Owner-based read do modelo (rules.owner().to(['read'])): sem este campo
    // nem o comprador lê as suas compras. userId::userId — o webhook não conhece
    // o username Cognito, e neste pool username == sub.
    owner: `${userId}::${userId}`,
    planKey,
    tierKey,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId ?? undefined,
    amount: session.amount_total ?? undefined,
    currency: session.currency || 'eur',
    // A compra do upgrade nasce consumida pelo evento que subiu: é o registo da
    // diferença paga, não um direito a criar outro evento.
    consumedByEventId: upgradeEventId,
    consumedAt: upgradeEventId ? now : undefined,
    refundedAt,
    createdAt: now,
    updatedAt: now,
  };

  await ddbClient.send(new PutItemCommand({
    TableName: PLAN_PURCHASE_TABLE,
    Item: marshall(record, { removeUndefinedValues: true }),
  }));
  logger.info('PlanPurchase registered', { sessionId: session.id, userId });
}

/** Evento a subir de escalão, se a sessão for um upgrade; senão undefined. */
function tierUpgradeEventIdOf(session: Stripe.Checkout.Session): string | undefined {
  return session.metadata?.intent === INTENT_TIER_UPGRADE
    ? session.metadata?.eventId
    : undefined;
}

/**
 * Sobe o teto do evento (ADR-034). Corre AQUI, depois do pagamento confirmado, e
 * nunca no retorno do checkout — o cliente volta da Stripe antes de o dinheiro
 * estar liquidado.
 */
async function raiseEventTier(eventId: string, tierKey: string, now: string): Promise<void> {
  const newLimit = getTierByKey(tierKey)!.maxParticipants;
  await ddbClient.send(new UpdateItemCommand({
    TableName: EVENT_TABLE,
    Key: marshall({ id: eventId }),
    // O escalão sem teto APAGA o campo em vez de escrever uma sentinela:
    // ausente é a representação do ilimitado em todo o resto do sistema.
    ...(Number.isFinite(newLimit)
      ? {
          UpdateExpression: 'SET participantLimit = :limit, updatedAt = :now',
          ExpressionAttributeValues: marshall({ ':limit': newLimit, ':now': now }),
        }
      : {
          UpdateExpression: 'SET updatedAt = :now REMOVE participantLimit',
          ExpressionAttributeValues: marshall({ ':now': now }),
        }),
  }));
  logger.info('Event tier upgraded', { eventId, tierKey });
}

/** payment_intent é um campo expansível (string | objeto); normaliza para o id. */
function paymentIntentIdOf(pi: string | Stripe.PaymentIntent | null): string | null {
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}

/**
 * Marca refundedAt num registo keyed por id, condicionado a existir (nunca cria
 * fantasmas). Devolve os atributos novos, ou null se o registo não existir.
 */
async function markRefunded(
  table: string,
  id: string
): Promise<Record<string, AttributeValue> | null> {
  try {
    const result = await ddbClient.send(new UpdateItemCommand({
      TableName: table,
      Key: { id: { S: id } },
      UpdateExpression: 'SET refundedAt = :now, updatedAt = :now',
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeValues: { ':now': { S: new Date().toISOString() } },
      ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes ?? {};
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') return null;
    throw err;
  }
}

/**
 * Dinheiro devolvido → o direito de criação morre. O charge não referencia a
 * sessão de checkout; resolve-se via payment_intent na Stripe. Charges de
 * subscrição (mode !== 'payment') não têm PlanPurchase — nada a reverter, o
 * estado da subscrição vem dos customer.subscription.*.
 */
async function handleChargeReversal(paymentIntentId: string | null): Promise<void> {
  if (!paymentIntentId) {
    logger.info('Charge reversal without payment intent, skipping');
    return;
  }

  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
  const session = sessions.data[0];
  if (!session || session.mode !== 'payment') {
    logger.info('Charge reversal not tied to a one-time checkout, skipping', { paymentIntentId });
    return;
  }

  const purchase = await markRefunded(PLAN_PURCHASE_TABLE, session.id);
  if (purchase === null) {
    logger.info('No PlanPurchase to revoke for session', { sessionId: session.id });
    return;
  }
  const consumedByEventId = purchase.consumedByEventId?.S;
  if (consumedByEventId) {
    // O evento já foi criado com esta compra — a revogação do direito não o
    // desfaz. Fica o rasto para tratamento manual/suporte.
    logger.warn('Refunded purchase was already consumed', { sessionId: session.id, consumedByEventId });
  } else {
    logger.info('PlanPurchase revoked by charge reversal', { sessionId: session.id });
  }

  // A devolução também fica visível na fatura (Settings). A fatura Stripe
  // mantém status 'paid' num refund — o refundedAt é a nossa marca.
  const invoiceId = session.invoice as string | null;
  if (invoiceId && (await markRefunded(INVOICE_TABLE, invoiceId)) === null) {
    logger.info('No Invoice record to mark refunded', { invoiceId });
  }
}

/** Semeia o mapeamento userId ↔ stripeCustomerId (o checkout põe userId no metadata). */
async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  const userId = customer.metadata?.userId;
  if (!userId) {
    logger.error('User ID not found in customer metadata', { customerId: customer.id });
    return;
  }

  // Upsert, não Put: este é o único ponto que semeia o mapeamento no caminho de
  // pagamento único, e desistir por já existir um registo deixava
  // getUserIdByCustomerId a devolver null para sempre — portal de faturação,
  // payment_method.attached e invoice.* deixavam de resolver o dono. O SET toca
  // só no mapeamento; planName e status ficam como estão.
  const now = new Date().toISOString();
  await ddbClient.send(new UpdateItemCommand({
    TableName: USER_SUBSCRIPTION_TABLE,
    Key: { id: { S: userId } },
    UpdateExpression:
      'SET stripeCustomerId = :stripeCustomerId, owner = if_not_exists(owner, :owner), '
      + 'createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
    ExpressionAttributeValues: marshall({
      ':stripeCustomerId': customer.id,
      ':owner': `${userId}::${userId}`,
      ':now': now,
    }),
  }));
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  // A tabela guarda UM cartão por utilizador (keyed por userId). Um attach de
  // SEPA/Multibanco sobrescreveria o cartão válido com 'unknown'/'' — só
  // cartões entram; os outros métodos são efémeros do checkout.
  if (paymentMethod.type !== 'card') {
    logger.info('Non-card payment method attached, skipping', {
      paymentMethodId: paymentMethod.id, type: paymentMethod.type,
    });
    return;
  }

  const stripeCustomerId = paymentMethod.customer as string;
  const userId = stripeCustomerId ? await getUserIdByCustomerId(stripeCustomerId) : null;
  if (!userId) {
    logger.error('User ID not found for payment method', { paymentMethodId: paymentMethod.id });
    return;
  }

  await ddbClient.send(new PutItemCommand({
    TableName: PAYMENT_METHOD_DATA_TABLE,
    Item: marshall({
      id: userId,
      owner: `${userId}::${userId}`,
      paymentMethodId: paymentMethod.id,
      brand: paymentMethod.card?.brand || 'unknown',
      last4: paymentMethod.card?.last4 || '',
      expiryMonth: paymentMethod.card?.exp_month || 0,
      expiryYear: paymentMethod.card?.exp_year || 0,
      createdAt: new Date(paymentMethod.created * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  }));
}

/**
 * Cartão removido (portal/API) → limpar o registo, senão a UI mostra um cartão
 * que já não existe. No detached o object.customer vem null; o dono está em
 * previous_attributes.customer. Só apaga se for O cartão guardado — registos
 * antigos sem paymentMethodId (pré-campo) ficam intactos.
 */
async function handlePaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod,
  previousCustomerId?: string
): Promise<void> {
  const userId = previousCustomerId ? await getUserIdByCustomerId(previousCustomerId) : null;
  if (!userId) {
    logger.info('User ID not found for detached payment method, skipping', {
      paymentMethodId: paymentMethod.id,
    });
    return;
  }

  // Delete atómico condicionado ao pm guardado — um Get-then-Delete deixaria um
  // payment_method.attached concorrente (novo cartão) apagar o registo do cartão
  // novo entre a leitura e a remoção. A condição também protege registos antigos
  // sem paymentMethodId (pré-campo): não correspondem, logo não são apagados.
  try {
    await ddbClient.send(new DeleteItemCommand({
      TableName: PAYMENT_METHOD_DATA_TABLE,
      Key: { id: { S: userId } },
      ConditionExpression: 'paymentMethodId = :pmId',
      ExpressionAttributeValues: { ':pmId': { S: paymentMethod.id } },
    }));
    logger.info('PaymentMethodData removed after detach', { userId, paymentMethodId: paymentMethod.id });
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      logger.info('Detached payment method is not the stored one, skipping', {
        paymentMethodId: paymentMethod.id, userId,
      });
      return;
    }
    throw err;
  }
}

async function upsertInvoice(invoice: Stripe.Invoice): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  const userId = stripeCustomerId ? await getUserIdByCustomerId(stripeCustomerId) : null;
  if (!userId) {
    logger.error('User ID not found for invoice', { invoiceId: invoice.id });
    return;
  }

  // Paga → o que entrou; por pagar/falhada → o que está em dívida.
  const cents = invoice.status === 'paid' ? (invoice.amount_paid ?? 0) : (invoice.amount_due ?? 0);

  // Merge-safe: SET só dos campos da fatura. Um refund anterior marca refundedAt
  // via UpdateItem noutro caminho; um Put substituiria o item e apagaria a marca.
  // createdAt fixa-se no primeiro registo (if_not_exists), não salta a cada update.
  await ddbClient.send(new UpdateItemCommand({
    TableName: INVOICE_TABLE,
    Key: { id: { S: invoice.id } },
    UpdateExpression:
      'SET userId = :userId, owner = if_not_exists(owner, :owner), '
      + 'amount = :amount, currency = :currency, #status = :status, '
      + 'invoiceUrl = :invoiceUrl, invoicePdfUrl = :invoicePdfUrl, invoiceNumber = :invoiceNumber, '
      + 'createdAt = if_not_exists(createdAt, :createdAt), updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' }, // reserved word
    ExpressionAttributeValues: marshall({
      ':userId': userId,
      // owner fixa-se no primeiro registo — leitura restrita ao dono; escrita é
      // só das Lambdas via IAM.
      ':owner': `${userId}::${userId}`,
      ':amount': cents / 100,
      ':currency': invoice.currency || '',
      ':status': invoice.status || '',
      ':invoiceUrl': invoice.hosted_invoice_url || '',
      ':invoicePdfUrl': invoice.invoice_pdf || '',
      ':invoiceNumber': invoice.number || '',
      ':createdAt': new Date(invoice.created * 1000).toISOString(),
      ':updatedAt': new Date().toISOString(),
    }),
  }));
}

async function isEventProcessed(processedKey: string): Promise<boolean> {
  const result = await ddbClient.send(new GetItemCommand({
    TableName: PROCESSED_EVENTS_TABLE,
    Key: { id: { S: processedKey } },
  }));
  return !!result.Item;
}

async function markEventAsProcessed(processedKey: string, stripeEvent: Stripe.Event): Promise<void> {
  await ddbClient.send(new PutItemCommand({
    TableName: PROCESSED_EVENTS_TABLE,
    Item: marshall({
      id: processedKey,
      eventId: stripeEvent.id,
      type: stripeEvent.type,
      processedAt: new Date().toISOString(),
    }),
  }));
}

async function getUserIdByCustomerId(stripeCustomerId: string): Promise<string | null> {
  const result = await ddbClient.send(new QueryCommand({
    TableName: USER_SUBSCRIPTION_TABLE,
    IndexName: 'byCustomerId',
    KeyConditionExpression: 'stripeCustomerId = :cid',
    ExpressionAttributeValues: { ':cid': { S: stripeCustomerId } },
  }));
  return result.Items?.[0]?.id?.S ?? null;
}
