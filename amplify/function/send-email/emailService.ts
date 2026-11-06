import { SESClient, SendRawEmailCommand, GetTemplateCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { getTemplateName, EmailType, isInitialized, initializeTemplate } from "./templateManager";
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import { RateLimiter } from "./utils/rateLimiter";
import { RetryStrategy } from "./utils/retryStrategy";
import { EmailMetrics } from "./utils/metrics";
import { eventTimeToHHMM, formatEventDateForEmail } from "../shared/formatEventDate";

/**
 * Initialize utility classes for email processing
 */
const rateLimiter = new RateLimiter();
const retryStrategy = new RetryStrategy();
const metrics = new EmailMetrics();

/**
 * Configure AWS clients with region from environment variables
 */
const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const EMAIL_LOG_TABLE_NAME = process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || '';
const sqsClient = new SQSClient({ region: REGION });
const sesClient = new SESClient({ region: REGION });
const dynamoDBClient = new DynamoDBClient({ region: REGION });

/**
 * Interface for email recipient information
 */
interface EmailRecipient {
    name: string;
    email: string;
}

/**
 * Base interface for all email data types
 */
interface BaseEmailData {
    recipient: EmailRecipient;
    participantId: string[] | string;
    eventId: string;
    eventName: string;
    eventDate: string;
    eventDateType?: string | null;
    eventStartDate?: string | null;
    eventEndDate?: string | null;
    eventSpecificDates?: (string | null | undefined)[] | null;
    eventTime: string;
    eventLocation: string;
    eventManagerName: string;
    eventManagerContact: string;
    confirmationLink: string[] | string;
    attachmentFilename?: string;
    attachmentContent?: string;
    attachmentContentType?: string;
    language?: 'pt' | 'en' | 'fr';
    eventManager?: string;
    eventType?: string;
    eventCategories?: string;
    eventTitle?: string;
    description?: string;
    budget?: string | number;
    organizerId?: string;
    eventStatus?: string;
    role?: string; // Collaborator role for invitation emails
}

export function buildEmailTemplateParams(data: BaseEmailData) {
    const language = data.language || 'pt';
    const formattedEventDate =
        data.eventDateType
            ? formatEventDateForEmail(data, language)
            : data.eventDate || '';

    return {
        participantName: data.recipient.name,
        eventName: data.eventName,
        eventDate: formattedEventDate,
        eventTime: eventTimeToHHMM(data.eventTime),
        eventLocation: data.eventLocation,
        eventManagerName: data.eventManagerName,
        eventManagerContact: data.eventManagerContact,
        eventManager: data.eventManager || data.eventManagerName,
        eventType: data.eventType || '',
        eventCategories: data.eventCategories || '',
        eventTitle: data.eventTitle || data.eventName,
        description: data.description || '',
        budget: data.budget || '',
        confirmationLink: Array.isArray(data.confirmationLink) ? data.confirmationLink[0] : data.confirmationLink,
        role: data.role || '',
        invitationLink: Array.isArray(data.confirmationLink) ? data.confirmationLink[0] : data.confirmationLink
    };
}

async function verifyEmailAddress(email: string): Promise<boolean> {
    try {
        await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));
        console.log(`Verification request sent for email: ${email}`);
        return true;
    } catch (error) {
        console.error(`Failed to verify email ${email}:`, error);
        return false;
    }
}

/**
 * Updates the email log in DynamoDB
 */
