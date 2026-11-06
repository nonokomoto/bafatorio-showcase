import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { initializeTemplate } from './templateManager';
import { sendEmail, sendBulkEmails } from './emailService';
import { EmailType } from './templateManager';

const logger = new Logger({ serviceName: 'sendEmail' });

// DynamoDB client for access control checks
const ddbClient = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

// Roles allowed to send emails (per ACCESS_LEVELS_STRATEGY.md — EMAIL_SEND)
const ROLES_WITH_EMAIL = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to send emails for the given event.
 */
async function verifyEmailAccess(userId: string, eventId: string): Promise<string> {
    const eventResult = await ddbClient.send(new GetItemCommand({
        TableName: EVENT_TABLE,
        Key: marshall({ id: eventId }),
        ProjectionExpression: '#owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
    }));

    if (!eventResult.Item) {
        throw new Error(`Event ${eventId} not found`);
    }

    const eventRecord = unmarshall(eventResult.Item);
    const normalizedOwner = normalizeUserId(eventRecord.owner || '');

    if (normalizedOwner === userId) {
        return 'OWNER';
    }

    const collabResult = await ddbClient.send(new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'userId = :uid AND #st = :accepted',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: marshall({
            ':eid': eventId,
            ':uid': userId,
            ':accepted': 'ACCEPTED',
        }),
    }));

    const collabs = (collabResult.Items || []).map(item => unmarshall(item));
    if (collabs.length > 0) {
        const role = collabs[0].role as string;
        if (ROLES_WITH_EMAIL.has(role)) {
            return role;
        }
        throw new Error(`Access denied: Role ${role} cannot send emails`);
    }

    throw new Error('Access denied: You do not have permission to send emails for this event');
}

/**
 * Arguments interface for the AppSync resolver
 */
interface SendEmailArguments {
    to: string[] | string;
    emailType: EmailType;
    participantName: string[] | string;
    participantId: string[] | string;
    eventName: string;
    eventId: string;
    eventDate: string;
    eventDateType?: string | null;
    eventStartDate?: string | null;
    eventEndDate?: string | null;
    eventSpecificDates?: (string | null | undefined)[] | null;
    eventTime: string;
    eventLocation: string;
    eventManagerName: string;
    eventManagerContact: string;
    confirmationLink?: string[] | string;
    eventManager?: string;
    eventTitle?: string;
    eventType?: string;
    eventCategories?: string;
    attachmentFilename?: string;
    attachmentContent?: string;
    attachmentContentType?: string;
    language?: 'pt' | 'en' | 'fr'; 
}

/**
 * Response interface for the AppSync resolver
 */
interface SendEmailResponse {
    success: boolean;
    message: string;
    error?: string;
    results?: boolean[];
}

/**
 * Processes multiple email requests
 */
async function processBulkEmailRequest(args: SendEmailArguments): Promise<SendEmailResponse> {
    // Verify required arrays
    if (!Array.isArray(args.to) || 
        !Array.isArray(args.participantName) || 
        !Array.isArray(args.participantId) ||
        new Set([
            args.to.length,
            args.participantName.length,
            args.participantId.length
        ]).size !== 1) {
        return {
            success: false,
            message: 'Dados inválidos para envio em massa',
            error: 'Invalid bulk email data'
        };
    }

    // Ensure confirmationLink is an array if it exists
    const confirmationLinks = args.confirmationLink 
        ? Array.isArray(args.confirmationLink) 
            ? args.confirmationLink 
            : [args.confirmationLink]
        : Array(args.to.length).fill('');

    const cleanedEmails = args.to.map(email => email.trim());
    
    const emailDataList = cleanedEmails.map((email, index) => ({
        recipient: {
            name: args.participantName[index].trim(),
            email: email
        },
        eventName: args.eventName,
        eventDate: args.eventDate,
        eventDateType: args.eventDateType,
        eventStartDate: args.eventStartDate,
        eventEndDate: args.eventEndDate,
        eventSpecificDates: args.eventSpecificDates,
        eventTime: args.eventTime,
        eventLocation: args.eventLocation,
        language: args.language || 'pt',
        eventManagerName: args.eventManagerName,
        eventManagerContact: args.eventManagerContact || '',
        confirmationLink: confirmationLinks[index] || '',
        participantId: args.participantId[index],
        attachmentFilename: args.attachmentFilename,
        attachmentContent: args.attachmentContent,
        attachmentContentType: args.attachmentContentType,
        eventId: args.eventId
    }));

    const results = await sendBulkEmails(args.emailType, emailDataList);
    const successCount = results.filter(result => result).length;

    return {
        success: successCount === emailDataList.length,
        message: `${successCount}/${emailDataList.length} emails enviados com sucesso`,
        results
    };
}

/**
 * AppSync resolver handler for email sending functionality
 */
export const handler: AppSyncResolverHandler<SendEmailArguments, SendEmailResponse> = async (event) => {
    try {
        // Extract userId from AppSync identity
        const identity = event.identity as { sub?: string } | undefined;
        const userId = identity && 'sub' in identity ? identity.sub : undefined;
        if (!userId) {
            return { success: false, message: 'User identity not found', error: 'Unauthenticated' };
        }

        // Verify access control before sending any emails
        const { eventId } = event.arguments;
        if (!eventId) {
            return { success: false, message: 'Event ID is required', error: 'Missing eventId' };
        }
        const userRole = await verifyEmailAccess(userId, eventId);
        logger.info('Access verified', { eventId, userRole });

        const initialized = await initializeTemplate(event.arguments.emailType, event.arguments.language || 'pt');
        if (!initialized) {
            return {
                success: false,
                message: 'Erro ao inicializar templates de email',
                error: 'Failed to initialize email templates'
            };
        }

        // Check if it's a bulk email request
        if (Array.isArray(event.arguments.to)) {
            return processBulkEmailRequest(event.arguments);
        }

        // Single email processing (eventId already destructured above for access check)
        const {
            to,
            emailType,
            participantName,
            participantId,
            eventName,
            eventDate,
            eventDateType,
            eventStartDate,
            eventEndDate,
            eventSpecificDates,
            eventTime,
            eventLocation,
            eventManagerName,
            eventManagerContact,
            confirmationLink,
            attachmentFilename,
            attachmentContent,
            attachmentContentType
        } = event.arguments;

        const emailData = {
            recipient: {
                name: participantName as string,
                email: to as string
            },
            eventName,
            eventDate,
            eventDateType,
            eventStartDate,
            eventEndDate,
            eventSpecificDates,
            eventTime,
            eventLocation,
            eventManagerName,
            eventManagerContact,
            confirmationLink: Array.isArray(confirmationLink) 
                ? confirmationLink[0] 
                : confirmationLink || '',
            attachmentFilename,
            attachmentContent,
            attachmentContentType,
            participantId: Array.isArray(participantId) 
                ? participantId[0] 
                : participantId,
            eventId,
            language: event.arguments.language || 'pt'
        };



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

        // Atualizar a chamada do sendEmail
        const success = await sendEmail(emailType, emailData, getPriority(emailType));
                
        return {
            success,
            message: success ? 'Email enviado com sucesso' : 'Erro ao enviar email',
            error: success ? undefined : 'Failed to send email'
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isAccessDenied = errorMessage.startsWith('Access denied');

        logger.error('Error processing email request', {
            error: errorMessage,
            isAccessDenied,
        });

        return {
            success: false,
            message: isAccessDenied ? 'Acesso negado' : 'Erro interno do servidor',
            error: isAccessDenied ? 'Access denied' : errorMessage,
        };
    }
};
