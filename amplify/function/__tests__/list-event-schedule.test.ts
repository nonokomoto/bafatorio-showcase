import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

// O normalizeUserId fica real: há um teste sobre a normalização Gen-1, e
// reimplementá-lo no mock seria testar o mock em vez do código.
jest.mock('../shared/resolveEventAccess', () => ({
  ...jest.requireActual('../shared/resolveEventAccess'),
  resolveEventAccess: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { resolveEventAccess } = jest.requireMock('../shared/resolveEventAccess') as {
  resolveEventAccess: jest.Mock;
};

const SCHEDULE_TABLE = 'test-schedule-table';
const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';

const makeHandlerEvent = (overrides: Record<string, unknown> = {}) => ({
  arguments: { eventId: 'evt-1', ...overrides },
  identity: { sub: 'user-1' },
});

const makeEntry = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'entry-1',
    eventId: 'evt-1',
    date: '2026-06-15',
    title: 'Cerimónia de abertura',
    owner: 'user-1::user-1',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  });

const makeCollaboratorRecord = (overrides: Record<string, unknown> = {}) =>
  marshall({
    id: 'c-1',
    eventId: 'evt-1',
    userId: 'staff-1',
    userName: 'Ney Carvalho',
    userEmail: 'ney@exemplo.pt',
    role: 'STAFF_LOGISTICS',
    status: 'ACCEPTED',
    ...overrides,
  });

// Shared access mock builders
const makeOwnerAccess = () => ({
  role: 'OWNER',
  eventOwner: 'user-1',
  eventRecord: { id: 'evt-1', owner: 'user-1::user-1', ownerName: 'Maria Santos' },
  collaboratorRecord: null,
  sharedSupplierIds: [],
  hasPermission: (p: string) => p === 'schedule:view',
});

const makeCollaboratorAccess = (role: string, collaboratorOverrides: Record<string, unknown> = {}) => ({
  role,
  eventOwner: 'owner-1',
  eventRecord: { id: 'evt-1', owner: 'owner-1::owner-1', ownerName: 'Maria Santos' },
  collaboratorRecord: {
    id: 'c-1',
    eventId: 'evt-1',
    userId: 'user-1',
    role,
    status: 'ACCEPTED',
    ...collaboratorOverrides,
  },
  sharedSupplierIds: [],
  hasPermission: (p: string) => p === 'schedule:view',
});

// O handler lê as tabelas do ambiente no import, por isso o require só pode
// acontecer depois do env estar posto — e no scope do módulo, para as duas
// suites o partilharem.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (event: any) => Promise<any>;

beforeAll(() => {
  process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME = SCHEDULE_TABLE;
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  handler = require('../list-event-schedule/handler').handler;
});

beforeEach(() => {
  mockSend.mockReset();
  resolveEventAccess.mockReset();
});

describe('list-event-schedule handler', () => {
  it('returns entries for OWNER', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Items: [makeEntry()] });

    const result = await handler(makeHandlerEvent());

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('entry-1');
  });

  // A entrada é do próprio caller (user-1), que não é o dono do evento
  // (owner-1) — logo o handler vai à tabela de colaboradores buscar o nome.
  it('returns entries for CO_MANAGER', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    mockSend
      .mockResolvedValueOnce({ Items: [makeEntry()] })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'user-1' })] });

    const result = await handler(makeHandlerEvent());
    expect(result.items).toHaveLength(1);
  });

  it('returns entries for STAFF_LOGISTICS', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('STAFF_LOGISTICS'));
    mockSend
      .mockResolvedValueOnce({ Items: [makeEntry()] })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'user-1' })] });

    const result = await handler(makeHandlerEvent());
    expect(result.items).toHaveLength(1);
  });

  it('rejects STAFF_CHECKIN', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeCollaboratorAccess('STAFF_CHECKIN'),
      hasPermission: () => false,
    });

    await expect(handler(makeHandlerEvent())).rejects.toThrow(
      'Access denied'
    );
  });

  it('throws when event not found (resolveEventAccess throws)', async () => {
    resolveEventAccess.mockRejectedValue(new Error('Event not found'));

    await expect(handler(makeHandlerEvent())).rejects.toThrow('Event not found');
  });

  it('returns empty items when no entries exist', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Items: [] });

    const result = await handler(makeHandlerEvent());
    expect(result.items).toEqual([]);
    expect(result.authors).toEqual([]);
  });

  it('sorts entries by date then startTime', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Items: [
        makeEntry({ id: 'e2', date: '2026-06-15', startTime: '14:00' }),
        makeEntry({ id: 'e3', date: '2026-06-16', startTime: '09:00' }),
        makeEntry({ id: 'e1', date: '2026-06-15', startTime: '09:00' }),
      ],
    });

    const result = await handler(makeHandlerEvent());
    expect(result.items.map((e: { id: string }) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('throws when identity is missing', async () => {
    await expect(
      handler({ arguments: { eventId: 'evt-1' }, identity: {} })
    ).rejects.toThrow('User identity not found');
  });
});

