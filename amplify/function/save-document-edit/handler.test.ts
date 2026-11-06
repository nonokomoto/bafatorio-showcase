import { handler } from './handler';
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
    QueryCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({})),
  PutObjectCommand: jest.fn((input: unknown) => input),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://s3.test/presigned?sig=abc')),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner') as {
  getSignedUrl: jest.Mock;
};

const EVENT_TABLE = 'test-event-table';
const COLLAB_TABLE = 'test-collab-table';
const FOLDER_TABLE = 'test-folder-table';
const BUCKET = 'test-bucket';

const EVENT_ID = 'evt-1';
const FOLDER_ID = 'fld-1';
const USER_ID = 'user-1';
const OTHER_USER = 'user-2';
const DOC_PATH = `event-documents/${EVENT_ID}/${FOLDER_ID}/sheet.xlsx`;

const makeEvent = (
  overrides: Partial<{ eventId: string; folderId: string; documentPath: string; sub: string | undefined }> = {}
) => ({
  arguments: {
    eventId: overrides.eventId ?? EVENT_ID,
    folderId: overrides.folderId ?? FOLDER_ID,
    documentPath: overrides.documentPath ?? DOC_PATH,
  },
  identity: 'sub' in overrides ? { sub: overrides.sub } : { sub: USER_ID },
});

const mockEventItem = (owner: string) =>
  marshall({ id: EVENT_ID, owner });

const mockCollabItem = (role: string, sharedFolderIds: string[] = []) =>
  marshall({
    userId: USER_ID,
    eventId: EVENT_ID,
    role,
    status: 'ACCEPTED',
    sharedFolderIds,
  });

const mockFolderItem = (owner: string) =>
  marshall({ id: FOLDER_ID, eventId: EVENT_ID, owner });

beforeEach(() => {
  mockSend.mockReset();
  getSignedUrl.mockClear();
  getSignedUrl.mockResolvedValue('https://s3.test/presigned?sig=abc');
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLAB_TABLE;
  process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME = FOLDER_TABLE;
  process.env.BAFATORIO_APP_S3_BUCKET_NAME = BUCKET;
  process.env.BAFATORIO_APP_REGION = 'eu-west-1';
});

