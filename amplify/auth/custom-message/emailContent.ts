export interface CodeEmailInput {
  locale: string | undefined;
  /** Cognito's literal placeholder (e.g. "{####}") — Cognito substitutes it with the real code after the Lambda returns. */
  codePlaceholder: string;
}

export interface CodeEmailContent {
  subject: string;
  html: string;
}

type Copy = {
  subject: string;
  greeting: string;
  intro: string;
  codeLabel: string;
  ignore: string;
  signature: string;
  footer: string;
};

// Same official Bafatório logo used by the other transactional emails (welcomeEmail.ts,
// post-confirmation) — email clients (Gmail/Outlook) do not render inline SVG.
const LOGO_URL = 'https://bafatorio-public-assets.s3.eu-west-1.amazonaws.com/brand/bafatorio.png';
const BRAND = '#2d57f4';
const FALLBACK_LOCALE = 'pt-PT';

const VERIFICATION_COPY: Record<string, Copy> = {
  'pt-PT': {
    subject: 'O teu código para confirmar a conta Bafatório',
    greeting: 'Olá,',
    intro: 'Falta só um passo para começares a usar o Bafatório. Usa o código abaixo para confirmares a tua conta.',
    codeLabel: 'Código de confirmação',
    ignore: 'Se não pediste este código, podes ignorar este email.',
    signature: 'Equipa Bafatório',
    footer: 'Bafatório · Mensagem automática. Não responder.',
  },
  'en-US': {
    subject: 'Your Bafatório verification code',
    greeting: 'Hi,',
    intro: "You're one step away from using Bafatório. Use the code below to confirm your account.",
    codeLabel: 'Confirmation code',
    ignore: "If you didn't request this code, you can ignore this email.",
    signature: 'The Bafatório team',
    footer: 'Bafatório · Automated message. Do not reply.',
  },
  'fr-FR': {
    subject: 'Votre code de vérification Bafatório',
    greeting: 'Bonjour,',
    intro: "Il ne vous reste qu'une étape avant d'utiliser Bafatório. Utilisez le code ci-dessous pour confirmer votre compte.",
    codeLabel: 'Code de confirmation',
    ignore: "Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.",
    signature: "L'équipe Bafatório",
    footer: 'Bafatório · Message automatique. Ne pas répondre.',
  },
};

const RESET_PASSWORD_COPY: Record<string, Copy> = {
  'pt-PT': {
    subject: 'Repor a password da conta Bafatório',
    greeting: 'Olá,',
    intro: 'Recebemos um pedido para repor a password da tua conta Bafatório. Usa o código abaixo para continuar.',
    codeLabel: 'Código de verificação',
    ignore: 'Se não pediste isto, ignora este email - a tua password mantém-se inalterada.',
    signature: 'Equipa Bafatório',
    footer: 'Bafatório · Mensagem automática. Não responder.',
  },
  'en-US': {
    subject: 'Reset your Bafatório password',
    greeting: 'Hi,',
    intro: 'We received a request to reset the password for your Bafatório account. Use the code below to continue.',
    codeLabel: 'Verification code',
    ignore: "If you didn't request this, you can ignore this email - your password stays unchanged.",
    signature: 'The Bafatório team',
    footer: 'Bafatório · Automated message. Do not reply.',
  },
  'fr-FR': {
    subject: 'Réinitialiser le mot de passe Bafatório',
    greeting: 'Bonjour,',
    intro: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Bafatório. Utilisez le code ci-dessous pour continuer.',
    codeLabel: 'Code de vérification',
    ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email - votre mot de passe reste inchangé.",
    signature: "L'équipe Bafatório",
    footer: 'Bafatório · Message automatique. Ne pas répondre.',
  },
};

function renderEmail(copy: Copy, locale: string, codePlaceholder: string): CodeEmailContent {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const ink = '#1a1f33';
  const muted = '#5b6478';

  // Table-based, inline-styled layout for email-client compatibility — matches
  // the welcome email (save-early-access-lead/welcomeEmail.ts) brand card.
  const html = `<!DOCTYPE html>
<html lang="${locale.slice(0, 2)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:#eef1f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef1f8">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:16px;">
            <tr>
              <td style="padding:30px 32px 0 32px;">
                <img src="${LOGO_URL}" alt="Bafatório" width="176" style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:176px;max-width:60%;" />
                <div style="border-bottom:2px solid ${BRAND};margin-top:18px;font-size:0;line-height:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 30px 32px;font-family:${font};color:${ink};font-size:15px;line-height:1.6;">
                <p style="margin:0 0 15px 0;">${copy.greeting}</p>
                <p style="margin:0 0 20px 0;">${copy.intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
                  <tr>
                    <td align="center" bgcolor="#eef1f8" style="border-radius:12px;padding:18px 12px;">
                      <p style="margin:0 0 6px 0;font-family:${font};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${muted};">${copy.codeLabel}</p>
                      <p style="margin:0;font-family:${font};font-size:28px;font-weight:700;letter-spacing:0.08em;color:${BRAND};">${codePlaceholder}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 4px 0;">${copy.ignore}</p>
                <p style="margin:20px 0 0 0;font-weight:700;">${copy.signature}</p>
                <p style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #e7eaf3;font-size:11.5px;color:${muted};">${copy.footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: copy.subject, html };
}

export function buildVerificationEmail(input: CodeEmailInput): CodeEmailContent {
  const locale = (input.locale && VERIFICATION_COPY[input.locale]) ? input.locale : FALLBACK_LOCALE;
  return renderEmail(VERIFICATION_COPY[locale], locale, input.codePlaceholder);
}

export function buildResetPasswordEmail(input: CodeEmailInput): CodeEmailContent {
  const locale = (input.locale && RESET_PASSWORD_COPY[input.locale]) ? input.locale : FALLBACK_LOCALE;
  return renderEmail(RESET_PASSWORD_COPY[locale], locale, input.codePlaceholder);
}