export async function updateEmailLog(data: {
    participantId: string[] | string,
    eventId: string,
    emailType: EmailType,
    status: 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED' | 'DELIVERED',
    attempts?: number,
    lastAttemptAt?: Date,
    sentAt?: Date,
    deliveredAt?: Date,
    errorMessage?: string,
    templateName?: string,
    language?: 'pt' | 'en' | 'fr',
    messageId: string
}): Promise<void> {
    try {
        const participantIds = Array.isArray(data.participantId)
            ? data.participantId
            : [data.participantId];

        await Promise.all(participantIds.map(async (pid) => {
            const params = {
                TableName: EMAIL_LOG_TABLE_NAME,
                Item: {
                    id: { S: data.messageId },
                    participantId: { S: pid },
                    eventId: { S: data.eventId },
                    emailType: { S: data.emailType },
                    status: { S: data.status },
                    attempts: { N: (data.attempts || 0).toString() },
                    lastAttemptAt: { S: (data.lastAttemptAt || new Date()).toISOString() },
                    createdAt: { S: new Date().toISOString() },
                    updatedAt: { S: new Date().toISOString() },
                    messageId: { S: data.messageId },
                    ...(data.sentAt && { sentAt: { S: data.sentAt.toISOString() } }),
                    ...(data.deliveredAt && { deliveredAt: { S: data.deliveredAt.toISOString() } }),
                    ...(data.errorMessage && { errorMessage: { S: data.errorMessage } }),
                    ...(data.templateName && { templateName: { S: data.templateName } })
                }
            };

            await dynamoDBClient.send(new PutItemCommand(params));
        }));
    } catch (error) {
        console.error('Error updating email log:', error);
        throw error;
    }
}

/**
 * Enqueues an email message to SQS for async processing
 */
async function enqueueEmail(emailType: EmailType, data: BaseEmailData, priority: number = 1): Promise<string | false> {
    try {
        const message = {
            emailType,
            data,
            attempts: 0,
            priority
        };

        const result = await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.EMAIL_QUEUE_URL,
            MessageBody: JSON.stringify(message),
            MessageAttributes: {
                emailType: {
                    DataType: 'String',
                    StringValue: emailType
                },
                priority: {
                    DataType: 'Number',
                    StringValue: priority.toString()
                }
            },
            DelaySeconds: priority > 1 ? 0 : 10 // High priority = no delay
        }));

        return result.MessageId || false;
    } catch (error) {
        console.error('Error enqueueing email:', error);
        return false;
    }
}


/**
 * Creates a nodemailer transporter for SES
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        SES: { ses: sesClient, aws: { SendRawEmailCommand } },
    } as any);
};

/**
 * Prepares email with attachment using nodemailer
 */
async function prepareEmailWithAttachment(emailType: EmailType, data: BaseEmailData): Promise<Mail.Options> {
    console.log(data);
    // Get from email based on email type
    const address = process.env.BAFATORIO_APP_DEFAULT_FROM_EMAIL || 'noreply@bafatorio.com';
    // Determinar o idioma a ser usado (padrão: pt)
    const language = data.language || 'pt';
    const subject = getSubject(emailType, language);

    // Get the template content with language consideration
    const templateName = getTemplateName(emailType, language);

    const mailOptions: Mail.Options = {
        from: {
            address: address,
            name: data.eventName || 'Bafatorio'
        },
        to: data.recipient.email,
        subject: subject,
        html: await getRenderedTemplate(templateName, buildEmailTemplateParams(data))
    };

    // Add attachment if present
    if (data.attachmentContent && data.attachmentFilename && data.attachmentContentType) {
        mailOptions.attachments = [{
            filename: data.attachmentFilename,
            content: Buffer.from(data.attachmentContent, 'base64'),
            contentType: data.attachmentContentType
        }];
    }

    return mailOptions;
}

/**
 * Gets the appropriate 'from' email address based on email type
 */
