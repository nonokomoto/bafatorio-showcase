/**
 * @file get-event-as-collaborator/handler.ts
 * @description Lambda function to get a single event if user is owner or collaborator
 * Checks both Event.owner and EventCollaborator table
 */

import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import {
  resolveEventEntitlements,
  type EventEntitlementsRecord,
} from '../shared/resolveEventEntitlements';

// Types
interface EventData {
  id: string;
  eventTitle: string;
  eventManager: string;
  eventManagerEmail: string;
  eventManagerPhone: string;
  eventLocation: string;
  eventCreationDate: string;
  eventStatus: string;
  eventType: string;
  organizerId: string;
  description: string;
  categories: string[];
  budget: number;
  committedExpenses: number;
  effectiveExpenses: number;
  participantCount: number;
  dependentCount: number;
  totalRegistrations: number;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

interface EventCollaborator {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  role: 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';
  sharedFolderIds: string[];
  sharedSupplierIds: string[];
  canViewTeamSchedule?: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

interface GetEventInput {
  eventId: string;
}

type UserRole = 'OWNER' | 'CO_MANAGER' | 'STAFF_CHECKIN' | 'STAFF_LOGISTICS';

interface EventAccess {
  planKey: string;
  writable: boolean;
  reason: string;
  // Teto de participantes resolvido; null quando não há teto — GraphQL não
  // transporta Infinity, e null lê-se na UI como "sem limite".
  participantLimit: number | null;
}

interface GetEventResult {
  event: EventData | null;
  userRole: UserRole | null;
  sharedFolderIds?: string[];
  sharedSupplierIds?: string[];
  canViewTeamSchedule?: boolean;
  // Entitlements do evento (plano do DONO) para a UI cosmética — a autoridade
  // continua nas Lambdas de mutation (§4b).
  access?: EventAccess;
}

/**
 * Redact fields from event data based on user role.
 * Per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER / CO_MANAGER: full access including financial data
 * - STAFF_LOGISTICS: operational details only (no financial)
 * - STAFF_CHECKIN: basic info only (no financial, no manager contact details)
 */
const redactEventByRole = (eventData: EventData, role: UserRole): EventData => {
  if (role === 'OWNER' || role === 'CO_MANAGER') {
    return eventData;
  }

  // Staff roles: strip financial fields
  const redacted = { ...eventData };
  delete (redacted as Partial<EventData>).budget;
  delete (redacted as Partial<EventData>).committedExpenses;
  delete (redacted as Partial<EventData>).effectiveExpenses;

  // STAFF_CHECKIN: also strip manager contact details (they only see basic event info)
  if (role === 'STAFF_CHECKIN') {
    delete (redacted as Partial<EventData>).eventManagerEmail;
    delete (redacted as Partial<EventData>).eventManagerPhone;
  }

  return redacted;
};

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats
 * @param id - User ID that might be in format "userId::userId" or "userId"
 * @returns Normalized user ID (just the first part)
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  // Split by '::' and return first part (handles both formats)
  return id.split('::')[0];
};

/**
 * Main handler for getting event with collaborator check
 */
export const handler = async (
  event: AppSyncResolverEvent<GetEventInput>
): Promise<GetEventResult> => {
  // 1. Extract user identity and event ID
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  const { eventId } = event.arguments;

  if (!userId) {
    console.error('[getEventAsCollaborator] Identity error: user sub not found');
    throw new Error('User identity not found');
  }

  if (!eventId) {
    throw new Error('Event ID is required');
  }

  console.log(`[getEventAsCollaborator] Checking access for user ${userId} to event ${eventId}`);

  // 2. Fetch the event
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
    })
  );

  if (!eventResult.Item) {
    console.log(`[getEventAsCollaborator] Event ${eventId} not found`);
    return {
      event: null,
      userRole: null,
    };
  }

  const eventData = unmarshall(eventResult.Item) as EventData;

  // 3. Check if user is the owner (normalize to handle Gen 1 and Gen 2 formats)
  const normalizedOwner = normalizeUserId(eventData.owner);

  // Entitlements do evento para a UI: o wrapper partilhado recebe o registo já
  // carregado (só resta o GetItem da UserSubscription do dono) — mesma fonte
  // de decisão das Lambdas de mutation, sem duplicar o carregamento.
  const entitlements = await resolveEventEntitlements({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
    eventRecord: eventData as unknown as EventEntitlementsRecord,
  });
  const access: EventAccess = {
    planKey: entitlements.planKey,
    writable: entitlements.writable,
    reason: entitlements.reason,
    participantLimit: Number.isFinite(entitlements.entitlements.participants)
      ? entitlements.entitlements.participants
      : null,
  };

  if (normalizedOwner === userId) {
    console.log(`[getEventAsCollaborator] User is owner of event ${eventId}`);
    return {
      event: eventData,
      userRole: 'OWNER',
      access,
    };
  }

  // 4. Check if user is a collaborator
  const collaboratorResult = await client.send(
    new QueryCommand({
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
    })
  );

  const collaborations = (collaboratorResult.Items || []).map(
    (item) => unmarshall(item) as EventCollaborator
  );

  if (collaborations.length > 0) {
    const collaboration = collaborations[0];
    console.log(
      `[getEventAsCollaborator] User is collaborator (${collaboration.role}) of event ${eventId}`
    );
    return {
      event: redactEventByRole(eventData, collaboration.role),
      userRole: collaboration.role,
      sharedFolderIds: collaboration.sharedFolderIds || [],
      sharedSupplierIds: collaboration.sharedSupplierIds || [],
      canViewTeamSchedule: collaboration.canViewTeamSchedule || false,
      access,
    };
  }

  // 5. User has no access
  console.log(`[getEventAsCollaborator] User has no access to event ${eventId}`);
  throw new Error('Access denied: You do not have permission to view this event');
};
