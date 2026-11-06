/**
 * Script to create test data for GSI testing
 * This will insert a test UserSubscription record with a fake Stripe Customer ID
 * 
 * Usage:
 *   npx tsx tests/create-test-data.ts
 */

import { DynamoDBClient, PutItemCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const amplifyOutputsPath = path.join(__dirname, '..', 'amplify_outputs.json');
const ddbClient = new DynamoDBClient({ region: 'eu-west-1' });

async function findTableName(): Promise<string> {
  if (!fs.existsSync(amplifyOutputsPath)) {
    console.error('❌ amplify_outputs.json not found. Run sandbox first.');
    process.exit(1);
  }

  const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf-8'));
  const dataConfig = amplifyOutputs.data;
  const apiId = dataConfig.url.split('//')[1].split('.')[0];
  
  const response = await ddbClient.send(new ListTablesCommand({}));
  const userSubTable = response.TableNames?.find((name: string) => 
    name.includes('UserSubscription') && name.includes(apiId)
  );
  
  if (userSubTable) {
    return userSubTable;
  }
  
  // Fallback to first available table
  const userSubTables = response.TableNames?.filter((n: string) => n.includes('UserSubscription'));
  if (userSubTables && userSubTables.length > 0) {
    return userSubTables[0];
  }
  
  throw new Error('No UserSubscription table found');
}

async function createTestData() {
  console.log('🧪 Creating test data for GSI testing\n');
  
  const tableName = await findTableName();
  console.log('📊 Using table:', tableName);
  
  const testUserId = randomUUID();
  const testCustomerId = `cus_TEST${Date.now()}`;
  const now = new Date().toISOString();
  
  const testSubscription = {
    id: testUserId,
    stripeCustomerId: testCustomerId,
    subscriptionId: `sub_TEST${Date.now()}`,
    paymentMethodId: `pm_TEST${Date.now()}`,
    planName: 'Premium',
    priceId: 'price_TEST',
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
    cancelAtPeriodEnd: false,
    flexEvents: 10,
    flexEventsRemaining: 10,
    flexEventsUsed: 0,
    billingCycle: 'monthly',
    createdAt: now,
    updatedAt: now,
    owner: 'test-user@bafatorio.com', // Required for owner authorization
    __typename: 'UserSubscription'
  };
  
  try {
    await ddbClient.send(new PutItemCommand({
      TableName: tableName,
      Item: marshall(testSubscription, { removeUndefinedValues: true })
    }));
    
    console.log('✅ Test data created successfully!\n');
    console.log('📋 Test subscription details:');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Customer ID: ${testCustomerId}`);
    console.log(`   Subscription ID: ${testSubscription.subscriptionId}`);
    console.log(`   Plan: ${testSubscription.planName}`);
    console.log(`   Status: ${testSubscription.status}`);
    console.log('\n💡 You can now run: npm run test:gsi');
    
  } catch (error: any) {
    console.error('❌ Error creating test data:', error.message);
    process.exit(1);
  }
}

createTestData().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
