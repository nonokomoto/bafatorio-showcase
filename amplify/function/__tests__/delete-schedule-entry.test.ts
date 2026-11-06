
// Gate de billing sempre aberto nestes testes (o comportamento do gate tem
// testes proprios em shared/entitlementGate.test.ts e nos handlers de gate)
jest.mock('../shared/entitlementGate', () =>
  jest.requireActual('../shared/testUtils/openEntitlementGate').openEntitlementGate()
);

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    DeleteItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('../shared/resolveEventAccess', () => ({
  resolveEventAccess: jest.fn(),
  normalizeUserId: (id: string) => id.split('::')[0],
}));

jest.mock('../shared/scheduleEntry', () => ({
  getScheduleEntry: jest.fn(),
}));

jest.mock('../shared/scheduleEntryAccess', () => ({
  assertCanDeleteEntry: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as { resolveEventAccess: jest.Mock };
const { getScheduleEntry } = jest.requireMock('../shared/scheduleEntry') as {
  getScheduleEntry: jest.Mock;
};
const { assertCanDeleteEntry } = jest.requireMock('../shared/scheduleEntryAccess') as {
  assertCanDeleteEntry: jest.Mock;
};

const SCHEDULE_TABLE = 'test-schedule-table';
const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: { id: 'entry-1', eventId: 'evt-1', ...overrides },
  identity: { sub: 'user-1' },
});

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  eventId: 'evt-1',
  date: '2026-06-15',
  title: 'Cerimónia',
  owner: 'user-1::user-1',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
});

const makeOwnerAccess = () => ({
  role: 'OWNER',
  eventOwner: 'user-1',
  eventRecord: { id: 'evt-1', owner: 'user-1::user-1' },
  collaboratorRecord: null,
  sharedSupplierIds: [],
  hasPermission: (p: string) => p === 'schedule:delete',
});

const makeCollaboratorAccess = (role: string) => ({
  role,
  eventOwner: 'owner-1',
  eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
  collaboratorRecord: { id: 'c-1', eventId: 'evt-1', userId: 'user-1', role, status: 'ACCEPTED' },
  sharedSupplierIds: [],
  hasPermission: (p: string) => role === 'CO_MANAGER' && p === 'schedule:delete',
});

describe('delete-schedule-entry handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME = SCHEDULE_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../delete-schedule-entry/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    getScheduleEntry.mockReset();
    assertCanDeleteEntry.mockReset();
  });

  it('deletes entry for OWNER and returns id', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(result.id).toBe('entry-1');
    expect(assertCanDeleteEntry).toHaveBeenCalledWith({
      role: 'OWNER',
      entryOwnerUserId: 'user-1::user-1',
      eventOwnerUserId: 'user-1',
      currentUserId: 'user-1',
    });
  });

  it('deletes entry for STAFF_LOGISTICS on their own entry (ADR-030)', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_LOGISTICS'),
      hasPermission: (p: string) => p === 'schedule:delete',
    });
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'user-1::user-1' }));
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());
    expect(result.id).toBe('entry-1');
    expect(assertCanDeleteEntry).toHaveBeenCalledWith({
      role: 'STAFF_LOGISTICS',
      entryOwnerUserId: 'user-1::user-1',
      eventOwnerUserId: 'owner-1',
      currentUserId: 'user-1',
    });
  });

  it('deletes entry for CO_MANAGER on their own entry', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'user-1::user-1' }));
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());
    expect(result.id).toBe('entry-1');
  });

  it('deletes entry for CO_MANAGER on a STAFF_LOGISTICS-authored entry (ADR-030)', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'logistics-1::logistics-1' }));
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());
    expect(result.id).toBe('entry-1');
    expect(assertCanDeleteEntry).toHaveBeenCalled();
  });

  it('rejects CO_MANAGER deleting an entry authored by the OWNER (ADR-030)', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'owner-1::owner-1' }));
    assertCanDeleteEntry.mockImplementation(() => {
      throw new Error('Access denied: insufficient permissions to delete this schedule entry');
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('rejects role without schedule:delete permission', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_LOGISTICS'),
      hasPermission: () => false,
    });
    getScheduleEntry.mockResolvedValue(makeEntry());

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('throws when entry not found', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockRejectedValue(new Error('Schedule entry not found'));

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Schedule entry not found');
  });

  it('throws when identity is missing', async () => {
    await expect(
      handler({ arguments: makeHandlerEvent().arguments, identity: {} })
    ).rejects.toThrow('User identity not found');
  });
});
