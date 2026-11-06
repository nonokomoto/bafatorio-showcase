/**
 * @file sync-my-display-name/handler.ts
 * @description Propaga o nome real do Cognito para as cópias desnormalizadas.
 *
 * EventCollaborator.userName (escrito no accept-invitation) e Event.ownerName
 * (escrito no create-event) são snapshots — mudar o nome no perfil deixava-os
 * a mentir para sempre, porque o perfil grava client-side no Cognito e o
 * Cognito não tem trigger de atributo alterado. O ProfileSettings chama isto
 * depois de gravar.
 *
 * Self-service por construção: sem argumentos, o nome vem do Cognito do
 * próprio caller (nunca do cliente), e as queries são pelos GSIs byUserId /
 * byOrganizerId — só linhas do próprio.
 */
import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { getUserEmail } from '../../shared/getUserEmail';

interface SyncResult {
  updatedCollaborations: number;
  updatedEvents: number;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const queryOwnRows = async (
  tableName: string,
  indexName: 'byUserId' | 'byOrganizerId',
  keyAttribute: 'userId' | 'organizerId',
  userId: string
): Promise<string[]> => {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: `${keyAttribute} = :uid`,
      ExpressionAttributeValues: marshall({ ':uid': userId }),
      ProjectionExpression: 'id',
    })
  );
  return (result.Items || []).map((item) => (unmarshall(item) as { id: string }).id);
};

const updateName = (tableName: string, id: string, attribute: string, name: string) =>
  client.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({ id }),
      UpdateExpression: `SET ${attribute} = :n`,
      ExpressionAttributeValues: marshall({ ':n': name }),
    })
  );

export const handler = async (
  event: AppSyncResolverEvent<Record<string, never>>
): Promise<SyncResult> => {
  const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
  const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
  const USER_POOL_ID = process.env.BAFATORIO_APP_USER_POOL_ID || '';

  const identity = event.identity as
    | { sub?: string; username?: string; claims?: { sub?: string; username?: string } }
    | undefined;
  const userId = identity?.sub || identity?.claims?.sub;
  if (!userId) {
    throw new Error('User identity not found');
  }
  const username = identity?.claims?.username || identity?.username || userId;

  // Falha alto, ao contrário do create-event: aqui sincronizar É o trabalho,
  // e devolver sucesso sem ter lido o nome seria mentir ao caller.
  const { name } = await getUserEmail({ userPoolId: USER_POOL_ID, username });

  // Sem nome no pool não há o que propagar — e escrever null apagaria
  // snapshots válidos.
  if (!name) {
    return { updatedCollaborations: 0, updatedEvents: 0 };
  }

  const [collaborationIds, eventIds] = await Promise.all([
    queryOwnRows(COLLABORATOR_TABLE, 'byUserId', 'userId', userId),
    queryOwnRows(EVENT_TABLE, 'byOrganizerId', 'organizerId', userId),
  ]);

  await Promise.all([
    ...collaborationIds.map((id) => updateName(COLLABORATOR_TABLE, id, 'userName', name)),
    ...eventIds.map((id) => updateName(EVENT_TABLE, id, 'ownerName', name)),
  ]);

  return {
    updatedCollaborations: collaborationIds.length,
    updatedEvents: eventIds.length,
  };
};
