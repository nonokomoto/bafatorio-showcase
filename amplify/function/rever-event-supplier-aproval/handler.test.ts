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

// Access control is delegated to the shared permission matrix (ADR-015).
// Mock it out so tests don't need to feed the extra GetItem Event + Query
// Collaborator calls into the mockSend queue — the internals of that helper
// are exercised by its own dedicated tests.
jest.mock('../shared/resolveEventAccess', () => ({
    resolveEventAccess: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
    _mockSend: jest.Mock;
};

const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as {
    resolveEventAccess: jest.Mock;
};

const ES_TABLE = 'test-event-supplier-table';
const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collaborator-table';

// Handler required after env vars are set (module-level constants are read at require time)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (event: any) => Promise<any>;

beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = ES_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('./handler').handler;
});

const makeEvent = (eventSupplierId: string, newStatus: string, userId = 'user-1') => ({
    arguments: { eventSupplierId, newStatus },
    identity: { sub: userId },
});

const makeEventSupplierItem = (
    id: string,
    eventId: string,
    status: string,
    quoteAmount: number | null,
    approvalStatus = 'APPROVED',
) => marshall({ id, eventId, supplierId: 's-1', status, quoteAmount, approvalStatus });

const grantApprove = (overrides: Record<string, unknown> = {}) => {
    resolveEventAccess.mockResolvedValue({
        role: 'OWNER',
        eventOwner: 'user-1',
        eventRecord: { id: 'e-1', owner: 'user-1::user-1' },
        collaboratorRecord: null,
        sharedSupplierIds: [],
        hasPermission: (permission: string) => permission === 'supplier:approve',
        ...overrides,
    });
};

const denyApprove = () => {
    resolveEventAccess.mockResolvedValue({
        role: 'STAFF_CHECKIN',
        eventOwner: 'user-1',
        eventRecord: { id: 'e-1', owner: 'user-1::user-1' },
        collaboratorRecord: null,
        sharedSupplierIds: [],
        hasPermission: () => false,
    });
};

beforeEach(() => {
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    jest.requireMock('@aws-sdk/client-dynamodb').TransactWriteItemsCommand.mockClear();
});

