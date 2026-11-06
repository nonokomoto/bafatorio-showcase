/**
 * @file eventSupplier.permissions.matrix.test.ts
 *
 * Cross-handler matrix test: guards that every EventSupplier CRUD mutation
 * honours the ADR-015 permission matrix. Drives expectations from the
 * shared eventPermissions.ts module — if the matrix changes, expected
 * outcomes adjust automatically. If a handler drifts (asks for the wrong
 * permission, or lets through a denied role), the relevant row fails.
 *
 * Each handler row declares:
 *   - name: folder name under amplify/function/
 *   - args: typical handler arguments for the happy path
 *   - item: the EventSupplier record returned by the initial GetItem
 *   - requiredPermission: the single EVENT_PERMISSIONS key the handler must check
 *   - mockSendQueue: (role) => responses mockSend should return in order
 *
 * For each role × handler pair, we invoke the real handler with the
 * resolveEventAccess module mocked to return the role. We assert:
 *   - If the matrix grants the permission to the role, handler must succeed
 *   - Otherwise the handler must throw Unauthorized
 */

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
    UpdateItemCommand: jest.fn((input: unknown) => input),
    DeleteItemCommand: jest.fn((input: unknown) => input),
    PutItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
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

const EVENT_SUPPLIER_TABLE = 'es-table';
const EVENT_TABLE = 'evt-table';
const COLLABORATOR_TABLE = 'collab-table';

beforeAll(() => {
  process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
  process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = 'sup-table';
});

const makeEventSupplier = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'es-1',
    eventId: 'evt-1',
    supplierId: 'sup-1',
    status: 'PENDING',
    approvalStatus: 'PENDING_APPROVAL',
    quoteAmount: 100,
    owner: 'owner-1::owner-1',
    createdAt: '2026-04-23T09:00:00.000Z',
    updatedAt: '2026-04-23T09:00:00.000Z',
    ...overrides,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerFn = (event: any) => Promise<any>;

type HandlerRow = {
  /** label used in describe block */
  label: string;
  /** folder under amplify/function/ */
  module: string;
  /** permission constant key from EVENT_PERMISSIONS */
  requiredPermission:
    | 'SUPPLIER_APPROVE'
    | 'SUPPLIER_EDIT'
    | 'SUPPLIER_DELETE';
  /** handler arguments */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
  /** prime mockSend before invocation so the happy path can proceed past auth */
  primeMocks: () => void;
};

const ALL_ROLES = ['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS', 'STAFF_CHECKIN'] as const;

const handlers: HandlerRow[] = [
  {
    label: 'approveSupplierSelection',
    module: 'approve-supplier-selection',
    requiredPermission: 'SUPPLIER_APPROVE',
    args: { eventSupplierId: 'es-1', approved: true },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier() })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          Item: makeEventSupplier({ status: 'APPROVED', approvalStatus: 'APPROVED' }),
        });
    },
  },
  {
    label: 'updateEventSupplierForRole',
    module: 'update-event-supplier-for-role',
    requiredPermission: 'SUPPLIER_EDIT',
    args: { eventSupplierId: 'es-1', quoteAmount: 250 },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier() })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Item: makeEventSupplier({ quoteAmount: 250 }) });
    },
  },
  {
    label: 'removeEventSupplier',
    module: 'remove-eventSupplier',
    requiredPermission: 'SUPPLIER_DELETE',
    args: { eventSupplierId: 'es-1' },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier() })
        .mockResolvedValueOnce({});
    },
  },
  {
    label: 'processSupplierApproval (supplier/handler.ts)',
    module: 'supplier',
    requiredPermission: 'SUPPLIER_APPROVE',
    args: { eventSupplierId: 'es-1' },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier() })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'APPROVED' }) });
    },
  },
  {
    label: 'processSupplierPayment',
    module: 'process-supplier-payment',
    requiredPermission: 'SUPPLIER_APPROVE',
    args: { eventSupplierId: 'es-1' },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'APPROVED' }) })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          Item: makeEventSupplier({ status: 'PAID', paidAt: '2026-04-23T10:00:00Z' }),
        });
    },
  },
  {
    label: 'adjustApprovedEventSupplierQuote',
    module: 'adjust-approved-event-supplier-quote',
    requiredPermission: 'SUPPLIER_EDIT',
    args: { eventSupplierId: 'es-1', newQuoteAmount: 200 },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'APPROVED' }) })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Item: makeEventSupplier({ quoteAmount: 200 }) });
    },
  },
  {
    label: 'revertEventSupplierApproval',
    module: 'rever-event-supplier-aproval',
    requiredPermission: 'SUPPLIER_APPROVE',
    args: { eventSupplierId: 'es-1', newStatus: 'PENDING' },
    primeMocks: () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'APPROVED' }) })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Item: makeEventSupplier({ status: 'PENDING' }) });
    },
  },
];

const loadHandler = (module: string): HandlerFn => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`../${module}/handler`).handler as HandlerFn;
};

const resetAwsMocks = () => {
  const {
    GetItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    PutItemCommand,
    QueryCommand,
    TransactWriteItemsCommand,
  } = jest.requireMock('@aws-sdk/client-dynamodb') as {
    GetItemCommand: jest.Mock;
    UpdateItemCommand: jest.Mock;
    DeleteItemCommand: jest.Mock;
    PutItemCommand: jest.Mock;
    QueryCommand: jest.Mock;
    TransactWriteItemsCommand: jest.Mock;
  };
  mockSend.mockReset();
  resolveEventAccess.mockReset();
  GetItemCommand.mockClear();
  UpdateItemCommand.mockClear();
  DeleteItemCommand.mockClear();
  PutItemCommand.mockClear();
  QueryCommand.mockClear();
  TransactWriteItemsCommand.mockClear();
};

