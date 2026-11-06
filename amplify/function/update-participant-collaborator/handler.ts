import { DynamoDBClient, UpdateItemCommand, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverHandler } from 'aws-lambda';

import { ensureEventWritable } from '../shared/entitlementGate';

const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
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
        map[role.name] = role.id;
        map[role.name.toLowerCase()] = role.id;
      }
    }
    lastKey = result.LastEvaluatedKey ? unmarshall(result.LastEvaluatedKey) : undefined;
  } while (lastKey);

  return map;
}

// Roles that can update participants (per ACCESS_LEVELS_STRATEGY.md)
const ROLES_WITH_UPDATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

// Valid values for participant fields
const VALID_STATUSES = new Set(['REGISTERED', 'CONFIRMED', 'CANCELLED', 'ATTENDED', 'NOT_ATTENDED']);
const MAX_FIELD_LENGTH = 500;
const MAX_NOTE_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to update participants for the given event.
 * Returns the user's role.
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
    throw new Error(`Access denied: Role ${role} cannot update participants`);
  }

  throw new Error('Access denied: You do not have permission to update participants for this event');
}

interface UpdateParticipantArguments {
  id: string;
  eventId: string;
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  roleId?: string;
  participantStatus?: string;
  participantJob?: string;
  participantNote?: string;
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
}

interface ParticipantResult {
  id: string;
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  participantStatus?: string;
  participantJob?: string;
  participantNote?: string;
  eventId?: string;
  registrationDate?: string;
  attendedDate?: string;
  confirmationDate?: string;
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
}

/**
 * Lambda handler for updating a participant as a collaborator.
 * Bypasses rules.owner() by accessing DynamoDB directly after access control verification.
 */
