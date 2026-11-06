import { DynamoDBStreamEvent, DynamoDBBatchResponse, Context } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "dependentStreamHandler" });
const region = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || "";
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || "";
const client = new DynamoDBClient({ region });

/**
 * Resolve eventId from a dependent record.
 * New dependents have eventId directly; older ones need a Participant lookup (fallback).
 */
async function resolveEventId(item: Record<string, unknown>): Promise<string | null> {
  // Direct read — new dependents have eventId denormalized
  if (item.eventId) {
    return item.eventId as string;
  }

  // Fallback — older dependents without eventId need a Participant lookup
  const participantId = item.participantId as string | undefined;
  if (!participantId) return null;

  try {
    const result = await client.send(new GetItemCommand({
      TableName: PARTICIPANT_TABLE,
      Key: { id: { S: participantId } },
      ProjectionExpression: 'eventId'
    }));

    if (result.Item) {
      const participant = unmarshall(result.Item);
      return participant.eventId || null;
    }

    logger.warn("Participant not found for fallback lookup", { participantId });
    return null;
  } catch (error) {
    logger.error("Error in fallback participant lookup", { participantId, error });
    return null;
  }
}

/**
 * Lambda handler for processing DynamoDB Stream events from Dependent table.
 * Updates dependentCount and totalRegistrations on the Event table
 * when dependents are created or deleted.
 *
 * Uses reportBatchItemFailures so only records whose eventId update failed
 * are retried — avoiding double-counting on successful eventIds.
 */
export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<DynamoDBBatchResponse> => {
  logger.addContext(context);
  logger.info("Processing Dependent stream events", { recordCount: event.Records.length });

  // Aggregate changes per event to minimize DynamoDB writes
  const eventDeltas: Record<string, { dependentDelta: number; totalDelta: number }> = {};
  // Track which records (by sequenceNumber) contribute to which eventId
  const recordsByEventId: Record<string, string[]> = {};
  // Track records that failed during parsing (to be retried)
  const failedRecordSequenceNumbers: string[] = [];

  for (const record of event.Records) {
    try {
      if (record.eventName === "INSERT" && record.dynamodb?.NewImage) {
        const newItem = unmarshall(record.dynamodb.NewImage as Record<string, any>);
        const dependentId = newItem.id;

        const eventId = await resolveEventId(newItem);
        if (!eventId) {
          logger.warn("Could not resolve eventId for dependent INSERT", {
            dependentId,
            participantId: newItem.participantId
          });
          continue;
        }

        if (!eventDeltas[eventId]) {
          eventDeltas[eventId] = { dependentDelta: 0, totalDelta: 0 };
          recordsByEventId[eventId] = [];
        }
        eventDeltas[eventId].dependentDelta += 1;
        eventDeltas[eventId].totalDelta += 1;
        if (record.dynamodb?.SequenceNumber) {
          recordsByEventId[eventId].push(record.dynamodb.SequenceNumber);
        }

        logger.info("Dependent INSERT detected", { eventId, dependentId });
      }

      // REMOVE events: counter decrements are handled by delete Lambdas directly.
      // We log for observability only — no counter updates to avoid double-decrement.
      if (record.eventName === "REMOVE" && record.dynamodb?.OldImage) {
        const oldItem = unmarshall(record.dynamodb.OldImage as Record<string, any>);
        logger.info("Dependent REMOVE detected - counter update handled by delete Lambda", {
          dependentId: oldItem.id,
          eventId: oldItem.eventId || 'unknown',
          participantId: oldItem.participantId
        });
      }
    } catch (error) {
      logger.error("Error processing record", { error, eventName: record.eventName });
      if (record.dynamodb?.SequenceNumber) {
        failedRecordSequenceNumbers.push(record.dynamodb.SequenceNumber);
      }
    }
  }

  // Apply aggregated deltas to each event, collecting failures
  const failedSequenceNumbers: string[] = [...failedRecordSequenceNumbers];

  for (const [eventId, deltas] of Object.entries(eventDeltas)) {
    if (deltas.dependentDelta === 0 && deltas.totalDelta === 0) continue;

    try {
      const updateCommand = new UpdateItemCommand({
        TableName: EVENT_TABLE,
        Key: {
          id: { S: eventId },
        },
        UpdateExpression: 'ADD dependentCount :dDelta, totalRegistrations :tDelta',
        ExpressionAttributeValues: {
          ':dDelta': { N: deltas.dependentDelta.toString() },
          ':tDelta': { N: deltas.totalDelta.toString() },
        },
      });
      await client.send(updateCommand);
      logger.info("Successfully updated Event counts", {
        eventId,
        dependentDelta: deltas.dependentDelta,
        totalDelta: deltas.totalDelta
      });
    } catch (error) {
      logger.error("Error updating Event counts - records will be retried", { eventId, deltas, error });
      failedSequenceNumbers.push(...(recordsByEventId[eventId] || []));
    }
  }

  if (failedSequenceNumbers.length > 0) {
    logger.warn("Reporting batch item failures for retry", { failedCount: failedSequenceNumbers.length });
  }

  logger.info("Dependent stream processing completed", { eventsUpdated: Object.keys(eventDeltas).length });
  return {
    batchItemFailures: failedSequenceNumbers.map(id => ({ itemIdentifier: id }))
  };
};
