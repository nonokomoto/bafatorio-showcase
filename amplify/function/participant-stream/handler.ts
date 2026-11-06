import { DynamoDBStreamEvent, DynamoDBBatchResponse, Context } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "participantStreamHandler" });
const region = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || "";
const client = new DynamoDBClient({ region });

/**
 * Lambda handler for processing DynamoDB Stream events from Participant table.
 * Updates participantCount and totalRegistrations on the Event table
 * when participants are created or deleted.
 *
 * Uses reportBatchItemFailures to reduce retries. ATENÇÃO: isto NÃO evita
 * duplo-contagem. O Lambda faz checkpoint no MENOR sequence number reportado e
 * repete tudo a partir daí, incluindo registos já aplicados com sucesso; a
 * entrega é at-least-once e o `ADD` abaixo não é idempotente. Uma falha parcial
 * num eventId pode reincrementar os outros eventIds do mesmo batch.
 * https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-batchfailurereporting.html
 */
export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<DynamoDBBatchResponse> => {
  logger.addContext(context);
  logger.info("Processing Participant stream events", { recordCount: event.Records.length });

  // Aggregate changes per event to minimize DynamoDB writes
  const eventDeltas: Record<string, { participantDelta: number; totalDelta: number }> = {};
  // Track which records (by sequenceNumber) contribute to which eventId
  const recordsByEventId: Record<string, string[]> = {};
  // Track records that failed during parsing (to be retried)
  const failedRecordSequenceNumbers: string[] = [];

  for (const record of event.Records) {
    try {
      if (record.eventName === "INSERT" && record.dynamodb?.NewImage) {
        const newItem = unmarshall(record.dynamodb.NewImage as Record<string, any>);
        const eventId = newItem.eventId;

        if (!eventId) {
          logger.warn("INSERT record missing eventId, skipping", { keys: record.dynamodb?.Keys });
          continue;
        }

        if (!eventDeltas[eventId]) {
          eventDeltas[eventId] = { participantDelta: 0, totalDelta: 0 };
          recordsByEventId[eventId] = [];
        }
        eventDeltas[eventId].participantDelta += 1;
        eventDeltas[eventId].totalDelta += 1;
        if (record.dynamodb?.SequenceNumber) {
          recordsByEventId[eventId].push(record.dynamodb.SequenceNumber);
        }

        logger.info("Participant INSERT detected", { eventId, participantId: newItem.id });
      }

      // REMOVE events: counter decrements are handled by delete Lambdas directly.
      // We log for observability only — no counter updates to avoid double-decrement.
      if (record.eventName === "REMOVE" && record.dynamodb?.OldImage) {
        const oldItem = unmarshall(record.dynamodb.OldImage as Record<string, any>);
        logger.info("Participant REMOVE detected - counter update handled by delete Lambda", {
          participantId: oldItem.id,
          eventId: oldItem.eventId || 'unknown',
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
    if (deltas.participantDelta === 0 && deltas.totalDelta === 0) continue;

    try {
      const updateCommand = new UpdateItemCommand({
        TableName: EVENT_TABLE,
        Key: {
          id: { S: eventId },
        },
        UpdateExpression: 'ADD participantCount :pDelta, totalRegistrations :tDelta',
        ExpressionAttributeValues: {
          ':pDelta': { N: deltas.participantDelta.toString() },
          ':tDelta': { N: deltas.totalDelta.toString() },
        },
      });
      await client.send(updateCommand);
      logger.info("Successfully updated Event counts", {
        eventId,
        participantDelta: deltas.participantDelta,
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

  logger.info("Participant stream processing completed", { eventsUpdated: Object.keys(eventDeltas).length });
  return {
    batchItemFailures: failedSequenceNumbers.map(id => ({ itemIdentifier: id }))
  };
};
