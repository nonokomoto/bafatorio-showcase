export interface WelcomeEmailInput {
  locale: string;
  name: string;
}

export interface WelcomeEmailContent {
  subject: string;
  html: string;
  text: string;
}

type Copy = {
  subject: string;
  greeting: (name: string) => string;
  intro: string;
  next: string;
  stepNow: string;
  stepLater: string;
  signoff: string;
  signature: string;
  footer: string;
};

// Official Bafatório logo (brand/bafatorio.svg rasterised to PNG). Hosted on the
// public brand bucket — email clients (Gmail/Outlook) do not render inline SVG.
const LOGO_URL = 'https://bafatorio-public-assets.s3.eu-west-1.amazonaws.com/brand/bafatorio.png';
const BRAND = '#2d57f4';

const COPY: Record<string, Copy> = {
  'pt-PT': {
    subject: 'Estás na lista de acesso antecipado ao Bafatório',
    greeting: (name) => `Olá ${name},`,
    intro: 'Obrigado pelo teu interesse.',
    next: 'Nas próximas semanas vamos abrir o acesso primeiro a quem está nesta lista, antes do lançamento ao público em geral. Avisamos-te assim que for a tua vez.',
    stepNow: 'Lista de espera',
    stepLater: 'Público geral',
    signoff: 'Se tiveres alguma pergunta, responde a este email. Até breve,',
    signature: 'Equipa Bafatório',
    footer: 'Bafatório · Parceiro tecnológico oficial · Human Leaders, Cabo Verde',
  },
  'en-US': {
    subject: "You're on the Bafatório early-access list",
    greeting: (name) => `Hi ${name},`,
    intro: 'Thanks for your interest.',
    next: "Over the coming weeks we'll open access to the people on this list first, before the general public. We'll let you know as soon as it's your turn.",
    stepNow: 'Waitlist',
    stepLater: 'General public',
    signoff: 'If you have any questions, just reply to this email. Talk soon,',
    signature: 'The Bafatório team',
    footer: 'Bafatório · Official technology partner · Human Leaders, Cape Verde',
  },
  'fr-FR': {
    subject: "Vous êtes sur la liste d'accès anticipé à Bafatório",
    greeting: (name) => `Bonjour ${name},`,
    intro: 'Merci de votre intérêt.',
    next: "Dans les prochaines semaines, nous ouvrirons l'accès d'abord aux personnes de cette liste, avant le grand public. Nous vous préviendrons dès que ce sera votre tour.",
    stepNow: "Liste d'attente",
    stepLater: 'Grand public',
    signoff: 'Pour toute question, répondez simplement à cet email. À bientôt,',
    signature: "L'équipe Bafatório",
    footer: 'Bafatório · Partenaire technologique officiel · Human Leaders, Cap-Vert',
  },
};

const FALLBACK_LOCALE = 'pt-PT';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildWelcomeEmail(input: WelcomeEmailInput): WelcomeEmailContent {
  const copy = COPY[input.locale] ?? COPY[FALLBACK_LOCALE];

  const text = [
    copy.greeting(input.name),
    '',
    copy.intro,
    '',
    copy.next,
    `${copy.stepNow} → ${copy.stepLater}`,
    '',
    copy.signoff,
    copy.signature,
    '',
    copy.footer,
  ].join('\n');

  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const ink = '#1a1f33';
  const muted = '#5b6478';

  // Table-based, inline-styled layout for email-client compatibility. Proposal B:
  // white card, official logo over a brand rule, phased-launch step marker.
  const html = `<!DOCTYPE html>
<html lang="${input.locale.slice(0, 2)}">
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
                <p style="margin:0 0 15px 0;">${escapeHtml(copy.intro)}</p>
                <p style="margin:0 0 14px 0;">${escapeHtml(copy.next)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 18px 0;">
                  <tr>
                    <td width="24" height="24" align="center" valign="middle" bgcolor="${BRAND}" style="border-radius:6px;color:#ffffff;font-family:${font};font-size:12px;font-weight:700;line-height:24px;">1</td>
                    <td style="padding:0 14px 0 9px;font-family:${font};font-size:13px;font-weight:600;color:${ink};white-space:nowrap;">${escapeHtml(copy.stepNow)}</td>
                    <td style="padding:0 10px 0 0;font-family:${font};font-size:15px;color:#c3cef6;">&rarr;</td>
                    <td width="24" height="24" align="center" valign="middle" bgcolor="#eef1f8" style="border-radius:6px;color:${muted};font-family:${font};font-size:12px;font-weight:700;line-height:24px;">2</td>
                    <td style="padding:0 0 0 9px;font-family:${font};font-size:13px;color:${muted};white-space:nowrap;">${escapeHtml(copy.stepLater)}</td>
                  </tr>
                </table>
                <p style="margin:0 0 4px 0;">${escapeHtml(copy.signoff)}</p>
                <p style="margin:0;font-weight:700;">${escapeHtml(copy.signature)}</p>
                <p style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #e7eaf3;font-size:11.5px;color:${muted};">${escapeHtml(copy.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: copy.subject, html, text };
}
