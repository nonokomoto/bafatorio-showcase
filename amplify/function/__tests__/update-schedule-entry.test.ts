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
    UpdateItemCommand: jest.fn((input: unknown) => input),
    PutItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('../shared/resolveEventAccess', () => ({
  resolveEventAccess: jest.fn(),
  normalizeUserId: (id: string) => id.split('::')[0],
}));

jest.mock('../shared/scheduleEntry', () => ({
  getScheduleEntry: jest.fn(),
}));

jest.mock('../shared/scheduleEntryAccess', () => ({
  assertCanEditEntry: jest.fn(),
}));

jest.mock('../shared/ensureSelectedEventSupplier', () => ({
  ensureSelectedEventSupplier: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../shared/assertParticipantsInEvent', () => ({
  assertParticipantsInEvent: jest.fn().mockResolvedValue(undefined),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as { resolveEventAccess: jest.Mock };
const { getScheduleEntry } = jest.requireMock('../shared/scheduleEntry') as {
  getScheduleEntry: jest.Mock;
};
const { assertCanEditEntry } = jest.requireMock('../shared/scheduleEntryAccess') as {
  assertCanEditEntry: jest.Mock;
};
const { ensureSelectedEventSupplier } = jest.requireMock('../shared/ensureSelectedEventSupplier') as {
  ensureSelectedEventSupplier: jest.Mock;
};
const { assertParticipantsInEvent } = jest.requireMock('../shared/assertParticipantsInEvent') as {
  assertParticipantsInEvent: jest.Mock;
};

const SCHEDULE_TABLE = 'test-schedule-table';
const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';
const EVENT_SUPPLIER_TABLE = 'test-event-supplier-table';
const PARTICIPANT_TABLE = 'test-participant-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: { id: 'entry-1', eventId: 'evt-1', title: 'Updated title', ...overrides },
  identity: { sub: 'user-1' },
});

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  eventId: 'evt-1',
  date: '2026-06-15',
  title: 'Original title',
  owner: 'user-1::user-1',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
});

const makeOwnerAccess = () => ({
  role: 'OWNER',
  eventOwner: 'user-1',
  eventRecord: { id: 'evt-1', owner: 'user-1::user-1', eventDateType: 'range', eventStartDate: '2026-06-01', eventEndDate: '2026-06-30' },
  collaboratorRecord: null,
  sharedSupplierIds: [],
  hasPermission: (p: string) => p === 'schedule:edit',
});

const makeCollaboratorAccess = (role: string) => ({
  role,
  eventOwner: 'owner-1',
  eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1', eventDateType: 'range', eventStartDate: '2026-06-01', eventEndDate: '2026-06-30' },
  collaboratorRecord: { id: 'c-1', eventId: 'evt-1', userId: 'user-1', role, status: 'ACCEPTED' },
  sharedSupplierIds: [],
  hasPermission: (p: string) =>
    p === 'schedule:edit' && (role === 'CO_MANAGER' || role === 'STAFF_LOGISTICS'),
});

