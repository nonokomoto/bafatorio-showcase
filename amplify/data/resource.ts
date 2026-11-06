import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { deleteParticipants } from '../function/delete-participants/resource';
import { deleteEventCascadeFunction } from '../function/delete-event-cascade/resource';
import { deleteDependent } from '../function/delete-dependent/resource';
import { updateDependentFunction } from '../function/update-dependent/resource';
import { createDependentFunction } from '../function/create-dependent/resource';
import { deleteUserDataFunction } from '../function/delete-user-data/resource';
import { sendEmail } from '../function/send-email/resource';
import { confirmParticipant } from '../function/confirm-participant/resource';
import { uploadSupplierFunction } from '../function/upload-supplier/resource';
// Import subscription-related functions
import { handleStripeWebhook } from '../function/handle-stripe-webhook/resource';
import { createCheckoutSession } from '../function/create-checkout-session/resource';
import { uploadParticipants } from '../function/upload-participant/resource';
import { importNormalizedParticipantsFunction } from '../function/import-normalized-participants/resource';
import { importNormalizedSuppliersFunction } from '../function/import-normalized-suppliers/resource';
import { importNormalizedEventSuppliersFunction } from '../function/import-normalized-event-suppliers/resource';
import { createBillingPortalSession } from '../function/create-biling-portal-session/resource';
import { updateEventBudgetFunction } from '../function/supplier/resource';
import { processSupplierPaymentFunction } from '../function/process-supplier-payment/resource';
import { removeEventSupplierFunction } from '../function/remove-eventSupplier/resource';
import { revertEventSupplierApproval } from '../function/rever-event-supplier-aproval/resource';
import { adjustApprovedEventSupplierQuote } from '../function/adjust-approved-event-supplier-quote/resource';
// Import Collaborator functions (ACCESS_LEVELS_STRATEGY.md)
import { inviteCollaboratorFunction } from '../function/invite-collaborator/resource';
import { acceptInvitationFunction } from '../function/accept-invitation/resource';
import { declineInvitationFunction } from '../function/decline-invitation/resource';
import { revokeCollaboratorFunction } from '../function/revoke-collaborator/resource';
import { updateCollaboratorRoleFunction } from '../function/update-collaborator-role/resource';
import { updateCollaboratorScheduleAccessFunction } from '../function/update-collaborator-schedule-access/resource';
import { listMyPendingInvitationsFunction } from '../function/list-my-pending-invitations/resource';
import { listMyCollaboratedEventsFunction } from '../function/list-my-collaborated-events/resource';
import { getEventAsCollaboratorFunction } from '../function/get-event-as-collaborator/resource';
import { listEventCollaboratorsFunction } from '../function/list-event-collaborators/resource';
import { listEventFoldersFunction } from '../function/list-event-folders/resource';
import { updateCollaboratorFoldersFunction } from '../function/update-collaborator-folders/resource';
import { updateCollaboratorSuppliersFunction } from '../function/update-collaborator-suppliers/resource';
// Import Supplier Selection functions (ACCESS_LEVELS_STRATEGY.md - approval flow)
import { selectEventSupplierFunction } from '../function/select-event-supplier/resource';
import { approveSupplierSelectionFunction } from '../function/approve-supplier-selection/resource';
import { updateEventSupplierForRoleFunction } from '../function/update-event-supplier-for-role/resource';
// Import list-event-suppliers function (bypasses owner auth for collaborators)
import { listEventSuppliersFunction } from '../function/list-event-suppliers/resource';
// Import list-event-participants function (bypasses owner auth for collaborators)
import { listEventParticipantsFunction } from '../function/list-event-participants/resource';
// Import update-participant-collaborator function (bypasses owner auth for collaborator updates)
import { updateParticipantCollaboratorFunction } from '../function/update-participant-collaborator/resource';
// Import create-participant-collaborator function (bypasses owner auth for collaborator creates)
import { createParticipantCollaboratorFunction } from '../function/create-participant-collaborator/resource';
// Import get-supplier-for-event function (scoped supplier detail access for collaborators)
import { getSupplierForEventFunction } from '../function/get-supplier-for-event/resource';
// Import Role functions (event-scoped roles for collaborator access)
import { listEventRolesFunction } from '../function/list-event-roles/resource';
import { createEventRoleFunction } from '../function/create-event-role/resource';
import { updateEventRoleFunction } from '../function/update-event-role/resource';
import { deleteEventRoleValidatedFunction } from '../function/delete-event-role-validated/resource';
// Import create-event (gate de conta + snapshot planKey, substitui a mutation automática)
import { createEventFunction } from '../function/events/create-event/resource';
// Import update-event (role event:edit + janela de escrita, substitui a mutation automática)
import { updateEventFunction } from '../function/events/update-event/resource';
import { syncMyDisplayNameFunction } from '../function/events/sync-my-display-name/resource';
// Import get-account-access (query de acesso de conta para a UI — "posso criar evento?")
import { getAccountAccessFunction } from '../function/billing/get-account-access/resource';
// Import Folder CRUD functions (Lambda-backed, ADR-021)
import { createEventFolderFunction } from '../function/create-event-folder/resource';
import { updateEventFolderFunction } from '../function/update-event-folder/resource';
import { deleteEventFolderFunction } from '../function/delete-event-folder/resource';
// Import document edit authorization function (ADR-021)
import { saveDocumentEditFunction } from '../function/save-document-edit/resource';
// Fidelize integration functions
import { fidelizeSaveApiKeyFunction } from '../function/fidelize-save-api-key/resource';
import { fidelizeSyncParticipantsFunction } from '../function/fidelize-sync-participants/resource';
// Notion integration functions
import { notionExchangeTokenFunction } from '../function/notion-exchange-token/resource';
import { notionListPagesFunction } from '../function/notion-list-pages/resource';
import { notionImportPagesFunction } from '../function/notion-import-pages/resource';
import { notionCheckUpdatesFunction } from '../function/notion-check-updates/resource';
import { deleteSupplierFunction } from '../function/delete-supplier/resource';
// Schedule functions (ADR-029)
import { listEventScheduleFunction } from '../function/list-event-schedule/resource';
import { createEventScheduleEntryFunction } from '../function/create-event-schedule-entry/resource';
import { updateScheduleEntryFunction } from '../function/update-schedule-entry/resource';
import { deleteScheduleEntryFunction } from '../function/delete-schedule-entry/resource';

