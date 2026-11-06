/**
 * Test script to verify the byCustomerId GSI index is working
 * This test queries the UserSubscription table using the GSI to find a user by Stripe Customer ID
 * 
 * Usage:
 *   npx tsx tests/test-gsi-index.ts
 * 
 * Prerequisites:
 *   - npm install -D tsx (if not already installed)
 *   - AWS credentials configured
 *   - At least one UserSubscription record with a stripeCustomerId in DynamoDB
 */

import { DynamoDBClient, QueryCommand, ScanCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Read table name from amplify_outputs.json
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const amplifyOutputsPath = path.join(__dirname, '..', 'amplify_outputs.json');
let tableName = '';

async function findTableName(): Promise<string> {
  const ddbClient = new DynamoDBClient({ region: 'eu-west-1' });
  if (!fs.existsSync(amplifyOutputsPath)) {
    console.error('❌ amplify_outputs.json not found. Run sandbox first.');
    process.exit(1);
  }

  const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf-8'));
  const dataConfig = amplifyOutputs.data;
  
  console.log('📋 Amplify outputs loaded');
  console.log('🔍 API endpoint:', dataConfig.url);
  
  // Extract API ID from the URL
  const apiId = dataConfig.url.split('//')[1].split('.')[0];
  console.log('🆔 API ID:', apiId);
  
  // List DynamoDB tables to find the UserSubscription table
  try {
    console.log('🔍 Searching for UserSubscription table...');
    const response = await ddbClient.send(new ListTablesCommand({}));
    
    // Find table that matches UserSubscription pattern
    const userSubTable = response.TableNames?.find((name: string) => 
      name.includes('UserSubscription') && name.includes(apiId)
    );
    
    if (userSubTable) {
      console.log('✅ Found table:', userSubTable);
      return userSubTable;
    } else {
      // If no exact match, use the most recent UserSubscription table
      const userSubTables = response.TableNames?.filter((n: string) => n.includes('UserSubscription'));
      if (userSubTables && userSubTables.length > 0) {
        console.log('⚠️  Could not find table for current API ID');
        console.log('📋 Available UserSubscription tables:', userSubTables);
        console.log(`💡 Using the first available table: ${userSubTables[0]}`);
        return userSubTables[0];
      }
      
      console.error('❌ No UserSubscription tables found');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error listing tables:', error.message);
    process.exit(1);
  }
}

const ddbClient = new DynamoDBClient({ region: 'eu-west-1' });

interface UserSubscription {
  id: string;
  stripeCustomerId: string;
  subscriptionId?: string;
  status?: string;
  planName?: string;
  owner?: string;
}

/**
 * Test 1: Scan table to find a test customer ID
 */
async function findTestCustomerId(): Promise<string | null> {
  console.log('\n🔍 Test 1: Scanning table to find a test customer ID...');
  
  try {
    const result = await ddbClient.send(new ScanCommand({
      TableName: tableName,
      Limit: 5,
      ProjectionExpression: 'id, stripeCustomerId, #status',
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    }));

    if (result.Items && result.Items.length > 0) {
      console.log(`✅ Found ${result.Items.length} records`);
      
      const subscriptions = result.Items
        .map(item => unmarshall(item) as UserSubscription)
        .filter(sub => sub.stripeCustomerId);

      if (subscriptions.length > 0) {
        console.log('\n📋 Sample subscriptions:');
        subscriptions.forEach((sub, index) => {
          console.log(`  ${index + 1}. User ID: ${sub.id.substring(0, 20)}...`);
          console.log(`     Customer ID: ${sub.stripeCustomerId}`);
          console.log(`     Status: ${sub.status || 'N/A'}`);
        });
        
        return subscriptions[0].stripeCustomerId;
      } else {
        console.log('⚠️  No records with stripeCustomerId found');
        return null;
      }
    } else {
      console.log('⚠️  Table is empty');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error scanning table:', error.message);
    return null;
  }
}

/**
 * Test 2: Query using the byCustomerId GSI
 */
async function testGSIQuery(stripeCustomerId: string): Promise<boolean> {
  console.log('\n🔍 Test 2: Querying using byCustomerId GSI...');
  console.log(`   Customer ID: ${stripeCustomerId}`);
  
  try {
    const startTime = Date.now();
    
    const result = await ddbClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'byCustomerId',
      KeyConditionExpression: 'stripeCustomerId = :stripeCustomerId',
      ExpressionAttributeValues: {
        ':stripeCustomerId': { S: stripeCustomerId },
      },
      Limit: 1,
    }));

    const duration = Date.now() - startTime;

    if (result.Items && result.Items.length > 0) {
      const subscription = unmarshall(result.Items[0]) as UserSubscription;
      
      console.log(`✅ GSI Query successful! (${duration}ms)`);
      console.log('📋 Found subscription:');
      console.log(`   User ID: ${subscription.id}`);
      console.log(`   Customer ID: ${subscription.stripeCustomerId}`);
      console.log(`   Status: ${subscription.status || 'N/A'}`);
      console.log(`   Plan: ${subscription.planName || 'N/A'}`);
      
      return true;
    } else {
      console.log('⚠️  No results returned from GSI query');
      return false;
    }
  } catch (error: any) {
    console.error('❌ GSI Query failed:', error.message);
    
    if (error.message.includes('The table does not have the specified index')) {
      console.error('💡 The byCustomerId index does not exist!');
      console.error('   Make sure you deployed the schema changes.');
    }
    
    return false;
  }
}

/**
 * Test 3: Test with non-existent customer ID
 */
async function testNonExistentCustomer(): Promise<boolean> {
  console.log('\n🔍 Test 3: Testing with non-existent customer ID...');
  const fakeCustomerId = 'cus_NONEXISTENT123456789';
  
  try {
    const result = await ddbClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'byCustomerId',
      KeyConditionExpression: 'stripeCustomerId = :stripeCustomerId',
      ExpressionAttributeValues: {
        ':stripeCustomerId': { S: fakeCustomerId },
      },
      Limit: 1,
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log('✅ Correctly returned empty result for non-existent customer');
      return true;
    } else {
      console.log('⚠️  Unexpected: found results for non-existent customer');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  // First, find the table name
  tableName = await findTableName();
  
  console.log('\n🧪 Testing byCustomerId GSI Index');
  console.log('================================\n');
  console.log(`📊 Table: ${tableName}`);
  console.log(`🌍 Region: eu-west-1`);
  
  let allTestsPassed = true;

  // Test 1: Find a test customer ID
  const testCustomerId = await findTestCustomerId();
  
  if (!testCustomerId) {
    console.log('\n⚠️  Cannot proceed with GSI tests - no test data available');
    console.log('💡 Create a subscription in your app first, then run this test again');
    return;
  }

  // Test 2: Query using GSI
  const gsiTest = await testGSIQuery(testCustomerId);
  allTestsPassed = allTestsPassed && gsiTest;

  // Test 3: Test with non-existent customer
  const nonExistentTest = await testNonExistentCustomer();
  allTestsPassed = allTestsPassed && nonExistentTest;

  // Summary
  console.log('\n================================');
  if (allTestsPassed) {
    console.log('✅ All tests passed!');
    console.log('✅ The byCustomerId GSI is working correctly');
    console.log('✅ Issue #25 is resolved');
  } else {
    console.log('❌ Some tests failed');
    console.log('💡 Check the errors above for details');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
