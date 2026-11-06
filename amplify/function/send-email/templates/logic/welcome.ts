import { SESClient, CreateTemplateCommand, GetTemplateCommand, UpdateTemplateCommand, TemplateDoesNotExistException } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Handlebars from "handlebars";

const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const TEMPLATE_NAME = "WelcomeTemplate";
const BUCKET_NAME = process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || "bafatorio-template-storage";

export interface WelcomeTemplateContext {
  userName: string;
}

export async function renderWelcomeTemplate(
  lang: "pt" | "en" | "fr",
  context: WelcomeTemplateContext,
  type: "html" | "text" = "html"
): Promise<string> {
  // Busca template do S3
  const templateContent = await getTemplateFromS3(lang, `welcome.${type}.hbs`);
  const template = Handlebars.compile(templateContent);
  return template(context);
}

export async function verifyAndCreateWelcomeTemplate(lang: "pt" | "en" | "fr" = "pt"): Promise<boolean> {
  try {
    // Busca templates do S3
    let htmlContent: string;
    let textContent: string;
    try {
      htmlContent = await getTemplateFromS3(lang, "welcome.html.hbs");
      textContent = await getTemplateFromS3(lang, "welcome.text.hbs");
    } catch (error) {
      console.error("Erro ao carregar templates do S3:", error instanceof Error ? error.message : String(error));
      return false;
    }
    const SUBJECTS: Record<string, string> = {
      pt: "Bem-vindo ao Bafatório, {{userName}}!",
      en: "Welcome to Bafatorio, {{userName}}!",
      fr: "Bienvenue sur Bafatorio, {{userName}} !"
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
    console.error("Error verifying/creating welcome template:", error);
    return false;
  }
}

async function checkAndUpdateTemplate(templateParams: any): Promise<boolean> {
  try {
    await sesClient.send(new GetTemplateCommand({ TemplateName: templateParams.Template.TemplateName }));
    await sesClient.send(new UpdateTemplateCommand(templateParams));
    return true;
  } catch (error: any) {
    if (error instanceof TemplateDoesNotExistException || error?.name === "TemplateDoesNotExistException" || error?.Code === "TemplateDoesNotExistException") {
      await sesClient.send(new CreateTemplateCommand(templateParams));
      return true;
    } else {
      console.error("SES template error:", error);
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
