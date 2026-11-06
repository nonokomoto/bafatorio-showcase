import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    GetItemCommand: jest.fn((input: unknown) => input),
    PutItemCommand: jest.fn((input: unknown) => input),
    QueryCommand: jest.fn((input: unknown) => input),
    UpdateItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn(() => ({ send: jest.fn().mockResolvedValue({}) })),
  SendMessageCommand: jest.fn((input: unknown) => input),
}));

jest.mock('../shared/getUserEmail', () => ({
  getUserEmail: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as { _mockSend: jest.Mock };
const { getUserEmail } = jest.requireMock('../shared/getUserEmail') as { getUserEmail: jest.Mock };

const EVENT_TABLE = 'test-event-table';
const COLLABORATOR_TABLE = 'test-collab-table';

const INVITER_SUB = 'sub-do-dono';

// O evento é do INVITER_SUB, mas o "Responsável pelo Evento" que consta nos
// detalhes é outra pessoa — o cenário exacto que partia os convites.
const makeEventRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  eventTitle: 'Lançamento',
  owner: `${INVITER_SUB}::${INVITER_SUB}`,
  eventManager: 'Maria Santos',
  eventManagerEmail: 'daniela@exemplo.pt',
  ...overrides,
});

const makeHandlerEvent = (email: string, overrides: Record<string, unknown> = {}) => ({
  arguments: { eventId: 'evt-1', email, role: 'STAFF_LOGISTICS', ...overrides },
  identity: { sub: INVITER_SUB, claims: { username: 'o-username-do-dono' } },
});

// GetItem do evento → Query de convites existentes (vazia) → PutItem
const mockHappyPath = (eventRecord = makeEventRecord()) => {
  mockSend
    .mockResolvedValueOnce({ Item: marshall(eventRecord) })
    .mockResolvedValueOnce({ Items: [] })
    .mockResolvedValue({});
};

describe('invite-collaborator: auto-convite', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
    process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME = COLLABORATOR_TABLE;
    process.env.BAFATORIO_APP_USER_POOL_ID = 'eu-west-1_POOL';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../invite-collaborator/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    getUserEmail.mockReset();
    getUserEmail.mockResolvedValue({ email: 'dono@bafatorio.com' });
  });

  // O bug: o guard comparava o eventManagerEmail (um campo de formulário sobre
  // OUTRA pessoa) com o convidado, em vez do email de quem convida.
  it('permite convidar a pessoa que consta como responsável do evento', async () => {
    mockHappyPath();

    await expect(handler(makeHandlerEvent('daniela@exemplo.pt'))).resolves.toBeDefined();
  });

  // O outro lado da mesma moeda: o guard nunca via o email do dono, logo
  // deixava-o convidar-se a si próprio.
  it('recusa quem convida o seu próprio email', async () => {
    mockHappyPath();

    await expect(handler(makeHandlerEvent('dono@bafatorio.com'))).rejects.toThrow(
      'Cannot invite yourself to your own event'
    );
  });

  it('recusa independentemente de maiúsculas e espaços', async () => {
    mockHappyPath();

    await expect(handler(makeHandlerEvent('  DONO@Bafatorio.COM  '))).rejects.toThrow(
      'Cannot invite yourself to your own event'
    );
  });

  it('pergunta ao Cognito pelo username de quem convida, não pelo sub', async () => {
    mockHappyPath();

    await handler(makeHandlerEvent('outra@exemplo.pt'));

    expect(getUserEmail).toHaveBeenCalledWith({
      userPoolId: 'eu-west-1_POOL',
      username: 'o-username-do-dono',
    });
  });

  // Um convite legítimo não pode falhar porque o Cognito teve um soluço —
  // seria trocar um bug por outro.
  it('não grava nada se o email de quem convida não for obtido', async () => {
    mockHappyPath();
    getUserEmail.mockRejectedValue(new Error('Failed to get user email from Cognito'));

    await expect(handler(makeHandlerEvent('outra@exemplo.pt'))).rejects.toThrow();
    const puts = mockSend.mock.calls.filter((c) => c[0]?.Item);
    expect(puts).toHaveLength(0);
  });
});
