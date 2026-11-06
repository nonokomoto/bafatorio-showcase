// scripts/migrate-cognito-groups.ts
//
// Migration script: REGISTERED → USER, MANAGER → ADMIN + USER
// Run AFTER Deploy 1 (dual-mode) is live.
// Idempotent — safe to re-run multiple times.
//
// Usage:
//   USER_POOL_ID=<your-pool-id> npx tsx scripts/migrate-cognito-groups.ts
//   USER_POOL_ID=<your-pool-id> npx tsx scripts/migrate-cognito-groups.ts --dry-run

// ─── AWS SDK imports ───────────────────────────────────────────────
import {
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// ─── Config & validation ──────────────────────────────────────────
const USER_POOL_ID = process.env.USER_POOL_ID;
if (!USER_POOL_ID) {
  console.error('ERROR: USER_POOL_ID environment variable is required');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-west-1',
});

// ─── Rate-limit & retry constants ─────────────────────────────────
const DELAY_MS = 100;   // Cognito rate limit: ~15 req/s
const MAX_RETRIES = 3;

// ─── Utility helpers ──────────────────────────────────────────────
const THROTTLE_ERRORS = new Set(['TooManyRequestsException', 'ThrottlingException']);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function maskUsername(username: string): string {
  if (username.length <= 4) return '****';
  return username.slice(0, 2) + '****' + username.slice(-2);
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (THROTTLE_ERRORS.has(error.name) && attempt < MAX_RETRIES) {
        const backoff = DELAY_MS * Math.pow(2, attempt);
        console.warn(`[THROTTLED] ${label} - retrying in ${backoff}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(backoff);
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Max retries exceeded for ${label}`);
}

// ─── Cognito operations ───────────────────────────────────────────
async function listAllUsersInGroup(groupName: string): Promise<string[]> {
  const usernames: string[] = [];
  let nextToken: string | undefined;

  do {
    const result = await withRetry(
      () => cognito.send(new ListUsersInGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: groupName,
        Limit: 60,
        NextToken: nextToken,
      })),
      `ListUsersInGroup(${groupName})`
    );

    for (const user of result.Users || []) {
      if (user.Username) usernames.push(user.Username);
    }
    nextToken = result.NextToken;
    await sleep(DELAY_MS);
  } while (nextToken);

  return usernames;
}

async function addUserToGroup(username: string, groupName: string): Promise<boolean> {
  const masked = maskUsername(username);
  try {
    await withRetry(
      () => cognito.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName,
      })),
      `AddUserToGroup(${masked}, ${groupName})`
    );
    await sleep(DELAY_MS);
    return true;
  } catch (error: any) {
    console.error(`[FAILED] AddUserToGroup(${masked}, ${groupName}): ${error.message}`);
    return false;
  }
}

async function ensureGroupExists(groupName: string): Promise<void> {
  try {
    await withRetry(
      () => cognito.send(new CreateGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: groupName,
      })),
      `CreateGroup(${groupName})`
    );
    console.log(`[CREATED] Group: ${groupName}`);
  } catch (error: any) {
    if (error.name === 'GroupExistsException') {
      console.log(`[EXISTS] Group: ${groupName}`);
    } else {
      throw error;
    }
  }
}

