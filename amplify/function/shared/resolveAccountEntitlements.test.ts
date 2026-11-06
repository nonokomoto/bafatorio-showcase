/**
 * deriveAccountEntitlements — gate de CONTA: "podes criar um evento?" (§3/§4).
 *
 * Complementa deriveEventEntitlements (gate por evento): aqui os inputs são o
 * estado da conta — subscrição, contagem de eventos, compras por consumir.
 */
import { deriveAccountEntitlements, resolveAccountEntitlements } from './resolveAccountEntitlements';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => ({ __type: 'GetItem', ...(input as object) })),
    QueryCommand: jest.fn((input: unknown) => ({ __type: 'Query', ...(input as object) })),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};

const proSub = (status: string) => ({ id: 'user-1', planName: 'PRO', status });

describe('deriveAccountEntitlements', () => {
  test('Pro active: cria sempre, eventos ilimitados', () => {
    const r = deriveAccountEntitlements({
      subscription: proSub('active'), ownedEventCount: 42, unconsumedPurchaseCount: 0,
    });
    expect(r).toEqual({ planKey: 'PRO', canCreateEvent: true, reason: 'PRO_ACTIVE' });
  });

  test('Pro past_due mantém acesso durante o dunning (§4b)', () => {
    const r = deriveAccountEntitlements({
      subscription: proSub('past_due'), ownedEventCount: 3, unconsumedPurchaseCount: 0,
    });
    expect(r.canCreateEvent).toBe(true);
    expect(r.reason).toBe('PRO_ACTIVE');
  });

  test('compra Pay-per-event por consumir cria evento — a compra não expira (§4)', () => {
    const r = deriveAccountEntitlements({
      subscription: null, ownedEventCount: 5, unconsumedPurchaseCount: 1,
    });
    expect(r).toEqual({ planKey: 'PAY_PER_EVENT', canCreateEvent: true, reason: 'PURCHASE_AVAILABLE' });
  });

  test('compra por consumir vale mesmo com Pro em pause — coberturas independentes', () => {
    const r = deriveAccountEntitlements({
      subscription: proSub('paused'), ownedEventCount: 5, unconsumedPurchaseCount: 2,
    });
    expect(r.canCreateEvent).toBe(true);
    expect(r.reason).toBe('PURCHASE_AVAILABLE');
  });

  test('Pro paused sem compras: sem escrita → não cria (§1 save offer)', () => {
    const r = deriveAccountEntitlements({
      subscription: proSub('paused'), ownedEventCount: 0, unconsumedPurchaseCount: 0,
    });
    expect(r).toEqual({ planKey: 'PRO', canCreateEvent: false, reason: 'PRO_PAUSED' });
  });

  test('Pro canceled cai para Starter: conta a contagem de eventos', () => {
    const withRoom = deriveAccountEntitlements({
      subscription: proSub('canceled'), ownedEventCount: 0, unconsumedPurchaseCount: 0,
    });
    expect(withRoom).toEqual({ planKey: 'STARTER', canCreateEvent: true, reason: 'WITHIN_STARTER_LIMIT' });

    const atLimit = deriveAccountEntitlements({
      subscription: proSub('unpaid'), ownedEventCount: 1, unconsumedPurchaseCount: 0,
    });
    expect(atLimit).toEqual({ planKey: 'STARTER', canCreateEvent: false, reason: 'STARTER_LIMIT_REACHED' });
  });

  test('Starter puro: 1 evento grátis, o 2.º é negado (§2)', () => {
    const first = deriveAccountEntitlements({
      subscription: null, ownedEventCount: 0, unconsumedPurchaseCount: 0,
    });
    expect(first.canCreateEvent).toBe(true);
    expect(first.reason).toBe('WITHIN_STARTER_LIMIT');

    const second = deriveAccountEntitlements({
      subscription: null, ownedEventCount: 1, unconsumedPurchaseCount: 0,
    });
    expect(second.canCreateEvent).toBe(false);
    expect(second.reason).toBe('STARTER_LIMIT_REACHED');
  });

  test('planName legado não dá acesso — fail closed para Starter (§8)', () => {
    const r = deriveAccountEntitlements({
      subscription: { id: 'user-1', planName: 'Plano Organizador', status: 'active' },
      ownedEventCount: 1,
      unconsumedPurchaseCount: 0,
    });
    expect(r).toEqual({ planKey: 'STARTER', canCreateEvent: false, reason: 'STARTER_LIMIT_REACHED' });
  });

  test('ADMIN: cria sempre, independente de contagens e status (ADR-036)', () => {
    const r = deriveAccountEntitlements({
      subscription: { id: 'admin-1', planName: 'ADMIN' }, // sem status — não há ciclo Stripe
      ownedEventCount: 99,
      unconsumedPurchaseCount: 0,
    });
    expect(r).toEqual({ planKey: 'PRO', canCreateEvent: true, reason: 'ADMIN' });
  });

  test('ADMIN precede compras pendentes — nunca consome uma PlanPurchase (ADR-036)', () => {
    const r = deriveAccountEntitlements({
      subscription: { id: 'admin-1', planName: 'ADMIN', status: 'active' },
      ownedEventCount: 0,
      unconsumedPurchaseCount: 2,
    });
    // reason ADMIN e não PURCHASE_AVAILABLE: o create-event só consome
    // compras quando o reason é PURCHASE_AVAILABLE.
    expect(r.reason).toBe('ADMIN');
    expect(r.canCreateEvent).toBe(true);
  });

  test('status desconhecido no Pro (ex.: incomplete) não cobre escrita', () => {
    const r = deriveAccountEntitlements({
      subscription: proSub('incomplete'), ownedEventCount: 0, unconsumedPurchaseCount: 0,
    });
    expect(r.reason).toBe('WITHIN_STARTER_LIMIT'); // cai para Starter, não para PRO_PAUSED
    expect(r.planKey).toBe('STARTER');
  });
});

