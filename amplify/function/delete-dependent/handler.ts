import { DynamoDBClient, DeleteItemCommand, GetItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppSyncResolverHandler } from 'aws-lambda';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import { ensureEventWritable } from '../shared/entitlementGate';

interface DeleteDependentArguments {
  id: string;
}

interface HandlerReturn {
  success: boolean;
  message: string;
}

const logger = new Logger({ serviceName: "deleteDependent" });
const client = new DynamoDBClient({ region: 'eu-west-1' });

const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// Roles allowed to delete dependents (per ACCESS_LEVELS_STRATEGY.md — same as PARTICIPANT_DELETE)
const ROLES_WITH_DELETE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to delete dependents for the given event.
 */
async function verifyDeleteAccess(userId: string, eventId: string): Promise<string> {
  const eventResult = await client.send(new GetItemCommand({
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

  const collabResult = await client.send(new QueryCommand({
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
    if (ROLES_WITH_DELETE.has(role)) {
      return role;
    }
    throw new Error(`Access denied: Role ${role} cannot delete dependents`);
  }

  throw new Error('Access denied: You do not have permission to delete dependents');
}

/**
 * Main handler function for deleting a dependent
 * This bypasses owner authorization checks by accessing DynamoDB directly
 */
export const handler: AppSyncResolverHandler<DeleteDependentArguments, HandlerReturn> = async (event) => {
  const { id } = event.arguments;
  
  // Extract userId safely - only Cognito identity has 'sub'
  const identity = event.identity;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;
  
  logger.info('Delete dependent request received', {
    dependentId: id,
    userId
  });

  if (!userId) {
    throw new Error('User identity not found');
  }

  try {
    // Validate input
    if (!id) {
      throw new Error('Dependent ID is required');
    }

    // First, get the dependent to retrieve participantId
    const getResult = await client.send(new GetItemCommand({
      TableName: DEPENDENT_TABLE,
      Key: {
        id: { S: id }
      }
    }));

    // Handle case where dependent doesn't exist
    // Return generic message that doesn't reveal whether the ID ever existed
    if (!getResult.Item) {
      logger.info('Dependent not found or already deleted', { dependentId: id, userId });
      return {
        success: false,
        message: 'Dependent not found or access denied'
      };
    }

    const dependent = unmarshall(getResult.Item);
    const participantId = dependent.participantId;

    logger.info('Found dependent to delete', {
      dependentId: id,
      participantId,
      dependentName: dependent.name
    });

    // Verify access control before deleting
    const eventId = dependent.eventId as string | undefined;
    if (!eventId) {
      throw new Error('Dependent is missing eventId - cannot verify access');
    }
    const userRole = await verifyDeleteAccess(userId!, eventId);
    logger.info('Access verified', { userId, eventId, userRole });

    // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
    await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
    });

    // Delete the dependent
    await client.send(new DeleteItemCommand({
      TableName: DEPENDENT_TABLE,
      Key: {
        id: { S: id }
      }
    }));

    logger.info('Dependent deleted successfully', { dependentId: id });

    // Update Event counters (dependentCount and totalRegistrations)
    // eventId is already validated by verifyDeleteAccess above
    try {
      await client.send(new UpdateItemCommand({
        TableName: EVENT_TABLE,
        Key: { id: { S: eventId } },
        UpdateExpression: 'ADD dependentCount :dDelta, totalRegistrations :tDelta',
        ExpressionAttributeValues: {
          ':dDelta': { N: '-1' },
          ':tDelta': { N: '-1' },
        },
      }));
      logger.info('Updated Event counters for dependent deletion', { eventId });
    } catch (eventUpdateError) {
      logger.error('Error updating Event counters', { error: eventUpdateError, eventId });
    }

    // Update participant's dependentsCount atomically if participantId exists
    if (participantId) {
      try {
        await client.send(new UpdateItemCommand({
          TableName: PARTICIPANT_TABLE,
          Key: { id: { S: participantId } },
          UpdateExpression: 'ADD dependentsCount :delta',
          ExpressionAttributeValues: {
            ':delta': { N: '-1' },
          },
        }));

        logger.info('Updated participant dependentsCount (atomic)', { participantId });
      } catch (updateError) {
        logger.error('Error updating participant count', {
          error: updateError,
          participantId
        });
        // Don't fail the whole operation if count update fails
      }
    }

    return {
      success: true,
      message: 'Dependent deleted successfully'
    };

  } catch (error) {
    logger.error('Error deleting dependent', { 
      error, 
      dependentId: id 
    });
    
    throw new Error(`Failed to delete dependent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
