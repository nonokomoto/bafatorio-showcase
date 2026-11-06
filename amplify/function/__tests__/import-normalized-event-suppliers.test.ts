/**
 * @file import-normalized-event-suppliers.test.ts
 *
 * Covers the dual-write supplier import handler:
 *   - Auth + input validation (UNAUTHENTICATED, INVALID_INPUT, NO_ROWS_TO_IMPORT,
 *     BATCH_LIMIT_EXCEEDED, EVENT_NOT_FOUND)
 *   - Role matrix (ADR-015): OWNER/CO_MANAGER → DIRECT, STAFF_LOGISTICS →
 *     PENDING_APPROVAL + requestedBy, STAFF_CHECKIN → UNAUTHORIZED
 *   - Dedup behaviour: DB-existing supplier reused, in-batch duplicate collapsed,
 *     EventSupplier already linked skipped, invalid rows counted
 *   - Result reasons: SUCCESS, SUCCESS_WITH_SKIPS, ALL_ALREADY_LINKED
 *
 * The handler talks to DynamoDB directly AND through shared/importUtils
 * (batchWriteItems). Both use the same mocked @aws-sdk/client-dynamodb module,
 * so a single mockSend queue serves every call.
 */

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
    GetItemCommand: jest.fn((input: unknown) => ({ __type: 'Get', input })),
    QueryCommand: jest.fn((input: unknown) => ({ __type: 'Query', input })),
    PutItemCommand: jest.fn((input: unknown) => ({ __type: 'Put', input })),
    BatchWriteItemCommand: jest.fn((input: unknown) => ({ __type: 'BatchWrite', input })),
    UpdateItemCommand: jest.fn((input: unknown) => ({ __type: 'Update', input })),
    _mockSend: mockSend,
  };
});

let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `uuid-${++mockUuidCounter}`),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};

const EVENT_TABLE = 'evt-table';
const SUPPLIER_TABLE = 'sup-table';
const EVENT_SUPPLIER_TABLE = 'es-table';
const COLLABORATOR_TABLE = 'collab-table';

const USER_ID = 'user-1';
const OWNER_SUB = 'owner-1';
const EVENT_ID = 'evt-1';

type Row = Partial<{
  name: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  quoteAmount: number;
  currency: string;
  status: string;
}>;

const eventItem = (ownerSub: string) =>
  marshall({ id: EVENT_ID, owner: `${ownerSub}::${ownerSub}` });

const collaboratorItem = (role: string) =>
  marshall({ id: 'collab-1', eventId: EVENT_ID, userId: USER_ID, role, status: 'ACCEPTED' });

const supplierLookupItem = (id: string, name: string, email?: string, phone?: string) =>
  marshall(
    { id, name, contactEmail: email, contactPhone: phone },
    { removeUndefinedValues: true },
  );

const eventSupplierLinkItem = (supplierId: string) => marshall({ supplierId });

const callHandler = (rows: Row[], overrides: Record<string, unknown> = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { handler } = require('../import-normalized-event-suppliers/handler');
  return handler({
    arguments: { eventId: EVENT_ID, rows: JSON.stringify(rows) },
    identity: { sub: USER_ID },
    ...overrides,
  });
};

beforeAll(() => {
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = SUPPLIER_TABLE;
  process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
  process.env.BAFATORIO_APP_REGION = 'eu-west-1';
});

beforeEach(() => {
  mockUuidCounter = 0;
  mockSend.mockReset();
  const {
    GetItemCommand,
    QueryCommand,
    PutItemCommand,
    BatchWriteItemCommand,
    UpdateItemCommand,
  } = jest.requireMock('@aws-sdk/client-dynamodb') as {
    GetItemCommand: jest.Mock;
    QueryCommand: jest.Mock;
    PutItemCommand: jest.Mock;
    BatchWriteItemCommand: jest.Mock;
    UpdateItemCommand: jest.Mock;
  };
  GetItemCommand.mockClear();
  QueryCommand.mockClear();
  PutItemCommand.mockClear();
  BatchWriteItemCommand.mockClear();
  UpdateItemCommand.mockClear();
});