describe('update-schedule-entry handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME = SCHEDULE_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME = PARTICIPANT_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../update-schedule-entry/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    getScheduleEntry.mockReset();
    assertCanEditEntry.mockReset();
    ensureSelectedEventSupplier.mockReset();
    ensureSelectedEventSupplier.mockResolvedValue(undefined);
    assertParticipantsInEvent.mockReset();
    assertParticipantsInEvent.mockResolvedValue(undefined);
  });

  it('updates entry for OWNER and returns updated entry', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeEntry({ title: 'Updated title', updatedAt: '2026-05-03T10:00:00.000Z' })),
    });

    const result = await handler(makeHandlerEvent());

    expect(result.id).toBe('entry-1');
    expect(result.title).toBe('Updated title');
    expect(assertCanEditEntry).toHaveBeenCalledWith({
      role: 'OWNER',
      entryOwnerUserId: 'user-1::user-1',
      currentUserId: 'user-1',
    });
  });

  it('updates entry for CO_MANAGER editing the OWNER entry (ADR-030)', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'owner-1::owner-1' }));
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeEntry({ title: 'Updated title' })),
    });

    const result = await handler(makeHandlerEvent());
    expect(result.title).toBe('Updated title');
    expect(assertCanEditEntry).toHaveBeenCalled();
  });

  it('updates entry for STAFF_LOGISTICS on their own entry (ADR-030)', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('STAFF_LOGISTICS'));
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'user-1::user-1' }));
    mockSend.mockResolvedValueOnce({
      Attributes: marshall(makeEntry({ title: 'Updated title' })),
    });

    const result = await handler(makeHandlerEvent());
    expect(result.title).toBe('Updated title');
  });

  it('rejects STAFF_LOGISTICS editing an entry authored by someone else', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('STAFF_LOGISTICS'));
    getScheduleEntry.mockResolvedValue(makeEntry({ owner: 'owner-1::owner-1' }));
    assertCanEditEntry.mockImplementation(() => {
      throw new Error('Access denied: insufficient permissions to edit this schedule entry');
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('rejects role without schedule:edit permission', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_CHECKIN'),
      hasPermission: () => false,
    });
    getScheduleEntry.mockResolvedValue(makeEntry());

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('rejects a date that is not a real YYYY-MM-DD calendar date', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());

    await expect(handler(makeHandlerEvent({ date: '2026-02-30' }))).rejects.toThrow(
      'Invalid date: 2026-02-30 (expected YYYY-MM-DD)'
    );
  });

  // Ver create-event-schedule-entry.test.ts: a data é livre, o evento é que scopa.
  it('moves an entry to a date outside the event period', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry({ date: '2026-07-01' })) });

    const result = await handler(makeHandlerEvent({ date: '2026-07-01' }));

    expect(result.date).toBe('2026-07-01');
  });

  it('throws when identity is missing', async () => {
    await expect(
      handler({ arguments: makeHandlerEvent().arguments, identity: {} })
    ).rejects.toThrow('User identity not found');
  });

  it('without supplierId — does not call ensureSelectedEventSupplier', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry()) });

    await handler(makeHandlerEvent());

    expect(ensureSelectedEventSupplier).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('with supplierId — calls ensureSelectedEventSupplier with correct args', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry({ supplierId: 'sup-1' })) });

    const result = await handler(makeHandlerEvent({ supplierId: 'sup-1' }));

    expect(result.supplierId).toBe('sup-1');
    expect(ensureSelectedEventSupplier).toHaveBeenCalledWith({
      eventId: 'evt-1',
      supplierId: 'sup-1',
      eventOwnerRaw: 'user-1::user-1',
      now: expect.any(String),
      callerUserId: 'user-1',
      callerRole: 'OWNER',
      sharedSupplierIds: [],
    });
    expect(mockSend).toHaveBeenCalledTimes(1); // only UpdateItemCommand
  });

  it('supplierId cleared (null) — does not call ensureSelectedEventSupplier', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry({ supplierId: 'sup-1' }));
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry()) });

    await handler(makeHandlerEvent({ supplierId: null }));

    expect(ensureSelectedEventSupplier).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('rejects a color that is not in the curated palette', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());

    await expect(handler(makeHandlerEvent({ color: '#123456' }))).rejects.toThrow(
      'Invalid color: #123456'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects a semantic token as color', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());

    await expect(handler(makeHandlerEvent({ color: '#EF4444' }))).rejects.toThrow('Invalid color');
  });

  it('sets a color from the palette', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry({ color: '#0B8043' })) });

    const result = await handler(makeHandlerEvent({ color: '#0B8043' }));

    expect(result.color).toBe('#0B8043');
    expect(mockSend.mock.calls[0][0].UpdateExpression).toContain('#color = :color');
  });

  // Voltar ao default é REMOVE, não SET null: um NULL em DynamoDB faria
  // `entry.color` existir com valor nulo e o fallback do render deixaria de o
  // apanhar da mesma forma que apanha as entradas legadas.
  it('clears the color (null) with REMOVE, back to default', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry({ color: '#0B8043' }));
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry()) });

    const result = await handler(makeHandlerEvent({ color: null }));

    expect(mockSend.mock.calls[0][0].UpdateExpression).toContain('REMOVE #color');
    expect(result.color).toBeUndefined();
  });

  it('leaves color untouched when the argument is absent', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry({ color: '#0B8043' }));
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry({ color: '#0B8043' })) });

    await handler(makeHandlerEvent({ title: 'Só o título' }));

    const expr = mockSend.mock.calls[0][0].UpdateExpression;
    expect(expr).not.toContain('color');
  });

  it('sets participantIds after validating them against the event', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry({ participantIds: ['p-1'] })) });

    const result = await handler(makeHandlerEvent({ participantIds: ['p-1'] }));

    expect(assertParticipantsInEvent).toHaveBeenCalledWith({
      participantTableName: PARTICIPANT_TABLE,
      eventId: 'evt-1',
      participantIds: ['p-1'],
    });
    expect(result.participantIds).toEqual(['p-1']);
  });

  it('does not write when a participant does not belong to the event', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry());
    assertParticipantsInEvent.mockRejectedValue(new Error('Invalid participantIds: p-9'));

    await expect(handler(makeHandlerEvent({ participantIds: ['p-9'] }))).rejects.toThrow(
      'Invalid participantIds: p-9'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  // Lista vazia é "tirei todos", não "não mexas" — tem de limpar o campo.
  it('clears participantIds with an empty list, without reading participants', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry({ participantIds: ['p-1'] }));
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry()) });

    const result = await handler(makeHandlerEvent({ participantIds: [] }));

    expect(assertParticipantsInEvent).not.toHaveBeenCalled();
    expect(mockSend.mock.calls[0][0].UpdateExpression).toContain('REMOVE #participantIds');
    expect(result.participantIds).toBeUndefined();
  });

  it('clears participantIds with null', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry({ participantIds: ['p-1'] }));
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry()) });

    await handler(makeHandlerEvent({ participantIds: null }));

    expect(mockSend.mock.calls[0][0].UpdateExpression).toContain('REMOVE #participantIds');
  });

  it('leaves participantIds untouched when the argument is absent', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    getScheduleEntry.mockResolvedValue(makeEntry({ participantIds: ['p-1'] }));
    mockSend.mockResolvedValueOnce({ Attributes: marshall(makeEntry({ participantIds: ['p-1'] })) });

    await handler(makeHandlerEvent({ title: 'Só o título' }));

    expect(assertParticipantsInEvent).not.toHaveBeenCalled();
    expect(mockSend.mock.calls[0][0].UpdateExpression).not.toContain('participantIds');
  });
});
