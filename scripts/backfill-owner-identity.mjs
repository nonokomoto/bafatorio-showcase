#!/usr/bin/env node

/**
 * Backfill: Event.ownerName / ownerEmail nos eventos anteriores ao campo.
 *
 * O create-event grava a identidade real do dono desde 2026-07-16, mas os
 * eventos criados antes só têm o sub em `owner` — o avatar do autor na agenda
 * cai em '??'. Este script resolve o sub no Cognito (ListUsers filter sub=...,
 * porque o AdminGetUser pede o Username, que não temos para terceiros — a
 * razão exacta de o caminho de leitura nunca fazer isto) e carimba o nome uma
 * vez, como o create-event faria hoje.
 *
 * Idempotente: só toca em eventos sem ownerName, com ConditionExpression a
 * garantir que não sobrescreve um valor entretanto escrito.
 *
 * Usage:
 *   node scripts/backfill-owner-identity.mjs --env sandbox             # dry-run (default)
 *   node scripts/backfill-owner-identity.mjs --env sandbox --execute   # escreve
 *
 * Requires: credenciais AWS configuradas (conta 074280453839, eu-west-1).
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { findTable, listAllTables, scanTable } from './lib/dynamo-helpers.mjs';

const REGION = 'eu-west-1';

// Identificadores por ambiente — os mesmos do grant-admin.mjs (ADR-036).
const ENVS = {
  sandbox: { poolId: 'eu-west-1_XXXXXXXXX', suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx' },
  dev: { poolId: 'eu-west-1_XXXXXXXXX', suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx' },
  prod: { poolId: 'eu-west-1_XXXXXXXXX', suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx' },
};

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const EXECUTE = process.argv.includes('--execute');
const envName = arg('env');

if (!ENVS[envName]) {
  console.error(`--env obrigatório: ${Object.keys(ENVS).join(' | ')}`);
  process.exit(1);
}
const { poolId, suffix } = ENVS[envName];

const dynamo = new DynamoDBClient({ region: REGION });
const cognito = new CognitoIdentityProviderClient({ region: REGION });

// Um dono tem N eventos — resolve-se cada sub uma vez.
const identityCache = new Map();

async function resolveIdentity(sub) {
  if (identityCache.has(sub)) return identityCache.get(sub);

  const result = await cognito.send(
    new ListUsersCommand({ UserPoolId: poolId, Filter: `sub = "${sub}"`, Limit: 1 })
  );
  const attrs = result.Users?.[0]?.Attributes ?? [];
  const identity = {
    email: attrs.find((a) => a.Name === 'email')?.Value ?? null,
    name: attrs.find((a) => a.Name === 'name')?.Value ?? null,
  };
  identityCache.set(sub, identity);
  return identity;
}

async function main() {
  console.log(`\n=== Backfill Event.ownerName/ownerEmail ===`);
  console.log(`   Mode: ${EXECUTE ? 'EXECUTING' : 'DRY RUN (use --execute para escrever)'}`);
  console.log(`   Env:  ${envName} (pool ${poolId})`);

  const allTables = await listAllTables(dynamo);
  const eventTable = findTable(allTables, 'Event', { suffix });
  console.log(`   Table: ${eventTable}\n`);

  const events = await scanTable(dynamo, eventTable, {
    projection: ['id', 'eventTitle', 'owner', 'ownerName', 'ownerEmail'],
  });

  const pending = events.filter((e) => !e.ownerName && e.owner);
  console.log(`${events.length} eventos, ${pending.length} sem ownerName.`);

  let updated = 0;
  let unresolved = 0;

  for (const event of pending) {
    const sub = event.owner.split('::')[0];
    const { email, name } = await resolveIdentity(sub);

    if (!email && !name) {
      // Conta apagada do pool: não há o que carimbar, o fallback '??' é honesto.
      unresolved += 1;
      console.log(`  SKIP  ${event.id}  "${event.eventTitle ?? ''}" — sub ${sub} não existe no pool`);
      continue;
    }

    console.log(`  ${EXECUTE ? 'WRITE' : 'would'}  ${event.id}  "${event.eventTitle ?? ''}" → ${name ?? '(sem name)'} <${email ?? 'sem email'}>`);

    if (EXECUTE) {
      const sets = [];
      const values = {};
      if (name) { sets.push('ownerName = :n'); values[':n'] = name; }
      if (email) { sets.push('ownerEmail = :e'); values[':e'] = email; }
      await dynamo.send(
        new UpdateItemCommand({
          TableName: eventTable,
          Key: marshall({ id: event.id }),
          UpdateExpression: `SET ${sets.join(', ')}`,
          ConditionExpression: 'attribute_not_exists(ownerName)',
          ExpressionAttributeValues: marshall(values),
        })
      );
    }
    updated += 1;
  }

  console.log(`\n${EXECUTE ? 'Escritos' : 'A escrever'}: ${updated} · sem conta no pool: ${unresolved}`);
}

main().catch((error) => {
  console.error('\nFalhou:', error);
  process.exit(1);
});
