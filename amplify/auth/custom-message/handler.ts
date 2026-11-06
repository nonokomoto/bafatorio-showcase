import type { CustomMessageTriggerHandler } from 'aws-lambda';
import { buildVerificationEmail, buildResetPasswordEmail } from './emailContent';

export const handler: CustomMessageTriggerHandler = async (event) => {
  const locale = event.request.userAttributes['custom:signup_language'];
  const codePlaceholder = event.request.codeParameter;

  if (event.triggerSource === 'CustomMessage_SignUp' || event.triggerSource === 'CustomMessage_ResendCode') {
    const { subject, html } = buildVerificationEmail({ locale, codePlaceholder });
    event.response.emailSubject = subject;
    event.response.emailMessage = html;
  }

  if (event.triggerSource === 'CustomMessage_ForgotPassword') {
    const { subject, html } = buildResetPasswordEmail({ locale, codePlaceholder });
    event.response.emailSubject = subject;
    event.response.emailMessage = html;
  }

  return event;
};
