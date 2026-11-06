/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const acceptInvitation = /* GraphQL */ `mutation AcceptInvitation($invitationId: String!) {
  acceptInvitation(invitationId: $invitationId) {
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
` as GeneratedMutation<
  APITypes.AcceptInvitationMutationVariables,
  APITypes.AcceptInvitationMutation
>;
export const adjustApprovedEventSupplierQuote = /* GraphQL */ `mutation AdjustApprovedEventSupplierQuote(
  $eventSupplierId: String!
  $newQuoteAmount: Float!
) {
  adjustApprovedEventSupplierQuote(
    eventSupplierId: $eventSupplierId
    newQuoteAmount: $newQuoteAmount
  ) {
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
` as GeneratedMutation<
  APITypes.AdjustApprovedEventSupplierQuoteMutationVariables,
  APITypes.AdjustApprovedEventSupplierQuoteMutation
>;
export const approveSupplierSelection = /* GraphQL */ `mutation ApproveSupplierSelection(
  $approved: Boolean!
  $eventSupplierId: String!
  $rejectionReason: String
) {
  approveSupplierSelection(
    approved: $approved
    eventSupplierId: $eventSupplierId
    rejectionReason: $rejectionReason
  ) {
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
` as GeneratedMutation<
  APITypes.ApproveSupplierSelectionMutationVariables,
  APITypes.ApproveSupplierSelectionMutation
>;
export const confirmParticipant = /* GraphQL */ `mutation ConfirmParticipant(
  $attendedDate: String
  $dependentUpdates: AWSJSON
  $eventId: String!
  $language: ConfirmParticipantLanguage
  $participantId: String
  $participantStatus: String
) {
  confirmParticipant(
    attendedDate: $attendedDate
    dependentUpdates: $dependentUpdates
    eventId: $eventId
    language: $language
    participantId: $participantId
    participantStatus: $participantStatus
  ) {
    message
    success
    updatedDependentsCount
    __typename
  }
}
` as GeneratedMutation<
  APITypes.ConfirmParticipantMutationVariables,
  APITypes.ConfirmParticipantMutation
