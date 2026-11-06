/**
 * handle-stripe-webhook — máquina de estados do billing (modelo canónico §4/§4b).
 *
 * Contratos que o gate (resolveEvent/AccountEntitlements) assume e que este
 * handler tem de honrar:
 *  - UserSubscription.planName = chave canónica ('PRO'), nunca nicknames Stripe
 *  - pause_collection ativo → status 'paused' (a Stripe mantém 'active')
 *  - checkout.session.completed em mode=payment → regista PlanPurchase por consumir
 */
jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => ({ __type: 'Get', input })),
    PutItemCommand: jest.fn((input: unknown) => ({ __type: 'Put', input })),
    QueryCommand: jest.fn((input: unknown) => ({ __type: 'Query', input })),
    UpdateItemCommand: jest.fn((input: unknown) => ({ __type: 'Update', input })),
    DeleteItemCommand: jest.fn((input: unknown) => ({ __type: 'Delete', input })),
    _mockSend: mockSend,
  };
});

jest.mock('stripe', () => {
  const mockStripe = {
    webhooks: { constructEvent: jest.fn() },
    checkout: { sessions: { list: jest.fn() } },
    paymentIntents: { retrieve: jest.fn() },
  };
  const StripeCtor = jest.fn(() => mockStripe);
  return { __esModule: true, default: StripeCtor, _mockStripe: mockStripe };
});

import { unmarshall } from '@aws-sdk/util-dynamodb';

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { _mockStripe: mockStripe } = jest.requireMock('stripe') as {
  _mockStripe: {
    webhooks: { constructEvent: jest.Mock };
    checkout: { sessions: { list: jest.Mock } };
    paymentIntents: { retrieve: jest.Mock };
  };
};

const lambdaEvent = { headers: { 'stripe-signature': 'sig' }, body: '{}' };

const subscriptionObject = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub_1',
  customer: 'cus_1',
  status: 'active',
  cancel_at_period_end: false,
  canceled_at: null,
  created: 1750000000,
  pause_collection: null,
  default_payment_method: 'pm_1',
  metadata: { userId: 'user-1', planKey: 'PRO', billingCycle: 'monthly' },
  items: {
    data: [{
      price: { id: 'price_pro_m' },
      current_period_start: 1750000000,
      current_period_end: 1752600000,
    }],
  },
  ...overrides,
});

// Coleta os Put feitos a uma tabela
const putsTo = (table: string) =>
  mockSend.mock.calls
    .map((c) => c[0])
    .filter((cmd) => cmd?.__type === 'Put' && cmd.input.TableName === table)
    .map((cmd) => cmd.input.Item);

const commandsTo = (type: string, table: string) =>
  mockSend.mock.calls
    .map((c) => c[0])
    .filter((cmd) => cmd?.__type === type && cmd.input.TableName === table)
    .map((cmd) => cmd.input);

// Valores de um UpdateItem (ExpressionAttributeValues), com os ':' removidos.
const updateValues = (table: string) => {
  const cmd = commandsTo('Update', table)[0];
  if (!cmd) return null;
  const raw = unmarshall(cmd.ExpressionAttributeValues);
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.replace(/^:/, ''), v]));
};

