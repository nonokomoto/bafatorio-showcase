import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getNotionClient } from '../shared/notionClient';

const dynamodb = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME!;
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME!;
const DOCUMENT_TABLE = process.env.NOTION_DOCUMENT_TABLE_NAME!;

function normalizeUserId(id: string | undefined): string {
  if (!id) throw new Error('Missing userId');
  return id.split('::')[0];
}

async function verifyAccess(userId: string, eventId: string): Promise<boolean> {
  const eventResult = await dynamodb.send(new GetItemCommand({
    TableName: EVENT_TABLE,
    Key: marshall({ id: eventId }),
  }));
  if (!eventResult.Item) return false;
  const eventData = unmarshall(eventResult.Item);
  const eventOwner = (eventData.owner || '').split('::')[0];
  if (eventOwner === userId) return true;

  const collabResult = await dynamodb.send(new QueryCommand({
    TableName: COLLABORATOR_TABLE,
    IndexName: 'byEventId',
    KeyConditionExpression: 'eventId = :eid',
    FilterExpression: 'userId = :uid AND #status = :accepted AND #role IN (:co, :logistics)',
    ExpressionAttributeNames: { '#status': 'status', '#role': 'role' },
    ExpressionAttributeValues: marshall({
      ':eid': eventId, ':uid': userId,
      ':accepted': 'ACCEPTED', ':co': 'CO_MANAGER', ':logistics': 'STAFF_LOGISTICS',
    }),
  }));
  return (collabResult.Items?.length || 0) > 0;
}

export const handler = async (event: any) => {
  try {
    const userId = normalizeUserId(event.identity?.sub);
    const { eventId, folderId } = event.arguments;

    if (!eventId || !folderId) {
      return { updates: [], total: 0, outdated: 0, error: 'Missing eventId or folderId' };
    }

    const hasAccess = await verifyAccess(userId, eventId);
    if (!hasAccess) {
      return { updates: [], total: 0, outdated: 0, error: 'Unauthorized' };
    }

    const clientResult = await getNotionClient(userId);
    if (!clientResult) {
      return { updates: [], total: 0, outdated: 0, error: 'not_connected' };
    }
    const { client } = clientResult;

    const queryResult = await dynamodb.send(new QueryCommand({
      TableName: DOCUMENT_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      FilterExpression: 'folderId = :fid',
      ExpressionAttributeValues: marshall({ ':eid': eventId, ':fid': folderId }),
    }));

    const notionDocs = (queryResult.Items || []).map(item => unmarshall(item));
    if (notionDocs.length === 0) {
      return { updates: [], total: 0, outdated: 0 };
    }

    const updates: any[] = [];
    for (const doc of notionDocs) {
      if (!doc.notionPageId) continue;
      try {
        const page = await client.pages.retrieve({ page_id: doc.notionPageId }) as any;
        const notionEditedAt = page.last_edited_time;
        const storedEditedAt = doc.notionLastEditedAt;

        if (notionEditedAt && storedEditedAt && notionEditedAt !== storedEditedAt) {
          updates.push({
            id: doc.id,
            notionPageId: doc.notionPageId,
            title: doc.title,
            s3Key: doc.s3Key,
            notionLastEditedAt: notionEditedAt,
            storedLastEditedAt: storedEditedAt,
          });
        }
      } catch (err: any) {
        console.warn(`Could not check page ${doc.notionPageId}:`, err.message);
      }
    }

    return {
      updates,
      total: notionDocs.length,
      outdated: updates.length,
    };
  } catch (error: any) {
    console.error('Check updates error:', error.message);
    return { updates: [], total: 0, outdated: 0, error: 'Failed to check updates' };
  }
};
