/**
 * @file fidelize-save-api-key/handler.ts
 * @description Save and validate a Fidelize API key.
 * 1. Extract userId from identity token
 * 2. Validate the API key by calling GET /templates on the Fidelize API
 * 3. Encrypt with KMS
 * 4. Upsert in DynamoDB FidelizeIntegration table
 * 5. Return { success: true } or error
 */

import {
  DynamoDBClient,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { KMSClient, EncryptCommand } from '@aws-sdk/client-kms';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

interface SaveApiKeyArgs {
  apiKey: string;
}

interface SaveApiKeyResult {
  success: boolean;
  error?: string;
}

const FIDELIZE_BASE_URL = 'https://api.fidelize.pt/api/v2';

const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const ddb = new DynamoDBClient({ region });
const kms = new KMSClient({ region });

const INTEGRATION_TABLE = process.env.FIDELIZE_INTEGRATION_TABLE_NAME || '';
const KMS_KEY_ID = process.env.KMS_KEY_ID || '';

export const handler = async (
  event: AppSyncResolverEvent<SaveApiKeyArgs>
): Promise<SaveApiKeyResult> => {
  const { apiKey } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;

  if (!userId) {
    return { success: false, error: 'User identity not found' };
  }

  if (!apiKey?.trim()) {
    return { success: false, error: 'API key is required' };
  }

  const trimmedKey = apiKey.trim();
  console.log(`[fidelizeSaveApiKey] User ${userId} saving API key`);

  // 1. Validate the API key by calling Fidelize API
  try {
    const response = await fetch(`${FIDELIZE_BASE_URL}/templates`, {
      method: 'GET',
      headers: {
        'X-API-Key': trimmedKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const statusCode = response.status;
      if (statusCode === 401 || statusCode === 403) {
        return { success: false, error: 'Invalid API key. Please check your Fidelize API key.' };
      }
      return { success: false, error: `Fidelize API returned status ${statusCode}` };
    }

    const body = await response.json();
    if (body.code !== 200) {
      return { success: false, error: `Fidelize API error: code ${body.code}` };
    }

    console.log(`[fidelizeSaveApiKey] API key validated successfully. Templates found: ${body.data?.length || 0}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fidelizeSaveApiKey] Validation failed:', message);
    return { success: false, error: `Failed to validate API key: ${message}` };
  }

  // 2. Encrypt the API key with KMS
  let encryptedKey: string;
  try {
    const encryptResult = await kms.send(
      new EncryptCommand({
        KeyId: KMS_KEY_ID,
        Plaintext: Buffer.from(trimmedKey, 'utf-8'),
      })
    );

    if (!encryptResult.CiphertextBlob) {
      return { success: false, error: 'KMS encryption returned empty ciphertext' };
    }

    encryptedKey = Buffer.from(encryptResult.CiphertextBlob).toString('base64');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fidelizeSaveApiKey] KMS encryption failed:', message);
    return { success: false, error: 'Failed to encrypt API key' };
  }

  // 3. Upsert in DynamoDB (UpdateItem preserves createdAt and lastSyncAt on re-save)
  const now = new Date().toISOString();
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: INTEGRATION_TABLE,
        Key: marshall({ id: userId }),
        UpdateExpression:
          'SET apiKey = :key, isActive = :active, updatedAt = :ua, #owner = :owner, #tn = :tn, createdAt = if_not_exists(createdAt, :ua)',
        ExpressionAttributeNames: {
          '#owner': 'owner',
          '#tn': '__typename',
        },
        ExpressionAttributeValues: marshall({
          ':key': encryptedKey,
          ':active': true,
          ':ua': now,
          ':owner': `${userId}::${userId}`,
          ':tn': 'FidelizeIntegration',
        }),
      })
    );

    console.log(`[fidelizeSaveApiKey] Integration saved for user ${userId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fidelizeSaveApiKey] DynamoDB write failed:', message);
    return { success: false, error: 'Failed to save integration' };
  }
};
