/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const checkNotionUpdates = /* GraphQL */ `query CheckNotionUpdates($eventId: String!, $folderId: String!) {
  checkNotionUpdates(eventId: $eventId, folderId: $folderId) {
    error
    outdated
    total
    updates {
      id
      notionLastEditedAt
      notionPageId
      s3Key
      storedLastEditedAt
      title
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.CheckNotionUpdatesQueryVariables,
  APITypes.CheckNotionUpdatesQuery
>;
export const getAccountAccess = /* GraphQL */ `query GetAccountAccess {
  getAccountAccess {
    canCreateEvent
    planKey
    reason
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetAccountAccessQueryVariables,
  APITypes.GetAccountAccessQuery
>;
export const getDependent = /* GraphQL */ `query GetDependent($id: ID!) {
  getDependent(id: $id) {
    age
    attendedDate
    createdAt
    eventId
    id
    name
    owner
    participant {
      accommodationCost
      arrivalAirport
      arrivalDate
      arrivalFlight
      arrivalLayovers
      arrivalTime
      attendedDate
      bookingAgency
      bookingReference
      checkInDate
      checkOutDate
      confirmationDate
      createdAt
      departureAirport
      departureDate
      departureFlight
      departureTime
      dependentsCount
      dietaryRestriction
      documentLast4
      documentationType
      emergencyContact
      eventId
      hotel
      id
      internalId
      nationality
      nights
      organization
      owner
      participantEmail
      participantJob
      participantName
      participantNote
      participantPhone
      participantStatus
      paymentStatus
      photoUrl
      protocol
      rateCurrency
      ratePerNight
      registrationDate
      residenceCountry
      roleId
      roomType
      taxesCurrency
      taxesExtras
      ticketCurrency
      ticketFare
      totalTravelCost
      totalTravelCurrency
      transferCost
      transferCurrency
      transferDetails
      transferRequired
      updatedAt
      visaRequired
      visaSupport
      __typename
    }
    participantId
    status
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetDependentQueryVariables,
  APITypes.GetDependentQuery
>;
export const getDocumentFolder = /* GraphQL */ `query GetDocumentFolder($id: String!) {
  getDocumentFolder(id: $id) {
    color
    createdAt
    description
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    eventId
    icon
    id
    isDefault
    name
    order
    owner
    parentFolderId
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetDocumentFolderQueryVariables,
  APITypes.GetDocumentFolderQuery
>;
export const getEmailLog = /* GraphQL */ `query GetEmailLog($id: String!) {
  getEmailLog(id: $id) {
    attempts
    createdAt
    deliveredAt
    emailType
    errorMessage
    eventId
    id
    language
    lastAttemptAt
    messageId
    owner
    participantId
    sentAt
    status
    templateName
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEmailLogQueryVariables,
  APITypes.GetEmailLogQuery
>;
export const getEvent = /* GraphQL */ `query GetEvent($id: ID!) {
  getEvent(id: $id) {
    budget
    categories
    collaborators {
      nextToken
      __typename
    }
    committedExpenses
    createdAt
    currency
    dependentCount
    description
    documentFolders {
      nextToken
      __typename
    }
    effectiveExpenses
    eventCreationDate
    eventDateType
    eventEndDate
    eventLocation
    eventManager
    eventManagerEmail
    eventManagerPhone
    eventSpecificDates
    eventStartDate
    eventStatus
    eventTime
    eventTitle
    eventType
    id
    organizerId
    owner
    ownerEmail
    ownerName
    participantCount
    participantLimit
    participants {
      nextToken
      __typename
    }
    planKey
    roles {
      nextToken
      __typename
    }
    suppliers {
      nextToken
      __typename
    }
    totalRegistrations
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetEventQueryVariables, APITypes.GetEventQuery>;
export const getEventAsCollaborator = /* GraphQL */ `query GetEventAsCollaborator($eventId: String!) {
  getEventAsCollaborator(eventId: $eventId) {
    access {
      participantLimit
      planKey
      reason
      writable
      __typename
    }
    canViewTeamSchedule
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      participantCount
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    sharedFolderIds
    sharedSupplierIds
    userRole
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventAsCollaboratorQueryVariables,
  APITypes.GetEventAsCollaboratorQuery
>;
export const getEventCollaborator = /* GraphQL */ `query GetEventCollaborator($id: String!) {
  getEventCollaborator(id: $id) {
    acceptedAt
    canViewTeamSchedule
    createdAt
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    eventId
    id
    invitedAt
    invitedBy
    owner
    role
    sharedFolderIds
    sharedSupplierIds
    status
    updatedAt
    userEmail
    userId
    userName
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventCollaboratorQueryVariables,
  APITypes.GetEventCollaboratorQuery
>;
export const getEventCollaborators = /* GraphQL */ `query GetEventCollaborators($eventId: String!) {
  getEventCollaborators(eventId: $eventId) {
    items {
      acceptedAt
      canViewTeamSchedule
      createdAt
      eventId
      id
      invitedAt
      invitedBy
      role
      sharedFolderIds
      sharedSupplierIds
      status
      updatedAt
      userEmail
      userId
      userName
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventCollaboratorsQueryVariables,
  APITypes.GetEventCollaboratorsQuery
>;
export const getEventFolders = /* GraphQL */ `query GetEventFolders($eventId: String!) {
  getEventFolders(eventId: $eventId) {
    items {
      color
      createdAt
      description
      eventId
      icon
      id
      isDefault
      name
      order
      owner
      parentFolderId
      updatedAt
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventFoldersQueryVariables,
  APITypes.GetEventFoldersQuery
>;
export const getEventRoles = /* GraphQL */ `query GetEventRoles($eventId: String!) {
  getEventRoles(eventId: $eventId) {
    items {
      createdAt
      eventId
      id
      name
      owner
      updatedAt
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventRolesQueryVariables,
  APITypes.GetEventRolesQuery
>;
export const getEventScheduleEntry = /* GraphQL */ `query GetEventScheduleEntry($id: String!) {
  getEventScheduleEntry(id: $id) {
    color
    createdAt
    date
    description
    endTime
    eventId
    id
    location
    order
    owner
    participantIds
    startTime
    supplierId
    title
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventScheduleEntryQueryVariables,
  APITypes.GetEventScheduleEntryQuery
>;
export const getEventSupplier = /* GraphQL */ `query GetEventSupplier($id: String!) {
  getEventSupplier(id: $id) {
    approvalStatus
    approvedAt
    approvedBy
    createdAt
    currency
    description
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    eventId
    externalRef
    id
    invoiceS3Key
    owner
    paidAt
    quoteAmount
    rejectionReason
    requestedBy
    status
    supplier {
      address
      category
      contactEmail
      contactName
      contactPhone
      country
      createdAt
      currency
      estimateMaxAmount
      estimateMinAmount
      estimateUnit
      id
      name
      notes
      owner
      paymentDetails
      tags
      updatedAt
      vatNumber
      website
      __typename
    }
    supplierId
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEventSupplierQueryVariables,
  APITypes.GetEventSupplierQuery
>;
export const getFidelizeIntegration = /* GraphQL */ `query GetFidelizeIntegration($id: String!) {
  getFidelizeIntegration(id: $id) {
    apiKey
    createdAt
    id
    isActive
    lastSyncAt
    owner
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetFidelizeIntegrationQueryVariables,
  APITypes.GetFidelizeIntegrationQuery
>;
export const getInvoice = /* GraphQL */ `query GetInvoice($id: String!) {
  getInvoice(id: $id) {
    amount
    createdAt
    currency
    id
    invoiceNumber
    invoicePdfUrl
    invoiceUrl
    owner
    refundedAt
    status
    updatedAt
    userId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetInvoiceQueryVariables,
  APITypes.GetInvoiceQuery
>;
export const getNotionDocument = /* GraphQL */ `query GetNotionDocument($id: String!) {
  getNotionDocument(id: $id) {
    createdAt
    eventId
    folderId
    id
    importedAt
    notionLastEditedAt
    notionPageId
    notionPageUrl
    owner
    s3Key
    title
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetNotionDocumentQueryVariables,
  APITypes.GetNotionDocumentQuery
>;
export const getNotionIntegration = /* GraphQL */ `query GetNotionIntegration($id: String!) {
  getNotionIntegration(id: $id) {
    accessToken
    botId
    createdAt
    id
    owner
    refreshToken
    updatedAt
    workspaceId
    workspaceName
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetNotionIntegrationQueryVariables,
  APITypes.GetNotionIntegrationQuery
>;
export const getParticipant = /* GraphQL */ `query GetParticipant($id: ID!) {
  getParticipant(id: $id) {
    accommodationCost
    arrivalAirport
    arrivalDate
    arrivalFlight
    arrivalLayovers
    arrivalTime
    attendedDate
    bookingAgency
    bookingReference
    checkInDate
    checkOutDate
    confirmationDate
    createdAt
    departureAirport
    departureDate
    departureFlight
    departureTime
    dependents {
      nextToken
      __typename
    }
    dependentsCount
    dietaryRestriction
    documentLast4
    documentationType
    emergencyContact
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    eventId
    hotel
    id
    internalId
    nationality
    nights
    organization
    owner
    participantEmail
    participantJob
    participantName
    participantNote
    participantPhone
    participantStatus
    paymentStatus
    photoUrl
    protocol
    rateCurrency
    ratePerNight
    registrationDate
    residenceCountry
    role {
      archived
      createdAt
      eventId
      id
      name
      owner
      updatedAt
      __typename
    }
    roleId
    roomType
    taxesCurrency
    taxesExtras
    ticketCurrency
    ticketFare
    totalTravelCost
    totalTravelCurrency
    transferCost
    transferCurrency
    transferDetails
    transferRequired
    updatedAt
    visaRequired
    visaSupport
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetParticipantQueryVariables,
  APITypes.GetParticipantQuery
>;
export const getPaymentMethodData = /* GraphQL */ `query GetPaymentMethodData($id: String!) {
  getPaymentMethodData(id: $id) {
    brand
    createdAt
    expiryMonth
    expiryYear
    id
    last4
    owner
    paymentMethodId
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPaymentMethodDataQueryVariables,
  APITypes.GetPaymentMethodDataQuery
>;
export const getPlanPurchase = /* GraphQL */ `query GetPlanPurchase($id: String!) {
  getPlanPurchase(id: $id) {
    amount
    consumedAt
    consumedByEventId
    createdAt
    currency
    id
    owner
    planKey
    refundedAt
    stripeCheckoutSessionId
    stripePaymentIntentId
    tierKey
    updatedAt
    userId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPlanPurchaseQueryVariables,
  APITypes.GetPlanPurchaseQuery
>;
export const getProcessedStripeEvent = /* GraphQL */ `query GetProcessedStripeEvent($id: ID!) {
  getProcessedStripeEvent(id: $id) {
    createdAt
    eventId
    id
    processedAt
    processedKey
    type
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetProcessedStripeEventQueryVariables,
  APITypes.GetProcessedStripeEventQuery
>;
export const getRole = /* GraphQL */ `query GetRole($id: ID!) {
  getRole(id: $id) {
    archived
    createdAt
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    eventId
    id
    name
    owner
    participants {
      nextToken
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRoleQueryVariables, APITypes.GetRoleQuery>;
export const getSupplier = /* GraphQL */ `query GetSupplier($id: String!) {
  getSupplier(id: $id) {
    address
    category
    contactEmail
    contactName
    contactPhone
    country
    createdAt
    currency
    estimateMaxAmount
    estimateMinAmount
    estimateUnit
    eventSuppliers {
      nextToken
      __typename
    }
    id
    name
    notes
    owner
    paymentDetails
    tags
    updatedAt
    vatNumber
    website
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetSupplierQueryVariables,
  APITypes.GetSupplierQuery
>;
export const getSupplierForEvent = /* GraphQL */ `query GetSupplierForEvent($eventId: String!, $supplierId: String!) {
  getSupplierForEvent(eventId: $eventId, supplierId: $supplierId) {
    address
    category
    contactEmail
    contactName
    contactPhone
    country
    currency
    estimateMaxAmount
    estimateMinAmount
    estimateUnit
    id
    name
    notes
    paymentDetails
    tags
    vatNumber
    website
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetSupplierForEventQueryVariables,
  APITypes.GetSupplierForEventQuery
>;
export const getUserSubscription = /* GraphQL */ `query GetUserSubscription($id: String!) {
  getUserSubscription(id: $id) {
    billingCycle
    cancelAt
    cancelAtPeriodEnd
    canceledAt
    createdAt
    currentPeriodEnd
    currentPeriodStart
    id
    owner
    paymentMethodId
    planName
    priceId
    setupIntentId
    status
    stripeCustomerId
    subscriptionId
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetUserSubscriptionQueryVariables,
  APITypes.GetUserSubscriptionQuery
>;
export const listDependents = /* GraphQL */ `query ListDependents(
  $filter: ModelDependentFilterInput
  $limit: Int
  $nextToken: String
) {
  listDependents(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      age
      attendedDate
      createdAt
      eventId
      id
      name
      owner
      participantId
      status
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDependentsQueryVariables,
  APITypes.ListDependentsQuery
>;
export const listDocumentFolderByEventId = /* GraphQL */ `query ListDocumentFolderByEventId(
  $eventId: String!
  $filter: ModelDocumentFolderFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listDocumentFolderByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      color
      createdAt
      description
      eventId
      icon
      id
      isDefault
      name
      order
      owner
      parentFolderId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDocumentFolderByEventIdQueryVariables,
  APITypes.ListDocumentFolderByEventIdQuery
>;
export const listDocumentFolders = /* GraphQL */ `query ListDocumentFolders(
  $filter: ModelDocumentFolderFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listDocumentFolders(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      color
      createdAt
      description
      eventId
      icon
      id
      isDefault
      name
      order
      owner
      parentFolderId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDocumentFoldersQueryVariables,
  APITypes.ListDocumentFoldersQuery
>;
export const listEmailLogByEventId = /* GraphQL */ `query ListEmailLogByEventId(
  $eventId: String!
  $filter: ModelEmailLogFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEmailLogByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      attempts
      createdAt
      deliveredAt
      emailType
      errorMessage
      eventId
      id
      language
      lastAttemptAt
      messageId
      owner
      participantId
      sentAt
      status
      templateName
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEmailLogByEventIdQueryVariables,
  APITypes.ListEmailLogByEventIdQuery
>;
export const listEmailLogs = /* GraphQL */ `query ListEmailLogs(
  $filter: ModelEmailLogFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEmailLogs(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      attempts
      createdAt
      deliveredAt
      emailType
      errorMessage
      eventId
      id
      language
      lastAttemptAt
      messageId
      owner
      participantId
      sentAt
      status
      templateName
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEmailLogsQueryVariables,
  APITypes.ListEmailLogsQuery
>;
export const listEventByOrganizerId = /* GraphQL */ `query ListEventByOrganizerId(
  $filter: ModelEventFilterInput
  $limit: Int
  $nextToken: String
  $organizerId: String!
  $sortDirection: ModelSortDirection
) {
  listEventByOrganizerId(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    organizerId: $organizerId
    sortDirection: $sortDirection
  ) {
    items {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventByOrganizerIdQueryVariables,
  APITypes.ListEventByOrganizerIdQuery
>;
export const listEventCollaboratorByEventId = /* GraphQL */ `query ListEventCollaboratorByEventId(
  $eventId: String!
  $filter: ModelEventCollaboratorFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEventCollaboratorByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      acceptedAt
      canViewTeamSchedule
      createdAt
      eventId
      id
      invitedAt
      invitedBy
      owner
      role
      sharedFolderIds
      sharedSupplierIds
      status
      updatedAt
      userEmail
      userId
      userName
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventCollaboratorByEventIdQueryVariables,
  APITypes.ListEventCollaboratorByEventIdQuery
>;
export const listEventCollaboratorByUserEmail = /* GraphQL */ `query ListEventCollaboratorByUserEmail(
  $filter: ModelEventCollaboratorFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $userEmail: String!
) {
  listEventCollaboratorByUserEmail(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    userEmail: $userEmail
  ) {
    items {
      acceptedAt
      canViewTeamSchedule
      createdAt
      eventId
      id
      invitedAt
      invitedBy
      owner
      role
      sharedFolderIds
      sharedSupplierIds
      status
      updatedAt
      userEmail
      userId
      userName
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventCollaboratorByUserEmailQueryVariables,
  APITypes.ListEventCollaboratorByUserEmailQuery
>;
export const listEventCollaboratorByUserId = /* GraphQL */ `query ListEventCollaboratorByUserId(
  $filter: ModelEventCollaboratorFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $userId: String!
) {
  listEventCollaboratorByUserId(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    userId: $userId
  ) {
    items {
      acceptedAt
      canViewTeamSchedule
      createdAt
      eventId
      id
      invitedAt
      invitedBy
      owner
      role
      sharedFolderIds
      sharedSupplierIds
      status
      updatedAt
      userEmail
      userId
      userName
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventCollaboratorByUserIdQueryVariables,
  APITypes.ListEventCollaboratorByUserIdQuery
>;
export const listEventCollaborators = /* GraphQL */ `query ListEventCollaborators(
  $filter: ModelEventCollaboratorFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEventCollaborators(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      acceptedAt
      canViewTeamSchedule
      createdAt
      eventId
      id
      invitedAt
      invitedBy
      owner
      role
      sharedFolderIds
      sharedSupplierIds
      status
      updatedAt
      userEmail
      userId
      userName
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventCollaboratorsQueryVariables,
  APITypes.ListEventCollaboratorsQuery
>;
export const listEventParticipantsQuery = /* GraphQL */ `query ListEventParticipantsQuery($eventId: String!) {
  listEventParticipantsQuery(eventId: $eventId) {
    items {
      accommodationCost
      arrivalAirport
      arrivalDate
      arrivalFlight
      arrivalLayovers
      arrivalTime
      attendedDate
      bookingAgency
      bookingReference
      checkInDate
      checkOutDate
      confirmationDate
      createdAt
      departureAirport
      departureDate
      departureFlight
      departureTime
      dependentsCount
      dietaryRestriction
      documentLast4
      documentationType
      emergencyContact
      eventId
      hotel
      id
      internalId
      nationality
      nights
      organization
      owner
      participantEmail
      participantJob
      participantName
      participantNote
      participantPhone
      participantStatus
      paymentStatus
      photoUrl
      protocol
      rateCurrency
      ratePerNight
      registrationDate
      residenceCountry
      roleId
      roomType
      taxesCurrency
      taxesExtras
      ticketCurrency
      ticketFare
      totalTravelCost
      totalTravelCurrency
      transferCost
      transferCurrency
      transferDetails
      transferRequired
      updatedAt
      visaRequired
      visaSupport
      __typename
    }
    totalCount
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventParticipantsQueryQueryVariables,
  APITypes.ListEventParticipantsQueryQuery
>;
export const listEventSchedule = /* GraphQL */ `query ListEventSchedule($eventId: String!) {
  listEventSchedule(eventId: $eventId) {
    authors {
      name
      userId
      __typename
    }
    items {
      color
      createdAt
      date
      description
      endTime
      eventId
      id
      location
      order
      owner
      participantIds
      startTime
      supplierId
      title
      updatedAt
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventScheduleQueryVariables,
  APITypes.ListEventScheduleQuery
>;
export const listEventScheduleEntries = /* GraphQL */ `query ListEventScheduleEntries(
  $filter: ModelEventScheduleEntryFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEventScheduleEntries(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      color
      createdAt
      date
      description
      endTime
      eventId
      id
      location
      order
      owner
      participantIds
      startTime
      supplierId
      title
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventScheduleEntriesQueryVariables,
  APITypes.ListEventScheduleEntriesQuery
>;
export const listEventScheduleEntryByEventId = /* GraphQL */ `query ListEventScheduleEntryByEventId(
  $eventId: String!
  $filter: ModelEventScheduleEntryFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEventScheduleEntryByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      color
      createdAt
      date
      description
      endTime
      eventId
      id
      location
      order
      owner
      participantIds
      startTime
      supplierId
      title
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventScheduleEntryByEventIdQueryVariables,
  APITypes.ListEventScheduleEntryByEventIdQuery
>;
export const listEventSupplierByEventId = /* GraphQL */ `query ListEventSupplierByEventId(
  $eventId: String!
  $filter: ModelEventSupplierFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEventSupplierByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      approvalStatus
      approvedAt
      approvedBy
      createdAt
      currency
      description
      eventId
      externalRef
      id
      invoiceS3Key
      owner
      paidAt
      quoteAmount
      rejectionReason
      requestedBy
      status
      supplierId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventSupplierByEventIdQueryVariables,
  APITypes.ListEventSupplierByEventIdQuery
>;
export const listEventSuppliers = /* GraphQL */ `query ListEventSuppliers(
  $filter: ModelEventSupplierFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listEventSuppliers(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      approvalStatus
      approvedAt
      approvedBy
      createdAt
      currency
      description
      eventId
      externalRef
      id
      invoiceS3Key
      owner
      paidAt
      quoteAmount
      rejectionReason
      requestedBy
      status
      supplierId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventSuppliersQueryVariables,
  APITypes.ListEventSuppliersQuery
>;
export const listEventSuppliersQuery = /* GraphQL */ `query ListEventSuppliersQuery($eventId: String!) {
  listEventSuppliersQuery(eventId: $eventId) {
    eventData {
      budget
      committedExpenses
      effectiveExpenses
      eventTitle
      id
      __typename
    }
    items {
      approvalStatus
      approvedAt
      approvedBy
      createdAt
      eventId
      id
      invoiceS3Key
      owner
      paidAt
      quoteAmount
      rejectionReason
      requestedBy
      status
      supplierId
      updatedAt
      __typename
    }
    sharedSuppliers {
      category
      contactEmail
      contactName
      contactPhone
      currency
      estimateMaxAmount
      estimateMinAmount
      id
      name
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventSuppliersQueryQueryVariables,
  APITypes.ListEventSuppliersQueryQuery
>;
export const listEvents = /* GraphQL */ `query ListEvents(
  $filter: ModelEventFilterInput
  $limit: Int
  $nextToken: String
) {
  listEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEventsQueryVariables,
  APITypes.ListEventsQuery
>;
export const listFidelizeIntegrations = /* GraphQL */ `query ListFidelizeIntegrations(
  $filter: ModelFidelizeIntegrationFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listFidelizeIntegrations(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      apiKey
      createdAt
      id
      isActive
      lastSyncAt
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListFidelizeIntegrationsQueryVariables,
  APITypes.ListFidelizeIntegrationsQuery
>;
export const listInvoices = /* GraphQL */ `query ListInvoices(
  $filter: ModelInvoiceFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listInvoices(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      amount
      createdAt
      currency
      id
      invoiceNumber
      invoicePdfUrl
      invoiceUrl
      owner
      refundedAt
      status
      updatedAt
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListInvoicesQueryVariables,
  APITypes.ListInvoicesQuery
>;
export const listMyCollaboratedEvents = /* GraphQL */ `query ListMyCollaboratedEvents {
  listMyCollaboratedEvents {
    collaboration {
      acceptedAt
      canViewTeamSchedule
      createdAt
      eventId
      id
      invitedAt
      invitedBy
      role
      sharedFolderIds
      sharedSupplierIds
      status
      updatedAt
      userEmail
      userId
      userName
      __typename
    }
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      participantCount
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    userRole
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMyCollaboratedEventsQueryVariables,
  APITypes.ListMyCollaboratedEventsQuery
>;
export const listMyPendingInvitations = /* GraphQL */ `query ListMyPendingInvitations {
  listMyPendingInvitations {
    acceptedAt
    canViewTeamSchedule
    createdAt
    event {
      budget
      categories
      committedExpenses
      createdAt
      currency
      dependentCount
      description
      effectiveExpenses
      eventCreationDate
      eventDateType
      eventEndDate
      eventLocation
      eventManager
      eventManagerEmail
      eventManagerPhone
      eventSpecificDates
      eventStartDate
      eventStatus
      eventTime
      eventTitle
      eventType
      id
      organizerId
      owner
      ownerEmail
      ownerName
      participantCount
      participantLimit
      planKey
      totalRegistrations
      updatedAt
      __typename
    }
    eventId
    id
    invitedAt
    invitedBy
    owner
    role
    sharedFolderIds
    sharedSupplierIds
    status
    updatedAt
    userEmail
    userId
    userName
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListMyPendingInvitationsQueryVariables,
  APITypes.ListMyPendingInvitationsQuery
>;
export const listNotionDocumentByEventId = /* GraphQL */ `query ListNotionDocumentByEventId(
  $eventId: String!
  $filter: ModelNotionDocumentFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listNotionDocumentByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      eventId
      folderId
      id
      importedAt
      notionLastEditedAt
      notionPageId
      notionPageUrl
      owner
      s3Key
      title
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListNotionDocumentByEventIdQueryVariables,
  APITypes.ListNotionDocumentByEventIdQuery
>;
export const listNotionDocumentByNotionPageIdAndEventId = /* GraphQL */ `query ListNotionDocumentByNotionPageIdAndEventId(
  $eventId: ModelStringKeyConditionInput
  $filter: ModelNotionDocumentFilterInput
  $limit: Int
  $nextToken: String
  $notionPageId: String!
  $sortDirection: ModelSortDirection
) {
  listNotionDocumentByNotionPageIdAndEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    notionPageId: $notionPageId
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      eventId
      folderId
      id
      importedAt
      notionLastEditedAt
      notionPageId
      notionPageUrl
      owner
      s3Key
      title
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListNotionDocumentByNotionPageIdAndEventIdQueryVariables,
  APITypes.ListNotionDocumentByNotionPageIdAndEventIdQuery
>;
export const listNotionDocuments = /* GraphQL */ `query ListNotionDocuments(
  $filter: ModelNotionDocumentFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listNotionDocuments(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      eventId
      folderId
      id
      importedAt
      notionLastEditedAt
      notionPageId
      notionPageUrl
      owner
      s3Key
      title
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListNotionDocumentsQueryVariables,
  APITypes.ListNotionDocumentsQuery
>;
export const listNotionIntegrations = /* GraphQL */ `query ListNotionIntegrations(
  $filter: ModelNotionIntegrationFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listNotionIntegrations(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      accessToken
      botId
      createdAt
      id
      owner
      refreshToken
      updatedAt
      workspaceId
      workspaceName
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListNotionIntegrationsQueryVariables,
  APITypes.ListNotionIntegrationsQuery
>;
export const listNotionPages = /* GraphQL */ `query ListNotionPages($cursor: String, $query: String) {
  listNotionPages(cursor: $cursor, query: $query) {
    error
    hasMore
    nextCursor
    pages {
      icon
      id
      lastEditedAt
      propertyCount
      subtitle
      title
      type
      url
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListNotionPagesQueryVariables,
  APITypes.ListNotionPagesQuery
>;
export const listParticipants = /* GraphQL */ `query ListParticipants(
  $filter: ModelParticipantFilterInput
  $limit: Int
  $nextToken: String
) {
  listParticipants(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      accommodationCost
      arrivalAirport
      arrivalDate
      arrivalFlight
      arrivalLayovers
      arrivalTime
      attendedDate
      bookingAgency
      bookingReference
      checkInDate
      checkOutDate
      confirmationDate
      createdAt
      departureAirport
      departureDate
      departureFlight
      departureTime
      dependentsCount
      dietaryRestriction
      documentLast4
      documentationType
      emergencyContact
      eventId
      hotel
      id
      internalId
      nationality
      nights
      organization
      owner
      participantEmail
      participantJob
      participantName
      participantNote
      participantPhone
      participantStatus
      paymentStatus
      photoUrl
      protocol
      rateCurrency
      ratePerNight
      registrationDate
      residenceCountry
      roleId
      roomType
      taxesCurrency
      taxesExtras
      ticketCurrency
      ticketFare
      totalTravelCost
      totalTravelCurrency
      transferCost
      transferCurrency
      transferDetails
      transferRequired
      updatedAt
      visaRequired
      visaSupport
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListParticipantsQueryVariables,
  APITypes.ListParticipantsQuery
>;
export const listPaymentMethodData = /* GraphQL */ `query ListPaymentMethodData(
  $filter: ModelPaymentMethodDataFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listPaymentMethodData(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      brand
      createdAt
      expiryMonth
      expiryYear
      id
      last4
      owner
      paymentMethodId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPaymentMethodDataQueryVariables,
  APITypes.ListPaymentMethodDataQuery
>;
export const listPlanPurchaseByUserId = /* GraphQL */ `query ListPlanPurchaseByUserId(
  $filter: ModelPlanPurchaseFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $userId: String!
) {
  listPlanPurchaseByUserId(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    userId: $userId
  ) {
    items {
      amount
      consumedAt
      consumedByEventId
      createdAt
      currency
      id
      owner
      planKey
      refundedAt
      stripeCheckoutSessionId
      stripePaymentIntentId
      tierKey
      updatedAt
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPlanPurchaseByUserIdQueryVariables,
  APITypes.ListPlanPurchaseByUserIdQuery
>;
export const listPlanPurchases = /* GraphQL */ `query ListPlanPurchases(
  $filter: ModelPlanPurchaseFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listPlanPurchases(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      amount
      consumedAt
      consumedByEventId
      createdAt
      currency
      id
      owner
      planKey
      refundedAt
      stripeCheckoutSessionId
      stripePaymentIntentId
      tierKey
      updatedAt
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPlanPurchasesQueryVariables,
  APITypes.ListPlanPurchasesQuery
>;
export const listProcessedStripeEvents = /* GraphQL */ `query ListProcessedStripeEvents(
  $filter: ModelProcessedStripeEventFilterInput
  $limit: Int
  $nextToken: String
) {
  listProcessedStripeEvents(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      createdAt
      eventId
      id
      processedAt
      processedKey
      type
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProcessedStripeEventsQueryVariables,
  APITypes.ListProcessedStripeEventsQuery
>;
export const listRoleByEventId = /* GraphQL */ `query ListRoleByEventId(
  $eventId: String!
  $filter: ModelRoleFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRoleByEventId(
    eventId: $eventId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      archived
      createdAt
      eventId
      id
      name
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRoleByEventIdQueryVariables,
  APITypes.ListRoleByEventIdQuery
>;
export const listRoles = /* GraphQL */ `query ListRoles(
  $filter: ModelRoleFilterInput
  $limit: Int
  $nextToken: String
) {
  listRoles(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      archived
      createdAt
      eventId
      id
      name
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRolesQueryVariables, APITypes.ListRolesQuery>;
export const listSupplierByOwner = /* GraphQL */ `query ListSupplierByOwner(
  $filter: ModelSupplierFilterInput
  $limit: Int
  $nextToken: String
  $owner: String!
  $sortDirection: ModelSortDirection
) {
  listSupplierByOwner(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    owner: $owner
    sortDirection: $sortDirection
  ) {
    items {
      address
      category
      contactEmail
      contactName
      contactPhone
      country
      createdAt
      currency
      estimateMaxAmount
      estimateMinAmount
      estimateUnit
      id
      name
      notes
      owner
      paymentDetails
      tags
      updatedAt
      vatNumber
      website
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListSupplierByOwnerQueryVariables,
  APITypes.ListSupplierByOwnerQuery
>;
export const listSuppliers = /* GraphQL */ `query ListSuppliers(
  $filter: ModelSupplierFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listSuppliers(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      address
      category
      contactEmail
      contactName
      contactPhone
      country
      createdAt
      currency
      estimateMaxAmount
      estimateMinAmount
      estimateUnit
      id
      name
      notes
      owner
      paymentDetails
      tags
      updatedAt
      vatNumber
      website
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListSuppliersQueryVariables,
  APITypes.ListSuppliersQuery
>;
export const listUserSubscriptionByStripeCustomerId = /* GraphQL */ `query ListUserSubscriptionByStripeCustomerId(
  $filter: ModelUserSubscriptionFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $stripeCustomerId: String!
) {
  listUserSubscriptionByStripeCustomerId(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    stripeCustomerId: $stripeCustomerId
  ) {
    items {
      billingCycle
      cancelAt
      cancelAtPeriodEnd
      canceledAt
      createdAt
      currentPeriodEnd
      currentPeriodStart
      id
      owner
      paymentMethodId
      planName
      priceId
      setupIntentId
      status
      stripeCustomerId
      subscriptionId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserSubscriptionByStripeCustomerIdQueryVariables,
  APITypes.ListUserSubscriptionByStripeCustomerIdQuery
>;
export const listUserSubscriptions = /* GraphQL */ `query ListUserSubscriptions(
  $filter: ModelUserSubscriptionFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listUserSubscriptions(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      billingCycle
      cancelAt
      cancelAtPeriodEnd
      canceledAt
      createdAt
      currentPeriodEnd
      currentPeriodStart
      id
      owner
      paymentMethodId
      planName
      priceId
      setupIntentId
      status
      stripeCustomerId
      subscriptionId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserSubscriptionsQueryVariables,
  APITypes.ListUserSubscriptionsQuery
>;
