import { marshall } from '@aws-sdk/util-dynamodb';

const mockSend = jest.fn();
const mockSesSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  PutItemCommand: jest.fn((input) => ({ input, __type: 'PutItem' })),
  UpdateItemCommand: jest.fn((input) => ({ input, __type: 'UpdateItem' })),
}));

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn(() => ({ send: (...args: unknown[]) => mockSesSend(...args) })),
  SendEmailCommand: jest.fn((input) => ({ input, __type: 'SendEmail' })),
}));

import { handler } from './handler';

const validBody = {
  name: '  Maria Santos  ',
  email: '  DANIELA.REIS@EXAMPLE.COM ',
  organization: ' Human Leaders ',
  locale: 'pt-PT',
  consent: true,
  privacyVersion: '2026-07-16',
  website: '',
};

const makeEvent = (body: unknown = validBody) => ({
  version: '2.0',
  routeKey: 'POST /v1/leads',
  rawPath: '/v1/leads',
  headers: { 'content-type': 'application/json' },
  requestContext: {
    http: {
      method: 'POST',
      path: '/v1/leads',
      sourceIp: '203.0.113.10',
    },
  },
  body: JSON.stringify(body),
  isBase64Encoded: false,
});

beforeEach(() => {
  mockSend.mockReset();
  mockSesSend.mockReset();
  mockSesSend.mockResolvedValue({ MessageId: 'ses-msg-1' });
  process.env.EARLY_ACCESS_LEADS_TABLE_NAME = 'early-access-leads-test';
  process.env.EARLY_ACCESS_CAMPAIGN_ID = 'human-leaders-cabo-verde-2026';
  process.env.EARLY_ACCESS_SOURCE = 'human-leaders-qr';
  process.env.EARLY_ACCESS_PRIVACY_VERSION = '2026-07-16';
  process.env.EARLY_ACCESS_RATE_LIMIT_SECRET = 'test-secret-with-enough-entropy';
  process.env.EARLY_ACCESS_RATE_LIMIT_MAX = '5';
  process.env.EARLY_ACCESS_RATE_LIMIT_WINDOW_SECONDS = '600';
  process.env.EARLY_ACCESS_FROM_EMAIL = 'support@bafatorio.com';
  process.env.EARLY_ACCESS_REPLY_TO_EMAIL = 'support@bafatorio.com';
  process.env.EARLY_ACCESS_FROM_NAME = 'Equipa Bafatório';
});

