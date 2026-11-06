import { DynamoDBClient, ScanCommand, BatchWriteItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { Schema } from '../../data/resource';

import { cascadeDeleteEvent, type CascadeDeleteTables } from '../shared/cascadeDeleteEvent';

const logger = new Logger({ serviceName: "deleteUserData" });

// Environment variables
const region = process.env.BAFATORIO_APP_REGION || 'eu-west-1';
const eventTableName = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const participantTableName = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const userSubscriptionTableName = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const paymentMethodTableName = process.env.BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME || '';
const invoiceTableName = process.env.BAFATORIO_APP_INVOICE_TABLE_NAME || '';
const dependentTableName = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const eventSupplierTableName = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const emailLogTableName = process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || '';
const supplierTableName = process.env.BAFATORIO_APP_SUPPLIER_TABLE_NAME || '';
const planPurchaseTableName = process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME || '';
const bucketName = process.env.BAFATORIO_APP_S3_BUCKET_NAME || '';

// Mapa de tabelas do cascade partilhado (ADR-035) — cobre TODAS as entidades
// filhas do evento, não só as três que a versão antiga apagava.
const cascadeTables: CascadeDeleteTables = {
    event: eventTableName,
    participant: participantTableName,
    dependent: dependentTableName,
    eventSupplier: eventSupplierTableName,
    eventCollaborator: process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '',
    role: process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '',
    documentFolder: process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME || '',
    eventScheduleEntry: process.env.BAFATORIO_APP_EVENT_SCHEDULE_ENTRY_TABLE_NAME || '',
    notionDocument: process.env.BAFATORIO_APP_NOTION_DOCUMENT_TABLE_NAME || '',
    emailLog: emailLogTableName,
};

// Validate environment variables
const requiredEnvVars = [
    region,
    eventTableName,
    participantTableName,
    userSubscriptionTableName,
    paymentMethodTableName,
    invoiceTableName,
    bucketName
];

if (requiredEnvVars.some(v => !v)) {
    throw new Error("Missing required environment variables");
}

// Tabela em falta = deletion silenciosamente saltada — avisar no arranque.
Object.entries({ ...cascadeTables, supplier: supplierTableName }).forEach(([key, name]) => {
    if (!name) {
        logger.warn(`Table for '${key}' not configured - will skip deletion for this table type`);
    }
});

const dynamoClient = new DynamoDBClient({ region });

// Batch size for DynamoDB operations
const BATCH_SIZE = 25;
const MAX_RETRIES = 3;

interface DeleteResult {
    deleted: number;
    failed: number;
    errors: string[];
}

export const handler: Schema["deleteUserData"]["functionHandler"] = async (event) => {
    logger.info("Received request to delete user data", { sub: event.arguments.sub });

    if (!event.arguments.sub) {
        logger.error("Invalid input: sub is required");
        return false;
    }

    // Um utilizador só pode apagar a PRÓPRIA conta. Sem esta verificação,
    // qualquer autenticado passava o sub de outro (obtido, p.ex., via
    // getEventCollaborators) e destruía-lhe a conta inteira em cascade.
    const callerSub = event.identity && 'sub' in event.identity ? event.identity.sub : undefined;
    if (!callerSub || callerSub !== event.arguments.sub) {
        logger.error("Forbidden: caller sub does not match requested sub", {
            callerSub,
            requestedSub: event.arguments.sub,
        });
        return false;
    }

    const sub = event.arguments.sub;
    const errors: string[] = [];

    try {
        // Step 1: Get all user events first (needed for cascade deletion)
        const userEvents = await getUserOwnedItems(eventTableName, sub);
        logger.info(`Found ${userEvents.length} events owned by user`);

        // Step 2: Cascade completo por evento (módulo partilhado, ADR-035):
        // filhos → S3 do evento → registo Event. O Event só desaparece em
        // sucesso total, por isso NÃO há sweep direto da tabela Event abaixo.
        for (const eventItem of userEvents) {
            const eventId = eventItem.id?.S;
            if (eventId) {
                try {
                    const cascadeResult = await cascadeDeleteEvent({
                        eventId,
                        tables: cascadeTables,
                        bucketName,
                    });
                    if (!cascadeResult.success) {
                        errors.push(`Cascade delete incomplete for event ${eventId}: ${cascadeResult.errors.join('; ')}`);
                    }
                } catch (error) {
                    const errorMsg = `Failed to cascade delete for event ${eventId}: ${error}`;
                    logger.error(errorMsg);
                    errors.push(errorMsg);
                }
            }
        }

        // Step 3: Delete user's direct data
        const deletionTasks = [
            { name: 'participants', task: () => deleteUserOwnedItems(participantTableName, sub) },
            { name: 'subscriptions', task: () => deleteUserOwnedItems(userSubscriptionTableName, sub) },
            { name: 'payment methods', task: () => deleteUserOwnedItems(paymentMethodTableName, sub) },
            // Registos financeiros: anonimizar, não apagar. Sustentam a
            // reconciliação com a Stripe e a prova de consumo compra→evento
            // (ADR-034); apagá-los destruía o rasto, mantê-los com titular era
            // reter dados pessoais depois de um pedido de eliminação.
            { name: 'invoices (anonimizadas)', task: () => anonymizeUserOwnedItems(invoiceTableName, sub) },
            { name: 'plan purchases (anonimizadas)', task: () => anonymizeUserOwnedItems(planPurchaseTableName, sub) },
            { name: 'suppliers', task: () => deleteUserOwnedItems(supplierTableName, sub) },
            { name: 'email logs', task: () => deleteUserOwnedItems(emailLogTableName, sub) },
        ];

        // Execute deletion tasks
        for (const { name, task } of deletionTasks) {
            try {
                const result = await task();
                logger.info(`Deleted ${name}`, { deleted: result.deleted, failed: result.failed });
                if (result.failed > 0) {
                    errors.push(...result.errors);
                }
            } catch (error) {
                const errorMsg = `Failed to delete ${name}: ${error}`;
                logger.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // Os prefixos por identidade (profile-pictures/, documents/) são limpos
        // pelo cliente antes desta chamada: o IAM da Identity Pool escopa-os por
        // ${cognito-identity.amazonaws.com:sub}, portanto ninguém consegue
        // apontá-los ao prefixo de outra pessoa (issue #162). O S3 dos eventos
        // do dono continua aqui, apagado pelo cascade por eventId.

        // Final result
        const success = errors.length === 0;
        if (success) {
            logger.info("User data deleted successfully", { sub });
        } else {
            logger.warn("User data deletion completed with errors", { sub, errorCount: errors.length, errors });
        }

        return success;
    } catch (error) {
        logger.error("Fatal error deleting user data", { error, sub });
        return false;
    }
};

/**
 * Get all items owned by user from a table
 */
async function getUserOwnedItems(tableName: string, sub: string): Promise<any[]> {
    const items: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
        const scanParams = {
            TableName: tableName,
            // Check for both formats: "sub" and "sub::sub"
            FilterExpression: "#ownerAttr = :userSub OR contains(#ownerAttr, :userSubPattern)",
            ExpressionAttributeNames: { "#ownerAttr": "owner" },
            ExpressionAttributeValues: { 
                ":userSub": { S: sub },
                ":userSubPattern": { S: `${sub}::` }
            },
            ExclusiveStartKey: lastEvaluatedKey
        };

        const response = await dynamoClient.send(new ScanCommand(scanParams));
        if (response.Items) {
            items.push(...response.Items);
        }
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    logger.info(`Found ${items.length} items owned by user in table ${tableName}`);
    return items;
}





/**
 * Delete user owned items from a table with improved error handling
 */
/**
 * Anonimiza (em vez de apagar) os registos de um utilizador numa tabela.
 *
 * Tira o que identifica a pessoa — `owner` e `userId` — e deixa o resto: valor,
 * moeda, ids da Stripe e datas. O registo deixa de ser dado pessoal e continua
 * a servir para reconciliar com a Stripe e para provar que uma compra foi
 * consumida por um evento (ADR-034).
 *
 * `owner` é o mesmo campo por onde a query encontra os itens, logo cada item é
 * anonimizado uma vez: depois do UPDATE deixa de aparecer no scan seguinte.
 */
async function anonymizeUserOwnedItems(tableName: string, sub: string): Promise<DeleteResult> {
    const result: DeleteResult = { deleted: 0, failed: 0, errors: [] };
    if (!tableName) {
        logger.warn('Anonymization skipped - table not configured');
        return result;
    }

    const now = new Date().toISOString();
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
        const scanResponse = await dynamoClient.send(new ScanCommand({
            TableName: tableName,
            FilterExpression: "#ownerAttr = :userSub OR contains(#ownerAttr, :userSubPattern)",
            ExpressionAttributeNames: { "#ownerAttr": "owner" },
            ExpressionAttributeValues: {
                ":userSub": { S: sub },
                ":userSubPattern": { S: `${sub}::` },
            },
            ProjectionExpression: "id",
            ExclusiveStartKey: lastEvaluatedKey,
        }));

        for (const item of scanResponse.Items ?? []) {
            try {
                await dynamoClient.send(new UpdateItemCommand({
                    TableName: tableName,
                    Key: { id: item.id },
                    UpdateExpression: 'SET anonymizedAt = :now, updatedAt = :now REMOVE #ownerAttr, userId',
                    ExpressionAttributeNames: { '#ownerAttr': 'owner' },
                    ExpressionAttributeValues: { ':now': { S: now } },
                    // Corrida com outra via de eliminação: sem isto, um UPDATE
                    // sobre um item já apagado recriava-o só com o carimbo.
                    ConditionExpression: 'attribute_exists(id)',
                }));
                result.deleted += 1;
            } catch (error) {
                result.failed += 1;
                result.errors.push(`${tableName}: failed to anonymize ${item.id?.S} - ${error}`);
            }
        }

        lastEvaluatedKey = scanResponse.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return result;
}

async function deleteUserOwnedItems(tableName: string, sub: string): Promise<DeleteResult> {
    const result: DeleteResult = { deleted: 0, failed: 0, errors: [] };
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
        const scanParams = {
            TableName: tableName,
            // Check for both formats: "sub" and "sub::sub"
            FilterExpression: "#ownerAttr = :userSub OR contains(#ownerAttr, :userSubPattern)",
            ExpressionAttributeNames: { "#ownerAttr": "owner" },
            ExpressionAttributeValues: { 
                ":userSub": { S: sub },
                ":userSubPattern": { S: `${sub}::` }
            },
            ProjectionExpression: "id",
            ExclusiveStartKey: lastEvaluatedKey
        };

        const scanResponse = await dynamoClient.send(new ScanCommand(scanParams));

        if (scanResponse.Items && scanResponse.Items.length > 0) {
            const batchResult = await batchDeleteItems(tableName, scanResponse.Items);
            result.deleted += batchResult.deleted;
            result.failed += batchResult.failed;
            result.errors.push(...batchResult.errors);
        }

        lastEvaluatedKey = scanResponse.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return result;
}

/**
 * Batch delete items with retry logic
 */
async function batchDeleteItems(tableName: string, items: any[]): Promise<DeleteResult> {
    const result: DeleteResult = { deleted: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);
        const deleteRequests = chunk.map(item => ({
            DeleteRequest: { Key: { "id": item.id } }
        }));

        let attempt = 0;
        let unprocessedItems: { DeleteRequest: { Key: { id: any } } }[] = deleteRequests;

        while (unprocessedItems.length > 0 && attempt < MAX_RETRIES) {
            try {
                const batchWriteParams = {
                    RequestItems: {
                        [tableName]: unprocessedItems
                    }
                };

                const response = await dynamoClient.send(new BatchWriteItemCommand(batchWriteParams));
                
                const processed = unprocessedItems.length - (response.UnprocessedItems?.[tableName]?.length || 0);
                result.deleted += processed;

                // Type assertion to handle the AWS SDK type mismatch
                unprocessedItems = (response.UnprocessedItems?.[tableName] || []) as { DeleteRequest: { Key: { id: any } } }[];
                
                if (unprocessedItems.length > 0) {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
                }
                
                attempt++;
            } catch (error) {
                logger.error(`Batch delete failed for ${tableName}`, { error, attempt });
                result.failed += unprocessedItems.length;
                result.errors.push(`Batch delete failed: ${error}`);
                break;
            }
        }

        // Handle final unprocessed items
        if (unprocessedItems.length > 0) {
            result.failed += unprocessedItems.length;
            result.errors.push(`${unprocessedItems.length} items failed after ${MAX_RETRIES} retries`);
        }
    }

    return result;
}