function getSubject(emailType: EmailType, language: 'pt' | 'en' | 'fr' = 'pt'): string {
    const subjects: Record<EmailType, Record<'pt' | 'en' | 'fr', string>> = {
        participantInvitation: {
            pt: 'Convite exclusivo',
            en: 'Exclusive invitation',
            fr: 'Invitation exclusive'
        },
        participantConfirmation: {
            pt: 'Confirmação de presença',
            en: 'Attendance confirmation',
            fr: 'Confirmation de présence'
        },
        saveTheDate: {
            pt: 'Já temos data!',
            en: 'Save the Date',
            fr: 'Réservez la date'
        },
        welcome: {
            pt: 'Bem-vindo ao Bafatorio',
            en: 'Welcome to Bafatorio',
            fr: 'Bienvenue sur Bafatorio'
        },
        eventCreation: {
            pt: 'Evento registrado',
            en: 'Event registered',
            fr: 'Événement enregistré'
        },
        eventReminder: {
            pt: 'Lembrete de evento',
            en: 'Event reminder',
            fr: 'Rappel d\'événement'
        },
        eventUpdate: {
            pt: 'Atualização de evento',
            en: 'Event update',
            fr: 'Mise à jour d\'événement'
        },
        loginAlert: {
            pt: 'Alerta de login',
            en: 'Login alert',
            fr: 'Alerte de connexion'
        },
        collaboratorInvitation: {
            pt: 'Convite para Equipa',
            en: 'Team Invitation',
            fr: 'Invitation d\'équipe'
        }
    };
    return subjects[emailType]?.[language] || '';
}

/**
 * Renders the email template with provided data
 */
async function getRenderedTemplate(templateName: string, data: any): Promise<string> {
    try {
        const response = await sesClient.send(new GetTemplateCommand({ TemplateName: templateName }));
        let htmlContent = response.Template?.HtmlPart || '';

        // Replace template variables
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlContent = htmlContent.replace(regex, data[key]);
        });

        return htmlContent;
    } catch (error) {
        console.error('Erro ao obter template:', error);
        throw error;
    }
}

/**
 * Main function to send emails using queue
 */
