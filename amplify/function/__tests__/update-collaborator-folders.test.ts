import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    UpdateItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

// Owner-check via resolveEventAccess (ADR-015).
jest.mock('../shared/resolveEventAccess', () => ({
  resolveEventAccess: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as {
  resolveEventAccess: jest.Mock;
};

const COLLABORATOR_TABLE = 'test-collab-table';
const EVENT_TABLE = 'test-event-table';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (event: any) => Promise<any>;

beforeAll(() => {
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  handler = require('../update-collaborator-folders/handler').handler;
});

beforeEach(() => {
  mockSend.mockReset();
  resolveEventAccess.mockReset();
  resolveEventAccess.mockResolvedValue({ role: 'OWNER' });
});

const makeEvent = (sharedFolderIds: string[] = ['f-1', 'f-2']) => ({
  arguments: { collaboratorId: 'c-1', sharedFolderIds },
  identity: { sub: 'owner-1' },
});

const collaboratorItem = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'c-1',
    eventId: 'evt-1',
    userId: 'staff-1',
    role: 'STAFF_LOGISTICS',
    status: 'ACCEPTED',
    sharedFolderIds: [],
    ...overrides,
  });

describe('update-collaborator-folders', () => {
  it('owner atualiza as pastas partilhadas', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: collaboratorItem() })
      .mockResolvedValueOnce({ Attributes: collaboratorItem({ sharedFolderIds: ['f-1', 'f-2'] }) });

    const result = await handler(makeEvent(['f-1', 'f-2']));

    expect(result.sharedFolderIds).toEqual(['f-1', 'f-2']);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('rejeita quem não é o dono do evento', async () => {
    resolveEventAccess.mockResolvedValue({ role: 'CO_MANAGER' });
    mockSend.mockResolvedValueOnce({ Item: collaboratorItem() });

    await expect(handler(makeEvent())).rejects.toThrow('Unauthorized');
  });

  it('rejeita partilhar pastas com STAFF_CHECKIN', async () => {
    mockSend.mockResolvedValueOnce({ Item: collaboratorItem({ role: 'STAFF_CHECKIN' }) });

    await expect(handler(makeEvent())).rejects.toThrow('CO_MANAGER and STAFF_LOGISTICS');
    expect(resolveEventAccess).not.toHaveBeenCalled();
  });

  it('rejeita colaborador inexistente', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(handler(makeEvent())).rejects.toThrow('not found');
  });

  it('rejeita sem identidade', async () => {
    await expect(
      handler({ arguments: { collaboratorId: 'c-1', sharedFolderIds: [] }, identity: {} })
    ).rejects.toThrow('identity');
  });
});