describe('EventSupplier permissions matrix (ADR-015)', () => {
  describe.each(handlers)('$label', ({ module, requiredPermission, args, primeMocks }) => {
    describe.each(ALL_ROLES)('role=%s', (role) => {
      let roleHasPermission: (
        r: string | null | undefined,
        p: string
      ) => boolean;
      let EVENT_PERMISSIONS: Record<string, string>;

      beforeAll(async () => {
        const permissions = await import('../shared/eventPermissions');
        roleHasPermission = permissions.roleHasPermission;
        EVENT_PERMISSIONS = permissions.EVENT_PERMISSIONS as unknown as Record<
          string,
          string
        >;
      });

      beforeEach(() => {
        resetAwsMocks();
      });

      it('matches ADR-015 matrix', async () => {
        const permissionValue = EVENT_PERMISSIONS[requiredPermission];
        const expectAllow = roleHasPermission(role, permissionValue);

        resolveEventAccess.mockResolvedValue({
          role,
          eventOwner: 'owner-1',
          eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1' },
          collaboratorRecord:
            role === 'OWNER'
              ? null
              : { id: 'collab-1', role, status: 'ACCEPTED' },
          sharedSupplierIds: [],
          hasPermission: (p: string) => roleHasPermission(role, p),
        });

        primeMocks();

        const handler = loadHandler(module);
        const event = { arguments: args, identity: { sub: 'user-1' } };

        if (expectAllow) {
          await expect(handler(event)).resolves.toBeDefined();
        } else {
          await expect(handler(event)).rejects.toThrow(/Unauthorized/i);
        }
      });
    });
  });

  /**
   * selectEventSupplier is effectively the CREATE for EventSupplier.
   * It does not use resolveEventAccess (does its own Event/Collaborator
   * lookup), so it gets its own block. Per ADR-015:
   *   - OWNER / CO_MANAGER → DIRECT (no approval needed)
   *   - STAFF_LOGISTICS   → PENDING_APPROVAL (supplier:select with approval workflow)
   *   - STAFF_CHECKIN     → Unauthorized
   */
  describe('selectEventSupplier (CREATE)', () => {
    const USER_ID = 'user-1';
    const OWNER_SUB = 'owner-1';
    const EVENT_ID = 'evt-1';
    const SUPPLIER_ID = 'sup-1';

    const eventItemFor = (role: 'OWNER' | 'COLLABORATOR') =>
      marshall({
        id: EVENT_ID,
        owner: role === 'OWNER' ? `${USER_ID}::${USER_ID}` : `${OWNER_SUB}::${OWNER_SUB}`,
      });

    const collaboratorItem = (role: string) =>
      marshall({
        id: 'collab-1',
        eventId: EVENT_ID,
        userId: USER_ID,
        role,
        status: 'ACCEPTED',
        sharedSupplierIds: [SUPPLIER_ID],
      });

    const supplierOwnerItem = () =>
      marshall({ id: SUPPLIER_ID, owner: `${USER_ID}::${USER_ID}` });

    const supplierExistsItem = () => marshall({ id: SUPPLIER_ID });

    beforeEach(() => {
      resetAwsMocks();
    });

    it('OWNER creates EventSupplier with approvalStatus=DIRECT', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: eventItemFor('OWNER') })
        .mockResolvedValueOnce({ Item: supplierExistsItem() })
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({});

      const handler = loadHandler('select-event-supplier');
      const result = await handler({
        arguments: { eventId: EVENT_ID, supplierId: SUPPLIER_ID },
        identity: { sub: USER_ID },
      });

      expect(result.approvalStatus).toBe('DIRECT');
      expect(result.requestedBy).toBeUndefined();
    });

    it('CO_MANAGER creates EventSupplier with approvalStatus=DIRECT', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: eventItemFor('COLLABORATOR') })
        .mockResolvedValueOnce({ Items: [collaboratorItem('CO_MANAGER')] })
        .mockResolvedValueOnce({ Item: supplierOwnerItem() })
        .mockResolvedValueOnce({ Item: supplierExistsItem() })
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({});

      const handler = loadHandler('select-event-supplier');
      const result = await handler({
        arguments: { eventId: EVENT_ID, supplierId: SUPPLIER_ID },
        identity: { sub: USER_ID },
      });

      expect(result.approvalStatus).toBe('DIRECT');
    });

    it('STAFF_LOGISTICS creates EventSupplier with approvalStatus=PENDING_APPROVAL', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: eventItemFor('COLLABORATOR') })
        .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_LOGISTICS')] })
        .mockResolvedValueOnce({ Item: supplierOwnerItem() })
        .mockResolvedValueOnce({ Item: supplierExistsItem() })
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({});

      const handler = loadHandler('select-event-supplier');
      const result = await handler({
        arguments: { eventId: EVENT_ID, supplierId: SUPPLIER_ID },
        identity: { sub: USER_ID },
      });

      expect(result.approvalStatus).toBe('PENDING_APPROVAL');
      expect(result.requestedBy).toBe(USER_ID);
    });

    it('STAFF_CHECKIN is rejected (Unauthorized)', async () => {
      const { PutItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
        PutItemCommand: jest.Mock;
      };

      mockSend
        .mockResolvedValueOnce({ Item: eventItemFor('COLLABORATOR') })
        .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_CHECKIN')] });

      const handler = loadHandler('select-event-supplier');

      await expect(
        handler({
          arguments: { eventId: EVENT_ID, supplierId: SUPPLIER_ID },
          identity: { sub: USER_ID },
        })
      ).rejects.toThrow(/Unauthorized/i);

      expect(PutItemCommand).not.toHaveBeenCalled();
    });
  });
});
