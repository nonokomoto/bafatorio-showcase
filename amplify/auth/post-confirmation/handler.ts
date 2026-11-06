import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { buildWelcomeEmail } from './emailContent';

const cognitoClient = new CognitoIdentityProviderClient();
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'eu-west-1' });

/**
 * Send the branded welcome email directly via SES (no SQS queue to avoid circular dependency)
 */
async function sendWelcomeEmailDirect(email: string, name: string, locale: string | undefined): Promise<void> {
  const { subject, html } = buildWelcomeEmail({ locale, name });

  const command = new SendEmailCommand({
    Source: process.env.BAFATORIO_APP_DEFAULT_FROM_EMAIL || 'noreply@bafatorio.com',
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      },
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html
        }
      }
    }
  });

  await sesClient.send(command);
}

// add user to group + send welcome email
export const handler: PostConfirmationTriggerHandler = async (event) => {
  // 1. Add user to the USER group
  const command = new AdminAddUserToGroupCommand({
    GroupName: process.env.GROUP_NAME,
    Username: event.userName,
    UserPoolId: event.userPoolId
  });
  const response = await cognitoClient.send(command);
  console.log('User added to group, requestId:', response.$metadata.requestId);

  // 2. Send the branded welcome email directly via SES (no SQS queue)
  try {
    const userAttributes = event.request.userAttributes;
    const email = userAttributes.email;
    const name = userAttributes.name || email.split('@')[0];
    const locale = userAttributes['custom:signup_language'];

    await sendWelcomeEmailDirect(email, name, locale);
    console.log('Welcome email sent to', email, 'in', locale || 'default locale');
  } catch (err) {
    console.error('Error sending welcome email:', err);
    // Don't throw - we don't want to fail user registration if email fails
  }

  return event;
};