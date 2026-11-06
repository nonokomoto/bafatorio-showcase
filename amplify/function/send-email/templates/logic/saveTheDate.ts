import { SESClient, CreateTemplateCommand, GetTemplateCommand, UpdateTemplateCommand, TemplateDoesNotExistException } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Handlebars from "handlebars";

const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const TEMPLATE_NAME = "SaveTheDateTemplate";
const BUCKET_NAME = process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || "bafatorio-template-storage";

export interface SaveTheDateTemplateContext {
  participantName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventManagerName: string;
}

export async function renderSaveTheDateTemplate(
  lang: "pt" | "en" | "fr",
  context: SaveTheDateTemplateContext,
  type: "html" | "text" = "html"
): Promise<string> {
  // Fetch template from S3
  const templateContent = await getTemplateFromS3(lang, `saveTheDate.${type}.hbs`);
  const template = Handlebars.compile(templateContent);
  return template(context);
}

/**
 * Fetch a template file from S3
 * @param lang Language code
 * @param filename Template filename
 * @returns The template content as a string
 */
async function getTemplateFromS3(lang: "pt" | "en" | "fr", filename: string): Promise<string> {
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

export async function verifyAndCreateSaveTheDateTemplate(lang: "pt" | "en" | "fr" = "pt"): Promise<boolean> {
  // Debug: Print Lambda environment info
  console.log("[DEBUG] Lambda region:", REGION);
  console.log("[DEBUG] Lambda bucket:", BUCKET_NAME);
  
  try {
    // Fetch template files from S3
    let htmlContent: string;
    let textContent: string;
    
    try {
      htmlContent = await getTemplateFromS3(lang, "saveTheDate.html.hbs");
      textContent = await getTemplateFromS3(lang, "saveTheDate.text.hbs");
    } catch (error) {
      console.error("Error loading templates from S3:", error instanceof Error ? error.message : String(error));
      return false;
    }
    const SUBJECTS: Record<string, string> = {
      pt: "Reserva da Data: {{eventName}}",
      en: "Save the Date: {{eventName}}",
      fr: "Réservez la date : {{eventName}}"
    };
    // Templates are already loaded from S3 above
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
    console.error("Error verifying/creating Save the Date template:", error);
    return false;
  }
}

async function checkAndUpdateTemplate(templateParams: any): Promise<boolean> {
  try {
    await sesClient.send(new GetTemplateCommand({ TemplateName: templateParams.Template.TemplateName }));
    await sesClient.send(new UpdateTemplateCommand(templateParams));
    return true;
  } catch (error: any) {
    if (error.name === "TemplateDoesNotExistException" || error.Code === "TemplateDoesNotExistException") {
      await sesClient.send(new CreateTemplateCommand(templateParams));
      return true;
    } else {
      console.error("SES template error:", error);
      return false;
    }
  }
}
