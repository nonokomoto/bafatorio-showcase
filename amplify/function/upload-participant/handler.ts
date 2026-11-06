import { Context } from 'aws-lambda';
import * as ExcelJS from 'exceljs';
import { DynamoDBClient, BatchWriteItemCommand, WriteRequest, GetItemCommand, QueryCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from "@aws-lambda-powertools/logger";

import { ensureEventWritable, ensureWithinLimit } from '../shared/entitlementGate';
import { parseDateToISO } from '../shared/importUtils';

// Initialize AWS services and environment variables
const logger = new Logger({ serviceName: "uploadParticipants" });
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const ROLE_TABLE = process.env.BAFATORIO_APP_ROLE_TABLE_NAME || '';
const client = new DynamoDBClient({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });

// Roles allowed to import participants (per ACCESS_LEVELS_STRATEGY.md — PARTICIPANT_CREATE)
const ROLES_WITH_CREATE = new Set(['OWNER', 'CO_MANAGER', 'STAFF_LOGISTICS']);

/** Normalize user ID: handle both "userId::userId" (Gen 1) and "userId" (Gen 2) formats */
const normalizeUserId = (id: string): string => id ? id.split('::')[0] : id;

interface UploadAccessResult {
  role: string;
  eventOwner: string; // The event owner's sub in "sub::sub" format for record ownership
}

/**
 * Verify the calling user has permission to import participants for the given event.
 * Returns the user's role AND the event owner's ID (for setting record ownership).
 */
async function verifyUploadAccess(userId: string, eventId: string): Promise<UploadAccessResult> {
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
  const eventOwner = (eventRecord.owner as string) || '';
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
    throw new Error(`Access denied: Role ${role} cannot import participants`);
  }

  throw new Error('Access denied: You do not have permission to import participants');
}

// Type definitions for better type safety
type ParticipantStatus = 'REGISTERED' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';
type DependentAge = 'baby' | 'child' | 'adult';

// Interface definitions for data structures
interface UploadParticipantsArguments {
  eventId: string;
  file: string; // base64 string
}

interface ParticipantData {
  id: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  roleId?: string;
  participantJob: string;
  participantNote?: string;
  participantStatus: ParticipantStatus;
  eventId: string;
  registrationDate: string;
  dependentsCount: number;
  documentationType?: string;
  documentLast4?: string;
  nationality?: string;
  residenceCountry?: string;
  organization?: string;
  emergencyContact?: string;
  internalId?: string;
  visaRequired?: boolean;
  visaSupport?: boolean;
  arrivalDate?: string;
  arrivalTime?: string;
  arrivalFlight?: string;
  arrivalLayovers?: string;
  arrivalAirport?: string;
  transferRequired?: boolean;
  transferDetails?: string;
  transferCost?: number;
  transferCurrency?: string;
  hotel?: string;
  roomType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  ratePerNight?: number;
  rateCurrency?: string;
  accommodationCost?: number;
  departureDate?: string;
  departureTime?: string;
  departureFlight?: string;
  departureAirport?: string;
  ticketFare?: number;
  ticketCurrency?: string;
  taxesExtras?: number;
  taxesCurrency?: string;
  totalTravelCost?: number;
  totalTravelCurrency?: string;
  paymentStatus?: string;
  bookingReference?: string;
  bookingAgency?: string;
  dietaryRestriction?: string;
  protocol?: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  __typename?: string;
}

interface DependentData {
  id: string;
  name: string;
  age: DependentAge;
  participantId: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  __typename?: string;
}

/**
 * Resolve a role name to a role ID. Looks up existing roles in the ROLE_TABLE
 * by eventId (using byEventId GSI) and name. If not found, creates a new Role record.
 * The cache is passed in per-invocation to avoid stale data across warm Lambda restarts.
 */
async function resolveRoleId(roleName: string, owner: string, eventId: string, roleCache: Map<string, string>): Promise<string | undefined> {
  if (!roleName || !roleName.trim()) return undefined;

  const trimmedName = roleName.trim();
  const cacheKey = `${trimmedName.toLowerCase()}||${eventId}`;
  if (roleCache.has(cacheKey)) {
    return roleCache.get(cacheKey);
  }

  // Query ROLE_TABLE using byEventId GSI + filter by name
  const { Items } = await client.send(new QueryCommand({
    TableName: ROLE_TABLE,
    IndexName: 'byEventId',
    KeyConditionExpression: 'eventId = :eid',
    FilterExpression: '#name = :name',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: marshall({ ':eid': eventId, ':name': trimmedName }),
  }));

  if (Items && Items.length > 0) {
    const existingRole = unmarshall(Items[0]);
    const id = existingRole.id as string;

    // Re-introducing an archived role unarchives it. Name uniqueness is
    // global within an event; `archived` controls visibility, not identity.
    if (existingRole.archived === true) {
      await client.send(new UpdateItemCommand({
        TableName: ROLE_TABLE,
        Key: marshall({ id }),
        UpdateExpression: 'SET archived = :false, #u = :now',
        ExpressionAttributeNames: { '#u': 'updatedAt' },
        ExpressionAttributeValues: marshall({
          ':false': false,
          ':now': new Date().toISOString(),
        }),
      }));
      logger.info(`Revived archived role ${id}`, { roleName: trimmedName, eventId });
    }

    roleCache.set(cacheKey, id);
    return id;
  }

  // Role not found — create a new one with eventId
  const now = new Date().toISOString();
  const newRoleId = uuidv4();
  await client.send(new PutItemCommand({
    TableName: ROLE_TABLE,
    Item: marshall({
      id: newRoleId,
      name: trimmedName,
      eventId,
      owner,
      createdAt: now,
      updatedAt: now,
      __typename: 'Role',
    }),
  }));

  roleCache.set(cacheKey, newRoleId);
  return newRoleId;
}

