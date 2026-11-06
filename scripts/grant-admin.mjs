#!/usr/bin/env node

/**
 * Grant/revoke de conta de administração (ADR-036).
 *
 * Um comando faz os DOIS passos que o ADR define como uma decisão única:
 *   1. Grupo Cognito ADMIN        → badge "Admin" na UI
 *   2. UserSubscription planName  → bypass de billing (nível Pro ilimitado)
 *
 * Guarda-chuva do ADR: contas admin são dedicadas, sem ciclo Stripe — o grant
 * recusa se a conta tiver uma UserSubscription com stripeCustomerId (o webhook
 * faria PutItem por cima do registo ADMIN na renovação).
 *
 * Idempotente: re-correr um grant/revoke já aplicado é no-op.
 *
 * Usage:
 *   node scripts/grant-admin.mjs --env sandbox --email dev@bafatorio.com            # dry-run (default)
 *   node scripts/grant-admin.mjs --env dev --email x@y.com --execute               # aplica
 *   node scripts/grant-admin.mjs --env dev --email x@y.com --revoke --execute      # remove grupo + registo
 *   node scripts/grant-admin.mjs --env prod --email x@y.com --execute              # produção: pede confirmação
 *
 * Requires: credenciais AWS configuradas (conta 074280453839, eu-west-1).
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { createInterface } from 'node:readline/promises';

// Espelha ADMIN_PLAN_NAME de shared/plans.ts — script operacional mantém-se
// self-contained (mesma razão do migrate-event-dates.mjs).
const ADMIN_PLAN_NAME = 'ADMIN';
const GROUP_NAME = 'ADMIN';
const REGION = 'eu-west-1';

// Identificadores por ambiente (confirmados 2026-07-14; ver memória do projeto
// e docs/adr/ADR-036). Tabela = UserSubscription-<suffix>-NONE.
const ENVS = {
  sandbox: { poolId: 'eu-west-1_XXXXXXXXX', suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx' },
  dev: { poolId: 'eu-west-1_XXXXXXXXX', suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx' },
  prod: { poolId: 'eu-west-1_XXXXXXXXX', suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx' },
};

// ─── args ──────────────────────────────────────────────────────────
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const has = (name) => process.argv.includes(`--${name}`);

const EXECUTE = has('execute');
const REVOKE = has('revoke');

// Sem flags, o script pergunta — pronto a usar sem decorar a sintaxe.
// Iterador de linhas partilhado: rl.question perde a corrida com o EOF quando
// o input vem por pipe; o iterador faz buffer e serve TTY e pipes.
let rl = null;
let lines = null;
const ask = async (question) => {
  rl ??= createInterface({ input: process.stdin, output: process.stdout });
  lines ??= rl[Symbol.asyncIterator]();
  process.stdout.write(question);
  const { value, done } = await lines.next();
  if (done) {
    console.error('\nInput terminou sem resposta — abortado.');
    process.exit(1);
  }
  return value.trim();
};
const closePrompt = () => rl?.close();

let envName = arg('env');
if (!envName) {
  envName = await ask(`Ambiente (${Object.keys(ENVS).join('/')}): `);
}
if (!ENVS[envName]) {
  console.error(`Ambiente inválido: "${envName}". Opções: ${Object.keys(ENVS).join(', ')}.`);
  process.exit(1);
}

let email = arg('email');
if (!email) {
  email = await ask('Email da conta a tornar admin: ');
}
if (!email.includes('@')) {
  console.error(`Email inválido: "${email}".`);
  process.exit(1);
}

const { poolId, suffix } = ENVS[envName];
const TABLE = `UserSubscription-${suffix}-NONE`;
const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });

const log = (msg) => console.log(`${EXECUTE ? '' : '[dry-run] '}${msg}`);

// ─── main ──────────────────────────────────────────────────────────
async function main() {
  console.log(`\nAmbiente: ${envName} · pool ${poolId} · tabela ${TABLE}`);
  console.log(`Operação: ${REVOKE ? 'REVOKE' : 'GRANT'} · conta: ${email}\n`);

  if (envName === 'prod' && EXECUTE) {
    const answer = await ask(`⚠️  PRODUÇÃO. Escreve "${REVOKE ? 'revoke' : 'grant'} prod" para confirmar: `);
    if (answer !== `${REVOKE ? 'revoke' : 'grant'} prod`) {
      console.error('Confirmação inválida — abortado.');
      process.exit(1);
    }
  }

  // 1. Resolver o sub pelo email
  const users = await cognito.send(new ListUsersCommand({
    UserPoolId: poolId,
    Filter: `email = "${email}"`,
  }));
  const user = users.Users?.[0];
  if (!user) {
    console.error(`Conta ${email} não existe no pool ${poolId} — abortado.`);
    process.exit(1);
  }
  const sub = user.Attributes?.find((a) => a.Name === 'sub')?.Value;
  console.log(`Conta encontrada: sub ${sub}`);

  // 2. Estado atual
  const groupsResult = await cognito.send(new AdminListGroupsForUserCommand({
    UserPoolId: poolId,
    Username: user.Username,
  }));
  const inGroup = (groupsResult.Groups ?? []).some((g) => g.GroupName === GROUP_NAME);

  const existing = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ id: sub }),
  }));
  const record = existing.Item ? unmarshall(existing.Item) : null;
  console.log(`Grupo ADMIN: ${inGroup ? 'sim' : 'não'} · UserSubscription: ${record ? `planName=${record.planName ?? '-'}` : 'sem registo'}\n`);

  if (REVOKE) {
    return revoke({ sub, username: user.Username, inGroup, record });
  }
  return grant({ sub, username: user.Username, inGroup, record });
}

async function grant({ sub, username, inGroup, record }) {
  // Guarda-chuva do ADR-036: conta com ciclo Stripe não pode ser admin.
  if (record && record.planName !== ADMIN_PLAN_NAME) {
    console.error(
      `❌ A conta tem uma UserSubscription (planName=${record.planName ?? '-'}` +
      `${record.stripeCustomerId ? `, stripeCustomerId=${record.stripeCustomerId}` : ''}).\n` +
      'Contas admin são dedicadas, sem ciclo Stripe (ADR-036). Usa outra conta ' +
      'ou remove a subscrição primeiro (deliberadamente, não por este script).'
    );
    process.exit(1);
  }

  if (inGroup) {
    log('Grupo ADMIN: já membro — skip.');
  } else {
    log(`Grupo ADMIN: adicionar ${username}.`);
    if (EXECUTE) {
      await cognito.send(new AdminAddUserToGroupCommand({
        UserPoolId: poolId, Username: username, GroupName: GROUP_NAME,
      }));
    }
  }

  if (record?.planName === ADMIN_PLAN_NAME) {
    log('Registo ADMIN: já existe — skip.');
  } else {
    log(`Registo ADMIN: criar em ${TABLE}.`);
    if (EXECUTE) {
      const now = new Date().toISOString();
      await ddb.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall({
          id: sub,
          owner: `${sub}::${sub}`,
          planName: ADMIN_PLAN_NAME,
          status: 'active',
          __typename: 'UserSubscription',
          createdAt: now,
          updatedAt: now,
        }),
        ConditionExpression: 'attribute_not_exists(id)',
      }));
    }
  }

  console.log(`\n${EXECUTE ? '✅ Grant aplicado.' : 'Dry-run concluído — re-corre com --execute para aplicar.'}`);
}

async function revoke({ sub, username, inGroup, record }) {
  // Só apaga registos ADMIN — nunca uma subscrição Stripe real.
  if (record && record.planName !== ADMIN_PLAN_NAME) {
    console.error(`❌ O registo tem planName=${record.planName ?? '-'} (não é ADMIN) — não toco em subscrições reais.`);
    process.exit(1);
  }

  if (!inGroup) {
    log('Grupo ADMIN: não é membro — skip.');
  } else {
    log(`Grupo ADMIN: remover ${username}.`);
    if (EXECUTE) {
      await cognito.send(new AdminRemoveUserFromGroupCommand({
        UserPoolId: poolId, Username: username, GroupName: GROUP_NAME,
      }));
    }
  }

  if (!record) {
    log('Registo ADMIN: não existe — skip.');
  } else {
    log(`Registo ADMIN: apagar de ${TABLE}.`);
    if (EXECUTE) {
      await ddb.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: marshall({ id: sub }),
        ConditionExpression: 'planName = :admin',
        ExpressionAttributeValues: marshall({ ':admin': ADMIN_PLAN_NAME }),
      }));
    }
  }

  console.log(`\n${EXECUTE ? '✅ Revoke aplicado.' : 'Dry-run concluído — re-corre com --execute para aplicar.'}`);
}

main()
  .then(() => closePrompt())
  .catch((err) => {
    console.error('Erro:', err.message);
    process.exit(1);
  });