/**
 * resolveAccountEntitlements — wrapper com I/O (prometido no docblock do módulo):
 * lê subscrição, contagem de eventos e compras, e delega no núcleo puro.
 * É a única fonte das 3 leituras — create-event e getAccountAccess consomem daqui.
 */
describe('resolveAccountEntitlements (I/O)', () => {
  const { marshall } = jest.requireActual('@aws-sdk/util-dynamodb');
  const tables = {
    eventTableName: 'event-table',
    subscriptionTableName: 'subscription-table',
    planPurchaseTableName: 'plan-purchase-table',
  };

  beforeEach(() => mockSend.mockReset());

  test('Pro ativo: curto-circuito — só lê a subscrição, sem queries de contagem/compras', async () => {
    mockSend.mockResolvedValueOnce({ Item: marshall({ id: 'user-1', planName: 'PRO', status: 'active' }) });

    const r = await resolveAccountEntitlements({ userId: 'user-1', ...tables });

    expect(r.reason).toBe('PRO_ACTIVE');
    expect(r.canCreateEvent).toBe(true);
    expect(r.firstUnconsumedPurchaseId).toBeNull();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].__type).toBe('GetItem');
    expect(mockSend.mock.calls[0][0].TableName).toBe('subscription-table');
  });

  test('ADMIN: curto-circuito como o Pro — 1 leitura, sem consumo de compras (ADR-036)', async () => {
    mockSend.mockResolvedValueOnce({ Item: marshall({ id: 'admin-1', planName: 'ADMIN' }) });

    const r = await resolveAccountEntitlements({ userId: 'admin-1', ...tables });

    expect(r.reason).toBe('ADMIN');
    expect(r.canCreateEvent).toBe(true);
    expect(r.firstUnconsumedPurchaseId).toBeNull();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('sem subscrição: lê contagem e compras, devolve o veredicto Starter', async () => {
    mockSend
      .mockResolvedValueOnce({})                        // GetItem subscrição
      .mockResolvedValueOnce({ Count: 1 })              // Query contagem eventos
      .mockResolvedValueOnce({ Count: 0, Items: [] });  // Query compras

    const r = await resolveAccountEntitlements({ userId: 'user-1', ...tables });

    expect(r).toEqual({
      planKey: 'STARTER',
      canCreateEvent: false,
      reason: 'STARTER_LIMIT_REACHED',
      firstUnconsumedPurchaseId: null,
      firstUnconsumedPurchaseTierKey: null,
    });
    expect(mockSend).toHaveBeenCalledTimes(3);
    const queries = mockSend.mock.calls.map(([c]) => c).filter((c) => c.__type === 'Query');
    expect(queries.map((q) => q.TableName).sort()).toEqual(['event-table', 'plan-purchase-table']);
  });

  test('compra por consumir: devolve o id da primeira compra para o consumo transacional', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Count: 1 })
      .mockResolvedValueOnce({
        Count: 1,
        Items: [marshall({ id: 'purchase-1', userId: 'user-1', planKey: 'PAY_PER_EVENT', tierKey: 'PPE_200' })],
      });

    const r = await resolveAccountEntitlements({ userId: 'user-1', ...tables });

    expect(r.reason).toBe('PURCHASE_AVAILABLE');
    expect(r.planKey).toBe('PAY_PER_EVENT');
    expect(r.firstUnconsumedPurchaseId).toBe('purchase-1');
    // O escalão sai da MESMA compra que vai ser consumida — é ele que fixa o
    // teto do evento (ADR-038).
    expect(r.firstUnconsumedPurchaseTierKey).toBe('PPE_200');
  });

  test('compra anterior aos escalões: sem tierKey, o evento nasce sem teto', () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Count: 1 })
      .mockResolvedValueOnce({
        Count: 1,
        Items: [marshall({ id: 'purchase-1', userId: 'user-1', planKey: 'PAY_PER_EVENT' })],
      });

    return resolveAccountEntitlements({ userId: 'user-1', ...tables }).then((r) => {
      expect(r.firstUnconsumedPurchaseId).toBe('purchase-1');
      expect(r.firstUnconsumedPurchaseTierKey).toBeNull();
    });
  });

  test('a query de compras exclui consumidas E reembolsadas (refund revoga o direito)', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Count: 0 })
      .mockResolvedValueOnce({ Count: 0, Items: [] });

    await resolveAccountEntitlements({ userId: 'user-1', ...tables });

    const purchaseQuery = mockSend.mock.calls
      .map(([c]) => c)
      .find((c) => c.__type === 'Query' && c.TableName === 'plan-purchase-table');
    expect(purchaseQuery.FilterExpression).toBe(
      'attribute_not_exists(consumedByEventId) AND attribute_not_exists(refundedAt)'
    );
  });
});