describe('handle-stripe-webhook (rewrite)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any, c?: any) => Promise<{ statusCode: number; body: string }>;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    process.env.BAFATORIO_APP_PROCESSED_EVENTS_TABLE_NAME = 'processed-tbl';
    process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'sub-tbl';
    process.env.BAFATORIO_APP_INVOICE_TABLE_NAME = 'inv-tbl';
    process.env.BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME = 'pm-tbl';
    process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME = 'purchase-tbl';
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'event-tbl';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../handle-stripe-webhook/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    mockStripe.webhooks.constructEvent.mockReset();
    mockStripe.checkout.sessions.list.mockReset();
    mockStripe.paymentIntents.retrieve.mockReset();
    // Default: pagamento saudável (charge nem reembolsada nem disputada) — os
    // testes de reversão precedente sobrepõem-se explicitamente.
    mockStripe.paymentIntents.retrieve.mockResolvedValue({
      latest_charge: { refunded: false, disputed: false },
    });
    // Default: idempotência vazia (Get → sem item), Puts ok
    mockSend.mockResolvedValue({ Item: undefined });
  });

  const arm = (type: string, object: Record<string, unknown>) =>
    mockStripe.webhooks.constructEvent.mockReturnValue({ id: 'evt_1', type, data: { object } });

  test('sem assinatura: 400 sem tocar em nada', async () => {
    const r = await handler({ headers: {}, body: '{}' });
    expect(r.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('assinatura inválida: 400', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    const r = await handler(lambdaEvent);
    expect(r.statusCode).toBe(400);
  });

  test('evento já processado: 200 sem reprocessar', async () => {
    arm('customer.subscription.updated', subscriptionObject());
    mockSend.mockResolvedValueOnce({ Item: { id: { S: 'evt_1:customer.subscription.updated' } } });
    const r = await handler(lambdaEvent);
    expect(r.statusCode).toBe(200);
    expect(putsTo('sub-tbl')).toHaveLength(0);
  });

  describe('subscription created/updated → UserSubscription canónica', () => {
    test.each(['customer.subscription.created', 'customer.subscription.updated'])(
      '%s escreve planName canónico do metadata e períodos do item',
      async (type) => {
        arm(type, subscriptionObject());
        const r = await handler(lambdaEvent);
        expect(r.statusCode).toBe(200);

        const [item] = putsTo('sub-tbl');
        const record = unmarshall(item);
        expect(record.id).toBe('user-1');
        expect(record.planName).toBe('PRO');            // canónico, nunca nickname
        expect(record.status).toBe('active');
        expect(record.billingCycle).toBe('monthly');
        expect(record.priceId).toBe('price_pro_m');
        expect(record.currentPeriodEnd).toBe(new Date(1752600000 * 1000).toISOString());
        // Sem owner o rules.owner().to(['read']) fecha e nem o dono lê a própria
        // subscrição via AppSync — escrita é só das Lambdas (IAM).
        expect(record.owner).toBe('user-1::user-1');
      }
    );

    test('pause_collection ativo traduz para status paused (convenção do gate)', async () => {
      arm('customer.subscription.updated', subscriptionObject({
        pause_collection: { behavior: 'void' },
      }));
      await handler(lambdaEvent);
      expect(unmarshall(putsTo('sub-tbl')[0]).status).toBe('paused');
    });

    test('cancel agendado via cancel_at (API Basil): cancelAtPeriodEnd true + data guardada', async () => {
      // O portal moderno agenda o cancelamento com cancel_at (timestamp) e deixa
      // cancel_at_period_end a false — sem este mapeamento o registo fica
      // indistinguível de uma subscrição saudável.
      arm('customer.subscription.updated', subscriptionObject({
        cancel_at_period_end: false,
        cancel_at: 1786624925,
        canceled_at: 1783946667,
      }));
      await handler(lambdaEvent);
      const record = unmarshall(putsTo('sub-tbl')[0]);
      expect(record.cancelAtPeriodEnd).toBe(true);
      expect(record.cancelAt).toBe(new Date(1786624925 * 1000).toISOString());
      expect(record.status).toBe('active');
    });

    test('past_due passa cru (dunning mantém acesso, §4b)', async () => {
      arm('customer.subscription.updated', subscriptionObject({ status: 'past_due' }));
      await handler(lambdaEvent);
      expect(unmarshall(putsTo('sub-tbl')[0]).status).toBe('past_due');
    });

    test('sem metadata.userId: resolve pelo stripeCustomerId (índice byCustomerId)', async () => {
      arm('customer.subscription.updated', subscriptionObject({ metadata: { planKey: 'PRO' } }));
      // Get idempotência (vazio) → Query byCustomerId devolve o dono
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-9' } }] })
        .mockResolvedValue({});
      await handler(lambdaEvent);
      expect(unmarshall(putsTo('sub-tbl')[0]).id).toBe('user-9');
    });
  });

  describe('registo ADMIN nunca é sobrescrito (ADR-036)', () => {
    // Defesa no ponto de escrita: o guard do create-checkout-session fecha a
    // porta da app, mas uma subscrição criada fora dela (dashboard Stripe,
    // customer pré-existente) chegaria aqui e o Put destruiria o bypass.
    test.each(['customer.subscription.created', 'customer.subscription.updated'])(
      '%s com registo ADMIN existente: skip sem Put',
      async (type) => {
        arm(type, subscriptionObject());
        // Get idempotência → Get do registo atual (planName ADMIN)
        mockSend
          .mockResolvedValueOnce({ Item: undefined })
          .mockResolvedValueOnce({ Item: { id: { S: 'user-1' }, planName: { S: 'ADMIN' } } })
          .mockResolvedValue({});

        const r = await handler(lambdaEvent);

        expect(r.statusCode).toBe(200); // ack à Stripe — sem retries infinitos
        expect(putsTo('sub-tbl')).toHaveLength(0);
      }
    );

    test('subscription.deleted com registo ADMIN: skip sem Put', async () => {
      arm('customer.subscription.deleted', subscriptionObject({ status: 'canceled' }));
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Item: { id: { S: 'user-1' }, planName: { S: 'ADMIN' } } })
        .mockResolvedValue({});

      const r = await handler(lambdaEvent);

      expect(r.statusCode).toBe(200);
      expect(putsTo('sub-tbl')).toHaveLength(0);
    });
  });

  describe('subscription.deleted', () => {
    test('a subscrição registada morre → status canceled (cai para nível Starter)', async () => {
      arm('customer.subscription.deleted', subscriptionObject({ status: 'canceled' }));
      // Get idempotência → Get do registo atual (aponta para a MESMA subscrição)
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Item: { id: { S: 'user-1' }, subscriptionId: { S: 'sub_1' } } })
        .mockResolvedValue({});
      await handler(lambdaEvent);
      const record = unmarshall(putsTo('sub-tbl')[0]);
      expect(record.status).toBe('canceled');
      expect(record.planName).toBe('PRO');
    });

    test('uma subscrição ANTIGA morre → não sobrescreve o registo da atual', async () => {
      arm('customer.subscription.deleted', subscriptionObject({ id: 'sub_old', status: 'canceled' }));
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Item: { id: { S: 'user-1' }, subscriptionId: { S: 'sub_current' } } })
        .mockResolvedValue({});
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      expect(putsTo('sub-tbl')).toHaveLength(0); // registo intacto
    });
  });

  describe('checkout.session.completed', () => {
    const ppeSession = (overrides: Record<string, unknown> = {}) => ({
      id: 'cs_1',
      mode: 'payment',
      customer: 'cus_1',
      payment_intent: 'pi_1',
      payment_status: 'paid',
      amount_total: 3999,
      currency: 'eur',
      metadata: { userId: 'user-1', planKey: 'PAY_PER_EVENT', tierKey: 'PPE_200' },
      ...overrides,
    });

    test('mode=payment pago (cartão): regista PlanPurchase por consumir', async () => {
      arm('checkout.session.completed', ppeSession());
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);

      const record = unmarshall(putsTo('purchase-tbl')[0]);
      expect(record.userId).toBe('user-1');
      expect(record.planKey).toBe('PAY_PER_EVENT');
      expect(record.stripeCheckoutSessionId).toBe('cs_1');
      expect(record.stripePaymentIntentId).toBe('pi_1');
      expect(record.amount).toBe(3999);
      expect(record.consumedByEventId).toBeUndefined(); // por consumir
      // Sem owner, o rules.owner().to(['read']) do modelo falha fechado e nem o
      // comprador consegue ler as suas compras via AppSync.
      expect(record.owner).toBe('user-1::user-1');
      // Escalão comprado: auditoria e reconciliação com a fatura (ADR-038).
      expect(record.tierKey).toBe('PPE_200');
    });

    test('sem tierKey (compra anterior aos escalões, em voo): regista sem o campo', async () => {
      // O dinheiro já entrou — recusar registar a compra seria pior do que uma
      // compra sem escalão, que resolve para o ilimitado que essa compra deu.
      arm('checkout.session.completed', ppeSession({
        metadata: { userId: 'user-1', planKey: 'PAY_PER_EVENT' },
      }));
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);

      const record = unmarshall(putsTo('purchase-tbl')[0]);
      expect(record.tierKey).toBeUndefined();
    });

    test('tierKey desconhecido: regista a compra mas não grava o escalão', async () => {
      arm('checkout.session.completed', ppeSession({
        metadata: { userId: 'user-1', planKey: 'PAY_PER_EVENT', tierKey: 'PPE_500' },
      }));
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);

      const record = unmarshall(putsTo('purchase-tbl')[0]);
      expect(record.tierKey).toBeUndefined();
    });

    test('mode=payment NÃO pago (Multibanco pendente): não grava — só uma referência, não dinheiro', async () => {
      // Métodos de notificação diferida (Multibanco, SEPA) fecham a sessão com
      // payment_status 'unpaid'; a liquidação chega depois no async_payment_*.
      arm('checkout.session.completed', ppeSession({ payment_status: 'unpaid' }));
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      expect(putsTo('purchase-tbl')).toHaveLength(0);
    });

    test('async_payment_succeeded (Multibanco liquidou): regista a PlanPurchase', async () => {
      arm('checkout.session.async_payment_succeeded', ppeSession({ payment_status: 'paid' }));
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      const record = unmarshall(putsTo('purchase-tbl')[0]);
      expect(record.userId).toBe('user-1');
      expect(record.planKey).toBe('PAY_PER_EVENT');
      expect(record.consumedByEventId).toBeUndefined();
    });

    test('async_payment_failed (referência expirou): não grava nada', async () => {
      arm('checkout.session.async_payment_failed', ppeSession({ payment_status: 'unpaid' }));
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      expect(putsTo('purchase-tbl')).toHaveLength(0);
    });

    test('charge já reembolsada quando o completed processa: nasce revogada (race refund-antes-de-purchase)', async () => {
      // A Stripe não garante ordem entre tipos de evento; o retry-on-500 do
      // completed alarga a janela. Se o dinheiro já saiu quando gravamos, a
      // compra não pode nascer consumível.
      arm('checkout.session.completed', ppeSession());
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        latest_charge: { refunded: true, disputed: false },
      });

      await handler(lambdaEvent);
      const record = unmarshall(putsTo('purchase-tbl')[0]);
      expect(record.refundedAt).toBeDefined();
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1', expect.objectContaining({ expand: ['latest_charge'] }));
    });

    test('charge disputada quando o completed processa: nasce revogada', async () => {
      arm('checkout.session.completed', ppeSession());
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        latest_charge: { refunded: false, disputed: true },
      });

      await handler(lambdaEvent);
      expect(unmarshall(putsTo('purchase-tbl')[0]).refundedAt).toBeDefined();
    });

    test('caminho normal (charge saudável): compra sem refundedAt', async () => {
      arm('checkout.session.completed', ppeSession());
      await handler(lambdaEvent);
      expect(unmarshall(putsTo('purchase-tbl')[0]).refundedAt).toBeUndefined();
    });

    describe('upgrade de escalão (ADR-034/038)', () => {
      const upgradeSession = (overrides: Record<string, unknown> = {}) => ppeSession({
        id: 'cs_up',
        amount_total: 1000,
        metadata: {
          userId: 'user-1',
          planKey: 'PAY_PER_EVENT',
          tierKey: 'PPE_200',
          intent: 'TIER_UPGRADE',
          eventId: 'evt-1',
        },
        ...overrides,
      });

      test('sobe o teto do evento só depois do pagamento confirmado', async () => {
        arm('checkout.session.completed', upgradeSession());
        const r = await handler(lambdaEvent);
        expect(r.statusCode).toBe(200);

        const update = commandsTo('Update', 'event-tbl')[0];
        expect(unmarshall(update.Key)).toEqual({ id: 'evt-1' });
        expect(updateValues('event-tbl')?.limit).toBe(200);
      });

      test('escalão sem teto: o upgrade APAGA o campo em vez de escrever sentinela', async () => {
        arm('checkout.session.completed', upgradeSession({
          metadata: {
            userId: 'user-1', planKey: 'PAY_PER_EVENT', tierKey: 'PPE_UNLIMITED',
            intent: 'TIER_UPGRADE', eventId: 'evt-1',
          },
        }));
        await handler(lambdaEvent);

        const update = commandsTo('Update', 'event-tbl')[0];
        expect(update.UpdateExpression).toContain('REMOVE participantLimit');
      });

      test('a compra do upgrade nasce consumida pelo mesmo evento — não vale um evento novo', async () => {
        arm('checkout.session.completed', upgradeSession());
        await handler(lambdaEvent);

        const record = unmarshall(putsTo('purchase-tbl')[0]);
        expect(record.consumedByEventId).toBe('evt-1');
        expect(record.consumedAt).toBeTruthy();
        expect(record.tierKey).toBe('PPE_200');
        expect(record.amount).toBe(1000);
      });

      test('pagamento não liquidado: não sobe teto nenhum', async () => {
        arm('checkout.session.completed', upgradeSession({ payment_status: 'unpaid' }));
        await handler(lambdaEvent);

        expect(commandsTo('Update', 'event-tbl')).toHaveLength(0);
        expect(putsTo('purchase-tbl')).toHaveLength(0);
      });
    });

    test('mode=subscription: não cria PlanPurchase (a subscrição trata o estado)', async () => {
      arm('checkout.session.completed', {
        id: 'cs_2', mode: 'subscription', customer: 'cus_1', payment_status: 'paid',
        metadata: { userId: 'user-1', planKey: 'PRO', billingCycle: 'monthly' },
      });
      await handler(lambdaEvent);
      expect(putsTo('purchase-tbl')).toHaveLength(0);
    });
  });

  describe('charge.refunded → PlanPurchase deixa de valer um evento', () => {
    test('refund de um Pay-per-event marca refundedAt na compra', async () => {
      arm('charge.refunded', { id: 'ch_1', payment_intent: 'pi_1', refunded: true });
      // O charge não conhece a sessão; o handler resolve-a na Stripe pelo payment_intent.
      mockStripe.checkout.sessions.list.mockResolvedValue({
        data: [{ id: 'cs_1', mode: 'payment' }],
      });

      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);

      const [update] = commandsTo('Update', 'purchase-tbl');
      expect(update.Key).toEqual({ id: { S: 'cs_1' } });
      expect(update.UpdateExpression).toContain('refundedAt');
      expect(update.ConditionExpression).toBe('attribute_exists(id)');
    });

    test('refund PARCIAL (refunded false) NÃO revoga — ADR-034: parcial não retira serviço', async () => {
      // charge.refunded dispara em reembolsos parciais também; o booleano
      // charge.refunded só é true no reembolso TOTAL.
      arm('charge.refunded', { id: 'ch_1', payment_intent: 'pi_1', refunded: false, amount: 3999, amount_refunded: 1 });
      mockStripe.checkout.sessions.list.mockResolvedValue({
        data: [{ id: 'cs_1', mode: 'payment' }],
      });

      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      expect(commandsTo('Update', 'purchase-tbl')).toHaveLength(0);
      // Nem sequer resolve a sessão — o gate é anterior.
      expect(mockStripe.checkout.sessions.list).not.toHaveBeenCalled();
    });

    test('disputa (chargeback) revoga a compra da mesma forma — fail closed', async () => {
      arm('charge.dispute.created', { id: 'dp_1', payment_intent: 'pi_1', status: 'needs_response' });
      mockStripe.checkout.sessions.list.mockResolvedValue({
        data: [{ id: 'cs_1', mode: 'payment' }],
      });

      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      const [update] = commandsTo('Update', 'purchase-tbl');
      expect(update.Key).toEqual({ id: { S: 'cs_1' } });
      expect(update.UpdateExpression).toContain('refundedAt');
    });

    test('refund marca refundedAt também na Invoice da sessão (Settings mostram a devolução)', async () => {
      arm('charge.refunded', { id: 'ch_1', payment_intent: 'pi_1', refunded: true });
      mockStripe.checkout.sessions.list.mockResolvedValue({
        data: [{ id: 'cs_1', mode: 'payment', invoice: 'in_ppe1' }],
      });

      await handler(lambdaEvent);

      const [invUpdate] = commandsTo('Update', 'inv-tbl');
      expect(invUpdate.Key).toEqual({ id: { S: 'in_ppe1' } });
      expect(invUpdate.UpdateExpression).toContain('refundedAt');
      expect(invUpdate.ConditionExpression).toBe('attribute_exists(id)');
    });

    test('refund de sessão sem invoice: só a PlanPurchase é marcada', async () => {
      arm('charge.refunded', { id: 'ch_1', payment_intent: 'pi_1', refunded: true });
      mockStripe.checkout.sessions.list.mockResolvedValue({
        data: [{ id: 'cs_1', mode: 'payment', invoice: null }],
      });

      await handler(lambdaEvent);
      expect(commandsTo('Update', 'purchase-tbl')).toHaveLength(1);
      expect(commandsTo('Update', 'inv-tbl')).toHaveLength(0);
    });

    test('refund de um pagamento de subscrição: sem PlanPurchase, nada a reverter', async () => {
      arm('charge.refunded', { id: 'ch_2', payment_intent: 'pi_sub', refunded: true });
      mockStripe.checkout.sessions.list.mockResolvedValue({
        data: [{ id: 'cs_sub', mode: 'subscription' }],
      });

      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      expect(commandsTo('Update', 'purchase-tbl')).toHaveLength(0);
    });
  });

  describe('payment_method attached/detached → PaymentMethodData', () => {
    const cardPm = {
      id: 'pm_card_1',
      type: 'card',
      customer: 'cus_1',
      created: 1750000000,
      card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
    };

    test('attach de cartão grava brand/last4 e o paymentMethodId', async () => {
      arm('payment_method.attached', cardPm);
      // Get idempotência → Query byCustomerId resolve o dono
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })
        .mockResolvedValue({});
      await handler(lambdaEvent);

      const record = unmarshall(putsTo('pm-tbl')[0]);
      expect(record.id).toBe('user-1');
      expect(record.brand).toBe('visa');
      expect(record.last4).toBe('4242');
      expect(record.paymentMethodId).toBe('pm_card_1');
      expect(record.owner).toBe('user-1::user-1'); // leitura restrita ao dono
    });

    test('attach de método não-cartão (SEPA) NÃO sobrescreve o cartão guardado', async () => {
      arm('payment_method.attached', {
        id: 'pm_sepa_1', type: 'sepa_debit', customer: 'cus_1', created: 1750000000,
        sepa_debit: { last4: '3000' },
      });
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })
        .mockResolvedValue({});
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);
      expect(putsTo('pm-tbl')).toHaveLength(0);
    });

    test('detach do cartão guardado apaga o registo', async () => {
      // No detached o customer já vem null — o dono está em previous_attributes.
      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: 'evt_1',
        type: 'payment_method.detached',
        data: { object: { ...cardPm, customer: null }, previous_attributes: { customer: 'cus_1' } },
      });
      mockSend
        .mockResolvedValueOnce({ Item: undefined })                          // idempotência
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })         // byCustomerId
        .mockResolvedValue({});                                              // Delete condicional ok
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);

      // Delete atómico e condicionado ao pm guardado — sem Get-then-Delete, que
      // deixaria um attached concorrente apagar o cartão novo entre as duas chamadas.
      const [del] = commandsTo('Delete', 'pm-tbl');
      expect(del.Key).toEqual({ id: { S: 'user-1' } });
      expect(del.ConditionExpression).toBe('paymentMethodId = :pmId');
      expect(unmarshall(del.ExpressionAttributeValues)[':pmId']).toBe('pm_card_1');
    });

    test('detach de um método que NÃO é o guardado: a condição rejeita, sem rebentar', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: 'evt_1',
        type: 'payment_method.detached',
        data: {
          object: { ...cardPm, id: 'pm_old', customer: null },
          previous_attributes: { customer: 'cus_1' },
        },
      });
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })
        .mockImplementationOnce(() => {
          const e = new Error('cond'); e.name = 'ConditionalCheckFailedException';
          return Promise.reject(e);
        })
        .mockResolvedValue({});
      const r = await handler(lambdaEvent);
      // A condição (não é o pm guardado) protege o registo; o handler engole a
      // rejeição e devolve 200 — a Stripe não faz retry de um no-op legítimo.
      expect(r.statusCode).toBe(200);
      expect(commandsTo('Delete', 'pm-tbl')[0].ConditionExpression).toBe('paymentMethodId = :pmId');
    });
  });

  describe('faturas falhadas → Invoice com status real', () => {
    const failedInvoice = {
      id: 'in_fail1',
      customer: 'cus_1',
      status: 'open',
      amount_due: 1499,
      amount_paid: 0,
      currency: 'eur',
      hosted_invoice_url: 'https://inv.url',
      invoice_pdf: 'https://inv.pdf',
      number: 'X-0001',
      created: 1750000000,
    };

    test('invoice.payment_failed grava o registo com status open e amount_due', async () => {
      arm('invoice.payment_failed', failedInvoice);
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })
        .mockResolvedValue({});
      const r = await handler(lambdaEvent);
      expect(r.statusCode).toBe(200);

      const invCmd = commandsTo('Update', 'inv-tbl')[0];
      expect(invCmd.Key).toEqual({ id: { S: 'in_fail1' } });
      const vals = updateValues('inv-tbl');
      expect(vals.userId).toBe('user-1');
      expect(vals.status).toBe('open');
      expect(vals.amount).toBe(14.99); // amount_due — a fatura não foi paga
      // owner fixa-se no primeiro registo (if_not_exists) e não é reescrito em
      // updates tardios; sem ele o dono não lê a própria fatura via AppSync.
      expect(invCmd.UpdateExpression).toContain('owner = if_not_exists(owner, :owner)');
      expect(vals.owner).toBe('user-1::user-1');
    });

    test('invoice.payment_action_required grava pelo mesmo caminho', async () => {
      arm('invoice.payment_action_required', failedInvoice);
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })
        .mockResolvedValue({});
      await handler(lambdaEvent);
      expect(updateValues('inv-tbl').status).toBe('open');
    });

    test('upsertInvoice é merge-safe: Update SET dos campos, nunca Put que apaga refundedAt', async () => {
      // Um refund anterior marcou refundedAt via UpdateItem; um invoice.* tardio
      // (replay/reprocessamento) para o mesmo id não pode apagar essa marca. Um
      // PutItem substituiria o item inteiro — daí Update SET só dos campos da
      // fatura, deixando refundedAt intacto.
      arm('invoice.paid', {
        id: 'in_paid1', customer: 'cus_1', status: 'paid', amount_paid: 1499,
        currency: 'eur', hosted_invoice_url: 'https://u', invoice_pdf: 'https://p',
        number: 'P-1', created: 1750000000,
      });
      mockSend
        .mockResolvedValueOnce({ Item: undefined })
        .mockResolvedValueOnce({ Items: [{ id: { S: 'user-1' } }] })
        .mockResolvedValue({});
      await handler(lambdaEvent);

      expect(putsTo('inv-tbl')).toHaveLength(0);
      const cmd = commandsTo('Update', 'inv-tbl')[0];
      expect(cmd.UpdateExpression).not.toContain('refundedAt');
      // createdAt preservado no primeiro registo, não reescrito em updates.
      expect(cmd.UpdateExpression).toContain('createdAt = if_not_exists(createdAt');
      expect(updateValues('inv-tbl').amount).toBe(14.99); // amount_paid/100
    });
  });

  test('customer.created faz seed do UserSubscription com owner (leitura restrita ao dono)', async () => {
    arm('customer.created', { id: 'cus_1', metadata: { userId: 'user-1' } });
    const r = await handler(lambdaEvent);
    expect(r.statusCode).toBe(200);
    const cmd = commandsTo('Update', 'sub-tbl')[0];
    expect(unmarshall(cmd.Key).id).toBe('user-1');
    const values = updateValues('sub-tbl')!;
    expect(values.stripeCustomerId).toBe('cus_1');
    expect(values.owner).toBe('user-1::user-1');
  });

  // Regressão: o plano grátis pré-cria a UserSubscription sem stripeCustomerId.
  // Se o seed desistir por o registo já existir, o mapeamento userId ↔ customer
  // nunca é escrito e getUserIdByCustomerId devolve null para sempre — portal de
  // faturação, payment_method.attached e invoice.* deixam de resolver o dono.
  test('customer.created semeia o stripeCustomerId em registo já existente sem apagar o plano', async () => {
    arm('customer.created', { id: 'cus_1', metadata: { userId: 'user-1' } });
    const cmd = (await handler(lambdaEvent), commandsTo('Update', 'sub-tbl')[0]);
    expect(cmd.UpdateExpression).toContain('stripeCustomerId = :stripeCustomerId');
    // Upsert: cria o registo se não existir, preserva o que já lá está.
    expect(cmd.UpdateExpression).toContain('owner = if_not_exists(owner');
    expect(cmd.UpdateExpression).toContain('createdAt = if_not_exists(createdAt');
    expect(cmd.UpdateExpression).not.toContain('planName');
    expect(cmd.UpdateExpression).not.toContain('status');
    expect(putsTo('sub-tbl')).toHaveLength(0);
  });

  test('evento desconhecido: 200 e marcado como processado, sem escritas de negócio', async () => {
    arm('customer.tax_id.created', { id: 'x' });
    const r = await handler(lambdaEvent);
    expect(r.statusCode).toBe(200);
    expect(putsTo('sub-tbl')).toHaveLength(0);
    expect(putsTo('purchase-tbl')).toHaveLength(0);
    expect(putsTo('processed-tbl')).toHaveLength(1);
  });

  test('nunca escreve na tabela StripeEvent (morta) nem campos flex*', async () => {
    arm('customer.subscription.updated', subscriptionObject());
    await handler(lambdaEvent);
    const tables = mockSend.mock.calls.map((c) => c[0]?.input?.TableName).filter(Boolean);
    expect(tables).not.toContain('stripe-events-tbl');
    const record = unmarshall(putsTo('sub-tbl')[0]);
    expect(record.flexEvents).toBeUndefined();
    expect(record.flexEventsRemaining).toBeUndefined();
  });
});