/**
 * Build a normalized key for duplicate detection.
 * Combines name + email + phone in lowercase, trimmed, with phone stripped of non-digits.
 */
function buildDuplicateKey(name: string, email: string, phone: string): string {
  const normName = (name || '').trim().toLowerCase();
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/[\s\-\(\)\+\.]/g, '').toLowerCase();
  return `${normName}||${normEmail}||${normPhone}`;
}

/**
 * Fetch all existing participants for an event and return a Set of normalized duplicate keys.
 * Uses the GSI gsi-Event.participants with pagination.
 */
async function fetchExistingParticipants(eventId: string): Promise<Set<string>> {
  const existingKeys = new Set<string>();
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const result = await client.send(new QueryCommand({
      TableName: PARTICIPANT_TABLE,
      IndexName: 'gsi-Event.participants',
      KeyConditionExpression: 'eventId = :eid',
      ProjectionExpression: 'participantName, participantEmail, participantPhone',
      ExpressionAttributeValues: marshall({ ':eid': eventId }),
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    }));

    for (const item of result.Items || []) {
      const record = unmarshall(item);
      const key = buildDuplicateKey(
        record.participantName as string,
        record.participantEmail as string,
        record.participantPhone as string
      );
      existingKeys.add(key);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return existingKeys;
}

/**
 * Scan the first 10 rows of a worksheet looking for a row that contains
 * recognisable header names ("nome" or "name" AND "email").
 * Returns the 1-based row number. Falls back to row 1 if nothing matches.
 */
function findHeaderRow(worksheet: ExcelJS.Worksheet): number {
  const maxScan = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxScan; r++) {
    const row = worksheet.getRow(r);
    const cells = ((row.values || []) as unknown[])
      .map(v => { try { return (v ?? '').toString().toLowerCase().trim(); } catch { return ''; } });

    const hasName = cells.some(c => c === 'nome' || c === 'nome completo' || c === 'name' || c === 'full name' || c === 'participante');
    const hasEmail = cells.some(c => c === 'email' || c === 'e-mail' || c === 'correio' || c === 'mail');

    if (hasName && hasEmail) {
      logger.info('Header row detected', { row: r });
      return r;
    }
  }
  logger.info('Header row not detected, defaulting to row 1');
  return 1;
}

/**
 * Parse a participant status string (PT/EN) into a ParticipantStatus enum value.
 */
function parseParticipantStatus(value: string): ParticipantStatus | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (['inscrito', 'inscrita', 'registered'].includes(v)) return 'REGISTERED';
  if (['confirmado', 'confirmada', 'confirmed'].includes(v)) return 'CONFIRMED';
  if (['cancelado', 'cancelada', 'cancelled', 'canceled'].includes(v)) return 'CANCELLED';
  if (['presente', 'attended', 'compareceu'].includes(v)) return 'ATTENDED';
  return undefined;
}