describe('list-event-schedule handler — autores', () => {
  it('resolve o dono do evento pelo ownerName do próprio registo do evento', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Items: [makeEntry()] });

    const result = await handler(makeHandlerEvent());

    expect(result.authors).toEqual([{ userId: 'user-1', name: 'Maria Santos' }]);
  });

  it('resolve colaboradores pelo userName, normalizando o owner Gen-1 (sub::sub)', async () => {
    // Com a flag ligada o staff vê a entrada de outro colaborador — é o caminho
    // onde a normalização do autor importa.
    resolveEventAccess.mockResolvedValue(
      makeCollaboratorAccess('STAFF_LOGISTICS', { canViewTeamSchedule: true })
    );
    mockSend
      .mockResolvedValueOnce({ Items: [makeEntry({ owner: 'staff-1::staff-1' })] })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord()] });

    const result = await handler(makeHandlerEvent());

    // A entrada guarda sub::sub; o EventCollaborator.userId guarda o sub cru.
    // Sem normalizar, o nome nunca casava — e falhava em silêncio.
    expect(result.authors).toEqual([{ userId: 'staff-1', name: 'Ney Carvalho' }]);
  });

  it('não devolve emails — o staff não enumera a equipa por esta porta', async () => {
    resolveEventAccess.mockResolvedValue(
      makeCollaboratorAccess('STAFF_LOGISTICS', { canViewTeamSchedule: true })
    );
    mockSend
      .mockResolvedValueOnce({ Items: [makeEntry({ owner: 'staff-1::staff-1' })] })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord()] });

    const result = await handler(makeHandlerEvent());

    // O list-event-collaborators fecha a lista de equipa a OWNER/CO_MANAGER.
    // Devolver emails aqui desfazia essa decisão sem a discutir.
    expect(JSON.stringify(result.authors)).not.toContain('@');
  });

  it('devolve um autor por pessoa, mesmo com várias entradas dela', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({
      Items: [
        makeEntry({ id: 'e1', owner: 'user-1::user-1' }),
        makeEntry({ id: 'e2', owner: 'user-1::user-1' }),
      ],
    });

    const result = await handler(makeHandlerEvent());

    expect(result.authors).toHaveLength(1);
  });

  it('mantém o autor sem nome quando o colaborador já não existe', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend
      .mockResolvedValueOnce({ Items: [makeEntry({ owner: 'ex-staff::ex-staff' })] })
      .mockResolvedValueOnce({ Items: [] });

    const result = await handler(makeHandlerEvent());

    // Um colaborador revogado deixa entradas para trás. Sumir com elas por não
    // saber o nome de quem as escreveu seria perder dados por um cosmético.
    expect(result.items).toHaveLength(1);
    expect(result.authors).toEqual([{ userId: 'ex-staff' }]);
  });

  it('não consulta a tabela de colaboradores quando só o dono escreveu', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend.mockResolvedValueOnce({ Items: [makeEntry()] });

    await handler(makeHandlerEvent());

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('ordena os autores: dono primeiro, depois por nome, sem nome no fim', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend
      .mockResolvedValueOnce({
        Items: [
          // A ordem de chegada é a das entradas (por data) — não pode decidir
          // a ordem da fila de avatares.
          makeEntry({ id: 'e1', date: '2026-06-10', owner: 'zulmira::zulmira' }),
          makeEntry({ id: 'e2', date: '2026-06-11', owner: 'sem-nome::sem-nome' }),
          makeEntry({ id: 'e3', date: '2026-06-12', owner: 'user-1::user-1' }),
          makeEntry({ id: 'e4', date: '2026-06-13', owner: 'ana::ana' }),
        ],
      })
      .mockResolvedValueOnce({
        Items: [
          makeCollaboratorRecord({ id: 'c-1', userId: 'zulmira', userName: 'Zulmira' }),
          makeCollaboratorRecord({ id: 'c-2', userId: 'ana', userName: 'Ana' }),
        ],
      });

    const result = await handler(makeHandlerEvent());

    expect(result.authors).toEqual([
      { userId: 'user-1', name: 'Maria Santos' },
      { userId: 'ana', name: 'Ana' },
      { userId: 'zulmira', name: 'Zulmira' },
      { userId: 'sem-nome' },
    ]);
  });

  it('deixa o dono sem nome quando o evento é anterior ao campo ownerName', async () => {
    resolveEventAccess.mockResolvedValue({
      ...makeOwnerAccess(),
      eventRecord: { id: 'evt-1', owner: 'user-1::user-1' },
    });
    mockSend.mockResolvedValueOnce({ Items: [makeEntry()] });

    const result = await handler(makeHandlerEvent());

    expect(result.authors).toEqual([{ userId: 'user-1' }]);
  });
});

