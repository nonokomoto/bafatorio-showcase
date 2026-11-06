import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverHandler } from 'aws-lambda';
import { randomUUID } from 'crypto';

import { ensureEventWritable, ensureWithinLimit } from '../shared/entitlementGate';

const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// Roles that can create participants (per ACCESS_LEVELS_STRATEGY.md)
const ROLES_WITH_CREATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

// Valid values for participant fields
const VALID_STATUSES = new Set(['REGISTERED', 'CONFIRMED', 'CANCELLED', 'ATTENDED', 'NOT_ATTENDED']);
const MAX_FIELD_LENGTH = 500;
const MAX_NOTE_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

/**
 * Verify the calling user has permission to create participants for the given event.
 * Returns the user's role and the event owner ID (needed to set correct owner on participant).
 */
async function verifyCreateAccess(userId: string, eventId: string): Promise<{ role: string; eventOwner: string }> {
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
  const eventOwner = eventRecord.owner as string;
  const normalizedOwner = normalizeUserId(eventOwner);

  if (normalizedOwner === userId) {
    return { role: 'OWNER', eventOwner };
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
    if (ROLES_WITH_CREATE.has(role)) {
      return { role, eventOwner };
    }
    throw new Error(`Access denied: Role ${role} cannot create participants`);
  }

  throw new Error('Access denied: You do not have permission to create participants for this event');
}

interface CreateParticipantArguments {
  eventId: string;
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  roleId?: string;
  participantStatus?: string;
  participantJob?: string;
  participantNote?: string;
  registrationDate?: string;
  dependentsCount?: number;
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
 * Lambda handler for creating a participant as owner or collaborator.
 * Bypasses rules.owner() by accessing DynamoDB directly after access control verification.
 * Sets the event owner as the participant record owner so the event owner retains full access.
 */
export const handler: AppSyncResolverHandler<CreateParticipantArguments, ParticipantResult> = async (event) => {
  const { eventId, ...fields } = event.arguments;

  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity && 'sub' in identity ? identity.sub : undefined;
  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!eventId) {
    throw new Error('Event ID is required');
  }

  // Verify access control and get event owner
  const { role: userRole, eventOwner } = await verifyCreateAccess(userId, eventId);
  console.log(`[createParticipantCollaborator] User ${userId} (role: ${userRole}) creating participant for event ${eventId}`);

