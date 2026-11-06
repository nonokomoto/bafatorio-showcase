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

describe('revert-event-supplier-approval handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = 'es-table';
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'evt-table';
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = 'collab-table';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../rever-event-supplier-aproval/handler').handler;
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

    await expect(
      handler({ arguments: { eventSupplierId: 'es-1', newStatus: 'PENDING' }, identity: { sub: 'u' } })
    ).rejects.toThrow(/Unauthorized/);
    expect(resolveEventAccess).toHaveBeenCalled();
  });

  it('allows OWNER with SUPPLIER_APPROVE to revert approval', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeEventSupplier() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'PENDING' }) });

    resolveEventAccess.mockResolvedValue({
      role: 'OWNER',
      eventOwner: 'owner-1',
      eventRecord: { id: 'evt-1' },
      collaboratorRecord: null,
      sharedSupplierIds: [],
      hasPermission: (p: string) => p === 'supplier:approve',
    });

    const result = await handler({
      arguments: { eventSupplierId: 'es-1', newStatus: 'PENDING' },
      identity: { sub: 'u' },
    });
    expect(result.status).toBe('PENDING');
  });
});
