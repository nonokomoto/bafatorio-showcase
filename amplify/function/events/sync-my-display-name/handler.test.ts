/**
 * @file sync-my-display-name/handler.test.ts
 * @description Propaga o nome real do Cognito para as cópias desnormalizadas
 * — EventCollaborator.userName e Event.ownerName são snapshots escritos no
 * accept/create, e mudar o nome no perfil deixava-os a mentir para sempre.
 * Self-service: sem argumentos, só toca em linhas do próprio caller, e o nome
 * vem do Cognito — nunca do cliente.
 */
import { handler } from './handler';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    QueryCommand: jest.fn((input: unknown) => ({ __type: 'Query', ...(input as object) })),
    UpdateItemCommand: jest.fn((input: unknown) => ({ __type: 'Update', ...(input as object) })),
    _mockSend: mockSend,
  };
});

jest.mock('../../shared/getUserEmail', () => ({
  getUserEmail: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { getUserEmail: mockGetUserEmail } = jest.requireMock('../../shared/getUserEmail') as {
  getUserEmail: jest.Mock;
};

import { marshall } from '@aws-sdk/util-dynamodb';

const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';
const SUB = 'sub-do-caller';

const makeEvent = () => ({
  arguments: {},
  identity: { sub: SUB, claims: { username: 'username-do-caller' } },
});

const queries = () => mockSend.mock.calls.map(([c]) => c).filter((c) => c.__type === 'Query');
const updates = () => mockSend.mock.calls.map(([c]) => c).filter((c) => c.__type === 'Update');

beforeEach(() => {
  mockSend.mockReset();
  mockGetUserEmail.mockReset();
  mockGetUserEmail.mockResolvedValue({ email: 'novo@exemplo.pt', name: 'Nome Novo' });
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
  process.env.BAFATORIO_APP_USER_POOL_ID = 'test-pool';
});

describe('sync-my-display-name handler', () => {
  it('actualiza o userName das colaborações e o ownerName dos eventos do caller', async () => {
    mockSend
      // Query EventCollaborator byUserId
      .mockResolvedValueOnce({
        Items: [
          marshall({ id: 'c-1', userId: SUB, userName: 'Nome Velho' }),
          marshall({ id: 'c-2', userId: SUB, userName: 'Nome Velho' }),
        ],
      })
      // Query Event byOrganizerId
      .mockResolvedValueOnce({ Items: [marshall({ id: 'evt-1', organizerId: SUB })] })
      // 3 UpdateItem
      .mockResolvedValue({});

    const result = await handler(makeEvent() as never);

    expect(result).toEqual({ updatedCollaborations: 2, updatedEvents: 1 });

    const collabUpdates = updates().filter((u) => u.TableName === COLLABORATOR_TABLE);
    expect(collabUpdates).toHaveLength(2);
    expect(collabUpdates.map((u) => u.Key.id.S).sort()).toEqual(['c-1', 'c-2']);
    expect(collabUpdates[0].ExpressionAttributeValues[':n'].S).toBe('Nome Novo');

    const eventUpdates = updates().filter((u) => u.TableName === EVENT_TABLE);
    expect(eventUpdates).toHaveLength(1);
    expect(eventUpdates[0].Key.id.S).toBe('evt-1');
    expect(eventUpdates[0].ExpressionAttributeValues[':n'].S).toBe('Nome Novo');
  });

  it('o nome vem do Cognito do próprio caller — nunca de um argumento', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({ Items: [] });

    await handler({
      arguments: { name: 'Impostor Injetado' },
      identity: { sub: SUB, claims: { username: 'username-do-caller' } },
    } as never);

    expect(mockGetUserEmail).toHaveBeenCalledWith({
      userPoolId: 'test-pool',
      username: 'username-do-caller',
    });
    // Nenhum update: as queries devolveram vazio; e o arg foi ignorado.
    expect(updates()).toHaveLength(0);
  });

  it('as queries são restritas ao próprio caller (byUserId e byOrganizerId)', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({ Items: [] });

    await handler(makeEvent() as never);

    const [collabQuery, eventQuery] = queries();
    expect(collabQuery.IndexName).toBe('byUserId');
    expect(collabQuery.ExpressionAttributeValues[':uid'].S).toBe(SUB);
    expect(eventQuery.IndexName).toBe('byOrganizerId');
    expect(eventQuery.ExpressionAttributeValues[':uid'].S).toBe(SUB);
  });

  it('sem nome no Cognito não escreve nada — não apaga snapshots com null', async () => {
    mockGetUserEmail.mockResolvedValue({ email: 'novo@exemplo.pt', name: undefined });

    const result = await handler(makeEvent() as never);

    expect(result).toEqual({ updatedCollaborations: 0, updatedEvents: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('falha do Cognito propaga — o caller fica a saber que não sincronizou', async () => {
    mockGetUserEmail.mockRejectedValue(new Error('Failed to get user email from Cognito'));

    await expect(handler(makeEvent() as never)).rejects.toThrow('Failed to get user email');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sem identity recusa', async () => {
    await expect(handler({ arguments: {}, identity: {} } as never)).rejects.toThrow(
      'User identity not found'
    );
  });
});
