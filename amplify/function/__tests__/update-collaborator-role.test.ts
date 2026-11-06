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

// A verificação de dono passa pelo resolveEventAccess (ADR-015) — mocka-se
// diretamente, como no list-event-schedule.
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
  handler = require('../update-collaborator-role/handler').handler;
});

beforeEach(() => {
  mockSend.mockReset();
  resolveEventAccess.mockReset();
  resolveEventAccess.mockResolvedValue({ role: 'OWNER' });
});

const makeEvent = (newRole: string) => ({
  arguments: { collaboratorId: 'c-1', newRole },
  identity: { sub: 'owner-1' },
});

const collaboratorItem = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'c-1',
    eventId: 'evt-1',
    userId: 'staff-1',
    role: 'STAFF_LOGISTICS',
    status: 'ACCEPTED',
    sharedFolderIds: ['f-1'],
    sharedSupplierIds: ['s-1'],
    canViewTeamSchedule: true,
    ...overrides,
  });

// Devolve o input do UpdateItemCommand (2.ª chamada ao mockSend:
// get collab → update; a verificação de dono já não faz GetItem aqui).
const lastUpdateInput = () =>
  mockSend.mock.calls.map((c) => c[0]).find((input) => input?.UpdateExpression);

const primeUpdate = (collabOverrides: Record<string, unknown> = {}) => {
  mockSend
    .mockResolvedValueOnce({ Item: collaboratorItem(collabOverrides) }) // get collaborator
    .mockResolvedValueOnce({ Attributes: collaboratorItem(collabOverrides) }); // update
};

describe('update-collaborator-role — autorização', () => {
  it('rejeita quem não é o dono do evento', async () => {
    resolveEventAccess.mockResolvedValue({ role: 'CO_MANAGER' });
    mockSend.mockResolvedValueOnce({ Item: collaboratorItem() });

    await expect(handler(makeEvent('CO_MANAGER'))).rejects.toThrow('Unauthorized');
  });
});

describe('update-collaborator-role — limpeza da flag da agenda', () => {
  it('limpa canViewTeamSchedule ao mudar de STAFF_LOGISTICS para CO_MANAGER', async () => {
    primeUpdate();

    await handler(makeEvent('CO_MANAGER'));

    const update = lastUpdateInput();
    expect(update.UpdateExpression).toContain('canViewTeamSchedule');
    expect(update.ExpressionAttributeValues[':false']).toEqual({ BOOL: false });
    // CO_MANAGER continua a partilhar pastas/fornecedores — não os limpa.
    expect(update.UpdateExpression).not.toContain('sharedFolderIds');
  });

  it('limpa a agenda e as partilhas ao descer para STAFF_CHECKIN', async () => {
    primeUpdate();

    await handler(makeEvent('STAFF_CHECKIN'));

    const update = lastUpdateInput();
    expect(update.UpdateExpression).toContain('canViewTeamSchedule');
    expect(update.UpdateExpression).toContain('sharedFolderIds');
    expect(update.UpdateExpression).toContain('sharedSupplierIds');
  });

  it('não toca em canViewTeamSchedule ao promover para STAFF_LOGISTICS', async () => {
    primeUpdate({ role: 'CO_MANAGER', canViewTeamSchedule: false });

    await handler(makeEvent('STAFF_LOGISTICS'));

    const update = lastUpdateInput();
    expect(update.UpdateExpression).not.toContain('canViewTeamSchedule');
  });
});
