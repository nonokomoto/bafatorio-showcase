import { DynamoDBClient, UpdateItemCommand, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppSyncResolverHandler } from 'aws-lambda';
import { sendEmail } from "../send-email/emailService";
import { eventTimeToHHMM, formatEventDateForEmail, type EventDateLanguage } from '../shared/formatEventDate';
import { ensureEventWritable } from '../shared/entitlementGate';

const logger = new Logger({ serviceName: "confirmParticipant" });
const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// All roles can check in participants (per ACCESS_LEVELS_STRATEGY.md — PARTICIPANT_CHECKIN)
const ROLES_WITH_CHECKIN = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS', 'STAFF_CHECKIN']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

const isValidParticipantStatus = (status: string): boolean => {
  return ['CONFIRMED', 'REGISTERED', 'CANCELLED', 'ATTENDED'].includes(status);
};

const isValidDependentStatus = (status: string): boolean => {
  return ['REGISTERED', 'ATTENDED', 'NOT_ATTENDED'].includes(status);
};

/**
 * Verify the calling user has permission to check in participants for the given event.
 */
async function verifyCheckinAccess(userId: string, eventId: string): Promise<string> {
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
    if (ROLES_WITH_CHECKIN.has(role)) {
      return role;
    }
    throw new Error(`Access denied: Role ${role} cannot perform check-in`);
  }

  throw new Error('Access denied: You do not have permission to check in participants');
}

interface DependentUpdate {
  id: string;
  status: string;
  attendedDate?: string;
}

interface ConfirmParticipantArguments {
  eventId: string;
  participantId?: string;
  participantStatus?: string;
  attendedDate?: string;
  dependentUpdates?: DependentUpdate[] | string;
  language?: 'pt' | 'en' | 'fr';
}

interface ConfirmParticipantResponse {
  success: boolean;
  message: string;
  updatedDependentsCount?: number;
}

/**
 * Lambda handler for confirming participant/dependent presence.
 * Handles both participant status updates and batch dependent check-in.
 * Bypasses rules.owner() by accessing DynamoDB directly after access control verification.
 */
