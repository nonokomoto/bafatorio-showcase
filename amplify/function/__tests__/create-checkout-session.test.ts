/**
 * create-checkout-session — contrato por intenção (planKey + billingCycle).
 *
 * O cliente NUNCA escolhe preços: o handler resolve o price ID do ambiente e
 * aplica o cupão LAUNCH_50 aos dois planos pagos (Vision Core v1.8). O userId
 * vem do identity (nunca dos arguments — o cliente não se identifica a si próprio).
 */
import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('stripe', () => {
  const mockStripe = {
    customers: { retrieve: jest.fn(), create: jest.fn() },
    subscriptions: { list: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
  };
  const StripeCtor = jest.fn(() => mockStripe);
  return { __esModule: true, default: StripeCtor, _mockStripe: mockStripe };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { _mockStripe: mockStripe } = jest.requireMock('stripe') as {
  _mockStripe: {
    customers: { retrieve: jest.Mock; create: jest.Mock };
    checkout: { sessions: { create: jest.Mock } };
  };
};

const baseArgs = {
  customerEmail: 'ney@example.com',
  successUrl: 'https://app/events',
  cancelUrl: 'https://app/plan-selection',
};

const invoke = (
  handler: (e: unknown) => Promise<{ success: boolean; sessionUrl?: string; message?: string }>,
  args: Record<string, unknown>,
  sub = 'user-1'
) => handler({ arguments: { ...baseArgs, ...args }, identity: { sub } });

describe('create-checkout-session handler (contrato por intenção)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any) => Promise<any>;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'sub-table';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_m';
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_a';
    process.env.STRIPE_PRICE_PPE_100 = 'price_ppe_100';
    process.env.STRIPE_PRICE_PPE_200 = 'price_ppe_200';
    process.env.STRIPE_PRICE_PPE_UNLIMITED = 'price_ppe_unlimited';
    process.env.STRIPE_PRODUCT_TIER_UPGRADE = 'prod_upgrade';
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'event-table';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../create-checkout-session/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    mockStripe.customers.retrieve.mockReset();
    mockStripe.customers.create.mockReset();
    mockStripe.subscriptions.list.mockReset();
    mockStripe.checkout.sessions.create.mockReset();

    // Default: sem UserSubscription → cria customer novo; sem subs vivas no Stripe
    mockSend.mockResolvedValue({ Item: undefined });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
    mockStripe.subscriptions.list.mockResolvedValue({ data: [] });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe/xyz' });
  });

  test('Pro mensal: subscription com price do servidor e cupão LAUNCH_50', async () => {
    const r = await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });

    expect(r).toEqual({ success: true, sessionUrl: 'https://checkout.stripe/xyz' });
    const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(session.mode).toBe('subscription');
    // Nunca fixar payment_method_types — a Stripe decide dinamicamente (Dashboard)
    expect(session.payment_method_types).toBeUndefined();
    expect(session.line_items).toEqual([{ price: 'price_pro_m', quantity: 1 }]);
    expect(session.discounts).toEqual([{ coupon: 'LAUNCH_50' }]);
    expect(session.metadata).toEqual({ userId: 'user-1', planKey: 'PRO', billingCycle: 'monthly' });
    // A Stripe NÃO copia metadata da sessão para a subscrição — o webhook lê
    // subscription.metadata, por isso tem de ir via subscription_data.
    expect(session.subscription_data).toEqual({
      metadata: { userId: 'user-1', planKey: 'PRO', billingCycle: 'monthly' },
    });
  });

  test('Pro anual usa o price anual', async () => {
    await invoke(handler, { planKey: 'PRO', billingCycle: 'annual' });
    const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(session.line_items).toEqual([{ price: 'price_pro_a', quantity: 1 }]);
    expect(session.metadata.billingCycle).toBe('annual');
  });

  test('Pay-per-event: payment único, SEM cupão, quantity 1, com fatura', async () => {
    const r = await invoke(handler, { planKey: 'PAY_PER_EVENT', tierKey: 'PPE_100' });

    expect(r.success).toBe(true);
    const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(session.mode).toBe('payment');
    expect(session.payment_method_types).toBeUndefined();
    expect(session.line_items).toEqual([{ price: 'price_ppe_100', quantity: 1 }]);
    // O cupão é exclusivo do Pro (ADR-038): num pagamento único o desconto não
    // compra retenção nenhuma e punha o escalão de entrada a 4,99 €.
    expect(session.discounts).toBeUndefined();
    expect(session.invoice_creation).toEqual({ enabled: true });
    // tierKey no metadata é o contrato com o webhook (PlanPurchase.tierKey).
    expect(session.metadata).toEqual({
      userId: 'user-1',
      planKey: 'PAY_PER_EVENT',
      tierKey: 'PPE_100',
    });
  });

  test.each([
    ['PPE_100', 'price_ppe_100'],
    ['PPE_200', 'price_ppe_200'],
    ['PPE_UNLIMITED', 'price_ppe_unlimited'],
  ])('escalão %s resolve o price %s no servidor', async (tierKey, priceId) => {
    await invoke(handler, { planKey: 'PAY_PER_EVENT', tierKey });
    const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(session.line_items).toEqual([{ price: priceId, quantity: 1 }]);
    expect(session.metadata.tierKey).toBe(tierKey);
  });

  test.each([undefined, 'PPE_500', 'PRO'])(
    'Por Evento com escalão inválido (%s): falha sem chamar a Stripe',
    async (tierKey) => {
      const r = await invoke(handler, { planKey: 'PAY_PER_EVENT', tierKey });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['PRO', { billingCycle: 'monthly' }],
    ['PAY_PER_EVENT', { tierKey: 'PPE_100' }],
  ])('%s: os dados de faturação são recolhidos na página Stripe, sem campos obrigatórios', async (planKey, extra) => {
    await invoke(handler, { planKey, ...extra });

    const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
    // Morada obrigatória: a fatura precisa dela e no 'auto' a Stripe não a pede.
    expect(session.billing_address_collection).toBe('required');
    // NIF sem 'required': exigi-lo obriga também ao nome da empresa e bloqueia
    // a compra a particulares.
    expect(session.tax_id_collection).toEqual({ enabled: true });
    // Sem customer_update a Stripe recolhe mas não grava no customer que criámos.
    expect(session.customer_update).toEqual({ address: 'auto', name: 'auto' });
    // Telefone fica de fora: enabled torna-o obrigatório e não vai na fatura.
    expect(session.phone_number_collection).toBeUndefined();
  });

  test('customer novo criado só com email — o resto vem do Checkout', async () => {
    await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });

    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: 'ney@example.com',
      metadata: { userId: 'user-1' },
    });
  });

  test.each(['STARTER', 'Plano Flex', undefined])(
    'planKey sem checkout (%s): falha sem chamar a Stripe',
    async (planKey) => {
      const r = await invoke(handler, { planKey });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    }
  );

  test('email inválido: falha antes de qualquer chamada externa', async () => {
    const r = await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly', customerEmail: 'nope' });
    expect(r.success).toBe(false);
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test.each(['active', 'past_due', 'paused'])(
    'Pro já %s: recusa novo checkout Pro (evita dupla subscrição)',
    async (status) => {
      mockSend.mockResolvedValue({
        Item: { planName: { S: 'PRO' }, status: { S: status }, stripeCustomerId: { S: 'cus_old' } },
      });
      const r = await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    }
  );

  test('Pro já ativo no Stripe mas UserSubscription atrasada (webhook lag): recusa sem criar sessão', async () => {
    // O TOCTOU real: o registo DynamoDB ainda não reflete a subscrição acabada
    // de criar — a verdade ao vivo está no Stripe.
    mockSend.mockResolvedValue({ Item: { stripeCustomerId: { S: 'cus_old' } } });
    mockStripe.customers.retrieve.mockResolvedValue({ id: 'cus_old' });
    mockStripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_live', status: 'active' }] });

    const r = await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });

    expect(r.success).toBe(false);
    expect(mockStripe.subscriptions.list).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_old' })
    );
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test('conta ADMIN: recusa checkout de qualquer plano sem tocar no Stripe (ADR-036)', async () => {
    // O webhook faz PutItem de substituição total — uma subscrição Stripe numa
    // conta ADMIN reescreveria o registo e destruiria o bypass em silêncio.
    mockSend.mockResolvedValue({
      Item: { planName: { S: 'ADMIN' }, status: { S: 'active' } },
    });

    const pro = await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });
    const ppe = await invoke(handler, { planKey: 'PAY_PER_EVENT', tierKey: 'PPE_100' });

    expect(pro.success).toBe(false);
    expect(pro.message).toContain('Contas de administração não subscrevem planos');
    expect(ppe.success).toBe(false);
    expect(ppe.message).toContain('Contas de administração não subscrevem planos');
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
  });

  test('Pro canceled: pode subscrever de novo', async () => {
    mockSend.mockResolvedValue({
      Item: { planName: { S: 'PRO' }, status: { S: 'canceled' }, stripeCustomerId: { S: 'cus_old' } },
    });
    mockStripe.customers.retrieve.mockResolvedValue({ id: 'cus_old' });
    const r = await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });
    expect(r.success).toBe(true);
  });

  test('reutiliza o customer Stripe existente da UserSubscription', async () => {
    mockSend.mockResolvedValue({ Item: { stripeCustomerId: { S: 'cus_old' } } });
    mockStripe.customers.retrieve.mockResolvedValue({ id: 'cus_old' });

    await invoke(handler, { planKey: 'PRO', billingCycle: 'monthly' });

    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    expect(mockStripe.checkout.sessions.create.mock.calls[0][0].customer).toBe('cus_old');
  });

  test('userId vem do identity — o argumento userId do cliente é ignorado', async () => {
    await handler({
      arguments: { ...baseArgs, planKey: 'PRO', billingCycle: 'monthly', userId: 'atacante' },
      identity: { sub: 'user-real' },
    });
    expect(mockStripe.checkout.sessions.create.mock.calls[0][0].metadata.userId).toBe('user-real');
  });

  test('sem identity: falha fechada', async () => {
    const r = await handler({ arguments: { ...baseArgs, planKey: 'PRO', billingCycle: 'monthly' } });
    expect(r.success).toBe(false);
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  describe('upgrade de escalão (ADR-034/038)', () => {
    // O evento é a autoridade do teto: o escalão de origem deriva do
    // participantLimit gravado, não do histórico de compras.
    const armEvent = (eventItem: Record<string, unknown> | undefined, subscription?: Record<string, unknown>) => {
      mockSend.mockReset();
      mockSend
        .mockResolvedValueOnce({ Item: subscription })                       // UserSubscription
        .mockResolvedValueOnce({ Item: eventItem && marshall(eventItem) });  // Event
    };

    const upgrade = (args: Record<string, unknown> = {}) =>
      invoke(handler, {
        planKey: 'PAY_PER_EVENT',
        intent: 'TIER_UPGRADE',
        eventId: 'evt-1',
        tierKey: 'PPE_200',
        ...args,
      });

    test('100 → 200 cobra a diferença (10,00 €) por price_data inline', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'PAY_PER_EVENT', participantLimit: 100 });

      const r = await upgrade();

      expect(r.success).toBe(true);
      const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(session.mode).toBe('payment');
      // As diferenças não vão para o catálogo Stripe: o número de preços a
      // manter cresceria com o quadrado dos escalões.
      expect(session.line_items[0].price_data).toEqual({
        currency: 'eur',
        unit_amount: 1000,
        tax_behavior: 'inclusive',
        product: 'prod_upgrade',
      });
      expect(session.discounts).toBeUndefined();
      expect(session.metadata).toEqual({
        userId: 'user-1',
        planKey: 'PAY_PER_EVENT',
        tierKey: 'PPE_200',
        intent: 'TIER_UPGRADE',
        eventId: 'evt-1',
      });
    });

    test('100 → sem teto cobra 25,00 €', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'PAY_PER_EVENT', participantLimit: 100 });
      await upgrade({ tierKey: 'PPE_UNLIMITED' });
      const session = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(session.line_items[0].price_data.unit_amount).toBe(2500);
    });

    test('200 → 100 recusa: não existe downgrade de escalão (ADR-034)', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'PAY_PER_EVENT', participantLimit: 200 });
      const r = await upgrade({ tierKey: 'PPE_100' });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    test('evento já sem teto: nada para onde subir', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'PAY_PER_EVENT' });
      const r = await upgrade({ tierKey: 'PPE_UNLIMITED' });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    test('evento de outro dono: recusa sem tocar na Stripe', async () => {
      armEvent({ id: 'evt-1', owner: 'outro::outro', planKey: 'PAY_PER_EVENT', participantLimit: 100 });
      const r = await upgrade();
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    test('evento que não é Por Evento: recusa — o teto do Grátis não se compra a peso', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'STARTER' });
      const r = await upgrade();
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    test('evento inexistente: recusa', async () => {
      armEvent(undefined);
      const r = await upgrade();
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    test('upgrade sobre o Pro: recusa — o Pro é ilimitado, não tem escalão', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'PAY_PER_EVENT', participantLimit: 100 });
      const r = await upgrade({ planKey: 'PRO', billingCycle: 'monthly' });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    test('sem eventId: recusa', async () => {
      armEvent({ id: 'evt-1', owner: 'user-1::user-1', planKey: 'PAY_PER_EVENT', participantLimit: 100 });
      const r = await upgrade({ eventId: undefined });
      expect(r.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });
});
