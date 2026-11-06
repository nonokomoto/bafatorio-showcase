import type { CustomMessageTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

function buildEvent(overrides: Partial<CustomMessageTriggerEvent>): CustomMessageTriggerEvent {
  return {
    version: '1',
    region: 'eu-west-1',
    userPoolId: 'eu-west-1_test',
    userName: 'test-user',
    callerContext: { awsSdkVersion: 'test', clientId: 'test-client' },
    triggerSource: 'CustomMessage_SignUp',
    request: {
      userAttributes: { email: 'user@example.com' },
      codeParameter: '{####}',
      usernameParameter: undefined,
      clientMetadata: undefined,
    },
    response: { smsMessage: '', emailMessage: '', emailSubject: '' },
    ...overrides,
  } as CustomMessageTriggerEvent;
}

describe('custom-message handler', () => {
  test('customizes CustomMessage_SignUp using the user\'s stored signup language', async () => {
    const event = buildEvent({
      triggerSource: 'CustomMessage_SignUp',
      request: {
        userAttributes: { email: 'user@example.com', 'custom:signup_language': 'en-US' },
        codeParameter: '{####}',
        usernameParameter: undefined,
        clientMetadata: undefined,
      },
    });

    const result = await handler(event, {} as never, () => {});

    expect(result.response.emailSubject).toBe('Your Bafatório verification code');
    expect(result.response.emailMessage).toContain('{####}');
  });

  test('customizes CustomMessage_ResendCode the same way as sign-up', async () => {
    const event = buildEvent({
      triggerSource: 'CustomMessage_ResendCode',
      request: {
        userAttributes: { email: 'user@example.com', 'custom:signup_language': 'fr-FR' },
        codeParameter: '{####}',
        usernameParameter: undefined,
        clientMetadata: undefined,
      },
    });

    const result = await handler(event, {} as never, () => {});

    expect(result.response.emailSubject).toBe('Votre code de vérification Bafatório');
  });

  test('customizes CustomMessage_ForgotPassword with distinct copy', async () => {
    const event = buildEvent({
      triggerSource: 'CustomMessage_ForgotPassword',
      request: {
        userAttributes: { email: 'user@example.com', 'custom:signup_language': 'pt-PT' },
        codeParameter: '{####}',
        usernameParameter: undefined,
        clientMetadata: undefined,
      },
    });

    const result = await handler(event, {} as never, () => {});

    expect(result.response.emailSubject).toBe('Repor a password da conta Bafatório');
    expect(result.response.emailMessage).toContain('{####}');
  });

  test('falls back to Portuguese when custom:signup_language is missing', async () => {
    const event = buildEvent({
      triggerSource: 'CustomMessage_ForgotPassword',
      request: {
        userAttributes: { email: 'user@example.com' },
        codeParameter: '{####}',
        usernameParameter: undefined,
        clientMetadata: undefined,
      },
    });

    const result = await handler(event, {} as never, () => {});

    expect(result.response.emailSubject).toBe('Repor a password da conta Bafatório');
  });

  test('leaves other trigger sources (e.g. admin create user) untouched', async () => {
    const event = buildEvent({
      triggerSource: 'CustomMessage_AdminCreateUser',
      response: { smsMessage: '', emailMessage: '', emailSubject: '' },
    });

    const result = await handler(event, {} as never, () => {});

    expect(result.response.emailSubject).toBe('');
    expect(result.response.emailMessage).toBe('');
  });
});
