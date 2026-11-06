// scripts/cleanup-cognito-groups.ts
//
// Cleanup script: Remove all users from old Cognito groups (REGISTERED, MANAGER, ACTIVE, TEST).
// Run AFTER Deploy 3 is validated and stable.
// Idempotent — safe to re-run multiple times.
//
// Usage:
//   USER_POOL_ID=<your-pool-id> npx tsx scripts/cleanup-cognito-groups.ts
//   USER_POOL_ID=<your-pool-id> npx tsx scripts/cleanup-cognito-groups.ts --dry-run

// ─── AWS SDK imports ───────────────────────────────────────────────
import {
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
  AdminRemoveUserFromGroupCommand,
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
const DELAY_MS = 100;
const MAX_RETRIES = 3;
const GROUPS_TO_CLEAN = ['REGISTERED', 'MANAGER', 'ACTIVE', 'TEST'];

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
    try {
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
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`  Group "${groupName}" does not exist, skipping`);
        return [];
      }
      throw error;
    }
    await sleep(DELAY_MS);
  } while (nextToken);

  return usernames;
}

async function removeUserFromGroup(username: string, groupName: string): Promise<boolean> {
  const masked = maskUsername(username);
  try {
    await withRetry(
      () => cognito.send(new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName,
      })),
      `RemoveUserFromGroup(${masked}, ${groupName})`
    );
    await sleep(DELAY_MS);
    return true;
  } catch (error: any) {
    console.error(`  [FAILED] Remove ${masked} from ${groupName}: ${error.message}`);
    return false;
  }
}

// ─── Main cleanup ─────────────────────────────────────────────────
async function main() {
  const failedOps: { username: string; group: string }[] = [];

  console.log('=== Cognito Groups Cleanup ===');
  console.log(`User Pool: ${USER_POOL_ID}`);
  if (DRY_RUN) console.log('MODE: --dry-run (no changes will be made)');
  console.log('');

  for (const groupName of GROUPS_TO_CLEAN) {
    console.log(`--- Cleaning group: ${groupName} ---`);
    const users = await listAllUsersInGroup(groupName);
    console.log(`  Found ${users.length} users`);

    if (users.length === 0) {
      console.log('  Nothing to clean');
      console.log('');
      continue;
    }

    if (DRY_RUN) {
      console.log(`  Would remove ${users.length} users from ${groupName}`);
      console.log('');
      continue;
    }

    let succeeded = 0, failed = 0;
    for (const username of users) {
      const ok = await removeUserFromGroup(username, groupName);
      if (ok) {
        succeeded++;
      } else {
        failed++;
        failedOps.push({ username: maskUsername(username), group: groupName });
      }
    }
    console.log(`  Result: ${succeeded} removed, ${failed} failed`);

    // Verify group is empty
    const remaining = await listAllUsersInGroup(groupName);
    console.log(`  Verification: ${remaining.length} users remaining`);
    console.log('');
  }

  if (DRY_RUN) {
    console.log('=== Dry-run complete — no changes made ===');
    return;
  }

  if (failedOps.length > 0) {
    console.log('--- FAILED OPERATIONS (requires manual retry) ---');
    for (const f of failedOps) {
      console.log(`  ${f.username} → remove from ${f.group}`);
    }
    console.log('');
  }

  console.log(`=== Cleanup complete — ${failedOps.length} failures ===`);
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