// Column mapping for multilingual support (PT/EN)
// NOTE: Order matters for contains/word-level fallback — more specific synonyms first.
// Avoid short generic words (e.g. "total", "data", "custo") that cause cross-column conflicts.
const COLUMN_MAPPINGS = {
  name: ['nome completo', 'nome', 'name', 'full name', 'participante', 'participant'],
  documentationType: ['documentação', 'documentacao', 'documentation', 'tipo de documento'],
  role: ['função', 'funcao', 'role', 'categoria'],
  organization: ['organização', 'organizacao', 'instituição', 'organization'],
  nationality: ['nacionalidade', 'nationality'],
  residenceCountry: ['pais de residencia', 'país de residência', 'país', 'pais', 'reg. de resid', 'residence country'],
  phone: ['telefone', 'phone', 'telemóvel', 'celular', 'tel'],
  email: ['email', 'e-mail', 'correio', 'mail'],
  documentLast4: ['passaporte', 'últimos 4', 'ultimos 4', 'ultimos 4 digitos', 'passport', 'last 4'],
  visaRequired: ['visto necessário', 'visto necessario', 'visa required'],
  visaSupport: ['apoio visto', 'suporte de visto', 'suporte visto', 'visa support'],
  arrivalDate: ['data de chegada', 'data chegada', 'arrival date'],
  arrivalTime: ['hora de chegada', 'hora chegada', 'arrival time'],
  arrivalFlight: ['voo de chegada', 'arrival flight'],
  arrivalLayovers: ['aeroporto passagem', 'escalas', 'layovers'],
  arrivalAirport: ['aeroporto de chegada', 'aeroporto chegada', 'arrival airport'],
  transferRequired: ['transfer necessário', 'transfer necessario', 'transfer required'],
  transferDetails: ['detalhes transfer', 'transfer details', 'detalhes'],
  hotel: ['hotel', 'alojamento', 'accommodation'],
  roomType: ['tipo de quarto', 'room type'],
  checkInDate: ['check-in', 'checkin'],
  checkOutDate: ['check-out', 'checkout'],
  nights: ['noites', 'nights'],
  ratePerNight: ['tarifa por noite', 'tarifa/noite', 'rate per night'],
  accommodationCost: ['custo total alojamento', 'custo estada', 'accommodation cost'],
  transferCost: ['custo transfer', 'transfer cost'],
  ticketFare: ['valor do bilhete', 'bilhete', 'tarifa bilhete', 'ticket fare'],
  taxesExtras: ['taxas / extras', 'taxas/extras', 'taxas', 'extras', 'taxes'],
  totalTravelCost: ['custo total', 'total viagem', 'total travel'],
  departureDate: ['data de partida', 'data partida', 'departure date'],
  departureTime: ['hora de partida', 'hora partida', 'departure time'],
  departureFlight: ['voo de partida', 'departure flight'],
  departureAirport: ['aeroporto de partida', 'aeroporto partida', 'departure airport'],
  bookingReference: ['referencia de reserva', 'ref. reserva', 'pnr', 'booking reference'],
  bookingAgency: ['agencia de reserva', 'agência', 'agencia', 'booking agency'],
  paymentStatus: ['estado do pagamento', 'estado do pag', 'estado pagamento', 'payment status'],
  note: ['notas', 'nota', 'note', 'req. especiais', 'observação'],
  emergencyContact: ['contacto de emergencia', 'contactos emergência', 'contactos emergencia', 'emergency contact'],
  dietaryRestriction: ['restricao alimentar', 'restrição alimentar', 'dietary restriction'],
  internalId: ['id interno', 'internal id'],
  protocol: ['protocolo', 'protocol'],
  job: ['profissão', 'cargo / função', 'cargo', 'job', 'occupation'],
  hasDependent: ['acompanhante', 'acompanhantes', 'dependent', 'dependente'],
  dependentCount: ['qtd. acompanhantes', 'qtd acompanhantes', 'quantidade', 'qtd', 'quantity', 'número acompanhantes'],
  participantStatus: ['status', 'estado'],
  registrationDate: ['registo', 'data registo', 'data de registo', 'registration', 'registration date'],
  transferCurrencyCol: ['moeda transfer', 'transfer currency'],
  ticketCurrencyCol: ['moeda bilhete', 'ticket currency'],
  taxesCurrencyCol: ['moeda taxas', 'taxes currency'],
  totalTravelCurrencyCol: ['moeda total', 'total currency'],
  rateCurrencyCol: ['moeda alojamento', 'accommodation currency', 'moeda tarifa']
};

// Helper function to find column indices in Excel file
function findColumnIndex(headerRow: ExcelJS.Row, columnNames: string[]): number {
  const headers = (headerRow.values as string[])
    .map(header => header?.toString().toLowerCase().trim());

  // Pass 1: exact match (highest priority)
  const exactIndex = headers.findIndex(header => {
    if (!header) return false;
    return columnNames.some(name => header === name.toLowerCase().trim());
  });
  if (exactIndex !== -1) return exactIndex;

  // Pass 2: header contains column name (e.g. "nome completo" contains "nome")
  const containsIndex = headers.findIndex(header => {
    if (!header) return false;
    return columnNames.some(name => header.includes(name.toLowerCase().trim()));
  });
  if (containsIndex !== -1) return containsIndex;

  // Pass 3: word-level match as fallback
  return headers.findIndex(header => {
    if (!header) return false;
    const headerWords = header.split(/[\s\-_]+/);
    return columnNames.some(name => {
      const nameWords = name.toLowerCase().trim().split(/[\s\-_]+/);
      return headerWords.some(word => word.length > 2 && nameWords.includes(word));
    });
  });
}

// Helper functions for parsing
function parseBoolean(value: string): boolean | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (['sim', 'yes', 's', 'y', 'true', '1'].includes(v)) return true;
  if (['não', 'nao', 'no', 'n', 'false', '0'].includes(v)) return false;
  return undefined;
}

