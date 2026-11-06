/**
 * @file create-event/handler.ts
 * @description Criação de eventos com gate de conta (§3 do modelo canónico).
 * Substitui a mutation automática do modelo Event: o servidor resolve o
 * planKey (snapshot imutável) a partir do estado real da conta — subscrição,
 * contagem de eventos, compras Pay-per-event — e o cliente nunca envia
 * organizerId nem planKey.
 */
import {
  DynamoDBClient,
  PutItemCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { resolveAccountEntitlements } from '../../shared/resolveAccountEntitlements';
import { getTierByKey } from '../../shared/plans';
import { getUserEmail } from '../../shared/getUserEmail';

interface CreateEventArgs {
  eventTitle?: string;
  eventManager?: string;
  eventManagerEmail?: string;
  eventManagerPhone?: string;
  eventLocation?: string;
  eventDateType?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventSpecificDates?: string[];
  eventTime?: string;
  eventStatus?: string;
  eventType?: string;
  description?: string;
  categories?: string[];
  budget?: number;
  currency?: string;
}

interface CreateEventResult {
  success: boolean;
  message?: string;
  event?: Record<string, unknown>;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

export const handler = async (
  event: AppSyncResolverEvent<CreateEventArgs>
): Promise<CreateEventResult> => {
  const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
  const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
  const PLAN_PURCHASE_TABLE = process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME || '';

  const USER_POOL_ID = process.env.BAFATORIO_APP_USER_POOL_ID || '';

  const identity = event.identity as
    | { sub?: string; username?: string; claims?: { sub?: string; username?: string } }
    | undefined;
  const userId = identity?.sub || identity?.claims?.sub;
  if (!userId) {
    return { success: false, message: 'UNAUTHENTICATED' };
  }
  const username = identity?.claims?.username || identity?.username || userId;
  // Formato de owner canónico do projeto (sub::sub, ADR-013) — as queries
  // owner-based do AppSync só devolvem o item se este campo bater certo.
  const owner = `${userId}::${userId}`;

  // Risco aceite: a contagem Starter vem de GSI (eventualmente consistente) sem
  // guarda condicional na escrita — duas requests simultâneas podem passar ambas
  // o gate. Impacto limitado a ~2 eventos grátis e auto-corrige na propagação;
  // o caminho PPE está fechado pela condição transacional abaixo.
  const entitlements = await resolveAccountEntitlements({
    userId,
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    planPurchaseTableName: PLAN_PURCHASE_TABLE,
  });

  if (!entitlements.canCreateEvent) {
    return { success: false, message: entitlements.reason };
  }

  // Identidade real da conta que cria, para quem vir o evento saber de quem ele
  // é (ex.: o avatar do autor na agenda). NÃO usar eventManager/eventManagerEmail:
  // são o contacto do "Responsável" escrito no formulário, dado sobre uma pessoa
  // no mundo real, e podem ser outra pessoa que não o dono (ver f6bbed4b).
  //
  // Degrada em vez de falhar, ao contrário do invite-collaborator: lá o email
  // decide acesso, aqui decide um rótulo. Um soluço do Cognito não pode impedir
  // alguém de criar um evento — quem lê já tem de tolerar a ausência, porque os
  // eventos criados antes deste campo também não o têm.
  const ownerIdentity = await getUserEmail({ userPoolId: USER_POOL_ID, username })
    .catch((error) => {
      console.error('[create-event] Identidade do dono não resolvida no Cognito:', error);
      return null;
    });

  const now = new Date().toISOString();
  // Campos de autoridade do servidor ficam DEPOIS do spread — o cliente nunca
  // os controla, mesmo que o schema um dia aceite args com esses nomes.
  const {
    id: _id,
    planKey: _pk,
    participantLimit: _plim,
    organizerId: _org,
    owner: _own,
    ownerName: _oname,
    ownerEmail: _omail,
    ...clientArgs
  } = event.arguments as Record<string, unknown>;
  // Teto congelado do escalão comprado (ADR-038). O escalão sem teto não escreve
  // nada: o campo ausente É a representação do ilimitado, e evita a sentinela
  // que um dia um caminho esquece de tratar. Só o que foi pago congela — o
  // Grátis lê sempre do catálogo, e é isso que deixou a subida de 25 para 50
  // valer nos eventos já criados.
  const purchasedTier = getTierByKey(entitlements.firstUnconsumedPurchaseTierKey);
  const participantLimit = Number.isFinite(purchasedTier?.maxParticipants)
    ? purchasedTier!.maxParticipants
    : undefined;

  const eventRecord = {
    ...clientArgs,
    id: randomUUID(),
    planKey: entitlements.planKey,
    participantLimit,
    organizerId: userId,
    owner,
    ownerName: ownerIdentity?.name,
    ownerEmail: ownerIdentity?.email,
    participantCount: 0,
    eventCreationDate: now,
    createdAt: now,
    updatedAt: now,
    __typename: 'Event',
  };

  const eventPut = {
    TableName: EVENT_TABLE,
    Item: marshall(eventRecord, { removeUndefinedValues: true }),
    ConditionExpression: 'attribute_not_exists(id)',
  };

  if (entitlements.reason === 'PURCHASE_AVAILABLE') {
    // Evento + consumo da compra na mesma transação: ou ficam os dois, ou nenhum.
    // A condição impede duas criações simultâneas de gastarem a mesma compra.
    await client.send(new TransactWriteItemsCommand({
      TransactItems: [
        { Put: eventPut },
        {
          Update: {
            TableName: PLAN_PURCHASE_TABLE,
            Key: marshall({ id: entitlements.firstUnconsumedPurchaseId }),
            UpdateExpression: 'SET consumedByEventId = :eventId, consumedAt = :now, updatedAt = :now',
            ConditionExpression: 'attribute_not_exists(consumedByEventId) AND attribute_not_exists(refundedAt)',
            ExpressionAttributeValues: marshall({ ':eventId': eventRecord.id, ':now': now }),
          },
        },
      ],
    }));
  } else {
    await client.send(new PutItemCommand(eventPut));
  }

  return { success: true, event: eventRecord };
};
