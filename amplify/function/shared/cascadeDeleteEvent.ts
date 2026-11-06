import {
  DynamoDBClient,
  BatchWriteItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  QueryCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

let cachedClient: DynamoDBClient | null = null;
const getDynamoClient = (): DynamoDBClient => {
  if (!cachedClient) {
    cachedClient = new DynamoDBClient({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedClient;
};

let cachedS3Client: S3Client | null = null;
const getS3Client = (): S3Client => {
  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedS3Client;
};

export type CascadeDeleteTables = {
  event: string;
  participant: string;
  dependent: string;
  eventSupplier: string;
  eventCollaborator: string;
  role: string;
  documentFolder: string;
  eventScheduleEntry: string;
  notionDocument: string;
  emailLog: string;
};

export type CascadeDeleteCounts = {
  participants: number;
  dependents: number;
  eventSuppliers: number;
  collaborators: number;
  roles: number;
  documentFolders: number;
  scheduleEntries: number;
  notionDocuments: number;
  emailLogs: number;
  s3Objects: number;
  event: number;
};

export type CascadeDeleteResult = {
  success: boolean;
  deleted: CascadeDeleteCounts;
  failed: CascadeDeleteCounts;
  errors: string[];
};

type CascadeDeleteInput = {
  eventId: string;
  tables: CascadeDeleteTables;
  bucketName: string;
};

export const emptyCounts = (): CascadeDeleteCounts => ({
  participants: 0,
  dependents: 0,
  eventSuppliers: 0,
  collaborators: 0,
  roles: 0,
  documentFolders: 0,
  scheduleEntries: 0,
  notionDocuments: 0,
  emailLogs: 0,
  s3Objects: 0,
  event: 0,
});

const BATCH_SIZE = 25; // DynamoDB BatchWriteItem hard limit

/** Query all item ids in a table matching one foreign key, following pagination. */
async function queryIdsByForeignKey(
  tableName: string,
  indexName: string,
  keyName: string,
  keyValue: string
): Promise<string[]> {
  const ids: string[] = [];
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined;

  do {
    const response = await getDynamoClient().send(
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: `${keyName} = :${keyName}`,
        ExpressionAttributeValues: { [`:${keyName}`]: { S: keyValue } },
        ProjectionExpression: 'id',
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    for (const item of response.Items || []) {
      if (item.id?.S) ids.push(item.id.S);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return ids;
}

const MAX_UNPROCESSED_RETRIES = 3;

/**
 * Batch-delete items by id, in chunks of 25, retrying UnprocessedItems with
 * exponential backoff. Returns how many were deleted; throws if items remain
 * unprocessed after the retries.
 */
async function batchDeleteByIds(tableName: string, ids: string[]): Promise<number> {
  let deletedCount = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    let requests = chunk.map((id) => ({
      DeleteRequest: { Key: marshall({ id }) },
    }));

    for (let attempt = 0; requests.length > 0; attempt += 1) {
      if (attempt > MAX_UNPROCESSED_RETRIES) {
        throw new Error(
          `BatchWriteItem: ${requests.length} items still unprocessed after ${MAX_UNPROCESSED_RETRIES} retries`
        );
      }
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** (attempt - 1)));
      }
      const response = await getDynamoClient().send(
        new BatchWriteItemCommand({ RequestItems: { [tableName]: requests } })
      );
      const unprocessed = response.UnprocessedItems?.[tableName] || [];
      deletedCount += requests.length - unprocessed.length;
      requests = unprocessed as typeof requests;
    }
  }

  return deletedCount;
}

/** Delete every object under an S3 prefix, following pagination. Returns count. */
async function deleteS3Prefix(bucketName: string, prefix: string): Promise<number> {
  let deletedCount = 0;
  let continuationToken: string | undefined;

  do {
    const page = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    const keys = (page.Contents || [])
      .map((obj) => obj.Key)
      .filter((key): key is string => Boolean(key));

    if (keys.length > 0) {
      await getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
      deletedCount += keys.length;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return deletedCount;
}

export async function cascadeDeleteEvent({
  eventId,
  tables,
  bucketName,
}: CascadeDeleteInput): Promise<CascadeDeleteResult> {
  const deleted = emptyCounts();
  const failed = emptyCounts();
  const errors: string[] = [];

  const client = getDynamoClient();

  const eventResult = await client.send(
    new GetItemCommand({
      TableName: tables.event,
      Key: marshall({ id: eventId }),
    })
  );

  // Event gone = cascade already completed (the Event record is only ever
  // deleted after every child is gone) — safe to report success (ADR-035 §6).
  if (!eventResult.Item) {
    return { success: true, deleted, failed, errors };
  }

  // Participants and their dependents first (dependents are grandchildren:
  // only reachable via each participant's id).
  try {
    const participantIds = await queryIdsByForeignKey(
      tables.participant,
      'gsi-Event.participants',
      'eventId',
      eventId
    );
    // Concorrência limitada: paraleliza os round-trips por participante sem
    // rebentar a capacidade de leitura do GSI em eventos grandes.
    const DEPENDENT_CONCURRENCY = 10;
    for (let i = 0; i < participantIds.length; i += DEPENDENT_CONCURRENCY) {
      await Promise.all(
        participantIds.slice(i, i + DEPENDENT_CONCURRENCY).map(async (participantId) => {
          try {
            const dependentIds = await queryIdsByForeignKey(
              tables.dependent,
              'gsi-Participant.dependents',
              'participantId',
              participantId
            );
            deleted.dependents += await batchDeleteByIds(tables.dependent, dependentIds);
          } catch (dependentError) {
            failed.dependents += 1;
            errors.push(`${tables.dependent}: ${(dependentError as Error).message}`);
          }
        })
      );
    }
    try {
      deleted.participants = await batchDeleteByIds(tables.participant, participantIds);
    } catch (participantError) {
      failed.participants = participantIds.length - deleted.participants;
      errors.push(`${tables.participant}: ${(participantError as Error).message}`);
    }
  } catch (participantQueryError) {
    errors.push(`${tables.participant}: ${(participantQueryError as Error).message}`);
  }

  const childTables: Array<{ table: string; countKey: keyof CascadeDeleteCounts }> = [
    { table: tables.eventSupplier, countKey: 'eventSuppliers' },
    { table: tables.eventCollaborator, countKey: 'collaborators' },
    { table: tables.role, countKey: 'roles' },
    { table: tables.documentFolder, countKey: 'documentFolders' },
    { table: tables.eventScheduleEntry, countKey: 'scheduleEntries' },
    { table: tables.notionDocument, countKey: 'notionDocuments' },
    { table: tables.emailLog, countKey: 'emailLogs' },
  ];

  // Tabelas independentes entre si — em paralelo, para caber no budget de 29s
  // do AppSync (ADR-035 §8). Cada task escreve o seu próprio countKey.
  await Promise.all(
    childTables.map(async ({ table, countKey }) => {
      try {
        const ids = await queryIdsByForeignKey(table, 'byEventId', 'eventId', eventId);
        try {
          deleted[countKey] = await batchDeleteByIds(table, ids);
        } catch (deleteError) {
          failed[countKey] = ids.length - deleted[countKey];
          errors.push(`${table}: ${(deleteError as Error).message}`);
        }
      } catch (queryError) {
        errors.push(`${table}: ${(queryError as Error).message}`);
      }
    })
  );

  // S3 last among the children: metadata first, files after, Event at the end.
  try {
    deleted.s3Objects = await deleteS3Prefix(bucketName, `event-documents/${eventId}/`);
  } catch (s3Error) {
    errors.push(`s3:${bucketName}: ${(s3Error as Error).message}`);
  }

  // The Event record is the completion marker: it only goes away when every
  // child is gone, so a retry after partial failure can find it and resume.
  if (errors.length > 0) {
    return { success: false, deleted, failed, errors };
  }

  await client.send(
    new DeleteItemCommand({
      TableName: tables.event,
      Key: marshall({ id: eventId }),
    })
  );
  deleted.event = 1;

  return { success: true, deleted, failed, errors };
}