function parsePaymentStatus(value: string): string | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (['pendente', 'pending'].includes(v)) return 'PENDING';
  if (['pago', 'paid'].includes(v)) return 'PAID';
  if (['parcial', 'partial'].includes(v)) return 'PARTIAL';
  return undefined;
}

function parseCurrencyValue(cellText: string): { value?: number; currency?: string } {
  if (!cellText) return {};
  const match = cellText.match(/^([\d.,]+)\s*([A-Za-z€$£]{1,5})?$/);
  if (match) {
    return {
      value: parseFloat(match[1].replace(',', '.')),
      currency: match[2] || undefined,
    };
  }
  const num = parseFloat(cellText.replace(',', '.'));
  return isNaN(num) ? {} : { value: num };
}

// Process Excel file and extract participant and dependent data
async function processExcelFile(base64File: string, eventId: string, owner: string, roleCache: Map<string, string>): Promise<{ participants: ParticipantData[], dependents: DependentData[] }> {
  if (!base64File) {
    throw new Error('Ficheiro não fornecido');
  }

  const bufferData = Buffer.from(base64File, 'base64');
  const arrayBuffer = bufferData.buffer.slice(bufferData.byteOffset, bufferData.byteOffset + bufferData.byteLength);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('Folha de cálculo não encontrada no ficheiro Excel');
  }

  const participants: ParticipantData[] = [];
  const allDependents: DependentData[] = [];
  const now = new Date().toISOString();

  // Detect header row dynamically (supports templates with headers on row 1, 3, etc.)
  const headerRowNumber = findHeaderRow(worksheet);
  const headerRow = worksheet.getRow(headerRowNumber);
  const columnIndices = {
    name: findColumnIndex(headerRow, COLUMN_MAPPINGS.name),
    email: findColumnIndex(headerRow, COLUMN_MAPPINGS.email),
    phone: findColumnIndex(headerRow, COLUMN_MAPPINGS.phone),
    role: findColumnIndex(headerRow, COLUMN_MAPPINGS.role),
    job: findColumnIndex(headerRow, COLUMN_MAPPINGS.job),
    note: findColumnIndex(headerRow, COLUMN_MAPPINGS.note),
    hasDependent: findColumnIndex(headerRow, COLUMN_MAPPINGS.hasDependent),
    dependentCount: findColumnIndex(headerRow, COLUMN_MAPPINGS.dependentCount),
    documentationType: findColumnIndex(headerRow, COLUMN_MAPPINGS.documentationType),
    organization: findColumnIndex(headerRow, COLUMN_MAPPINGS.organization),
    nationality: findColumnIndex(headerRow, COLUMN_MAPPINGS.nationality),
    residenceCountry: findColumnIndex(headerRow, COLUMN_MAPPINGS.residenceCountry),
    documentLast4: findColumnIndex(headerRow, COLUMN_MAPPINGS.documentLast4),
    visaRequired: findColumnIndex(headerRow, COLUMN_MAPPINGS.visaRequired),
    visaSupport: findColumnIndex(headerRow, COLUMN_MAPPINGS.visaSupport),
    arrivalDate: findColumnIndex(headerRow, COLUMN_MAPPINGS.arrivalDate),
    arrivalTime: findColumnIndex(headerRow, COLUMN_MAPPINGS.arrivalTime),
    arrivalFlight: findColumnIndex(headerRow, COLUMN_MAPPINGS.arrivalFlight),
    arrivalLayovers: findColumnIndex(headerRow, COLUMN_MAPPINGS.arrivalLayovers),
    arrivalAirport: findColumnIndex(headerRow, COLUMN_MAPPINGS.arrivalAirport),
    transferRequired: findColumnIndex(headerRow, COLUMN_MAPPINGS.transferRequired),
    transferDetails: findColumnIndex(headerRow, COLUMN_MAPPINGS.transferDetails),
    hotel: findColumnIndex(headerRow, COLUMN_MAPPINGS.hotel),
    roomType: findColumnIndex(headerRow, COLUMN_MAPPINGS.roomType),
    checkInDate: findColumnIndex(headerRow, COLUMN_MAPPINGS.checkInDate),
    checkOutDate: findColumnIndex(headerRow, COLUMN_MAPPINGS.checkOutDate),
    nights: findColumnIndex(headerRow, COLUMN_MAPPINGS.nights),
    ratePerNight: findColumnIndex(headerRow, COLUMN_MAPPINGS.ratePerNight),
    accommodationCost: findColumnIndex(headerRow, COLUMN_MAPPINGS.accommodationCost),
    transferCost: findColumnIndex(headerRow, COLUMN_MAPPINGS.transferCost),
    ticketFare: findColumnIndex(headerRow, COLUMN_MAPPINGS.ticketFare),
    taxesExtras: findColumnIndex(headerRow, COLUMN_MAPPINGS.taxesExtras),
    totalTravelCost: findColumnIndex(headerRow, COLUMN_MAPPINGS.totalTravelCost),
    departureDate: findColumnIndex(headerRow, COLUMN_MAPPINGS.departureDate),
    departureTime: findColumnIndex(headerRow, COLUMN_MAPPINGS.departureTime),
    departureFlight: findColumnIndex(headerRow, COLUMN_MAPPINGS.departureFlight),
    departureAirport: findColumnIndex(headerRow, COLUMN_MAPPINGS.departureAirport),
    bookingReference: findColumnIndex(headerRow, COLUMN_MAPPINGS.bookingReference),
    bookingAgency: findColumnIndex(headerRow, COLUMN_MAPPINGS.bookingAgency),
    paymentStatus: findColumnIndex(headerRow, COLUMN_MAPPINGS.paymentStatus),
    emergencyContact: findColumnIndex(headerRow, COLUMN_MAPPINGS.emergencyContact),
    dietaryRestriction: findColumnIndex(headerRow, COLUMN_MAPPINGS.dietaryRestriction),
    internalId: findColumnIndex(headerRow, COLUMN_MAPPINGS.internalId),
    protocol: findColumnIndex(headerRow, COLUMN_MAPPINGS.protocol),
    participantStatus: findColumnIndex(headerRow, COLUMN_MAPPINGS.participantStatus),
    registrationDate: findColumnIndex(headerRow, COLUMN_MAPPINGS.registrationDate),
    transferCurrencyCol: findColumnIndex(headerRow, COLUMN_MAPPINGS.transferCurrencyCol),
    ticketCurrencyCol: findColumnIndex(headerRow, COLUMN_MAPPINGS.ticketCurrencyCol),
    taxesCurrencyCol: findColumnIndex(headerRow, COLUMN_MAPPINGS.taxesCurrencyCol),
    totalTravelCurrencyCol: findColumnIndex(headerRow, COLUMN_MAPPINGS.totalTravelCurrencyCol),
    rateCurrencyCol: findColumnIndex(headerRow, COLUMN_MAPPINGS.rateCurrencyCol),
  };

  // Collect all data rows (skip header and any rows before it)
  const rows: ExcelJS.Row[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return; // Skip header row and any rows above it
    rows.push(row);
  });

  // Process rows async (for role resolution)
  let rowIndex = headerRowNumber; // Data starts after header row
  for (const row of rows) {
    rowIndex++;
    try {
      const roleName = columnIndices.role > 0 ? row.getCell(columnIndices.role).text.trim() : '';
      const roleId = roleName ? await resolveRoleId(roleName, owner, eventId, roleCache) : undefined;

      // Currency fields
      const ratePerNightData = parseCurrencyValue(columnIndices.ratePerNight > 0 ? row.getCell(columnIndices.ratePerNight).text.trim() : '');
      const transferCostData = parseCurrencyValue(columnIndices.transferCost > 0 ? row.getCell(columnIndices.transferCost).text.trim() : '');
      const ticketFareData = parseCurrencyValue(columnIndices.ticketFare > 0 ? row.getCell(columnIndices.ticketFare).text.trim() : '');
      const taxesExtrasData = parseCurrencyValue(columnIndices.taxesExtras > 0 ? row.getCell(columnIndices.taxesExtras).text.trim() : '');
      const totalTravelCostData = parseCurrencyValue(columnIndices.totalTravelCost > 0 ? row.getCell(columnIndices.totalTravelCost).text.trim() : '');
      const nightsRaw = columnIndices.nights > 0 ? row.getCell(columnIndices.nights).text.trim() : '';
      const accommodationCostRaw = columnIndices.accommodationCost > 0 ? row.getCell(columnIndices.accommodationCost).text.trim() : '';

      // Create participant record
      const participant: ParticipantData = {
        id: uuidv4(),
        participantName: columnIndices.name > 0 ? row.getCell(columnIndices.name).text.trim() : '--',
        participantEmail: columnIndices.email > 0 ? row.getCell(columnIndices.email).text.trim() : '--',
        participantPhone: columnIndices.phone > 0 ? row.getCell(columnIndices.phone).text.trim() : '--',
        roleId,
        participantJob: columnIndices.job > 0 ? row.getCell(columnIndices.job).text.trim() : '--',
        participantNote: columnIndices.note > 0 ? row.getCell(columnIndices.note).text.trim() : undefined,
        participantStatus: (columnIndices.participantStatus > 0
          ? parseParticipantStatus(row.getCell(columnIndices.participantStatus).text.trim())
          : undefined) || 'REGISTERED',
        eventId,
        registrationDate: columnIndices.registrationDate > 0
          ? (parseDateToISO(row.getCell(columnIndices.registrationDate).text.trim()) || now)
          : now,
        dependentsCount: 0,
        // Identification
        documentationType: columnIndices.documentationType > 0 ? row.getCell(columnIndices.documentationType).text.trim() || undefined : undefined,
        documentLast4: columnIndices.documentLast4 > 0 ? row.getCell(columnIndices.documentLast4).text.trim() || undefined : undefined,
        nationality: columnIndices.nationality > 0 ? row.getCell(columnIndices.nationality).text.trim() || undefined : undefined,
        residenceCountry: columnIndices.residenceCountry > 0 ? row.getCell(columnIndices.residenceCountry).text.trim() || undefined : undefined,
        organization: columnIndices.organization > 0 ? row.getCell(columnIndices.organization).text.trim() || undefined : undefined,
        emergencyContact: columnIndices.emergencyContact > 0 ? row.getCell(columnIndices.emergencyContact).text.trim() || undefined : undefined,
        internalId: columnIndices.internalId > 0 ? row.getCell(columnIndices.internalId).text.trim() || undefined : undefined,
        // Visa
        visaRequired: columnIndices.visaRequired > 0 ? parseBoolean(row.getCell(columnIndices.visaRequired).text) : undefined,
        visaSupport: columnIndices.visaSupport > 0 ? parseBoolean(row.getCell(columnIndices.visaSupport).text) : undefined,
        // Arrival
        arrivalDate: columnIndices.arrivalDate > 0 ? row.getCell(columnIndices.arrivalDate).text.trim() || undefined : undefined,
        arrivalTime: columnIndices.arrivalTime > 0 ? row.getCell(columnIndices.arrivalTime).text.trim() || undefined : undefined,
        arrivalFlight: columnIndices.arrivalFlight > 0 ? row.getCell(columnIndices.arrivalFlight).text.trim() || undefined : undefined,
        arrivalLayovers: columnIndices.arrivalLayovers > 0 ? row.getCell(columnIndices.arrivalLayovers).text.trim() || undefined : undefined,
        arrivalAirport: columnIndices.arrivalAirport > 0 ? row.getCell(columnIndices.arrivalAirport).text.trim() || undefined : undefined,
        // Transfer
        transferRequired: columnIndices.transferRequired > 0 ? parseBoolean(row.getCell(columnIndices.transferRequired).text) : undefined,
        transferDetails: columnIndices.transferDetails > 0 ? row.getCell(columnIndices.transferDetails).text.trim() || undefined : undefined,
        transferCost: transferCostData.value,
        transferCurrency: (columnIndices.transferCurrencyCol > 0
          ? row.getCell(columnIndices.transferCurrencyCol).text.trim() || undefined
          : undefined) || transferCostData.currency,
        // Accommodation
        hotel: columnIndices.hotel > 0 ? row.getCell(columnIndices.hotel).text.trim() || undefined : undefined,
        roomType: columnIndices.roomType > 0 ? row.getCell(columnIndices.roomType).text.trim() || undefined : undefined,
        checkInDate: columnIndices.checkInDate > 0 ? row.getCell(columnIndices.checkInDate).text.trim() || undefined : undefined,
        checkOutDate: columnIndices.checkOutDate > 0 ? row.getCell(columnIndices.checkOutDate).text.trim() || undefined : undefined,
        nights: nightsRaw ? parseInt(nightsRaw) || undefined : undefined,
        ratePerNight: ratePerNightData.value,
        rateCurrency: (columnIndices.rateCurrencyCol > 0
          ? row.getCell(columnIndices.rateCurrencyCol).text.trim() || undefined
          : undefined) || ratePerNightData.currency,
        accommodationCost: accommodationCostRaw ? parseFloat(accommodationCostRaw.replace(',', '.')) || undefined : undefined,
        // Departure
        departureDate: columnIndices.departureDate > 0 ? row.getCell(columnIndices.departureDate).text.trim() || undefined : undefined,
        departureTime: columnIndices.departureTime > 0 ? row.getCell(columnIndices.departureTime).text.trim() || undefined : undefined,
        departureFlight: columnIndices.departureFlight > 0 ? row.getCell(columnIndices.departureFlight).text.trim() || undefined : undefined,
        departureAirport: columnIndices.departureAirport > 0 ? row.getCell(columnIndices.departureAirport).text.trim() || undefined : undefined,
        // Financial
        ticketFare: ticketFareData.value,
        ticketCurrency: (columnIndices.ticketCurrencyCol > 0
          ? row.getCell(columnIndices.ticketCurrencyCol).text.trim() || undefined
          : undefined) || ticketFareData.currency,
        taxesExtras: taxesExtrasData.value,
        taxesCurrency: (columnIndices.taxesCurrencyCol > 0
          ? row.getCell(columnIndices.taxesCurrencyCol).text.trim() || undefined
          : undefined) || taxesExtrasData.currency,
        totalTravelCost: totalTravelCostData.value,
        totalTravelCurrency: (columnIndices.totalTravelCurrencyCol > 0
          ? row.getCell(columnIndices.totalTravelCurrencyCol).text.trim() || undefined
          : undefined) || totalTravelCostData.currency,
        paymentStatus: columnIndices.paymentStatus > 0 ? parsePaymentStatus(row.getCell(columnIndices.paymentStatus).text) : undefined,
        bookingReference: columnIndices.bookingReference > 0 ? row.getCell(columnIndices.bookingReference).text.trim() || undefined : undefined,
        bookingAgency: columnIndices.bookingAgency > 0 ? row.getCell(columnIndices.bookingAgency).text.trim() || undefined : undefined,
        // Other
        dietaryRestriction: columnIndices.dietaryRestriction > 0 ? row.getCell(columnIndices.dietaryRestriction).text.trim() || undefined : undefined,
        protocol: columnIndices.protocol > 0 ? row.getCell(columnIndices.protocol).text.trim() || undefined : undefined,
        createdAt: now,
        updatedAt: now,
        owner,
        __typename: 'Participant'
      };

      if (!participant.participantName || participant.participantName === '--') {
        throw new Error(`Nome em falta na linha ${rowIndex}`);
      }

      // Process dependents
      let dependentCount = 0;

      if (columnIndices.hasDependent > 0) {
        const hasDependentValue = row.getCell(columnIndices.hasDependent).text.trim().toLowerCase();
        if (['sim', 'yes', 's', 'y'].includes(hasDependentValue)) {
          dependentCount = 1;
        } else if (!isNaN(Number(hasDependentValue)) && Number(hasDependentValue) > 0) {
          dependentCount = Number(hasDependentValue);
        }
      }

      if (dependentCount === 0 && columnIndices.dependentCount > 0) {
        const countValue = row.getCell(columnIndices.dependentCount).text.trim();
        if (countValue && !isNaN(Number(countValue))) {
          dependentCount = parseInt(countValue);
        }
      }

      // Create dependent records if needed
      if (dependentCount > 0) {
        const dependents: DependentData[] = Array(dependentCount).fill(null).map(() => ({
          id: uuidv4(),
          name: '--',
          age: 'adult' as DependentAge,
          participantId: participant.id,
          eventId,
          createdAt: now,
          updatedAt: now,
          owner,
          __typename: 'Dependent'
        }));

        participant.dependentsCount = dependents.length;
        allDependents.push(...dependents);
      }

      participants.push(participant);
    } catch (error) {
      logger.error(`Erro ao processar linha ${rowIndex}:`, { error });
      throw error;
    }
  }

  // Log total dependents found after processing all rows

  return { participants, dependents: allDependents };
}

