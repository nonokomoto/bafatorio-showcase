#!/usr/bin/env node

/**
 * Migration script: Move root-level documents into the "General" default folder.
 *
 * For each event:
 *   1. Check if a default folder (isDefault=true) exists
 *   2. If not, create one
 *   3. List files at root level: event-documents/{eventId}/{file}
 *   4. Copy each to event-documents/{eventId}/{defaultFolderId}/{file}
 *   5. Delete the original
 *
 * Usage:
 *   node scripts/migrate-root-docs-to-default-folder.mjs                  # Dry-run
 *   node scripts/migrate-root-docs-to-default-folder.mjs --execute        # Execute
 *
 * Prerequisites:
 *   - AWS credentials configured (e.g., via aws sso login)
 *   - Environment variables or defaults for table names and bucket
 */

import {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// ── Configuration ──────────────────────────────────────────────────────────
const REGION = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const FOLDER_TABLE = process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME || '';
const S3_BUCKET = process.env.BAFATORIO_APP_S3_BUCKET_NAME || '';

const isDryRun = !process.argv.includes('--execute');

if (!EVENT_TABLE || !FOLDER_TABLE || !S3_BUCKET) {
  console.error('Missing required environment variables:');
  console.error('  BAFATORIO_APP_EVENT_TABLE_NAME');
  console.error('  BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME');
  console.error('  BAFATORIO_APP_S3_BUCKET_NAME');
  process.exit(1);
}

const ddb = new DynamoDBClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

console.log(`\n=== Migrate Root Docs to Default Folder ===`);
console.log(`Mode: ${isDryRun ? 'DRY-RUN (no changes)' : 'EXECUTE'}`);
console.log(`Region: ${REGION}`);
console.log(`Event Table: ${EVENT_TABLE}`);
console.log(`Folder Table: ${FOLDER_TABLE}`);
console.log(`S3 Bucket: ${S3_BUCKET}\n`);

// ── Helpers ────────────────────────────────────────────────────────────────

async function scanAll(tableName) {
  const items = [];
  let lastKey;
  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
        ProjectionExpression: 'id, #owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
      })
    );
    items.push(...(result.Items || []).map(unmarshall));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getDefaultFolder(eventId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: FOLDER_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      FilterExpression: 'isDefault = :def',
      ExpressionAttributeValues: marshall({ ':eid': eventId, ':def': true }),
    })
  );
  return result.Items?.length ? unmarshall(result.Items[0]) : null;
}

async function createDefaultFolder(eventId, eventOwner) {
  const now = new Date().toISOString();
  const id = randomUUID();
  const folder = {
    id,
    eventId,
    name: 'General',
    isDefault: true,
    order: -1,
    owner: eventOwner,
    createdAt: now,
    updatedAt: now,
    __typename: 'DocumentFolder',
  };

  if (!isDryRun) {
    await ddb.send(
      new PutItemCommand({
        TableName: FOLDER_TABLE,
        Item: marshall(folder, { removeUndefinedValues: true }),
        ConditionExpression: 'attribute_not_exists(id)',
      })
    );
  }

  return folder;
}

async function listRootFiles(eventId) {
  const prefix = `event-documents/${eventId}/`;
  const rootFiles = [];

  let token;
  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );

    for (const obj of result.Contents || []) {
      const key = obj.Key;
      // Root files are at depth 3: event-documents/{eventId}/{filename}
      const parts = key.replace(prefix, '').split('/');
      if (parts.length === 1 && parts[0] !== '') {
        rootFiles.push(key);
      }
    }

    token = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (token);

  return rootFiles;
}

async function moveFile(sourceKey, destKey) {
  if (!isDryRun) {
    await s3.send(
      new CopyObjectCommand({
        Bucket: S3_BUCKET,
        CopySource: `${S3_BUCKET}/${sourceKey}`,
        Key: destKey,
      })
    );
    await s3.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: sourceKey,
      })
    );
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const events = await scanAll(EVENT_TABLE);
  console.log(`Found ${events.length} events\n`);

  let totalMoved = 0;
  let totalFoldersCreated = 0;

  for (const event of events) {
    const eventId = event.id;
    const rootFiles = await listRootFiles(eventId);

    if (rootFiles.length === 0) continue;

    console.log(`Event ${eventId}: ${rootFiles.length} root file(s)`);

    // Ensure default folder exists
    let defaultFolder = await getDefaultFolder(eventId);
    if (!defaultFolder) {
      defaultFolder = await createDefaultFolder(eventId, event.owner);
      totalFoldersCreated++;
      console.log(`  ${isDryRun ? '[DRY-RUN] Would create' : 'Created'} default folder: ${defaultFolder.id}`);
    } else {
      console.log(`  Default folder exists: ${defaultFolder.id}`);
    }

    // Move each root file
    for (const sourceKey of rootFiles) {
      const fileName = sourceKey.split('/').pop();
      const destKey = `event-documents/${eventId}/${defaultFolder.id}/${fileName}`;
      console.log(`  ${isDryRun ? '[DRY-RUN] Would move' : 'Moving'}: ${fileName}`);
      await moveFile(sourceKey, destKey);
      totalMoved++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Default folders created: ${totalFoldersCreated}`);
  console.log(`Files ${isDryRun ? 'to move' : 'moved'}: ${totalMoved}`);
  if (isDryRun) {
    console.log(`\nRe-run with --execute to apply changes.`);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
