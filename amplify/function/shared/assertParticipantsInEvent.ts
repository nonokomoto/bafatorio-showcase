import { DynamoDBClient, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// BatchGetItem trunca silenciosamente acima de 100 chaves: os ids não lidos
// passariam por válidos. O teto é recusa explícita, não truncagem.
const BATCH_GET_LIMIT = 100;

let cachedClient: DynamoDBClient | null = null;
const getDynamoClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedClient;
};

type AssertParticipantsInEventInput = {
  participantTableName: string;
  eventId: string;
  participantIds: string[];
};

/**
 * Throws unless every id is a Participant of this event.
 *
 * Lê só os ids pedidos (O(N)) em vez de varrer os participantes do evento
 * (O(P)) — validar 2 ids num evento de 500 pessoas custa 2 leituras, não 500.
 *
 * Um id inexistente é rejeitado como um de outro evento: o BatchGet devolve só
 * o que existe, portanto ausente e alheio caem no mesmo veredicto.
 */
export async function assertParticipantsInEvent({
  participantTableName,
  eventId,
  participantIds,
}: AssertParticipantsInEventInput): Promise<void> {
  const ids = [...new Set(participantIds)];
  if (ids.length === 0) return;

  if (ids.length > BATCH_GET_LIMIT) {
    throw new Error(`Too many participantIds: ${ids.length} (max ${BATCH_GET_LIMIT})`);
  }

  const result = await getDynamoClient().send(
    new BatchGetItemCommand({
      RequestItems: {
        [participantTableName]: {
          Keys: ids.map((id) => marshall({ id })),
          ProjectionExpression: 'id, eventId',
        },
      },
    })
  );

  // Throttling devolve UnprocessedKeys. Tratar a resposta parcial como completa
  // marcaria participantes válidos como inexistentes — rejeitar é o único
  // veredicto honesto, porque não sabemos.
  const unprocessed = result.UnprocessedKeys?.[participantTableName]?.Keys;
  if (unprocessed && unprocessed.length > 0) {
    throw new Error(`${unprocessed.length} participantIds could not be verified - try again`);
  }

  const belongs = new Set(
    (result.Responses?.[participantTableName] ?? [])
      .map((item) => unmarshall(item) as { id: string; eventId: string })
      .filter((p) => p.eventId === eventId)
      .map((p) => p.id)
  );

  const invalid = ids.filter((id) => !belongs.has(id));
  if (invalid.length > 0) {
    throw new Error(`Invalid participantIds: ${invalid.join(', ')} (not participants of this event)`);
  }
}