describe('import-normalized-event-suppliers — auth & validation', () => {
  it('UNAUTHENTICATED when identity.sub is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handler } = require('../import-normalized-event-suppliers/handler');
    const res = await handler({
      arguments: { eventId: EVENT_ID, rows: '[]' },
      identity: {},
    });
    expect(res.success).toBe(false);
    expect(res.reason).toBe('UNAUTHENTICATED');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('INVALID_INPUT when eventId missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handler } = require('../import-normalized-event-suppliers/handler');
    const res = await handler({
      arguments: { rows: '[]' },
      identity: { sub: USER_ID },
    });
    expect(res.reason).toBe('INVALID_INPUT');
  });

  it('INVALID_INPUT when rows missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handler } = require('../import-normalized-event-suppliers/handler');
    const res = await handler({
      arguments: { eventId: EVENT_ID },
      identity: { sub: USER_ID },
    });
    expect(res.reason).toBe('INVALID_INPUT');
  });

  it('INVALID_INPUT when rows is not valid JSON', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handler } = require('../import-normalized-event-suppliers/handler');
    const res = await handler({
      arguments: { eventId: EVENT_ID, rows: 'not-json' },
      identity: { sub: USER_ID },
    });
    expect(res.reason).toBe('INVALID_INPUT');
  });

  it('INVALID_INPUT when rows is not an array', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handler } = require('../import-normalized-event-suppliers/handler');
    const res = await handler({
      arguments: { eventId: EVENT_ID, rows: '{"foo":"bar"}' },
      identity: { sub: USER_ID },
    });
    expect(res.reason).toBe('INVALID_INPUT');
  });

  it('NO_ROWS_TO_IMPORT when rows is empty', async () => {
    const res = await callHandler([]);
    expect(res.success).toBe(true);
    expect(res.reason).toBe('NO_ROWS_TO_IMPORT');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('BATCH_LIMIT_EXCEEDED at 501 rows', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ name: `Sup${i}` }));
    const res = await callHandler(rows);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('BATCH_LIMIT_EXCEEDED');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('EVENT_NOT_FOUND when event GetItem returns empty', async () => {
    mockSend.mockResolvedValueOnce({}); // event lookup → no Item
    const res = await callHandler([{ name: 'Sup A' }]);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('EVENT_NOT_FOUND');
  });
});

describe('import-normalized-event-suppliers — role matrix (ADR-015)', () => {
  it('OWNER → approvalStatus=DIRECT, no requestedBy', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })  // OWNER path skips collab query
      .mockResolvedValueOnce({ Items: [] })                  // fetchSuppliersByOwnerWithIds
      .mockResolvedValueOnce({ Items: [] })                  // fetchExistingEventSupplierLinks
      .mockResolvedValueOnce({})                             // batch-write suppliers
      .mockResolvedValueOnce({});                            // batch-write eventSuppliers

    const res = await callHandler([{ name: 'Sup A' }]);

    expect(res.success).toBe(true);
    expect(res.reason).toBe('SUCCESS');
    expect(res.suppliersCreated).toBe(1);
    expect(res.eventSuppliersCreated).toBe(1);

    // Inspect the EventSupplier payload written to DynamoDB
    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    const esCall = BatchWriteItemCommand.mock.calls.find(
      ([arg]) => arg.RequestItems?.[EVENT_SUPPLIER_TABLE],
    );
    const esItem = esCall![0].RequestItems[EVENT_SUPPLIER_TABLE][0].PutRequest.Item;
    expect(esItem.approvalStatus.S).toBe('DIRECT');
    expect(esItem.requestedBy).toBeUndefined();
    expect(esItem.owner.S).toBe(`${USER_ID}::${USER_ID}`);
  });

  it('CO_MANAGER → approvalStatus=DIRECT', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [collaboratorItem('CO_MANAGER')] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([{ name: 'Sup A' }]);
    expect(res.reason).toBe('SUCCESS');

    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    const esCall = BatchWriteItemCommand.mock.calls.find(
      ([arg]) => arg.RequestItems?.[EVENT_SUPPLIER_TABLE],
    );
    const esItem = esCall![0].RequestItems[EVENT_SUPPLIER_TABLE][0].PutRequest.Item;
    expect(esItem.approvalStatus.S).toBe('DIRECT');
    expect(esItem.requestedBy).toBeUndefined();
    // Record owned by EVENT owner (ADR-013), not calling user
    expect(esItem.owner.S).toBe(`${OWNER_SUB}::${OWNER_SUB}`);
  });

  it('STAFF_LOGISTICS → approvalStatus=PENDING_APPROVAL with requestedBy', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_LOGISTICS')] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([{ name: 'Sup A' }]);
    expect(res.reason).toBe('SUCCESS');

    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    const esCall = BatchWriteItemCommand.mock.calls.find(
      ([arg]) => arg.RequestItems?.[EVENT_SUPPLIER_TABLE],
    );
    const esItem = esCall![0].RequestItems[EVENT_SUPPLIER_TABLE][0].PutRequest.Item;
    expect(esItem.approvalStatus.S).toBe('PENDING_APPROVAL');
    expect(esItem.requestedBy.S).toBe(USER_ID);
  });

  it('STAFF_CHECKIN → UNAUTHORIZED, no writes', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_CHECKIN')] });

    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    BatchWriteItemCommand.mockClear();

    const res = await callHandler([{ name: 'Sup A' }]);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('UNAUTHORIZED');
    expect(BatchWriteItemCommand).not.toHaveBeenCalled();
  });

  it('No accepted collaborator record → UNAUTHORIZED', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [] }); // no collaborator match

    const res = await callHandler([{ name: 'Sup A' }]);
    expect(res.reason).toBe('UNAUTHORIZED');
  });
});

