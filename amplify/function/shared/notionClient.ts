import { Client } from '@notionhq/client';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { decryptToken } from './kmsUtils';

const dynamodb = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
const TABLE_NAME = process.env.NOTION_INTEGRATION_TABLE_NAME!;

interface NotionIntegrationRecord {
  id: string;
  accessToken: string;
  workspaceId: string;
  workspaceName?: string;
  botId: string;
}

export interface NotionClientResult {
  client: Client;
  integration: NotionIntegrationRecord;
}

export async function getNotionClient(userId: string): Promise<NotionClientResult | null> {
  const getResult = await dynamodb.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { id: { S: userId } },
  }));

  if (!getResult.Item) return null;

  const integration = unmarshall(getResult.Item) as NotionIntegrationRecord;
  const accessToken = await decryptToken(integration.accessToken);
  const client = new Client({ auth: accessToken });

  try {
    await client.users.me({});
    return { client, integration };
  } catch (error: any) {
    if (error?.status === 401) {
      await deleteIntegration(userId);
      return null;
    }
    throw error;
  }
}

export async function deleteIntegration(userId: string): Promise<void> {
  await dynamodb.send(new DeleteItemCommand({
    TableName: TABLE_NAME,
    Key: { id: { S: userId } },
  }));
}
