import { DynamoDBClient, BatchWriteItemCommand, QueryCommand, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppSyncResolverHandler } from 'aws-lambda';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import { ensureEventWritable } from '../shared/entitlementGate';

// Define Nullable type
type Nullable<T> = T | null;

// Update event interface to match AppSync types
interface DeleteMultipleParticipantsArguments {
  participantIds?: Nullable<string>[] | null;
}

interface DeleteResult {
  successfulIds: string[];
  failedIds: string[];
}

const logger = new Logger({ serviceName: "deleteMultipleParticipants" });
const client = new DynamoDBClient({ region: 'eu-west-1' });

// DynamoDB table names
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// Roles allowed to delete participants (per ACCESS_LEVELS_STRATEGY.md)
const ROLES_WITH_DELETE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to delete participants for the given event.
 * Checks event ownership first, then collaborator role.
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

  // Check collaborator table
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
    throw new Error(`Access denied: Role ${role} cannot delete participants`);
  }

  throw new Error('Access denied: You do not have permission to delete participants');
}

// Configuration constants
const BATCH_SIZE = 25; // DynamoDB BatchWrite limit
const MAX_RETRIES = 3; // Maximum retry attempts for failed operations
const MAX_CONCURRENT_BATCHES = 4; // Maximum parallel batch operations

/**
 * Fetches all dependent IDs for given participant IDs
 * Uses batch processing and parallel queries for efficiency
 */
async function getDependentsForParticipants(participantIds: string[]): Promise<string[]> {
  let dependentIds: string[] = [];
  
  // Process in batches to avoid DynamoDB limits
  for (let i = 0; i < participantIds.length; i += BATCH_SIZE) {
    const batchIds = participantIds.slice(i, i + BATCH_SIZE);
    
    // Create parallel queries for each participantId in the batch
    const batchQueries = batchIds.map(participantId => 
      client.send(new QueryCommand({
        TableName: DEPENDENT_TABLE,
        IndexName: 'gsi-Participant.dependents',
        KeyConditionExpression: 'participantId = :pid',
        ExpressionAttributeValues: {
          ':pid': { S: participantId }
        },
        ProjectionExpression: 'id'
      }))
    );

    // Execute queries in parallel
    const results = await Promise.all(batchQueries);
    
    // Extract dependent IDs from results
    results.forEach(result => {
      const ids = result.Items?.map(item => item.id.S).filter((id): id is string => !!id) || [];
      dependentIds.push(...ids);
    });
  }

  return dependentIds;
}

/**
 * Deletes a batch of items with retry logic
 * Implements exponential backoff for retries
 */
async function deleteBatchWithRetry(
  tableName: string,
  items: string[], 
  retryCount = 0
): Promise<DeleteResult> {
  // Create delete requests for each item
  const deleteRequests = items.map(id => ({
    DeleteRequest: {
      Key: { "id": { S: id } }
    }
  }));

  try {
    // Execute batch delete operation
    const response = await client.send(new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: deleteRequests
      }
    }));

    // Extract unprocessed items from response
    const unprocessedIds = response.UnprocessedItems?.[tableName]
      ?.map(item => item.DeleteRequest?.Key?.id?.S)
      .filter((id): id is string => !!id) || [];

    // Retry unprocessed items if any and if retries not exhausted
    if (unprocessedIds.length > 0 && retryCount < MAX_RETRIES) {
      // Exponential backoff delay
      await new Promise(resolve => 
        setTimeout(resolve, Math.min(100 * Math.pow(2, retryCount), 2000))
      );
      
      // Retry unprocessed items
      const retryResult = await deleteBatchWithRetry(tableName, unprocessedIds, retryCount + 1);
      
      return {
        successfulIds: [
          ...items.filter(id => !unprocessedIds.includes(id)),
          ...retryResult.successfulIds
        ],
        failedIds: retryResult.failedIds
      };
    }

    // Return results
    return {
      successfulIds: items.filter(id => !unprocessedIds.includes(id)),
      failedIds: unprocessedIds
    };
  } catch (error) {
    logger.error('Error processing batch', { error, items });
    return { successfulIds: [], failedIds: items };
  }
}

/**
 * Processes deletions in controlled parallel batches
 * Manages concurrent operations to avoid throttling
 */
