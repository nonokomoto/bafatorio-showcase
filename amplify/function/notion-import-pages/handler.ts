import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getNotionClient, type NotionClientResult } from '../shared/notionClient';
import { randomUUID } from 'crypto';
import { ensureEventWritable, ensureIntegrationsAllowed, billingGateMessage } from '../shared/entitlementGate';

const dynamodb = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
const s3 = new S3Client({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME!;
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME!;
const DOCUMENT_TABLE = process.env.NOTION_DOCUMENT_TABLE_NAME!;
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const S3_BUCKET = process.env.BAFATORIO_APP_S3_BUCKET_NAME!;

const MAX_PAGES = 5;
const TIMEOUT_MS = 25_000;
const DELAY_BETWEEN_PAGES = 2_000;

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
      ':eid': eventId,
      ':uid': userId,
      ':accepted': 'ACCEPTED',
      ':co': 'CO_MANAGER',
      ':logistics': 'STAFF_LOGISTICS',
    }),
  }));

  return (collabResult.Items?.length || 0) > 0;
}

function extractTitle(page: any): string {
  const props = page.properties || {};
  for (const prop of Object.values(props) as any[]) {
    if (prop.type === 'title') {
      return prop.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

async function persistImage(
  imageUrl: string,
  eventId: string,
  folderId: string,
): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const imageId = randomUUID().slice(0, 8);
    const s3Key = `event-documents/${eventId}/${folderId}/images/${imageId}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    }));

    return s3Key;
  } catch {
    return imageUrl;
  }
}

async function importSinglePage(
  client: NotionClientResult['client'],
  pageId: string,
  eventId: string,
  folderId: string,
  userId: string,
): Promise<{ success: boolean; doc?: any; error?: string }> {
  try {
    const [page, mdResponse] = await Promise.all([
      client.pages.retrieve({ page_id: pageId }) as Promise<any>,
      (client.pages as any).retrieveMarkdown({ page_id: pageId }),
    ]);

    const title = extractTitle(page);
    const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ]/g, '').slice(0, 80);
    const uuid8 = randomUUID().slice(0, 8);

    let markdown: string = mdResponse.markdown || mdResponse.page_markdown || '';

    // Clean Notion's enhanced markdown: convert proprietary tags to plain markdown
    markdown = markdown
      // Callouts → blockquotes (extract inner text)
      .replace(/<callout[^>]*>([\s\S]*?)<\/callout>/g, (_, inner) => {
        const text = inner.replace(/<[^>]+>/g, '').trim();
        return text ? `> ${text.replace(/\n/g, '\n> ')}` : '';
      })
      // Unknown/embed blocks → link if URL present, otherwise remove
      .replace(/<unknown[^>]*url="([^"]+)"[^>]*(?:alt[s]?="([^"]*)")?[^>]*\/?>/g, (_, url, alt) => {
        return `[${alt || 'Embedded content'}](${url})`;
      })
      .replace(/<unknown[^>]*\/?>/g, '')
      // Basic HTML cleanup
      .replace(/<empty-block\s*\/?>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/?div[^>]*>/g, '\n')
      .replace(/<\/?span[^>]*>/g, '')
      // Catch any remaining HTML tags
      .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n');

    // Prepend page title as H1 if not already present
    if (!markdown.startsWith('# ')) {
      markdown = `# ${title}\n\n${markdown}`;
    }

    const imageRegex = /!\[([^\]]*)\]\((https:\/\/(?:prod-files-secure|s3)\.s3[^)]+)\)/g;
    const imageMatches = [...markdown.matchAll(imageRegex)];
    for (const match of imageMatches) {
      const [fullMatch, alt, url] = match;
      const s3Key = await persistImage(url, eventId, folderId);
      if (s3Key !== url) {
        markdown = markdown.replace(fullMatch, `![${alt}](${s3Key})`);
      }
    }

    // Check if document already exists (re-import/sync mode)
    const existingQuery = await dynamodb.send(new QueryCommand({
      TableName: DOCUMENT_TABLE,
      IndexName: 'byNotionPageId',
      KeyConditionExpression: 'notionPageId = :pid',
      FilterExpression: 'folderId = :fid',
      ExpressionAttributeValues: marshall({ ':pid': pageId, ':fid': folderId }),
    }));
    const existingDoc = existingQuery.Items?.[0] ? unmarshall(existingQuery.Items[0]) : null;

    const s3Key = existingDoc?.s3Key || `event-documents/${eventId}/${folderId}/${safeTitle}-${uuid8}.md`;
    const docId = existingDoc?.id || randomUUID();

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: markdown,
      ContentType: 'text/markdown; charset=utf-8',
    }));

    const now = new Date().toISOString();
    const docItem = {
      __typename: 'NotionDocument',
      id: docId,
      eventId,
      folderId,
      notionPageId: pageId,
      notionPageUrl: page.url || null,
      title,
      s3Key,
      notionLastEditedAt: page.last_edited_time || null,
      importedAt: now,
      owner: existingDoc?.owner || `${userId}::${userId}`,
      createdAt: existingDoc?.createdAt || now,
      updatedAt: now,
    };

    try {
      await dynamodb.send(new PutItemCommand({
        TableName: DOCUMENT_TABLE,
        Item: marshall(docItem, { removeUndefinedValues: true }),
      }));
    } catch (dbError: any) {
      console.error('DynamoDB write failed, rolling back S3:', dbError.message);
      if (!existingDoc) {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
      }
      return { success: false, error: `DB write failed for "${title}"` };
    }

    return {
      success: true,
      doc: { id: docId, title, notionPageId: pageId },
    };
  } catch (error: any) {
    console.error(`Import failed for page ${pageId}:`, error.message);
    return { success: false, error: error.message };
  }
}