// ─── Main migration ──────────────────────────────────────────────
async function main() {
  const failedUsers: { username: string; group: string; error: string }[] = [];

  console.log('=== Cognito Groups Migration ===');
  console.log(`User Pool: ${USER_POOL_ID}`);
  if (DRY_RUN) console.log('MODE: --dry-run (no changes will be made)');
  console.log('');

  // Phase 1: List current group membership (read-only)
  console.log('--- Phase 1: Current group counts ---');
  let registeredUsers: string[] = [];
  let managerUsers: string[] = [];
  let activeUsers: string[] = [];
  let testUsers: string[] = [];

  for (const [name, setter] of [
    ['REGISTERED', (u: string[]) => { registeredUsers = u; }],
    ['MANAGER', (u: string[]) => { managerUsers = u; }],
    ['ACTIVE', (u: string[]) => { activeUsers = u; }],
    ['TEST', (u: string[]) => { testUsers = u; }],
  ] as [string, (u: string[]) => void][]) {
    try {
      setter(await listAllUsersInGroup(name));
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`  [SKIP] Group "${name}" does not exist`);
      } else {
        throw error;
      }
    }
  }

  const totalSource = new Set([...registeredUsers, ...managerUsers, ...activeUsers, ...testUsers]).size;
  console.log(`  REGISTERED: ${registeredUsers.length} users`);
  console.log(`  MANAGER:    ${managerUsers.length} users`);
  console.log(`  ACTIVE:     ${activeUsers.length} users`);
  console.log(`  TEST:       ${testUsers.length} users`);
  console.log(`  Total unique users: ${totalSource}`);
  console.log('');

  if (DRY_RUN) {
    console.log('--- Dry-run plan ---');
    console.log(`  REGISTERED → USER: ${registeredUsers.length} users`);
    console.log(`  MANAGER → ADMIN + USER: ${managerUsers.length} users`);
    const alreadyProcessed = new Set([...registeredUsers, ...managerUsers]);
    const safetyCount = [...new Set([...activeUsers, ...testUsers])].filter(u => !alreadyProcessed.has(u)).length;
    console.log(`  ACTIVE/TEST → USER (safety net): ${safetyCount} users`);
    console.log('');
    console.log('=== Dry-run complete — no changes made ===');
    return;
  }

  // Phase 2: Ensure target groups exist
  console.log('--- Phase 2: Ensure target groups exist ---');
  await ensureGroupExists('USER');
  await ensureGroupExists('ADMIN');
  console.log('');

  // Phase 3: Migrate REGISTERED → USER
  console.log('--- Phase 3: REGISTERED → USER ---');
  const processedUsers = new Set<string>();
  let succeeded = 0, failed = 0;
  for (const username of registeredUsers) {
    const ok = await addUserToGroup(username, 'USER');
    if (ok) { succeeded++; } else { failed++; failedUsers.push({ username: maskUsername(username), group: 'USER', error: 'see log above' }); }
    processedUsers.add(username);
  }
  console.log(`  Result: ${succeeded} succeeded, ${failed} failed`);
  console.log('');

  // Phase 4: Migrate MANAGER → ADMIN + USER
  console.log('--- Phase 4: MANAGER → ADMIN + USER ---');
  succeeded = 0; failed = 0;
  for (const username of managerUsers) {
    const okUser = await addUserToGroup(username, 'USER');
    if (!okUser) failedUsers.push({ username: maskUsername(username), group: 'USER', error: 'see log above' });
    const okAdmin = await addUserToGroup(username, 'ADMIN');
    if (!okAdmin) failedUsers.push({ username: maskUsername(username), group: 'ADMIN', error: 'see log above' });
    (okAdmin && okUser) ? succeeded++ : failed++;
    processedUsers.add(username);
  }
  console.log(`  Result: ${succeeded} succeeded, ${failed} failed`);
  console.log('');

  // Phase 5: Safety net — ACTIVE and TEST users also get USER (skip already processed)
  console.log('--- Phase 5: ACTIVE/TEST → USER (safety net) ---');
  succeeded = 0; failed = 0;
  let skipped = 0;
  const safetyUsers = [...new Set([...activeUsers, ...testUsers])];
  for (const username of safetyUsers) {
    if (processedUsers.has(username)) { skipped++; continue; }
    const ok = await addUserToGroup(username, 'USER');
    if (ok) { succeeded++; } else { failed++; failedUsers.push({ username: maskUsername(username), group: 'USER', error: 'see log above' }); }
  }
  console.log(`  Result: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped (already processed)`);
  console.log('');

  // Phase 6: Verification
  console.log('--- Phase 6: Verification ---');
  const newUserGroup = await listAllUsersInGroup('USER');
  const newAdminGroup = await listAllUsersInGroup('ADMIN');
  console.log(`  USER group:  ${newUserGroup.length} users`);
  console.log(`  ADMIN group: ${newAdminGroup.length} users`);
  console.log('');

  // Phase 7: Summary of failures
  if (failedUsers.length > 0) {
    console.log('--- FAILED USERS (requires manual retry) ---');
    for (const f of failedUsers) {
      console.log(`  ${f.username} → ${f.group}`);
    }
    console.log('');
  }

  console.log(`=== Migration complete — ${failedUsers.length} failures ===`);
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
