/**
 * get-account-access — query de acesso de CONTA para a UI (§3): expõe a mesma
 * decisão do gate do create-event (resolveAccountEntitlements) sem efeitos.
 */
const mockResolveAccount = jest.fn();
jest.mock('../../shared/resolveAccountEntitlements', () => ({
  resolveAccountEntitlements: (...args: unknown[]) => mockResolveAccount(...args),
}));

import { handler } from './handler';

const buildEvent = (identity: Record<string, unknown> | null = { sub: 'user-1' }) =>
  ({ arguments: {}, identity }) as never;

beforeEach(() => {
  mockResolveAccount.mockReset();
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'Event-tbl';
  process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'Sub-tbl';
  process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME = 'PP-tbl';
});

describe('get-account-access', () => {
  test('sem identity: UNAUTHENTICATED sem tocar nas tabelas', async () => {
    const result = await handler(buildEvent(null));
    expect(result).toEqual({ planKey: null, canCreateEvent: false, reason: 'UNAUTHENTICATED' });
    expect(mockResolveAccount).not.toHaveBeenCalled();
  });

  test('espelha a decisão da conta e passa as tabelas certas', async () => {
    mockResolveAccount.mockResolvedValueOnce({
      planKey: 'STARTER',
      canCreateEvent: false,
      reason: 'STARTER_LIMIT_REACHED',
      firstUnconsumedPurchaseId: null,
    });
    const result = await handler(buildEvent());
    expect(result).toEqual({
      planKey: 'STARTER',
      canCreateEvent: false,
      reason: 'STARTER_LIMIT_REACHED',
    });
    expect(mockResolveAccount).toHaveBeenCalledWith({
      userId: 'user-1',
      eventTableName: 'Event-tbl',
      subscriptionTableName: 'Sub-tbl',
      planPurchaseTableName: 'PP-tbl',
    });
  });

  test('não expõe firstUnconsumedPurchaseId (detalhe interno do consumo)', async () => {
    mockResolveAccount.mockResolvedValueOnce({
      planKey: 'PAY_PER_EVENT',
      canCreateEvent: true,
      reason: 'PURCHASE_AVAILABLE',
      firstUnconsumedPurchaseId: 'pp-123',
    });
    const result = await handler(buildEvent());
    expect(result).toEqual({
      planKey: 'PAY_PER_EVENT',
      canCreateEvent: true,
      reason: 'PURCHASE_AVAILABLE',
    });
  });
});
