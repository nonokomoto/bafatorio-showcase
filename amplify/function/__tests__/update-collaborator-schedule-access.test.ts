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

// A verificação de dono passa pelo resolveEventAccess (ADR-015).
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
  handler = require('../update-collaborator-schedule-access/handler').handler;
});

beforeEach(() => {
  mockSend.mockReset();
  resolveEventAccess.mockReset();
  resolveEventAccess.mockResolvedValue({ role: 'OWNER' });
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: { collaboratorId: 'c-1', canViewTeamSchedule: true, ...overrides },
  identity: { sub: 'owner-1' },
});

const collaboratorItem = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'c-1',
    eventId: 'evt-1',
    userId: 'staff-1',
    role: 'STAFF_LOGISTICS',
    status: 'ACCEPTED',
    canViewTeamSchedule: false,
    ...overrides,
  });

describe('update-collaborator-schedule-access', () => {
  it('owner liga a flag num STAFF_LOGISTICS', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: collaboratorItem() }) // get collaborator
      .mockResolvedValueOnce({ Attributes: collaboratorItem({ canViewTeamSchedule: true }) }); // update

    const result = await handler(makeEvent({ canViewTeamSchedule: true }));

    expect(result.canViewTeamSchedule).toBe(true);
    // Só o get do colaborador + o update — a verificação de dono já não faz GetItem.
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('rejeita quem não é o dono do evento', async () => {
    resolveEventAccess.mockResolvedValue({ role: 'CO_MANAGER' });
    mockSend.mockResolvedValueOnce({ Item: collaboratorItem() });

    await expect(handler(makeEvent())).rejects.toThrow('Unauthorized');
  });

  it('rejeita alterar a flag de um CO_MANAGER (vê sempre tudo)', async () => {
    mockSend.mockResolvedValueOnce({ Item: collaboratorItem({ role: 'CO_MANAGER' }) });

    await expect(handler(makeEvent())).rejects.toThrow('STAFF_LOGISTICS');
    // Recusa no role, antes de resolver o acesso ao evento.
    expect(resolveEventAccess).not.toHaveBeenCalled();
  });

  it('rejeita colaborador inexistente', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(handler(makeEvent())).rejects.toThrow('not found');
  });

  it('rejeita sem identidade', async () => {
    await expect(
      handler({ arguments: { collaboratorId: 'c-1', canViewTeamSchedule: true }, identity: {} })
    ).rejects.toThrow('identity');
  });

  it('exige um booleano em canViewTeamSchedule', async () => {
    await expect(
      handler({ arguments: { collaboratorId: 'c-1' }, identity: { sub: 'owner-1' } })
    ).rejects.toThrow('canViewTeamSchedule');
  });
});