async function processDeletes(tableName: string, ids: string[]): Promise<DeleteResult> {
  // Split ids into batches
  const batches = ids.reduce((acc: string[][], id, i) => {
    const batchIndex = Math.floor(i / BATCH_SIZE);
    if (!acc[batchIndex]) acc[batchIndex] = [];
    acc[batchIndex].push(id);
    return acc;
  }, []);

  let successfulIds: string[] = [];
  let failedIds: string[] = [];

  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
    const batchPromises = currentBatches.map(batch => 
      deleteBatchWithRetry(tableName, batch)
    );

    // Execute current batch of promises
    const results = await Promise.all(batchPromises);

    // Collect results
    results.forEach(result => {
      successfulIds.push(...result.successfulIds);
      failedIds.push(...result.failedIds);
    });

    // Add delay between batch groups to avoid throttling
    if (i + MAX_CONCURRENT_BATCHES < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { successfulIds, failedIds };
}

/**
 * Main Lambda handler
 * Orchestrates the deletion of participants and their dependents
 * @param event - The event containing participant IDs to delete
 * @returns Array of successfully deleted participant IDs (or null for failed deletions)
 */
export const handler: AppSyncResolverHandler<
  DeleteMultipleParticipantsArguments,
  Nullable<string>[] | null
> = async (event) => {
  const startTime = Date.now();

  // Extract userId from AppSync identity
  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;
  if (!userId) {
    throw new Error('User identity not found');
  }

  // Safely handle potentially undefined or null participantIds
  const inputIds = event.arguments.participantIds || [];
  logger.info("Starting deletion process", { participantCount: inputIds.length, userId });

  // Filter and validate participant IDs
  const participantIds = inputIds.filter((id): id is string => 
    typeof id === 'string' && id !== '' && id !== null
  );

  if (participantIds.length === 0) {
    return [];
  }

  try {
    // 0. Resolve eventId BEFORE deleting anything (all participants belong to same event)
    let eventId: string | null = null;
    try {
      const result = await client.send(new GetItemCommand({
        TableName: PARTICIPANT_TABLE,
        Key: { id: { S: participantIds[0] } },
        ProjectionExpression: 'eventId'
      }));
      if (result.Item) {
        const participant = unmarshall(result.Item);
        eventId = participant.eventId || null;
      }
    } catch (lookupError) {
      logger.error("Failed to resolve eventId from participant", { participantId: participantIds[0], lookupError });
    }

    if (!eventId) {
      logger.error("Could not resolve eventId - aborting to prevent counter drift", {
        firstParticipantId: participantIds[0]
      });
      throw new Error("Could not resolve eventId from participant. Deletion aborted.");
    }
    logger.info("Resolved eventId for counter update", { eventId });

    // 0b. Verify user has permission to delete participants for this event
    const userRole = await verifyDeleteAccess(userId, eventId);
    logger.info("Access verified", { userId, eventId, userRole });

    // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
    await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
    });

    // 1. Fetch all dependent IDs for the participants
    const dependentIds = await getDependentsForParticipants(participantIds);
    logger.info("Found dependents", { dependentCount: dependentIds.length });

    // 2. Delete dependents first
    let deletedDependentCount = 0;
    if (dependentIds.length > 0) {
      const dependentResult = await processDeletes(DEPENDENT_TABLE, dependentIds);
      deletedDependentCount = dependentResult.successfulIds.length;
      logger.info("Dependent deletion complete", {
        successful: dependentResult.successfulIds.length,
        failed: dependentResult.failedIds.length
      });
    }

    // 3. Delete participants
    const participantResult = await processDeletes(PARTICIPANT_TABLE, participantIds);
    const deletedParticipantCount = participantResult.successfulIds.length;

    // 4. Directly update Event counters (atomic ADD with negative deltas)
    //    Stream handlers skip REMOVE counter updates to avoid double-counting.
    if (deletedParticipantCount > 0 || deletedDependentCount > 0) {
      const totalDelta = -(deletedParticipantCount + deletedDependentCount);
      try {
        await client.send(new UpdateItemCommand({
          TableName: EVENT_TABLE,
          Key: { id: { S: eventId } },
          UpdateExpression: 'ADD participantCount :pDelta, dependentCount :dDelta, totalRegistrations :tDelta',
          ExpressionAttributeValues: {
            ':pDelta': { N: (-deletedParticipantCount).toString() },
            ':dDelta': { N: (-deletedDependentCount).toString() },
            ':tDelta': { N: totalDelta.toString() },
          },
        }));
        logger.info("Event counters updated directly", {
          eventId,
          participantDelta: -deletedParticipantCount,
          dependentDelta: -deletedDependentCount,
          totalDelta
        });
      } catch (counterError) {
        logger.error("Failed to update event counters - manual reconciliation needed", {
          eventId, counterError,
          expectedParticipantDelta: -deletedParticipantCount,
          expectedDependentDelta: -deletedDependentCount
        });
      }
    }

    // Log completion metrics
    const duration = Date.now() - startTime;
    logger.info("Deletion process completed", {
      totalParticipants: participantIds.length,
      successfulDeletions: participantResult.successfulIds.length,
      failedDeletions: participantResult.failedIds.length,
      durationMs: duration
    });

    // Return results mapping (null for failed deletions)
    return participantIds.map(id =>
      participantResult.successfulIds.includes(id) ? id : null
    );

  } catch (error) {
    logger.error("Fatal error during deletion process", { error });
    throw error;
  }
};