describe('rever-event-supplier-aproval handler', () => {
    describe('reverting APPROVED → PENDING with a quote amount', () => {
        /**
         * Bug histórico: ConditionExpression usava `committedExpenses >= :amount`.
         * Se o atributo não existisse no DynamoDB (Event.committedExpenses nunca
         * inicializado), a condição falhava → TransactionCanceledException.
         * Correção: usar `if_not_exists` no UpdateExpression e remover o guard >=.
         */
        it('uses if_not_exists and does not guard on committedExpenses >= amount', async () => {
            const { TransactWriteItemsCommand } = jest.requireMock('@aws-sdk/client-dynamodb');

            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', 500) })
                .mockResolvedValueOnce({}) // TransactWriteItems ok
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'PENDING', 500) });

            await handler(makeEvent('es-1', 'PENDING'));

            const transactArgs = (TransactWriteItemsCommand as jest.Mock).mock.calls[0][0] as {
                TransactItems: { Update: { UpdateExpression: string; ConditionExpression: string } }[];
            };
            const eventUpdate = transactArgs.TransactItems[1].Update;

            expect(eventUpdate.UpdateExpression).toContain('if_not_exists');
            expect(eventUpdate.ConditionExpression).not.toContain('committedExpenses');
        });

        it('resolves with the updated status', async () => {
            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', 500) })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'PENDING', 500) });

            const result = await handler(makeEvent('es-1', 'PENDING'));
            expect(result?.status).toBe('PENDING');
        });

        it('throws "Revert failed" when the DynamoDB transaction is cancelled', async () => {
            const txError = Object.assign(new Error('tx cancelled'), { name: 'TransactionCanceledException' });

            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', 500) })
                .mockRejectedValueOnce(txError);

            await expect(handler(makeEvent('es-1', 'PENDING'))).rejects.toThrow('Revert failed');
        });
    });

    describe('approvalStatus sync', () => {
        it('sets approvalStatus to PENDING_APPROVAL when reverting to PENDING', async () => {
            const { TransactWriteItemsCommand } = jest.requireMock('@aws-sdk/client-dynamodb');

            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', null) })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'PENDING', null, 'PENDING_APPROVAL') });

            await handler(makeEvent('es-1', 'PENDING'));

            const transactArgs = (TransactWriteItemsCommand as jest.Mock).mock.calls[0][0] as {
                TransactItems: { Update: { UpdateExpression: string; ExpressionAttributeValues: Record<string, unknown> } }[];
            };
            const supplierUpdate = transactArgs.TransactItems[0].Update;

            expect(supplierUpdate.UpdateExpression).toContain('approvalStatus');
            expect(supplierUpdate.ExpressionAttributeValues).toMatchObject({ ':newApprovalStatus': { S: 'PENDING_APPROVAL' } });
        });

        it('sets approvalStatus to REJECTED when reverting to REJECTED', async () => {
            const { TransactWriteItemsCommand } = jest.requireMock('@aws-sdk/client-dynamodb');

            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', null) })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'REJECTED', null, 'REJECTED') });

            await handler(makeEvent('es-1', 'REJECTED'));

            const transactArgs = (TransactWriteItemsCommand as jest.Mock).mock.calls[0][0] as {
                TransactItems: { Update: { UpdateExpression: string; ExpressionAttributeValues: Record<string, unknown> } }[];
            };
            const supplierUpdate = transactArgs.TransactItems[0].Update;

            expect(supplierUpdate.UpdateExpression).toContain('approvalStatus');
            expect(supplierUpdate.ExpressionAttributeValues).toMatchObject({ ':newApprovalStatus': { S: 'REJECTED' } });
        });
    });

    describe('reverting APPROVED → COUNTING_ON ("A contar")', () => {
        it('writes COUNTING_ON, keeps approvalStatus pending and releases the committed quote', async () => {
            const { TransactWriteItemsCommand } = jest.requireMock('@aws-sdk/client-dynamodb');

            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', 250) })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'COUNTING_ON', 250, 'PENDING_APPROVAL') });

            const result = await handler(makeEvent('es-1', 'COUNTING_ON'));

            const transactArgs = (TransactWriteItemsCommand as jest.Mock).mock.calls[0][0] as {
                TransactItems: { Update: { UpdateExpression: string; ExpressionAttributeValues: Record<string, unknown> } }[];
            };
            expect(transactArgs.TransactItems).toHaveLength(2);
            expect(transactArgs.TransactItems[0].Update.ExpressionAttributeValues).toMatchObject({
                ':newStatus': { S: 'COUNTING_ON' },
                ':newApprovalStatus': { S: 'PENDING_APPROVAL' },
            });
            expect(result?.status).toBe('COUNTING_ON');
        });
    });

    describe('reverting APPROVED → PENDING without a quote amount', () => {
        it('succeeds with only one transaction item (no budget update)', async () => {
            const { TransactWriteItemsCommand } = jest.requireMock('@aws-sdk/client-dynamodb');

            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', null) })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'PENDING', null) });

            await handler(makeEvent('es-1', 'PENDING'));

            const transactArgs = (TransactWriteItemsCommand as jest.Mock).mock.calls[0][0] as {
                TransactItems: unknown[];
            };
            expect(transactArgs.TransactItems).toHaveLength(1);
        });
    });

    describe('authorization', () => {
        it('throws when userId is absent', async () => {
            await expect(
                handler({ arguments: { eventSupplierId: 'es-1', newStatus: 'PENDING' }, identity: {} }),
            ).rejects.toThrow();
        });

        it('throws when caller lacks supplier:approve permission', async () => {
            denyApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'APPROVED', 0) });

            await expect(handler(makeEvent('es-1', 'PENDING', 'user-1'))).rejects.toThrow('Unauthorized');
        });

        it('throws when EventSupplier is not found', async () => {
            mockSend.mockResolvedValueOnce({ Item: undefined });
            await expect(handler(makeEvent('es-1', 'PENDING'))).rejects.toThrow('not found');
        });
    });

    describe('validation', () => {
        it('throws when current status is not APPROVED', async () => {
            grantApprove();
            mockSend
                .mockResolvedValueOnce({ Item: makeEventSupplierItem('es-1', 'e-1', 'PENDING', 0) });

            await expect(handler(makeEvent('es-1', 'PENDING'))).rejects.toThrow('Cannot revert');
        });

        // APPROVED → APPROVED would release the committed quote while keeping the
        // row approved (repeatable); APPROVED → PAID would skip effectiveExpenses.
        it.each(['APPROVED', 'PAID'])('rejects %s as the revert target before touching DynamoDB', async (target) => {
            grantApprove();

            await expect(handler(makeEvent('es-1', target))).rejects.toThrow(
                `Invalid revert target status: ${target}`,
            );
            expect(mockSend).not.toHaveBeenCalled();
        });
    });
});
