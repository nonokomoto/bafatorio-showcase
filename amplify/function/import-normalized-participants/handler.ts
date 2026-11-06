import type { Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  verifyUploadAccess,
  fetchExistingParticipants,
  buildDuplicateKey,
  resolveRoleId,
  batchWriteItems,
  parseParticipantStatus,
  parsePaymentStatus,
  parseDateToISO,
} from '../shared/importUtils';
import { ensureEventWritable, ensureWithinLimit } from '../shared/entitlementGate';

const logger = new Logger({ serviceName: 'importNormalizedParticipants' });

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';
const PARTICIPANT_TABLE = process.env.BAFATORIO_APP_PARTICIPANT_TABLE_NAME || '';
const DEPENDENT_TABLE = process.env.BAFATORIO_APP_DEPENDENT_TABLE_NAME || '';

const MAX_BATCH_SIZE = 500;

interface ImportNormalizedParticipantsArguments {
  eventId: string;
  participants: string; // JSON-stringified array of normalized participant objects
}

interface NormalizedParticipant {
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  role?: string;
  participantJob?: string;
  participantNote?: string;
  participantStatus?: string;
  registrationDate?: string;
  hasDependent?: boolean;
  dependentsCount?: number;
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
}

export const handler = async (event: {
  arguments: ImportNormalizedParticipantsArguments;
  identity: { sub: string; username: string };
}, context: Context) => {
  try {
    // Input validation
    if (!event.identity?.sub) {
      throw new Error('Utilizador não autenticado. Por favor, inicie sessão novamente.');
    }

    const { eventId, participants: participantsJson } = event.arguments;

    if (!eventId) {
      throw new Error('ID do evento não fornecido. Este campo é obrigatório.');
    }

    if (!participantsJson) {
      throw new Error('Nenhum dado de participantes foi enviado.');
    }

    // Parse JSON
    let participants: NormalizedParticipant[];
    try {
      participants = JSON.parse(participantsJson);
    } catch {
      throw new Error('Dados de participantes inválidos. JSON malformado.');
    }

    if (!Array.isArray(participants)) {
      throw new Error('Dados de participantes devem ser um array.');
    }

    if (participants.length === 0) {
      return {
        success: true,
        count: 0,
        skipped: 0,
        message: 'Nenhum participante para importar.',
        details: { participantsCount: 0, dependentsCount: 0, skippedCount: 0, eventId },
        duplicates: null,
      };
    }

    if (participants.length > MAX_BATCH_SIZE) {
      throw new Error(`Máximo de ${MAX_BATCH_SIZE} participantes por lote. Recebidos: ${participants.length}.`);
    }

    // Verify access control — returns the event owner's ID for record ownership
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

    // Fetch existing participants for duplicate detection
    const existingKeys = await fetchExistingParticipants(eventId);
    logger.info(`Fetched ${existingKeys.size} existing participant keys for duplicate check.`);

    const now = new Date().toISOString();
    const roleCache = new Map<string, string>();
    const newParticipants: Record<string, any>[] = [];
    const allDependents: Record<string, any>[] = [];
    const duplicateEntries: { name: string; email: string; phone: string }[] = [];
    let invalidCount = 0;

    for (const p of participants) {
      const name = (p.participantName || '').trim();
      const email = (p.participantEmail || '').trim() || '--';
      const phone = (p.participantPhone || '').trim() || '--';

      if (!name) {
        invalidCount++;
        continue;
      }

      // Duplicate detection
      const key = buildDuplicateKey(name, email, phone);
      if (existingKeys.has(key)) {
        duplicateEntries.push({ name, email, phone });
        continue;
      }
      // Add key to prevent intra-batch duplicates
      existingKeys.add(key);

      // Resolve role if present
      const roleId = p.role ? await resolveRoleId(p.role, owner, eventId, roleCache) : undefined;

      const participantId = uuidv4();
      const participant: Record<string, any> = {
        id: participantId,
        participantName: name,
        participantEmail: email,
        participantPhone: phone,
        roleId,
        participantJob: (p.participantJob || '').trim() || '--',
        participantNote: p.participantNote || undefined,
        participantStatus: (p.participantStatus ? parseParticipantStatus(p.participantStatus) : undefined) || 'REGISTERED',
        eventId,
        registrationDate: parseDateToISO(p.registrationDate) || now,
        dependentsCount: 0,
        // Identification
        documentationType: p.documentationType || undefined,
        documentLast4: p.documentLast4 || undefined,
        nationality: p.nationality || undefined,
        residenceCountry: p.residenceCountry || undefined,
        organization: p.organization || undefined,
        emergencyContact: p.emergencyContact || undefined,
        internalId: p.internalId || undefined,
        // Visa
        visaRequired: p.visaRequired,
        visaSupport: p.visaSupport,
        // Arrival
        arrivalDate: p.arrivalDate || undefined,
        arrivalTime: p.arrivalTime || undefined,
        arrivalFlight: p.arrivalFlight || undefined,
        arrivalLayovers: p.arrivalLayovers || undefined,
        arrivalAirport: p.arrivalAirport || undefined,
        // Transfer
        transferRequired: p.transferRequired,
        transferDetails: p.transferDetails || undefined,
        transferCost: p.transferCost,
        transferCurrency: p.transferCurrency || undefined,
        // Accommodation
        hotel: p.hotel || undefined,
        roomType: p.roomType || undefined,
        checkInDate: p.checkInDate || undefined,
        checkOutDate: p.checkOutDate || undefined,
        nights: p.nights,
        ratePerNight: p.ratePerNight,
        rateCurrency: p.rateCurrency || undefined,
        accommodationCost: p.accommodationCost,
        // Departure
        departureDate: p.departureDate || undefined,
        departureTime: p.departureTime || undefined,
        departureFlight: p.departureFlight || undefined,
        departureAirport: p.departureAirport || undefined,
        // Financial
        ticketFare: p.ticketFare,
        ticketCurrency: p.ticketCurrency || undefined,
        taxesExtras: p.taxesExtras,
        taxesCurrency: p.taxesCurrency || undefined,
        totalTravelCost: p.totalTravelCost,
        totalTravelCurrency: p.totalTravelCurrency || undefined,
        paymentStatus: p.paymentStatus ? parsePaymentStatus(p.paymentStatus) : undefined,
        bookingReference: p.bookingReference || undefined,
        bookingAgency: p.bookingAgency || undefined,
        // Other
        dietaryRestriction: p.dietaryRestriction || undefined,
        protocol: p.protocol || undefined,
        createdAt: now,
        updatedAt: now,
        owner,
        __typename: 'Participant',
      };

      // Process dependents
      let dependentCount = 0;
      if (p.hasDependent && p.dependentsCount && p.dependentsCount > 0) {
        dependentCount = p.dependentsCount;
      } else if (p.dependentsCount && p.dependentsCount > 0) {
        dependentCount = p.dependentsCount;
      }

      if (dependentCount > 0) {
        for (let d = 0; d < dependentCount; d++) {
          allDependents.push({
            id: uuidv4(),
            name: '--',
            age: 'adult',
            participantId,
            eventId,
            createdAt: now,
            updatedAt: now,
            owner,
            __typename: 'Dependent',
          });
        }
        participant.dependentsCount = dependentCount;
      }

      newParticipants.push(participant);
    }

    logger.info('Duplicate detection complete', {
      total: participants.length,
      new: newParticipants.length,
      skipped: duplicateEntries.length + invalidCount,
      newDependents: allDependents.length,
      invalid: invalidCount,
    });

    const skippedCount = duplicateEntries.length + invalidCount;

    if (newParticipants.length === 0 && invalidCount > 0) {
      const message = duplicateEntries.length > 0
        ? `Nenhum participante foi importado. ${duplicateEntries.length} duplicado(s) e ${invalidCount} linha(s) inválida(s) foram ignorados.`
        : `Nenhum participante foi importado. ${invalidCount} linha(s) inválida(s) foram ignoradas.`;

      return {
        success: false,
        count: 0,
        skipped: skippedCount,
        message,
        details: {
          participantsCount: 0,
          dependentsCount: 0,
          skippedCount,
          eventId,
        },
        duplicates: duplicateEntries.length > 0 ? JSON.stringify(duplicateEntries) : null,
      };
    }

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
    if (allDependents.length > 0) {
      await batchWriteItems(allDependents, DEPENDENT_TABLE);
      logger.info('Dependents successfully written to DynamoDB.');
    }

    // participantCount, dependentCount and totalRegistrations are updated
    // automatically by DynamoDB Streams (participantStream / dependentStream)

    return {
      success: true,
      count: newParticipants.length,
      skipped: skippedCount,
      message: skippedCount > 0
        ? `Importação bem-sucedida. ${newParticipants.length} participante(s) e ${allDependents.length} dependente(s) adicionados. ${duplicateEntries.length} duplicado(s) e ${invalidCount} linha(s) inválida(s) ignorados.`
        : `Importação bem-sucedida. ${newParticipants.length} participante(s) e ${allDependents.length} dependente(s) foram adicionados.`,
      details: {
        participantsCount: newParticipants.length,
        dependentsCount: allDependents.length,
        skippedCount,
        eventId,
      },
      duplicates: duplicateEntries.length > 0 ? JSON.stringify(duplicateEntries) : null,
    };

  } catch (error) {
    logger.error('Error during import process:', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      eventId: event?.arguments?.eventId,
    });

    return {
      success: false,
      count: 0,
      skipped: 0,
      message: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido durante a importação.',
      details: {
        participantsCount: 0,
        dependentsCount: 0,
        skippedCount: 0,
        eventId: event?.arguments?.eventId || 'unknown',
      },
      duplicates: null,
    };
  }
};
