import Handlebars from 'handlebars';
import { 
  SESClient, 
  CreateTemplateCommand, 
  GetTemplateCommand, 
  UpdateTemplateCommand, 
  TemplateDoesNotExistException 
} from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

// Constants
const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const TEMPLATE_NAME = "ParticipantConfirmationTemplate";
const BUCKET_NAME = process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || "bafatorio-template-storage";

/**
 * Interface for confirmation email template context
 */
export interface ConfirmationTemplateContext {
  participantName: string;
  eventName: string;
  eventManagerName: string;
  eventManagerContact: string;
}

/**
 * Renders a confirmation email template with the given context
 * @param lang Language code for the template
 * @param context Data to be used in the template
 * @param type Type of template to render (html or text)
 * @returns Rendered template as string
 */
export async function renderConfirmationTemplate(
  lang: 'pt' | 'en' | 'fr',
  context: ConfirmationTemplateContext,
  type: 'html' | 'text' = 'html'
): Promise<string> {
  try {
    const templateContent = await getTemplateFromS3(lang, `confirmation.${type}.hbs`);
    const template = Handlebars.compile(templateContent);
    return template(context);
  } catch (error) {
    console.error(`Error rendering ${type} template for ${lang}:`, error);
    throw new Error(`Failed to render template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches a template from S3
 * @param lang Language code
 * @param filename Template filename
 * @returns Template content as string
 */
async function getTemplateFromS3(lang: 'pt' | 'en' | 'fr', filename: string): Promise<string> {
  const key = `email-templates/${lang}/${filename}`;
  console.log(`Fetching template from S3: ${BUCKET_NAME}/${key}`);
  
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
    console.error(`Error fetching template from S3: ${key}`, error);
    throw new Error(`Template not found in S3: ${key}`);
  }
}

/**
 * Verifies if the confirmation email template exists in AWS SES
 * If it doesn't exist, creates it using the content from the template files
 * If it exists, updates it with the current content
 * @returns Promise resolving to boolean indicating success or failure
 */
export async function verifyAndCreateConfirmationTemplate(lang: 'pt' | 'en' | 'fr' = 'pt'): Promise<boolean> {
  try {
    console.log(`[DEBUG] [CONFIRMATION] Initializing ${TEMPLATE_NAME} for language: ${lang}`);
    console.log(`[DEBUG] [CONFIRMATION] REGION: ${REGION}`);
    console.log(`[DEBUG] [CONFIRMATION] BUCKET_NAME: ${BUCKET_NAME}`);
    
    // Subject translations
    const SUBJECTS: Record<string, string> = {
      pt: 'Confirmação de Presença: {{eventName}}',
      en: 'Attendance Confirmation: {{eventName}}',
      fr: 'Confirmation de présence : {{eventName}}'
    };

    // Load templates from S3
    let htmlContent: string;
    let textContent: string;
    
    try {
      console.log(`[DEBUG] [CONFIRMATION] Fetching HTML template for lang=${lang}`);
      htmlContent = await getTemplateFromS3(lang, 'confirmation.html.hbs');
      console.log(`[DEBUG] [CONFIRMATION] HTML template loaded (length=${htmlContent.length})`);
      console.log(`[DEBUG] [CONFIRMATION] Fetching TEXT template for lang=${lang}`);
      textContent = await getTemplateFromS3(lang, 'confirmation.text.hbs');
      console.log(`[DEBUG] [CONFIRMATION] TEXT template loaded (length=${textContent.length})`);
    } catch (error) {
      console.error(`[ERROR] [CONFIRMATION] Error loading templates for ${lang}:`, error instanceof Error ? error.message : error);
      return false;
    }

    // Prepare template parameters with language suffix in the template name
    const templateName = `${TEMPLATE_NAME}_${lang}`;
    const templateParams = {
      Template: {
        TemplateName: templateName,
        SubjectPart: SUBJECTS[lang],
        HtmlPart: htmlContent,
        TextPart: textContent
      }
    };
    console.log(`[DEBUG] [CONFIRMATION] Prepared templateParams for SES:`, JSON.stringify(templateParams, null, 2));

    const result = await checkAndUpdateTemplate(templateParams, templateName);
    console.log(`[DEBUG] [CONFIRMATION] checkAndUpdateTemplate result for ${templateName}:`, result);
    return result;
  } catch (error) {
    console.error("[ERROR] [CONFIRMATION] Erro ao processar templates de confirmação:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Helper function to check if template exists and update or create it
 * @param templateParams Parameters for the template
 * @param templateName Name of the template (including language suffix)
 * @returns Promise resolving to boolean indicating success or failure
 */
async function checkAndUpdateTemplate(templateParams: any, templateName: string): Promise<boolean> {
  try {
    // Check if template exists
    await sesClient.send(new GetTemplateCommand({ 
      TemplateName: templateName
    }));
    
    // Template exists, update it
    try {
      await sesClient.send(new UpdateTemplateCommand(templateParams));
      console.log("Template de confirmação atualizado com sucesso");
      return true;
    } catch (updateError) {
      console.error("Erro ao atualizar template de confirmação:", 
        updateError instanceof Error ? updateError.message : String(updateError));
      return false;
    }
  } catch (error) {
    // Template doesn't exist, create it
    if (error instanceof TemplateDoesNotExistException) {
      try {
        await sesClient.send(new CreateTemplateCommand(templateParams));
        console.log("Template de confirmação criado com sucesso");
        return true;
      } catch (createError) {
        console.error("Erro ao criar template de confirmação:", 
          createError instanceof Error ? createError.message : String(createError));
        return false;
      }
    } else {
      console.error("Erro inesperado ao verificar template de confirmação:", 
        error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

// Example usage:
// const html = await renderConfirmationTemplate('pt', { 
//   participantName: 'João', 
//   eventName: 'Festa', 
//   eventManagerName: 'Maria', 
//   eventManagerContact: 'maria@email.com' 
// }, 'html');