export const handler: AppSyncResolverHandler<ConfirmParticipantArguments, ConfirmParticipantResponse> = async (event) => {
  const { eventId, participantId, participantStatus, attendedDate, dependentUpdates, language } = event.arguments;

  // Extract userId from AppSync identity
  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;
  if (!userId) {
    return { success: false, message: 'User identity not found' };
  }

  if (!eventId) {
    return { success: false, message: 'Event ID is required' };
  }

  try {
    // Verify access control
    const userRole = await verifyCheckinAccess(userId, eventId);
    logger.info('Access verified for check-in', { eventId, userRole });

    // Gate de billing (§4): check-in é escrita e respeita a janela (o dia do
    // evento está sempre dentro de fim+30d, portanto nunca trava o uso legítimo).
    await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
    });

    // Parse dependent updates (can be JSON string or array from AppSync)
    const depUpdates: DependentUpdate[] = dependentUpdates
      ? (typeof dependentUpdates === 'string' ? JSON.parse(dependentUpdates) : dependentUpdates)
      : [];

    // Update participant if requested
    if (participantId && participantStatus) {
      if (!isValidParticipantStatus(participantStatus)) {
        return { success: false, message: `Invalid status: ${participantStatus}` };
      }

      const updateExprParts = ['participantStatus = :status', 'updatedAt = :now'];
      const exprValues: Record<string, string> = {
        ':status': participantStatus,
        ':now': new Date().toISOString(),
      };

      if (attendedDate) {
        updateExprParts.push('attendedDate = :attendedDate');
        exprValues[':attendedDate'] = attendedDate;
      }

      // ConditionExpression ensures participant belongs to the specified event
      exprValues[':eventId'] = eventId;
      await client.send(new UpdateItemCommand({
        TableName: PARTICIPANT_TABLE,
        Key: { id: { S: participantId } },
        UpdateExpression: `SET ${updateExprParts.join(', ')}`,
        ConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: marshall(exprValues),
      }));

      logger.info('Participant status updated', { participantId, participantStatus });

      // Send confirmation email if status is CONFIRMED
      if (participantStatus === 'CONFIRMED') {
        try {
          const participantResult = await client.send(new GetItemCommand({
            TableName: PARTICIPANT_TABLE,
            Key: { id: { S: participantId } },
          }));
          const participant = participantResult.Item ? unmarshall(participantResult.Item) : null;

          const eventResult = await client.send(new GetItemCommand({
            TableName: EVENT_TABLE,
            Key: marshall({ id: eventId }),
          }));
          const eventData = eventResult.Item ? unmarshall(eventResult.Item) : null;

          if (participant && eventData) {
            const lang = (language || (participant.language as string) || 'pt') as EventDateLanguage;
            const emailData = {
              recipient: {
                name: (participant.participantName as string) || '',
                email: (participant.participantEmail as string) || '',
              },
              eventName: (eventData.eventTitle as string) || '',
              participantId,
              eventId,
              eventDate: formatEventDateForEmail(eventData, lang),
              eventTime: eventTimeToHHMM(eventData.eventTime as string | null),
              eventLocation: (eventData.eventLocation as string) || '',
              eventManagerName: (eventData.eventManager as string) || '',
              eventManagerContact: [eventData.eventManagerPhone, eventData.eventManagerEmail].filter(Boolean).join(' / '),
              confirmationLink: '',
              language: lang,
            };

            await sendEmail('participantConfirmation' as any, emailData, 3);
            logger.info('Confirmation email sent', { participantId });
          }
        } catch (emailError) {
          logger.error('Failed to send confirmation email', { error: emailError, participantId });
          // Don't fail the whole operation if email fails
        }
      }
    }

    // Update dependents if requested
    let updatedDependentsCount = 0;
    if (depUpdates.length > 0) {
      for (const dep of depUpdates) {
        if (!dep.id || !dep.status) continue;
        if (!isValidDependentStatus(dep.status)) {
          logger.warn('Skipping invalid dependent status', { dependentId: dep.id, status: dep.status });
          continue;
        }

        const depUpdateParts = ['#st = :status', 'updatedAt = :now'];
        const depExprValues: Record<string, string> = {
          ':status': dep.status,
          ':now': new Date().toISOString(),
          ':eventId': eventId,
        };
        const depExprNames: Record<string, string> = { '#st': 'status' };

        if (dep.attendedDate) {
          depUpdateParts.push('attendedDate = :attendedDate');
          depExprValues[':attendedDate'] = dep.attendedDate;
        }

        try {
          // ConditionExpression ensures dependent belongs to the specified event
          await client.send(new UpdateItemCommand({
            TableName: DEPENDENT_TABLE,
            Key: { id: { S: dep.id } },
            UpdateExpression: `SET ${depUpdateParts.join(', ')}`,
            ConditionExpression: 'eventId = :eventId',
            ExpressionAttributeNames: depExprNames,
            ExpressionAttributeValues: marshall(depExprValues),
          }));
          updatedDependentsCount++;
        } catch (depError) {
          logger.error('Failed to update dependent', { dependentId: dep.id, error: depError });
        }
      }
      logger.info('Dependents updated', { count: updatedDependentsCount, total: depUpdates.length });
    }

    const messages: string[] = [];
    if (participantId && participantStatus) messages.push('Participante atualizado');
    if (updatedDependentsCount > 0) messages.push(`${updatedDependentsCount} acompanhante(s) atualizado(s)`);

    return {
      success: true,
      message: messages.join('. ') || 'Nenhuma alteração realizada',
      updatedDependentsCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isAccessDenied = errorMessage.startsWith('Access denied');

    logger.error('Error in confirmParticipant', { error: errorMessage, isAccessDenied });

    return {
      success: false,
      message: isAccessDenied ? 'Acesso negado' : 'Erro ao processar confirmação',
    };
  }
};