  // Gate de billing (§4): janela de escrita + limite de participantes do plano
  // do DONO. participantCount é o contador desnormalizado mantido pelo stream.
  const gate = await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId,
  });
  ensureWithinLimit(gate.entitlements, 'participants', (gate.eventRecord.participantCount as number) ?? 0);

  // Validate field values
  const status = fields.participantStatus || 'REGISTERED';
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid participant status: ${status}`);
  }
  if (fields.participantEmail && fields.participantEmail !== '' && !EMAIL_REGEX.test(fields.participantEmail)) {
    throw new Error('Invalid email format');
  }
  if (fields.participantName && fields.participantName.length > MAX_FIELD_LENGTH) {
    throw new Error(`Participant name exceeds maximum length of ${MAX_FIELD_LENGTH}`);
  }
  if (fields.participantNote && fields.participantNote.length > MAX_NOTE_LENGTH) {
    throw new Error(`Participant note exceeds maximum length of ${MAX_NOTE_LENGTH}`);
  }

  // Build participant record
  const now = new Date().toISOString();
  const participantId = randomUUID();

  const participant: Record<string, unknown> = {
    id: participantId,
    eventId,
    participantName: fields.participantName || undefined,
    participantEmail: fields.participantEmail || undefined,
    participantPhone: fields.participantPhone || undefined,
    roleId: fields.roleId || undefined,
    participantStatus: status,
    participantJob: fields.participantJob || undefined,
    participantNote: fields.participantNote || undefined,
    registrationDate: fields.registrationDate || now,
    dependentsCount: fields.dependentsCount || 0,
    // --- IDENTIFICACAO ---
    documentationType: fields.documentationType || undefined,
    documentLast4: fields.documentLast4 || undefined,
    nationality: fields.nationality || undefined,
    residenceCountry: fields.residenceCountry || undefined,
    organization: fields.organization || undefined,
    emergencyContact: fields.emergencyContact || undefined,
    internalId: fields.internalId || undefined,
    // --- VISTO ---
    visaRequired: fields.visaRequired ?? undefined,
    visaSupport: fields.visaSupport ?? undefined,
    // --- CHEGADA ---
    arrivalDate: fields.arrivalDate || undefined,
    arrivalTime: fields.arrivalTime || undefined,
    arrivalFlight: fields.arrivalFlight || undefined,
    arrivalLayovers: fields.arrivalLayovers || undefined,
    arrivalAirport: fields.arrivalAirport || undefined,
    // --- TRANSFER ---
    transferRequired: fields.transferRequired ?? undefined,
    transferDetails: fields.transferDetails || undefined,
    transferCost: fields.transferCost ?? undefined,
    transferCurrency: fields.transferCurrency || undefined,
    // --- ALOJAMENTO ---
    hotel: fields.hotel || undefined,
    roomType: fields.roomType || undefined,
    checkInDate: fields.checkInDate || undefined,
    checkOutDate: fields.checkOutDate || undefined,
    nights: fields.nights ?? undefined,
    ratePerNight: fields.ratePerNight ?? undefined,
    rateCurrency: fields.rateCurrency || undefined,
    accommodationCost: fields.accommodationCost ?? undefined,
    // --- PARTIDA ---
    departureDate: fields.departureDate || undefined,
    departureTime: fields.departureTime || undefined,
    departureFlight: fields.departureFlight || undefined,
    departureAirport: fields.departureAirport || undefined,
    // --- FINANCEIRO ---
    ticketFare: fields.ticketFare ?? undefined,
    ticketCurrency: fields.ticketCurrency || undefined,
    taxesExtras: fields.taxesExtras ?? undefined,
    taxesCurrency: fields.taxesCurrency || undefined,
    totalTravelCost: fields.totalTravelCost ?? undefined,
    totalTravelCurrency: fields.totalTravelCurrency || undefined,
    paymentStatus: fields.paymentStatus || undefined,
    bookingReference: fields.bookingReference || undefined,
    bookingAgency: fields.bookingAgency || undefined,
    // --- OUTROS ---
    dietaryRestriction: fields.dietaryRestriction || undefined,
    protocol: fields.protocol || undefined,
    photoUrl: fields.photoUrl || undefined,
    // Set event owner as record owner so they retain full access
    owner: eventOwner,
    createdAt: now,
    updatedAt: now,
  };

  // Create participant in DynamoDB
  await client.send(new PutItemCommand({
    TableName: PARTICIPANT_TABLE,
    Item: marshall(participant, { removeUndefinedValues: true }),
    ConditionExpression: 'attribute_not_exists(id)',
  }));

  // participantCount is updated automatically by DynamoDB Stream (participant-stream)

  console.log(`[createParticipantCollaborator] Participant ${participantId} created successfully`);

  return {
    id: participantId,
    participantName: participant.participantName as string | undefined,
    participantEmail: participant.participantEmail as string | undefined,
    participantPhone: participant.participantPhone as string | undefined,
    participantStatus: participant.participantStatus as string | undefined,
    participantJob: participant.participantJob as string | undefined,
    participantNote: participant.participantNote as string | undefined,
    eventId: participant.eventId as string | undefined,
    registrationDate: participant.registrationDate as string | undefined,
    attendedDate: undefined,
    confirmationDate: undefined,
    dependentsCount: participant.dependentsCount as number | undefined,
    roleId: participant.roleId as string | undefined,
    // --- IDENTIFICACAO ---
    documentationType: participant.documentationType as string | undefined,
    documentLast4: participant.documentLast4 as string | undefined,
    nationality: participant.nationality as string | undefined,
    residenceCountry: participant.residenceCountry as string | undefined,
    organization: participant.organization as string | undefined,
    emergencyContact: participant.emergencyContact as string | undefined,
    internalId: participant.internalId as string | undefined,
    // --- VISTO ---
    visaRequired: participant.visaRequired as boolean | undefined,
    visaSupport: participant.visaSupport as boolean | undefined,
    // --- CHEGADA ---
    arrivalDate: participant.arrivalDate as string | undefined,
    arrivalTime: participant.arrivalTime as string | undefined,
    arrivalFlight: participant.arrivalFlight as string | undefined,
    arrivalLayovers: participant.arrivalLayovers as string | undefined,
    arrivalAirport: participant.arrivalAirport as string | undefined,
    // --- TRANSFER ---
    transferRequired: participant.transferRequired as boolean | undefined,
    transferDetails: participant.transferDetails as string | undefined,
    transferCost: participant.transferCost as number | undefined,
    transferCurrency: participant.transferCurrency as string | undefined,
    // --- ALOJAMENTO ---
    hotel: participant.hotel as string | undefined,
    roomType: participant.roomType as string | undefined,
    checkInDate: participant.checkInDate as string | undefined,
    checkOutDate: participant.checkOutDate as string | undefined,
    nights: participant.nights as number | undefined,
    ratePerNight: participant.ratePerNight as number | undefined,
    rateCurrency: participant.rateCurrency as string | undefined,
    accommodationCost: participant.accommodationCost as number | undefined,
    // --- PARTIDA ---
    departureDate: participant.departureDate as string | undefined,
    departureTime: participant.departureTime as string | undefined,
    departureFlight: participant.departureFlight as string | undefined,
    departureAirport: participant.departureAirport as string | undefined,
    // --- FINANCEIRO ---
    ticketFare: participant.ticketFare as number | undefined,
    ticketCurrency: participant.ticketCurrency as string | undefined,
    taxesExtras: participant.taxesExtras as number | undefined,
    taxesCurrency: participant.taxesCurrency as string | undefined,
    totalTravelCost: participant.totalTravelCost as number | undefined,
    totalTravelCurrency: participant.totalTravelCurrency as string | undefined,
    paymentStatus: participant.paymentStatus as string | undefined,
    bookingReference: participant.bookingReference as string | undefined,
    bookingAgency: participant.bookingAgency as string | undefined,
    // --- OUTROS ---
    dietaryRestriction: participant.dietaryRestriction as string | undefined,
    protocol: participant.protocol as string | undefined,
    photoUrl: participant.photoUrl as string | undefined,
    owner: participant.owner as string | undefined,
    createdAt: participant.createdAt as string | undefined,
    updatedAt: participant.updatedAt as string | undefined,
  };
};