>;
export const createBillingPortalSession = /* GraphQL */ `mutation CreateBillingPortalSession($returnUrl: String) {
  createBillingPortalSession(returnUrl: $returnUrl) {
    message
    sessionUrl
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateBillingPortalSessionMutationVariables,
  APITypes.CreateBillingPortalSessionMutation
>;
export const createCheckoutSession = /* GraphQL */ `mutation CreateCheckoutSession(
  $billingCycle: String
  $cancelUrl: String
  $customerEmail: String
  $eventId: String
  $intent: String
  $planKey: String
  $successUrl: String
  $tierKey: String
) {
  createCheckoutSession(
    billingCycle: $billingCycle
    cancelUrl: $cancelUrl
    customerEmail: $customerEmail
    eventId: $eventId
    intent: $intent
    planKey: $planKey
    successUrl: $successUrl
    tierKey: $tierKey
  ) {
    message
    sessionUrl
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateCheckoutSessionMutationVariables,
  APITypes.CreateCheckoutSessionMutation
>;
export const createDependent = /* GraphQL */ `mutation CreateDependent(
  $condition: ModelDependentConditionInput
  $input: CreateDependentInput!
) {
  createDependent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateDependentMutationVariables,
  APITypes.CreateDependentMutation
>;
export const createDependentCustom = /* GraphQL */ `mutation CreateDependentCustom(
  $age: String
  $eventId: String!
  $name: String!
  $participantId: String!
  $status: String
) {
  createDependentCustom(
    age: $age
    eventId: $eventId
    name: $name
    participantId: $participantId
    status: $status
  ) {
    age
    eventId
    id
    message
    name
    participantId
    status
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateDependentCustomMutationVariables,
  APITypes.CreateDependentCustomMutation
>;
export const createDocumentFolder = /* GraphQL */ `mutation CreateDocumentFolder(
  $condition: ModelDocumentFolderConditionInput
  $input: CreateDocumentFolderInput!
) {
  createDocumentFolder(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateDocumentFolderMutationVariables,
  APITypes.CreateDocumentFolderMutation
>;
export const createEmailLog = /* GraphQL */ `mutation CreateEmailLog(
  $condition: ModelEmailLogConditionInput
  $input: CreateEmailLogInput!
) {
  createEmailLog(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateEmailLogMutationVariables,
  APITypes.CreateEmailLogMutation
>;
export const createEvent = /* GraphQL */ `mutation CreateEvent(
  $budget: Float
  $categories: [String]
  $currency: String
  $description: String
  $eventDateType: String
  $eventEndDate: AWSDate
  $eventLocation: String
  $eventManager: String
  $eventManagerEmail: String
  $eventManagerPhone: String
  $eventSpecificDates: [String]
  $eventStartDate: AWSDate
  $eventStatus: String
  $eventTime: AWSTime
  $eventTitle: String
  $eventType: String
) {
  createEvent(
    budget: $budget
    categories: $categories
    currency: $currency
    description: $description
    eventDateType: $eventDateType
    eventEndDate: $eventEndDate
    eventLocation: $eventLocation
    eventManager: $eventManager
    eventManagerEmail: $eventManagerEmail
    eventManagerPhone: $eventManagerPhone
    eventSpecificDates: $eventSpecificDates
    eventStartDate: $eventStartDate
    eventStatus: $eventStatus
    eventTime: $eventTime
    eventTitle: $eventTitle
    eventType: $eventType
  ) {
    event
    message
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateEventMutationVariables,
  APITypes.CreateEventMutation
>;
export const createEventFolder = /* GraphQL */ `mutation CreateEventFolder(
  $color: String
  $description: String
  $eventId: String!
  $isDefault: Boolean
  $name: String!
  $order: Int
  $parentFolderId: String
) {
  createEventFolder(
    color: $color
    description: $description
    eventId: $eventId
    isDefault: $isDefault
    name: $name
    order: $order
    parentFolderId: $parentFolderId
  ) {
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
}
` as GeneratedMutation<
  APITypes.CreateEventFolderMutationVariables,
  APITypes.CreateEventFolderMutation
>;
export const createEventRole = /* GraphQL */ `mutation CreateEventRole($eventId: String!, $name: String!) {
  createEventRole(eventId: $eventId, name: $name) {
    createdAt
    eventId
    id
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateEventRoleMutationVariables,
  APITypes.CreateEventRoleMutation
>;
export const createEventSupplier = /* GraphQL */ `mutation CreateEventSupplier(
  $condition: ModelEventSupplierConditionInput
  $input: CreateEventSupplierInput!
) {
  createEventSupplier(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateEventSupplierMutationVariables,
  APITypes.CreateEventSupplierMutation
>;
export const createFidelizeIntegration = /* GraphQL */ `mutation CreateFidelizeIntegration(
  $condition: ModelFidelizeIntegrationConditionInput
  $input: CreateFidelizeIntegrationInput!
) {
  createFidelizeIntegration(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateFidelizeIntegrationMutationVariables,
  APITypes.CreateFidelizeIntegrationMutation
>;
export const createInvoice = /* GraphQL */ `mutation CreateInvoice(
  $condition: ModelInvoiceConditionInput
  $input: CreateInvoiceInput!
) {
  createInvoice(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateInvoiceMutationVariables,
  APITypes.CreateInvoiceMutation
>;
export const createNotionDocument = /* GraphQL */ `mutation CreateNotionDocument(
  $condition: ModelNotionDocumentConditionInput
  $input: CreateNotionDocumentInput!
) {
  createNotionDocument(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateNotionDocumentMutationVariables,
  APITypes.CreateNotionDocumentMutation
>;
export const createNotionIntegration = /* GraphQL */ `mutation CreateNotionIntegration(
  $condition: ModelNotionIntegrationConditionInput
  $input: CreateNotionIntegrationInput!
) {
  createNotionIntegration(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateNotionIntegrationMutationVariables,
  APITypes.CreateNotionIntegrationMutation
>;
export const createParticipant = /* GraphQL */ `mutation CreateParticipant(
  $condition: ModelParticipantConditionInput
  $input: CreateParticipantInput!
) {
  createParticipant(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateParticipantMutationVariables,
  APITypes.CreateParticipantMutation
>;
export const createParticipantAsCollaborator = /* GraphQL */ `mutation CreateParticipantAsCollaborator(
  $accommodationCost: Float
  $arrivalAirport: String
  $arrivalDate: String
  $arrivalFlight: String
  $arrivalLayovers: String
  $arrivalTime: String
  $bookingAgency: String
  $bookingReference: String
  $checkInDate: String
  $checkOutDate: String
  $departureAirport: String
  $departureDate: String
  $departureFlight: String
  $departureTime: String
  $dependentsCount: Int
  $dietaryRestriction: String
  $documentLast4: String
  $documentationType: String
  $emergencyContact: String
  $eventId: String!
  $hotel: String
  $internalId: String
  $nationality: String
  $nights: Int
  $organization: String
  $participantEmail: String
  $participantJob: String
  $participantName: String
  $participantNote: String
  $participantPhone: String
  $participantStatus: String
  $paymentStatus: String
  $photoUrl: String
  $protocol: String
  $rateCurrency: String
  $ratePerNight: Float
  $registrationDate: AWSDateTime
  $residenceCountry: String
  $roleId: String
  $roomType: String
  $taxesCurrency: String
  $taxesExtras: Float
  $ticketCurrency: String
  $ticketFare: Float
  $totalTravelCost: Float
  $totalTravelCurrency: String
  $transferCost: Float
  $transferCurrency: String
  $transferDetails: String
  $transferRequired: Boolean
  $visaRequired: Boolean
  $visaSupport: Boolean
) {
  createParticipantAsCollaborator(
    accommodationCost: $accommodationCost
    arrivalAirport: $arrivalAirport
    arrivalDate: $arrivalDate
    arrivalFlight: $arrivalFlight
    arrivalLayovers: $arrivalLayovers
    arrivalTime: $arrivalTime
    bookingAgency: $bookingAgency
    bookingReference: $bookingReference
    checkInDate: $checkInDate
    checkOutDate: $checkOutDate
    departureAirport: $departureAirport
    departureDate: $departureDate
    departureFlight: $departureFlight
    departureTime: $departureTime
    dependentsCount: $dependentsCount
    dietaryRestriction: $dietaryRestriction
    documentLast4: $documentLast4
    documentationType: $documentationType
    emergencyContact: $emergencyContact
    eventId: $eventId
    hotel: $hotel
    internalId: $internalId
    nationality: $nationality
    nights: $nights
    organization: $organization
    participantEmail: $participantEmail
    participantJob: $participantJob
    participantName: $participantName
    participantNote: $participantNote
    participantPhone: $participantPhone
    participantStatus: $participantStatus
    paymentStatus: $paymentStatus
    photoUrl: $photoUrl
    protocol: $protocol
    rateCurrency: $rateCurrency
    ratePerNight: $ratePerNight
    registrationDate: $registrationDate
    residenceCountry: $residenceCountry
    roleId: $roleId
    roomType: $roomType
    taxesCurrency: $taxesCurrency
    taxesExtras: $taxesExtras
    ticketCurrency: $ticketCurrency
    ticketFare: $ticketFare
    totalTravelCost: $totalTravelCost
    totalTravelCurrency: $totalTravelCurrency
    transferCost: $transferCost
    transferCurrency: $transferCurrency
    transferDetails: $transferDetails
    transferRequired: $transferRequired
    visaRequired: $visaRequired
    visaSupport: $visaSupport
  ) {
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
      age
      attendedDate
      createdAt
      eventId
      id
      name
      participantId
      status
      updatedAt
      __typename
    }
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
}
` as GeneratedMutation<
  APITypes.CreateParticipantAsCollaboratorMutationVariables,
  APITypes.CreateParticipantAsCollaboratorMutation
>;
export const createPaymentMethodData = /* GraphQL */ `mutation CreatePaymentMethodData(
  $condition: ModelPaymentMethodDataConditionInput
  $input: CreatePaymentMethodDataInput!
) {
  createPaymentMethodData(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreatePaymentMethodDataMutationVariables,
  APITypes.CreatePaymentMethodDataMutation
>;
export const createPlanPurchase = /* GraphQL */ `mutation CreatePlanPurchase(
  $condition: ModelPlanPurchaseConditionInput
  $input: CreatePlanPurchaseInput!
) {
  createPlanPurchase(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreatePlanPurchaseMutationVariables,
  APITypes.CreatePlanPurchaseMutation
>;
export const createProcessedStripeEvent = /* GraphQL */ `mutation CreateProcessedStripeEvent(
  $condition: ModelProcessedStripeEventConditionInput
  $input: CreateProcessedStripeEventInput!
) {
  createProcessedStripeEvent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateProcessedStripeEventMutationVariables,
  APITypes.CreateProcessedStripeEventMutation
>;
export const createRole = /* GraphQL */ `mutation CreateRole(
  $condition: ModelRoleConditionInput
  $input: CreateRoleInput!
) {
  createRole(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateRoleMutationVariables,
  APITypes.CreateRoleMutation
>;
export const createScheduleEntry = /* GraphQL */ `mutation CreateScheduleEntry(
  $color: String
  $date: String!
  $description: String
  $endTime: String
  $eventId: String!
  $location: String
  $order: Int
  $participantIds: [String]
  $startTime: String
  $supplierId: String
  $title: String!
) {
  createScheduleEntry(
    color: $color
    date: $date
    description: $description
    endTime: $endTime
    eventId: $eventId
    location: $location
    order: $order
    participantIds: $participantIds
    startTime: $startTime
    supplierId: $supplierId
    title: $title
  ) {
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
` as GeneratedMutation<
  APITypes.CreateScheduleEntryMutationVariables,
  APITypes.CreateScheduleEntryMutation
>;
export const createSupplier = /* GraphQL */ `mutation CreateSupplier(
  $condition: ModelSupplierConditionInput
  $input: CreateSupplierInput!
) {
  createSupplier(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateSupplierMutationVariables,
  APITypes.CreateSupplierMutation
>;
export const createUserSubscription = /* GraphQL */ `mutation CreateUserSubscription(
  $condition: ModelUserSubscriptionConditionInput
  $input: CreateUserSubscriptionInput!
) {
  createUserSubscription(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateUserSubscriptionMutationVariables,
  APITypes.CreateUserSubscriptionMutation
>;
export const declineInvitation = /* GraphQL */ `mutation DeclineInvitation($invitationId: String!) {
  declineInvitation(invitationId: $invitationId) {
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
` as GeneratedMutation<
  APITypes.DeclineInvitationMutationVariables,
  APITypes.DeclineInvitationMutation
>;
export const deleteDependent = /* GraphQL */ `mutation DeleteDependent(
  $condition: ModelDependentConditionInput
  $input: DeleteDependentInput!
) {
  deleteDependent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteDependentMutationVariables,
  APITypes.DeleteDependentMutation
>;
export const deleteDependentCustom = /* GraphQL */ `mutation DeleteDependentCustom($id: String!) {
  deleteDependentCustom(id: $id) {
    message
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteDependentCustomMutationVariables,
  APITypes.DeleteDependentCustomMutation
>;
export const deleteDocumentFolder = /* GraphQL */ `mutation DeleteDocumentFolder(
  $condition: ModelDocumentFolderConditionInput
  $input: DeleteDocumentFolderInput!
) {
  deleteDocumentFolder(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteDocumentFolderMutationVariables,
  APITypes.DeleteDocumentFolderMutation
>;
export const deleteEmailLog = /* GraphQL */ `mutation DeleteEmailLog(
  $condition: ModelEmailLogConditionInput
  $input: DeleteEmailLogInput!
) {
  deleteEmailLog(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteEmailLogMutationVariables,
  APITypes.DeleteEmailLogMutation
>;
export const deleteEventCascade = /* GraphQL */ `mutation DeleteEventCascade($eventId: String!) {
  deleteEventCascade(eventId: $eventId) {
    deleted {
      collaborators
      dependents
      documentFolders
      emailLogs
      event
      eventSuppliers
      notionDocuments
      participants
      roles
      s3Objects
      scheduleEntries
      __typename
    }
    errors
    failed {
      collaborators
      dependents
      documentFolders
      emailLogs
      event
      eventSuppliers
      notionDocuments
      participants
      roles
      s3Objects
      scheduleEntries
      __typename
    }
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteEventCascadeMutationVariables,
  APITypes.DeleteEventCascadeMutation
>;
export const deleteEventFolder = /* GraphQL */ `mutation DeleteEventFolder($eventId: String!, $id: String!) {
  deleteEventFolder(eventId: $eventId, id: $id) {
    id
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteEventFolderMutationVariables,
  APITypes.DeleteEventFolderMutation
>;
export const deleteEventRoleValidated = /* GraphQL */ `mutation DeleteEventRoleValidated($eventId: String!, $roleId: String!) {
  deleteEventRoleValidated(eventId: $eventId, roleId: $roleId) {
    participantCount
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteEventRoleValidatedMutationVariables,
  APITypes.DeleteEventRoleValidatedMutation
>;
export const deleteEventSupplier = /* GraphQL */ `mutation DeleteEventSupplier(
  $condition: ModelEventSupplierConditionInput
  $input: DeleteEventSupplierInput!
) {
  deleteEventSupplier(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteEventSupplierMutationVariables,
  APITypes.DeleteEventSupplierMutation
>;
export const deleteFidelizeIntegration = /* GraphQL */ `mutation DeleteFidelizeIntegration(
  $condition: ModelFidelizeIntegrationConditionInput
  $input: DeleteFidelizeIntegrationInput!
) {
  deleteFidelizeIntegration(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteFidelizeIntegrationMutationVariables,
  APITypes.DeleteFidelizeIntegrationMutation
>;
export const deleteInvoice = /* GraphQL */ `mutation DeleteInvoice(
  $condition: ModelInvoiceConditionInput
  $input: DeleteInvoiceInput!
) {
  deleteInvoice(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteInvoiceMutationVariables,
  APITypes.DeleteInvoiceMutation
>;
export const deleteNotionDocument = /* GraphQL */ `mutation DeleteNotionDocument(
  $condition: ModelNotionDocumentConditionInput
  $input: DeleteNotionDocumentInput!
) {
  deleteNotionDocument(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteNotionDocumentMutationVariables,
  APITypes.DeleteNotionDocumentMutation
>;
export const deleteNotionIntegration = /* GraphQL */ `mutation DeleteNotionIntegration(
  $condition: ModelNotionIntegrationConditionInput
  $input: DeleteNotionIntegrationInput!
) {
  deleteNotionIntegration(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteNotionIntegrationMutationVariables,
  APITypes.DeleteNotionIntegrationMutation
>;
export const deleteParticipant = /* GraphQL */ `mutation DeleteParticipant(
  $condition: ModelParticipantConditionInput
  $input: DeleteParticipantInput!
) {
  deleteParticipant(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteParticipantMutationVariables,
  APITypes.DeleteParticipantMutation
>;
export const deleteParticipants = /* GraphQL */ `mutation DeleteParticipants($participantIds: [String]) {
  deleteParticipants(participantIds: $participantIds)
}
` as GeneratedMutation<
  APITypes.DeleteParticipantsMutationVariables,
  APITypes.DeleteParticipantsMutation
>;
export const deletePaymentMethodData = /* GraphQL */ `mutation DeletePaymentMethodData(
  $condition: ModelPaymentMethodDataConditionInput
  $input: DeletePaymentMethodDataInput!
) {
  deletePaymentMethodData(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeletePaymentMethodDataMutationVariables,
  APITypes.DeletePaymentMethodDataMutation
>;
export const deletePlanPurchase = /* GraphQL */ `mutation DeletePlanPurchase(
  $condition: ModelPlanPurchaseConditionInput
  $input: DeletePlanPurchaseInput!
) {
  deletePlanPurchase(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeletePlanPurchaseMutationVariables,
  APITypes.DeletePlanPurchaseMutation
>;
export const deleteProcessedStripeEvent = /* GraphQL */ `mutation DeleteProcessedStripeEvent(
  $condition: ModelProcessedStripeEventConditionInput
  $input: DeleteProcessedStripeEventInput!
) {
  deleteProcessedStripeEvent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteProcessedStripeEventMutationVariables,
  APITypes.DeleteProcessedStripeEventMutation
>;
export const deleteRole = /* GraphQL */ `mutation DeleteRole(
  $condition: ModelRoleConditionInput
  $input: DeleteRoleInput!
) {
  deleteRole(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteRoleMutationVariables,
  APITypes.DeleteRoleMutation
>;
export const deleteScheduleEntry = /* GraphQL */ `mutation DeleteScheduleEntry($eventId: String!, $id: String!) {
  deleteScheduleEntry(eventId: $eventId, id: $id) {
    id
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteScheduleEntryMutationVariables,
  APITypes.DeleteScheduleEntryMutation
>;
export const deleteSupplier = /* GraphQL */ `mutation DeleteSupplier(
  $condition: ModelSupplierConditionInput
  $input: DeleteSupplierInput!
) {
  deleteSupplier(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteSupplierMutationVariables,
  APITypes.DeleteSupplierMutation
>;
export const deleteSupplierCustom = /* GraphQL */ `mutation DeleteSupplierCustom($supplierId: String!) {
  deleteSupplierCustom(supplierId: $supplierId) {
    eventCount
    message
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteSupplierCustomMutationVariables,
  APITypes.DeleteSupplierCustomMutation
>;
export const deleteUserData = /* GraphQL */ `mutation DeleteUserData($sub: String) {
  deleteUserData(sub: $sub)
}
` as GeneratedMutation<
  APITypes.DeleteUserDataMutationVariables,
  APITypes.DeleteUserDataMutation
>;
export const deleteUserSubscription = /* GraphQL */ `mutation DeleteUserSubscription(
  $condition: ModelUserSubscriptionConditionInput
  $input: DeleteUserSubscriptionInput!
) {
  deleteUserSubscription(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteUserSubscriptionMutationVariables,
  APITypes.DeleteUserSubscriptionMutation
>;
export const exchangeNotionToken = /* GraphQL */ `mutation ExchangeNotionToken($code: String!, $redirectUri: String!) {
  exchangeNotionToken(code: $code, redirectUri: $redirectUri) {
    error
    success
    workspaceName
    __typename
  }
}
` as GeneratedMutation<
  APITypes.ExchangeNotionTokenMutationVariables,
  APITypes.ExchangeNotionTokenMutation
>;
export const handleStripeWebhook = /* GraphQL */ `mutation HandleStripeWebhook($body: String, $signature: String) {
  handleStripeWebhook(body: $body, signature: $signature) {
    eventType
    message
    planType
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.HandleStripeWebhookMutationVariables,
  APITypes.HandleStripeWebhookMutation
>;
export const importNormalizedEventSuppliers = /* GraphQL */ `mutation ImportNormalizedEventSuppliers($eventId: String!, $rows: String!) {
  importNormalizedEventSuppliers(eventId: $eventId, rows: $rows) {
    eventSuppliersCreated
    message
    reason
    rowsAlreadyLinkedOnEvent
    rowsDuplicatedInBatch
    success
    suppliersCreated
    suppliersDeduplicatedInBatch
    suppliersReused
    validationErrorCount
    __typename
  }
}
` as GeneratedMutation<
  APITypes.ImportNormalizedEventSuppliersMutationVariables,
  APITypes.ImportNormalizedEventSuppliersMutation
>;
export const importNormalizedParticipants = /* GraphQL */ `mutation ImportNormalizedParticipants(
  $eventId: String!
  $participants: String!
) {
  importNormalizedParticipants(eventId: $eventId, participants: $participants) {
    count
    details {
      dependentsCount
      eventId
      participantsCount
      skippedCount
      __typename
    }
    duplicates
    message
    skipped
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.ImportNormalizedParticipantsMutationVariables,
  APITypes.ImportNormalizedParticipantsMutation
>;
export const importNormalizedSuppliers = /* GraphQL */ `mutation ImportNormalizedSuppliers($rowOffset: Int, $suppliers: String!) {
  importNormalizedSuppliers(rowOffset: $rowOffset, suppliers: $suppliers) {
    duplicateCount
    message
    reason
    rowErrors {
      message
      row
      __typename
    }
    skippedCount
    success
    supplierCount
    validationErrorCount
    writeErrorCount
    __typename
  }
}
` as GeneratedMutation<
  APITypes.ImportNormalizedSuppliersMutationVariables,
  APITypes.ImportNormalizedSuppliersMutation
>;
export const importNotionPages = /* GraphQL */ `mutation ImportNotionPages(
  $eventId: String!
  $folderId: String!
  $pageIds: [String!]
) {
  importNotionPages(eventId: $eventId, folderId: $folderId, pageIds: $pageIds) {
    documents {
      id
      notionPageId
      title
      __typename
    }
    errors
    failed
    imported
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.ImportNotionPagesMutationVariables,
  APITypes.ImportNotionPagesMutation
>;
export const inviteCollaborator = /* GraphQL */ `mutation InviteCollaborator(
  $email: String!
  $eventId: String!
  $language: InviteCollaboratorLanguage
  $role: InviteCollaboratorRole
  $sharedFolderIds: [String]
  $sharedSupplierIds: [String]
) {
  inviteCollaborator(
    email: $email
    eventId: $eventId
    language: $language
    role: $role
    sharedFolderIds: $sharedFolderIds
    sharedSupplierIds: $sharedSupplierIds
  ) {
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
` as GeneratedMutation<
  APITypes.InviteCollaboratorMutationVariables,
  APITypes.InviteCollaboratorMutation
>;
export const processSupplierApproval = /* GraphQL */ `mutation ProcessSupplierApproval(
  $eventSupplierId: String!
  $quoteAmount: Float
) {
  processSupplierApproval(
    eventSupplierId: $eventSupplierId
    quoteAmount: $quoteAmount
  ) {
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
` as GeneratedMutation<
  APITypes.ProcessSupplierApprovalMutationVariables,
  APITypes.ProcessSupplierApprovalMutation
>;
export const processSupplierPayment = /* GraphQL */ `mutation ProcessSupplierPayment($eventSupplierId: String!) {
  processSupplierPayment(eventSupplierId: $eventSupplierId) {
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
` as GeneratedMutation<
  APITypes.ProcessSupplierPaymentMutationVariables,
  APITypes.ProcessSupplierPaymentMutation
>;
export const removeEventSupplier = /* GraphQL */ `mutation RemoveEventSupplier($eventSupplierId: String!) {
  removeEventSupplier(eventSupplierId: $eventSupplierId) {
    deletedEventSupplierId
    message
    __typename
  }
}
` as GeneratedMutation<
  APITypes.RemoveEventSupplierMutationVariables,
  APITypes.RemoveEventSupplierMutation
>;
export const revertEventSupplierApproval = /* GraphQL */ `mutation RevertEventSupplierApproval(
  $eventSupplierId: String!
  $newStatus: RevertEventSupplierApprovalNewStatus
) {
  revertEventSupplierApproval(
    eventSupplierId: $eventSupplierId
    newStatus: $newStatus
  ) {
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
` as GeneratedMutation<
  APITypes.RevertEventSupplierApprovalMutationVariables,
  APITypes.RevertEventSupplierApprovalMutation
>;
export const revokeCollaborator = /* GraphQL */ `mutation RevokeCollaborator($collaboratorId: String!) {
  revokeCollaborator(collaboratorId: $collaboratorId)
}
` as GeneratedMutation<
  APITypes.RevokeCollaboratorMutationVariables,
  APITypes.RevokeCollaboratorMutation
>;
export const saveDocumentEdit = /* GraphQL */ `mutation SaveDocumentEdit(
  $documentPath: String!
  $eventId: String!
  $folderId: String!
) {
  saveDocumentEdit(
    documentPath: $documentPath
    eventId: $eventId
    folderId: $folderId
  ) {
    expiresIn
    presignedUrl
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SaveDocumentEditMutationVariables,
  APITypes.SaveDocumentEditMutation
>;
export const saveFidelizeApiKey = /* GraphQL */ `mutation SaveFidelizeApiKey($apiKey: String!) {
  saveFidelizeApiKey(apiKey: $apiKey) {
    error
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SaveFidelizeApiKeyMutationVariables,
  APITypes.SaveFidelizeApiKeyMutation
>;
export const selectEventSupplier = /* GraphQL */ `mutation SelectEventSupplier(
  $eventId: String!
  $quoteAmount: Float
  $supplierId: String!
) {
  selectEventSupplier(
    eventId: $eventId
    quoteAmount: $quoteAmount
    supplierId: $supplierId
  ) {
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
` as GeneratedMutation<
  APITypes.SelectEventSupplierMutationVariables,
  APITypes.SelectEventSupplierMutation
>;
export const sendEmail = /* GraphQL */ `mutation SendEmail(
  $attachmentContent: String
  $attachmentContentType: String
  $attachmentFilename: String
  $confirmationLink: [String]
  $emailType: SendEmailEmailType
  $eventCategories: String
  $eventDate: String
  $eventDateType: String
  $eventEndDate: AWSDate
  $eventId: String
  $eventLocation: String
  $eventManager: String
  $eventManagerContact: String
  $eventManagerName: String
  $eventName: String
  $eventSpecificDates: [String]
  $eventStartDate: AWSDate
  $eventTime: String
  $eventTitle: String
  $eventType: String
  $language: SendEmailLanguage
  $participantId: [String]
  $participantName: [String]
  $to: [String]
) {
  sendEmail(
    attachmentContent: $attachmentContent
    attachmentContentType: $attachmentContentType
    attachmentFilename: $attachmentFilename
    confirmationLink: $confirmationLink
    emailType: $emailType
    eventCategories: $eventCategories
    eventDate: $eventDate
    eventDateType: $eventDateType
    eventEndDate: $eventEndDate
    eventId: $eventId
    eventLocation: $eventLocation
    eventManager: $eventManager
    eventManagerContact: $eventManagerContact
    eventManagerName: $eventManagerName
    eventName: $eventName
    eventSpecificDates: $eventSpecificDates
    eventStartDate: $eventStartDate
    eventTime: $eventTime
    eventTitle: $eventTitle
    eventType: $eventType
    language: $language
    participantId: $participantId
    participantName: $participantName
    to: $to
  ) {
    error
    message
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SendEmailMutationVariables,
  APITypes.SendEmailMutation
>;
export const syncFidelizeParticipants = /* GraphQL */ `mutation SyncFidelizeParticipants(
  $eventId: String!
  $page: Int
  $templateIds: [Int]
) {
  syncFidelizeParticipants(
    eventId: $eventId
    page: $page
    templateIds: $templateIds
  ) {
    created
    errors
    hasMore
    nextPage
    skipped
    success
    totalCards
    updated
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SyncFidelizeParticipantsMutationVariables,
  APITypes.SyncFidelizeParticipantsMutation
>;
export const syncMyDisplayName = /* GraphQL */ `mutation SyncMyDisplayName {
  syncMyDisplayName {
    updatedCollaborations
    updatedEvents
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SyncMyDisplayNameMutationVariables,
  APITypes.SyncMyDisplayNameMutation
>;
export const updateCollaboratorFolders = /* GraphQL */ `mutation UpdateCollaboratorFolders(
  $collaboratorId: String!
  $sharedFolderIds: [String]!
) {
  updateCollaboratorFolders(
    collaboratorId: $collaboratorId
    sharedFolderIds: $sharedFolderIds
  ) {
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
` as GeneratedMutation<
  APITypes.UpdateCollaboratorFoldersMutationVariables,
  APITypes.UpdateCollaboratorFoldersMutation
>;
export const updateCollaboratorRole = /* GraphQL */ `mutation UpdateCollaboratorRole($collaboratorId: String!, $newRole: String!) {
  updateCollaboratorRole(collaboratorId: $collaboratorId, newRole: $newRole) {
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
` as GeneratedMutation<
  APITypes.UpdateCollaboratorRoleMutationVariables,
  APITypes.UpdateCollaboratorRoleMutation
>;
export const updateCollaboratorScheduleAccess = /* GraphQL */ `mutation UpdateCollaboratorScheduleAccess(
  $canViewTeamSchedule: Boolean!
  $collaboratorId: String!
) {
  updateCollaboratorScheduleAccess(
    canViewTeamSchedule: $canViewTeamSchedule
    collaboratorId: $collaboratorId
  ) {
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
` as GeneratedMutation<
  APITypes.UpdateCollaboratorScheduleAccessMutationVariables,
  APITypes.UpdateCollaboratorScheduleAccessMutation
>;
export const updateCollaboratorSuppliers = /* GraphQL */ `mutation UpdateCollaboratorSuppliers(
  $collaboratorId: String!
  $sharedSupplierIds: [String]!
) {
  updateCollaboratorSuppliers(
    collaboratorId: $collaboratorId
    sharedSupplierIds: $sharedSupplierIds
  ) {
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
` as GeneratedMutation<
  APITypes.UpdateCollaboratorSuppliersMutationVariables,
  APITypes.UpdateCollaboratorSuppliersMutation
>;
export const updateDependent = /* GraphQL */ `mutation UpdateDependent(
  $condition: ModelDependentConditionInput
  $input: UpdateDependentInput!
) {
  updateDependent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateDependentMutationVariables,
  APITypes.UpdateDependentMutation
>;
export const updateDependentCustom = /* GraphQL */ `mutation UpdateDependentCustom($age: String, $id: String!, $name: String) {
  updateDependentCustom(age: $age, id: $id, name: $name) {
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
}
` as GeneratedMutation<
  APITypes.UpdateDependentCustomMutationVariables,
  APITypes.UpdateDependentCustomMutation
>;
export const updateDocumentFolder = /* GraphQL */ `mutation UpdateDocumentFolder(
  $condition: ModelDocumentFolderConditionInput
  $input: UpdateDocumentFolderInput!
) {
  updateDocumentFolder(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateDocumentFolderMutationVariables,
  APITypes.UpdateDocumentFolderMutation
>;
export const updateEmailLog = /* GraphQL */ `mutation UpdateEmailLog(
  $condition: ModelEmailLogConditionInput
  $input: UpdateEmailLogInput!
) {
  updateEmailLog(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateEmailLogMutationVariables,
  APITypes.UpdateEmailLogMutation
>;
export const updateEvent = /* GraphQL */ `mutation UpdateEvent(
  $budget: Float
  $categories: [String]
  $currency: String
  $description: String
  $eventDateType: String
  $eventEndDate: AWSDate
  $eventId: String!
  $eventLocation: String
  $eventManager: String
  $eventManagerEmail: String
  $eventManagerPhone: String
  $eventSpecificDates: [String]
  $eventStartDate: AWSDate
  $eventStatus: String
  $eventTime: AWSTime
  $eventTitle: String
  $eventType: String
) {
  updateEvent(
    budget: $budget
    categories: $categories
    currency: $currency
    description: $description
    eventDateType: $eventDateType
    eventEndDate: $eventEndDate
    eventId: $eventId
    eventLocation: $eventLocation
    eventManager: $eventManager
    eventManagerEmail: $eventManagerEmail
    eventManagerPhone: $eventManagerPhone
    eventSpecificDates: $eventSpecificDates
    eventStartDate: $eventStartDate
    eventStatus: $eventStatus
    eventTime: $eventTime
    eventTitle: $eventTitle
    eventType: $eventType
  ) {
    event
    message
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateEventMutationVariables,
  APITypes.UpdateEventMutation
>;
export const updateEventFolder = /* GraphQL */ `mutation UpdateEventFolder(
  $color: String
  $description: String
  $eventId: String!
  $id: String!
  $name: String
  $order: Int
) {
  updateEventFolder(
    color: $color
    description: $description
    eventId: $eventId
    id: $id
    name: $name
    order: $order
  ) {
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
}
` as GeneratedMutation<
  APITypes.UpdateEventFolderMutationVariables,
  APITypes.UpdateEventFolderMutation
>;
export const updateEventRole = /* GraphQL */ `mutation UpdateEventRole($eventId: String!, $name: String!, $roleId: String!) {
  updateEventRole(eventId: $eventId, name: $name, roleId: $roleId) {
    createdAt
    eventId
    id
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateEventRoleMutationVariables,
  APITypes.UpdateEventRoleMutation
>;
export const updateEventSupplier = /* GraphQL */ `mutation UpdateEventSupplier(
  $condition: ModelEventSupplierConditionInput
  $input: UpdateEventSupplierInput!
) {
  updateEventSupplier(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateEventSupplierMutationVariables,
  APITypes.UpdateEventSupplierMutation
>;
export const updateEventSupplierForRole = /* GraphQL */ `mutation UpdateEventSupplierForRole(
  $eventSupplierId: String!
  $invoiceS3Key: String
  $quoteAmount: Float
  $status: String
) {
  updateEventSupplierForRole(
    eventSupplierId: $eventSupplierId
    invoiceS3Key: $invoiceS3Key
    quoteAmount: $quoteAmount
    status: $status
  ) {
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
` as GeneratedMutation<
  APITypes.UpdateEventSupplierForRoleMutationVariables,
  APITypes.UpdateEventSupplierForRoleMutation
>;
export const updateFidelizeIntegration = /* GraphQL */ `mutation UpdateFidelizeIntegration(
  $condition: ModelFidelizeIntegrationConditionInput
  $input: UpdateFidelizeIntegrationInput!
) {
  updateFidelizeIntegration(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateFidelizeIntegrationMutationVariables,
  APITypes.UpdateFidelizeIntegrationMutation
>;
export const updateInvoice = /* GraphQL */ `mutation UpdateInvoice(
  $condition: ModelInvoiceConditionInput
  $input: UpdateInvoiceInput!
) {
  updateInvoice(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateInvoiceMutationVariables,
  APITypes.UpdateInvoiceMutation
>;
export const updateNotionDocument = /* GraphQL */ `mutation UpdateNotionDocument(
  $condition: ModelNotionDocumentConditionInput
  $input: UpdateNotionDocumentInput!
) {
  updateNotionDocument(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateNotionDocumentMutationVariables,
  APITypes.UpdateNotionDocumentMutation
>;
export const updateNotionIntegration = /* GraphQL */ `mutation UpdateNotionIntegration(
  $condition: ModelNotionIntegrationConditionInput
  $input: UpdateNotionIntegrationInput!
) {
  updateNotionIntegration(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateNotionIntegrationMutationVariables,
  APITypes.UpdateNotionIntegrationMutation
>;
export const updateParticipant = /* GraphQL */ `mutation UpdateParticipant(
  $condition: ModelParticipantConditionInput
  $input: UpdateParticipantInput!
) {
  updateParticipant(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateParticipantMutationVariables,
  APITypes.UpdateParticipantMutation
>;
export const updateParticipantAsCollaborator = /* GraphQL */ `mutation UpdateParticipantAsCollaborator(
  $accommodationCost: Float
  $arrivalAirport: String
  $arrivalDate: String
  $arrivalFlight: String
  $arrivalLayovers: String
  $arrivalTime: String
  $bookingAgency: String
  $bookingReference: String
  $checkInDate: String
  $checkOutDate: String
  $departureAirport: String
  $departureDate: String
  $departureFlight: String
  $departureTime: String
  $dietaryRestriction: String
  $documentLast4: String
  $documentationType: String
  $emergencyContact: String
  $eventId: String!
  $hotel: String
  $id: String!
  $internalId: String
  $nationality: String
  $nights: Int
  $organization: String
  $participantEmail: String
  $participantJob: String
  $participantName: String
  $participantNote: String
  $participantPhone: String
  $participantStatus: String
  $paymentStatus: String
  $photoUrl: String
  $protocol: String
  $rateCurrency: String
  $ratePerNight: Float
  $residenceCountry: String
  $roleId: String
  $roomType: String
  $taxesCurrency: String
  $taxesExtras: Float
  $ticketCurrency: String
  $ticketFare: Float
  $totalTravelCost: Float
  $totalTravelCurrency: String
  $transferCost: Float
  $transferCurrency: String
  $transferDetails: String
  $transferRequired: Boolean
  $visaRequired: Boolean
  $visaSupport: Boolean
) {
  updateParticipantAsCollaborator(
    accommodationCost: $accommodationCost
    arrivalAirport: $arrivalAirport
    arrivalDate: $arrivalDate
    arrivalFlight: $arrivalFlight
    arrivalLayovers: $arrivalLayovers
    arrivalTime: $arrivalTime
    bookingAgency: $bookingAgency
    bookingReference: $bookingReference
    checkInDate: $checkInDate
    checkOutDate: $checkOutDate
    departureAirport: $departureAirport
    departureDate: $departureDate
    departureFlight: $departureFlight
    departureTime: $departureTime
    dietaryRestriction: $dietaryRestriction
    documentLast4: $documentLast4
    documentationType: $documentationType
    emergencyContact: $emergencyContact
    eventId: $eventId
    hotel: $hotel
    id: $id
    internalId: $internalId
    nationality: $nationality
    nights: $nights
    organization: $organization
    participantEmail: $participantEmail
    participantJob: $participantJob
    participantName: $participantName
    participantNote: $participantNote
    participantPhone: $participantPhone
    participantStatus: $participantStatus
    paymentStatus: $paymentStatus
    photoUrl: $photoUrl
    protocol: $protocol
    rateCurrency: $rateCurrency
    ratePerNight: $ratePerNight
    residenceCountry: $residenceCountry
    roleId: $roleId
    roomType: $roomType
    taxesCurrency: $taxesCurrency
    taxesExtras: $taxesExtras
    ticketCurrency: $ticketCurrency
    ticketFare: $ticketFare
    totalTravelCost: $totalTravelCost
    totalTravelCurrency: $totalTravelCurrency
    transferCost: $transferCost
    transferCurrency: $transferCurrency
    transferDetails: $transferDetails
    transferRequired: $transferRequired
    visaRequired: $visaRequired
    visaSupport: $visaSupport
  ) {
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
      age
      attendedDate
      createdAt
      eventId
      id
      name
      participantId
      status
      updatedAt
      __typename
    }
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
}
` as GeneratedMutation<
  APITypes.UpdateParticipantAsCollaboratorMutationVariables,
  APITypes.UpdateParticipantAsCollaboratorMutation
>;
export const updatePaymentMethodData = /* GraphQL */ `mutation UpdatePaymentMethodData(
  $condition: ModelPaymentMethodDataConditionInput
  $input: UpdatePaymentMethodDataInput!
) {
  updatePaymentMethodData(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdatePaymentMethodDataMutationVariables,
  APITypes.UpdatePaymentMethodDataMutation
>;
export const updatePlanPurchase = /* GraphQL */ `mutation UpdatePlanPurchase(
  $condition: ModelPlanPurchaseConditionInput
  $input: UpdatePlanPurchaseInput!
) {
  updatePlanPurchase(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdatePlanPurchaseMutationVariables,
  APITypes.UpdatePlanPurchaseMutation
>;
export const updateProcessedStripeEvent = /* GraphQL */ `mutation UpdateProcessedStripeEvent(
  $condition: ModelProcessedStripeEventConditionInput
  $input: UpdateProcessedStripeEventInput!
) {
  updateProcessedStripeEvent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateProcessedStripeEventMutationVariables,
  APITypes.UpdateProcessedStripeEventMutation
>;
export const updateRole = /* GraphQL */ `mutation UpdateRole(
  $condition: ModelRoleConditionInput
  $input: UpdateRoleInput!
) {
  updateRole(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateRoleMutationVariables,
  APITypes.UpdateRoleMutation
>;
export const updateScheduleEntry = /* GraphQL */ `mutation UpdateScheduleEntry(
  $color: String
  $date: String
  $description: String
  $endTime: String
  $eventId: String!
  $id: String!
  $location: String
  $order: Int
  $participantIds: [String]
  $startTime: String
  $supplierId: String
  $title: String
) {
  updateScheduleEntry(
    color: $color
    date: $date
    description: $description
    endTime: $endTime
    eventId: $eventId
    id: $id
    location: $location
    order: $order
    participantIds: $participantIds
    startTime: $startTime
    supplierId: $supplierId
    title: $title
  ) {
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
` as GeneratedMutation<
  APITypes.UpdateScheduleEntryMutationVariables,
  APITypes.UpdateScheduleEntryMutation
>;
export const updateSupplier = /* GraphQL */ `mutation UpdateSupplier(
  $condition: ModelSupplierConditionInput
  $input: UpdateSupplierInput!
) {
  updateSupplier(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateSupplierMutationVariables,
  APITypes.UpdateSupplierMutation
>;
export const updateUserSubscription = /* GraphQL */ `mutation UpdateUserSubscription(
  $condition: ModelUserSubscriptionConditionInput
  $input: UpdateUserSubscriptionInput!
) {
  updateUserSubscription(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateUserSubscriptionMutationVariables,
  APITypes.UpdateUserSubscriptionMutation
>;
export const uploadParticipants = /* GraphQL */ `mutation UploadParticipants($eventId: String, $file: String) {
  uploadParticipants(eventId: $eventId, file: $file) {
    count
    details {
      dependentsCount
      eventId
      participantsCount
      skippedCount
      __typename
    }
    duplicates
    message
    skipped
    success
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UploadParticipantsMutationVariables,
  APITypes.UploadParticipantsMutation
>;
export const uploadSupplier = /* GraphQL */ `mutation UploadSupplier($file: String!) {
  uploadSupplier(file: $file) {
    duplicateCount
    message
    reason
    rowErrors {
      message
      row
      __typename
    }
    skippedCount
    success
    supplierCount
    validationErrorCount
    writeErrorCount
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UploadSupplierMutationVariables,
  APITypes.UploadSupplierMutation
>;