describe('save-document-edit handler', () => {
  describe('authorization — identity', () => {
    it('throws when identity.sub is missing', async () => {
      await expect(
        handler(makeEvent({ sub: undefined }) as never)
      ).rejects.toThrow(/identity/i);
    });

    it('does not fall back to header or body userId (trust only identity.sub)', async () => {
      // If handler tried to read x-user-id from headers/body it would succeed.
      // With AppSync resolver the only trusted source is identity.sub.
      await expect(
        handler({
          arguments: { eventId: EVENT_ID, folderId: FOLDER_ID, documentPath: DOC_PATH, userId: USER_ID },
          identity: {},
        } as never)
      ).rejects.toThrow();
    });
  });

  describe('argument validation', () => {
    it.each([
      ['eventId', { eventId: '' }],
      ['folderId', { folderId: '' }],
      ['documentPath', { documentPath: '' }],
    ])('throws when %s is empty', async (_label, override) => {
      await expect(handler(makeEvent(override) as never)).rejects.toThrow();
    });

    it('rejects documentPath that does not match event-documents/{eventId}/{folderId}/...', async () => {
      mockSend.mockResolvedValueOnce({ Item: mockEventItem(USER_ID) });
      await expect(
        handler(makeEvent({ documentPath: `event-documents/other-event/${FOLDER_ID}/x.xlsx` }) as never)
      ).rejects.toThrow(/path/i);
    });

    it('rejects documentPath with path traversal', async () => {
      mockSend.mockResolvedValueOnce({ Item: mockEventItem(USER_ID) });
      await expect(
        handler(makeEvent({ documentPath: `event-documents/${EVENT_ID}/${FOLDER_ID}/../../../secret.xlsx` }) as never)
      ).rejects.toThrow(/path/i);
    });

    it('rejects documentPath without event-documents prefix', async () => {
      mockSend.mockResolvedValueOnce({ Item: mockEventItem(USER_ID) });
      await expect(
        handler(makeEvent({ documentPath: `public/${EVENT_ID}/${FOLDER_ID}/x.xlsx` }) as never)
      ).rejects.toThrow(/path/i);
    });
  });

  describe('when user is OWNER of the event', () => {
    it('allows editing any folder (even when not folder owner) and returns presigned URL', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(USER_ID) }) // Event
        .mockResolvedValueOnce({ Item: mockFolderItem(OTHER_USER) }); // Folder owned by someone else

      const result = await handler(makeEvent() as never);

      expect(result.presignedUrl).toBe('https://s3.test/presigned?sig=abc');
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('normalizes Gen 1 owner format (userId::userId)', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(`${USER_ID}::${USER_ID}`) })
        .mockResolvedValueOnce({ Item: mockFolderItem(OTHER_USER) });

      const result = await handler(makeEvent() as never);

      expect(result.presignedUrl).toBeTruthy();
    });

    it('does not query EventCollaborator table when user is event owner', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(USER_ID) })
        .mockResolvedValueOnce({ Item: mockFolderItem(USER_ID) });

      await handler(makeEvent() as never);

      const { QueryCommand } = jest.requireMock('@aws-sdk/client-dynamodb');
      expect(QueryCommand).not.toHaveBeenCalled();
    });
  });

  describe('when user is a collaborator', () => {
    it('allows CO_MANAGER to edit a folder THEY own', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(OTHER_USER) }) // event owned by someone else
        .mockResolvedValueOnce({ Items: [mockCollabItem('CO_MANAGER')] }) // user is CO_MANAGER
        .mockResolvedValueOnce({ Item: mockFolderItem(USER_ID) }); // folder owned by user

      const result = await handler(makeEvent() as never);

      expect(result.presignedUrl).toBeTruthy();
    });

    it('allows STAFF_LOGISTICS to edit a folder THEY own', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(OTHER_USER) })
        .mockResolvedValueOnce({ Items: [mockCollabItem('STAFF_LOGISTICS')] })
        .mockResolvedValueOnce({ Item: mockFolderItem(USER_ID) });

      const result = await handler(makeEvent() as never);

      expect(result.presignedUrl).toBeTruthy();
    });

    it('rejects CO_MANAGER editing a folder they do NOT own even if shared (ADR-021: shared=upload-only)', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(OTHER_USER) })
        .mockResolvedValueOnce({ Items: [mockCollabItem('CO_MANAGER', [FOLDER_ID])] }) // shared
        .mockResolvedValueOnce({ Item: mockFolderItem(OTHER_USER) }); // not their folder

      await expect(handler(makeEvent() as never)).rejects.toThrow(/permission|access|denied|edit/i);
    });

    it('rejects STAFF_LOGISTICS editing a folder they do NOT own even if shared', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(OTHER_USER) })
        .mockResolvedValueOnce({ Items: [mockCollabItem('STAFF_LOGISTICS', [FOLDER_ID])] })
        .mockResolvedValueOnce({ Item: mockFolderItem(OTHER_USER) });

      await expect(handler(makeEvent() as never)).rejects.toThrow(/permission|access|denied|edit/i);
    });

    it('rejects STAFF_CHECKIN even on their own folder', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(OTHER_USER) })
        .mockResolvedValueOnce({ Items: [mockCollabItem('STAFF_CHECKIN')] })
        .mockResolvedValueOnce({ Item: mockFolderItem(USER_ID) });

      await expect(handler(makeEvent() as never)).rejects.toThrow(/permission|access|denied|role/i);
    });

    it('rejects non-collaborator (user has no accepted collaboration on this event)', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(OTHER_USER) })
        .mockResolvedValueOnce({ Items: [] });

      await expect(handler(makeEvent() as never)).rejects.toThrow(/collaborat|access|unauthorized/i);
    });

    it('rejects when event does not exist', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(handler(makeEvent() as never)).rejects.toThrow(/event/i);
    });

    it('rejects when folder does not exist', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(USER_ID) })
        .mockResolvedValueOnce({ Item: undefined });

      await expect(handler(makeEvent() as never)).rejects.toThrow(/folder/i);
    });

    it('rejects when folder belongs to a different event', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(USER_ID) })
        .mockResolvedValueOnce({ Item: marshall({ id: FOLDER_ID, eventId: 'other-event', owner: USER_ID }) });

      await expect(handler(makeEvent() as never)).rejects.toThrow(/folder|event/i);
    });
  });

  describe('presigned URL generation', () => {
    it('generates URL scoped to the exact documentPath', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(USER_ID) })
        .mockResolvedValueOnce({ Item: mockFolderItem(USER_ID) });

      await handler(makeEvent() as never);

      const { PutObjectCommand } = jest.requireMock('@aws-sdk/client-s3');
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: BUCKET,
          Key: DOC_PATH,
        })
      );
    });

    it('uses a short TTL (<=300s)', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockEventItem(USER_ID) })
        .mockResolvedValueOnce({ Item: mockFolderItem(USER_ID) });

      const result = await handler(makeEvent() as never);

      expect(result.expiresIn).toBeLessThanOrEqual(300);
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: result.expiresIn })
      );
    });
  });
});
