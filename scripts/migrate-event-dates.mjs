#!/usr/bin/env node

/**
 * Migration script: Backfill the new multi-date fields on existing Events.
 *
 * Schema change (issue #105):
 *   eventDateType (enum: range | specific)
 *   eventStartDate (date)
 *   eventEndDate (date)
 *   eventSpecificDates (string[])
 *   eventTime (time)
 *
 * For every Event that has a legacy `eventDate` but no `eventDateType`, this
 * script writes:
 *   eventDateType = 'specific'
 *   eventSpecificDates = [<date part of eventDate>]
 *   eventTime = <time part of eventDate, if any>
 *
 * The legacy `eventDate` is kept untouched — removal happens in issue #109.
 *
 * Idempotent: events that already have `eventDateType` are skipped.
 *
 * Timezone: the legacy form stored UTC strings that actually represented the
 * user's local clock (it shifted by getTimezoneOffset before .toISOString).
 * This script reverses that shift, so it must run on a machine in the same
 * timezone the events were created in (Lisbon for the bulk of users).
 *
 * Usage:
 *   node scripts/migrate-event-dates.mjs                  # dry-run (default)
 *   node scripts/migrate-event-dates.mjs --execute        # actually write
 *   node scripts/migrate-event-dates.mjs --suffix XXXXX   # DynamoDB table suffix
 *
 * Requires:
 *   - AWS credentials configured (same as Amplify sandbox)
 */

import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// Inlined from src/Utils/eventDateConversion.js — the export was removed in
// commit 1a952497 (legacy eventDate cleanup), which orphaned this script's
// import. A one-off migration must stay self-contained and immune to further
// changes in the app's date utilities.
function splitDatetimeToDateAndTime(isoString) {
  if (!isoString) return null;

  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return null;

  const localish = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  const iso = localish.toISOString();

  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 23),
  };
}

const REGION = process.env.AWS_REGION || 'eu-west-1';
const dynamo = new DynamoDBClient({ region: REGION });

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const suffixIdx = args.indexOf('--suffix');
const suffix = suffixIdx !== -1 ? args[suffixIdx + 1] : null;

async function listAllTables() {
  const tables = [];
  let lastToken;
  do {
    const result = await dynamo.send(new ListTablesCommand({
      ExclusiveStartTableName: lastToken,
    }));
    tables.push(...(result.TableNames || []));
    lastToken = result.LastEvaluatedTableName;
  } while (lastToken);
  return tables;
}

function findTable(allTables, prefix) {
  const table = suffix
    ? allTables.find(name => name.startsWith(`${prefix}-`) && name.includes(suffix))
    : allTables.find(name => name.startsWith(`${prefix}-`));
  if (!table) {
    const candidates = allTables.filter(n => n.startsWith(`${prefix}-`)).join(', ') || '<none>';
    throw new Error(`${prefix} table not found. Candidates: ${candidates}`);
  }
  return table;
}

async function scanTable(tableName, projection) {
  const items = [];
  let lastKey;
  const params = { TableName: tableName };

  if (projection) {
    const names = {};
    const aliased = projection.map((field, i) => {
      const alias = `#p${i}`;
      names[alias] = field;
      return alias;
    });
    params.ProjectionExpression = aliased.join(', ');
    params.ExpressionAttributeNames = names;
  }

  do {
    const result = await dynamo.send(new ScanCommand({
      ...params,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items || []).map(item => unmarshall(item)));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function main() {
  console.log(`\n=== Migrating Events: backfill multi-date fields ===`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (use --execute to write)' : 'EXECUTING'}`);
  console.log(`   Region: ${REGION}`);
  if (suffix) console.log(`   Suffix: ${suffix}`);

  const allTables = await listAllTables();
  const eventTableName = findTable(allTables, 'Event');
  console.log(`\n   Event table: ${eventTableName}`);

  const events = await scanTable(eventTableName, ['id', 'eventDate', 'eventDateType', 'eventTitle']);
  console.log(`\n   Total events: ${events.length}`);

  const alreadyMigrated = events.filter(e => e.eventDateType);
  const missingEventDate = events.filter(e => !e.eventDateType && !e.eventDate);
  const toMigrate = events.filter(e => !e.eventDateType && e.eventDate);

  console.log(`   Already migrated (have eventDateType): ${alreadyMigrated.length}`);
  console.log(`   Skipped (no eventDate to migrate):     ${missingEventDate.length}`);
  console.log(`   To migrate:                            ${toMigrate.length}`);

  if (toMigrate.length === 0) {
    console.log('\n   Nothing to migrate.');
    return;
  }

  let updated = 0;
  let invalid = 0;
  let failed = 0;

  for (const event of toMigrate) {
    const split = splitDatetimeToDateAndTime(event.eventDate);

    if (!split) {
      console.log(`   [SKIP] "${event.eventTitle ?? event.id}" — invalid eventDate: ${event.eventDate}`);
      invalid++;
      continue;
    }

    const { date, time } = split;
    console.log(`   [UPDATE] "${event.eventTitle ?? event.id}" -> dates: [${date}], time: ${time}`);

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: eventTableName,
        Key: marshall({ id: event.id }),
        UpdateExpression: 'SET #dt = :dt, #sd = :sd, #t = :t, updatedAt = :now',
        ExpressionAttributeNames: {
          '#dt': 'eventDateType',
          '#sd': 'eventSpecificDates',
          '#t': 'eventTime',
        },
        ExpressionAttributeValues: marshall({
          ':dt': 'specific',
          ':sd': [date],
          ':t': time,
          ':now': new Date().toISOString(),
        }),
      }));
      updated++;
    } catch (err) {
      console.error(`      FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Migration ${dryRun ? '(dry run) ' : ''}complete ===`);
  console.log(`   Events updated:        ${updated}`);
  console.log(`   Events with bad dates: ${invalid}`);
  console.log(`   Failed writes:         ${failed}`);

  if (dryRun) {
    console.log(`\n   Run with --execute to apply changes.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
