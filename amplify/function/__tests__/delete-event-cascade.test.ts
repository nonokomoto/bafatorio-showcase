jest.mock('../shared/cascadeDeleteEvent', () => ({
  cascadeDeleteEvent: jest.fn(),
  emptyCounts: jest.requireActual('../shared/cascadeDeleteEvent').emptyCounts,
}));

jest.mock('../shared/resolveEventAccess', () => ({
  fetchEventRecord: jest.fn(),
  normalizeUserId: (id: string) => (id ? id.split('::')[0] : id),
}));

const { cascadeDeleteEvent } = jest.requireMock('../shared/cascadeDeleteEvent') as {
  cascadeDeleteEvent: jest.Mock;
};
const { fetchEventRecord } = jest.requireMock('../shared/resolveEventAccess') as {
  fetchEventRecord: jest.Mock;
};

const ENV_TABLES = {
  BAFATORIO_APP_EVENT_TABLE_NAME: 'Event-table',
  BAFATORIO_APP_PARTICIPANT_TABLE_NAME: 'Participant-table',
  BAFATORIO_APP_DEPENDENT_TABLE_NAME: 'Dependent-table',
  BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME: 'EventSupplier-table',
  BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME: 'EventCollaborator-table',
  BAFATORIO_APP_ROLE_TABLE_NAME: 'Role-table',
  BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME: 'DocumentFolder-table',
  BAFATORIO_APP_EVENT_SCHEDULE_ENTRY_TABLE_NAME: 'EventScheduleEntry-table',
  BAFATORIO_APP_NOTION_DOCUMENT_TABLE_NAME: 'NotionDocument-table',
  BAFATORIO_APP_EMAIL_LOG_TABLE_NAME: 'EmailLog-table',
  BAFATORIO_APP_S3_BUCKET_NAME: 'test-bucket',
};

const makeResult = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  deleted: { event: 1, participants: 2 },
  failed: {},
  errors: [],
  ...overrides,
});

describe('delete-event-cascade handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    Object.assign(process.env, ENV_TABLES);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../delete-event-cascade/handler').handler;
  });

  beforeEach(() => {
    cascadeDeleteEvent.mockReset();
    fetchEventRecord.mockReset();
  });

  it('OWNER can delete: runs the cascade with the configured tables and returns its report', async () => {
    fetchEventRecord.mockResolvedValue({ id: 'evt-1', owner: 'user-1::user-1' });
    cascadeDeleteEvent.mockResolvedValue(makeResult());

    const result = await handler({
      arguments: { eventId: 'evt-1' },
      identity: { sub: 'user-1' },
    });

    expect(result).toEqual(makeResult());
    expect(cascadeDeleteEvent).toHaveBeenCalledTimes(1);
    expect(cascadeDeleteEvent).toHaveBeenCalledWith({
      eventId: 'evt-1',
      bucketName: 'test-bucket',
      tables: {
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
      },
    });
  });

  it('rejects a non-owner (collaborator or stranger) without running the cascade', async () => {
    fetchEventRecord.mockResolvedValue({ id: 'evt-1', owner: 'owner-9::owner-9' });

    await expect(
      handler({ arguments: { eventId: 'evt-1' }, identity: { sub: 'user-1' } })
    ).rejects.toThrow('Unauthorized: only the event owner can delete an event');

    expect(cascadeDeleteEvent).not.toHaveBeenCalled();
  });

  it('is idempotent: event already gone returns success without running the cascade', async () => {
    fetchEventRecord.mockRejectedValue(new Error('Event not found'));

    const result = await handler({
      arguments: { eventId: 'evt-1' },
      identity: { sub: 'user-1' },
    });

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(cascadeDeleteEvent).not.toHaveBeenCalled();
  });

  it('throws when identity or eventId is missing', async () => {
    await expect(
      handler({ arguments: { eventId: 'evt-1' }, identity: {} })
    ).rejects.toThrow('User identity not found');

    await expect(
      handler({ arguments: {}, identity: { sub: 'user-1' } })
    ).rejects.toThrow('eventId is required');

    expect(cascadeDeleteEvent).not.toHaveBeenCalled();
  });
});
