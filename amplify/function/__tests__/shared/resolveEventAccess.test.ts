import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};

const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collaborator-table';
const EVENT_ID = 'evt-123';
const USER_ID = 'user-123';
const OWNER_ID = 'owner-123';

const makeEventItem = (owner = OWNER_ID) => marshall({
  id: EVENT_ID,
  owner,
  eventTitle: 'Test Event',
});

const makeCollaboratorItem = (overrides: Record<string, unknown> = {}) => marshall({
  id: 'collab-1',
  eventId: EVENT_ID,
  userId: USER_ID,
  role: 'STAFF_LOGISTICS',
  status: 'ACCEPTED',
  sharedSupplierIds: ['sup-1', 'sup-2'],
  ...overrides,
});

describe('resolveEventAccess', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('resolves the event owner as OWNER', async () => {
    const { resolveEventAccess } = await import('../../shared/resolveEventAccess');
    const { EVENT_PERMISSIONS } = await import('../../shared/eventPermissions');
    const { QueryCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      QueryCommand: jest.Mock;
    };

    mockSend.mockResolvedValueOnce({ Item: makeEventItem(`${USER_ID}::${USER_ID}`) });

    const result = await resolveEventAccess({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: EVENT_ID,
      userId: USER_ID,
    });

    expect(result.role).toBe('OWNER');
    expect(result.eventOwner).toBe(USER_ID);
    expect(result.eventRecord.id).toBe(EVENT_ID);
    expect(result.collaboratorRecord).toBeNull();
    expect(result.sharedSupplierIds).toEqual([]);
    expect(result.hasPermission(EVENT_PERMISSIONS.SUPPLIER_APPROVE)).toBe(true);
    expect(QueryCommand).not.toHaveBeenCalled();
  });

  it('resolves an accepted collaborator with role and shared supplier ids', async () => {
    const { resolveEventAccess } = await import('../../shared/resolveEventAccess');

    mockSend
      .mockResolvedValueOnce({ Item: makeEventItem(OWNER_ID) })
      .mockResolvedValueOnce({ Items: [makeCollaboratorItem({ role: 'CO_MANAGER' })] });

    const result = await resolveEventAccess({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: EVENT_ID,
      userId: USER_ID,
    });

    expect(result.role).toBe('CO_MANAGER');
    expect(result.eventOwner).toBe(OWNER_ID);
    expect(result.collaboratorRecord).toMatchObject({
      eventId: EVENT_ID,
      userId: USER_ID,
      role: 'CO_MANAGER',
      status: 'ACCEPTED',
    });
    expect(result.sharedSupplierIds).toEqual(['sup-1', 'sup-2']);
  });

  it('throws when the event does not exist', async () => {
    const { resolveEventAccess } = await import('../../shared/resolveEventAccess');

    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(resolveEventAccess({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: EVENT_ID,
      userId: USER_ID,
    })).rejects.toThrow('Event not found');
  });

  it('throws unauthorized when the user is neither owner nor accepted collaborator', async () => {
    const { resolveEventAccess } = await import('../../shared/resolveEventAccess');

    mockSend
      .mockResolvedValueOnce({ Item: makeEventItem(OWNER_ID) })
      .mockResolvedValueOnce({ Items: [] });

    await expect(resolveEventAccess({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: EVENT_ID,
      userId: USER_ID,
    })).rejects.toThrow(/unauthorized/i);
  });

  it('delegates hasPermission() to the backend permission module', async () => {
    const { resolveEventAccess } = await import('../../shared/resolveEventAccess');
    const permissions = await import('../../shared/eventPermissions');

    mockSend.mockResolvedValueOnce({ Item: makeEventItem(`${USER_ID}::${USER_ID}`) });

    const permissionSpy = jest.spyOn(permissions, 'roleHasPermission').mockReturnValueOnce(false);
    const result = await resolveEventAccess({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: EVENT_ID,
      userId: USER_ID,
    });

    expect(result.hasPermission(permissions.EVENT_PERMISSIONS.SUPPLIER_VIEW)).toBe(false);
    expect(permissionSpy).toHaveBeenCalledWith('OWNER', permissions.EVENT_PERMISSIONS.SUPPLIER_VIEW);

    permissionSpy.mockRestore();
  });
});