describe('POST /v1/leads', () => {
  test('accepts a valid submission and stores a normalized lead', async () => {
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockResolvedValueOnce({});

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });

    const putCall = mockSend.mock.calls.find((call) => call[0]?.__type === 'PutItem');
    expect(putCall?.[0]?.input).toEqual(expect.objectContaining({
      TableName: 'early-access-leads-test',
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      Item: expect.objectContaining({
        pk: { S: 'CAMPAIGN#human-leaders-cabo-verde-2026' },
        name: { S: 'Maria Santos' },
        email: { S: 'daniela.reis@example.com' },
        organization: { S: 'Human Leaders' },
        locale: { S: 'pt-PT' },
        source: { S: 'human-leaders-qr' },
        privacyVersion: { S: '2026-07-16' },
      }),
    }));
    expect(putCall?.[0]?.input.Item.sk.S).toMatch(/^LEAD#[a-f0-9]{64}$/);
  });

  test('stores the client-supplied source instead of the configured default', async () => {
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockResolvedValueOnce({});

    const response = await handler(makeEvent({
      ...validBody,
      source: 'linkedin-post',
    }) as never);

    expect(response.statusCode).toBe(202);
    const putCall = mockSend.mock.calls.find((call) => call[0]?.__type === 'PutItem');
    expect(putCall?.[0]?.input.Item.source).toEqual({ S: 'linkedin-post' });
  });

  test('falls back to the configured source when the client omits it', async () => {
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockResolvedValueOnce({});

    await handler(makeEvent({ ...validBody, source: '' }) as never);

    const putCall = mockSend.mock.calls.find((call) => call[0]?.__type === 'PutItem');
    expect(putCall?.[0]?.input.Item.source).toEqual({ S: 'human-leaders-qr' });
  });

  test('rejects a source outside the allowed slug format', async () => {
    const response = await handler(makeEvent({
      ...validBody,
      source: 'Not A Slug!',
    }) as never);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      accepted: false,
      code: 'INVALID_REQUEST',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('rejects a privacy version that is not the server-configured version', async () => {
    const response = await handler(makeEvent({
      ...validBody,
      privacyVersion: '2026-07-15',
    }) as never);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      accepted: false,
      code: 'INVALID_REQUEST',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('rejects invalid lead data before consuming DynamoDB capacity', async () => {
    const response = await handler(makeEvent({
      ...validBody,
      name: ' ',
      email: 'not-an-email',
      consent: false,
    }) as never);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      accepted: false,
      code: 'INVALID_REQUEST',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('silently accepts honeypot submissions without storing them', async () => {
    const response = await handler(makeEvent({
      ...validBody,
      website: 'https://spam.example',
    }) as never);

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('returns the same success response when the campaign already has that email', async () => {
    const duplicate = Object.assign(new Error('duplicate'), {
      name: 'ConditionalCheckFailedException',
    });
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockRejectedValueOnce(duplicate);

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });
  });

  test('rate limits repeated submissions without persisting the source IP', async () => {
    mockSend.mockResolvedValueOnce({
      Attributes: marshall({ submissionCount: 6 }),
    });

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(429);
    expect(JSON.parse(response.body)).toEqual({
      accepted: false,
      code: 'RATE_LIMITED',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);

    const rateCall = mockSend.mock.calls[0][0].input;
    expect(rateCall.Key.pk.S).toMatch(/^RATE#[a-f0-9]{64}$/);
    expect(rateCall.Key.pk.S).not.toContain('203.0.113.10');
    expect(rateCall.ExpressionAttributeValues[':expiresAt'].N).toBeDefined();
  });

  test('returns a controlled validation response for malformed JSON', async () => {
    const response = await handler({
      ...makeEvent(),
      body: '{',
    } as never);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      accepted: false,
      code: 'INVALID_REQUEST',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('returns a generic error without logging lead data when persistence fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockRejectedValueOnce(new Error('database unavailable for daniela.reis@example.com'));

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      accepted: false,
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('daniela.reis@example.com');
    consoleError.mockRestore();
  });

  test('sends a localized welcome email to a newly stored lead', async () => {
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockResolvedValueOnce({});

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(202);
    expect(mockSesSend).toHaveBeenCalledTimes(1);
    const sesInput = mockSesSend.mock.calls[0][0].input;
    const encodedName = `=?UTF-8?B?${Buffer.from('Equipa Bafatório', 'utf8').toString('base64')}?=`;
    expect(sesInput.FromEmailAddress).toBe(`${encodedName} <support@bafatorio.com>`);
    expect(sesInput.ReplyToAddresses).toEqual(['support@bafatorio.com']);
    expect(sesInput.Destination.ToAddresses).toEqual(['daniela.reis@example.com']);
    expect(sesInput.Content.Simple.Subject.Data).toBe(
      'Estás na lista de acesso antecipado ao Bafatório'
    );
    expect(sesInput.Content.Simple.Body.Html.Data).toContain('Maria Santos');
  });

  test('does not send a welcome email when the lead already exists', async () => {
    const duplicate = Object.assign(new Error('duplicate'), {
      name: 'ConditionalCheckFailedException',
    });
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockRejectedValueOnce(duplicate);

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(202);
    expect(mockSesSend).not.toHaveBeenCalled();
  });

  test('still accepts the lead when the welcome email fails to send', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSend
      .mockResolvedValueOnce({ Attributes: marshall({ submissionCount: 1 }) })
      .mockResolvedValueOnce({});
    mockSesSend.mockRejectedValueOnce(new Error('SES throttled'));

    const response = await handler(makeEvent() as never);

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('daniela.reis@example.com');
    consoleError.mockRestore();
  });
});
