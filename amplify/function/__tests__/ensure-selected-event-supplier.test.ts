import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    PutItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};

const SUPPLIER_TABLE = 'test-supplier-table';
const EVENT_SUPPLIER_TABLE = 'test-event-supplier-table';

const BASE_PARAMS = {
  eventId: 'evt-1',
  supplierId: 'sup-1',
  eventOwnerRaw: 'owner-1::owner-1',
  now: '2026-05-03T10:00:00.000Z',
  callerUserId: 'owner-1',
  callerRole: 'OWNER',
  sharedSupplierIds: [] as string[],
};

const existingSupplierItem = marshall({ id: 'sup-1', owner: 'owner-1::owner-1' });

describe('ensureSelectedEventSupplier', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fn: (params: any) => Promise<void>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_REGION = 'eu-west-1';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fn = require('../shared/ensureSelectedEventSupplier').ensureSelectedEventSupplier;
  });

  beforeEach(() => mockSend.mockReset());

  it('throws when supplier does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: undefined }); // GetItem → not found

    await expect(fn(BASE_PARAMS)).rejects.toThrow('Supplier not found');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('throws when collaborator does not own or have shared access to supplier', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: marshall({ id: 'sup-1', owner: 'other-user::other-user' }) }); // GetItem

    await expect(fn({
      ...BASE_PARAMS,
      callerUserId: 'collab-1',
      callerRole: 'CO_MANAGER',
      sharedSupplierIds: [],
    })).rejects.toThrow('Unauthorized');
    expect(mockSend).toHaveBeenCalledTimes(2); // stopped at ownership check
  });

  it('allows collaborator with supplier in sharedSupplierIds', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: marshall({ id: 'sup-1', owner: 'other-user' }) }); // GetItem
    mockSend.mockResolvedValueOnce({}); // PutItemCommand

    await fn({
      ...BASE_PARAMS,
      callerUserId: 'collab-1',
      callerRole: 'CO_MANAGER',
      sharedSupplierIds: ['sup-1'],
    });

    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('is no-op when supplier already linked (Query returns result)', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ id: { S: 'es-1' } }] }); // Query → already linked

    await fn(BASE_PARAMS);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('is no-op on ConditionalCheckFailedException (concurrent call)', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: existingSupplierItem }); // GetItem → supplier exists
    mockSend.mockRejectedValueOnce(Object.assign(new Error('conflict'), { name: 'ConditionalCheckFailedException' }));

    await fn(BASE_PARAMS); // should not throw
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('creates EventSupplier with PENDING / DIRECT for OWNER', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: existingSupplierItem }); // GetItem → supplier exists
    mockSend.mockResolvedValueOnce({}); // PutItemCommand

    await fn(BASE_PARAMS);

    const putCall = mockSend.mock.calls[2][0];
    const { unmarshall } = require('@aws-sdk/util-dynamodb');
    const item = unmarshall(putCall.Item);
    expect(item.id).toBe('evt-1#sup-1');
    expect(item.status).toBe('PENDING');
    expect(item.approvalStatus).toBe('DIRECT');
    expect(item.requestedBy).toBeUndefined();
    expect(item.owner).toBe('owner-1::owner-1');
  });

  it('creates EventSupplier with PENDING_APPROVAL / requestedBy for STAFF_LOGISTICS', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: existingSupplierItem }); // GetItem → supplier exists
    mockSend.mockResolvedValueOnce({}); // PutItemCommand

    await fn({ ...BASE_PARAMS, callerUserId: 'staff-1', callerRole: 'STAFF_LOGISTICS', sharedSupplierIds: ['sup-1'] });

    const putCall = mockSend.mock.calls[2][0];
    const { unmarshall } = require('@aws-sdk/util-dynamodb');
    const item = unmarshall(putCall.Item);
    expect(item.approvalStatus).toBe('PENDING_APPROVAL');
    expect(item.requestedBy).toBe('staff-1');
  });

  it('propagates unexpected DynamoDB errors from PutItem', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] }); // Query → not linked
    mockSend.mockResolvedValueOnce({ Item: existingSupplierItem }); // GetItem → supplier exists
    mockSend.mockRejectedValueOnce(Object.assign(new Error('DynamoDB down'), { name: 'ServiceUnavailableException' }));

    await expect(fn(BASE_PARAMS)).rejects.toThrow('DynamoDB down');
  });
});
