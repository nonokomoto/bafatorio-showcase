/**
 * @file list-event-participants/handler.ts
 * @description Lambda function to list event participants for owners AND collaborators.
 * Bypasses DynamoDB owner-based authorization (rules.owner()) by querying
 * tables directly after verifying user access via EventCollaborator table.
 *
 * Per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER: Full access
 * - CO_MANAGER: Can view participants
 * - STAFF_LOGISTICS: Can view participants
 * - STAFF_CHECKIN: Can view participants (needed for check-in workflow)
 */

import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface ListEventParticipantsInput {
  eventId: string;
}

interface DependentData {
  id: string;
  name?: string;
  age?: string;
  participantId?: string;
  eventId?: string;
  status?: string;
  attendedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ParticipantItemData {
  id: string;
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  participantStatus?: string;
  participantJob?: string;
  participantNote?: string;
  registrationDate?: string;
  attendedDate?: string;
  confirmationDate?: string;
  eventId?: string;
  dependentsCount?: number;
  roleId?: string;
  // --- IDENTIFICACAO ---
  documentationType?: string;
  documentLast4?: string;
  nationality?: string;
  residenceCountry?: string;
  organization?: string;
  emergencyContact?: string;
  internalId?: string;
  // --- VISTO ---
  visaRequired?: boolean;
  visaSupport?: boolean;
  // --- CHEGADA ---
  arrivalDate?: string;
  arrivalTime?: string;
  arrivalFlight?: string;
  arrivalLayovers?: string;
  arrivalAirport?: string;
  // --- TRANSFER ---
  transferRequired?: boolean;
  transferDetails?: string;
  transferCost?: number;
  transferCurrency?: string;
  // --- ALOJAMENTO ---
  hotel?: string;
  roomType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  ratePerNight?: number;
  rateCurrency?: string;
  accommodationCost?: number;
  // --- PARTIDA ---
  departureDate?: string;
  departureTime?: string;
  departureFlight?: string;
  departureAirport?: string;
  // --- FINANCEIRO ---
  ticketFare?: number;
  ticketCurrency?: string;
  taxesExtras?: number;
  taxesCurrency?: string;
  totalTravelCost?: number;
  totalTravelCurrency?: string;
  paymentStatus?: string;
  bookingReference?: string;
  bookingAgency?: string;
  // --- OUTROS ---
  dietaryRestriction?: string;
  protocol?: string;
  photoUrl?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  dependents?: DependentData[];
}

interface ListEventParticipantsResult {
  items: ParticipantItemData[];
  totalCount: number;
}

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const ROLE_TABLE = process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '';

/**
 * Load Role records for a specific event and build a name→id map (for legacy participantRole fallback).
 * Uses byEventId GSI instead of full table scan.
 */
async function loadRoleNameToIdMap(eventId: string): Promise<Record<string, string>> {
  if (!ROLE_TABLE || !eventId) return {};
  const map: Record<string, string> = {};
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(new QueryCommand({
      TableName: ROLE_TABLE,
      IndexName: 'byEventId',
      KeyConditionExpression: 'eventId = :eid',
      ProjectionExpression: 'id, #n',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
      ...(lastKey && { ExclusiveStartKey: marshall(lastKey) }),
    }));
    for (const item of result.Items || []) {
      const role = unmarshall(item);
      if (role.name) {
        // Map both original case and lowercase for flexible matching
        map[role.name] = role.id;
        map[role.name.toLowerCase()] = role.id;
      }
    }
    lastKey = result.LastEvaluatedKey ? unmarshall(result.LastEvaluatedKey) : undefined;
  } while (lastKey);

  return map;
}

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

/**
 * Main handler
 */
