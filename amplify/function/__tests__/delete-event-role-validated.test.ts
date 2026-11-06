import { marshall } from '@aws-sdk/util-dynamodb';


// Gate de billing sempre aberto nestes testes (o comportamento do gate tem
// testes proprios em shared/entitlementGate.test.ts e nos handlers de gate)
jest.mock('../shared/entitlementGate', () =>
  jest.requireActual('../shared/testUtils/openEntitlementGate').openEntitlementGate()
);

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    UpdateItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('../shared/resolveEventAccess', () => ({
  resolveEventAccess: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as {
  resolveEventAccess: jest.Mock;
};

const ROLE_TABLE = 'test-role-table';
const PARTICIPANT_TABLE = 'test-participant-table';
const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: {
    eventId: 'evt-1',
    roleId: 'role-1',
    ...overrides,
  },
  identity: { sub: 'user-1' },
});

const makeEventRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  owner: 'user-1::user-1',
  ...overrides,
});

const makeOwnerAccess = (eventRecord = makeEventRecord()) => ({
  role: 'OWNER',
  eventOwner: 'user-1',
  eventRecord,
  collaboratorRecord: null,
  sharedSupplierIds: [],
  hasPermission: (p: string) => p === 'role:manage',
});

const makeCollaboratorAccess = (role: string, eventRecord = makeEventRecord()) => ({
  role,
  eventOwner: 'owner-1',
  eventRecord,
  collaboratorRecord: { id: 'c-1', eventId: 'evt-1', userId: 'user-1', role, status: 'ACCEPTED' },
  sharedSupplierIds: [],
  hasPermission: (p: string) => (role === 'CO_MANAGER' && p === 'role:manage') || false,
});

const makeRoleRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'role-1',
  eventId: 'evt-1',
  name: 'VIP',
  owner: 'user-1::user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('delete-event-role-validated handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_ROLE_TABLE_NAME = ROLE_TABLE;
    process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME = PARTICIPANT_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../delete-event-role-validated/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    resolveEventAccess.mockReset();
  });

  it('throws when identity is missing', async () => {
    await expect(
      handler({ arguments: makeHandlerEvent().arguments, identity: {} })
    ).rejects.toThrow('User identity not found');
  });

  it('throws when required fields are missing', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ roleId: '' }))).rejects.toThrow('required');
    await expect(handler(makeHandlerEvent({ eventId: '' }))).rejects.toThrow('required');
  });

  it('rejects STAFF_CHECKIN (no ROLE_MANAGE permission)', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_CHECKIN'),
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('throws when role not found', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Item: null });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Role not found');
  });

  it('throws when role belongs to different event', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ eventId: 'different-event' })),
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('does not belong to this event');
  });

  it('returns error when participants exist', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Item: marshall(makeRoleRecord()) });
    mockSend.mockResolvedValueOnce({ Count: 3 });

    const result = await handler(makeHandlerEvent());

    expect(result.success).toBe(false);
    expect(result.participantCount).toBe(3);
  });

  it('soft-deletes role when no participants exist', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Item: marshall(makeRoleRecord()) });
    mockSend.mockResolvedValueOnce({ Count: 0 });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(result.success).toBe(true);
    expect(result.participantCount).toBe(0);
  });

  it('soft-deletes role for CO_MANAGER with ROLE_MANAGE permission', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    mockSend.mockResolvedValueOnce({ Item: marshall(makeRoleRecord()) });
    mockSend.mockResolvedValueOnce({ Count: 0 });
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(result.success).toBe(true);
  });

  it('counts participants correctly across paginated results', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Item: marshall(makeRoleRecord()) });
    mockSend.mockResolvedValueOnce({
      Count: 50,
      LastEvaluatedKey: marshall({ id: 'p-50' }),
    });
    mockSend.mockResolvedValueOnce({ Count: 5 });

    const result = await handler(makeHandlerEvent());

    expect(result.success).toBe(false);
    expect(result.participantCount).toBe(55);
  });

  it('queries the gsi-Role.participants index keyed on roleId', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Item: marshall(makeRoleRecord()) });
    mockSend.mockResolvedValueOnce({ Count: 0 });
    mockSend.mockResolvedValueOnce({});

    await handler(makeHandlerEvent());

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { QueryCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as any;
    expect(QueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: PARTICIPANT_TABLE,
        IndexName: 'gsi-Role.participants',
        KeyConditionExpression: 'roleId = :rid',
        Select: 'COUNT',
      })
    );
  });
});
