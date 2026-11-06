import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    BatchGetItemCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertParticipantsInEvent } = require('./assertParticipantsInEvent');

const TABLE = 'test-participant-table';

const makeParticipant = (id: string, eventId = 'evt-1') => ({
  id,
  eventId,
  participantName: `Participante ${id}`,
});

const respondWith = (participants: Array<Record<string, unknown>>) => {
  mockSend.mockResolvedValueOnce({
    Responses: { [TABLE]: participants.map((p) => marshall(p)) },
  });
};

describe('assertParticipantsInEvent', () => {
  beforeEach(() => mockSend.mockReset());

  it('accepts participants that belong to the event', async () => {
    respondWith([makeParticipant('p-1'), makeParticipant('p-2')]);

    await expect(
      assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: ['p-1', 'p-2'] })
    ).resolves.toBeUndefined();
  });

  // Sem isto, um caller liga participantes de outro evento à sua agenda e lê
  // os nomes deles — fuga de dados entre eventos.
  it('rejects a participant from another event', async () => {
    respondWith([makeParticipant('p-1'), makeParticipant('p-2', 'evt-OUTRO')]);

    await expect(
      assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: ['p-1', 'p-2'] })
    ).rejects.toThrow('Invalid participantIds: p-2');
  });

  // Um id inexistente não volta do BatchGet. Se passasse, gravávamos uma FK
  // pendurada que o render teria de adivinhar.
  it('rejects a participant id that does not exist', async () => {
    respondWith([makeParticipant('p-1')]);

    await expect(
      assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: ['p-1', 'p-fantasma'] })
    ).rejects.toThrow('Invalid participantIds: p-fantasma');
  });

  it('names every offending id, not just the first', async () => {
    respondWith([makeParticipant('p-1')]);

    await expect(
      assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: ['p-1', 'p-x', 'p-y'] })
    ).rejects.toThrow('Invalid participantIds: p-x, p-y');
  });

  it('skips the read entirely for an empty list', async () => {
    await assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: [] });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('deduplicates ids before reading', async () => {
    respondWith([makeParticipant('p-1')]);

    await assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: ['p-1', 'p-1'] });

    expect(mockSend.mock.calls[0][0].RequestItems[TABLE].Keys).toHaveLength(1);
  });

  // BatchGetItem aceita no máximo 100 chaves. Um pedido maior seria truncado
  // pelo DynamoDB e os ids não lidos passariam por válidos — fail closed.
  it('rejects a list longer than the BatchGetItem limit', async () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => `p-${i}`);

    await expect(
      assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: tooMany })
    ).rejects.toThrow('Too many participantIds');
    expect(mockSend).not.toHaveBeenCalled();
  });

  // UnprocessedKeys significa que o DynamoDB não leu tudo (throttling). Tratar
  // o que voltou como resposta completa marcaria válidos como inexistentes.
  it('fails loudly when DynamoDB leaves keys unprocessed', async () => {
    mockSend.mockResolvedValueOnce({
      Responses: { [TABLE]: [marshall(makeParticipant('p-1'))] },
      UnprocessedKeys: { [TABLE]: { Keys: [marshall({ id: 'p-2' })] } },
    });

    await expect(
      assertParticipantsInEvent({ participantTableName: TABLE, eventId: 'evt-1', participantIds: ['p-1', 'p-2'] })
    ).rejects.toThrow('could not be verified');
  });
});
