/**
 * create-billing-portal-session — o portal Stripe tem de ser amarrado à identity
 * do caller (ADR-019). Aceitar customerId do argumento permitia abrir o portal
 * de OUTRO cliente (ver faturas, cancelar, trocar cartão) — takeover de billing.
 */
jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => ({ __type: 'Get', input })),
    _mockSend: mockSend,
  };
});

jest.mock('stripe', () => {
  const mockStripe = {
    billingPortal: { sessions: { create: jest.fn() } },
  };
  const StripeCtor = jest.fn(() => mockStripe);
  return { __esModule: true, default: StripeCtor, Stripe: StripeCtor, _mockStripe: mockStripe };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { _mockStripe: mockStripe } = jest.requireMock('stripe') as {
  _mockStripe: { billingPortal: { sessions: { create: jest.Mock } } };
};

describe('create-billing-portal-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any, c?: any) => Promise<{ success: boolean; sessionUrl?: string; message: string }>;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'sub-tbl';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../create-biling-portal-session/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    mockStripe.billingPortal.sessions.create.mockReset();
    mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal.stripe/ok' });
  });

  const invoke = (args: Record<string, unknown>, sub?: string) =>
    handler({ arguments: args, identity: sub ? { sub } : undefined });

  test('usa o stripeCustomerId do caller (identity.sub) e IGNORA o customerId do argumento', async () => {
    // O registo do caller aponta para cus_OWNER; o argumento tenta cus_VICTIM.
    mockSend.mockResolvedValue({ Item: { id: { S: 'user-1' }, stripeCustomerId: { S: 'cus_OWNER' } } });

    const r = await invoke({ customerId: 'cus_VICTIM', returnUrl: 'https://app/settings' }, 'user-1');

    expect(r.success).toBe(true);
    expect(r.sessionUrl).toBe('https://portal.stripe/ok');
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_OWNER', return_url: 'https://app/settings' }),
    );
    // Confirma que o customer da vítima nunca foi usado.
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_VICTIM' }),
    );
  });

  test('sem identity.sub: recusa e não abre portal nenhum', async () => {
    const r = await invoke({ customerId: 'cus_VICTIM', returnUrl: 'https://app/settings' });
    expect(r.success).toBe(false);
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  test('caller sem subscrição/customer guardado: recusa (nada a gerir), sem abrir portal', async () => {
    mockSend.mockResolvedValue({ Item: undefined });
    const r = await invoke({ returnUrl: 'https://app/settings' }, 'user-1');
    expect(r.success).toBe(false);
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  test('sem returnUrl: recusa', async () => {
    mockSend.mockResolvedValue({ Item: { id: { S: 'user-1' }, stripeCustomerId: { S: 'cus_OWNER' } } });
    const r = await invoke({}, 'user-1');
    expect(r.success).toBe(false);
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });
});