export async function sendEmail(emailType: EmailType, data: BaseEmailData, priority: number = 1): Promise<boolean> {
    console.log(`[sendEmail] Starting email process. Type: ${emailType}, Recipient: ${data.recipient.email}`);
    try {
        validateEmailData(data);
        console.log(`[sendEmail] Data validated. Enqueueing email...`);
        const messageId = await enqueueEmail(emailType, data, priority);

        if (!messageId) {
            console.error('[sendEmail] Failed to get messageId from SQS');
            return false;
        }

        console.log(`[sendEmail] Email enqueued successfully. MessageId: ${messageId}`);

        try {
            // Usar o idioma fornecido ou padrão para português
            const language = data.language || 'pt';

            console.log(`[sendEmail] Updating DynamoDB email log to QUEUED...`);
            await updateEmailLog({
                participantId: data.participantId,
                eventId: data.eventId,
                emailType: emailType,
                status: 'QUEUED',
                templateName: getTemplateName(emailType, language),
                language: language,
                messageId: messageId
            });
            console.log(`[sendEmail] DynamoDB email log updated.`);
        } catch (logError) {
            console.error('[sendEmail] Failed to update email log:', logError);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[sendEmail] Error processing email ${emailType}:`, error);
        return false;
    }
}


/**
 * Direct email sending function (used by queue processor)
 */
export async function sendEmailDirect(emailType: EmailType, data: BaseEmailData): Promise<boolean> {
    console.log(`[sendEmailDirect] Starting direct send. Type: ${emailType}, Recipient: ${data.recipient.email}`);
    try {
        return await retryStrategy.execute(async () => {
            // 1. Wait for rate limiter to allow sending
            console.log(`[sendEmailDirect] Waiting for rate limiter...`);
            await rateLimiter.acquire();
            console.log(`[sendEmailDirect] Rate limiter acquired.`);

            // 2. Determinar o idioma a ser usado (padrão: pt)
            const language = data.language || 'pt';

            // 3. Initialize the email template
            console.log(`[sendEmailDirect] Initializing template...`);
            await initializeTemplate(emailType, language);
            console.log(`[sendEmailDirect] Template initialized.`);

            // 4. Check if template is ready
            if (!isInitialized()) {
                throw new Error("Templates não foram inicializados");
            }

            // 5. Validate the email data again
            validateEmailData(data);

            // 6. Prepare email with template and attachments
            console.log(`[sendEmailDirect] Preparing email content...`);
            const mailOptions = await prepareEmailWithAttachment(emailType, data);

            // 7. Generate Raw Email using Nodemailer (Stream Transport)
            // This avoids compatibility issues between Nodemailer and AWS SDK v3
            console.log(`[sendEmailDirect] Generating raw email...`);
            const transporter = nodemailer.createTransport({
                streamTransport: true,
                newline: 'unix',
                buffer: true
            });

            const info = await transporter.sendMail(mailOptions);

            // 8. Send via AWS SES SDK v3 directly
            console.log(`[sendEmailDirect] Sending raw email via SES Client...`);
            const command = new SendRawEmailCommand({
                RawMessage: { Data: info.message as Buffer }
            });

            const result = await sesClient.send(command);
            console.log(`[sendEmailDirect] SES send result:`, result.MessageId);

            // 9. Track metrics for successful send
            await metrics.trackEmailSent(emailType, true);
            return true;
        });
    } catch (error) {
        console.error(`[sendEmailDirect] Failed to send email:`, error);
        // 10. Track metrics for failed send
        await metrics.trackEmailSent(emailType, false);
        return false;
    }
}

// Define a priority based on the email type
const getPriority = (emailType: EmailType): number => {
    switch (emailType) {
        case 'participantConfirmation':
            return 3; // High priority for confirmations
        case 'participantInvitation':
            return 3; // High priority for invitations
        case 'saveTheDate':
        default:
            return 2; // Normal priority for other types
    }
};


/**
 * Bulk email sending functionality using queue
 */
export async function sendBulkEmails(emailType: EmailType, dataList: BaseEmailData[]): Promise<boolean[]> {
    console.log(`Starting bulk send of ${dataList.length} emails of type ${emailType}`);

    for (const data of dataList) {
        if (Array.isArray(data.participantId) || Array.isArray(data.confirmationLink)) {
            throw new Error('Dados individuais não devem ser arrays em envio em massa');
        }
    }

    const priority = getPriority(emailType);
    const results = await Promise.all(
        dataList.map(async (data) => {
            const messageId = await enqueueEmail(emailType, data, priority);
            if (messageId) {
                // Use the language provided or default to portuguese
                const language = data.language || 'pt';

                await updateEmailLog({
                    participantId: data.participantId,
                    eventId: data.eventId,
                    emailType: emailType,
                    status: 'QUEUED',
                    templateName: getTemplateName(emailType, language),
                    language: language,
                    messageId: messageId
                });
                return true;
            }
            return false;
        })
    );

    const successCount = results.filter(result => result).length;
    console.log(`Queuing complete. ${successCount}/${dataList.length} emails queued`);

    return results;
}

/**
 * Validates email data against required fields
 */
function validateEmailData(data: BaseEmailData): boolean {
    // Clean up email and name from any brackets
    if (data.recipient) {
        data.recipient.email = data.recipient.email.replace(/[\[\]]/g, '').trim();
        data.recipient.name = data.recipient.name.replace(/[\[\]]/g, '').trim();
    }

    const requiredFields = ['recipient'];

    for (const field of requiredFields) {
        if (!data[field as keyof BaseEmailData]) {
            throw new Error(`Campo obrigatório em falta: ${field}`);
        }
    }

    if (!data.recipient.email || !data.recipient.name) {
        throw new Error('Informações do destinatário incompletas');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.recipient.email)) {
        throw new Error(`Endereço de email inválido: ${data.recipient.email}`);
    }

    // Validar arrays de participantId e confirmationLink
    if (Array.isArray(data.participantId) && Array.isArray(data.confirmationLink)) {
        if (data.participantId.length !== data.confirmationLink.length) {
            throw new Error('Arrays de participantId e confirmationLink com tamanhos diferentes');
        }
    }

    return true;
}