describe('import-normalized-event-suppliers — status gating (ADR-015)', () => {
  /**
   * STAFF_LOGISTICS has no SUPPLIER_APPROVE permission. A row with
   * status=APPROVED / PAID in the Excel would otherwise bypass the approval
   * workflow — the handler must force status=PENDING for this role regardless
   * of what the file says. OWNER/CO_MANAGER keep the Excel-as-source-of-truth
   * behaviour because they DO have the permission.
   */
  const getEventSupplierItem = () => {
    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    const esCall = BatchWriteItemCommand.mock.calls.find(
      ([arg]) => arg.RequestItems?.[EVENT_SUPPLIER_TABLE],
    );
    return esCall![0].RequestItems[EVENT_SUPPLIER_TABLE][0].PutRequest.Item;
  };

  it('STAFF_LOGISTICS with row.status=APPROVED is forced to PENDING', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_LOGISTICS')] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([{ name: 'Sup A', status: 'APPROVED' }]);
    expect(res.reason).toBe('SUCCESS');

    const esItem = getEventSupplierItem();
    expect(esItem.status.S).toBe('PENDING');
    expect(esItem.approvalStatus.S).toBe('PENDING_APPROVAL');
  });

  it('STAFF_LOGISTICS with row.status=PAID is forced to PENDING', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_LOGISTICS')] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([{ name: 'Sup A', status: 'PAID' }]);
    expect(res.reason).toBe('SUCCESS');

    const esItem = getEventSupplierItem();
    expect(esItem.status.S).toBe('PENDING');
    expect(esItem.approvalStatus.S).toBe('PENDING_APPROVAL');
  });

  it('OWNER with row.status=APPROVED keeps APPROVED (has SUPPLIER_APPROVE)', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([{ name: 'Sup A', status: 'APPROVED' }]);
    expect(res.reason).toBe('SUCCESS');

    const esItem = getEventSupplierItem();
    expect(esItem.status.S).toBe('APPROVED');
    expect(esItem.approvalStatus.S).toBe('DIRECT');
  });
  it('OWNER with row.status=COUNTING_ON keeps it and does not touch committedExpenses', async () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand?: jest.Mock;
    };
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([{ name: 'Sup A', status: 'COUNTING_ON', quoteAmount: 300 }]);
    expect(res.reason).toBe('SUCCESS');

    const esItem = getEventSupplierItem();
    expect(esItem.status.S).toBe('COUNTING_ON');
    expect(UpdateItemCommand?.mock.calls.length ?? 0).toBe(0);
  });
});

