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
const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: {
    eventId: 'evt-1',
    roleId: 'role-1',
    name: 'NewRoleName',
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

describe('update-event-role handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_ROLE_TABLE_NAME = ROLE_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../update-event-role/handler').handler;
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
    await expect(handler(makeHandlerEvent({ name: '' }))).rejects.toThrow('required');
    await expect(handler(makeHandlerEvent({ name: '   ' }))).rejects.toThrow('required');
  });

  it('rejects STAFF_CHECKIN (no ROLE_MANAGE permission)', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_CHECKIN'),
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('rejects STAFF_LOGISTICS (no ROLE_MANAGE permission)', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_LOGISTICS'),
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

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Role does not belong to this event');
  });

  it('throws when new name already exists (case-insensitive)', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ name: 'OldName' })),
    });
    mockSend.mockResolvedValueOnce({
      Items: [marshall(makeRoleRecord({ name: 'NewRoleName', id: 'role-2' }))],
      LastEvaluatedKey: undefined,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('already exists');
  });

  it('allows same name without duplicate check (case-insensitive)', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ name: 'NewRoleName' })),
    });
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeRoleRecord({ name: 'NewRoleName' })),
    });

    const result = await handler(makeHandlerEvent());

    expect(result.name).toBe('NewRoleName');
    // Only GetItem + UpdateItem — no duplicate-name Query
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('updates role for OWNER and returns updated role', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ name: 'OldName' })),
    });
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(
        makeRoleRecord({
          name: 'NewRoleName',
          updatedAt: '2026-01-02T00:00:00Z',
        })
      ),
    });

    const result = await handler(makeHandlerEvent());

    expect(result.id).toBe('role-1');
    expect(result.name).toBe('NewRoleName');
    expect(result.eventId).toBe('evt-1');
  });

  it('updates role for CO_MANAGER with ROLE_MANAGE permission', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ name: 'OldName' })),
    });
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeRoleRecord({ name: 'NewRoleName' })),
    });

    const result = await handler(makeHandlerEvent());

    expect(result.name).toBe('NewRoleName');
  });

  it('trims whitespace from name', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ name: 'OldName' })),
    });
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeRoleRecord({ name: 'Trimmed' })),
    });

    await handler(makeHandlerEvent({ name: '  Trimmed  ' }));

    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('queries the byEventId GSI for the duplicate-name check', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Item: marshall(makeRoleRecord({ name: 'OldName' })),
    });
    mockSend.mockResolvedValueOnce({ Items: [] });
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeRoleRecord({ name: 'NewRoleName' })),
    });

    await handler(makeHandlerEvent());

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { QueryCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as any;
    expect(QueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: ROLE_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
      })
    );
  });
  describe('highlight color', () => {
    const getUpdateInput = () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as any;
      const calls = (UpdateItemCommand as jest.Mock).mock.calls;
      return calls[calls.length - 1][0];
    };

    const sameNameUpdate = (savedRole: Record<string, unknown>) => {
      resolveEventAccess.mockResolvedValue(makeOwnerAccess());
      mockSend.mockResolvedValueOnce({ Item: marshall(makeRoleRecord({ name: 'NewRoleName' })) });
      mockSend.mockResolvedValueOnce({
        Attributes: marshall(makeRoleRecord({ name: 'NewRoleName', ...savedRole }), { removeUndefinedValues: true }),
      });
    };

    it('stores a palette color and returns it', async () => {
      sameNameUpdate({ color: 'amber' });

      const result = await handler(makeHandlerEvent({ color: 'amber' }));

      const input = getUpdateInput();
      expect(input.UpdateExpression).toMatch(/SET .*#c = :color/);
      expect(input.ExpressionAttributeValues).toMatchObject({ ':color': { S: 'amber' } });
      expect(result.color).toBe('amber');
    });

    it.each(['', null])('removes the color when it is cleared (%p)', async (color) => {
      sameNameUpdate({ color: undefined });

      const result = await handler(makeHandlerEvent({ color }));

      const input = getUpdateInput();
      expect(input.UpdateExpression).toMatch(/REMOVE #c/);
      expect(input.ExpressionAttributeValues).not.toHaveProperty(':color');
      expect(result.color).toBeNull();
    });

    it('leaves the color untouched when it is not sent', async () => {
      sameNameUpdate({ color: 'green' });

      const result = await handler(makeHandlerEvent());

      const input = getUpdateInput();
      expect(input.UpdateExpression).not.toMatch(/#c/);
      expect(result.color).toBe('green');
    });

    it.each(['neon', '#ff0000', 'AMBER '])('rejects a color outside the palette (%p)', async (color) => {
      resolveEventAccess.mockResolvedValue(makeOwnerAccess());

      await expect(handler(makeHandlerEvent({ color }))).rejects.toThrow(/color/i);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
