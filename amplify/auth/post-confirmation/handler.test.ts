const mockCognitoSend = jest.fn();
const mockSesSend = jest.fn();

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({ send: (...args: unknown[]) => mockCognitoSend(...args) })),
  AdminAddUserToGroupCommand: jest.fn((input) => ({ input, __type: 'AdminAddUserToGroup' })),
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(() => ({ send: (...args: unknown[]) => mockSesSend(...args) })),
  SendEmailCommand: jest.fn((input) => ({ input, __type: 'SendEmail' })),
}));

import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

function buildEvent(overrides: Partial<PostConfirmationTriggerEvent['request']> = {}): PostConfirmationTriggerEvent {
  return {
    version: '1',
    region: 'eu-west-1',
    userPoolId: 'eu-west-1_test',
    userName: 'test-user',
    callerContext: { awsSdkVersion: 'test', clientId: 'test-client' },
    triggerSource: 'PostConfirmation_ConfirmSignUp',
    request: {
      userAttributes: { email: 'ana@example.com', name: 'Ana' },
      ...overrides,
    },
    response: {},
  } as unknown as PostConfirmationTriggerEvent;
}

beforeEach(() => {
  mockCognitoSend.mockReset().mockResolvedValue({ $metadata: { requestId: 'req-1' } });
  mockSesSend.mockReset().mockResolvedValue({});
});

describe('post-confirmation handler', () => {
  test('adds the user to the USER group', async () => {
    const event = buildEvent();

    await handler(event, {} as never, () => {});

    expect(mockCognitoSend).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ Username: 'test-user' }) })
    );
  });

  test('sends the branded welcome email (same card layout as the verification email)', async () => {
    const event = buildEvent({
      userAttributes: { email: 'ana@example.com', name: 'Ana', 'custom:signup_language': 'en-US' },
    });

    await handler(event, {} as never, () => {});

    expect(mockSesSend).toHaveBeenCalledTimes(1);
    const [sentCommand] = mockSesSend.mock.calls[0];
    expect(sentCommand.input.Destination.ToAddresses).toEqual(['ana@example.com']);
    expect(sentCommand.input.Message.Subject.Data).toBe('Welcome to Bafatório, Ana!');
    expect(sentCommand.input.Message.Body.Html.Data).toContain('brand/bafatorio.png');
    expect(sentCommand.input.Message.Body.Html.Data).toContain('border-radius:16px');
  });

  test('falls back to Portuguese and to the email prefix as name when attributes are missing', async () => {
    const event = buildEvent({ userAttributes: { email: 'joao@example.com' } });

    await handler(event, {} as never, () => {});

    const [sentCommand] = mockSesSend.mock.calls[0];
    expect(sentCommand.input.Message.Subject.Data).toBe('Bem-vindo ao Bafatório, joao!');
  });

  test('does not throw when SES fails — registration must not fail because of email delivery', async () => {
    mockSesSend.mockRejectedValue(new Error('SES down'));
    const event = buildEvent();

    await expect(handler(event, {} as never, () => {})).resolves.toEqual(event);
  });
});