describe('import-normalized-event-suppliers — dedup & result shape', () => {
  const primeOwnerSuccessPath = (params: {
    existingSuppliers?: ReturnType<typeof supplierLookupItem>[];
    existingLinks?: ReturnType<typeof eventSupplierLinkItem>[];
  } = {}) => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: params.existingSuppliers || [] })
      .mockResolvedValueOnce({ Items: params.existingLinks || [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
  };

  it('reuses existing supplier when duplicate key matches DB row', async () => {
    primeOwnerSuccessPath({
      existingSuppliers: [supplierLookupItem('sup-existing', 'Sup A', 'a@x.pt')],
    });

    const res = await callHandler([
      { name: 'Sup A', contactEmail: 'a@x.pt' },
      { name: 'Sup B' }, // net new
    ]);

    expect(res.suppliersReused).toBe(1);
    expect(res.suppliersCreated).toBe(1);
    expect(res.eventSuppliersCreated).toBe(2);
    expect(res.reason).toBe('SUCCESS');
  });

  it('collapses duplicate names in the same batch', async () => {
    primeOwnerSuccessPath();

    const res = await callHandler([
      { name: 'Sup A' },
      { name: 'Sup A' }, // same dup key as above
    ]);

    // Supplier written once; EventSupplier link written once; the second row is
    // an in-batch duplicate of the same link.
    expect(res.suppliersCreated).toBe(1);
    expect(res.suppliersDeduplicatedInBatch).toBe(1);
    expect(res.rowsDuplicatedInBatch).toBe(1);
    expect(res.eventSuppliersCreated).toBe(1);
    expect(res.reason).toBe('SUCCESS_WITH_SKIPS');
  });

  it('skips rows whose supplier is already linked to the event', async () => {
    primeOwnerSuccessPath({
      existingSuppliers: [supplierLookupItem('sup-linked', 'Sup A', 'a@x.pt')],
      existingLinks: [eventSupplierLinkItem('sup-linked')],
    });

    const res = await callHandler([
      { name: 'Sup A', contactEmail: 'a@x.pt' },
      { name: 'Sup B' },
    ]);

    expect(res.rowsAlreadyLinkedOnEvent).toBe(1);
    expect(res.suppliersReused).toBe(1);
    expect(res.eventSuppliersCreated).toBe(1);
    expect(res.reason).toBe('SUCCESS_WITH_SKIPS');
  });

  it('counts rows with empty name as validationErrorCount', async () => {
    primeOwnerSuccessPath();

    const res = await callHandler([{ name: '   ' }, { name: 'Sup A' }]);

    expect(res.validationErrorCount).toBe(1);
    expect(res.eventSuppliersCreated).toBe(1);
    expect(res.reason).toBe('SUCCESS_WITH_SKIPS');
  });

  it('OWNER import with only PENDING rows does not update Event.committedExpenses', async () => {
    primeOwnerSuccessPath();
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };

    const res = await callHandler([
      { name: 'Sup A', quoteAmount: 100, status: 'PENDING' },
      { name: 'Sup B', quoteAmount: 50 }, // defaults to PENDING
    ]);

    expect(res.reason).toBe('SUCCESS');
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });

  it('ALL_ALREADY_LINKED when every row is a pre-existing link', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({
        Items: [supplierLookupItem('sup-x', 'Sup A', 'a@x.pt')],
      })
      .mockResolvedValueOnce({ Items: [eventSupplierLinkItem('sup-x')] });
    // No batch-writes expected because nothing is queued for write.

    const res = await callHandler([{ name: 'Sup A', contactEmail: 'a@x.pt' }]);

    expect(res.success).toBe(false);
    expect(res.reason).toBe('ALL_ALREADY_LINKED');
    expect(res.rowsAlreadyLinkedOnEvent).toBe(1);
    expect(res.eventSuppliersCreated).toBe(0);
  });
});