export const handler = async (
  event: AppSyncResolverEvent<ListEventParticipantsInput>
): Promise<ListEventParticipantsResult> => {
  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  const { eventId } = event.arguments;

  if (!userId) {
    throw new Error('User identity not found');
  }
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  console.log(`[listEventParticipants] User ${userId} requesting participants for event ${eventId}`);

  // 1. Fetch event record to check ownership
  const eventResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_TABLE,
      Key: marshall({ id: eventId }),
    })
  );

  if (!eventResult.Item) {
    throw new Error(`Event ${eventId} not found`);
  }

  const eventRecord = unmarshall(eventResult.Item);

  // 2. Determine user role
  const normalizedOwner = normalizeUserId(eventRecord.owner || '');
  let userRole: string | null = null;

  if (normalizedOwner === userId) {
    userRole = 'OWNER';
  } else {
    // Check collaborator table
    const collabResult = await client.send(
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

    const collabs = (collabResult.Items || []).map((item) => unmarshall(item));
    if (collabs.length > 0) {
      userRole = collabs[0].role as string;
    }
  }

  console.log(`[listEventParticipants] User role: ${userRole}`);

  if (!userRole) {
    throw new Error('Access denied: You do not have permission to view this event');
  }

  // ALL roles can view participants (unlike suppliers which block STAFF_CHECKIN)

  // 2b. Load Role name→id map for legacy participantRole fallback
  const roleNameToId = await loadRoleNameToIdMap(eventId);

  // 3. Query Participant records for this event using GSI
  let allParticipants: Record<string, unknown>[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const participantResult = await client.send(
      new QueryCommand({
        TableName: PARTICIPANT_TABLE,
        IndexName: 'gsi-Event.participants',
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: marshall({ ':eid': eventId }),
        ...(lastEvaluatedKey && { ExclusiveStartKey: marshall(lastEvaluatedKey) }),
      })
    );

    const items = (participantResult.Items || []).map((item) => unmarshall(item));
    allParticipants = [...allParticipants, ...items];
    lastEvaluatedKey = participantResult.LastEvaluatedKey
      ? unmarshall(participantResult.LastEvaluatedKey)
      : undefined;

    console.log(`[listEventParticipants] Fetched ${items.length} participants, total: ${allParticipants.length}, hasMore: ${!!lastEvaluatedKey}`);
  } while (lastEvaluatedKey);

  // 4. Fetch all dependents for participants in batches (avoids N+1 query pattern)
  const BATCH_SIZE = 50;
  const dependentsByParticipant: Record<string, DependentData[]> = {};

  for (let i = 0; i < allParticipants.length; i += BATCH_SIZE) {
    const batch = allParticipants.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (p) => {
        const participantId = p.id as string;
        const deps: DependentData[] = [];

        try {
          let depLastKey: Record<string, unknown> | undefined;
          do {
            const depResult = await client.send(
              new QueryCommand({
                TableName: DEPENDENT_TABLE,
                IndexName: 'gsi-Participant.dependents',
                KeyConditionExpression: 'participantId = :pid',
                ExpressionAttributeValues: marshall({ ':pid': participantId }),
                ...(depLastKey && { ExclusiveStartKey: marshall(depLastKey) }),
              })
            );

            for (const item of depResult.Items || []) {
              const d = unmarshall(item);
              deps.push({
                id: d.id as string,
                name: d.name as string | undefined,
                age: d.age as string | undefined,
                participantId: d.participantId as string | undefined,
                eventId: d.eventId as string | undefined,
                status: d.status as string | undefined,
                attendedDate: d.attendedDate as string | undefined,
                createdAt: d.createdAt as string | undefined,
                updatedAt: d.updatedAt as string | undefined,
              });
            }

            depLastKey = depResult.LastEvaluatedKey
              ? unmarshall(depResult.LastEvaluatedKey)
              : undefined;
          } while (depLastKey);
        } catch (err) {
          console.warn(`[listEventParticipants] Error fetching dependents for participant ${participantId}:`, err);
        }

        dependentsByParticipant[participantId] = deps;
      })
    );
  }

  console.log(`[listEventParticipants] Fetched dependents for ${Object.keys(dependentsByParticipant).length} participants`);

  // 5. Map participants to response items
  const participantItems: ParticipantItemData[] = allParticipants.map((p) => {
    const participantId = p.id as string;
    const dependents = dependentsByParticipant[participantId] || [];

    return {
      id: participantId,
      participantName: p.participantName as string | undefined,
      participantEmail: p.participantEmail as string | undefined,
      participantPhone: p.participantPhone as string | undefined,
      participantStatus: p.participantStatus as string | undefined,
      participantJob: p.participantJob as string | undefined,
      participantNote: p.participantNote as string | undefined,
      registrationDate: p.registrationDate as string | undefined,
      attendedDate: p.attendedDate as string | undefined,
      confirmationDate: p.confirmationDate as string | undefined,
      eventId: p.eventId as string | undefined,
      dependentsCount: dependents.length > 0 ? dependents.length : (p.dependentsCount as number ?? 0),
      roleId: (p.roleId as string | undefined) || roleNameToId[(p.participantRole as string || '').toLowerCase()] || undefined,
      // --- IDENTIFICACAO ---
      documentationType: p.documentationType as string | undefined,
      documentLast4: p.documentLast4 as string | undefined,
      nationality: p.nationality as string | undefined,
      residenceCountry: p.residenceCountry as string | undefined,
      organization: p.organization as string | undefined,
      emergencyContact: p.emergencyContact as string | undefined,
      internalId: p.internalId as string | undefined,
      // --- VISTO ---
      visaRequired: p.visaRequired as boolean | undefined,
      visaSupport: p.visaSupport as boolean | undefined,
      // --- CHEGADA ---
      arrivalDate: p.arrivalDate as string | undefined,
      arrivalTime: p.arrivalTime as string | undefined,
      arrivalFlight: p.arrivalFlight as string | undefined,
      arrivalLayovers: p.arrivalLayovers as string | undefined,
      arrivalAirport: p.arrivalAirport as string | undefined,
      // --- TRANSFER ---
      transferRequired: p.transferRequired as boolean | undefined,
      transferDetails: p.transferDetails as string | undefined,
      transferCost: p.transferCost as number | undefined,
      transferCurrency: p.transferCurrency as string | undefined,
      // --- ALOJAMENTO ---
      hotel: p.hotel as string | undefined,
      roomType: p.roomType as string | undefined,
      checkInDate: p.checkInDate as string | undefined,
      checkOutDate: p.checkOutDate as string | undefined,
      nights: p.nights as number | undefined,
      ratePerNight: p.ratePerNight as number | undefined,
      rateCurrency: p.rateCurrency as string | undefined,
      accommodationCost: p.accommodationCost as number | undefined,
      // --- PARTIDA ---
      departureDate: p.departureDate as string | undefined,
      departureTime: p.departureTime as string | undefined,
      departureFlight: p.departureFlight as string | undefined,
      departureAirport: p.departureAirport as string | undefined,
      // --- FINANCEIRO ---
      ticketFare: p.ticketFare as number | undefined,
      ticketCurrency: p.ticketCurrency as string | undefined,
      taxesExtras: p.taxesExtras as number | undefined,
      taxesCurrency: p.taxesCurrency as string | undefined,
      totalTravelCost: p.totalTravelCost as number | undefined,
      totalTravelCurrency: p.totalTravelCurrency as string | undefined,
      paymentStatus: p.paymentStatus as string | undefined,
      bookingReference: p.bookingReference as string | undefined,
      bookingAgency: p.bookingAgency as string | undefined,
      // --- OUTROS ---
      dietaryRestriction: p.dietaryRestriction as string | undefined,
      protocol: p.protocol as string | undefined,
      photoUrl: p.photoUrl as string | undefined,
      owner: p.owner as string | undefined,
      createdAt: p.createdAt as string | undefined,
      updatedAt: p.updatedAt as string | undefined,
      dependents,
    };
  });

  console.log(`[listEventParticipants] Returning ${participantItems.length} participants for event ${eventId}`);

  return {
    items: participantItems,
    totalCount: participantItems.length,
  };
};
