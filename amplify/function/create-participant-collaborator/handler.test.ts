/**
 * create-participant-collaborator — gate de billing (§4): janela de escrita
 * + limite de participantes do plano do dono, depois do check de role.
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
const mockEnsureWithinLimit = jest.fn();
jest.mock('../shared/entitlementGate', () => ({
  ensureEventWritable: (...args: unknown[]) => mockEnsureEventWritable(...args),
  ensureWithinLimit: (...args: unknown[]) => mockEnsureWithinLimit(...args),
}));

import { handler } from './handler';
import { PLANS } from '../shared/plans';

const invoke = () =>
  (handler as unknown as (e: unknown, c: unknown, cb: unknown) => Promise<unknown>)(
    {
      arguments: { eventId: 'evt-1', participantName: 'Ana' },
      identity: { sub: 'user-1' },
    },
    {},
    () => {}
  );

beforeEach(() => {
  mockSend.mockReset();
  mockEnsureEventWritable.mockReset();
  mockEnsureWithinLimit.mockReset();
  // verifyCreateAccess: dono do evento (1 GetItem com owner)
  mockSend.mockResolvedValueOnce({ Item: marshall({ owner: 'user-1::user-1' }) });
});

describe('create-participant-collaborator — gate de billing', () => {
  test('janela fechada: recusa BILLING_GATE antes de escrever', async () => {
    mockEnsureEventWritable.mockRejectedValueOnce(new Error('BILLING_GATE:WINDOW_EXPIRED'));
    await expect(invoke()).rejects.toThrow('BILLING_GATE:WINDOW_EXPIRED');
    // Só o GetItem do verifyCreateAccess correu — nenhum PutItem
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('limite Starter atingido: recusa LIMIT_PARTICIPANTS antes de escrever', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements,
      eventRecord: { participantCount: 25 },
    });
    mockEnsureWithinLimit.mockImplementationOnce(() => {
      throw new Error('BILLING_GATE:LIMIT_PARTICIPANTS');
    });
    await expect(invoke()).rejects.toThrow('BILLING_GATE:LIMIT_PARTICIPANTS');
    expect(mockEnsureWithinLimit).toHaveBeenCalledWith(
      PLANS.STARTER.entitlements,
      'participants',
      25
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('gate aberto: cria o participante (contagem do eventRecord, sem reads extra)', async () => {
    mockEnsureEventWritable.mockResolvedValueOnce({
      entitlements: PLANS.STARTER.entitlements,
      eventRecord: { participantCount: 3 },
    });
    mockSend.mockResolvedValueOnce({}); // PutItem
    const result = (await invoke()) as { participantName?: string };
    expect(result.participantName).toBe('Ana');
    expect(mockEnsureWithinLimit).toHaveBeenCalledWith(PLANS.STARTER.entitlements, 'participants', 3);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
