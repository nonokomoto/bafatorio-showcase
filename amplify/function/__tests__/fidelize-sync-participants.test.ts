/**
 * fidelize-sync-participants — o sync cria participantes e por isso conta para
 * o limite do plano (ADR-038).
 *
 * Enquanto o Por Evento teve participantes ilimitados o buraco era inofensivo:
 * integrações são exclusivas dos planos pagos, logo o único a quem o limite se
 * aplicava (o Grátis) não tinha como cá chegar. Com os escalões passa a ser
 * buraco a sério — compra-se o escalão de 9,99 e sincronizam-se 400 pessoas.
 */
import { marshall } from '@aws-sdk/util-dynamodb';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  GetItemCommand: jest.fn((input) => ({ __type: 'GetItem', ...input })),
  QueryCommand: jest.fn((input) => ({ __type: 'Query', ...input })),
  PutItemCommand: jest.fn((input) => ({ __type: 'PutItem', ...input })),
  UpdateItemCommand: jest.fn((input) => ({ __type: 'UpdateItem', ...input })),
}));

jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn(() => ({ send: jest.fn().mockResolvedValue({ Plaintext: new TextEncoder().encode('api-key') }) })),
  DecryptCommand: jest.fn((input) => input),
}));

const mockEnsureEventWritable = jest.fn();
jest.mock('../shared/entitlementGate', () => {
  const actual = jest.requireActual('../shared/entitlementGate');
  return { ...actual, ensureEventWritable: (...args: unknown[]) => mockEnsureEventWritable(...args) };
});

const PAID = {
  events: 1, participants: Infinity, suppliers: Infinity,
  documents: Infinity, folders: Infinity, report: true, integrations: true,
};

const card = (id: string) => ({
  id,
  templateId: 1,
  status: 'active',
  customer: { firstName: `Convidado ${id}`, email: `${id}@exemplo.pt` },
  customFields: [],
});

/** Arma as respostas do DynamoDB pela ordem em que o handler as pede. */
const armDynamo = (existingParticipants: unknown[]) => {
  mockSend.mockImplementation((command: { __type: string; TableName?: string }) => {
    if (command.__type === 'GetItem' && command.TableName === 'event-tbl') {
      return Promise.resolve({ Item: marshall({ owner: 'user-1::user-1' }) });
    }
    if (command.__type === 'GetItem' && command.TableName === 'integration-tbl') {
      return Promise.resolve({ Item: marshall({ apiKey: 'ZW5jcnlwdGVk', isActive: true }) });
    }
    if (command.__type === 'Query' && command.TableName === 'participant-tbl') {
      return Promise.resolve({ Items: existingParticipants.map((p) => marshall(p as Record<string, unknown>)) });
    }
    return Promise.resolve({});
  });
};

const puts = () =>
  mockSend.mock.calls
    .map(([c]) => c)
    .filter((c) => c.__type === 'PutItem' && c.TableName === 'participant-tbl');

describe('fidelize-sync-participants — limite de participantes', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (e: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = 'event-tbl';
    process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME = 'participant-tbl';
    process.env.FIDELIZE_INTEGRATION_TABLE_NAME = 'integration-tbl';
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = 'collab-tbl';
    process.env.BAFATORIO_APP_ROLE_TABLE_NAME = 'role-tbl';
    process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'sub-tbl';
    process.env.KMS_KEY_ID = 'key-1';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../fidelize-sync-participants/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    mockEnsureEventWritable.mockReset();
    mockEnsureEventWritable.mockResolvedValue({
      planKey: 'PAY_PER_EVENT', entitlements: PAID, writable: true, reason: 'WITHIN_WINDOW', eventRecord: {},
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [card('a'), card('b')], meta: { totalItems: 2, itemsPerPage: 15 } }),
    }) as unknown as typeof fetch;
  });

  const invoke = () => handler({ arguments: { eventId: 'evt-1' }, identity: { sub: 'user-1' } });

  test('sem teto: cria todos os cartões', async () => {
    armDynamo([]);
    const r = await invoke();
    expect(r.created).toBe(2);
    expect(puts()).toHaveLength(2);
  });

  test('teto do escalão atingido: recusa com BILLING_GATE:LIMIT_PARTICIPANTS', async () => {
    // 100 participantes já no evento, escalão de 100 — não cabe mais ninguém.
    mockEnsureEventWritable.mockResolvedValue({
      planKey: 'PAY_PER_EVENT',
      entitlements: { ...PAID, participants: 100 },
      writable: true, reason: 'WITHIN_WINDOW', eventRecord: {},
    });
    armDynamo(Array.from({ length: 100 }, (_, i) => ({ id: `p-${i}` })));

    await expect(invoke()).rejects.toThrow('BILLING_GATE:LIMIT_PARTICIPANTS');
    expect(puts()).toHaveLength(0);
  });

  test('teto com margem para um: cria o primeiro e recusa no segundo', async () => {
    mockEnsureEventWritable.mockResolvedValue({
      planKey: 'PAY_PER_EVENT',
      entitlements: { ...PAID, participants: 100 },
      writable: true, reason: 'WITHIN_WINDOW', eventRecord: {},
    });
    armDynamo(Array.from({ length: 99 }, (_, i) => ({ id: `p-${i}` })));

    await expect(invoke()).rejects.toThrow('BILLING_GATE:LIMIT_PARTICIPANTS');
    // O que coube fica: parar a meio não desfaz o que já entrou.
    expect(puts()).toHaveLength(1);
  });

  test('a recusa do gate não é engolida pelo catch por cartão', async () => {
    mockEnsureEventWritable.mockResolvedValue({
      planKey: 'PAY_PER_EVENT',
      entitlements: { ...PAID, participants: 0 },
      writable: true, reason: 'WITHIN_WINDOW', eventRecord: {},
    });
    armDynamo([]);

    // Sem o relançamento, o erro caía no errors[] e o sync devolvia success:true.
    await expect(invoke()).rejects.toThrow('BILLING_GATE:LIMIT_PARTICIPANTS');
  });
});
