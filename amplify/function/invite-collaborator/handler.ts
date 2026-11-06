/**
 * @file invite-collaborator/handler.ts
 * @description Lambda function to invite collaborators to an event
 * Implements ACCESS_LEVELS_STRATEGY.md invitation rules:
 * - OWNER can invite CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS
 * - CO_MANAGER can only invite STAFF_CHECKIN, STAFF_LOGISTICS
 * - STAFF cannot invite anyone
 *
 * Follows ADR-013 pattern for DynamoDB owner keys (userId::userId)
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { eventTimeToHHMM, formatEventDateForEmail, type EventDateLanguage } from '../shared/formatEventDate';
import { getUserEmail } from '../shared/getUserEmail';

// Types
type CollaboratorRole = 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';

interface InviteCollaboratorArgs {
  eventId: string;
  email: string;
  role: CollaboratorRole;
  sharedFolderIds?: string[];
  sharedSupplierIds?: string[];
  language?: 'pt' | 'en' | 'fr';
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userEmail: string;
  role: CollaboratorRole;
  sharedFolderIds: string[];
  sharedSupplierIds: string[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedBy: string;
  invitedAt: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats.
 * Ensures consistent owner comparison across all Lambda handlers.
 * @see get-event-as-collaborator/handler.ts for canonical implementation
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

// Clients
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});
const sqsClient = new SQSClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Environment variables
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const USER_POOL_ID = process.env.BAFATORIO_APP_USER_POOL_ID || '';
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL || '';
const EMAIL_LOG_TABLE_NAME = process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || '';
const APP_BASE_URL = process.env.BAFATORIO_APP_BASE_URL || 'https://bafatorio.com';

/**
 * Redacts email for logging (shows first 3 chars + domain)
 * Example: john.doe@example.com -> joh***@example.com
 */
const redactEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.substring(0, 3)}***@${domain}`;
};

/**
 * Main handler for inviting collaborators
 */
export const handler = async (
  event: AppSyncResolverEvent<InviteCollaboratorArgs>
): Promise<EventCollaborator> => {
  const { eventId, email, role, sharedFolderIds, sharedSupplierIds, language } = event.arguments;
  const lang: 'pt' | 'en' | 'fr' = (language as 'pt' | 'en' | 'fr') || 'pt';

  // 1. Extract inviter identity (following ADR-013 pattern)
  const identity = event.identity as {
    sub?: string;
    username?: string;
    claims?: { sub?: string; username?: string };
  };
  const inviterId = identity?.sub || identity?.claims?.sub;
  // O AdminGetUser é indexado pelo Username, não pelo sub.
  const inviterUsername = identity?.claims?.username || identity?.username || inviterId;

  if (!inviterId) {
    console.error('Identity error: owner not found in request context');
    throw new Error('User identity not found');
  }

  // Format owner for Amplify Gen 2 storage pattern (userId::userId) — used for DynamoDB writes
  const inviterOwner = `${inviterId}::${inviterId}`;

  console.log(
    `[inviteCollaborator] Invite request: ${redactEmail(email)} as ${role} to event ${eventId} by ${inviterId}`
  );

  // 2. Validate email format
  const emailLower = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    throw new Error('Invalid email format');
  }

  // 3. Prevent self-invite — check if inviter's event owner email matches invitee
  // (Full check done after fetching event, but we need the event first to get owner email)

  // 4. Verify inviter has permission to invite this role
  let isOwner = false;
  let eventDetails: any = null;

  // First, try to fetch event to check if inviter is owner
  try {
    const eventResult = await client.send(
      new GetItemCommand({
        TableName: EVENT_TABLE,
        Key: marshall({ id: eventId }),
        ConsistentRead: true,
        ProjectionExpression: 'id, eventTitle, organizerId, #owner, eventDateType, eventStartDate, eventEndDate, eventSpecificDates, eventTime, eventLocation, eventManager, eventManagerEmail, eventManagerPhone',
        ExpressionAttributeNames: { '#owner': 'owner' },
      })
    );

    if (eventResult.Item) {
      const eventItem = unmarshall(eventResult.Item);
      eventDetails = eventItem;
      // Check if inviter matches the event owner using normalized comparison
      // Handles both Gen 1 (userId::userId) and Gen 2 (userId) owner formats
      if (normalizeUserId(eventItem.owner) === inviterId) {
        isOwner = true;
        console.log(`[inviteCollaborator] Inviter is event owner`);
      } else {
        console.log(`[inviteCollaborator] Inviter ${inviterId} is NOT owner (owner normalized: ${normalizeUserId(eventItem.owner)})`);
      }
    } else {
      console.warn(`[inviteCollaborator] Event ${eventId} not found`);
    }
  } catch (error) {
    console.warn(`[inviteCollaborator] Error checking event ownership:`, error);
  }

  // If not owner, check if inviter is CO_MANAGER
  if (!isOwner) {
    const collabQuery = await client.send(
      new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'userId = :uid AND #st = :accepted',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':uid': inviterId,
          ':accepted': 'ACCEPTED',
        }),
      })
    );

    const inviterCollab = collabQuery.Items?.[0]
      ? unmarshall(collabQuery.Items[0])
      : null;

    if (!inviterCollab) {
      console.error(
        `[inviteCollaborator] User ${inviterId} has no access to event ${eventId}`
      );
      throw new Error('Unauthorized: No access to this event');
    }

    // CO_MANAGER can only invite Staff roles, not other Co-Managers
    if (inviterCollab.role !== 'CO_MANAGER') {
      console.error(
        `[inviteCollaborator] User ${inviterId} is ${inviterCollab.role}, not allowed to invite`
      );
      throw new Error('Unauthorized: Only owners and co-managers can invite');
    }

    // Per ACCESS_LEVELS_STRATEGY.md: Co-Manager can only invite Staff
    if (role === 'CO_MANAGER') {
      console.error(
        `[inviteCollaborator] CO_MANAGER trying to invite another CO_MANAGER`
      );
      throw new Error('Unauthorized: Only owner can invite co-managers');
    }

    console.log(`[inviteCollaborator] CO_MANAGER inviting ${role}`);

    // CO_MANAGER cannot share folders/suppliers — only OWNER can (ACCESS_LEVELS_STRATEGY.md: TEAM_SHARE_FOLDER)
    if (sharedFolderIds && sharedFolderIds.length > 0) {
      console.warn(`[inviteCollaborator] CO_MANAGER attempted to share folders - stripping sharedFolderIds`);
    }
    if (sharedSupplierIds && sharedSupplierIds.length > 0) {
      console.warn(`[inviteCollaborator] CO_MANAGER attempted to share suppliers - stripping sharedSupplierIds`);
    }
  }

  // 5. Prevent self-invite — comparado contra o email REAL de quem convida.
  //
  // Antes comparava o `eventManagerEmail`, que é um campo de formulário sobre
  // o responsável do evento no mundo real — não a identidade da conta. Falhava
  // nos dois sentidos: bloqueava convites a essa pessoa (que é outra), e
  // deixava o dono convidar-se a si próprio, porque o email dele nunca entrava
  // na comparação. Quem decide o dono é o campo `owner` (o sub do Cognito), e
  // o email desse sub só existe no Cognito — os access tokens não o trazem.
  const { email: inviterEmail } = await getUserEmail({
    userPoolId: USER_POOL_ID,
    username: inviterUsername as string,
  });
  if (inviterEmail.toLowerCase().trim() === emailLower) {
    throw new Error('Cannot invite yourself to your own event');
  }

  // 6. Check for existing invitation for this email and event
  let invitationId = uuidv4();
  let isResend = false;

  const existingQuery = await client.send(
    new QueryCommand({
      TableName: COLLABORATOR_TABLE,
      IndexName: 'byUserEmail',
      KeyConditionExpression: 'userEmail = :email',
      FilterExpression: 'eventId = :eid',
      ExpressionAttributeValues: marshall({
        ':email': emailLower,
        ':eid': eventId,
      }),
    })
  );

  if (existingQuery.Items && existingQuery.Items.length > 0) {
    const existing = unmarshall(existingQuery.Items[0]);

    if (existing.status === 'ACCEPTED') {
      throw new Error('This user is already a collaborator on this event');
    }

    if (existing.status === 'PENDING') {
      console.log(`[inviteCollaborator] Invitation already pending for ${redactEmail(emailLower)}. Resending/Updating...`);
      invitationId = existing.id;
      isResend = true;
    }

    // If DECLINED, we allow re-inviting (isResend stays false to create new or overwrite? 
    // Usually easier to overwrite the declined one or create new. 
    // Let's stick to creating new for declined to keep history if we were tracking it properly, 
    // but here we might just overwrite to keep it clean. 
    // For now, let's reuse ID even for declined to avoid clutter if we want single invite per email per event.
    // Actually, let's reuse ID for DECLINED too to keep DB clean.
    if (existing.status === 'DECLINED') {
      console.log(`[inviteCollaborator] Previous invitation was declined. Re-inviting...`);
      invitationId = existing.id;
      isResend = true; // We treat it as update
    }
  }

  // 5. Create or Update the invitation record
  const now = new Date().toISOString();

  const collaborator: EventCollaborator = {
    id: invitationId,
    eventId,
    userEmail: emailLower,
    role,
    // Only OWNER can share folders/suppliers (ACCESS_LEVELS_STRATEGY.md: TEAM_SHARE_FOLDER)
    // CO_MANAGER and STAFF_LOGISTICS can receive shared folders/suppliers, but only when shared by OWNER
    sharedFolderIds: (isOwner && (role === 'CO_MANAGER' || role === 'STAFF_LOGISTICS')) ? sharedFolderIds || [] : [],
    sharedSupplierIds: (isOwner && (role === 'CO_MANAGER' || role === 'STAFF_LOGISTICS')) ? sharedSupplierIds || [] : [],
    status: 'PENDING', // Reset status to PENDING even if it was DECLINED
    invitedBy: inviterId,
    invitedAt: now,
    owner: inviterOwner, // For DynamoDB authorization
    createdAt: isResend ? (existingQuery.Items && existingQuery.Items[0] ? unmarshall(existingQuery.Items[0]).createdAt : now) : now,
    updatedAt: now,
  };

  const putItemParams: any = {
    TableName: COLLABORATOR_TABLE,
    Item: marshall(collaborator, { removeUndefinedValues: true }),
  };

  // Only protect against overwrite if it's a completely new invitation
  if (!isResend) {
    putItemParams.ConditionExpression = 'attribute_not_exists(id)';
  }

  await client.send(new PutItemCommand(putItemParams));

  console.log(
    `[inviteCollaborator] Invitation ${isResend ? 'updated/resent' : 'created'}: ${collaborator.id} for ${redactEmail(emailLower)} as ${role}`
  );

  // 6. Send invitation email via SQS
  if (EMAIL_QUEUE_URL && eventDetails) {
    try {
      const roleDisplayNames: Record<string, Record<string, string>> = {
        pt: {
          CO_MANAGER: 'Co-Organizador',
          STAFF_CHECKIN: 'Staff (Check-in)',
          STAFF_LOGISTICS: 'Staff (Logística)',
        },
        en: {
          CO_MANAGER: 'Co-Manager',
          STAFF_CHECKIN: 'Staff (Check-in)',
          STAFF_LOGISTICS: 'Staff (Logistics)',
        },
        fr: {
          CO_MANAGER: 'Co-Gestionnaire',
          STAFF_CHECKIN: 'Staff (Accueil)',
          STAFF_LOGISTICS: 'Staff (Logistique)',
        },
      };

      const emailPayload = {
        emailType: 'collaboratorInvitation',
        data: {
          recipient: {
            name: "Colaborador",
            email: emailLower
          },
          eventName: eventDetails.eventTitle || 'Evento Bafatório',
          eventDate: formatEventDateForEmail(eventDetails, lang as EventDateLanguage),
          eventTime: eventTimeToHHMM(eventDetails.eventTime),
          eventLocation: eventDetails.eventLocation || 'Local a definir',
          eventManagerName: eventDetails.eventManager || 'Gestor do Evento',
          eventManagerContact: eventDetails.eventManagerPhone || '',
          // Link to the web app - user will see pending invitations after login
          confirmationLink: `${APP_BASE_URL}/signin?invitation=${invitationId}`,
          participantId: invitationId,
          eventId: eventId,
          language: lang,
          role: roleDisplayNames[lang]?.[role] || role
        },
        attempts: 0,
        priority: 1
      };

      const sqsResult = await sqsClient.send(new SendMessageCommand({
        QueueUrl: EMAIL_QUEUE_URL,
        MessageBody: JSON.stringify(emailPayload),
        MessageAttributes: {
          emailType: { DataType: 'String', StringValue: 'collaboratorInvitation' },
          priority: { DataType: 'Number', StringValue: '1' }
        }
      }));

      console.log(`[inviteCollaborator] Email queued for ${redactEmail(emailLower)}. MessageId: ${sqsResult.MessageId}`);

      // Create EmailLog entry so the processor can update it
      if (sqsResult.MessageId && EMAIL_LOG_TABLE_NAME) {
        try {
          const nowLog = new Date().toISOString();
          await client.send(new PutItemCommand({
            TableName: EMAIL_LOG_TABLE_NAME,
            Item: marshall({
              id: sqsResult.MessageId,
              participantId: invitationId,
              eventId: eventId,
              emailType: 'collaboratorInvitation',
              status: 'QUEUED',
              attempts: 0,
              lastAttemptAt: nowLog,
              createdAt: nowLog,
              updatedAt: nowLog,
              templateName: `CollaboratorInvitationTemplate_${lang}`,
              language: lang,
              messageId: sqsResult.MessageId
            })
          }));
          console.log(`[inviteCollaborator] EmailLog created for MessageId: ${sqsResult.MessageId}`);
        } catch (logError) {
          console.error(`[inviteCollaborator] Failed to create EmailLog:`, logError);
        }
      }

    } catch (error) {
      console.error(`[inviteCollaborator] Failed to queue email:`, error);
      // Don't fail the mutation if email fails, just log it
    }
  } else {
    console.warn(`[inviteCollaborator] Skipping email: Queue URL or Event Details missing`);
  }

  return collaborator;
};
