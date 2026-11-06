/**
 * Script para enviar os 9 templates de email de exemplo via SES
 * Uso: node scripts/send-test-emails.mjs --to user@example.com
 *       node scripts/send-test-emails.mjs --to user@example.com --dry-run
 */
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGION = 'eu-west-1';
const FROM_EMAIL = 'noreply@bafatorio.com';
const TEMPLATES_DIR = join(__dirname, '..', 'amplify', 'function', 'send-email', 'templates', 'content', 'pt');

// Parse CLI args
const args = process.argv.slice(2);
const toIndex = args.indexOf('--to');
const TO_EMAIL = toIndex !== -1 ? args[toIndex + 1] : null;
const DRY_RUN = args.includes('--dry-run');

if (!TO_EMAIL) {
  console.error('Erro: destinatário obrigatório.\n');
  console.error('Uso: node scripts/send-test-emails.mjs --to user@example.com [--dry-run]');
  process.exit(1);
}

const sesClient = new SESClient({ region: REGION });

// Dados de exemplo para preencher os templates
const sampleData = {
  participantName: 'Alex Silva',
  eventManagerName: 'Alex Silva',
  eventName: 'Conferência Bafatório 2026',
  eventDate: 'quinta-feira, 20 de março de 2026, 09:00',
  eventTime: '09:00 - 18:00',
  eventLocation: 'Centro de Congressos de Lisboa',
  eventManagerContact: 'alex@example.com',
  eventManager: 'Alex Silva',
  confirmationLink: 'https://bafatorio.com/app/confirm/example-123',
  invitationLink: 'https://bafatorio.com/app/invite/example-456',
  eventTitle: 'Conferência Bafatório 2026',
  eventType: 'Conferência',
  eventCategories: 'Tecnologia, Inovação',
  description: 'Uma conferência sobre gestão de eventos e tecnologia.',
  role: 'CO_MANAGER',
  // loginAlert specific
  userName: 'Alex Silva',
  loginDate: '20 de fevereiro de 2026',
  loginTime: '14:35',
  loginLocation: 'Lisboa, Portugal',
  deviceInfo: 'Chrome 120 / Windows 11',
  alertReason: 'Novo dispositivo detectado',
};

// Definição dos 9 templates
const templates = [
  {
    type: 'welcome',
    file: 'welcome.html.hbs',
    subject: '[TESTE] Bem-vindo ao Bafatorio',
    fromName: 'Bafatório',
  },
  {
    type: 'participantInvitation',
    file: 'invitation.html.hbs',
    subject: '[TESTE] Convite exclusivo - Conferência Bafatório 2026',
    fromName: 'Conferência Bafatório 2026',
  },
  {
    type: 'participantConfirmation',
    file: 'confirmation.html.hbs',
    subject: '[TESTE] Confirmação de presença',
    fromName: 'Conferência Bafatório 2026',
  },
  {
    type: 'eventCreation',
    file: 'eventCreation.html.hbs',
    subject: '[TESTE] Evento registrado',
    fromName: 'Bafatório',
  },
  {
    type: 'saveTheDate',
    file: 'saveTheDate.html.hbs',
    subject: '[TESTE] Já temos data!',
    fromName: 'Conferência Bafatório 2026',
  },
  {
    type: 'eventReminder',
    file: 'eventReminder.html.hbs',
    subject: '[TESTE] Lembrete de evento',
    fromName: 'Conferência Bafatório 2026',
  },
  {
    type: 'eventUpdate',
    file: 'eventUpdate.html.hbs',
    subject: '[TESTE] Atualização de evento',
    fromName: 'Conferência Bafatório 2026',
  },
  {
    type: 'loginAlert',
    file: 'loginAlert.html.hbs',
    subject: '[TESTE] Alerta de login',
    fromName: 'Bafatório',
  },
  {
    type: 'collaboratorInvitation',
    file: null, // inline template
    subject: '[TESTE] Convite para Equipa',
    fromName: 'Conferência Bafatório 2026',
  },
];

// Template inline do collaboratorInvitation (do ficheiro logic/collaboratorInvitation.ts)
const collaboratorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Convite para Equipa</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Convite para Equipa: {{eventName}}</h2>
        </div>
        <div class="content">
            <p>Olá {{participantName}},</p>
            <p>Foi convidado para se juntar à equipa de gestão do evento <strong>{{eventName}}</strong>.</p>
            <p><strong>Cargo:</strong> {{role}}</p>
            <p><strong>Data do Evento:</strong> {{eventDate}}</p>
            <p><strong>Local:</strong> {{eventLocation}}</p>
            <p>Para aceitar este convite e começar a colaborar, clique no botão abaixo:</p>
            <center>
                <a href="{{invitationLink}}" class="button">Aceitar Convite</a>
            </center>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p>{{invitationLink}}</p>
        </div>
        <div class="footer">
            <p>Enviado por {{eventManagerName}} através do Bafatório.</p>
        </div>
    </div>
</body>
</html>
`;

async function confirm(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function sendRawEmail(subject, htmlContent, fromName) {
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });

  const mailOptions = {
    from: { address: FROM_EMAIL, name: fromName },
    to: TO_EMAIL,
    subject,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);

  const result = await sesClient.send(
    new SendRawEmailCommand({
      RawMessage: { Data: info.message },
    })
  );

  return result.MessageId;
}

async function main() {
  console.log(`\nDestinatário: ${TO_EMAIL}`);
  console.log(`Templates: ${templates.length}`);
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (sem envio real)' : 'ENVIO REAL'}\n`);

  if (!DRY_RUN) {
    const ok = await confirm(`Confirma o envio de ${templates.length} emails reais para ${TO_EMAIL}? (y/N) `);
    if (!ok) {
      console.log('Cancelado.');
      process.exit(0);
    }
  }

  let sent = 0;
  let failed = 0;

  for (const tpl of templates) {
    try {
      // Ler e compilar o template
      let htmlSource;
      if (tpl.file) {
        htmlSource = readFileSync(join(TEMPLATES_DIR, tpl.file), 'utf-8');
      } else {
        htmlSource = collaboratorHtml;
      }

      const compiled = Handlebars.compile(htmlSource);
      const htmlContent = compiled(sampleData);

      if (DRY_RUN) {
        console.log(`  DRY  ${tpl.type} -> template compilado OK`);
        sent++;
        continue;
      }

      // Enviar
      const messageId = await sendRawEmail(tpl.subject, htmlContent, tpl.fromName);
      console.log(`  OK  ${tpl.type} -> MessageId: ${messageId}`);
      sent++;

      // Pequeno delay para evitar rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`  ERRO  ${tpl.type}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\nResultado: ${sent} ${DRY_RUN ? 'validados' : 'enviados'}, ${failed} falhados`);
  if (!DRY_RUN) {
    console.log(`Verifique a caixa de entrada de ${TO_EMAIL}`);
  }
}

main().catch(console.error);
