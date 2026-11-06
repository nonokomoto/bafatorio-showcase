import { handler } from './handler';
import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    ScanCommand: jest.fn((input: unknown) => input),
    DeleteItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};

const SUPPLIER_TABLE = 'test-supplier-table';
const EVENT_SUPPLIER_TABLE = 'test-event-supplier-table';

const makeEvent = (supplierId: string, userId = 'user-1') => ({
  arguments: { supplierId },
  identity: { sub: userId },
});

const makeSupplierItem = (id: string, owner: string) =>
  marshall({ id, owner, name: 'Test Supplier' });

beforeEach(() => {
  jest.clearAllMocks();
  mockSend.mockReset();
  process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME = SUPPLIER_TABLE;
  process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
});

describe('delete-supplier handler', () => {
  describe('when supplier is linked to events', () => {
    it('returns success:false with the event count in the payload', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 3 });

      const result = await handler(makeEvent('s-1') as never);

      expect(result.success).toBe(false);
      // Handler separates machine-readable code (message) from the count so the
      // frontend can i18n the message without regex-parsing it.
      expect(result.message).toBe('SUPPLIER_LINKED_TO_EVENTS');
      expect(result.eventCount).toBe(3);
    });

    it('does not call DeleteItemCommand when linked to events', async () => {
      const { DeleteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb');
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 1 });

      await handler(makeEvent('s-1') as never);

      expect(DeleteItemCommand).not.toHaveBeenCalled();
    });
  });

  describe('when supplier has no linked events', () => {
    it('returns success:true after deleting', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 0 })
        .mockResolvedValueOnce({});

      const result = await handler(makeEvent('s-1') as never);

      expect(result.success).toBe(true);
    });

    it('calls DeleteItemCommand targeting the supplier table', async () => {
      const { DeleteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb');
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 0 })
        .mockResolvedValueOnce({});

      await handler(makeEvent('s-1') as never);

      expect(DeleteItemCommand).toHaveBeenCalledWith(
        expect.objectContaining({ TableName: SUPPLIER_TABLE }),
      );
    });
  });

  describe('reference counting across paginated scan pages', () => {
    it('blocks deletion when links only appear on a later scan page', async () => {
      const { DeleteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb');
      // A Scan reads at most 1MB per page. If the supplier's links sit beyond the
      // first page, a single-page COUNT reports 0 and would wrongly delete a
      // still-referenced supplier. The handler must paginate via LastEvaluatedKey.
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 0, LastEvaluatedKey: { id: marshall('es-page1') } })
        .mockResolvedValueOnce({ Count: 2 });

      const result = await handler(makeEvent('s-1') as never);

      expect(result.success).toBe(false);
      expect(result.message).toBe('SUPPLIER_LINKED_TO_EVENTS');
      expect(result.eventCount).toBe(2);
      expect(DeleteItemCommand).not.toHaveBeenCalled();
    });

    it('deletes only after every scan page reports zero references', async () => {
      const { DeleteItemCommand } = jest.requireMock('@aws-sdk/client-dynamodb');
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 0, LastEvaluatedKey: { id: marshall('es-page1') } })
        .mockResolvedValueOnce({ Count: 0 })
        .mockResolvedValueOnce({});

      const result = await handler(makeEvent('s-1') as never);

      expect(result.success).toBe(true);
      expect(DeleteItemCommand).toHaveBeenCalledWith(
        expect.objectContaining({ TableName: SUPPLIER_TABLE }),
      );
    });

    it('stops scanning as soon as a page reports references (early-exit)', async () => {
      // First page already proves the supplier is linked — no reason to keep
      // scanning the rest of the (cross-tenant) table.
      mockSend
        .mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'user-1') })
        .mockResolvedValueOnce({ Count: 1, LastEvaluatedKey: { id: marshall('es-page1') } });

      const result = await handler(makeEvent('s-1') as never);

      expect(result.success).toBe(false);
      // GetItem + exactly one Scan page, then bail — no second Scan.
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('authorization', () => {
    it('throws when userId is absent from identity', async () => {
      await expect(
        handler({ arguments: { supplierId: 's-1' }, identity: {} } as never),
      ).rejects.toThrow();
    });

    it('throws when user does not own the supplier', async () => {
      mockSend.mockResolvedValueOnce({ Item: makeSupplierItem('s-1', 'other-user') });

      await expect(handler(makeEvent('s-1', 'user-1') as never)).rejects.toThrow();
    });

    it('throws when supplier does not exist', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(handler(makeEvent('s-1') as never)).rejects.toThrow();
    });
  });

  describe('validation', () => {
    it('throws when supplierId is empty', async () => {
      await expect(handler(makeEvent('') as never)).rejects.toThrow();
    });
  });
});
