import { DynamoDBClient, GetItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppSyncResolverHandler } from 'aws-lambda';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import { ensureEventWritable } from '../shared/entitlementGate';

interface UpdateDependentArguments {
  id: string;
  name?: string;
  age?: string;
}

interface DependentResult {
  id: string;
  name?: string;
  age?: string;
  participantId?: string;
  eventId?: string;
  status?: string;
  attendedDate?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
}

const logger = new Logger({ serviceName: "updateDependent" });
const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// Roles allowed to update dependents (same as PARTICIPANT_UPDATE per ACCESS_LEVELS_STRATEGY.md)
const ROLES_WITH_UPDATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

// Validation constants (bypass AppSync enum enforcement since we write directly to DynamoDB)
const VALID_AGE_VALUES = new Set(['baby', 'child', 'adult']);
const MAX_NAME_LENGTH = 200;

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to update dependents for the given event.
 */
async function verifyUpdateAccess(userId: string, eventId: string): Promise<string> {
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
    if (ROLES_WITH_UPDATE.has(role)) {
      return role;
    }
    throw new Error(`Access denied: Role ${role} cannot update dependents`);
  }

  throw new Error('Access denied: You do not have permission to update dependents');
}

/**
 * Lambda handler for updating a dependent.
 * Bypasses rules.owner() by accessing DynamoDB directly after access control verification.
 */
export const handler: AppSyncResolverHandler<UpdateDependentArguments, DependentResult> = async (event) => {
  const { id, name, age } = event.arguments;

  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;

  logger.info('Update dependent request received', { dependentId: id, userId });

  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!id) {
    throw new Error('Dependent ID is required');
  }

  // Validate inputs (bypasses AppSync type enforcement since we write directly to DynamoDB)
  if (name != null && name.length > MAX_NAME_LENGTH) {
    throw new Error(`Dependent name exceeds maximum length of ${MAX_NAME_LENGTH}`);
  }
  if (age != null && !VALID_AGE_VALUES.has(age)) {
    throw new Error(`Invalid age value: ${age}. Must be one of: baby, child, adult`);
  }

  try {
    // Get the dependent to retrieve eventId for access check
    const getResult = await client.send(new GetItemCommand({
      TableName: DEPENDENT_TABLE,
      Key: marshall({ id }),
    }));

    if (!getResult.Item) {
      throw new Error('Dependent not found');
    }

    const dependent = unmarshall(getResult.Item);
    const eventId = dependent.eventId as string | undefined;

    if (!eventId) {
      throw new Error('Dependent is missing eventId - cannot verify access');
    }

    // Verify access control
    const userRole = await verifyUpdateAccess(userId, eventId);
    logger.info('Access verified', { userId, eventId, userRole });

    // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
    await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
    });

    // Build dynamic update expression
    const updateParts: string[] = ['updatedAt = :now'];
    const exprValues: Record<string, unknown> = {
      ':now': new Date().toISOString(),
    };
    const exprNames: Record<string, string> = {};

    if (name != null) {
      updateParts.push('#name = :name');
      exprValues[':name'] = name;
      exprNames['#name'] = 'name';
    }

    if (age != null) {
      updateParts.push('#age = :age');
      exprValues[':age'] = age;
      exprNames['#age'] = 'age';
    }

    // Execute the update
    const updateResult = await client.send(new UpdateItemCommand({
      TableName: DEPENDENT_TABLE,
      Key: marshall({ id }),
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeValues: marshall(exprValues),
      ExpressionAttributeNames: Object.keys(exprNames).length > 0 ? exprNames : undefined,
      ReturnValues: 'ALL_NEW',
    }));

    if (!updateResult.Attributes) {
      throw new Error('Failed to update dependent');
    }

    const updated = unmarshall(updateResult.Attributes);
    logger.info('Dependent updated successfully', { dependentId: id });

    return {
      id: updated.id as string,
      name: updated.name as string | undefined,
      age: updated.age as string | undefined,
      participantId: updated.participantId as string | undefined,
      eventId: updated.eventId as string | undefined,
      status: updated.status as string | undefined,
      attendedDate: updated.attendedDate as string | undefined,
      owner: updated.owner as string | undefined,
      createdAt: updated.createdAt as string | undefined,
      updatedAt: updated.updatedAt as string | undefined,
    };

  } catch (error) {
    logger.error('Error updating dependent', { error, dependentId: id });
    throw new Error(`Failed to update dependent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
