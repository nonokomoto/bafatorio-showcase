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
    TransactWriteItemsCommand: jest.fn((input: unknown) => input),
    ConditionalCheckFailedException: FakeConditionalCheckFailedException,
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

describe('process-supplier-payment handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = 'es-table';
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'evt-table';
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = 'collab-table';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../process-supplier-payment/handler').handler;
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

  it('requires SUPPLIER_APPROVE permission', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplier() });
    resolveEventAccess.mockResolvedValue({
      role: 'CO_MANAGER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: { id: 'c1', role: 'CO_MANAGER', status: 'ACCEPTED' },
      sharedSupplierIds: [],
      hasPermission: () => false,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } })).rejects.toThrow(/Unauthorized/);
    expect(resolveEventAccess).toHaveBeenCalled();
  });

  it('allows OWNER with SUPPLIER_APPROVE to process payment', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'PAID', paidAt: '2026-04-23T10:00:00Z' }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (p: string) => p === 'supplier:approve',
    });

    const result = await handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } });
    expect(result.status).toBe('PAID');
  });

  it('rejects when identity is missing', async () => {
    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: {} }))
      .rejects.toThrow(/User identity not found/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when eventSupplierId is missing', async () => {
    await expect(handler({ arguments: { eventSupplierId: '' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/eventSupplierId is required/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when the EventSupplier is not found', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/EventSupplier with ID es-1 not found/);
    expect(resolveEventAccess).not.toHaveBeenCalled();
  });

  it('rejects when the EventSupplier is already PAID', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'PAID' }) });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/is already paid/);
  });

  it('rejects when the EventSupplier is not yet APPROVED', async () => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'PENDING' }) });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/must be APPROVED before payment \(current status: PENDING\)/);
  });

  it('rejects when quoteAmount is missing', async () => {
    mockSend.mockResolvedValueOnce({
      Item: marshall({ id: 'es-1', eventId: 'evt-1', supplierId: 'sup-1', status: 'APPROVED' }),
    });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Invalid quote amount for EventSupplier es-1/);
  });

  it.each([
    ['zero', 0],
    ['negative', -50],
  ])('rejects when quoteAmount is %s', async (_label, quoteAmount) => {
    mockSend.mockResolvedValueOnce({ Item: makeEventSupplier({ quoteAmount }) });
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Invalid quote amount for EventSupplier es-1/);
  });

  it('maps a TransactionCanceledException with ConditionalCheckFailed to a Payment failed error', async () => {
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

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Payment failed: Supplier must be in APPROVED status and have sufficient committed expenses/);
  });

  it('maps a direct ConditionalCheckFailedException to a Payment failed error', async () => {
    const { ConditionalCheckFailedException } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      ConditionalCheckFailedException: new (message: string) => Error;
    };
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockRejectedValueOnce(new ConditionalCheckFailedException('condition failed'));
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Payment failed: Supplier must be in APPROVED status and have sufficient committed expenses/);
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

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Resource not found during payment processing: table missing/);
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

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Data validation error during payment processing: bad value/);
  });

  it('wraps an unexpected error with context', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockRejectedValueOnce(new Error('boom'));
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Failed to process payment for EventSupplier es-1: boom/);
  });

  it('fails when the updated EventSupplier cannot be re-fetched after a successful transaction', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: () => true,
    });

    await expect(handler({ arguments: { eventSupplierId: 'es-1' }, identity: { sub: 'u' } }))
      .rejects.toThrow(/Failed to fetch updated supplier after payment/);
  });
});
