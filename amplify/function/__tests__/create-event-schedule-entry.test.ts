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
    PutItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('../shared/resolveEventAccess', () => ({
  resolveEventAccess: jest.fn(),
}));

jest.mock('../shared/ensureSelectedEventSupplier', () => ({
  ensureSelectedEventSupplier: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../shared/assertParticipantsInEvent', () => ({
  assertParticipantsInEvent: jest.fn().mockResolvedValue(undefined),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as {
  resolveEventAccess: jest.Mock;
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
  arguments: {
    eventId: 'evt-1',
    title: 'Cerimónia de abertura',
    date: '2026-06-15',
    ...overrides,
  },
  identity: { sub: 'user-1' },
});

const makeEventRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  owner: 'user-1::user-1',
  eventDateType: 'range',
  eventStartDate: '2026-06-01',
  eventEndDate: '2026-06-30',
  ...overrides,
});

const makeOwnerAccess = (eventRecord = makeEventRecord()) => ({
  role: 'OWNER',
  eventOwner: 'user-1',
  eventRecord,
  collaboratorRecord: null,
  sharedSupplierIds: [],
  hasPermission: (p: string) => p === 'schedule:create',
});

const makeCollaboratorAccess = (role: string, eventRecord = makeEventRecord()) => ({
  role,
  eventOwner: 'owner-1',
  eventRecord,
  collaboratorRecord: { id: 'c-1', eventId: 'evt-1', userId: 'user-1', role, status: 'ACCEPTED' },
  sharedSupplierIds: [],
  hasPermission: (p: string) => role === 'CO_MANAGER' && p === 'schedule:create',
});

