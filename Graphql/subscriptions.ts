/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateDependent = /* GraphQL */ `subscription OnCreateDependent(
  $filter: ModelSubscriptionDependentFilterInput
  $owner: String
) {
  onCreateDependent(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateDependentSubscriptionVariables,
  APITypes.OnCreateDependentSubscription
>;
export const onCreateDocumentFolder = /* GraphQL */ `subscription OnCreateDocumentFolder(
  $filter: ModelSubscriptionDocumentFolderFilterInput
  $owner: String
) {
  onCreateDocumentFolder(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateDocumentFolderSubscriptionVariables,
  APITypes.OnCreateDocumentFolderSubscription
>;
export const onCreateEmailLog = /* GraphQL */ `subscription OnCreateEmailLog(
  $filter: ModelSubscriptionEmailLogFilterInput
  $owner: String
) {
  onCreateEmailLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateEmailLogSubscriptionVariables,
  APITypes.OnCreateEmailLogSubscription
>;
export const onCreateEventSupplier = /* GraphQL */ `subscription OnCreateEventSupplier(
  $filter: ModelSubscriptionEventSupplierFilterInput
  $owner: String
) {
  onCreateEventSupplier(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateEventSupplierSubscriptionVariables,
  APITypes.OnCreateEventSupplierSubscription
>;
export const onCreateFidelizeIntegration = /* GraphQL */ `subscription OnCreateFidelizeIntegration(
  $filter: ModelSubscriptionFidelizeIntegrationFilterInput
  $owner: String
) {
  onCreateFidelizeIntegration(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateFidelizeIntegrationSubscriptionVariables,
  APITypes.OnCreateFidelizeIntegrationSubscription
>;
export const onCreateInvoice = /* GraphQL */ `subscription OnCreateInvoice(
  $filter: ModelSubscriptionInvoiceFilterInput
  $owner: String
) {
  onCreateInvoice(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateInvoiceSubscriptionVariables,
  APITypes.OnCreateInvoiceSubscription
>;
export const onCreateNotionDocument = /* GraphQL */ `subscription OnCreateNotionDocument(
  $filter: ModelSubscriptionNotionDocumentFilterInput
  $owner: String
) {
  onCreateNotionDocument(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateNotionDocumentSubscriptionVariables,
  APITypes.OnCreateNotionDocumentSubscription
>;
export const onCreateNotionIntegration = /* GraphQL */ `subscription OnCreateNotionIntegration(
  $filter: ModelSubscriptionNotionIntegrationFilterInput
  $owner: String
) {
  onCreateNotionIntegration(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateNotionIntegrationSubscriptionVariables,
  APITypes.OnCreateNotionIntegrationSubscription
>;
export const onCreateParticipant = /* GraphQL */ `subscription OnCreateParticipant(
  $filter: ModelSubscriptionParticipantFilterInput
  $owner: String
) {
  onCreateParticipant(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateParticipantSubscriptionVariables,
  APITypes.OnCreateParticipantSubscription
>;
export const onCreatePaymentMethodData = /* GraphQL */ `subscription OnCreatePaymentMethodData(
  $filter: ModelSubscriptionPaymentMethodDataFilterInput
  $owner: String
) {
  onCreatePaymentMethodData(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreatePaymentMethodDataSubscriptionVariables,
  APITypes.OnCreatePaymentMethodDataSubscription
>;
export const onCreatePlanPurchase = /* GraphQL */ `subscription OnCreatePlanPurchase(
  $filter: ModelSubscriptionPlanPurchaseFilterInput
  $owner: String
) {
  onCreatePlanPurchase(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreatePlanPurchaseSubscriptionVariables,
  APITypes.OnCreatePlanPurchaseSubscription
>;
export const onCreateProcessedStripeEvent = /* GraphQL */ `subscription OnCreateProcessedStripeEvent(
  $filter: ModelSubscriptionProcessedStripeEventFilterInput
) {
  onCreateProcessedStripeEvent(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateProcessedStripeEventSubscriptionVariables,
  APITypes.OnCreateProcessedStripeEventSubscription
>;
export const onCreateRole = /* GraphQL */ `subscription OnCreateRole(
  $filter: ModelSubscriptionRoleFilterInput
  $owner: String
) {
  onCreateRole(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateRoleSubscriptionVariables,
  APITypes.OnCreateRoleSubscription
>;
export const onCreateSupplier = /* GraphQL */ `subscription OnCreateSupplier(
  $filter: ModelSubscriptionSupplierFilterInput
  $owner: String
) {
  onCreateSupplier(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateSupplierSubscriptionVariables,
  APITypes.OnCreateSupplierSubscription
>;
export const onCreateUserSubscription = /* GraphQL */ `subscription OnCreateUserSubscription(
  $filter: ModelSubscriptionUserSubscriptionFilterInput
  $owner: String
) {
  onCreateUserSubscription(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUserSubscriptionSubscriptionVariables,
  APITypes.OnCreateUserSubscriptionSubscription
>;
export const onDeleteDependent = /* GraphQL */ `subscription OnDeleteDependent(
  $filter: ModelSubscriptionDependentFilterInput
  $owner: String
) {
  onDeleteDependent(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteDependentSubscriptionVariables,
  APITypes.OnDeleteDependentSubscription
>;
export const onDeleteDocumentFolder = /* GraphQL */ `subscription OnDeleteDocumentFolder(
  $filter: ModelSubscriptionDocumentFolderFilterInput
  $owner: String
) {
  onDeleteDocumentFolder(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteDocumentFolderSubscriptionVariables,
  APITypes.OnDeleteDocumentFolderSubscription
>;
export const onDeleteEmailLog = /* GraphQL */ `subscription OnDeleteEmailLog(
  $filter: ModelSubscriptionEmailLogFilterInput
  $owner: String
) {
  onDeleteEmailLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteEmailLogSubscriptionVariables,
  APITypes.OnDeleteEmailLogSubscription
>;
export const onDeleteEventSupplier = /* GraphQL */ `subscription OnDeleteEventSupplier(
  $filter: ModelSubscriptionEventSupplierFilterInput
  $owner: String
) {
  onDeleteEventSupplier(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteEventSupplierSubscriptionVariables,
  APITypes.OnDeleteEventSupplierSubscription
>;
export const onDeleteFidelizeIntegration = /* GraphQL */ `subscription OnDeleteFidelizeIntegration(
  $filter: ModelSubscriptionFidelizeIntegrationFilterInput
  $owner: String
) {
  onDeleteFidelizeIntegration(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteFidelizeIntegrationSubscriptionVariables,
  APITypes.OnDeleteFidelizeIntegrationSubscription
>;
export const onDeleteInvoice = /* GraphQL */ `subscription OnDeleteInvoice(
  $filter: ModelSubscriptionInvoiceFilterInput
  $owner: String
) {
  onDeleteInvoice(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteInvoiceSubscriptionVariables,
  APITypes.OnDeleteInvoiceSubscription
>;
export const onDeleteNotionDocument = /* GraphQL */ `subscription OnDeleteNotionDocument(
  $filter: ModelSubscriptionNotionDocumentFilterInput
  $owner: String
) {
  onDeleteNotionDocument(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteNotionDocumentSubscriptionVariables,
  APITypes.OnDeleteNotionDocumentSubscription
>;
export const onDeleteNotionIntegration = /* GraphQL */ `subscription OnDeleteNotionIntegration(
  $filter: ModelSubscriptionNotionIntegrationFilterInput
  $owner: String
) {
  onDeleteNotionIntegration(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteNotionIntegrationSubscriptionVariables,
  APITypes.OnDeleteNotionIntegrationSubscription
>;
export const onDeleteParticipant = /* GraphQL */ `subscription OnDeleteParticipant(
  $filter: ModelSubscriptionParticipantFilterInput
  $owner: String
) {
  onDeleteParticipant(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteParticipantSubscriptionVariables,
  APITypes.OnDeleteParticipantSubscription
>;
export const onDeletePaymentMethodData = /* GraphQL */ `subscription OnDeletePaymentMethodData(
  $filter: ModelSubscriptionPaymentMethodDataFilterInput
  $owner: String
) {
  onDeletePaymentMethodData(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeletePaymentMethodDataSubscriptionVariables,
  APITypes.OnDeletePaymentMethodDataSubscription
>;
export const onDeletePlanPurchase = /* GraphQL */ `subscription OnDeletePlanPurchase(
  $filter: ModelSubscriptionPlanPurchaseFilterInput
  $owner: String
) {
  onDeletePlanPurchase(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeletePlanPurchaseSubscriptionVariables,
  APITypes.OnDeletePlanPurchaseSubscription
>;
export const onDeleteProcessedStripeEvent = /* GraphQL */ `subscription OnDeleteProcessedStripeEvent(
  $filter: ModelSubscriptionProcessedStripeEventFilterInput
) {
  onDeleteProcessedStripeEvent(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteProcessedStripeEventSubscriptionVariables,
  APITypes.OnDeleteProcessedStripeEventSubscription
>;
export const onDeleteRole = /* GraphQL */ `subscription OnDeleteRole(
  $filter: ModelSubscriptionRoleFilterInput
  $owner: String
) {
  onDeleteRole(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteRoleSubscriptionVariables,
  APITypes.OnDeleteRoleSubscription
>;
export const onDeleteSupplier = /* GraphQL */ `subscription OnDeleteSupplier(
  $filter: ModelSubscriptionSupplierFilterInput
  $owner: String
) {
  onDeleteSupplier(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteSupplierSubscriptionVariables,
  APITypes.OnDeleteSupplierSubscription
>;
export const onDeleteUserSubscription = /* GraphQL */ `subscription OnDeleteUserSubscription(
  $filter: ModelSubscriptionUserSubscriptionFilterInput
  $owner: String
) {
  onDeleteUserSubscription(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUserSubscriptionSubscriptionVariables,
  APITypes.OnDeleteUserSubscriptionSubscription
>;
export const onUpdateDependent = /* GraphQL */ `subscription OnUpdateDependent(
  $filter: ModelSubscriptionDependentFilterInput
  $owner: String
) {
  onUpdateDependent(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateDependentSubscriptionVariables,
  APITypes.OnUpdateDependentSubscription
>;
export const onUpdateDocumentFolder = /* GraphQL */ `subscription OnUpdateDocumentFolder(
  $filter: ModelSubscriptionDocumentFolderFilterInput
  $owner: String
) {
  onUpdateDocumentFolder(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateDocumentFolderSubscriptionVariables,
  APITypes.OnUpdateDocumentFolderSubscription
>;
export const onUpdateEmailLog = /* GraphQL */ `subscription OnUpdateEmailLog(
  $filter: ModelSubscriptionEmailLogFilterInput
  $owner: String
) {
  onUpdateEmailLog(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateEmailLogSubscriptionVariables,
  APITypes.OnUpdateEmailLogSubscription
>;
export const onUpdateEventSupplier = /* GraphQL */ `subscription OnUpdateEventSupplier(
  $filter: ModelSubscriptionEventSupplierFilterInput
  $owner: String
) {
  onUpdateEventSupplier(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateEventSupplierSubscriptionVariables,
  APITypes.OnUpdateEventSupplierSubscription
>;
export const onUpdateFidelizeIntegration = /* GraphQL */ `subscription OnUpdateFidelizeIntegration(
  $filter: ModelSubscriptionFidelizeIntegrationFilterInput
  $owner: String
) {
  onUpdateFidelizeIntegration(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateFidelizeIntegrationSubscriptionVariables,
  APITypes.OnUpdateFidelizeIntegrationSubscription
>;
export const onUpdateInvoice = /* GraphQL */ `subscription OnUpdateInvoice(
  $filter: ModelSubscriptionInvoiceFilterInput
  $owner: String
) {
  onUpdateInvoice(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateInvoiceSubscriptionVariables,
  APITypes.OnUpdateInvoiceSubscription
>;
export const onUpdateNotionDocument = /* GraphQL */ `subscription OnUpdateNotionDocument(
  $filter: ModelSubscriptionNotionDocumentFilterInput
  $owner: String
) {
  onUpdateNotionDocument(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateNotionDocumentSubscriptionVariables,
  APITypes.OnUpdateNotionDocumentSubscription
>;
export const onUpdateNotionIntegration = /* GraphQL */ `subscription OnUpdateNotionIntegration(
  $filter: ModelSubscriptionNotionIntegrationFilterInput
  $owner: String
) {
  onUpdateNotionIntegration(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateNotionIntegrationSubscriptionVariables,
  APITypes.OnUpdateNotionIntegrationSubscription
>;
export const onUpdateParticipant = /* GraphQL */ `subscription OnUpdateParticipant(
  $filter: ModelSubscriptionParticipantFilterInput
  $owner: String
) {
  onUpdateParticipant(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateParticipantSubscriptionVariables,
  APITypes.OnUpdateParticipantSubscription
>;
export const onUpdatePaymentMethodData = /* GraphQL */ `subscription OnUpdatePaymentMethodData(
  $filter: ModelSubscriptionPaymentMethodDataFilterInput
  $owner: String
) {
  onUpdatePaymentMethodData(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdatePaymentMethodDataSubscriptionVariables,
  APITypes.OnUpdatePaymentMethodDataSubscription
>;
export const onUpdatePlanPurchase = /* GraphQL */ `subscription OnUpdatePlanPurchase(
  $filter: ModelSubscriptionPlanPurchaseFilterInput
  $owner: String
) {
  onUpdatePlanPurchase(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdatePlanPurchaseSubscriptionVariables,
  APITypes.OnUpdatePlanPurchaseSubscription
>;
export const onUpdateProcessedStripeEvent = /* GraphQL */ `subscription OnUpdateProcessedStripeEvent(
  $filter: ModelSubscriptionProcessedStripeEventFilterInput
) {
  onUpdateProcessedStripeEvent(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateProcessedStripeEventSubscriptionVariables,
  APITypes.OnUpdateProcessedStripeEventSubscription
>;
export const onUpdateRole = /* GraphQL */ `subscription OnUpdateRole(
  $filter: ModelSubscriptionRoleFilterInput
  $owner: String
) {
  onUpdateRole(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateRoleSubscriptionVariables,
  APITypes.OnUpdateRoleSubscription
>;
export const onUpdateSupplier = /* GraphQL */ `subscription OnUpdateSupplier(
  $filter: ModelSubscriptionSupplierFilterInput
  $owner: String
) {
  onUpdateSupplier(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateSupplierSubscriptionVariables,
  APITypes.OnUpdateSupplierSubscription
>;
export const onUpdateUserSubscription = /* GraphQL */ `subscription OnUpdateUserSubscription(
  $filter: ModelSubscriptionUserSubscriptionFilterInput
  $owner: String
) {
  onUpdateUserSubscription(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUserSubscriptionSubscriptionVariables,
  APITypes.OnUpdateUserSubscriptionSubscription
>;
