import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { customMessage } from './custom-message/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    'custom:signup_language': {
      dataType: 'String',
      mutable: true,
    },
  },
  groups: ['USER', 'ADMIN'],
  // Sends the sign-up/reset-password emails via SES (noreply@bafatorio.com, already
  // verified) instead of the Cognito default mailer — required for the customMessage
  // trigger below to be allowed to override emailSubject/emailMessage per triggerSource.
  senders: {
    email: {
      fromEmail: 'noreply@bafatorio.com',
      fromName: 'Bafatório',
    },
  },
  triggers: {
    postConfirmation,
    customMessage,
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
  ],
});