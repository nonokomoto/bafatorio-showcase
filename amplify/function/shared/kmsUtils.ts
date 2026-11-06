import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
const KMS_KEY_ID = process.env.KMS_KEY_ID!;

export async function encryptToken(plaintext: string): Promise<string> {
  const command = new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: Buffer.from(plaintext),
  });
  const response = await kms.send(command);
  if (!response.CiphertextBlob) throw new Error('KMS encryption failed');
  return Buffer.from(response.CiphertextBlob).toString('base64');
}

export async function decryptToken(ciphertext: string): Promise<string> {
  const command = new DecryptCommand({
    KeyId: KMS_KEY_ID,
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  });
  const response = await kms.send(command);
  if (!response.Plaintext) throw new Error('KMS decryption failed');
  return Buffer.from(response.Plaintext).toString('utf-8');
}