export const handler = async (event: any) => {
  const startTime = Date.now();

  try {
    const userId = normalizeUserId(event.identity?.sub);
    const { eventId, pageIds = [], folderId } = event.arguments;

    if (!eventId) return { success: false, imported: 0, failed: 0, documents: [], errors: ['Missing eventId'] };

    const hasAccess = await verifyAccess(userId, eventId);
    if (!hasAccess) {
      return { success: false, imported: 0, failed: 0, documents: [], errors: ['Unauthorized'] };
    }

    // Gate de billing (§4/§2): janela de escrita + integrações são do nível pago.
    try {
      const billingGate = await ensureEventWritable({
        eventTableName: EVENT_TABLE,
        subscriptionTableName: USER_SUBSCRIPTION_TABLE,
        eventId,
      });
      ensureIntegrationsAllowed(billingGate.entitlements);
    } catch (gateError) {
      return { success: false, imported: 0, failed: 0, documents: [], errors: [billingGateMessage(gateError)] };
    }

    const clientResult = await getNotionClient(userId);
    if (!clientResult) {
      return { success: false, imported: 0, failed: 0, documents: [], errors: ['not_connected'] };
    }

    const { client } = clientResult;
    const targetFolderId = folderId || 'notion-imports';
    const pagesToImport = pageIds.slice(0, MAX_PAGES);

    const documents: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < pagesToImport.length; i++) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        errors.push(`Timeout: only imported ${documents.length}/${pagesToImport.length} pages`);
        break;
      }

      if (i > 0) await new Promise(r => setTimeout(r, DELAY_BETWEEN_PAGES));

      const result = await importSinglePage(client, pagesToImport[i], eventId, targetFolderId, userId);

      if (result.success && result.doc) {
        documents.push(result.doc);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    return {
      success: errors.length === 0,
      imported: documents.length,
      failed: pagesToImport.length - documents.length,
      documents,
      errors,
    };
  } catch (error: any) {
    console.error('Import handler error:', error.message);
    return { success: false, imported: 0, failed: 0, documents: [], errors: ['Import failed'] };
  }
};
