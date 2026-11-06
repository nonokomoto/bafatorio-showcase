import { SESClient, CreateTemplateCommand, GetTemplateCommand, UpdateTemplateCommand, TemplateDoesNotExistException } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Handlebars from "handlebars";

const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const TEMPLATE_NAME = "CollaboratorInvitationTemplate";
const BUCKET_NAME = process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || "bafatorio-template-storage";

export interface CollaboratorInvitationTemplateContext {
  participantName: string;
  eventName: string;
  role: string;
  eventDate: string;
  eventLocation: string;
  invitationLink: string;
  eventManagerName: string;
}

export async function renderCollaboratorInvitationTemplate(
  lang: "pt" | "en" | "fr",
  context: CollaboratorInvitationTemplateContext,
  type: "html" | "text" = "html"
): Promise<string> {
  const templateContent = await getTemplateFromS3(lang, `collaboratorInvitation.${type}.hbs`);
  const template = Handlebars.compile(templateContent);
  return template(context);
}

export async function verifyAndCreateCollaboratorInvitationTemplate(lang: "pt" | "en" | "fr" = "pt"): Promise<boolean> {
  try {
    let htmlContent: string;
    let textContent: string;
    try {
      htmlContent = await getTemplateFromS3(lang, "collaboratorInvitation.html.hbs");
      textContent = await getTemplateFromS3(lang, "collaboratorInvitation.text.hbs");
    } catch (error) {
      console.error("Erro ao carregar templates do S3:", error instanceof Error ? error.message : String(error));
      return false;
    }

    const SUBJECTS: Record<string, string> = {
      pt: 'Convite para Equipa: {{eventName}}',
      en: 'Team Invitation: {{eventName}}',
      fr: "Invitation d'équipe : {{eventName}}"
    };

    const templateParams = {
      Template: {
        TemplateName: `${TEMPLATE_NAME}_${lang}`,
        SubjectPart: SUBJECTS[lang],
        HtmlPart: htmlContent,
        TextPart: textContent,
      }
    };
    return await checkAndUpdateTemplate(templateParams);
  } catch (error) {
    console.error("Erro ao processar templates de convite de colaborador:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function checkAndUpdateTemplate(templateParams: any): Promise<boolean> {
  try {
    await sesClient.send(new GetTemplateCommand({ TemplateName: templateParams.Template.TemplateName }));
    await sesClient.send(new UpdateTemplateCommand(templateParams));
    return true;
  } catch (error) {
    if (error instanceof TemplateDoesNotExistException) {
      await sesClient.send(new CreateTemplateCommand(templateParams));
      return true;
    } else {
      console.error("Erro ao criar/atualizar template SES:", error);
    }
    return false;
  }
}

async function getTemplateFromS3(lang: "pt" | "en" | "fr", filename: string): Promise<string> {
  const key = `email-templates/${lang}/${filename}`;
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const response = await s3Client.send(command);
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  } catch (error) {
    console.error(`Erro ao buscar template ${key} do S3:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}
