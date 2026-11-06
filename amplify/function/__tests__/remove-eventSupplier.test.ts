import { marshall } from '@aws-sdk/util-dynamodb';


// Gate de billing sempre aberto nestes testes (o comportamento do gate tem
// testes proprios em shared/entitlementGate.test.ts e nos handlers de gate)
jest.mock('../shared/entitlementGate', () =>
  jest.requireActual('../shared/testUtils/openEntitlementGate').openEntitlementGate()
);

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  class FakeConditionalCheckFailedException extends Error {
    name = 'ConditionalCheckFailedException';
  }
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    DeleteItemCommand: jest.fn((input: unknown) => input),
    TransactWriteItemsCommand: jest.fn((input: unknown) => input),
    ConditionalCheckFailedException: FakeConditionalCheckFailedException,
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
const COLLABORATOR_TABLE = 'test-collaborator-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: {
    eventSupplierId: 'es-1',
    ...overrides,
  },
  identity: { sub: 'user-1' },
});

const makeEventSupplierItem = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'es-1',
    eventId: 'evt-1',
    quoteAmount: 0,
    status: 'PENDING',
    ...overrides,
  });

describe('remove-eventSupplier handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../remove-eventSupplier/handler').handler;
  });

  beforeEach(() => {
    const {
      DeleteItemCommand,
      TransactWriteItemsCommand,
      GetItemCommand,
    } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      DeleteItemCommand: jest.Mock;
      TransactWriteItemsCommand: jest.Mock;
      GetItemCommand: jest.Mock;
    };
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    DeleteItemCommand.mockClear();
    TransactWriteItemsCommand.mockClear();
    GetItemCommand.mockClear();
  });

  it('allows OWNER to remove a pending event supplier', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({});

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(resolveEventAccess).toHaveBeenCalledWith({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: 'evt-1',
      userId: 'user-1',
    });
    expect(result.deletedEventSupplierId).toBe('es-1');
  });

  it('allows CO_MANAGER when SUPPLIER_DELETE is granted', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({});

    resolveEventAccess.mockResolvedValue({
      role: 'CO_MANAGER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: { id: 'collab-1', role: 'CO_MANAGER', status: 'ACCEPTED' },
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(result.deletedEventSupplierId).toBe('es-1');
  });

  it('rejects STAFF_LOGISTICS that lacks SUPPLIER_DELETE', async () => {
    const { DeleteItemCommand, TransactWriteItemsCommand } = jest.requireMock(
      '@aws-sdk/client-dynamodb'
    ) as {
      DeleteItemCommand: jest.Mock;
      TransactWriteItemsCommand: jest.Mock;
    };

    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem() });

    resolveEventAccess.mockResolvedValue({
      role: 'STAFF_LOGISTICS',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: { id: 'collab-2', role: 'STAFF_LOGISTICS', status: 'ACCEPTED' },
      sharedSupplierIds: ['sup-1'],
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow(/Unauthorized/);
    expect(DeleteItemCommand).not.toHaveBeenCalled();
    expect(TransactWriteItemsCommand).not.toHaveBeenCalled();
  });

  it('reverts committed expenses when deleting an APPROVED supplier with a quote', async () => {
    const { TransactWriteItemsCommand, DeleteItemCommand } = jest.requireMock(
      '@aws-sdk/client-dynamodb'
    ) as {
      TransactWriteItemsCommand: jest.Mock;
      DeleteItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ status: 'APPROVED', quoteAmount: 150 }),
      })
      .mockResolvedValueOnce({});

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      // Invariant holds: Event.committedExpenses >= quoteAmount.
      eventRecord: {
        id: 'evt-1',
        owner: 'owner-1::owner-1',
        committedExpenses: 200,
      },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(TransactWriteItemsCommand).toHaveBeenCalledTimes(1);
    expect(DeleteItemCommand).not.toHaveBeenCalled();
    expect(result.message).toMatch(/committed expenses reverted/i);
  });

  it('deletes an APPROVED orphan supplier when Event.committedExpenses is missing', async () => {
    // Regression: EventSuppliers created via import with status=APPROVED
    // never incremented Event.committedExpenses, so the reversion transaction
    // would fail with ConditionalCheckFailed. Fall back to a plain delete in
    // that case so the OWNER can still clean up.
    const { TransactWriteItemsCommand, DeleteItemCommand } = jest.requireMock(
      '@aws-sdk/client-dynamodb'
    ) as {
      TransactWriteItemsCommand: jest.Mock;
      DeleteItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ status: 'APPROVED', quoteAmount: 150 }),
      })
      .mockResolvedValueOnce({}); // DeleteItem

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      // No committedExpenses on the Event — invariant broken (e.g. created
      // directly as APPROVED via import).
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(TransactWriteItemsCommand).not.toHaveBeenCalled();
    expect(DeleteItemCommand).toHaveBeenCalledTimes(1);
    expect(result.deletedEventSupplierId).toBe('es-1');
  });

  it('reverts effective expenses when deleting a PAID supplier with a quote', async () => {
    const { TransactWriteItemsCommand, DeleteItemCommand } = jest.requireMock(
      '@aws-sdk/client-dynamodb'
    ) as {
      TransactWriteItemsCommand: jest.Mock;
      DeleteItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ status: 'PAID', quoteAmount: 150 }),
      })
      .mockResolvedValueOnce({});

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      // Invariant holds: Event.effectiveExpenses >= quoteAmount.
      eventRecord: {
        id: 'evt-1',
        owner: 'owner-1::owner-1',
        effectiveExpenses: 200,
      },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(TransactWriteItemsCommand).toHaveBeenCalledTimes(1);
    expect(DeleteItemCommand).not.toHaveBeenCalled();
    // The Event decrement must target effectiveExpenses, not committedExpenses —
    // a paid supplier lives in effective spend, not committed.
    const transactInput = TransactWriteItemsCommand.mock.calls[0][0];
    const eventUpdate = transactInput.TransactItems.find(
      (i: { Update?: { TableName: string } }) => i.Update?.TableName === EVENT_TABLE
    );
    expect(eventUpdate.Update.UpdateExpression).toContain('effectiveExpenses');
    expect(eventUpdate.Update.UpdateExpression).not.toContain('committedExpenses');
    expect(result.message).toMatch(/effective expenses reverted/i);
  });

  it('deletes a PAID orphan supplier when Event.effectiveExpenses is missing', async () => {
    const { TransactWriteItemsCommand, DeleteItemCommand } = jest.requireMock(
      '@aws-sdk/client-dynamodb'
    ) as {
      TransactWriteItemsCommand: jest.Mock;
      DeleteItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ status: 'PAID', quoteAmount: 150 }),
      })
      .mockResolvedValueOnce({}); // DeleteItem

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      // No effectiveExpenses on the Event — invariant broken, fall back to delete.
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(TransactWriteItemsCommand).not.toHaveBeenCalled();
    expect(DeleteItemCommand).toHaveBeenCalledTimes(1);
    expect(result.deletedEventSupplierId).toBe('es-1');
  });

  it('deletes an APPROVED supplier when committedExpenses is less than the quote', async () => {
    const { TransactWriteItemsCommand, DeleteItemCommand } = jest.requireMock(
      '@aws-sdk/client-dynamodb'
    ) as {
      TransactWriteItemsCommand: jest.Mock;
      DeleteItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ status: 'APPROVED', quoteAmount: 150 }),
      })
      .mockResolvedValueOnce({});

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      // Invariant broken: committedExpenses would go negative.
      eventRecord: {
        id: 'evt-1',
        owner: 'owner-1::owner-1',
        committedExpenses: 50,
      },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:delete',
    });

    const result = await handler(makeHandlerEvent());

    expect(TransactWriteItemsCommand).not.toHaveBeenCalled();
    expect(DeleteItemCommand).toHaveBeenCalledTimes(1);
    expect(result.deletedEventSupplierId).toBe('es-1');
  });
});
