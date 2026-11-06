import { createHash, createHmac } from 'node:crypto';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { marshall } from '@aws-sdk/util-dynamodb';
import { buildWelcomeEmail } from './welcomeEmail';

const dynamodb = new DynamoDBClient({});
const ses = new SESv2Client({});

type LeadPayload = {
  name: string;
  email: string;
  organization?: string;
  locale: string;
  consent: boolean;
  privacyVersion: string;
  website?: string;
  source?: string;
};

const ALLOWED_LOCALES = new Set(['pt-PT', 'en-US', 'fr-FR']);
const ALLOWED_FIELDS = new Set([
  'name',
  'email',
  'organization',
  'locale',
  'consent',
  'privacyVersion',
  'website',
  'source',
]);

// Campaign attribution comes from a URL parameter, so it is untrusted text
// landing in a table we export later — keep it to a bounded slug.
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function parseLeadPayload(input: unknown): LeadPayload | null {
  if (!isPlainObject(input) || Object.keys(input).some((key) => !ALLOWED_FIELDS.has(key))) {
    return null;
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const organization = typeof input.organization === 'string'
    ? input.organization.trim()
    : undefined;
  const website = typeof input.website === 'string' ? input.website.trim() : undefined;
  // An empty value means "no attribution captured" — fall back to the env default.
  const source = typeof input.source === 'string' && input.source.trim()
    ? input.source.trim()
    : undefined;

  if (
    (source !== undefined && !SOURCE_PATTERN.test(source))
    ||
    name.length < 2
    || name.length > 100
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || (organization !== undefined && organization.length > 120)
    || typeof input.locale !== 'string'
    || !ALLOWED_LOCALES.has(input.locale)
    || input.consent !== true
    || typeof input.privacyVersion !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.privacyVersion)
    || (website !== undefined && website.length > 200)
  ) {
    return null;
  }

  return {
    name,
    email,
    organization,
    locale: input.locale,
    consent: true,
    privacyVersion: input.privacyVersion,
    website,
    source,
  };
}

const response = (
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

// RFC 2047 encoded-word for non-ASCII From display names — SES does not encode
// them for us, and a raw accented name in the header can be dropped or garbled.
const encodeEmailDisplayName = (name: string): string =>
  /^[\x20-\x7E]*$/.test(name)
    ? name
    : `=?UTF-8?B?${Buffer.from(name, 'utf8').toString('base64')}?=`;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

function parseRequestBody(event: APIGatewayProxyEventV2): unknown {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : event.body ?? '';

  if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > 8_192) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

async function consumeRateLimit(sourceIp: string, now: Date): Promise<boolean> {
  const tableName = requiredEnv('EARLY_ACCESS_LEADS_TABLE_NAME');
  const secret = requiredEnv('EARLY_ACCESS_RATE_LIMIT_SECRET');
  const maxSubmissions = Number(process.env.EARLY_ACCESS_RATE_LIMIT_MAX ?? '5');
  const windowSeconds = Number(process.env.EARLY_ACCESS_RATE_LIMIT_WINDOW_SECONDS ?? '600');
  const epochSeconds = Math.floor(now.getTime() / 1000);
  const windowStart = Math.floor(epochSeconds / windowSeconds) * windowSeconds;
  const ipHash = createHmac('sha256', secret).update(sourceIp).digest('hex');

  const result = await dynamodb.send(new UpdateItemCommand({
    TableName: tableName,
    Key: marshall({
      pk: `RATE#${ipHash}`,
      sk: `WINDOW#${windowStart}`,
    }),
    UpdateExpression:
      'SET expiresAt = if_not_exists(expiresAt, :expiresAt), entityType = if_not_exists(entityType, :entityType) ADD submissionCount :one',
    ExpressionAttributeValues: marshall({
      ':expiresAt': epochSeconds + windowSeconds * 2,
      ':entityType': 'RATE_LIMIT',
      ':one': 1,
    }),
    ReturnValues: 'ALL_NEW',
  }));

  const count = Number(result.Attributes?.submissionCount?.N ?? '0');
  return count <= maxSubmissions;
}

async function handleRequest(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const payload = parseLeadPayload(parseRequestBody(event));
  if (!payload) {
    return response(400, { accepted: false, code: 'INVALID_REQUEST' });
  }

  const privacyVersion = requiredEnv('EARLY_ACCESS_PRIVACY_VERSION');
  if (payload.privacyVersion !== privacyVersion) {
    return response(400, { accepted: false, code: 'INVALID_REQUEST' });
  }

  if (payload.website) {
    return response(202, { accepted: true });
  }

  const now = new Date();
  const allowed = await consumeRateLimit(
    event.requestContext.http.sourceIp || 'unknown',
    now
  );

  if (!allowed) {
    return response(429, { accepted: false, code: 'RATE_LIMITED' });
  }

  const tableName = requiredEnv('EARLY_ACCESS_LEADS_TABLE_NAME');
  const campaignId = requiredEnv('EARLY_ACCESS_CAMPAIGN_ID');
  const source = payload.source ?? requiredEnv('EARLY_ACCESS_SOURCE');
  const email = normalizeEmail(payload.email);
  const emailHash = sha256(email);
  const timestamp = now.toISOString();

  let inserted = false;
  try {
    await dynamodb.send(new PutItemCommand({
      TableName: tableName,
      Item: marshall({
        pk: `CAMPAIGN#${campaignId}`,
        sk: `LEAD#${emailHash}`,
        entityType: 'EARLY_ACCESS_LEAD',
        campaignId,
        emailHash,
        name: payload.name,
        email,
        organization: payload.organization || undefined,
        locale: payload.locale,
        source,
        consentAt: timestamp,
        privacyVersion,
        createdAt: timestamp,
        updatedAt: timestamp,
      }, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    }));
    inserted = true;
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'ConditionalCheckFailedException') {
      throw error;
    }
  }

  // Best-effort welcome email — only on first insert (never on duplicates), and
  // a send failure must not fail the capture: the lead is already persisted.
  if (inserted) {
    await sendWelcomeEmail(payload, email);
  }

  return response(202, { accepted: true });
}

async function sendWelcomeEmail(payload: LeadPayload, email: string): Promise<void> {
  const fromEmail = process.env.EARLY_ACCESS_FROM_EMAIL;
  if (!fromEmail) return;

  const fromName = process.env.EARLY_ACCESS_FROM_NAME;
  const source = fromName
    ? `${encodeEmailDisplayName(fromName)} <${fromEmail}>`
    : fromEmail;
  const replyTo = process.env.EARLY_ACCESS_REPLY_TO_EMAIL;
  const content = buildWelcomeEmail({ locale: payload.locale, name: payload.name });

  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: source,
      Destination: { ToAddresses: [email] },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: content.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: content.html, Charset: 'UTF-8' },
            Text: { Data: content.text, Charset: 'UTF-8' },
          },
        },
      },
    }));
  } catch (error) {
    console.error('Early access welcome email failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    return await handleRequest(event);
  } catch (error) {
    console.error('Early access lead request failed', {
      requestId: event.requestContext?.requestId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return response(500, { accepted: false, code: 'INTERNAL_ERROR' });
  }
}
