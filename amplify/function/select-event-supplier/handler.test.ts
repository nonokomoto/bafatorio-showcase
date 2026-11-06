/**
 * select-event-supplier — gate de billing (§4): janela de escrita + limite de
 * fornecedores (COUNT no GSI byEventId) antes do Put.
 */
import { marshall } from '@aws-sdk/util-dynamodb';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  GetItemCommand: jest.fn((input) => ({ input, __type: 'Get' })),
  PutItemCommand: jest.fn((input) => ({ input, __type: 'Put' })),
  QueryCommand: jest.fn((input) => ({ input, __type: 'Query' })),
}));

const mockEnsureEventWritable = jest.fn();
jest.mock('../shared/entitlementGate', () => {
  const actual = jest.requireActual('../shared/entitlementGate');
  return {
    ...actual,
    ensureEventWritable: (...args: unknown[]) => mockEnsureEventWritable(...args),
  };
});

import { handler } from './handler';
import { PLANS } from '../shared/plans';

const invoke = () =>
  handler({
    arguments: { eventId: 'evt-1', supplierId: 'sup-1', quoteAmount: 100 },
    identity: { sub: 'user-1' },
  } as never);

beforeEach(() => {
  mockSend.mockReset();
  mockEnsureEventWritable.mockReset();
  // 1º send: GetItem do Event (caller é o dono)
  mockSend.mockResolvedValueOnce({ Item: marshall({ id: 'evt-1', owner: 'user-1::user-1' }) });
});

describe('select-event-supplier — gate de billing', () => {
  test('janela fechada: recusa antes de qualquer escrita', async () => {
    mockEnsureEventWritable.mockRejectedValueOnce(new Error('BILLING_GATE:WINDOW_EXPIRED'));
    await expect(invoke()).rejects.toThrow('BILLING_GATE:WINDOW_EXPIRED');
    expect(mockSend).toHaveBeenCalledTimes(1); // só o GetItem do Event
  });

  test('11.º fornecedor no Starter: recusa LIMIT_SUPPLIERS (COUNT real do GSI)', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements,
      eventRecord: {},
    });
    mockSend
      .mockResolvedValueOnce({ Item: marshall({ id: 'sup-1' }) }) // supplier existe
      .mockResolvedValueOnce({ Items: [] })                        // ainda não ligado
      .mockResolvedValueOnce({ Count: 10 });                       // COUNT byEventId
    await expect(invoke()).rejects.toThrow('BILLING_GATE:LIMIT_SUPPLIERS');
  });

  test('gate aberto e abaixo do limite: cria o EventSupplier', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements,
      eventRecord: {},
    });
    mockSend
      .mockResolvedValueOnce({ Item: marshall({ id: 'sup-1' }) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Count: 9 })
      .mockResolvedValueOnce({}); // PutItem
    const result = await invoke();
    expect(result.eventId).toBe('evt-1');
    expect(result.supplierId).toBe('sup-1');
    const putCall = mockSend.mock.calls[4]?.[0] ?? mockSend.mock.calls[3][0];
    expect(putCall.__type).toBe('Put');
  });
});
