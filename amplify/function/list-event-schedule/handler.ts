import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { resolveEventAccess, normalizeUserId } from '../shared/resolveEventAccess';
import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { canViewEntry } from '../shared/scheduleEntryAccess';
import type { ScheduleEntry } from '../shared/scheduleTypes';

interface ListEventScheduleArgs {
  eventId: string;
}

/**
 * Sem email de propósito: o list-event-collaborators fecha a lista de equipa a
 * OWNER/CO_MANAGER, e devolver emails aqui abria essa porta ao staff.
 */
interface ScheduleAuthor {
  userId: string;
  name?: string;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const SCHEDULE_TABLE = process.env.BAFATORIO_APP_SCHEDULE_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

/**
 * Sem ir ao Cognito: o AdminGetUser pede o username, que só existe para quem
 * chama — para terceiros seria ListUsers com filtro, num caminho que corre a
 * cada abertura da agenda. Os nomes já foram gravados uma vez: o do dono pelo
 * create-event, os dos colaboradores pelo accept-invitation.
 *
 * A tabela de colaboradores só é lida se alguém além do dono tiver escrito —
 * numa agenda só do dono, a query nem acontece.
 */
const resolveAuthors = async ({
  entries,
  eventId,
  eventOwner,
  ownerName,
  callerId,
  callerName,
}: {
  entries: ScheduleEntry[];
  eventId: string;
  eventOwner: string;
  ownerName: string | undefined;
  callerId: string;
  callerName: string | undefined;
}): Promise<ScheduleAuthor[]> => {
  // A entrada guarda o owner em Gen-1 (sub::sub, ver create-event-schedule-entry)
  // e o EventCollaborator.userId guarda o sub cru. Sem normalizar nada casa, e
  // falharia em silêncio: todos os avatares em '??' e o bug a ser procurado no
  // frontend.
  const authorIds = [
    ...new Set(entries.filter((entry) => entry.owner).map((entry) => normalizeUserId(entry.owner))),
  ];
  if (authorIds.length === 0) {
    return [];
  }

  const names = new Map<string, string>();
  if (ownerName) {
    names.set(eventOwner, ownerName);
  }
  // O nome do próprio caller já veio no resolveEventAccess. Semeá-lo evita a
  // Query à tabela de colaboradores no caso comum do staff restrito, que só vê
  // as suas entradas — logo o único autor é ele.
  if (callerName) {
    names.set(callerId, callerName);
  }

  // Só consultamos a tabela se faltar o nome de algum autor que NÃO é o dono —
  // o dono não tem linha em EventCollaborator, e o nome dele só vem do ownerName.
  if (authorIds.some((id) => id !== eventOwner && !names.has(id))) {
    const result = await client.send(
      new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: marshall({ ':eid': eventId }),
      })
    );

    for (const item of result.Items || []) {
      const collaborator = unmarshall(item) as { userId?: string; userName?: string };
      if (collaborator.userId && collaborator.userName) {
        names.set(normalizeUserId(collaborator.userId), collaborator.userName);
      }
    }
  }

  // Sem nome vai para o fim: são casos de borda (colaborador revogado, evento
  // anterior ao ownerName) e não devem empurrar pessoas reais para baixo.
  const rank = (author: ScheduleAuthor) =>
    author.userId === eventOwner ? 0 : author.name ? 1 : 2;

  return (
    authorIds
      // Um autor sem nome entra na mesma — quem lê cai nas iniciais do
      // fallback. Perder uma entrada real por não saber quem a escreveu seria
      // trocar dados por cosmética.
      .map((userId) => ({ userId, name: names.get(userId) }))
      // Sem ordem explícita herdava a das entradas (por data), e a fila de
      // avatares saltava de sítio sempre que alguém criasse uma entrada mais
      // antiga do que as suas — e a fila é um alvo de clique.
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (a.name ?? '').localeCompare(b.name ?? '', 'pt') ||
          a.userId.localeCompare(b.userId)
      )
  );
};

export const handler = async (
  event: AppSyncResolverEvent<ListEventScheduleArgs>
): Promise<{ items: ScheduleEntry[]; authors: ScheduleAuthor[] }> => {
  const { eventId } = event.arguments;
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    throw new Error('User identity not found');
  }

  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId,
    userId,
  });

  if (!access.hasPermission(EVENT_PERMISSIONS.SCHEDULE_VIEW)) {
    throw new Error(`Access denied: role ${access.role} cannot view schedule`);
  }

  const result = await client.send(
    new QueryCommand({
      TableName: SCHEDULE_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return { items: [], authors: [] };
  }

  const entries = result.Items.map(item => unmarshall(item) as ScheduleEntry);

  // Visibilidade (ADR-029, revisão 2026-07-16): a regra vive no scheduleEntryAccess,
  // ao lado das de editar/apagar, para não derivarem. Só o STAFF_LOGISTICS sem flag
  // é filtrado; OWNER/CO_MANAGER passam todos. STAFF_CHECKIN nem chega (SCHEDULE_VIEW).
  const canViewTeamSchedule = access.collaboratorRecord?.canViewTeamSchedule === true;
  const visibleEntries = entries.filter((entry) =>
    canViewEntry({
      role: access.role,
      entryOwnerUserId: entry.owner,
      currentUserId: userId,
      canViewTeamSchedule,
    })
  );

  // Sort by date, then by startTime (nulls/all-day last within each day)
  visibleEntries.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  // Pós-filtro de propósito: o staff restrito não pode receber a identidade de
  // quem escreveu as entradas que não vê.
  const authors = await resolveAuthors({
    entries: visibleEntries,
    eventId,
    eventOwner: access.eventOwner,
    ownerName: access.eventRecord.ownerName as string | undefined,
    callerId: normalizeUserId(userId),
    callerName: access.collaboratorRecord?.userName as string | undefined,
  });

  return { items: visibleEntries, authors };
};
