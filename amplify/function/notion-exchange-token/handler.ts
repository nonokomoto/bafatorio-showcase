import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { encryptToken } from '../shared/kmsUtils';

const dynamodb = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
const TABLE_NAME = process.env.NOTION_INTEGRATION_TABLE_NAME!;
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET!;

const ALLOWED_REDIRECT_URIS = [
  'https://bafatorio.com/app/notion/callback',
  'https://www.bafatorio.com/app/notion/callback',
  'https://app.bafatorio.com/app/notion/callback',
  'https://development.dEXAMPLEAPPID.amplifyapp.com/app/notion/callback',
  'http://localhost:5173/app/notion/callback',
  'http://localhost:5174/app/notion/callback',
];

function normalizeUserId(id: string | undefined): string {
  if (!id) throw new Error('Missing userId');
  return id.split('::')[0];
}

export const handler = async (event: any) => {
  try {
    const userId = normalizeUserId(event.identity?.sub);
    const { code, redirectUri } = event.arguments;

    if (!code || !redirectUri) {
      return { success: false, error: 'Missing code or redirectUri' };
    }

    if (!ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
      return { success: false, error: 'Invalid redirect URI' };
    }

    const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Notion token exchange failed:', tokenResponse.status);
      return { success: false, error: 'Token exchange failed' };
    }

    const tokenData = await tokenResponse.json() as any;
    const { access_token, workspace_id, workspace_name, bot_id } = tokenData;

    if (!access_token || !workspace_id) {
      return { success: false, error: 'Invalid token response' };
    }

    const existing = await dynamodb.send(new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { id: { S: userId } },
    }));

    if (existing.Item) {
      const existingRecord = unmarshall(existing.Item);
      if (existingRecord.workspaceId && existingRecord.workspaceId !== workspace_id) {
        return {
          success: false,
          error: 'Already connected to a different workspace. Disconnect first.',
        };
      }
    }

    const encryptedAccessToken = await encryptToken(access_token);
    const now = new Date().toISOString();

    const item: Record<string, any> = {
      __typename: 'NotionIntegration',
      id: userId,
      accessToken: encryptedAccessToken,
      workspaceId: workspace_id,
      workspaceName: workspace_name || null,
      botId: bot_id,
      owner: `${userId}::${userId}`,
      createdAt: now,
      updatedAt: now,
    };

    if (tokenData.refresh_token) {
      item.refreshToken = await encryptToken(tokenData.refresh_token);
    }

    await dynamodb.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(item, { removeUndefinedValues: true }),
    }));

    return { success: true, workspaceName: workspace_name || null };
  } catch (error: any) {
    console.error('Exchange token error:', error.message);
    return { success: false, error: 'Internal error during token exchange' };
  }
};
