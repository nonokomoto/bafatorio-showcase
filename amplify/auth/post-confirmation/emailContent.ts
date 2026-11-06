export interface WelcomeEmailInput {
  locale: string | undefined;
  name: string;
}

export interface WelcomeEmailContent {
  subject: string;
  html: string;
}

type Copy = {
  subject: (name: string) => string;
  greeting: (name: string) => string;
  intro: string;
  next: string;
  signature: string;
  footer: string;
};

// Same official Bafatório logo and brand card used by the other transactional
// emails (custom-message/emailContent.ts, save-early-access-lead/welcomeEmail.ts)
// — email clients (Gmail/Outlook) do not render inline SVG.
const LOGO_URL = 'https://bafatorio-public-assets.s3.eu-west-1.amazonaws.com/brand/bafatorio.png';
const BRAND = '#2d57f4';
const FALLBACK_LOCALE = 'pt-PT';

const COPY: Record<string, Copy> = {
  'pt-PT': {
    subject: (name) => `Bem-vindo ao Bafatório, ${name}!`,
    greeting: (name) => `Olá ${name},`,
    intro: 'A tua conta foi criada com sucesso.',
    next: 'Já podes começar a organizar os teus eventos de forma simples e eficiente.',
    signature: 'Equipa Bafatório',
    footer: 'Bafatório · Mensagem automática. Não responder.',
  },
  'en-US': {
    subject: (name) => `Welcome to Bafatório, ${name}!`,
    greeting: (name) => `Hi ${name},`,
    intro: 'Your account has been created successfully.',
    next: 'You can now start organizing your events simply and efficiently.',
    signature: 'The Bafatório team',
    footer: 'Bafatório · Automated message. Do not reply.',
  },
  'fr-FR': {
    subject: (name) => `Bienvenue sur Bafatório, ${name}!`,
    greeting: (name) => `Bonjour ${name},`,
    intro: 'Votre compte a été créé avec succès.',
    next: 'Vous pouvez maintenant commencer à organiser vos événements simplement et efficacement.',
    signature: "L'équipe Bafatório",
    footer: 'Bafatório · Message automatique. Ne pas répondre.',
  },
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildWelcomeEmail(input: WelcomeEmailInput): WelcomeEmailContent {
  const locale = (input.locale && COPY[input.locale]) ? input.locale : FALLBACK_LOCALE;
  const copy = COPY[locale];

  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const ink = '#1a1f33';
  const muted = '#5b6478';

  // Table-based, inline-styled layout for email-client compatibility — matches
  // the verification/reset-password brand card (custom-message/emailContent.ts).
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
                <p style="margin:0 0 15px 0;">${escapeHtml(copy.greeting(input.name))}</p>
                <p style="margin:0 0 15px 0;">${copy.intro}</p>
                <p style="margin:0 0 4px 0;">${copy.next}</p>
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

  return { subject: copy.subject(input.name), html };
}
