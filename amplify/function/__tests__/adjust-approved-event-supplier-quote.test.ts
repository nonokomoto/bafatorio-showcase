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
    TransactWriteItemsCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('../shared/resolveEventAccess', () => ({
  resolveEventAccess: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as { resolveEventAccess: jest.Mock };

const makeEventSupplier = (overrides: Record<string, unknown> = {}) =>
  marshall({ id: 'es-1', eventId: 'evt-1', supplierId: 'sup-1', status: 'APPROVED', quoteAmount: 100, ...overrides });

describe('adjust-approved-event-supplier-quote handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = 'es-table';
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'evt-table';
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = 'collab-table';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../adjust-approved-event-supplier-quote/handler').handler;
  });

  beforeEach(() => {
    const { TransactWriteItemsCommand, GetItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      TransactWriteItemsCommand: jest.Mock; GetItemCommand: jest.Mock;
    };
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    TransactWriteItemsCommand.mockClear();
    GetItemCommand.mockClear();
  });

  it('requires SUPPLIER_EDIT permission', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplier() });
    resolveEventAccess.mockResolvedValue({
      role: 'STAFF_LOGISTICS',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: { id: 'c1', role: 'STAFF_LOGISTICS', status: 'ACCEPTED' },
      sharedSupplierIds: [],
      hasPermission: () => false,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Unauthorized/);
    expect(resolveEventAccess).toHaveBeenCalled();
  });

  it('allows OWNER with SUPPLIER_EDIT to adjust quote', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplier({ quoteAmount: 200 }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (p: string) => p === 'supplier:edit',
    });

    const result = await handler({
      arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 },
      identity: { sub: 'u' },
    });
    expect(result.quoteAmount).toBe(200);
  });

  it('rejects when identity is missing', async () => {
    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: {} })
    ).rejects.toThrow(/User identity not found/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('rejects when newQuoteAmount is %s', async (_label, newQuoteAmount) => {
    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Missing required arguments/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when newQuoteAmount is not a number', async () => {
    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 'abc' }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Invalid quote amount provided\. Must be zero or positive\./);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when newQuoteAmount is negative', async () => {
    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: -50 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Invalid quote amount provided\. Must be zero or positive\./);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when the EventSupplier is not found', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/EventSupplier not found\./);
    expect(resolveEventAccess).not.toHaveBeenCalled();
  });

  it('rejects when the current status is not APPROVED', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'PENDING' }) });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Cannot adjust quote\. Supplier status is currently PENDING\./);
  });

  it('rejects when the EventSupplier has no eventId', async () => {
    mockSend.mockResolvedValueOnce({
      Item: marshall({ id: 'es-1', supplierId: 'sup-1', status: 'APPROVED', quoteAmount: 100 }),
    });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Associated event ID is missing\./);
  });

  it('sends a negative diff to Event.committedExpenses when the quote decreases', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier({ quoteAmount: 100 }) })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplier({ quoteAmount: 60 }) });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 60 }, identity: { sub: 'u' } });

    const transactCall = mockSend.mock.calls[1][0] as { TransactItems: Array<{ Update: { ExpressionAttributeValues: Record<string, unknown> } }> };
    const eventUpdateValues = unmarshall(transactCall.TransactItems[0].Update.ExpressionAttributeValues);
    expect(eventUpdateValues[':diff']).toBe(-40);
  });

  it('maps a TransactionCanceledException with ConditionalCheckFailed to an adjustment-failed error', async () => {
    const cancelError = Object.assign(new Error('cancelled'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }],
    });
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockRejectedValueOnce(cancelError);
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Adjustment failed: Condition check failed\. Event might not exist or Supplier status might have changed from APPROVED\./);
  });

  it('maps a TransactionCanceledException without ConditionalCheckFailed to a generic conflict error', async () => {
    const cancelError = Object.assign(new Error('cancelled'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [{ Code: 'None' }],
    });
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockRejectedValueOnce(cancelError);
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Adjustment failed due to a transaction conflict\./);
  });

  it('maps a ResourceNotFoundException to a resource-not-found error', async () => {
    const notFoundError = Object.assign(new Error('table missing'), { name: 'ResourceNotFoundException' });
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockRejectedValueOnce(notFoundError);
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Resource not found during quote adjustment\./);
  });

  it('maps a ValidationException to a data-validation error', async () => {
    const validationError = Object.assign(new Error('bad value'), { name: 'ValidationException' });
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockRejectedValueOnce(validationError);
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newQuoteAmount: 200 }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Data validation error during quote adjustment\./);
  });
});
