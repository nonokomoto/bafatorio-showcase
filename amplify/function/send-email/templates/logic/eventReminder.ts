import { SESClient, CreateTemplateCommand, GetTemplateCommand, UpdateTemplateCommand, TemplateDoesNotExistException } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Handlebars from "handlebars";

const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const TEMPLATE_NAME = "EventReminderNotificationTemplate";
const BUCKET_NAME = process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || "bafatorio-template-storage";

/**
 * Interface for event reminder email template context
 */
export interface EventReminderTemplateContext {
  participantName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventManagerName: string;
  eventManagerContact: string;
}

/**
 * Renders an event reminder email template with the given context
 * @param lang Language code for the template
 * @param context Data to be used in the template
 * @param type Type of template to render (html or text)
 * @returns Rendered template as string
 */
export async function renderEventReminderTemplate(
  lang: "pt" | "en" | "fr",
  context: EventReminderTemplateContext,
  type: "html" | "text" = "html"
): Promise<string> {
  // Busca template do S3
  const templateContent = await getTemplateFromS3(lang, `eventReminder.${type}.hbs`);
  const template = Handlebars.compile(templateContent);
  return template(context);
}

/**
 * Verifies if the event reminder email template exists in AWS SES
 * If it doesn't exist, creates it using the content from the template files
 * If it exists, updates it with the current content
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function verifyAndCreateEventReminderTemplate(lang: "pt" | "en" | "fr" = "pt"): Promise<boolean> {
  // Debug: Print Lambda environment info
  console.log("[DEBUG] Lambda region:", REGION);
  console.log("[DEBUG] Lambda bucket:", BUCKET_NAME);
  try {
    // Busca templates do S3
    let htmlContent: string;
    let textContent: string;
    try {
      htmlContent = await getTemplateFromS3(lang, "eventReminder.html.hbs");
      textContent = await getTemplateFromS3(lang, "eventReminder.text.hbs");
    } catch (error) {
      console.error("Erro ao carregar templates do S3:", error instanceof Error ? error.message : String(error));
      return false;
    }
    const SUBJECTS: Record<string, string> = {
      pt: 'Lembrete: O evento {{eventName}} irá realizar-se em breve!',
      en: 'Reminder: Your event {{eventName}} is coming up!',
      fr: "Rappel : Votre événement {{eventName}} approche !"
    };
    const templateParams = {
      Template: {
        TemplateName: `${TEMPLATE_NAME}_${lang}`,
        SubjectPart: SUBJECTS[lang],
        HtmlPart: htmlContent,
        TextPart: textContent
      }
    };
    return await checkAndUpdateTemplate(templateParams);
  } catch (error) {
    console.error("Erro ao processar templates de lembrete:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Helper function to check if template exists and update or create it
 * @param templateParams Parameters for the template
 * @returns Promise resolving to boolean indicating success or failure
 */
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

/**
 * Busca um arquivo de template do S3
 * @param lang Código do idioma
 * @param filename Nome do arquivo do template
 * @returns Conteúdo do template como string
 */
async function getTemplateFromS3(lang: "pt" | "en" | "fr", filename: string): Promise<string> {
  const key = `email-templates/${lang}/${filename}`;
  console.log(`Buscando template do S3: ${BUCKET_NAME}/${key}`);
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
    console.error(`Erro ao buscar template do S3: ${key}`, error);
    throw new Error(`Template não encontrado no S3: ${key}`);
  }
}