// Batch write items to DynamoDB with retry for unprocessed items
async function batchWriteItems<T extends ParticipantData | DependentData>(
  items: T[],
  tableName: string
): Promise<void> {
  const batchSize = 25;
  const MAX_RETRIES = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    let writeRequests: WriteRequest[] = batch.map(item => ({
      PutRequest: {
        Item: marshall(item, { removeUndefinedValues: true })
      }
    }));

    let retryCount = 0;
    while (writeRequests.length > 0) {
      try {
        const response = await client.send(new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: writeRequests
          }
        }));

        const unprocessed = response.UnprocessedItems?.[tableName] || [];
        if (unprocessed.length === 0) {
          logger.info(`Batch processed successfully: ${i + 1} to ${Math.min(i + batchSize, items.length)}`);
          break;
        }

        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          logger.error('Max retries reached for unprocessed items', {
            unprocessedCount: unprocessed.length,
            batchRange: `${i + 1} to ${Math.min(i + batchSize, items.length)}`
          });
          throw new Error(`Falha ao guardar ${unprocessed.length} item(ns) após ${MAX_RETRIES} tentativas`);
        }

        logger.warn(`Retrying ${unprocessed.length} unprocessed items (attempt ${retryCount}/${MAX_RETRIES})`);
        writeRequests = unprocessed;
        await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, retryCount), 3000)));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Falha ao guardar')) {
          throw error;
        }
        logger.error('Error writing batch:', { error });
        throw new Error('Falha ao guardar dados na base de dados');
      }
    }
  }
}

