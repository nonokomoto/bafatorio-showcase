/**
 * update-event — edição gated: role (event:edit) + janela de escrita (§4).
 * Substitui a mutation automática do modelo Event (disableOperations(['update'])).
 */
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  UpdateItemCommand: jest.fn((input) => ({ input })),
}));

const mockResolveEventAccess = jest.fn();
jest.mock('../../shared/resolveEventAccess', () => ({
  resolveEventAccess: (...args: unknown[]) => mockResolveEventAccess(...args),
}));

const mockEnsureEventWritable = jest.fn();
jest.mock('../../shared/entitlementGate', () => ({
  ...jest.requireActual('../../shared/entitlementGate'),
  ensureEventWritable: (...args: unknown[]) => mockEnsureEventWritable(...args),
}));

import { handler } from './handler';

const buildEvent = (
  args: Record<string, unknown>,
  identity: Record<string, unknown> | null = { sub: 'user-1', username: 'user-1' }
) =>
  ({
    arguments: { eventId: 'evt-1', ...args },
    identity,
  }) as unknown as AppSyncResolverEvent<Record<string, unknown>>;

const accessGranted = (allowed = true) => ({
  role: allowed ? 'OWNER' : 'STAFF_CHECKIN',
  eventOwner: 'user-1',
  eventRecord: { id: 'evt-1', owner: 'user-1::user-1' },
  collaboratorRecord: null,
  sharedSupplierIds: [],
  hasPermission: jest.fn(() => allowed),
});

beforeEach(() => {
  mockSend.mockReset();
  mockResolveEventAccess.mockReset();
  mockEnsureEventWritable.mockReset();
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'Event-tbl';
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = 'Collab-tbl';
  process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'Sub-tbl';
});

describe('update-event handler', () => {
  test('sem identity: UNAUTHENTICATED, sem tocar no DynamoDB', async () => {
    const result = await handler(buildEvent({ eventTitle: 'X' }, null));
    expect(result).toEqual({ success: false, message: 'UNAUTHENTICATED' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('role sem event:edit: FORBIDDEN antes do gate de billing', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted(false));
    const result = await handler(buildEvent({ eventTitle: 'X' }));
    expect(result).toEqual({ success: false, message: 'FORBIDDEN' });
    expect(mockEnsureEventWritable).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('janela fechada: devolve a recusa do gate como message', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockRejectedValueOnce(new Error('BILLING_GATE:WINDOW_EXPIRED'));
    const result = await handler(buildEvent({ eventTitle: 'X' }));
    expect(result).toEqual({ success: false, message: 'BILLING_GATE:WINDOW_EXPIRED' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('erro não-gate propaga (fail fast, não vira success:false silencioso)', async () => {
    mockResolveEventAccess.mockRejectedValueOnce(new Error('Event not found'));
    await expect(handler(buildEvent({ eventTitle: 'X' }))).rejects.toThrow('Event not found');
  });

  test('sucesso: atualiza só os campos do cliente e devolve o evento novo', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockResolvedValueOnce({ writable: true, reason: 'WITHIN_WINDOW' });
    mockSend.mockResolvedValueOnce({
      Attributes: { id: { S: 'evt-1' }, eventTitle: { S: 'Novo título' } },
    });

    const result = await handler(
      buildEvent({ eventTitle: 'Novo título', budget: 500, description: undefined })
    );

    expect(result.success).toBe(true);
    expect(result.event).toEqual({ id: 'evt-1', eventTitle: 'Novo título' });

    const { input } = mockSend.mock.calls[0][0];
    expect(input.TableName).toBe('Event-tbl');
    expect(unmarshall(input.Key)).toEqual({ id: 'evt-1' });
    expect(input.ReturnValues).toBe('ALL_NEW');
    // Só existe se o item existir — update nunca cria um evento fantasma.
    expect(input.ConditionExpression).toBe('attribute_exists(id)');

    const values = unmarshall(input.ExpressionAttributeValues);
    expect(values[':eventTitle']).toBe('Novo título');
    expect(values[':budget']).toBe(500);
    expect(values[':updatedAt']).toEqual(expect.any(String));
    // undefined não entra no UpdateExpression (não apaga campos por omissão)
    expect(input.UpdateExpression).not.toContain('description');
  });

  test('só campos do allowlist entram no update — autoridade do servidor e campos desconhecidos ficam fora', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockResolvedValueOnce({ writable: true, reason: 'WITHIN_WINDOW' });
    mockSend.mockResolvedValueOnce({ Attributes: { id: { S: 'evt-1' } } });

    await handler(
      buildEvent({
        eventTitle: 'X',
        planKey: 'PRO',
        owner: 'attacker::attacker',
        organizerId: 'attacker',
        createdAt: '2020-01-01T00:00:00Z',
        participantCount: 0,
        id: 'evt-2',
        // Campo futuro/desconhecido: allowlist fail-closed ignora-o por defeito
        billingOverride: 'yes',
      })
    );

    const { input } = mockSend.mock.calls[0][0];
    for (const blocked of [
      'planKey',
      'owner',
      'organizerId',
      'createdAt',
      'participantCount',
      'billingOverride',
    ]) {
      expect(input.UpdateExpression).not.toContain(blocked);
    }
    expect(unmarshall(input.Key)).toEqual({ id: 'evt-1' });
  });

  test('eventTitle null: INVALID_EVENT_TITLE sem tocar no DynamoDB (fail fast)', async () => {
    // Um documento GraphQL que declare $eventTitle sem o fornecer chega aqui
    // como null explícito — gravá-lo apagaria o título (data loss 2026-07-14).
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockResolvedValueOnce({ writable: true, reason: 'WITHIN_WINDOW' });

    const result = await handler(buildEvent({ eventTitle: null, eventStatus: 'COMPLETED' }));

    expect(result).toEqual({ success: false, message: 'INVALID_EVENT_TITLE' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('eventTitle vazio/whitespace: INVALID_EVENT_TITLE', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockResolvedValueOnce({ writable: true, reason: 'WITHIN_WINDOW' });

    const result = await handler(buildEvent({ eventTitle: '   ' }));

    expect(result).toEqual({ success: false, message: 'INVALID_EVENT_TITLE' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('eventTitle ausente (undefined): update segue sem tocar no título', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockResolvedValueOnce({ writable: true, reason: 'WITHIN_WINDOW' });
    mockSend.mockResolvedValueOnce({ Attributes: { id: { S: 'evt-1' } } });

    const result = await handler(buildEvent({ eventStatus: 'COMPLETED' }));

    expect(result.success).toBe(true);
    const { input } = mockSend.mock.calls[0][0];
    expect(input.UpdateExpression).not.toContain('eventTitle');
  });

  test('gate de janela recebe o eventId, as tabelas certas e o eventRecord pré-carregado', async () => {
    mockResolveEventAccess.mockResolvedValueOnce(accessGranted());
    mockEnsureEventWritable.mockResolvedValueOnce({ writable: true, reason: 'WITHIN_WINDOW' });
    mockSend.mockResolvedValueOnce({ Attributes: { id: { S: 'evt-1' } } });

    await handler(buildEvent({ eventTitle: 'X' }));

    expect(mockEnsureEventWritable).toHaveBeenCalledWith({
      eventTableName: 'Event-tbl',
      subscriptionTableName: 'Sub-tbl',
      eventId: 'evt-1',
      // o registo já carregado pelo resolveEventAccess evita o segundo GetItem
      eventRecord: { id: 'evt-1', owner: 'user-1::user-1' },
    });
  });
});