// Regra de visibilidade (ADR-029, revisão 2026-07-16): o staff só vê as suas
// entradas por defeito; o owner concede a agenda da equipa com canViewTeamSchedule.
describe('list-event-schedule handler — visibilidade por role', () => {
  it('STAFF_LOGISTICS sem canViewTeamSchedule vê só as suas entradas', async () => {
    // Caller é user-1 (identity.sub). A entrada de 'outro' não é dele.
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('STAFF_LOGISTICS'));
    mockSend
      .mockResolvedValueOnce({
        Items: [
          makeEntry({ id: 'minha', owner: 'user-1::user-1' }),
          makeEntry({ id: 'de-outro', owner: 'outro::outro' }),
        ],
      })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'user-1' })] });

    const result = await handler(makeHandlerEvent());

    expect(result.items.map((e: { id: string }) => e.id)).toEqual(['minha']);
  });

  it('STAFF_LOGISTICS com canViewTeamSchedule=true vê tudo', async () => {
    resolveEventAccess.mockResolvedValue(
      makeCollaboratorAccess('STAFF_LOGISTICS', { canViewTeamSchedule: true })
    );
    mockSend
      .mockResolvedValueOnce({
        Items: [
          makeEntry({ id: 'minha', owner: 'user-1::user-1' }),
          makeEntry({ id: 'de-outro', owner: 'outro::outro' }),
        ],
      })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'user-1' })] });

    const result = await handler(makeHandlerEvent());

    expect(result.items).toHaveLength(2);
  });

  it('não vaza autores de entradas escondidas ao staff restrito', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('STAFF_LOGISTICS'));
    mockSend
      .mockResolvedValueOnce({
        Items: [
          makeEntry({ id: 'minha', owner: 'user-1::user-1' }),
          makeEntry({ id: 'secreta', owner: 'secreto::secreto' }),
        ],
      })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'user-1' })] });

    const result = await handler(makeHandlerEvent());

    // Os authors calculam-se DEPOIS do filtro — 'secreto' nunca sai da Lambda.
    expect(result.authors.map((a: { userId: string }) => a.userId)).not.toContain('secreto');
  });

  it('OWNER vê entradas de todos os autores', async () => {
    resolveEventAccess.mockResolvedValue(makeOwnerAccess());
    mockSend
      .mockResolvedValueOnce({
        Items: [
          makeEntry({ id: 'do-dono', owner: 'user-1::user-1' }),
          makeEntry({ id: 'do-staff', owner: 'staff-9::staff-9' }),
        ],
      })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'staff-9' })] });

    const result = await handler(makeHandlerEvent());

    expect(result.items).toHaveLength(2);
  });

  it('não consulta a tabela de colaboradores para resolver só o próprio nome do staff', async () => {
    // Staff restrito vê só as suas entradas — o único autor é ele, e o nome
    // dele já veio no resolveEventAccess. Não deve haver segunda Query.
    resolveEventAccess.mockResolvedValue(
      makeCollaboratorAccess('STAFF_LOGISTICS', { userName: 'Eu Próprio' })
    );
    mockSend.mockResolvedValueOnce({
      Items: [
        makeEntry({ id: 'minha', owner: 'user-1::user-1' }),
        makeEntry({ id: 'de-outro', owner: 'outro::outro' }),
      ],
    });

    const result = await handler(makeHandlerEvent());

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result.authors).toEqual([{ userId: 'user-1', name: 'Eu Próprio' }]);
  });

  it('CO_MANAGER vê entradas de todos os autores', async () => {
    resolveEventAccess.mockResolvedValue(makeCollaboratorAccess('CO_MANAGER'));
    mockSend
      .mockResolvedValueOnce({
        Items: [
          makeEntry({ id: 'minha', owner: 'user-1::user-1' }),
          makeEntry({ id: 'de-outro', owner: 'outro::outro' }),
        ],
      })
      .mockResolvedValueOnce({ Items: [makeCollaboratorRecord({ userId: 'user-1' })] });

    const result = await handler(makeHandlerEvent());

    expect(result.items).toHaveLength(2);
  });
});