describe('import-normalized-event-suppliers — committedExpenses invariant (Option A)', () => {
  /**
   * When APPROVED rows are imported with a quoteAmount, the handler MUST also
   * increment Event.committedExpenses — otherwise remove-eventSupplier finds an
   * orphan APPROVED row (status=APPROVED but Event.committedExpenses doesn't
   * cover the quote) and cannot cleanly revert the financials. See the Option B
   * defensive fix in remove-eventSupplier/handler.ts and the sibling test. This
   * block enforces the structural invariant at the source.
   */

  const getUpdateInput = () => {
    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };
    return UpdateItemCommand.mock.calls[0]?.[0];
  };

  it('OWNER import with APPROVED row increments Event.committedExpenses by the quote', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({}) // batch-write suppliers
      .mockResolvedValueOnce({}) // batch-write eventSuppliers
      .mockResolvedValueOnce({}); // UpdateItem on Event

    const res = await callHandler([
      { name: 'Sup A', quoteAmount: 150, status: 'APPROVED' },
    ]);

    expect(res.reason).toBe('SUCCESS');

    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };
    expect(UpdateItemCommand).toHaveBeenCalledTimes(1);

    const input = getUpdateInput();
    expect(input.TableName).toBe(EVENT_TABLE);
    expect(input.Key.id.S).toBe(EVENT_ID);
    // Uses if_not_exists to tolerate Events whose committedExpenses attribute
    // doesn't exist yet (parity with approve-supplier-selection).
    expect(input.UpdateExpression).toMatch(/if_not_exists\(committedExpenses,\s*:zero\)\s*\+\s*:quote/);
    expect(input.ExpressionAttributeValues[':quote'].N).toBe('150');
    expect(input.ExpressionAttributeValues[':zero'].N).toBe('0');
  });

  it('OWNER import with mixed statuses only sums the APPROVED quotes', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([
      { name: 'Sup A', quoteAmount: 100, status: 'APPROVED' },
      { name: 'Sup B', quoteAmount: 200, status: 'APPROVED' },
      { name: 'Sup C', quoteAmount: 50, status: 'PENDING' },
      { name: 'Sup D', quoteAmount: 999, status: 'REJECTED' },
      { name: 'Sup E', quoteAmount: 77, status: 'PAID' }, // PAID should NOT add to committed
    ]);

    expect(res.reason).toBe('SUCCESS');

    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };
    expect(UpdateItemCommand).toHaveBeenCalledTimes(1);

    const input = getUpdateInput();
    // 100 + 200 = 300. PENDING, REJECTED, PAID are excluded.
    expect(input.ExpressionAttributeValues[':quote'].N).toBe('300');
  });

  it('STAFF_LOGISTICS APPROVED rows (forced to PENDING) do NOT increment committedExpenses', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(OWNER_SUB) })
      .mockResolvedValueOnce({ Items: [collaboratorItem('STAFF_LOGISTICS')] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([
      { name: 'Sup A', quoteAmount: 500, status: 'APPROVED' },
    ]);
    expect(res.reason).toBe('SUCCESS');

    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });

  it('APPROVED row without quoteAmount does not issue an Update', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await callHandler([
      { name: 'Sup A', status: 'APPROVED' }, // no quoteAmount
    ]);
    expect(res.reason).toBe('SUCCESS');

    const { UpdateItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      UpdateItemCommand: jest.Mock;
    };
    expect(UpdateItemCommand).not.toHaveBeenCalled();
  });
});

describe('import-normalized-event-suppliers — category normalization', () => {
  const getSupplierItem = (BatchWriteItemCommand: jest.Mock) => {
    const call = BatchWriteItemCommand.mock.calls.find(
      ([arg]) => arg.RequestItems?.[SUPPLIER_TABLE],
    );
    return call![0].RequestItems[SUPPLIER_TABLE][0].PutRequest.Item;
  };

  it('maps a PT synonym to the canonical category', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await callHandler([{ name: 'Sup A', category: 'Transporte' }]);

    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    expect(getSupplierItem(BatchWriteItemCommand).category.S).toBe('TRANSPORTATION');
  });

  it('passes through an unmatched category uppercased', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: eventItem(USER_ID) })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await callHandler([{ name: 'Sup A', category: 'Pyrotechnics' }]);

    const { BatchWriteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb') as {
      BatchWriteItemCommand: jest.Mock;
    };
    expect(getSupplierItem(BatchWriteItemCommand).category.S).toBe('PYROTECHNICS');
  });
});
