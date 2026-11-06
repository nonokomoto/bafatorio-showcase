import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';


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
    UpdateItemCommand: jest.fn((input: unknown) => input),
    TransactWriteItemsCommand: jest.fn((input: unknown) => input),
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

const EVENT_SUPPLIER_TABLE = 'test-event-supplier-table';
const EVENT_TABLE = 'test-event-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: {
    eventSupplierId: 'es-1',
    approved: true,
    ...overrides,
  },
  identity: { sub: 'user-1' },
});

const makeEventSupplierItem = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'es-1',
    eventId: 'evt-1',
    supplierId: 'sup-1',
    status: 'PENDING',
    approvalStatus: 'PENDING_APPROVAL',
    owner: 'owner-1::owner-1',
    createdAt: '2026-04-23T09:00:00.000Z',
    updatedAt: '2026-04-23T09:00:00.000Z',
    quoteAmount: 0,
    ...overrides,
  });

describe('approve-supplier-selection handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../approve-supplier-selection/handler').handler;
  });

  beforeEach(() => {
    const {
      UpdateItemCommand,
      TransactWriteItemsCommand,
      GetItemCommand,
    } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
      TransactWriteItemsCommand: jest.Mock;
      GetItemCommand: jest.Mock;
    };
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    UpdateItemCommand.mockClear();
    TransactWriteItemsCommand.mockClear();
    GetItemCommand.mockClear();
  });

  it('allows OWNER with SUPPLIER_APPROVE to approve a pending selection', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplierItem({ approvalStatus: 'APPROVED', status: 'APPROVED' }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:approve',
    });

    const result = await handler(makeHandlerEvent());

    expect(resolveEventAccess).toHaveBeenCalledWith({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: expect.any(String),
      eventId: 'evt-1',
      userId: 'user-1',
    });
    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.status).toBe('APPROVED');
  });

  it('rejects CO_MANAGER under the current permission matrix', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem() });

    resolveEventAccess.mockResolvedValue({
      role: 'CO_MANAGER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: { id: 'collab-1', role: 'CO_MANAGER', status: 'ACCEPTED' },
      sharedSupplierIds: [],
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Unauthorized');
    expect(resolveEventAccess).toHaveBeenCalled();
  });

  it('rejects unauthorized collaborators', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem() });

    resolveEventAccess.mockResolvedValue({
      role: 'STAFF_LOGISTICS',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: { id: 'collab-2', role: 'STAFF_LOGISTICS', status: 'ACCEPTED' },
      sharedSupplierIds: ['sup-1'],
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Unauthorized');
    expect(resolveEventAccess).toHaveBeenCalled();
  });

  it('rejects non-pending approvals without performing a mutation', async () => {
    const { UpdateItemCommand, TransactWriteItemsCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
      TransactWriteItemsCommand: jest.Mock;
    };

    mockSend.mockResolvedValueOnce({
      Item: makeEventSupplierItem({ approvalStatus: 'APPROVED', status: 'APPROVED' }),
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow(/not pending approval/i);
    expect(resolveEventAccess).not.toHaveBeenCalled();
    expect(UpdateItemCommand).not.toHaveBeenCalled();
    expect(TransactWriteItemsCommand).not.toHaveBeenCalled();
  });

  it('rejects when identity is missing', async () => {
    await expect(handler({ arguments: { eventSupplierId: 'es-1', approved: true }, identity: {} }))
      .rejects.toThrow(/User identity not found/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when the EventSupplier is not found', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(handler(makeHandlerEvent())).rejects.toThrow(/EventSupplier not found/);
    expect(resolveEventAccess).not.toHaveBeenCalled();
  });

  it('records the rejection reason on the Update path when rejected', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({
          approvalStatus: 'REJECTED',
          status: 'REJECTED',
          rejectionReason: 'Too expensive',
        }),
      });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    const result = await handler(
      makeHandlerEvent({ approved: false, rejectionReason: 'Too expensive' })
    );

    expect(result.approvalStatus).toBe('REJECTED');
    expect(result.rejectionReason).toBe('Too expensive');

    const updateCall = mockSend.mock.calls[1][0] as { ExpressionAttributeValues: Record<string, unknown> };
    const values = unmarshall(updateCall.ExpressionAttributeValues);
    expect(values[':rejectionReason']).toBe('Too expensive');
  });

  it('increments Event.committedExpenses via the Transact path when approving with a quote', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem({ quoteAmount: 500 }) })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ approvalStatus: 'APPROVED', status: 'APPROVED', quoteAmount: 500 }),
      });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    const result = await handler(makeHandlerEvent());
    expect(result.approvalStatus).toBe('APPROVED');

    const transactCall = mockSend.mock.calls[1][0] as {
      TransactItems: Array<{ Update: { TableName: string; ExpressionAttributeValues: Record<string, unknown> } }>;
    };
    const eventUpdate = transactCall.TransactItems.find((i) => i.Update.TableName === EVENT_TABLE);
    const values = unmarshall(eventUpdate.Update.ExpressionAttributeValues);
    expect(values[':quote']).toBe(500);
  });

  it('propagates a concurrent ConditionExpression failure without wrapping it', async () => {
    const conditionError = Object.assign(new Error('The conditional request failed'), {
      name: 'ConditionalCheckFailedException',
    });
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockRejectedValueOnce(conditionError);

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow(/The conditional request failed/);
  });
});
