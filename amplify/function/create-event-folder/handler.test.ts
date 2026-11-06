/**
 * create-event-folder — gate de billing (§4): janela de escrita + limite de
 * pastas (COUNT byEventId); a pasta default (sistema) não conta para o limite.
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

const invoke = (args: Record<string, unknown> = {}) =>
  handler({
    arguments: { eventId: 'evt-1', name: 'Nova pasta', ...args },
    identity: { sub: 'user-1' },
  } as never);

beforeEach(() => {
  mockSend.mockReset();
  mockEnsureEventWritable.mockReset();
  // GetItem do Event: caller é o dono
  mockSend.mockResolvedValueOnce({ Item: marshall({ id: 'evt-1', owner: 'user-1::user-1' }) });
});

describe('create-event-folder — gate de billing', () => {
  test('janela fechada: recusa antes de contar ou escrever', async () => {
    mockEnsureEventWritable.mockRejectedValueOnce(new Error('BILLING_GATE:PRO_PAUSED'));
    await expect(invoke()).rejects.toThrow('BILLING_GATE:PRO_PAUSED');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  // As pastas saíram do gate: o Starter deixou de ter teto. A janela de escrita
  // (teste acima) continua a ser o que trava — não o número de pastas.
  test('Starter cria pastas sem teto', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements,
      eventRecord: {},
    });
    mockSend
      .mockResolvedValueOnce({ Count: 200 }) // COUNT byEventId (sem defaults)
      .mockResolvedValueOnce({});            // PutItem
    await expect(invoke()).resolves.toBeTruthy();
  });

  // Sem teto não há nada a contar: a Query tem um FilterExpression que lê todas
  // as pastas do evento antes de filtrar, e pagá-la para alimentar uma
  // comparação contra Infinity era desperdício em cada pasta criada.
  test('sem teto de pastas não conta pastas nenhumas', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements, // folders: Infinity (ADR-038)
      eventRecord: {},
    });
    mockSend.mockResolvedValueOnce({}); // só o PutItem
    await expect(invoke()).resolves.toBeTruthy();

    expect(mockSend.mock.calls.filter((c) => c[0]?.input?.Select === 'COUNT')).toHaveLength(0);
  });

  // Com teto (se voltar a haver), a contagem tem de excluir a pasta default.
  test('a contagem do limite exclui a pasta default (não consome slot do plano)', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: { ...PLANS.STARTER.entitlements, folders: 2 },
      eventRecord: {},
    });
    mockSend
      .mockResolvedValueOnce({ Count: 1 }) // COUNT já filtrado: 1 pasta de utilizador
      .mockResolvedValueOnce({});          // PutItem da 2.ª pasta
    await expect(invoke()).resolves.toBeTruthy();

    const countCall = mockSend.mock.calls.find((c) => c[0]?.input?.Select === 'COUNT');
    // O filtro tem de excluir isDefault=true, senão a default consumia 1 dos 2 slots
    expect(countCall[0].input.FilterExpression).toBe('NOT isDefault = :isDefault');
  });

  test('com teto atingido, recusa (a imposição continua de pé)', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: { ...PLANS.STARTER.entitlements, folders: 2 },
      eventRecord: {},
    });
    mockSend.mockResolvedValueOnce({ Count: 2 }); // já tem as 2 do teto
    await expect(invoke()).rejects.toThrow('BILLING_GATE:LIMIT_FOLDERS');
  });

  test('pasta default (sistema) não passa pelo limite', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements,
      eventRecord: {},
    });
    mockSend
      .mockResolvedValueOnce({ Items: [] }) // check default existente (idempotência)
      .mockResolvedValueOnce({});           // PutItem
    const result = await invoke({ isDefault: true });
    expect(result).toBeTruthy();
    // Nenhuma das queries foi um COUNT (o limite não correu)
    const countCalls = mockSend.mock.calls.filter((c) => c[0]?.input?.Select === 'COUNT');
    expect(countCalls).toHaveLength(0);
  });
});