const schema = a.schema({
  // Event Management Models
  Event: a.model({
    eventTitle: a.string(),
    eventManager: a.string(),
    eventManagerEmail: a.string(),
    eventManagerPhone: a.string(),
    eventLocation: a.string(),
    eventCreationDate: a.datetime(),
    eventDateType: a.enum(['range', 'specific']),
    eventStartDate: a.date(),
    eventEndDate: a.date(),
    eventSpecificDates: a.string().array(),
    eventTime: a.time(),
    eventStatus: a.string(),
    eventType: a.string(),
    // Snapshot imutável do plano que cobre o evento, escrito pela Lambda de
    // criação (STARTER | PAY_PER_EVENT | PRO). O gate (resolveEventEntitlements)
    // lê daqui; ausente = STARTER (§8 do modelo canónico). Field-level auth:
    // o owner lê, e 'delete' é obrigatório para o deleteEvent do modelo não ser
    // bloqueado (apagar exige autorização em todos os campos) — escrever o campo
    // continua exclusivo da Lambda (SDK direto, fora do AppSync).
    planKey: a.string().authorization((rules) => [rules.owner().to(['read', 'delete'])]),
    organizerId: a.string(),
    // Identidade da CONTA do dono, resolvida no Cognito pelo create-event.
    // Distinta de eventManager/eventManagerEmail, que são o contacto do
    // "Responsável" escrito no formulário e podem ser outra pessoa qualquer.
    // Existe porque o dono não tem linha em EventCollaborator (o enum de role
    // não tem OWNER) e nada mais liga o sub a um nome — sem isto, o avatar do
    // autor na agenda não tem iniciais. Ausente nos eventos criados antes deste
    // campo e quando o Cognito falha: quem lê tem sempre de tolerar null.
    // Não precisa da field-level auth do planKey: o modelo tem
    // disableOperations(['create','update','delete']), logo nenhum cliente
    // escreve isto por GraphQL.
    ownerName: a.string(),
    ownerEmail: a.string(),
    // Teto de participantes congelado na compra do escalão Por Evento (ADR-038).
    // Presente, sobrepõe-se ao `participants` do plano; ausente, vale o do plano.
    // O escalão sem teto NÃO escreve nada: sentinelas (-1, 999999) valem como
    // teto real no primeiro caminho que esqueça o caso especial, e o campo
    // ausente já cobre de graça o grandfathering das compras anteriores a isto.
    // Só o que foi pago congela — os tetos do Grátis vêm sempre do catálogo.
    // Sem field-level auth pela mesma razão do ownerName: o modelo tem
    // disableOperations(['create','update','delete']).
    participantLimit: a.integer(),
    description: a.string(),
    categories: a.string().array(),
    budget: a.float(),
    currency: a.string(),
    committedExpenses: a.float(),
    effectiveExpenses: a.float(),
    participantCount: a.integer(),
    dependentCount: a.integer(),
    totalRegistrations: a.integer(),
    participants: a.hasMany('Participant', 'eventId'),
    suppliers: a.hasMany('EventSupplier', 'eventId'),
    documentFolders: a.hasMany('DocumentFolder', 'eventId'),
    collaborators: a.hasMany('EventCollaborator', 'eventId'),
    roles: a.hasMany('Role', 'eventId'),
  })
  .secondaryIndexes((index) => [
    // Contagem de eventos do gate de conta (create-event). organizerId em vez de
    // owner: é campo declarado (o owner implícito não é indexável) e é sempre o
    // sub puro — sem a ambiguidade de formato sub::username.
    index('organizerId').name('byOrganizerId'),
  ])
  // Criação e edição passam SÓ pelas Lambdas events/create-event e
  // events/update-event (gate de conta + planKey snapshot; role + janela de escrita).
  // 'delete' desativado por ADR-035: deletes só via deleteEventCascade.
  .disableOperations(['create', 'update', 'delete'])
  .authorization((rules) => [
    rules.owner(),
  ]),

  // Supplier Management Models
  Supplier: a.model({
    id: a.string().required(),
    name: a.string().required(),
    owner: a.string(),
    country: a.string(),
    category: a.string(),
    contactName: a.string(),
    contactEmail: a.string(),
    contactPhone: a.string(),
    website: a.string(),
    vatNumber: a.string(),
    address: a.string(),
    paymentDetails: a.string(),
    estimateMinAmount: a.float(),
    estimateMaxAmount: a.float(),
    estimateUnit: a.enum(['FIXED', 'PER_EVENT', 'PER_HOUR', 'PER_DAY', 'PER_ITEM', 'PER_GUEST']),
    currency: a.string(),
    tags: a.string().array(),
    notes: a.string(),
    eventSuppliers: a.hasMany('EventSupplier', 'supplierId')
  })
  .identifier(['id'])
  .secondaryIndexes((index) => [
    index('owner').name('byOwner'),
  ])
  .authorization((rules) => [
    rules.owner(),
  ]),

  EventSupplier: a.model({
    id: a.string().required(),
    eventId: a.string().required(),
    supplierId: a.string().required(),
    quoteAmount: a.float(),
    currency: a.string(),                                                       // ISO currency code for quoteAmount (EUR, CVE, USD, ...)
    // COUNTING_ON ("A contar"): supplier is part of the event without a formally
    // approved quote. Like PENDING it never touches the event balances.
    status: a.enum(['PENDING', 'COUNTING_ON', 'APPROVED', 'PAID', 'REJECTED']),
    description: a.string(),                                                    // Service description for this event (free text)
    externalRef: a.string(),                                                    // Client-side reference code (e.g. "ALO-001")
    invoiceS3Key: a.string(),
    paidAt: a.datetime(),
    event: a.belongsTo('Event', 'eventId'),
    supplier: a.belongsTo('Supplier', 'supplierId'),
    // Approval workflow fields (ACCESS_LEVELS_STRATEGY.md)
    requestedBy: a.string(),                                                    // userId of who requested (Staff or Co-Manager)
    approvalStatus: a.enum(['DIRECT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']),  // Approval workflow status
    approvedBy: a.string(),                                                     // userId of who approved (Owner)
    approvedAt: a.datetime(),                                                   // When it was approved
    rejectionReason: a.string(),                                                // Optional rejection reason
  })
  .identifier(['id'])
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),
  ])
  .authorization((rules) => [
    rules.owner(),
  ]),

  // Role Model — dynamic participant roles, event-scoped for collaborator access
  Role: a.model({
    name: a.string().required(),
    eventId: a.string().required(),
    event: a.belongsTo('Event', 'eventId'),
    participants: a.hasMany('Participant', 'roleId'),
    archived: a.boolean().default(false),
    // Highlight color key from the fixed palette (blue, violet, amber, ...).
    // Empty = automatic color derived from the role name.
    color: a.string(),
  })
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),
  ])
  .authorization((rules) => [
    rules.owner(),
  ]),

  Participant: a.model({
    // --- INFORMACAO BASICA ---
    participantName: a.string().required(),
    participantEmail: a.string(),
    participantPhone: a.string(),
    participantStatus: a.enum(['REGISTERED', 'CONFIRMED', 'CANCELLED', 'ATTENDED']),
    participantJob: a.string(),
    participantNote: a.string(),
    registrationDate: a.datetime(),
    attendedDate: a.datetime(),
    confirmationDate: a.datetime(),
    dependentsCount: a.integer(),

    // --- ROLE (string -> FK) ---
    roleId: a.string(),
    role: a.belongsTo('Role', 'roleId'),

    // --- EVENTO ---
    eventId: a.string().required(),
    event: a.belongsTo('Event', 'eventId'),
    dependents: a.hasMany('Dependent', 'participantId'),

    // --- IDENTIFICACAO ---
    documentationType: a.string(),
    documentLast4: a.string(),
    nationality: a.string(),
    residenceCountry: a.string(),
    organization: a.string(),
    emergencyContact: a.string(),
    internalId: a.string(),

    // --- VISTO ---
    visaRequired: a.boolean(),
    visaSupport: a.boolean(),

    // --- CHEGADA ---
    arrivalDate: a.string(),
    arrivalTime: a.string(),
    arrivalFlight: a.string(),
    arrivalLayovers: a.string(),
    arrivalAirport: a.string(),

    // --- TRANSFER ---
    transferRequired: a.boolean(),
    transferDetails: a.string(),
    transferCost: a.float(),
    transferCurrency: a.string(),

    // --- ALOJAMENTO ---
    hotel: a.string(),
    roomType: a.string(),
    checkInDate: a.string(),
    checkOutDate: a.string(),
    nights: a.integer(),
    ratePerNight: a.float(),
    rateCurrency: a.string(),
    accommodationCost: a.float(),

    // --- PARTIDA ---
    departureDate: a.string(),
    departureTime: a.string(),
    departureFlight: a.string(),
    departureAirport: a.string(),

    // --- FINANCEIRO ---
    ticketFare: a.float(),
    ticketCurrency: a.string(),
    taxesExtras: a.float(),
    taxesCurrency: a.string(),
    totalTravelCost: a.float(),
    totalTravelCurrency: a.string(),
    paymentStatus: a.enum(['PENDING', 'PAID', 'PARTIAL']),
    bookingReference: a.string(),
    bookingAgency: a.string(),

    // --- OUTROS ---
    dietaryRestriction: a.string(),
    protocol: a.string(),
    photoUrl: a.string(),
  })
  .authorization((rules) => [
    rules.owner(),
  ]),

  Dependent: a.model({
    name: a.string(),
    age: a.enum(['baby', 'child', 'adult']),
    participantId: a.string(),
    eventId: a.string(),
    participant: a.belongsTo('Participant', 'participantId'),
    // Attendance tracking fields
    status: a.enum(['REGISTERED', 'ATTENDED', 'NOT_ATTENDED']),
    attendedDate: a.datetime(),
  })
  .authorization((rules) => [
    rules.owner(),
  ]),


    // Subscription and Billing Models
    UserSubscription: a.model({
    id: a.string().required(),
      stripeCustomerId: a.string(),
      subscriptionId: a.string(),
      paymentMethodId: a.string(),
      setupIntentId: a.string(),
      planName: a.string(),
      priceId: a.string(),
      status: a.string(),
      currentPeriodStart: a.datetime(),
      currentPeriodEnd: a.datetime(),
      cancelAtPeriodEnd: a.boolean(),
      cancelAt: a.datetime(),                  // data agendada (API Basil: cancel_at, não cancel_at_period_end)
      canceledAt: a.datetime(),
      billingCycle: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('stripeCustomerId').name('byCustomerId'),
    ])
    .authorization((rules) => [
      // Leitura só do dono; escrita exclusiva das Lambdas via IAM. group('USER')
      // sem .to() dava CRUD sobre TODOS os registos a qualquer autenticado.
      rules.owner().to(['read']),
    ]),

    // Compra Pay-per-event (§3 do modelo canónico): comprar → criar 1 evento → acabou.
    // Escrita apenas por Lambdas (webhook regista; create-event consome); o cliente
    // só lê as suas. Sem saldo persistente — o registo compra→evento é a auditoria.
    PlanPurchase: a.model({
      id: a.string().required(),
      userId: a.string().required(),
      planKey: a.string().required(),          // PAY_PER_EVENT (único plano one-time)
      tierKey: a.string(),                     // escalão comprado (PPE_100 | PPE_200 | PPE_UNLIMITED) — auditoria e reconciliação com a fatura
      stripeCheckoutSessionId: a.string(),
      stripePaymentIntentId: a.string(),
      amount: a.integer(),                     // cêntimos, IVA incluído
      currency: a.string(),
      consumedByEventId: a.string(),           // null = compra por consumir (não expira, §4)
      consumedAt: a.datetime(),
      refundedAt: a.datetime(),                // refund/chargeback revoga o direito (webhook)
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('userId').name('byUserId'),
    ])
    .authorization((rules) => [
      rules.owner().to(['read']),
    ]),

    PaymentMethodData: a.model({
      id: a.string().required(),
      paymentMethodId: a.string(),             // pm_… Stripe — permite ao detach só apagar o cartão certo
      brand: a.string(),
      last4: a.string(),
      expiryMonth: a.integer(),
      expiryYear: a.integer(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),

    })
    .identifier(['id'])
    .authorization((rules) => [
      // Leitura só do dono; escrita exclusiva das Lambdas via IAM.
      rules.owner().to(['read']),
    ]),

    Invoice: a.model({
      id: a.string().required(),
      userId: a.string(),
      amount: a.float(),
      currency: a.string(),
      status: a.string(),
      invoiceUrl: a.string(),
      invoicePdfUrl: a.string(),
      invoiceNumber: a.string(),
      refundedAt: a.datetime(),                // devolução — a Stripe mantém a fatura 'paid'
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .identifier(['id'])
    .authorization((rules) => [
      // Leitura só do dono; escrita exclusiva das Lambdas via IAM.
      rules.owner().to(['read']),
    ]),


  // Model to track processed Stripe webhook events
  ProcessedStripeEvent: a.model({
    processedKey: a.string(),
    eventId: a.string(),
    type: a.string(),
    processedAt: a.datetime(),
    
  })
  .authorization((rules) => [
    rules.group('admin'),
  ]),

  EmailLog: a.model({
    id: a.string().required(),
    participantId: a.string(),
    eventId: a.string(),
    emailType: a.enum(['participantInvitation', 'participantConfirmation', 'eventCreation', 'saveTheDate', 'loginAlert', 'eventReminder', 'eventUpdate', 'welcome']),
    status: a.enum(['QUEUED', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED']),
    attempts: a.integer(),
    lastAttemptAt: a.datetime(),
    sentAt: a.datetime(),
    deliveredAt: a.datetime(),
    errorMessage: a.string(),
    templateName: a.string(),
    language: a.enum(['pt', 'en', 'fr']),
    messageId: a.string(), // AWS SES message ID
    
    // Metadata
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  // byEventId: cleanup no cascade delete de eventos (ADR-035) sem Scan.
  // GSI add é in-place em development/main; substitui a tabela em sandbox (ADR-031).
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),
  ])
  .authorization((rules) => [
    rules.owner(),
    rules.group('admin'),
  ]),

  // Document Folder Model for organizing event documents
  DocumentFolder: a.model({
    id: a.string().required(),
    eventId: a.string().required(),
    name: a.string().required(),
    description: a.string(),
    color: a.string(),           // Hex color for folder icon
    icon: a.string(),            // Icon name (optional)
    order: a.integer(),          // For manual sorting
    parentFolderId: a.string(),  // For nested folders (future)
    isDefault: a.boolean(),      // True for auto-created "General" folder
    event: a.belongsTo('Event', 'eventId'),
    owner: a.string(),           // Owner field (required by rules.owner())
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),
  ])
  .authorization((rules) => [
    rules.owner(),
    // Allow group members to read/update/delete any folder so the event owner
    // can manage folders created by CO_MANAGERs. Per-event access control is
    // enforced at application level (list-event-folders Lambda + frontend role checks).
    rules.groups(['USER', 'ADMIN']).to(['read', 'update', 'delete']),
  ]),

  // Event Collaborator Model for team management (ACCESS_LEVELS_STRATEGY.md)
  EventCollaborator: a.model({
    id: a.string().required(),
    eventId: a.string().required(),
    userId: a.string(),                    // Filled after accepting (Cognito sub)
    userEmail: a.string().required(),      // Email of the invited person
    userName: a.string(),                  // User's display name (populated on accept from Cognito)
    role: a.enum(['CO_MANAGER', 'STAFF_CHECKIN', 'STAFF_LOGISTICS']),

    // Customizable permissions (CO_MANAGER and STAFF_LOGISTICS)
    sharedFolderIds: a.string().array(),   // IDs of DocumentFolders shared with this collaborator
    sharedSupplierIds: a.string().array(), // IDs of Suppliers shared with this collaborator

    // Schedule visibility (ADR-029, 2026-07-16): quando true, este STAFF_LOGISTICS
    // vê a agenda inteira; ausente/false = só as entradas dele. Só o owner altera
    // (updateCollaboratorScheduleAccess). Não tem efeito em CO_MANAGER (vê sempre tudo).
    canViewTeamSchedule: a.boolean(),

    // Invitation status (as per ACCESS_LEVELS_STRATEGY.md)
    status: a.enum(['PENDING', 'ACCEPTED', 'DECLINED']),

    // Audit fields (as per ACCESS_LEVELS_STRATEGY.md)
    invitedBy: a.string().required(),      // userId of who invited
    invitedAt: a.datetime().required(),
    acceptedAt: a.datetime(),

    // Relation with Event
    event: a.belongsTo('Event', 'eventId'),

    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),           // List collaborators of an event
    index('userId').name('byUserId'),             // List events of a user
    index('userEmail').name('byUserEmail'),       // Find invitations by email
  ])
  // Escritas SÓ pelas Lambdas (invite/accept/decline/revoke + update-collaborator-*),
  // que verificam owner/role antes de gravar. Sem isto, a mutation auto-gerada
  // updateEventCollaborator fica exposta ao `rules.owner()`: quem convidou — que
  // pode ser um CO_MANAGER — reescreve role/partilhas/canViewTeamSchedule da linha
  // que criou, contornando o role-check (escalada de privilégio). Os nomes custom
  // (inviteCollaborator, updateCollaboratorRole…) diferem dos auto-gerados
  // (createEventCollaborator…), logo não há colisão de resolver nem deploy em 2 fases.
  .disableOperations(['create', 'update', 'delete'])
  // Leitura owner-scoped apenas. O `rules.authenticated().to(['read'])` deixava
  // QUALQUER autenticado paginar a auto-query listEventCollaborators e ler
  // email/nome/role de todos os colaboradores de todos os eventos (fuga de PII
  // cross-tenant). Nada dependia dele: a lista da equipa passa pelo Lambda
  // getEventCollaborators (OWNER/CO_MANAGER, ADR-015) e o fluxo de convites pelo
  // list-my-pending-invitations/accept-invitation (IAM). rules.owner() chega — o
  // convidante lê só as linhas que criou.
  .authorization((rules) => [
    rules.owner(),                                // Owner of the invitation can read
  ]),

  // Notion Integration - stores encrypted OAuth tokens per user
  NotionIntegration: a.model({
    id: a.string().required(),
    accessToken: a.string().required(),
    refreshToken: a.string(),
    workspaceId: a.string().required(),
    workspaceName: a.string(),
    botId: a.string().required(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  .authorization((rules) => [
    rules.owner(),
  ]),

  // Notion Document - metadata for imported Notion pages (content in S3)
  NotionDocument: a.model({
    id: a.string().required(),
    eventId: a.string().required(),
    folderId: a.string(),
    notionPageId: a.string().required(),
    notionPageUrl: a.string(),
    title: a.string().required(),
    s3Key: a.string().required(),
    notionLastEditedAt: a.string(),
    importedAt: a.datetime(),
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),
    index('notionPageId').sortKeys(['eventId']).name('byNotionPageId'),
  ])
  .authorization((rules) => [
    rules.owner(),
    rules.groups(['USER', 'ADMIN']).to(['read', 'update', 'delete']),
  ]),

  // Fidelize Integration - stores encrypted API key per user
  FidelizeIntegration: a.model({
    id: a.string().required(),       // userId
    apiKey: a.string().required(),   // KMS-encrypted
    isActive: a.boolean(),
    lastSyncAt: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  .authorization((rules) => [
    rules.owner(),
  ]),

  // Schedule Entry Model (ADR-029)
  EventScheduleEntry: a.model({
    id: a.string().required(),
    eventId: a.string().required(),
    date: a.string().required(),          // ISO date (YYYY-MM-DD), validated by Lambda
    startTime: a.string(),                // HH:MM — null for all-day entries
    endTime: a.string(),
    title: a.string().required(),
    description: a.string(),
    location: a.string(),
    supplierId: a.string(),               // FK → global Supplier catalog (optional)
    participantIds: a.string().array(),   // FK → Participant (event-scoped), validated by Lambda
    color: a.string(),                    // hex from the curated palette; absent means default
    order: a.integer(),                   // reserved for future drag-and-drop ordering
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .identifier(['id'])
  .secondaryIndexes((index) => [
    index('eventId').name('byEventId'),
  ])
  // Escritas SÓ pelas Lambdas createScheduleEntry/updateScheduleEntry/deleteScheduleEntry.
  // `rules.owner()` só verifica que o campo `owner` bate com quem chama — nunca que
  // essa pessoa tem acesso ao `eventId`, que é FK em texto livre. Sem isto, a mutation
  // auto-gerada aceita o eventId de outro utilizador e contorna o role check, o gate de
  // billing, o validateScheduleColor e o assertParticipantsInEvent.
  // Deploy numa fase: os nomes custom (createScheduleEntry) diferem dos auto-gerados
  // (createEventScheduleEntry), logo não há colisão de resolver — ao contrário do
  // createEvent/updateEvent (ver linha 134) e como o ADR-035 já nota para o cascade.
  // Leva também as subscriptions onCreate/onUpdate/onDelete do modelo, que estão
  // presas às mutations. Ninguém as consumia: a agenda actualiza por invalidação
  // de tags do RTK Query. As queries (list/get) ficam intactas.
  .disableOperations(['create', 'update', 'delete'])
  .authorization((rules) => [
    rules.owner(),
  ]),

  // Custom types for collaborated event results (includes both collaboration and event data)
  CollaborationData: a.customType({
    id: a.string().required(),
    eventId: a.string().required(),
    userId: a.string(),
    userEmail: a.string().required(),
    userName: a.string(),                 // User's display name (populated on accept from Cognito)
    role: a.string().required(),
    sharedFolderIds: a.string().array(),
    sharedSupplierIds: a.string().array(),
    canViewTeamSchedule: a.boolean(),     // ADR-029 (2026-07-16): staff vê a agenda inteira
    status: a.string().required(),
    invitedBy: a.string().required(),
    invitedAt: a.datetime().required(),
    acceptedAt: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  // Custom types for EventSchedule queries (ADR-029)
  ScheduleEntryData: a.customType({
    id: a.string().required(),
    eventId: a.string().required(),
    date: a.string().required(),
    startTime: a.string(),
    endTime: a.string(),
    title: a.string().required(),
    description: a.string(),
    location: a.string(),
    supplierId: a.string(),
    participantIds: a.string().array(),
    color: a.string(),
    order: a.integer(),
    owner: a.string().required(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  // Quem escreveu as entradas que o caller pode ver. Viaja com a listagem
  // porque o cliente não o consegue montar sozinho: o getEventCollaborators
  // recusa quem não é dono nem co-gestor, e o dono nem sequer tem linha em
  // EventCollaborator (o enum de role não tem OWNER).
  // Sem email de propósito: o staff não enumera a equipa, e esta seria a porta.
  ScheduleAuthorData: a.customType({
    userId: a.string().required(),
    // Ausente quando o colaborador foi revogado ou o evento é anterior ao
    // Event.ownerName — quem lê cai nas iniciais do fallback.
    name: a.string(),
  }),

  ListScheduleEntriesResult: a.customType({
    items: a.ref('ScheduleEntryData').array(),
    authors: a.ref('ScheduleAuthorData').array(),
  }),

  // Custom type for DocumentFolder data (used by getEventFolders query)
  DocumentFolderData: a.customType({
    id: a.string().required(),
    eventId: a.string().required(),
    name: a.string().required(),
    description: a.string(),
    color: a.string(),
    icon: a.string(),
    order: a.integer(),
    parentFolderId: a.string(),
    isDefault: a.boolean(),
    owner: a.string().required(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  // Custom type for Role data (used by getEventRoles / createEventRole)
  RoleData: a.customType({
    id: a.string().required(),
    eventId: a.string().required(),
    name: a.string().required(),
    color: a.string(),
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  // Custom type for delete role result (returns success flag + participant count)
  DeleteRoleResult: a.customType({
    success: a.boolean().required(),
    participantCount: a.integer().required(),
  }),

  EventData: a.customType({
    id: a.string().required(),
    eventTitle: a.string(),
    eventManager: a.string(),
    eventManagerEmail: a.string(),
    eventManagerPhone: a.string(),
    eventLocation: a.string(),
    eventCreationDate: a.datetime(),
    // customTypes can't reference model enums in Amplify Gen 2, so eventDateType stays a string here
    eventDateType: a.string(),
    eventStartDate: a.date(),
    eventEndDate: a.date(),
    eventSpecificDates: a.string().array(),
    eventTime: a.time(),
    eventStatus: a.string(),
    eventType: a.string(),
    planKey: a.string(),   // espelha Event.planKey — colaboradores também veem o nível do evento
    organizerId: a.string(),
    description: a.string(),
    categories: a.string().array(),
    budget: a.float(),
    currency: a.string(),
    committedExpenses: a.float(),
    effectiveExpenses: a.float(),
    participantCount: a.integer(),
    dependentCount: a.integer(),
    totalRegistrations: a.integer(),
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  CollaboratedEventResult: a.customType({
    userRole: a.string().required(),
    collaboration: a.ref('CollaborationData'),
    event: a.ref('EventData'),
  }),

  // Entitlements do evento (plano do dono) para a UI cosmética — §4b: a
  // autoridade do gate continua nas Lambdas de mutation.
  EventAccessData: a.customType({
    planKey: a.string(),
    writable: a.boolean(),
    reason: a.string(),
    // Teto de participantes já resolvido (ADR-038); null = sem teto. A UI honra
    // o número, sem reimplementar a regra de qual plano é que o congela.
    participantLimit: a.integer(),
  }),

  GetEventAsCollaboratorResult: a.customType({
    event: a.ref('EventData'),
    userRole: a.string(),
    sharedFolderIds: a.string().array(),
    sharedSupplierIds: a.string().array(),
    canViewTeamSchedule: a.boolean(),   // ADR-029 (2026-07-16): flag do próprio staff
    access: a.ref('EventAccessData'),
  }),

  AccountAccessResult: a.customType({
    planKey: a.string(),
    canCreateEvent: a.boolean(),
    reason: a.string(),
  }),

  // Custom type for full supplier detail (used by getSupplierForEvent query)
  SupplierDetailData: a.customType({
    id: a.string().required(),
    name: a.string().required(),
    category: a.string(),
    contactName: a.string(),
    contactEmail: a.string(),
    contactPhone: a.string(),
    website: a.string(),
    country: a.string(),
    address: a.string(),
    vatNumber: a.string(),
    paymentDetails: a.string(),
    estimateMinAmount: a.float(),
    estimateMaxAmount: a.float(),
    estimateUnit: a.string(),
    currency: a.string(),
    tags: a.string().array(),
    notes: a.string(),
  }),

  // Custom types for listEventSuppliers query (collaborator-aware)
  SupplierSummaryData: a.customType({
    id: a.string().required(),
    name: a.string().required(),
    category: a.string(),
    contactName: a.string(),
    contactEmail: a.string(),
    contactPhone: a.string(),
    currency: a.string(),
    estimateMinAmount: a.float(),
    estimateMaxAmount: a.float(),
  }),

  EventSupplierItemData: a.customType({
    id: a.string().required(),
    eventId: a.string().required(),
    supplierId: a.string().required(),
    quoteAmount: a.float(),
    status: a.string(),
    invoiceS3Key: a.string(),
    paidAt: a.datetime(),
    requestedBy: a.string(),
    approvalStatus: a.string(),
    approvedBy: a.string(),
    approvedAt: a.datetime(),
    rejectionReason: a.string(),
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    supplier: a.ref('SupplierSummaryData'),
  }),

  EventDataSlice: a.customType({
    id: a.string().required(),
    eventTitle: a.string(),
    budget: a.float(),
    committedExpenses: a.float(),
    effectiveExpenses: a.float(),
  }),

  ListEventSuppliersResult: a.customType({
    items: a.ref('EventSupplierItemData').array(),
    eventData: a.ref('EventDataSlice'),
    sharedSuppliers: a.ref('SupplierSummaryData').array(),
  }),

  // Custom types for listEventParticipants query (collaborator-aware)
  DependentItemData: a.customType({
    id: a.string().required(),
    name: a.string(),
    age: a.string(),
    participantId: a.string(),
    eventId: a.string(),
    status: a.string(),
    attendedDate: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  ParticipantItemData: a.customType({
    id: a.string().required(),
    participantName: a.string(),
    participantEmail: a.string(),
    participantPhone: a.string(),
    participantStatus: a.string(),
    participantJob: a.string(),
    participantNote: a.string(),
    registrationDate: a.datetime(),
    attendedDate: a.datetime(),
    confirmationDate: a.datetime(),
    eventId: a.string(),
    dependentsCount: a.integer(),
    roleId: a.string(),
    // --- IDENTIFICACAO ---
    documentationType: a.string(),
    documentLast4: a.string(),
    nationality: a.string(),
    residenceCountry: a.string(),
    organization: a.string(),
    emergencyContact: a.string(),
    internalId: a.string(),
    // --- VISTO ---
    visaRequired: a.boolean(),
    visaSupport: a.boolean(),
    // --- CHEGADA ---
    arrivalDate: a.string(),
    arrivalTime: a.string(),
    arrivalFlight: a.string(),
    arrivalLayovers: a.string(),
    arrivalAirport: a.string(),
    // --- TRANSFER ---
    transferRequired: a.boolean(),
    transferDetails: a.string(),
    transferCost: a.float(),
    transferCurrency: a.string(),
    // --- ALOJAMENTO ---
    hotel: a.string(),
    roomType: a.string(),
    checkInDate: a.string(),
    checkOutDate: a.string(),
    nights: a.integer(),
    ratePerNight: a.float(),
    rateCurrency: a.string(),
    accommodationCost: a.float(),
    // --- PARTIDA ---
    departureDate: a.string(),
    departureTime: a.string(),
    departureFlight: a.string(),
    departureAirport: a.string(),
    // --- FINANCEIRO ---
    ticketFare: a.float(),
    ticketCurrency: a.string(),
    taxesExtras: a.float(),
    taxesCurrency: a.string(),
    totalTravelCost: a.float(),
    totalTravelCurrency: a.string(),
    paymentStatus: a.string(),
    bookingReference: a.string(),
    bookingAgency: a.string(),
    // --- OUTROS ---
    dietaryRestriction: a.string(),
    protocol: a.string(),
    photoUrl: a.string(),
    owner: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    dependents: a.ref('DependentItemData').array(),
  }),

  ListEventParticipantsResult: a.customType({
    items: a.ref('ParticipantItemData').array(),
    totalCount: a.integer(),
  }),

  // Notion integration custom types
  NotionPageItem: a.customType({
    id: a.string().required(),
    title: a.string().required(),
    icon: a.string(),
    lastEditedAt: a.string(),
    url: a.string(),
    type: a.string(),
    propertyCount: a.integer(),
    subtitle: a.string(),
  }),

  ListNotionPagesResult: a.customType({
    pages: a.ref('NotionPageItem').array(),
    nextCursor: a.string(),
    hasMore: a.boolean(),
    error: a.string(),
  }),

  ImportedNotionDoc: a.customType({
    id: a.string().required(),
    title: a.string().required(),
    notionPageId: a.string().required(),
  }),

  ImportNotionPagesResult: a.customType({
    success: a.boolean().required(),
    imported: a.integer(),
    failed: a.integer(),
    documents: a.ref('ImportedNotionDoc').array(),
    errors: a.string().array(),
  }),

  ExchangeNotionTokenResult: a.customType({
    success: a.boolean().required(),
    workspaceName: a.string(),
    error: a.string(),
  }),

  NotionUpdateItem: a.customType({
    id: a.string().required(),
    notionPageId: a.string().required(),
    title: a.string().required(),
    s3Key: a.string().required(),
    notionLastEditedAt: a.string(),
    storedLastEditedAt: a.string(),
  }),

  CheckNotionUpdatesResult: a.customType({
    updates: a.ref('NotionUpdateItem').array(),
    total: a.integer(),
    outdated: a.integer(),
    error: a.string(),
  }),

  // Fidelize integration custom types
  SaveFidelizeApiKeyResult: a.customType({
    success: a.boolean().required(),
    error: a.string(),
  }),

  FidelizeSyncResult: a.customType({
    success: a.boolean().required(),
    created: a.integer(),
    updated: a.integer(),
    skipped: a.integer(),
    totalCards: a.integer(),
    errors: a.string().array(),
    hasMore: a.boolean(),
    nextPage: a.integer(),
  }),

  // Nested element of SupplierImportResult.rowErrors — must be a named
  // customType; a.customType({...}).array() is not valid Amplify Gen 2 syntax.
  SupplierImportRowError: a.customType({
    row: a.integer(),
    message: a.string(),
  }),

  SupplierImportResult: a.customType({
    success: a.boolean(),
    message: a.string(),
    supplierCount: a.integer(),
    reason: a.string(),
    skippedCount: a.integer(),
    duplicateCount: a.integer(),
    validationErrorCount: a.integer(),
    writeErrorCount: a.integer(),
    // Per-row detail (which line, why) so the UI can show more than a bare
    // count — see amplify/function/upload-supplier and
    // import-normalized-suppliers handlers.
    rowErrors: a.ref('SupplierImportRowError').array(),
  }),

  EventSupplierImportResult: a.customType({
    success: a.boolean(),
    message: a.string(),
    reason: a.string(),
    // DB-level counters (true reuse vs. brand-new)
    suppliersCreated: a.integer(),
    suppliersReused: a.integer(),
    // In-batch counter (name duplicates collapsed into one supplier)
    suppliersDeduplicatedInBatch: a.integer(),
    // EventSupplier link counters
    eventSuppliersCreated: a.integer(),
    rowsAlreadyLinkedOnEvent: a.integer(),
    rowsDuplicatedInBatch: a.integer(),
    // Rows rejected before any write (empty name, etc.)
    validationErrorCount: a.integer(),
  }),

  // Relatório do cascade delete de evento (ADR-035)
  DeleteEventCascadeCounts: a.customType({
    participants: a.integer(),
    dependents: a.integer(),
    eventSuppliers: a.integer(),
    collaborators: a.integer(),
    roles: a.integer(),
    documentFolders: a.integer(),
    scheduleEntries: a.integer(),
    notionDocuments: a.integer(),
    emailLogs: a.integer(),
    s3Objects: a.integer(),
    event: a.integer(),
  }),

  DeleteEventCascadeResult: a.customType({
    success: a.boolean().required(),
    deleted: a.ref('DeleteEventCascadeCounts'),
    failed: a.ref('DeleteEventCascadeCounts'),
    errors: a.string().array(),
  }),

  // Apaga um evento e TODAS as entidades filhas + S3 (ADR-035). OWNER-only,
  // idempotente; substitui a mutation automática deleteEvent (desativada no
  // modelo). Nome diferente de deleteEvent de propósito — evita a colisão de
  // resolvers CloudFormation que forçou o deploy em 2 fases no create/update.
  deleteEventCascade: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
    })
    .returns(a.ref('DeleteEventCascadeResult'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(deleteEventCascadeFunction)),

  // Mutations
  deleteParticipants: a
  .mutation()
  .arguments({
    participantIds: a.string().array(),
  })
  .returns(a.string().array())
  .authorization((rules) => [
    rules.authenticated(),
  ])
  .handler(a.handler.function(deleteParticipants)),

  deleteDependentCustom: a
    .mutation()
    .arguments({
      id: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string()
    }))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(deleteDependent)),

  updateDependentCustom: a
    .mutation()
    .arguments({
      id: a.string().required(),
      name: a.string(),
      age: a.string(),
    })
    .returns(a.customType({
      id: a.string().required(),
      name: a.string(),
      age: a.string(),
      participantId: a.string(),
      eventId: a.string(),
      status: a.string(),
      attendedDate: a.datetime(),
      owner: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    }))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(updateDependentFunction)),

  createDependentCustom: a
    .mutation()
    .arguments({
      name: a.string().required(),
      age: a.string(),
      participantId: a.string().required(),
      eventId: a.string().required(),
      status: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
      id: a.string(),
      name: a.string(),
      age: a.string(),
      participantId: a.string(),
      eventId: a.string(),
      status: a.string(),
    }))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(createDependentFunction)),

  uploadParticipants: a
    .mutation()
    .arguments({
      eventId: a.string(),
      file: a.string(),
    })
    .returns(
      a.customType({
        success: a.boolean(),
        count: a.integer(),
        skipped: a.integer(),
        message: a.string(),
        details: a.customType({
          participantsCount: a.integer(),
          dependentsCount: a.integer(),
          skippedCount: a.integer(),
          eventId: a.string()
        }),
        duplicates: a.string()
      })
    )
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(uploadParticipants)),

  importNormalizedParticipants: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      participants: a.string().required(), // JSON-stringified array
    })
    .returns(
      a.customType({
        success: a.boolean(),
        count: a.integer(),
        skipped: a.integer(),
        message: a.string(),
        details: a.customType({
          participantsCount: a.integer(),
          dependentsCount: a.integer(),
          skippedCount: a.integer(),
          eventId: a.string()
        }),
        duplicates: a.string()
      })
    )
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(importNormalizedParticipantsFunction)),

  // Sem identityId nos argumentos (issue #162): era client-supplied e apontava
  // a limpeza S3 ao prefixo de quem o atacante quisesse. Os prefixos por
  // identidade são agora limpos pelo cliente, com o IAM a escopá-los.
  deleteUserData: a
    .mutation()
    .arguments({
      sub: a.string(),
    })
    .returns(a.boolean())
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(deleteUserDataFunction)),



  sendEmail: a
    .mutation()
    .arguments({
      to: a.string().array(),
      emailType: a.enum(['participantInvitation', 'participantConfirmation', 'eventCreation', 'saveTheDate', 'loginAlert', 'eventReminder', 'eventUpdate', 'welcome', 'collaboratorInvitation']),
      language: a.enum(['pt', 'en', 'fr']),
      participantName: a.string().array(),
      eventName: a.string(),
      participantId: a.string().array(),
      eventId: a.string(),
      eventDate: a.string(),
      eventDateType: a.string(),
      eventStartDate: a.date(),
      eventEndDate: a.date(),
      eventSpecificDates: a.string().array(),
      eventTime: a.string(),
      eventLocation: a.string(),
      eventManagerName: a.string(),
      eventManagerContact: a.string(),
      confirmationLink: a.string().array(),
      eventManager: a.string(),
      eventTitle: a.string(),
      eventType: a.string(),
      eventCategories: a.string(),
      attachmentFilename: a.string(),
      attachmentContent: a.string(),
      attachmentContentType: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
      error: a.string(),
    }))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(sendEmail)),

  confirmParticipant: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      participantId: a.string(),
      participantStatus: a.string(),
      attendedDate: a.string(),
      dependentUpdates: a.json(),
      language: a.enum(['pt', 'en', 'fr']),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
      updatedDependentsCount: a.integer(),
    }))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(confirmParticipant)),


  createCheckoutSession: a
  .mutation()
  .arguments({
    // Contrato por intenção: a Lambda resolve preço + cupão LAUNCH_50 no
    // servidor a partir destes dois — o cliente nunca escolhe preços. O userId
    // vem da identity do caller (ADR-019), nunca do argumento.
    planKey: a.string(),        // PRO | PAY_PER_EVENT
    billingCycle: a.string(),   // monthly | annual (só Pro)
    tierKey: a.string(),        // PPE_100 | PPE_200 | PPE_UNLIMITED (só Por Evento)
    // Upgrade de escalão (ADR-034): TIER_UPGRADE + eventId cobram a diferença
    // para o evento indicado, em vez de venderem outro evento. O teto só sobe
    // no webhook, depois do pagamento confirmado.
    intent: a.string(),         // TIER_UPGRADE (ausente = compra normal)
    eventId: a.string(),        // evento a subir de escalão (só no TIER_UPGRADE)
    successUrl: a.string(),
    cancelUrl: a.string(),
    customerEmail: a.string(),
  })
  .returns(a.customType({
    success: a.boolean(),
    sessionUrl: a.string(), 
    message: a.string(),
  }))
  .authorization((rules) => [
    rules.authenticated(),
  ])
  .handler(a.handler.function(createCheckoutSession)),

  createBillingPortalSession: a
  .mutation()
  .arguments({
    // O customer resolve-se da identity do caller no handler (ADR-019) — nunca
    // do cliente. Passar customerId permitia abrir o portal de outro cliente.
    returnUrl: a.string(),
  })
  .returns(a.customType({
    success: a.boolean(),
    sessionUrl: a.string(),
    message: a.string(),
  }))
  .authorization((rules) => [
    rules.authenticated(),
  ])
  .handler(a.handler.function(createBillingPortalSession)),

  handleStripeWebhook: a
    .mutation()
    .arguments({
      body: a.string(),
      signature: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
      eventType: a.string(),
      planType: a.string(),
    }))
    .authorization(allow => allow.publicApiKey())
    .handler(a.handler.function(handleStripeWebhook)),

  processSupplierApproval: a
    .mutation()
    .arguments({ eventSupplierId: a.string().required(), quoteAmount: a.float() })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(updateEventBudgetFunction)),

  processSupplierPayment: a
    .mutation()
    .arguments({ eventSupplierId: a.string().required() })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(processSupplierPaymentFunction)),

  removeEventSupplier: a
    .mutation()
    .arguments({ 
      eventSupplierId: a.string().required() 
    })
    .returns(a.customType({
      deletedEventSupplierId: a.string(),
      message: a.string()
    }))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(removeEventSupplierFunction)),

  revertEventSupplierApproval: a
    .mutation()
    .arguments({ 
      eventSupplierId: a.string().required(),
      newStatus: a.enum(['PENDING', 'COUNTING_ON', 'REJECTED'])
    })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(revertEventSupplierApproval)),

  adjustApprovedEventSupplierQuote: a
    .mutation() 
    .arguments({ 
      eventSupplierId: a.string().required(), 
      newQuoteAmount: a.float().required()
    })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(adjustApprovedEventSupplierQuote)),

  deleteSupplierCustom: a
    .mutation()
    .arguments({
      supplierId: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
      eventCount: a.integer(),
    }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(deleteSupplierFunction)),

  uploadSupplier: a
    .mutation()
    .arguments({
      file: a.string().required(),
    })
    .returns(a.ref('SupplierImportResult'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(uploadSupplierFunction)),

  importNormalizedSuppliers: a
    .mutation()
    .arguments({
      suppliers: a.string().required(), // JSON-stringified array
      // Starting index of this chunk within the full normalized file — the
      // client splits into MAX_BATCH_SIZE chunks before calling, and without
      // this the handler numbers every chunk's rowErrors from row 2, so a
      // >500-row file shows overlapping "Linha 2 a 501" ranges. Optional so
      // a caller sending a single chunk (offset 0) doesn't have to pass it.
      rowOffset: a.integer(),
    })
    .returns(a.ref('SupplierImportResult'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(importNormalizedSuppliersFunction)),

  /**
   * Dual-write import: creates Supplier + EventSupplier in one call for a
   * given event. Dedup rules — Supplier by name+email+phone (reuse if exists
   * under the event owner), EventSupplier by (eventId, supplierId) (skip if
   * already linked).
   *
   * Auth follows the same pattern as selectEventSupplier: OWNER/CO_MANAGER
   * get approvalStatus=DIRECT, STAFF_LOGISTICS gets PENDING_APPROVAL,
   * STAFF_CHECKIN is rejected.
   */
  importNormalizedEventSuppliers: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      rows: a.string().required(), // JSON-stringified array of NormalizedEventSupplierRow
    })
    .returns(a.ref('EventSupplierImportResult'))
    .authorization((rules) => [
      rules.authenticated(),
    ])
    .handler(a.handler.function(importNormalizedEventSuppliersFunction)),

  // ========== COLLABORATOR MUTATIONS (ACCESS_LEVELS_STRATEGY.md) ==========

  /**
   * Invite a collaborator to an event
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER can invite CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS
   * - CO_MANAGER can only invite Staff roles
   */
  inviteCollaborator: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      email: a.string().required(),
      role: a.enum(['CO_MANAGER', 'STAFF_CHECKIN', 'STAFF_LOGISTICS']),
      sharedFolderIds: a.string().array(),
      sharedSupplierIds: a.string().array(),
      language: a.enum(['pt', 'en', 'fr']),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(inviteCollaboratorFunction)),

  /**
   * Accept a pending invitation
   * Sets status to ACCEPTED and fills userId
   */
  acceptInvitation: a
    .mutation()
    .arguments({
      invitationId: a.string().required(),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(acceptInvitationFunction)),

  /**
   * Decline a pending invitation
   * Sets status to DECLINED
   */
  declineInvitation: a
    .mutation()
    .arguments({
      invitationId: a.string().required(),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(declineInvitationFunction)),

  /**
   * Revoke/remove a collaborator from an event
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER can remove anyone
   * - CO_MANAGER can remove Staff only
   */
  revokeCollaborator: a
    .mutation()
    .arguments({
      collaboratorId: a.string().required(),
    })
    .returns(a.boolean())
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(revokeCollaboratorFunction)),

  /**
   * Update shared folders for a CO_MANAGER or STAFF_LOGISTICS collaborator
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - Only OWNER can update folder sharing
   * - Applies to CO_MANAGER and STAFF_LOGISTICS roles
   */
  updateCollaboratorFolders: a
    .mutation()
    .arguments({
      collaboratorId: a.string().required(),
      sharedFolderIds: a.string().array().required(),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateCollaboratorFoldersFunction)),

  /**
   * Update shared suppliers for a CO_MANAGER or STAFF_LOGISTICS collaborator
   * Per ADR-017:
   * - Only OWNER can update supplier sharing
   * - Applies to CO_MANAGER and STAFF_LOGISTICS roles
   */
  updateCollaboratorSuppliers: a
    .mutation()
    .arguments({
      collaboratorId: a.string().required(),
      sharedSupplierIds: a.string().array().required(),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateCollaboratorSuppliersFunction)),

  /**
   * Update a collaborator's role
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - Only OWNER can change roles
   * - Clears sharedFolderIds and sharedSupplierIds when downgrading to STAFF_CHECKIN
   */
  updateCollaboratorRole: a
    .mutation()
    .arguments({
      collaboratorId: a.string().required(),
      newRole: a.string().required(),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateCollaboratorRoleFunction)),

  /**
   * Liga/desliga a visibilidade da agenda da equipa para um STAFF_LOGISTICS.
   * Só o dono do evento pode chamar (ADR-029, revisão 2026-07-16).
   */
  updateCollaboratorScheduleAccess: a
    .mutation()
    .arguments({
      collaboratorId: a.string().required(),
      canViewTeamSchedule: a.boolean().required(),
    })
    .returns(a.ref('EventCollaborator'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateCollaboratorScheduleAccessFunction)),

  // ========== COLLABORATOR QUERIES (ACCESS_LEVELS_STRATEGY.md) ==========

  /**
   * List pending invitations for the current user
   * Uses the user's email from Cognito identity
   */
  listMyPendingInvitations: a
    .query()
    .returns(a.ref('EventCollaborator').array())
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listMyPendingInvitationsFunction)),

  /**
   * List events where the current user is an accepted collaborator
   */
  listMyCollaboratedEvents: a
    .query()
    .returns(a.ref('CollaboratedEventResult').array())
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listMyCollaboratedEventsFunction)),

  /**
   * Get a single event if user is owner or accepted collaborator
   * Returns event data along with user's role and permissions
   */
  getEventAsCollaborator: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(a.ref('GetEventAsCollaboratorResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(getEventAsCollaboratorFunction)),

  /**
   * Acesso de conta para a UI — espelha o gate do create-event sem efeitos.
   * reason: PRO_ACTIVE | PURCHASE_AVAILABLE | PRO_PAUSED | WITHIN_STARTER_LIMIT
   * | STARTER_LIMIT_REACHED | UNAUTHENTICATED
   */
  getAccountAccess: a
    .query()
    .returns(a.ref('AccountAccessResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(getAccountAccessFunction)),

  /**
   * List all collaborators for a specific event
   * Bypasses owner-based authorization to allow event owners and co-managers to see all collaborators
   */
  getEventCollaborators: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(
      a.customType({
        items: a.ref('CollaborationData').array(),
      })
    )
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listEventCollaboratorsFunction)),

  /**
   * List all DocumentFolders for a specific event
   * Bypasses owner-based authorization to return folders based on user's event role
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER: sees all folders
   * - CO_MANAGER: sees shared folders only
   * - STAFF: no folder access
   */
  getEventFolders: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(
      a.customType({
        items: a.ref('DocumentFolderData').array(),
      })
    )
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listEventFoldersFunction)),

  /**
   * List all schedule entries for a specific event.
   * Bypasses owner auth for collaborator access (ADR-019, ADR-029).
   * Roles: OWNER, CO_MANAGER, STAFF_LOGISTICS. STAFF_CHECKIN is rejected.
   */
  listEventSchedule: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(a.ref('ListScheduleEntriesResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listEventScheduleFunction)),

  /**
   * Create a schedule entry for an event.
   * Bypasses owner auth for collaborator access (ADR-019, ADR-029).
   * Roles: OWNER, CO_MANAGER, STAFF_LOGISTICS. STAFF_CHECKIN is rejected.
   */
  createScheduleEntry: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      title: a.string().required(),
      date: a.string().required(),
      startTime: a.string(),
      endTime: a.string(),
      description: a.string(),
      location: a.string(),
      supplierId: a.string(),
      participantIds: a.string().array(),
      color: a.string(),
      order: a.integer(),
    })
    .returns(a.ref('ScheduleEntryData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(createEventScheduleEntryFunction)),

  /**
   * Update a schedule entry.
   * Bypasses owner auth (ADR-019, ADR-029).
   * OWNER and CO_MANAGER can update any entry; STAFF_LOGISTICS only their own.
   */
  updateScheduleEntry: a
    .mutation()
    .arguments({
      id: a.string().required(),
      eventId: a.string().required(),
      title: a.string(),
      date: a.string(),
      startTime: a.string(),
      endTime: a.string(),
      description: a.string(),
      location: a.string(),
      supplierId: a.string(),
      participantIds: a.string().array(),
      color: a.string(),
      order: a.integer(),
    })
    .returns(a.ref('ScheduleEntryData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateScheduleEntryFunction)),

  /**
   * Delete a schedule entry.
   * Bypasses owner auth (ADR-019, ADR-029).
   * OWNER can delete any entry.
   * CO_MANAGER can delete any entry not authored by the event OWNER.
   * STAFF_LOGISTICS can delete only entries they authored themselves.
   */
  deleteScheduleEntry: a
    .mutation()
    .arguments({
      id: a.string().required(),
      eventId: a.string().required(),
    })
    .returns(a.customType({ id: a.string().required() }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(deleteScheduleEntryFunction)),

  /**
   * List all Roles for a specific event
   * Bypasses owner-based authorization to return roles based on user's event role
   * All collaborator roles (OWNER, CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN)
   * can see event roles — anyone who manages participants needs them.
   */
  getEventRoles: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(
      a.customType({
        items: a.ref('RoleData').array(),
      })
    )
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listEventRolesFunction)),

  /**
   * Create a new Role in an event
   * Only OWNER and CO_MANAGER can create roles
   */
  /**
   * Criação de eventos — Lambda-backed (substitui a mutation automática do
   * modelo, desativada via disableOperations). O servidor decide organizerId,
   * owner e planKey; gate de conta + consumo PlanPurchase na Lambda.
   * Os campos eventManager/eventLocation alimentam o email do eventStream.
   */
  createEvent: a
    .mutation()
    .arguments({
      eventTitle: a.string(),
      eventManager: a.string(),
      eventManagerEmail: a.string(),
      eventManagerPhone: a.string(),
      eventLocation: a.string(),
      eventDateType: a.string(),
      // a.date()/a.time() (não a.string()): mantém a validação AWSDate/AWSTime
      // do AppSync na fronteira — o handler escreve no DynamoDB sem revalidar.
      eventStartDate: a.date(),
      eventEndDate: a.date(),
      eventSpecificDates: a.string().array(),
      eventTime: a.time(),
      eventStatus: a.string(),
      eventType: a.string(),
      description: a.string(),
      categories: a.string().array(),
      budget: a.float(),
      currency: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),   // STARTER_LIMIT_REACHED | PRO_PAUSED | UNAUTHENTICATED
      event: a.json(),       // registo criado (o frontend hoje só usa o sucesso)
    }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(createEventFunction)),

  /**
   * Edição de eventos — Lambda-backed (substitui a mutation automática do
   * modelo, desativada via disableOperations). Gate na Lambda: role event:edit
   * + janela de escrita (§4); planKey/owner/organizerId/contadores são
   * autoridade do servidor e nunca aceites como args.
   */
  updateEvent: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      eventTitle: a.string(),
      eventManager: a.string(),
      eventManagerEmail: a.string(),
      eventManagerPhone: a.string(),
      eventLocation: a.string(),
      eventDateType: a.string(),
      // a.date()/a.time(): validação AWSDate/AWSTime na fronteira, como no create.
      eventStartDate: a.date(),
      eventEndDate: a.date(),
      eventSpecificDates: a.string().array(),
      eventTime: a.time(),
      eventStatus: a.string(),
      eventType: a.string(),
      description: a.string(),
      categories: a.string().array(),
      budget: a.float(),
      currency: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),   // FORBIDDEN | BILLING_GATE:<REASON> | UNAUTHENTICATED
      event: a.json(),       // registo atualizado (ALL_NEW)
    }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateEventFunction)),

  /**
   * Propaga o nome real do Cognito para os snapshots desnormalizados
   * (EventCollaborator.userName, Event.ownerName) — o perfil grava o nome
   * client-side no Cognito e o Cognito não tem trigger de atributo alterado.
   * Sem argumentos de propósito: o nome vem do Cognito do próprio caller,
   * e a Lambda só toca em linhas dele (byUserId / byOrganizerId).
   */
  syncMyDisplayName: a
    .mutation()
    .returns(a.customType({
      updatedCollaborations: a.integer(),
      updatedEvents: a.integer(),
    }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(syncMyDisplayNameFunction)),

  createEventRole: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      name: a.string().required(),
    })
    .returns(a.ref('RoleData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(createEventRoleFunction)),

  /**
   * Update an event role (rename / highlight color) — Lambda-backed
   * OWNER, CO_MANAGER (with ROLE_MANAGE): Can update roles
   */
  updateEventRole: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      roleId: a.string().required(),
      name: a.string().required(),
      // Omit to keep the current color; '' or null resets to automatic
      color: a.string(),
    })
    .returns(a.ref('RoleData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateEventRoleFunction)),

  /**
   * Delete an event role with participant validation — Lambda-backed
   * OWNER, CO_MANAGER (with ROLE_MANAGE): Can delete roles
   * Blocks deletion if participants are assigned; returns { success, participantCount }
   */
  deleteEventRoleValidated: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      roleId: a.string().required(),
    })
    .returns(a.ref('DeleteRoleResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(deleteEventRoleValidatedFunction)),

  // ========== FOLDER CRUD MUTATIONS (ADR-021: Lambda-backed) ==========

  /**
   * Create a new folder in an event (Lambda-backed)
   * OWNER, CO_MANAGER, STAFF_LOGISTICS can create
   * Supports isDefault flag for auto-created "General" folder (idempotent)
   */
  createEventFolder: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      name: a.string().required(),
      description: a.string(),
      color: a.string(),
      order: a.integer(),
      parentFolderId: a.string(),
      isDefault: a.boolean(),
    })
    .returns(a.ref('DocumentFolderData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(createEventFolderFunction)),

  /**
   * Update a folder in an event (Lambda-backed)
   * OWNER, CO_MANAGER: can update any folder
   * STAFF_LOGISTICS: can only update own folders
   */
  updateEventFolder: a
    .mutation()
    .arguments({
      id: a.string().required(),
      eventId: a.string().required(),
      name: a.string(),
      description: a.string(),
      color: a.string(),
      order: a.integer(),
    })
    .returns(a.ref('DocumentFolderData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateEventFolderFunction)),

  /**
   * Delete a folder in an event (Lambda-backed)
   * Cannot delete default (General) folder
   * OWNER, CO_MANAGER: can delete any folder
   * STAFF_LOGISTICS: can only delete own folders
   */
  deleteEventFolder: a
    .mutation()
    .arguments({
      id: a.string().required(),
      eventId: a.string().required(),
    })
    .returns(a.customType({ success: a.boolean(), id: a.string() }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(deleteEventFolderFunction)),

  /**
   * Authorize a document edit and return a short-lived S3 pre-signed PUT URL (ADR-021).
   * OWNER: can edit documents in any folder
   * CO_MANAGER, STAFF_LOGISTICS: can edit only in folders they own (shared folders are upload-only)
   * STAFF_CHECKIN: cannot edit
   * The returned URL is scoped to the exact documentPath and expires in 60s.
   */
  saveDocumentEdit: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      folderId: a.string().required(),
      documentPath: a.string().required(),
    })
    .returns(a.customType({ presignedUrl: a.string(), expiresIn: a.integer() }))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(saveDocumentEditFunction)),

  /**
   * List event suppliers with collaborator access check
   * Bypasses owner-based authorization to return suppliers based on user's event role
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER, CO_MANAGER, STAFF_LOGISTICS: can view suppliers
   * - STAFF_CHECKIN: no supplier access
   */
  listEventSuppliersQuery: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(a.ref('ListEventSuppliersResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listEventSuppliersFunction)),

  /**
   * List event participants with collaborator access check
   * Bypasses owner-based authorization to return participants based on user's event role
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - ALL roles (OWNER, CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN) can view participants
   */
  listEventParticipantsQuery: a
    .query()
    .arguments({ eventId: a.string().required() })
    .returns(a.ref('ListEventParticipantsResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(listEventParticipantsFunction)),

  /**
   * Get full supplier details scoped to an event
   * Verifies user has event access AND supplier is associated with the event
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER, CO_MANAGER, STAFF_LOGISTICS: can view supplier details
   * - STAFF_CHECKIN: no supplier access
   */
  getSupplierForEvent: a
    .query()
    .arguments({
      supplierId: a.string().required(),
      eventId: a.string().required(),
    })
    .returns(a.ref('SupplierDetailData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(getSupplierForEventFunction)),

  // ========== SUPPLIER SELECTION MUTATIONS (ACCESS_LEVELS_STRATEGY.md) ==========

  /**
   * Select/add a supplier to an event with approval workflow
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER/CO_MANAGER: Direct selection (no approval needed)
   * - STAFF_LOGISTICS: Requires owner approval (PENDING_APPROVAL status)
   */
  selectEventSupplier: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      supplierId: a.string().required(),
      quoteAmount: a.float(),
    })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(selectEventSupplierFunction)),

  /**
   * Approve or reject a supplier selection
   * Only OWNER can approve/reject per ACCESS_LEVELS_STRATEGY.md
   */
  approveSupplierSelection: a
    .mutation()
    .arguments({
      eventSupplierId: a.string().required(),
      approved: a.boolean().required(),
      rejectionReason: a.string(),
    })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(approveSupplierSelectionFunction)),

  /**
   * Collaborator-aware EventSupplier update (ADR-015 / ADR-019 / ADR-021).
   * Caller must hold `supplier:edit`. Only fields currently editable through
   * the UI are allowed; approval and payment have dedicated workflows.
   */
  updateEventSupplierForRole: a
    .mutation()
    .arguments({
      eventSupplierId: a.string().required(),
      quoteAmount: a.float(),
      status: a.string(),
      invoiceS3Key: a.string(),
    })
    .returns(a.ref('EventSupplier'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateEventSupplierForRoleFunction)),

  // ========== PARTICIPANT CREATE MUTATION (collaborator-aware) ==========

  /**
   * Create a participant as owner or collaborator
   * Bypasses rules.owner() by using DynamoDB directly after access check
   * Sets the event owner as the participant record owner
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER, CO_MANAGER, STAFF_LOGISTICS can create participants
   */
  createParticipantAsCollaborator: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      participantName: a.string(),
      participantEmail: a.string(),
      participantPhone: a.string(),
      roleId: a.string(),
      participantStatus: a.string(),
      participantJob: a.string(),
      participantNote: a.string(),
      registrationDate: a.datetime(),
      dependentsCount: a.integer(),
      // --- IDENTIFICACAO ---
      documentationType: a.string(),
      documentLast4: a.string(),
      nationality: a.string(),
      residenceCountry: a.string(),
      organization: a.string(),
      emergencyContact: a.string(),
      internalId: a.string(),
      // --- VISTO ---
      visaRequired: a.boolean(),
      visaSupport: a.boolean(),
      // --- CHEGADA ---
      arrivalDate: a.string(),
      arrivalTime: a.string(),
      arrivalFlight: a.string(),
      arrivalLayovers: a.string(),
      arrivalAirport: a.string(),
      // --- TRANSFER ---
      transferRequired: a.boolean(),
      transferDetails: a.string(),
      transferCost: a.float(),
      transferCurrency: a.string(),
      // --- ALOJAMENTO ---
      hotel: a.string(),
      roomType: a.string(),
      checkInDate: a.string(),
      checkOutDate: a.string(),
      nights: a.integer(),
      ratePerNight: a.float(),
      rateCurrency: a.string(),
      accommodationCost: a.float(),
      // --- PARTIDA ---
      departureDate: a.string(),
      departureTime: a.string(),
      departureFlight: a.string(),
      departureAirport: a.string(),
      // --- FINANCEIRO ---
      ticketFare: a.float(),
      ticketCurrency: a.string(),
      taxesExtras: a.float(),
      taxesCurrency: a.string(),
      totalTravelCost: a.float(),
      totalTravelCurrency: a.string(),
      paymentStatus: a.string(),
      bookingReference: a.string(),
      bookingAgency: a.string(),
      // --- OUTROS ---
      dietaryRestriction: a.string(),
      protocol: a.string(),
      photoUrl: a.string(),
    })
    .returns(a.ref('ParticipantItemData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(createParticipantCollaboratorFunction)),

  // ========== PARTICIPANT UPDATE MUTATION (collaborator-aware) ==========

  /**
   * Update a participant as owner or collaborator
   * Bypasses rules.owner() by using DynamoDB directly after access check
   * Per ACCESS_LEVELS_STRATEGY.md:
   * - OWNER, CO_MANAGER, STAFF_LOGISTICS can update participants
   */
  updateParticipantAsCollaborator: a
    .mutation()
    .arguments({
      id: a.string().required(),
      eventId: a.string().required(),
      participantName: a.string(),
      participantEmail: a.string(),
      participantPhone: a.string(),
      roleId: a.string(),
      participantStatus: a.string(),
      participantJob: a.string(),
      participantNote: a.string(),
      // --- IDENTIFICACAO ---
      documentationType: a.string(),
      documentLast4: a.string(),
      nationality: a.string(),
      residenceCountry: a.string(),
      organization: a.string(),
      emergencyContact: a.string(),
      internalId: a.string(),
      // --- VISTO ---
      visaRequired: a.boolean(),
      visaSupport: a.boolean(),
      // --- CHEGADA ---
      arrivalDate: a.string(),
      arrivalTime: a.string(),
      arrivalFlight: a.string(),
      arrivalLayovers: a.string(),
      arrivalAirport: a.string(),
      // --- TRANSFER ---
      transferRequired: a.boolean(),
      transferDetails: a.string(),
      transferCost: a.float(),
      transferCurrency: a.string(),
      // --- ALOJAMENTO ---
      hotel: a.string(),
      roomType: a.string(),
      checkInDate: a.string(),
      checkOutDate: a.string(),
      nights: a.integer(),
      ratePerNight: a.float(),
      rateCurrency: a.string(),
      accommodationCost: a.float(),
      // --- PARTIDA ---
      departureDate: a.string(),
      departureTime: a.string(),
      departureFlight: a.string(),
      departureAirport: a.string(),
      // --- FINANCEIRO ---
      ticketFare: a.float(),
      ticketCurrency: a.string(),
      taxesExtras: a.float(),
      taxesCurrency: a.string(),
      totalTravelCost: a.float(),
      totalTravelCurrency: a.string(),
      paymentStatus: a.string(),
      bookingReference: a.string(),
      bookingAgency: a.string(),
      // --- OUTROS ---
      dietaryRestriction: a.string(),
      protocol: a.string(),
      photoUrl: a.string(),
    })
    .returns(a.ref('ParticipantItemData'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(updateParticipantCollaboratorFunction)),

  // ========== FIDELIZE INTEGRATION ==========

  /**
   * Save and validate a Fidelize API key
   * Encrypts the key with KMS and stores in FidelizeIntegration table
   */
  saveFidelizeApiKey: a
    .mutation()
    .arguments({
      apiKey: a.string().required(),
    })
    .returns(a.ref('SaveFidelizeApiKeyResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(fidelizeSaveApiKeyFunction)),

  /**
   * Sync Fidelize cards as event participants
   * Fetches cards from Fidelize API, deduplicates, creates/updates participants
   */
  syncFidelizeParticipants: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      templateIds: a.integer().array(),
      page: a.integer(),
    })
    .returns(a.ref('FidelizeSyncResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(fidelizeSyncParticipantsFunction)),

  // ========== NOTION INTEGRATION ==========
  /**
   * Exchange Notion OAuth code for tokens, encrypt, store in DynamoDB
   */
  exchangeNotionToken: a
    .mutation()
    .arguments({
      code: a.string().required(),
      redirectUri: a.string().required(),
    })
    .returns(a.ref('ExchangeNotionTokenResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(notionExchangeTokenFunction)),

  /**
   * Search Notion pages available to the user (with pagination)
   */
  listNotionPages: a
    .query()
    .arguments({
      query: a.string(),
      cursor: a.string(),
    })
    .returns(a.ref('ListNotionPagesResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(notionListPagesFunction)),

  /**
   * Import Notion pages into an event (max 3 per request)
   * Verifies event ownership or collaborator access before import
   */
  importNotionPages: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      pageIds: a.string().required().array(),
      folderId: a.string().required(),
    })
    .returns(a.ref('ImportNotionPagesResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(notionImportPagesFunction)),

  /**
   * Check if imported Notion documents have been updated in Notion
   */
  checkNotionUpdates: a
    .query()
    .arguments({
      eventId: a.string().required(),
      folderId: a.string().required(),
    })
    .returns(a.ref('CheckNotionUpdatesResult'))
    .authorization((rules) => [rules.authenticated()])
    .handler(a.handler.function(notionCheckUpdatesFunction)),
});
export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
