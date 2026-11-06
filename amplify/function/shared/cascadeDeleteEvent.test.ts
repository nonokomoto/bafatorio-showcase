import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => ({ __command: 'GetItem', input })),
    QueryCommand: jest.fn((input: unknown) => ({ __command: 'Query', input })),
    DeleteItemCommand: jest.fn((input: unknown) => ({ __command: 'DeleteItem', input })),
    BatchWriteItemCommand: jest.fn((input: unknown) => ({ __command: 'BatchWrite', input })),
    _mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/client-s3', () => {
  const mockS3Send = jest.fn();
  return {
    S3Client: jest.fn(() => ({ send: mockS3Send })),
    ListObjectsV2Command: jest.fn((input: unknown) => ({ __command: 'ListObjectsV2', input })),
    DeleteObjectsCommand: jest.fn((input: unknown) => ({ __command: 'DeleteObjects', input })),
    _mockS3Send: mockS3Send,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { _mockS3Send: mockS3Send } = jest.requireMock('@aws-sdk/client-s3') as {
  _mockS3Send: jest.Mock;
};

import { cascadeDeleteEvent } from './cascadeDeleteEvent';

const TABLES = {
  event: 'Event-table',
  participant: 'Participant-table',
  dependent: 'Dependent-table',
  eventSupplier: 'EventSupplier-table',
  eventCollaborator: 'EventCollaborator-table',
  role: 'Role-table',
  documentFolder: 'DocumentFolder-table',
  eventScheduleEntry: 'EventScheduleEntry-table',
  notionDocument: 'NotionDocument-table',
  emailLog: 'EmailLog-table',
};

const BUCKET = 'test-bucket';
const EVENT_ID = 'evt-1';

type Cmd = { __command: string; input: Record<string, any> };

/**
 * Default routing: event exists, every child query is empty, S3 prefix empty,
 * every delete succeeds. Individual tests override per command.
 */
const routeByDefault = (overrides?: (cmd: Cmd) => unknown | undefined) => {
  mockSend.mockImplementation((cmd: Cmd) => {
    const overridden = overrides?.(cmd);
    if (overridden !== undefined) return Promise.resolve(overridden);
    if (cmd.__command === 'GetItem') {
      return Promise.resolve({
        Item: marshall({ id: EVENT_ID, owner: 'user-1::user-1' }),
      });
    }
    if (cmd.__command === 'Query') return Promise.resolve({ Items: [] });
    if (cmd.__command === 'BatchWrite') return Promise.resolve({ UnprocessedItems: {} });
    return Promise.resolve({});
  });
  mockS3Send.mockImplementation((cmd: Cmd) => {
    if (cmd.__command === 'ListObjectsV2') {
      return Promise.resolve({ Contents: [], IsTruncated: false });
    }
    return Promise.resolve({});
  });
};

const sentCommands = (): Cmd[] => mockSend.mock.calls.map(([cmd]) => cmd);
const sentS3Commands = (): Cmd[] => mockS3Send.mock.calls.map(([cmd]) => cmd);

beforeEach(() => {
  mockSend.mockReset();
  mockS3Send.mockReset();
});

describe('cascadeDeleteEvent', () => {
  test('event with no children: deletes the Event record and reports success', async () => {
    routeByDefault();

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.deleted.event).toBe(1);

    const deletes = sentCommands().filter((c) => c.__command === 'DeleteItem');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].input.TableName).toBe('Event-table');
    expect(deletes[0].input.Key).toEqual(marshall({ id: EVENT_ID }));
  });

  test('children found via byEventId GSIs are batch-deleted before the Event, and counted', async () => {
    const childrenByTable: Record<string, string[]> = {
      'EventSupplier-table': ['sup-1', 'sup-2'],
      'EventCollaborator-table': ['col-1'],
      'Role-table': ['role-1', 'role-2', 'role-3'],
      'DocumentFolder-table': ['fold-1'],
      'EventScheduleEntry-table': ['sch-1'],
      'NotionDocument-table': ['not-1'],
      'EmailLog-table': ['log-1', 'log-2'],
    };

    routeByDefault((cmd) => {
      if (cmd.__command === 'Query' && childrenByTable[cmd.input.TableName]) {
        expect(cmd.input.IndexName).toBe('byEventId');
        expect(cmd.input.ExpressionAttributeValues).toEqual(
          expect.objectContaining({ ':eventId': { S: EVENT_ID } })
        );
        return {
          Items: childrenByTable[cmd.input.TableName].map((id) => marshall({ id })),
        };
      }
      return undefined;
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(true);
    expect(result.deleted).toEqual({
      participants: 0,
      dependents: 0,
      eventSuppliers: 2,
      collaborators: 1,
      roles: 3,
      documentFolders: 1,
      scheduleEntries: 1,
      notionDocuments: 1,
      emailLogs: 2,
      s3Objects: 0,
      event: 1,
    });

    const cmds = sentCommands();
    const batchWrites = cmds.filter((c) => c.__command === 'BatchWrite');
    const deletedKeysByTable: Record<string, string[]> = {};
    for (const bw of batchWrites) {
      for (const [table, reqs] of Object.entries(
        bw.input.RequestItems as Record<string, Array<{ DeleteRequest: { Key: { id: { S: string } } } }>>
      )) {
        deletedKeysByTable[table] = (deletedKeysByTable[table] || []).concat(
          reqs.map((r) => r.DeleteRequest.Key.id.S)
        );
      }
    }
    expect(deletedKeysByTable).toEqual(childrenByTable);

    // Event record must be the last thing deleted
    const eventDeleteIdx = cmds.findIndex((c) => c.__command === 'DeleteItem');
    const lastBatchIdx = cmds.map((c) => c.__command).lastIndexOf('BatchWrite');
    expect(eventDeleteIdx).toBeGreaterThan(lastBatchIdx);
  });

  test('participants are found via gsi-Event.participants and their dependents deleted first', async () => {
    routeByDefault((cmd) => {
      if (cmd.__command === 'Query' && cmd.input.TableName === 'Participant-table') {
        expect(cmd.input.IndexName).toBe('gsi-Event.participants');
        return { Items: [marshall({ id: 'part-1' }), marshall({ id: 'part-2' })] };
      }
      if (cmd.__command === 'Query' && cmd.input.TableName === 'Dependent-table') {
        expect(cmd.input.IndexName).toBe('gsi-Participant.dependents');
        const pid = cmd.input.ExpressionAttributeValues[':participantId'].S;
        return pid === 'part-1'
          ? { Items: [marshall({ id: 'dep-1' }), marshall({ id: 'dep-2' })] }
          : { Items: [] };
      }
      return undefined;
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(true);
    expect(result.deleted.participants).toBe(2);
    expect(result.deleted.dependents).toBe(2);

    const batchWrites = sentCommands().filter((c) => c.__command === 'BatchWrite');
    const tablesInOrder = batchWrites.map((bw) => Object.keys(bw.input.RequestItems)[0]);
    const depIdx = tablesInOrder.indexOf('Dependent-table');
    const partIdx = tablesInOrder.indexOf('Participant-table');
    expect(depIdx).toBeGreaterThanOrEqual(0);
    expect(partIdx).toBeGreaterThan(depIdx);

    const partBatch = batchWrites[partIdx].input.RequestItems['Participant-table'];
    expect(partBatch.map((r: any) => r.DeleteRequest.Key.id.S)).toEqual(['part-1', 'part-2']);
    const depBatch = batchWrites[depIdx].input.RequestItems['Dependent-table'];
    expect(depBatch.map((r: any) => r.DeleteRequest.Key.id.S)).toEqual(['dep-1', 'dep-2']);
  });

  test('partial failure: Event record is NOT deleted, failure is counted and reported, other tables still processed', async () => {
    routeByDefault((cmd) => {
      if (cmd.__command === 'Query' && cmd.input.TableName === 'Role-table') {
        return { Items: [marshall({ id: 'role-1' }), marshall({ id: 'role-2' })] };
      }
      if (cmd.__command === 'Query' && cmd.input.TableName === 'EventSupplier-table') {
        return { Items: [marshall({ id: 'sup-1' })] };
      }
      if (
        cmd.__command === 'BatchWrite' &&
        Object.keys(cmd.input.RequestItems)[0] === 'Role-table'
      ) {
        return Promise.reject(new Error('ProvisionedThroughputExceededException'));
      }
      return undefined;
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(false);
    expect(result.failed.roles).toBe(2);
    expect(result.deleted.roles).toBe(0);
    expect(result.deleted.event).toBe(0);
    expect(result.errors).toEqual([
      expect.stringContaining('ProvisionedThroughputExceededException'),
    ]);

    // other child tables were still processed despite the Role failure
    expect(result.deleted.eventSuppliers).toBe(1);

    // the Event record itself must survive so a retry can resume
    const deletes = sentCommands().filter((c) => c.__command === 'DeleteItem');
    expect(deletes).toHaveLength(0);
  });

  test('idempotent: when the Event record no longer exists, returns success without touching anything', async () => {
    routeByDefault((cmd) => {
      if (cmd.__command === 'GetItem') return {}; // no Item — already deleted
      return undefined;
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.deleted).toEqual(emptyCountsFixture());
    expect(result.failed).toEqual(emptyCountsFixture());

    const nonGetCommands = sentCommands().filter((c) => c.__command !== 'GetItem');
    expect(nonGetCommands).toEqual([]);
    expect(sentS3Commands()).toEqual([]);
  });

  test('S3 objects under event-documents/{eventId}/ are deleted with pagination, before the Event record', async () => {
    routeByDefault();
    mockS3Send.mockImplementation((cmd: Cmd) => {
      if (cmd.__command === 'ListObjectsV2') {
        expect(cmd.input.Bucket).toBe(BUCKET);
        expect(cmd.input.Prefix).toBe(`event-documents/${EVENT_ID}/`);
        if (!cmd.input.ContinuationToken) {
          return Promise.resolve({
            Contents: [{ Key: `event-documents/${EVENT_ID}/f1/doc.pdf` }, { Key: `event-documents/${EVENT_ID}/f1/img.png` }],
            IsTruncated: true,
            NextContinuationToken: 'page-2',
          });
        }
        expect(cmd.input.ContinuationToken).toBe('page-2');
        return Promise.resolve({
          Contents: [{ Key: `event-documents/${EVENT_ID}/participant-photos/p1.jpg` }],
          IsTruncated: false,
        });
      }
      return Promise.resolve({});
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(true);
    expect(result.deleted.s3Objects).toBe(3);
    expect(result.deleted.event).toBe(1);

    const deleteObjectCalls = sentS3Commands().filter((c) => c.__command === 'DeleteObjects');
    const allKeys = deleteObjectCalls.flatMap((c) =>
      c.input.Delete.Objects.map((o: { Key: string }) => o.Key)
    );
    expect(allKeys).toEqual([
      `event-documents/${EVENT_ID}/f1/doc.pdf`,
      `event-documents/${EVENT_ID}/f1/img.png`,
      `event-documents/${EVENT_ID}/participant-photos/p1.jpg`,
    ]);
  });

  test('S3 failure blocks the Event record deletion and is reported', async () => {
    routeByDefault();
    mockS3Send.mockImplementation((cmd: Cmd) => {
      if (cmd.__command === 'ListObjectsV2') {
        return Promise.reject(new Error('AccessDenied'));
      }
      return Promise.resolve({});
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(false);
    expect(result.deleted.event).toBe(0);
    expect(result.errors).toEqual([expect.stringContaining('AccessDenied')]);
    expect(sentCommands().filter((c) => c.__command === 'DeleteItem')).toHaveLength(0);
  });

  test('participant deletion failure is reported instead of thrown, and Event survives', async () => {
    routeByDefault((cmd) => {
      if (cmd.__command === 'Query' && cmd.input.TableName === 'Participant-table') {
        return { Items: [marshall({ id: 'part-1' })] };
      }
      if (
        cmd.__command === 'BatchWrite' &&
        Object.keys(cmd.input.RequestItems)[0] === 'Participant-table'
      ) {
        return Promise.reject(new Error('InternalServerError'));
      }
      return undefined;
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(false);
    expect(result.failed.participants).toBe(1);
    expect(result.deleted.event).toBe(0);
    expect(result.errors).toEqual([expect.stringContaining('InternalServerError')]);
    expect(sentCommands().filter((c) => c.__command === 'DeleteItem')).toHaveLength(0);
  });

  test('UnprocessedItems from BatchWrite are retried until drained', async () => {
    const roleItems = [marshall({ id: 'role-1' }), marshall({ id: 'role-2' })];
    let roleBatchCalls = 0;
    routeByDefault((cmd) => {
      if (cmd.__command === 'Query' && cmd.input.TableName === 'Role-table') {
        return { Items: roleItems };
      }
      if (
        cmd.__command === 'BatchWrite' &&
        Object.keys(cmd.input.RequestItems)[0] === 'Role-table'
      ) {
        roleBatchCalls += 1;
        if (roleBatchCalls === 1) {
          // first call: role-2 comes back unprocessed
          return {
            UnprocessedItems: {
              'Role-table': [{ DeleteRequest: { Key: marshall({ id: 'role-2' }) } }],
            },
          };
        }
        return { UnprocessedItems: {} };
      }
      return undefined;
    });

    const result = await cascadeDeleteEvent({
      eventId: EVENT_ID,
      tables: TABLES,
      bucketName: BUCKET,
    });

    expect(result.success).toBe(true);
    expect(result.deleted.roles).toBe(2);
    expect(roleBatchCalls).toBe(2);

    // the retry batch must contain exactly the unprocessed key
    const roleBatches = sentCommands().filter(
      (c) => c.__command === 'BatchWrite' && c.input.RequestItems['Role-table']
    );
    expect(
      roleBatches[1].input.RequestItems['Role-table'].map((r: any) => r.DeleteRequest.Key.id.S)
    ).toEqual(['role-2']);
  });
});

const emptyCountsFixture = () => ({
  participants: 0,
  dependents: 0,
  eventSuppliers: 0,
  collaborators: 0,
  roles: 0,
  documentFolders: 0,
  scheduleEntries: 0,
  notionDocuments: 0,
  emailLogs: 0,
  s3Objects: 0,
  event: 0,
});
