import { Logger } from '@aws-lambda-powertools/logger';

import { cascadeDeleteEvent, emptyCounts } from '../shared/cascadeDeleteEvent';
import { fetchEventRecord, normalizeUserId } from '../shared/resolveEventAccess';

const logger = new Logger({ serviceName: 'deleteEventCascade' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';

const tables = {
  event: EVENT_TABLE,
  participant: process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '',
  dependent: process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '',
  eventSupplier: process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '',
  eventCollaborator: process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '',
  role: process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '',
  documentFolder: process.env.BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME || '',
  eventScheduleEntry: process.env.BAFATORIO_APP_EVENT_SCHEDULE_ENTRY_TABLE_NAME || '',
  notionDocument: process.env.BAFATORIO_APP_NOTION_DOCUMENT_TABLE_NAME || '',
  emailLog: process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || '',
};

const bucketName = process.env.BAFATORIO_APP_S3_BUCKET_NAME || '';

type HandlerEvent = {
  arguments: { eventId?: string | null };
  identity?: { sub?: string };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: HandlerEvent): Promise<any> => {
  const userId = event.identity?.sub;
  if (!userId) {
    throw new Error('User identity not found');
  }

  const eventId = event.arguments.eventId;
  if (!eventId) {
    throw new Error('eventId is required');
  }

  let eventRecord: Record<string, unknown>;
  try {
    eventRecord = await fetchEventRecord(EVENT_TABLE, eventId);
  } catch (error) {
    if ((error as Error).message === 'Event not found') {
      // Event gone = cascade already completed (ADR-035 §6) — idempotent success.
      logger.info('Event already deleted, nothing to do', { eventId, userId });
      return {
        success: true,
        deleted: emptyCounts(),
        failed: emptyCounts(),
        errors: [],
      };
    }
    throw error;
  }

  const eventOwner = normalizeUserId((eventRecord.owner as string) || '');
  if (eventOwner !== normalizeUserId(userId)) {
    logger.warn('Non-owner attempted event cascade delete', { eventId, userId });
    throw new Error('Unauthorized: only the event owner can delete an event');
  }

  logger.info('Starting event cascade delete', { eventId, userId });
  const result = await cascadeDeleteEvent({ eventId, tables, bucketName });
  logger.info('Event cascade delete finished', {
    eventId,
    userId,
    success: result.success,
    deleted: result.deleted,
    failed: result.failed,
    errorCount: result.errors.length,
  });

  return result;
};