// Main Lambda handler
export const handler = async (event: {
  arguments: UploadParticipantsArguments,
  identity: {
    sub: string,
    username: string
  }
}, context: Context) => {
  try {
    // Input validation — check identity BEFORE using it
    if (!event.identity?.sub) {
      throw new Error('Utilizador não autenticado. Por favor, inicie sessão novamente.');
    }

    const { eventId, file } = event.arguments;

    if (!eventId) {
      throw new Error('ID do evento não fornecido. Este campo é obrigatório.');
    }

    if (!file) {
      throw new Error('Nenhum ficheiro foi enviado. Por favor, selecione um ficheiro Excel.');
    }

    if (!/^[A-Za-z0-9+/=]+$/.test(file)) {
      throw new Error('O ficheiro não está no formato correto. Certifique-se de enviar um ficheiro Excel válido.');
    }

    // Verify access control before processing — also returns the event owner's ID
    // so imported records are owned by the event owner (not the collaborator)
    const { role: userRole, eventOwner } = await verifyUploadAccess(event.identity.sub, eventId);
    const owner = eventOwner;
    logger.info('Access verified', { userId: event.identity.sub, eventId, userRole });

    // Gate de billing (§4): janela de escrita do plano do dono; o limite de
    // participantes é validado após a deduplicação (só os genuinamente novos contam).
    const billingGate = await ensureEventWritable({
      eventTableName: EVENT_TABLE,
      subscriptionTableName: USER_SUBSCRIPTION_TABLE,
      eventId,
    });

    logger.info('Starting file processing', { eventId, fileSize: file.length, owner });

    // Process file and save data (roleCache is per-invocation to avoid stale data across warm restarts)
    const roleCache = new Map<string, string>();
    const { participants, dependents } = await processExcelFile(file, eventId, owner, roleCache);
    logger.info(`Processed ${participants.length} participants and ${dependents.length} dependents from file.`);

    // --- Duplicate detection ---
    const existingKeys = await fetchExistingParticipants(eventId);
    logger.info(`Fetched ${existingKeys.size} existing participant keys for duplicate check.`);

    const newParticipants: ParticipantData[] = [];
    const duplicateEntries: { name: string; email: string; phone: string }[] = [];
    const duplicateParticipantIds = new Set<string>();

    for (const participant of participants) {
      const key = buildDuplicateKey(
        participant.participantName,
        participant.participantEmail,
        participant.participantPhone
      );

      if (existingKeys.has(key)) {
        // Duplicate found — skip this participant
        duplicateEntries.push({
          name: participant.participantName,
          email: participant.participantEmail,
          phone: participant.participantPhone,
        });
        duplicateParticipantIds.add(participant.id);
      } else {
        // New participant — add key to set to detect intra-file duplicates
        existingKeys.add(key);
        newParticipants.push(participant);
      }
    }

    // Filter dependents: exclude those belonging to duplicate participants
    const newDependents = dependents.filter(d => !duplicateParticipantIds.has(d.participantId));

    logger.info(`Duplicate detection complete`, {
      total: participants.length,
      new: newParticipants.length,
      skipped: duplicateEntries.length,
      newDependents: newDependents.length,
    });

    ensureWithinLimit(
      billingGate.entitlements,
      'participants',
      (billingGate.eventRecord.participantCount as number) ?? 0,
      newParticipants.length
    );

    // Write new participants to DynamoDB
    if (newParticipants.length > 0) {
      await batchWriteItems(newParticipants, PARTICIPANT_TABLE);
      logger.info('Participants successfully written to DynamoDB.');
    }

    // Write new dependents to DynamoDB
    if (newDependents.length > 0) {
      await batchWriteItems(newDependents, DEPENDENT_TABLE);
      logger.info('Dependents successfully written to DynamoDB.');
    }

    // participantCount, dependentCount and totalRegistrations are now
    // updated automatically by DynamoDB Streams (participantStream / dependentStream)

    // Log the final counts just before returning the successful response
    logger.info('Final counts before returning', {
        participantsCount: newParticipants.length,
        dependentsCount: newDependents.length,
        skippedCount: duplicateEntries.length,
    });

    // Directly return the object matching the schema
    return {
      success: true,
      count: newParticipants.length,
      skipped: duplicateEntries.length,
      message: duplicateEntries.length > 0
        ? `Importação bem-sucedida. ${newParticipants.length} participante(s) e ${newDependents.length} dependente(s) adicionados. ${duplicateEntries.length} duplicado(s) ignorado(s).`
        : `Importação bem-sucedida. ${newParticipants.length} participante(s) e ${newDependents.length} dependente(s) foram adicionados.`,
      details: {
        participantsCount: newParticipants.length,
        dependentsCount: newDependents.length,
        skippedCount: duplicateEntries.length,
        eventId
      },
      duplicates: duplicateEntries.length > 0 ? JSON.stringify(duplicateEntries) : null
    };

  } catch (error) {
    // --- Add logging for the caught error before returning ---
    logger.error('Error during upload process:', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      eventId: event?.arguments?.eventId
    });
    // --- End of added logic ---

    // Directly return the error object matching the schema structure
    return {
      success: false,
      count: 0,
      skipped: 0,
      message: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido durante a importação.',
      details: {
          participantsCount: 0,
          dependentsCount: 0,
          skippedCount: 0,
          eventId: event?.arguments?.eventId || 'unknown'
      },
      duplicates: null
    };
  }
};
