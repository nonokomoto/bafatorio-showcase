import { generateClient } from 'aws-amplify/data';

let client = null;

/**
 * Get the Amplify Data client (singleton)
 * Supports both classic graphql() and new models API
 * @returns {import('aws-amplify/data').Client}
 */
export const getClient = () => {
  if (!client) {
    client = generateClient();
  }
  return client;
};

export const createSelectionSet = (fields) => fields;

// Selection sets for Data Client queries with relations
// Fields must match amplify/data/resource.ts schema
export const SELECTION_SETS = {
  EVENT_WITH_PARTICIPANTS: [
    'id',
    'eventTitle',
    'eventManager',
    'eventManagerEmail',
    'eventManagerPhone',
    'eventLocation',
    'eventDateType',
    'eventStartDate',
    'eventEndDate',
    'eventSpecificDates',
    'eventTime',
    'eventCreationDate',
    'eventStatus',
    'eventType',
    'organizerId',
    'description',
    'categories',
    'budget',
    'committedExpenses',
    'effectiveExpenses',
    'participantCount',
    'createdAt',
    'updatedAt',
    'owner',
    'participants.id',
    'participants.participantName',
    'participants.participantEmail',
    'participants.participantStatus',
    'participants.roleId',
    'participants.role.id',
    'participants.role.name',
    'participants.dependentsCount'
  ],
  
  EVENT_MINIMAL: [
    'id',
    'eventTitle',
    'eventStatus',
    'eventType',
    'eventDateType',
    'eventStartDate',
    'eventEndDate',
    'eventSpecificDates',
    'eventTime',
    'eventCreationDate',
    'eventLocation',
    'categories',
    'budget',
    'participantCount',
    'dependentCount',
    'totalRegistrations'
  ],

  PARTICIPANT_WITH_DEPENDENTS: [
    'id',
    'participantName',
    'participantEmail',
    'participantPhone',
    'participantStatus',
    'participantJob',
    'participantNote',
    'eventId',
    'dependentsCount',
    'registrationDate',
    'attendedDate',
    'confirmationDate',
    // Role (FK)
    'roleId',
    'role.id',
    'role.name',
    // Identificacao
    'documentationType',
    'documentLast4',
    'nationality',
    'residenceCountry',
    'organization',
    'emergencyContact',
    'internalId',
    // Visto
    'visaRequired',
    'visaSupport',
    // Chegada
    'arrivalDate',
    'arrivalTime',
    'arrivalFlight',
    'arrivalLayovers',
    'arrivalAirport',
    // Transfer
    'transferRequired',
    'transferDetails',
    'transferCost',
    'transferCurrency',
    // Alojamento
    'hotel',
    'roomType',
    'checkInDate',
    'checkOutDate',
    'nights',
    'ratePerNight',
    'rateCurrency',
    'accommodationCost',
    // Partida
    'departureDate',
    'departureTime',
    'departureFlight',
    'departureAirport',
    // Financeiro
    'ticketFare',
    'ticketCurrency',
    'taxesExtras',
    'taxesCurrency',
    'totalTravelCost',
    'totalTravelCurrency',
    'paymentStatus',
    'bookingReference',
    'bookingAgency',
    // Outros
    'dietaryRestriction',
    'protocol',
    'photoUrl',
    'createdAt',
    'updatedAt',
    'owner',
    'dependents.id',
    'dependents.name',
    'dependents.age',
    'dependents.status',
    'dependents.attendedDate'
  ],

  ROLE_BASIC: [
    'id',
    'name',
    'createdAt',
    'updatedAt',
    'owner'
  ],

  DEPENDENT_BASIC: [
    'id',
    'name',
    'age',
    'participantId',
    'status',
    'attendedDate',
    'createdAt',
    'updatedAt',
    'owner'
  ],

  // Selection Set para EventSupplier COM relações Event e Supplier
  EVENT_SUPPLIER_WITH_RELATIONS: [
    'id',
    'eventId',
    'supplierId',
    'quoteAmount',
    'status',
    'invoiceS3Key',
    'paidAt',
    'createdAt',
    'updatedAt',
    'owner',
    // Dados do Event relacionado
    'event.id',
    'event.eventTitle',
    'event.eventStatus',
    'event.budget',
    'event.committedExpenses',
    'event.effectiveExpenses',
    // Dados do Supplier relacionado
    'supplier.id',
    'supplier.name',
    'supplier.category',
    'supplier.contactName',
    'supplier.contactEmail',
    'supplier.contactPhone',
    'supplier.currency'
  ],

  // Selection Set completo para Supplier (todos os campos escalares)
  SUPPLIER_BASIC: [
    'id',
    'name',
    'category',
    'contactName',
    'contactEmail',
    'contactPhone',
    'country',
    'currency',
    'address',
    'vatNumber',
    'website',
    'paymentDetails',
    'estimateMinAmount',
    'estimateMaxAmount',
    'estimateUnit',
    'tags',
    'notes',
    'createdAt',
    'updatedAt',
    'owner'
  ],

  // Selection Set mínimo para Supplier (listagens compactas)
  SUPPLIER_MINIMAL: [
    'id',
    'name',
    'category',
    'contactEmail',
    'contactPhone',
    'currency',
    'tags'
  ],

  // Selection Set básico para EventSupplier
  EVENT_SUPPLIER_BASIC: [
    'id',
    'eventId',
    'supplierId',
    'quoteAmount',
    'status',
    'invoiceS3Key',
    'paidAt',
    'createdAt',
    'updatedAt',
    'owner'
  ]
};