export const handler: AppSyncResolverHandler<UpdateParticipantArguments, ParticipantResult> = async (event) => {
  const { id, eventId, ...fields } = event.arguments;

  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;
  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!id || !eventId) {
    throw new Error('Participant ID and Event ID are required');
  }

  // Verify access control
  const userRole = await verifyUpdateAccess(userId, eventId);
  console.log(`[updateParticipantCollaborator] User ${userId} (role: ${userRole}) updating participant ${id}`);

  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });

  // Verify participant exists and belongs to this event
  const participantResult = await client.send(new GetItemCommand({
    TableName: PARTICIPANT_TABLE,
    Key: marshall({ id }),
    ProjectionExpression: 'eventId',
  }));

  if (!participantResult.Item) {
    throw new Error('Participant not found');
  }

  const participantData = unmarshall(participantResult.Item);
  if (participantData.eventId !== eventId) {
    throw new Error('Access denied: Participant does not belong to this event');
  }

  // Validate field values (GraphQL sends null for missing optional fields)
  if (fields.participantStatus != null && !VALID_STATUSES.has(fields.participantStatus)) {
    throw new Error(`Invalid participant status: ${fields.participantStatus}`);
  }
  if (fields.participantEmail != null && fields.participantEmail !== '' && !EMAIL_REGEX.test(fields.participantEmail)) {
    throw new Error('Invalid email format');
  }
  if (fields.participantName != null && fields.participantName.length > MAX_FIELD_LENGTH) {
    throw new Error(`Participant name exceeds maximum length of ${MAX_FIELD_LENGTH}`);
  }
  if (fields.participantNote != null && fields.participantNote.length > MAX_NOTE_LENGTH) {
    throw new Error(`Participant note exceeds maximum length of ${MAX_NOTE_LENGTH}`);
  }

  // Build dynamic update expression from provided fields
  const updateParts: string[] = ['updatedAt = :now'];
  const exprValues: Record<string, unknown> = {
    ':now': new Date().toISOString(),
    ':eventId': eventId,
  };
  const exprNames: Record<string, string> = {};

  const fieldMap: Record<string, string> = {
    participantName: 'participantName',
    participantEmail: 'participantEmail',
    participantPhone: 'participantPhone',
    roleId: 'roleId',
    participantStatus: 'participantStatus',
    participantJob: 'participantJob',
    participantNote: 'participantNote',
    // --- IDENTIFICACAO ---
    documentationType: 'documentationType',
    documentLast4: 'documentLast4',
    nationality: 'nationality',
    residenceCountry: 'residenceCountry',
    organization: 'organization',
    emergencyContact: 'emergencyContact',
    internalId: 'internalId',
    // --- VISTO ---
    visaRequired: 'visaRequired',
    visaSupport: 'visaSupport',
    // --- CHEGADA ---
    arrivalDate: 'arrivalDate',
    arrivalTime: 'arrivalTime',
    arrivalFlight: 'arrivalFlight',
    arrivalLayovers: 'arrivalLayovers',
    arrivalAirport: 'arrivalAirport',
    // --- TRANSFER ---
    transferRequired: 'transferRequired',
    transferDetails: 'transferDetails',
    transferCost: 'transferCost',
    transferCurrency: 'transferCurrency',
    // --- ALOJAMENTO ---
    hotel: 'hotel',
    roomType: 'roomType',
    checkInDate: 'checkInDate',
    checkOutDate: 'checkOutDate',
    nights: 'nights',
    ratePerNight: 'ratePerNight',
    rateCurrency: 'rateCurrency',
    accommodationCost: 'accommodationCost',
    // --- PARTIDA ---
    departureDate: 'departureDate',
    departureTime: 'departureTime',
    departureFlight: 'departureFlight',
    departureAirport: 'departureAirport',
    // --- FINANCEIRO ---
    ticketFare: 'ticketFare',
    ticketCurrency: 'ticketCurrency',
    taxesExtras: 'taxesExtras',
    taxesCurrency: 'taxesCurrency',
    totalTravelCost: 'totalTravelCost',
    totalTravelCurrency: 'totalTravelCurrency',
    paymentStatus: 'paymentStatus',
    bookingReference: 'bookingReference',
    bookingAgency: 'bookingAgency',
    // --- OUTROS ---
    dietaryRestriction: 'dietaryRestriction',
    protocol: 'protocol',
    photoUrl: 'photoUrl',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (fields[key as keyof typeof fields] != null) {
      const placeholder = `:${key}`;
      // Use expression attribute names for reserved words
      const nameAlias = `#${key}`;
      updateParts.push(`${nameAlias} = ${placeholder}`);
      exprValues[placeholder] = fields[key as keyof typeof fields];
      exprNames[nameAlias] = dbField;
    }
  }

  // Execute the update with a condition to ensure participant belongs to the event
  const updateResult = await client.send(new UpdateItemCommand({
    TableName: PARTICIPANT_TABLE,
    Key: marshall({ id }),
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ConditionExpression: 'eventId = :eventId',
    ExpressionAttributeValues: marshall(exprValues),
    ExpressionAttributeNames: Object.keys(exprNames).length > 0 ? exprNames : undefined,
    ReturnValues: 'ALL_NEW',
  }));

  if (!updateResult.Attributes) {
    throw new Error('Failed to update participant');
  }

  const updated = unmarshall(updateResult.Attributes);
  console.log(`[updateParticipantCollaborator] Participant ${id} updated successfully`);

  // Only load role name→id map if the record has a legacy participantRole (no roleId)
  let resolvedRoleId = updated.roleId as string | undefined;
  if (!resolvedRoleId && updated.participantRole) {
    const roleNameToId = await loadRoleNameToIdMap(eventId);
    resolvedRoleId = roleNameToId[(updated.participantRole as string).toLowerCase()] || undefined;
  }

  return {
    id: updated.id as string,
    participantName: updated.participantName as string | undefined,
    participantEmail: updated.participantEmail as string | undefined,
    participantPhone: updated.participantPhone as string | undefined,
    participantStatus: updated.participantStatus as string | undefined,
    participantJob: updated.participantJob as string | undefined,
    participantNote: updated.participantNote as string | undefined,
    eventId: updated.eventId as string | undefined,
    registrationDate: updated.registrationDate as string | undefined,
    attendedDate: updated.attendedDate as string | undefined,
    confirmationDate: updated.confirmationDate as string | undefined,
    dependentsCount: updated.dependentsCount as number | undefined,
    roleId: resolvedRoleId,
    // --- IDENTIFICACAO ---
    documentationType: updated.documentationType as string | undefined,
    documentLast4: updated.documentLast4 as string | undefined,
    nationality: updated.nationality as string | undefined,
    residenceCountry: updated.residenceCountry as string | undefined,
    organization: updated.organization as string | undefined,
    emergencyContact: updated.emergencyContact as string | undefined,
    internalId: updated.internalId as string | undefined,
    // --- VISTO ---
    visaRequired: updated.visaRequired as boolean | undefined,
    visaSupport: updated.visaSupport as boolean | undefined,
    // --- CHEGADA ---
    arrivalDate: updated.arrivalDate as string | undefined,
    arrivalTime: updated.arrivalTime as string | undefined,
    arrivalFlight: updated.arrivalFlight as string | undefined,
    arrivalLayovers: updated.arrivalLayovers as string | undefined,
    arrivalAirport: updated.arrivalAirport as string | undefined,
    // --- TRANSFER ---
    transferRequired: updated.transferRequired as boolean | undefined,
    transferDetails: updated.transferDetails as string | undefined,
    transferCost: updated.transferCost as number | undefined,
    transferCurrency: updated.transferCurrency as string | undefined,
    // --- ALOJAMENTO ---
    hotel: updated.hotel as string | undefined,
    roomType: updated.roomType as string | undefined,
    checkInDate: updated.checkInDate as string | undefined,
    checkOutDate: updated.checkOutDate as string | undefined,
    nights: updated.nights as number | undefined,
    ratePerNight: updated.ratePerNight as number | undefined,
    rateCurrency: updated.rateCurrency as string | undefined,
    accommodationCost: updated.accommodationCost as number | undefined,
    // --- PARTIDA ---
    departureDate: updated.departureDate as string | undefined,
    departureTime: updated.departureTime as string | undefined,
    departureFlight: updated.departureFlight as string | undefined,
    departureAirport: updated.departureAirport as string | undefined,
    // --- FINANCEIRO ---
    ticketFare: updated.ticketFare as number | undefined,
    ticketCurrency: updated.ticketCurrency as string | undefined,
    taxesExtras: updated.taxesExtras as number | undefined,
    taxesCurrency: updated.taxesCurrency as string | undefined,
    totalTravelCost: updated.totalTravelCost as number | undefined,
    totalTravelCurrency: updated.totalTravelCurrency as string | undefined,
    paymentStatus: updated.paymentStatus as string | undefined,
    bookingReference: updated.bookingReference as string | undefined,
    bookingAgency: updated.bookingAgency as string | undefined,
    // --- OUTROS ---
    dietaryRestriction: updated.dietaryRestriction as string | undefined,
    protocol: updated.protocol as string | undefined,
    photoUrl: updated.photoUrl as string | undefined,
    owner: updated.owner as string | undefined,
    createdAt: updated.createdAt as string | undefined,
    updatedAt: updated.updatedAt as string | undefined,
  };
};
