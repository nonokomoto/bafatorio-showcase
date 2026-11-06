import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppSyncResolverHandler } from 'aws-lambda';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from 'crypto';

import { ensureEventWritable } from '../shared/entitlementGate';

interface CreateDependentArguments {
  name: string;
  age?: string;
  participantId: string;
  eventId: string;
  status?: string;
}

interface HandlerReturn {
  success: boolean;
  message: string;
  id: string | null;
  name: string | null;
  age: string | null;
  participantId: string | null;
  eventId: string | null;
  status: string | null;
}

const logger = new Logger({ serviceName: "createDependent" });
const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// Roles allowed to create dependents (per ACCESS_LEVELS_STRATEGY.md)
const ROLES_WITH_CREATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);
const VALID_AGES = new Set(['baby', 'child', 'adult']);
const VALID_STATUSES = new Set(['REGISTERED', 'ATTENDED', 'NOT_ATTENDED']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to create dependents for the given event.
 * Returns the user's role and the event owner ID (needed to set correct owner on dependent).
 */
async function verifyCreateAccess(userId: string, eventId: string): Promise<{ role: string; eventOwner: string }> {
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
  const eventOwner = eventRecord.owner as string;
  const normalizedOwner = normalizeUserId(eventOwner);

  if (normalizedOwner === userId) {
    return { role: 'OWNER', eventOwner };
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
    if (ROLES_WITH_CREATE.has(role)) {
      return { role, eventOwner };
    }
    throw new Error(`Access denied: Role ${role} cannot create dependents`);
  }

  throw new Error('Access denied: You do not have permission to create dependents');
}

/**
 * Main handler function for creating a dependent.
 * Bypasses owner authorization by accessing DynamoDB directly.
 * Sets event owner as record owner so the event owner retains full access.
 */
export const handler: AppSyncResolverHandler<CreateDependentArguments, HandlerReturn> = async (event) => {
  const { name, age, participantId, eventId, status } = event.arguments;

  const identity = event.identity;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;

  logger.info('Create dependent request received', { participantId, eventId, userId });

  if (!userId) {
    throw new Error('User identity not found');
  }

  try {
    if (!name) {
      throw new Error('Dependent name is required');
    }
    if (!participantId) {
      throw new Error('Participant ID is required');
    }
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    if (age && !VALID_AGES.has(age)) {
      throw new Error(`Invalid age value: ${age}. Must be one of: baby, child, adult`);
    }

    const dependentStatus = status || 'REGISTERED';
    if (!VALID_STATUSES.has(dependentStatus)) {
      throw new Error(`Invalid status: ${dependentStatus}`);
    }

    // Verify access control and get event owner
    const { role: userRole, eventOwner } = await verifyCreateAccess(userId, eventId);
    logger.info('Access verified', { userId, eventId, userRole });

    // Gate de billing (§4): janela de escrita. Dependents não contam para o
    // limite de participantes (o gate usa participantCount, não totalRegistrations).
    await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
    });

    // Verify participantId belongs to this event
    const participantResult = await client.send(new GetItemCommand({
      TableName: PARTICIPANT_TABLE,
      Key: marshall({ id: participantId }),
      ProjectionExpression: 'eventId',
    }));
    if (!participantResult.Item) {
      throw new Error(`Participant ${participantId} not found`);
    }
    const participantRecord = unmarshall(participantResult.Item);
    if (participantRecord.eventId !== eventId) {
      throw new Error('Access denied: Participant does not belong to the specified event');
    }

    // Build dependent record
    const now = new Date().toISOString();
    const dependentId = randomUUID();

    const dependent: Record<string, unknown> = {
      id: dependentId,
      name,
      age: age || undefined,
      participantId,
      eventId,
      status: dependentStatus,
      // Set event owner as record owner so they retain full access
      owner: eventOwner,
      createdAt: now,
      updatedAt: now,
      __typename: 'Dependent',
    };

    // Create dependent in DynamoDB
    await client.send(new PutItemCommand({
      TableName: DEPENDENT_TABLE,
      Item: marshall(dependent, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(id)',
    }));

    logger.info('Dependent created successfully', { dependentId, participantId });

    // Update participant's dependentsCount atomically
    try {
      await client.send(new UpdateItemCommand({
        TableName: PARTICIPANT_TABLE,
        Key: { id: { S: participantId } },
        UpdateExpression: 'ADD dependentsCount :delta',
        ExpressionAttributeValues: {
          ':delta': { N: '1' },
        },
      }));
      logger.info('Updated participant dependentsCount', { participantId });
    } catch (updateError) {
      logger.error('Error updating participant count', { error: updateError, participantId });
      // Don't fail the whole operation if count update fails
    }

    // Event counters (dependentCount, totalRegistrations) are updated by dependent-stream

    return {
      success: true,
      message: 'Dependent created successfully',
      id: dependentId,
      name,
      age: age || null,
      participantId,
      eventId,
      status: dependentStatus,
    };

  } catch (error) {
    logger.error('Error creating dependent', { error, participantId });
    throw new Error(`Failed to create dependent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
