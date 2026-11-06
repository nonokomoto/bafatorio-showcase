import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { EmailType, initializeTemplate } from '../templateManager';
import { sendEmailDirect } from '../emailService';
import { 
    DynamoDBClient, 
    UpdateItemCommand,
    GetItemCommand,
    AttributeValue , 
    ReturnValue
} from "@aws-sdk/client-dynamodb";

const emailLogTableName = process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || '';
const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';

// Initialize DynamoDB client with region from environment variables
const dynamoDBClient = new DynamoDBClient({ region });

/**
 * Interface defining the structure of messages received from the SQS queue
 */
interface QueueMessage {
    emailType: EmailType;
    data: {
        recipient: {
            name: string;
            email: string;
        };
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
        confirmationLink: string | string[];
        attachmentFilename?: string;
        attachmentContent?: string;
        attachmentContentType?: string;
        participantId: string | string[];
        eventId: string;
        language?: 'pt' | 'en' | 'fr';
    };
    attempts?: number;
}

/**
 * Interface for parameters required to update email status in DynamoDB
 */
interface UpdateEmailStatusParams {
    participantId: string | string[];
    eventId: string;
    status: 'SENT' | 'FAILED';
    attempts: number;
    errorMessage?: string;
    messageId: string;  
}

/**
 * Updates the email status and related fields in DynamoDB
 * @param params - Parameters containing the data to update
 */
async function updateEmailStatus(params: UpdateEmailStatusParams): Promise<void> {
    try {
        // First, get the existing item to ensure it exists
        const getItemParams = {
            TableName: emailLogTableName,
            Key: {
                'id': { S: params.messageId }  
            }
        };

        const existingItem = await dynamoDBClient.send(new GetItemCommand(getItemParams));

        console.log('existingItem', existingItem.Item);

        
        if (!existingItem.Item) {
            throw new Error(`No email log found for messageId: ${params.messageId}`);
        }

        // Construct different update expressions based on status
        const updateExpression = params.status === 'SENT'
            ? 'SET #status = :status, #attempts = :attempts, #lastAttemptAt = :lastAttemptAt, #sentAt = :sentAt, #updatedAt = :updatedAt'
            : 'SET #status = :status, #attempts = :attempts, #lastAttemptAt = :lastAttemptAt, #errorMessage = :errorMessage, #updatedAt = :updatedAt';

        // Define values for the update expression
        const expressionAttributeValues = {
            ':status': { S: params.status },
            ':attempts': { N: params.attempts.toString() },
            ':lastAttemptAt': { S: new Date().toISOString() },
            ':updatedAt': { S: new Date().toISOString() },
            ...(params.status === 'SENT' && {
                ':sentAt': { S: new Date().toISOString() }
            }),
            ...(params.status === 'FAILED' && {
                ':errorMessage': { S: params.errorMessage || 'Unknown error' }
            })
        };

        // Define attribute names to avoid reserved words
        const expressionAttributeNames = {
            '#status': 'status',
            '#attempts': 'attempts',
            '#lastAttemptAt': 'lastAttemptAt',
            '#updatedAt': 'updatedAt',
            ...(params.status === 'SENT' && {
                '#sentAt': 'sentAt'
            }),
            ...(params.status === 'FAILED' && {
                '#errorMessage': 'errorMessage'
            })
        };

        // Construct and execute the update command
        const updateParams = {
            TableName: emailLogTableName,
            Key: {
                'id': { S: params.messageId } 
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: ReturnValue.UPDATED_NEW  
        };

        await dynamoDBClient.send(new UpdateItemCommand(updateParams));
        console.log(`Successfully updated email status for messageId: ${params.messageId}`);

    } catch (error) {
        console.error('Error updating email status:', error);
        throw error;
    }
}

/**
 * Lambda handler function to process email messages from SQS queue
 * @param event - The SQS event containing messages to process
 * @param context - Lambda execution context
 * @returns Object containing any failed message IDs
 */
export async function handler(event: SQSEvent, context: Context) {
    console.log('Starting to process queue messages:', JSON.stringify(event));
    
    // Array to track failed message processing
    const batchItemFailures: { itemIdentifier: string }[] = [];
    
    // Process all messages in parallel using Promise.allSettled
    const results = await Promise.allSettled(
        event.Records.map(async (record: SQSRecord) => {
            try {
                // Parse the message from the queue
                const message: QueueMessage = JSON.parse(record.body);
                const { emailType, data } = message;
                console.log('message', message);

                console.log('data', data);

                console.log(`Processing ${emailType} email for ${data.recipient.email}`);

                // Ensure participantId and confirmationLink are not arrays
                if (Array.isArray(data.participantId) || Array.isArray(data.confirmationLink)) {
                    throw new Error('Arrays não são permitidos em processamento individual');
                }

                // Initialize email template and send the email
                await initializeTemplate(emailType, data.language || 'pt');
                const result = await sendEmailDirect(emailType, data);
                console.log('result', result);
                
                if (!result) {
                    // Update status as FAILED if email sending failed
                    await updateEmailStatus({
                        participantId: data.participantId,
                        eventId: data.eventId,
                        status: 'FAILED',
                        attempts: (message.attempts || 0) + 1,
                        errorMessage: 'Failed to send email',
                        messageId: record.messageId  // Using SQS messageId
                    });
                    
                    batchItemFailures.push({ itemIdentifier: record.messageId });
                    return false;
                }

                // Update status as SENT for successful email delivery
                await updateEmailStatus({
                    participantId: data.participantId,
                    eventId: data.eventId,
                    status: 'SENT',
                    attempts: (message.attempts || 0) + 1,
                    messageId: record.messageId 
                });

                console.log(`Email successfully sent to ${data.recipient.email}`);
                return true;
            } catch (error) {
                console.error('Error processing message:', error);
                
                try {
                    // Attempt to update status as FAILED in case of error
                    const message: QueueMessage = JSON.parse(record.body);
                    await updateEmailStatus({
                        participantId: message.data.participantId,
                        eventId: message.data.eventId,
                        status: 'FAILED',
                        attempts: (message.attempts || 0) + 1,
                        errorMessage: error instanceof Error ? error.message : String(error),
                        messageId: record.messageId  
                    });
                } catch (logError) {
                    console.error('Error logging failure:', logError);
                }
                
                batchItemFailures.push({ itemIdentifier: record.messageId });
                return false;
            }
        })
    );

    // Log summary of failed messages
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
        console.error(`${failed} messages failed during processing`);
    }

    // Return failed message IDs for SQS partial batch handling
    return {
        batchItemFailures
    };
}
