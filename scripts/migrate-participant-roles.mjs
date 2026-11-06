#!/usr/bin/env node

/**
 * Migration script: participantRole (string) → roleId (FK to Role table)
 *
 * For each unique participantRole value found in Participant records:
 *   1. Find or create a corresponding Role record
 *   2. Update the Participant to set roleId = Role.id
 *   3. Remove the old participantRole attribute
 *
 * Usage:
 *   node scripts/migrate-participant-roles.mjs                    # dry-run (default)
 *   node scripts/migrate-participant-roles.mjs --execute          # actually write changes
 *   node scripts/migrate-participant-roles.mjs --suffix XXXXX     # DynamoDB table suffix
 *
 * Requires:
 *   - AWS credentials configured (same as Amplify sandbox)
 */

import {
  DynamoDBClient,
  UpdateItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

import { findTable, listAllTables, scanTable } from './lib/dynamo-helpers.mjs';

const REGION = process.env.AWS_REGION || 'eu-west-1';
const dynamo = new DynamoDBClient({ region: REGION });

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const suffixIdx = args.indexOf('--suffix');
const suffix = suffixIdx !== -1 ? args[suffixIdx + 1] : null;

// ── Main migration ──

async function main() {
  console.log(`\n🔄 Migrating participantRole → roleId`);
  console.log(`   Mode: ${dryRun ? '🔍 DRY RUN (use --execute to write)' : '⚡ EXECUTING'}`);
  console.log(`   Region: ${REGION}`);
  if (suffix) console.log(`   Suffix: ${suffix}`);

  // 1. Discover tables
  const allTables = await listAllTables(dynamo);
  const participantTableName = findTable(allTables, 'Participant', { suffix });
  const roleTableName = findTable(allTables, 'Role', { suffix });

  console.log(`\n   Participant table: ${participantTableName}`);
  console.log(`   Role table: ${roleTableName}`);

  // 2. Scan existing roles
  const existingRoles = await scanTable(dynamo, roleTableName);
  const roleNameToId = {};
  existingRoles.forEach(r => {
    if (r.name) {
      roleNameToId[r.name.toLowerCase()] = r.id;
    }
  });
  console.log(`\n   Existing roles: ${existingRoles.map(r => `${r.name} (${r.id})`).join(', ') || 'none'}`);

  // 3. Scan all participants
  const participants = await scanTable(dynamo, participantTableName);
  console.log(`   Total participants: ${participants.length}`);

  // 4. Find participants needing migration (have participantRole but no roleId)
  const needsMigration = participants.filter(p => p.participantRole && !p.roleId);
  const alreadyMigrated = participants.filter(p => p.roleId);
  const noRole = participants.filter(p => !p.participantRole && !p.roleId);

  console.log(`\n   Already migrated (have roleId): ${alreadyMigrated.length}`);
  console.log(`   Needs migration (have participantRole, no roleId): ${needsMigration.length}`);
  console.log(`   No role at all: ${noRole.length}`);

  if (needsMigration.length === 0) {
    console.log('\n✅ Nothing to migrate!');
    return;
  }

  // 5. Collect unique participantRole values that need Role records
  const uniqueRoles = [...new Set(needsMigration.map(p => p.participantRole.toLowerCase()))];
  console.log(`\n   Unique participantRole values to migrate: ${uniqueRoles.join(', ')}`);

  // 6. Create missing Role records
  const rolesToCreate = uniqueRoles.filter(name => !roleNameToId[name]);
  if (rolesToCreate.length > 0) {
    console.log(`\n   Creating ${rolesToCreate.length} new Role records: ${rolesToCreate.join(', ')}`);

    for (const roleName of rolesToCreate) {
      const roleId = randomUUID();
      // Capitalize first letter for display name
      const displayName = roleName.charAt(0).toUpperCase() + roleName.slice(1);

      if (!dryRun) {
        const now = new Date().toISOString();
        await dynamo.send(new PutItemCommand({
          TableName: roleTableName,
          Item: marshall({
            id: roleId,
            name: displayName,
            createdAt: now,
            updatedAt: now,
          }, { removeUndefinedValues: true }),
          ConditionExpression: 'attribute_not_exists(id)',
        }));
        console.log(`      ✅ Created Role: ${displayName} → ${roleId}`);
      } else {
        console.log(`      🔍 Would create Role: ${displayName} → ${roleId}`);
      }

      roleNameToId[roleName] = roleId;
    }
  } else {
    console.log(`\n   All role records already exist.`);
  }

  // 7. Update participant records
  console.log(`\n   Updating ${needsMigration.length} participants...`);

  let success = 0;
  let failed = 0;

  for (const participant of needsMigration) {
    const roleId = roleNameToId[participant.participantRole.toLowerCase()];

    if (!roleId) {
      console.error(`      ❌ ${participant.participantName || participant.id}: No roleId found for '${participant.participantRole}'`);
      failed++;
      continue;
    }

    if (!dryRun) {
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: participantTableName,
          Key: marshall({ id: participant.id }),
          UpdateExpression: 'SET #roleId = :roleId, updatedAt = :now REMOVE #oldRole',
          ExpressionAttributeNames: {
            '#roleId': 'roleId',
            '#oldRole': 'participantRole',
          },
          ExpressionAttributeValues: marshall({
            ':roleId': roleId,
            ':now': new Date().toISOString(),
          }),
        }));
        console.log(`      ✅ ${participant.participantName || participant.id}: ${participant.participantRole} → ${roleId}`);
        success++;
      } catch (err) {
        console.error(`      ❌ ${participant.participantName || participant.id}: ${err.message}`);
        failed++;
      }
    } else {
      console.log(`      🔍 Would update ${participant.participantName || participant.id}: ${participant.participantRole} → ${roleId}`);
      success++;
    }
  }

  console.log(`\n📊 Migration ${dryRun ? '(dry run) ' : ''}complete:`);
  console.log(`   Updated: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped (already migrated): ${alreadyMigrated.length}`);

  if (dryRun) {
    console.log(`\n💡 Run with --execute to apply changes.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