describe('create-event-schedule-entry handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME = SCHEDULE_TABLE;
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME = EVENT_SUPPLIER_TABLE;
    process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME = PARTICIPANT_TABLE;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../create-event-schedule-entry/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    resolveEventAccess.mockReset();
    ensureSelectedEventSupplier.mockReset();
    ensureSelectedEventSupplier.mockResolvedValue(undefined);
    assertParticipantsInEvent.mockReset();
    assertParticipantsInEvent.mockResolvedValue(undefined);
  });

  it('throws when identity is missing', async () => {
    await expect(
      handler({ arguments: makeHandlerEvent().arguments, identity: {} })
    ).rejects.toThrow('User identity not found');
  });

  it('throws when required fields are missing', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ title: '' }))).rejects.toThrow('required');
    await expect(handler(makeHandlerEvent({ date: '' }))).rejects.toThrow('required');
  });

  it('rejects a date that is not YYYY-MM-DD', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ date: 'amanhã' }))).rejects.toThrow(
      'Invalid date: amanhã (expected YYYY-MM-DD)'
    );
  });

  it('rejects a well-formed date that does not exist in the calendar', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ date: '2026-02-30' }))).rejects.toThrow(
      'Invalid date: 2026-02-30 (expected YYYY-MM-DD)'
    );
  });

  // A agenda é do gestor, não do dia do evento: marcar a recolha de material na
  // véspera ou o débrief na semana seguinte é uso normal (ADR-029, Leitura A).
  it('creates an entry dated after the event range ends', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent({ date: '2026-07-01' }));

    expect(result.date).toBe('2026-07-01');
  });

  it('creates an entry dated outside a specific-dates event', async () => {
    resolveEventAccess.mockResolvedValue(
      makeOwnerAccess(
        makeEventRecord({
          eventDateType: 'specific',
          eventSpecificDates: ['2026-06-10', '2026-06-20'],
        })
      )
    );
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent({ date: '2026-06-15' }));

    expect(result.date).toBe('2026-06-15');
  });

  it('creates an entry for an event with no dates configured at all', async () => {
    resolveEventAccess.mockResolvedValue(
      makeOwnerAccess(
        makeEventRecord({
          eventDateType: undefined,
          eventStartDate: undefined,
          eventEndDate: undefined,
        })
      )
    );
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent({ date: '2026-06-15' }));

    expect(result.date).toBe('2026-06-15');
  });

  it('rejects a color that is not in the curated palette', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ color: '#123456' }))).rejects.toThrow(
      'Invalid color: #123456'
    );
    await expect(handler(makeHandlerEvent({ color: 'red' }))).rejects.toThrow('Invalid color: red');
  });

  // A paleta é canónica em maiúsculas; aceitar minúsculas abriria duas
  // representações da mesma cor e o filtro por cor deixaria de agrupar.
  it('rejects a palette color in the wrong case', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ color: '#039be5' }))).rejects.toThrow(
      'Invalid color: #039be5'
    );
  });

  // success-500/error-500 estão reservados ao estado real (EventDetailsCard.jsx:67)
  it('rejects a semantic token as color', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());

    await expect(handler(makeHandlerEvent({ color: '#EF4444' }))).rejects.toThrow('Invalid color');
  });

  it('persists a color from the palette', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent({ color: '#D50000' }));

    expect(result.color).toBe('#D50000');
  });

  // Ausente significa default — resolvido no render, num único sítio, para que
  // entradas legadas (sem o campo) e novas sigam exactamente o mesmo caminho.
  it('leaves color unset when omitted', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(result.color).toBeUndefined();
  });

  it('persists participantIds and validates them against the event', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent({ participantIds: ['p-1', 'p-2'] }));

    expect(result.participantIds).toEqual(['p-1', 'p-2']);
    expect(assertParticipantsInEvent).toHaveBeenCalledWith({
      participantTableName: PARTICIPANT_TABLE,
      eventId: 'evt-1',
      participantIds: ['p-1', 'p-2'],
    });
  });

  // O validador é o gate; se ele recusa, nada é gravado.
  it('does not write when a participant does not belong to the event', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    assertParticipantsInEvent.mockRejectedValue(new Error('Invalid participantIds: p-9'));

    await expect(handler(makeHandlerEvent({ participantIds: ['p-9'] }))).rejects.toThrow(
      'Invalid participantIds: p-9'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('without participantIds — does not call the validator', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(assertParticipantsInEvent).not.toHaveBeenCalled();
    expect(result.participantIds).toBeUndefined();
  });

  // Participante e fornecedor são ligações independentes: "prova de bolo com o
  // catering e a noiva" é uma entrada só (ADR-029).
  it('accepts a supplier and participants on the same entry', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(
      makeHandlerEvent({ supplierId: 'sup-1', participantIds: ['p-1'] })
    );

    expect(result.supplierId).toBe('sup-1');
    expect(result.participantIds).toEqual(['p-1']);
  });

  // O formulário manda um payload único para o create e para o update: null
  // significa REMOVE no update, e aqui tem de significar "campo ausente". Se
  // algum destes passasse a gravar null, a entrada ficaria com atributos nulos
  // em DynamoDB e o fallback do render deixava de os apanhar.
  it('treats the form payload of explicit nulls as absent fields', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(
      makeHandlerEvent({
        description: null,
        location: null,
        supplierId: null,
        color: null,
        startTime: null,
        endTime: null,
        participantIds: [],
      })
    );

    for (const field of ['description', 'location', 'supplierId', 'color', 'startTime', 'endTime', 'participantIds']) {
      expect(result).not.toHaveProperty(field);
    }
    // Nenhum atributo nulo chega ao marshall
    const item = mockSend.mock.calls[0][0].Item;
    expect(Object.values(item).some((v) => 'NULL' in (v as object))).toBe(false);
    // E nada disto acorda os gates caros
    expect(ensureSelectedEventSupplier).not.toHaveBeenCalled();
    expect(assertParticipantsInEvent).not.toHaveBeenCalled();
  });

  it('rejects STAFF_LOGISTICS', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_LOGISTICS'),
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Access denied');
  });

  it('creates entry for CO_MANAGER and returns it', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(result.eventId).toBe('evt-1');
    expect(result.title).toBe('Cerimónia de abertura');
  });

  it('creates entry for OWNER and returns it', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeHandlerEvent());

    expect(result.eventId).toBe('evt-1');
    expect(result.title).toBe('Cerimónia de abertura');
    expect(result.date).toBe('2026-06-15');
    expect(result.id).toBeDefined();
    expect(result.owner).toBe('user-1::user-1');
    expect(result.createdAt).toBeDefined();
  });

  it('without supplierId — does not call ensureSelectedEventSupplier', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

    await handler(makeHandlerEvent());

    expect(ensureSelectedEventSupplier).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('with supplierId — calls ensureSelectedEventSupplier with correct args', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({});

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
    expect(mockSend).toHaveBeenCalledTimes(1); // only PutItemCommand for schedule entry
  });
});
