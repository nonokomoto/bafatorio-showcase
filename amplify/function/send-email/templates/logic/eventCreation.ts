import { SESClient, CreateTemplateCommand, GetTemplateCommand, UpdateTemplateCommand, TemplateDoesNotExistException } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Handlebars from "handlebars";

const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const TEMPLATE_NAME = "EventCreationNotificationTemplate";
const BUCKET_NAME = process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || "bafatorio-template-storage";

/**
 * Interface for event creation email template context
 */
export interface EventCreationTemplateContext {
  eventManager: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventType: string;
  eventCategories: string;
}

/**
 * Renders an event creation email template with the given context
 * @param lang Language code for the template
 * @param context Data to be used in the template
 * @param type Type of template to render (html or text)
 * @returns Rendered template as string
 */
export async function renderEventCreationTemplate(
  lang: "pt" | "en" | "fr",
  context: EventCreationTemplateContext,
  type: "html" | "text" = "html"
): Promise<string> {
  // Busca template do S3
  const templateContent = await getTemplateFromS3(lang, `eventCreation.${type}.hbs`);
  const template = Handlebars.compile(templateContent);
  return template(context);
}

/**
 * Verifica se o template de criação de evento existe no SES; se não, cria usando conteúdo do S3; se sim, atualiza.
 * @param lang Código do idioma (pt, en, fr)
 * @returns Promise<boolean>
 */
export async function verifyAndCreateEventCreationTemplate(lang: "pt" | "en" | "fr" = "pt"): Promise<boolean> {
  // Debug: Print Lambda environment info
  console.log("[DEBUG] Lambda region:", REGION);
  console.log("[DEBUG] Lambda bucket:", BUCKET_NAME);

  try {
    // Busca templates do S3
    let htmlContent: string;
    let textContent: string;
    try {
      htmlContent = await getTemplateFromS3(lang, "eventCreation.html.hbs");
      textContent = await getTemplateFromS3(lang, "eventCreation.text.hbs");
    } catch (error) {
      console.error("Erro ao carregar templates do S3:", error instanceof Error ? error.message : String(error));
      return false;
    }
    const SUBJECTS: Record<string, string> = {
      pt: 'Confirmação: O seu evento {{eventName}} foi registado',
      en: 'Confirmation: Your event {{eventName}} has been registered',
      fr: "Confirmation : Votre événement {{eventName}} a été enregistré"
    };

    // Prepare template parameters
    // Adiciona o sufixo de idioma ao nome do template para consistência com getTemplateName
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
    console.error("Erro ao processar templates de criação de evento:", 
      error instanceof Error ? error.message : String(error));
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
    // Check if template exists
    await sesClient.send(new GetTemplateCommand({ 
      TemplateName: templateParams.Template.TemplateName 
    }));
    
    // Template exists, update it
    try {
      await sesClient.send(new UpdateTemplateCommand(templateParams));
      console.log("Template de criação de evento atualizado com sucesso");
      return true;
    } catch (updateError) {
      console.error("Erro ao atualizar template de criação de evento:", 
        updateError instanceof Error ? updateError.message : String(updateError));
      return false;
    }
  } catch (error) {
    // Template doesn't exist, create it
    if (error instanceof TemplateDoesNotExistException) {
      try {
        await sesClient.send(new CreateTemplateCommand(templateParams));
        console.log("Template de criação de evento criado com sucesso");
        return true;
      } catch (createError) {
        console.error("Erro ao criar template de criação de evento:", 
          createError instanceof Error ? createError.message : String(createError));
        return false;
      }
    } else {
      console.error("Erro inesperado ao verificar template de criação de evento:", 
        error instanceof Error ? error.message : String(error));
      return false;
    }
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

// Exemplo de uso:
// const html = await renderEventCreationTemplate('pt', { 
//   eventManager: 'João', 
//   eventName: 'Festa', 
//   eventDate: '2025-12-12',
//   eventTime: '20:00',
//   eventLocation: 'Lisboa',
//   eventType: 'Festa',
//   eventCategories: 'Aniversário'
// }, 'html');
