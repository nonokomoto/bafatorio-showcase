#!/usr/bin/env node

/**
 * Migration script: Add eventId to existing Role records
 *
 * Roles were previously user-scoped (rules.owner()). This migration makes them
 * event-scoped by adding eventId to each Role based on Participant usage.
 *
 * Algorithm:
 *   1. Scan all Roles (no eventId yet)
 *   2. Scan all Participants (id, roleId, eventId)
 *   3. Map: roleId -> Set<eventId>
 *   4. For each role:
 *      - Used in 1 event -> UPDATE role: SET eventId = thatEventId
 *      - Used in 0 events -> DELETE role (orphaned)
 *      - Used in N events -> Keep original for first event, CLONE for others,
 *                            UPDATE participant.roleId references
 *
 * Usage:
 *   node scripts/migrate-roles-add-eventId.mjs                  # dry-run (default)
 *   node scripts/migrate-roles-add-eventId.mjs --execute        # actually write changes
 *   node scripts/migrate-roles-add-eventId.mjs --suffix XXXXX   # DynamoDB table suffix
 *
 * Requires:
 *   - AWS credentials configured (same as Amplify sandbox)
 */

import {
  DynamoDBClient,
  UpdateItemCommand,
  PutItemCommand,
  DeleteItemCommand,
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
  console.log(`\n=== Migrating Roles: Adding eventId ===`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (use --execute to write)' : 'EXECUTING'}`);
  console.log(`   Region: ${REGION}`);
  if (suffix) console.log(`   Suffix: ${suffix}`);

  // 1. Discover tables
  const allTables = await listAllTables(dynamo);
  const roleTableName = findTable(allTables, 'Role', { suffix });
  const participantTableName = findTable(allTables, 'Participant', { suffix });

  console.log(`\n   Role table: ${roleTableName}`);
  console.log(`   Participant table: ${participantTableName}`);

  // 2. Scan all roles
  const roles = await scanTable(dynamo, roleTableName);
  console.log(`\n   Total roles: ${roles.length}`);

  const rolesWithEventId = roles.filter(r => r.eventId);
  const rolesWithoutEventId = roles.filter(r => !r.eventId);

  console.log(`   Already have eventId: ${rolesWithEventId.length}`);
  console.log(`   Need migration: ${rolesWithoutEventId.length}`);

  if (rolesWithoutEventId.length === 0) {
    console.log('\n   Nothing to migrate!');
    return;
  }

  // 3. Scan participants to map roleId -> Set<eventId>
  const participants = await scanTable(dynamo, participantTableName, { projection: ['id', 'roleId', 'eventId', 'owner'] });
  console.log(`   Total participants: ${participants.length}`);

  const roleToEvents = {};
  const roleToParticipants = {};

  for (const p of participants) {
    if (!p.roleId || !p.eventId) continue;
    if (!roleToEvents[p.roleId]) {
      roleToEvents[p.roleId] = new Set();
      roleToParticipants[p.roleId] = [];
    }
    roleToEvents[p.roleId].add(p.eventId);
    roleToParticipants[p.roleId].push(p);
  }

  // 4. Process each role
  let updated = 0;
  let deleted = 0;
  let cloned = 0;
  let participantsUpdated = 0;
  let failed = 0;

  for (const role of rolesWithoutEventId) {
    const eventIds = roleToEvents[role.id] ? [...roleToEvents[role.id]] : [];

    if (eventIds.length === 0) {
      // Orphaned role — delete
      console.log(`   [DELETE] "${role.name}" (${role.id}) — orphaned, no participants use it`);
      if (!dryRun) {
        try {
          await dynamo.send(new DeleteItemCommand({
            TableName: roleTableName,
            Key: marshall({ id: role.id }),
          }));
          deleted++;
        } catch (err) {
          console.error(`      FAILED: ${err.message}`);
          failed++;
        }
      } else {
        deleted++;
      }
    } else if (eventIds.length === 1) {
      // Used in exactly 1 event — update in place
      const eventId = eventIds[0];
      console.log(`   [UPDATE] "${role.name}" (${role.id}) -> eventId: ${eventId}`);
      if (!dryRun) {
        try {
          await dynamo.send(new UpdateItemCommand({
            TableName: roleTableName,
            Key: marshall({ id: role.id }),
            UpdateExpression: 'SET #eid = :eid, #tn = :tn, updatedAt = :now',
            ExpressionAttributeNames: {
              '#eid': 'eventId',
              '#tn': '__typename',
            },
            ExpressionAttributeValues: marshall({
              ':eid': eventId,
              ':tn': 'Role',
              ':now': new Date().toISOString(),
            }),
          }));
          updated++;
        } catch (err) {
          console.error(`      FAILED: ${err.message}`);
          failed++;
        }
      } else {
        updated++;
      }
    } else {
      // Used in N events — assign first event to original, clone for remaining
      console.log(`   [CLONE] "${role.name}" (${role.id}) — used in ${eventIds.length} events`);

      // First event: update original role
      const firstEventId = eventIds[0];
      console.log(`      Event ${firstEventId}: keep original`);
      if (!dryRun) {
        try {
          await dynamo.send(new UpdateItemCommand({
            TableName: roleTableName,
            Key: marshall({ id: role.id }),
            UpdateExpression: 'SET #eid = :eid, #tn = :tn, updatedAt = :now',
            ExpressionAttributeNames: {
              '#eid': 'eventId',
              '#tn': '__typename',
            },
            ExpressionAttributeValues: marshall({
              ':eid': firstEventId,
              ':tn': 'Role',
              ':now': new Date().toISOString(),
            }),
          }));
          updated++;
        } catch (err) {
          console.error(`      FAILED to update original: ${err.message}`);
          failed++;
        }
      } else {
        updated++;
      }

      // Remaining events: clone role + update participants
      for (let i = 1; i < eventIds.length; i++) {
        const eventId = eventIds[i];
        const newRoleId = randomUUID();
        const now = new Date().toISOString();

        console.log(`      Event ${eventId}: clone as ${newRoleId}`);

        if (!dryRun) {
          try {
            // Create cloned role
            await dynamo.send(new PutItemCommand({
              TableName: roleTableName,
              Item: marshall({
                id: newRoleId,
                name: role.name,
                eventId,
                owner: role.owner,
                __typename: 'Role',
                createdAt: now,
                updatedAt: now,
              }, { removeUndefinedValues: true }),
              ConditionExpression: 'attribute_not_exists(id)',
            }));
            cloned++;

            // Update participants in this event to point to the new role
            const affectedParticipants = (roleToParticipants[role.id] || [])
              .filter(p => p.eventId === eventId);

            for (const p of affectedParticipants) {
              await dynamo.send(new UpdateItemCommand({
                TableName: participantTableName,
                Key: marshall({ id: p.id }),
                UpdateExpression: 'SET #rid = :rid, updatedAt = :now',
                ExpressionAttributeNames: { '#rid': 'roleId' },
                ExpressionAttributeValues: marshall({
                  ':rid': newRoleId,
                  ':now': now,
                }),
              }));
              participantsUpdated++;
            }
            console.log(`         Updated ${affectedParticipants.length} participants`);
          } catch (err) {
            console.error(`      FAILED to clone: ${err.message}`);
            failed++;
          }
        } else {
          cloned++;
          const affectedCount = (roleToParticipants[role.id] || [])
            .filter(p => p.eventId === eventId).length;
          participantsUpdated += affectedCount;
          console.log(`         Would update ${affectedCount} participants`);
        }
      }
    }
  }

  console.log(`\n=== Migration ${dryRun ? '(dry run) ' : ''}complete ===`);
  console.log(`   Roles updated (single event): ${updated}`);
  console.log(`   Roles deleted (orphaned): ${deleted}`);
  console.log(`   Roles cloned (multi-event): ${cloned}`);
  console.log(`   Participants re-pointed: ${participantsUpdated}`);
  console.log(`   Failed: ${failed}`);

  if (dryRun) {
    console.log(`\n   Run with --execute to apply changes.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
