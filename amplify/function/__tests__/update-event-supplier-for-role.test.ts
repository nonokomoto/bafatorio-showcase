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
    supplierId: 'sup-1',
    status: 'PENDING',
    quoteAmount: 100,
    owner: 'owner-1::owner-1',
    createdAt: '2026-04-23T09:00:00.000Z',
    updatedAt: '2026-04-23T09:00:00.000Z',
    ...overrides,
  });

describe('update-event-supplier-for-role handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../update-event-supplier-for-role/handler').handler;
  });

  beforeEach(() => {
    const {
      UpdateItemCommand,
      GetItemCommand,
    } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
      GetItemCommand: jest.Mock;
    };
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    UpdateItemCommand.mockClear();
    GetItemCommand.mockClear();
  });

  it('allows OWNER to edit quoteAmount and permitted status transitions', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ status: 'REJECTED', quoteAmount: 250 }),
      });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    const result = await handler(
      makeHandlerEvent({ quoteAmount: 250, status: 'REJECTED' })
    );

    expect(resolveEventAccess).toHaveBeenCalledWith({
      eventTableName: EVENT_TABLE,
      collaboratorTableName: COLLABORATOR_TABLE,
      eventId: 'evt-1',
      userId: 'user-1',
    });
    expect(UpdateItemCommand).toHaveBeenCalledTimes(1);
    const updateCall = UpdateItemCommand.mock.calls[0][0];
    expect(updateCall.UpdateExpression).toMatch(/SET/);
    expect(updateCall.UpdateExpression).not.toMatch(/owner/);
    expect(result.status).toBe('REJECTED');
    expect(result.quoteAmount).toBe(250);
  });

  it('allows CO_MANAGER when SUPPLIER_EDIT is granted', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ quoteAmount: 999 }),
      });

    resolveEventAccess.mockResolvedValue({
      role: 'CO_MANAGER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: { id: 'collab-1', role: 'CO_MANAGER', status: 'ACCEPTED' },
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    const result = await handler(makeHandlerEvent({ quoteAmount: 999 }));

    expect(result.quoteAmount).toBe(999);
  });

  it('rejects STAFF_LOGISTICS lacking SUPPLIER_EDIT', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
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

    await expect(handler(makeHandlerEvent({ quoteAmount: 10 }))).rejects.toThrow(
      /Unauthorized/
    );
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });

  it('does not update the owner field', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplierItem({ quoteAmount: 77 }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    const result = await handler(
      makeHandlerEvent({ quoteAmount: 77, owner: 'hacker' })
    );

    const updateCall = UpdateItemCommand.mock.calls[0][0];
    expect(updateCall.UpdateExpression).not.toMatch(/owner/);
    expect(JSON.stringify(updateCall.ExpressionAttributeValues)).not.toMatch(
      /hacker/
    );
    expect(result.owner).toBe('owner-1::owner-1');
  });

  it('accepts COUNTING_ON ("A contar") as a status set through this mutation', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplierItem({ status: 'COUNTING_ON' }) });

    resolveEventAccess.mockResolvedValue({
      role: 'STAFF_LOGISTICS',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: { id: 'c1', role: 'STAFF_LOGISTICS', status: 'ACCEPTED' },
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    const result = await handler(makeHandlerEvent({ status: 'COUNTING_ON' }));

    const updateCall = UpdateItemCommand.mock.calls[0][0];
    expect(JSON.stringify(updateCall.ExpressionAttributeValues)).toMatch(/COUNTING_ON/);
    expect(result.status).toBe('COUNTING_ON');
  });

  it.each(['APPROVED', 'PAID'])(
    'refuses to change the status of a %s supplier (balances must go through revert)',
    async (currentStatus) => {
      const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
        UpdateItemCommand: jest.Mock;
      };

      mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem({ status: currentStatus }) });

      resolveEventAccess.mockResolvedValue({
        role: 'OWNER',
        eventOwner: 'owner-1',
        eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
        collaboratorRecord: null,
        sharedSupplierIds: [],
        hasPermission: (permission: string) => permission === 'supplier:edit',
      });

      await expect(
        handler(makeHandlerEvent({ status: 'COUNTING_ON' }))
      ).rejects.toThrow(/workflow/i);
      expect(UpdateItemCommand).not.toHaveBeenCalled();
    }
  );

  it('guards the status write against a concurrent approval/payment', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplierItem({ status: 'COUNTING_ON' }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await handler(makeHandlerEvent({ status: 'COUNTING_ON' }));

    const updateCall = UpdateItemCommand.mock.calls[0][0];
    expect(updateCall.ConditionExpression).toBe(
      'attribute_exists(id) AND (attribute_not_exists(#st) OR NOT (#st IN (:approved, :paid)))'
    );
    expect(updateCall.ExpressionAttributeValues[':approved']).toEqual({ S: 'APPROVED' });
    expect(updateCall.ExpressionAttributeValues[':paid']).toEqual({ S: 'PAID' });
  });

  it('keeps the plain existence condition when the status is not written', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplierItem({ quoteAmount: 50 }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await handler(makeHandlerEvent({ quoteAmount: 50 }));

    const updateCall = UpdateItemCommand.mock.calls[0][0];
    expect(updateCall.ConditionExpression).toBe('attribute_exists(id)');
    expect(updateCall.ExpressionAttributeValues[':approved']).toBeUndefined();
  });

  it('reports a status write that lost the race to an approval as a workflow error', async () => {
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
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await expect(
      handler(makeHandlerEvent({ status: 'COUNTING_ON' }))
    ).rejects.toThrow(/changed meanwhile.*workflow/i);
  });

  it('refuses to clear the status (null) of an APPROVED supplier', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem({ status: 'APPROVED' }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await expect(
      handler(makeHandlerEvent({ status: null }))
    ).rejects.toThrow(/workflow/i);
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });

  it('answers Unauthorized before revealing anything about the row status', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem({ status: 'APPROVED' }) });

    resolveEventAccess.mockResolvedValue({
      role: null,
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => false,
    });

    await expect(
      handler(makeHandlerEvent({ status: 'COUNTING_ON' }))
    ).rejects.toThrow(/Unauthorized/);
  });

  it('rejects invalid status transitions (to APPROVED or PAID)', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem() });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await expect(
      handler(makeHandlerEvent({ status: 'APPROVED' }))
    ).rejects.toThrow(/workflow/i);
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });

  it('rejects invalid status transitions (to PAID)', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend.mockResolvedValueOnce({ Item: makeEventSupplierItem() });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await expect(
      handler(makeHandlerEvent({ status: 'PAID' }))
    ).rejects.toThrow(/workflow/i);
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });

  it('rejects when identity is missing', async () => {
    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: {} }))
      .rejects.toThrow(/User identity not found/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when the EventSupplier is not found', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(handler(makeHandlerEvent({ quoteAmount: 10 }))).rejects.toThrow(
      /EventSupplier not found/
    );
    expect(resolveEventAccess).not.toHaveBeenCalled();
  });

  it('updates only invoiceS3Key when quoteAmount and status are omitted', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplierItem() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: makeEventSupplierItem({ invoiceS3Key: 'invoices/es-1.pdf' }),
      });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    const result = await handler(
      makeHandlerEvent({ invoiceS3Key: 'invoices/es-1.pdf' })
    );

    const updateCall = UpdateItemCommand.mock.calls[0][0];
    expect(updateCall.UpdateExpression).toMatch(/invoiceS3Key/);
    expect(updateCall.UpdateExpression).not.toMatch(/quoteAmount/);
    expect(updateCall.UpdateExpression).not.toMatch(/#st/);
    expect(result.invoiceS3Key).toBe('invoices/es-1.pdf');
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
      hasPermission: (permission: string) => permission === 'supplier:edit',
    });

    await expect(handler(makeHandlerEvent({ quoteAmount: 10 }))).rejects.toThrow(
      /The conditional request failed/
    );
  });
});
