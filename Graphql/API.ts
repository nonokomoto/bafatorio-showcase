/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CheckNotionUpdatesResult = {
  __typename: "CheckNotionUpdatesResult",
  error?: string | null,
  outdated?: number | null,
  total?: number | null,
  updates?:  Array<NotionUpdateItem | null > | null,
};

export type NotionUpdateItem = {
  __typename: "NotionUpdateItem",
  id: string,
  notionLastEditedAt?: string | null,
  notionPageId: string,
  s3Key: string,
  storedLastEditedAt?: string | null,
  title: string,
};

export type AccountAccessResult = {
  __typename: "AccountAccessResult",
  canCreateEvent?: boolean | null,
  planKey?: string | null,
  reason?: string | null,
};

export type Dependent = {
  __typename: "Dependent",
  age?: DependentAge | null,
  attendedDate?: string | null,
  createdAt: string,
  eventId?: string | null,
  id: string,
  name?: string | null,
  owner?: string | null,
  participant?: Participant | null,
  participantId?: string | null,
  status?: DependentStatus | null,
  updatedAt: string,
};

export enum DependentAge {
  adult = "adult",
  baby = "baby",
  child = "child",
}


export type Participant = {
  __typename: "Participant",
  accommodationCost?: number | null,
  arrivalAirport?: string | null,
  arrivalDate?: string | null,
  arrivalFlight?: string | null,
  arrivalLayovers?: string | null,
  arrivalTime?: string | null,
  attendedDate?: string | null,
  bookingAgency?: string | null,
  bookingReference?: string | null,
  checkInDate?: string | null,
  checkOutDate?: string | null,
  confirmationDate?: string | null,
  createdAt: string,
  departureAirport?: string | null,
  departureDate?: string | null,
  departureFlight?: string | null,
  departureTime?: string | null,
  dependents?: ModelDependentConnection | null,
  dependentsCount?: number | null,
  dietaryRestriction?: string | null,
  documentLast4?: string | null,
  documentationType?: string | null,
  emergencyContact?: string | null,
  event?: Event | null,
  eventId: string,
  hotel?: string | null,
  id: string,
  internalId?: string | null,
  nationality?: string | null,
  nights?: number | null,
  organization?: string | null,
  owner?: string | null,
  participantEmail?: string | null,
  participantJob?: string | null,
  participantName: string,
  participantNote?: string | null,
  participantPhone?: string | null,
  participantStatus?: ParticipantParticipantStatus | null,
  paymentStatus?: ParticipantPaymentStatus | null,
  photoUrl?: string | null,
  protocol?: string | null,
  rateCurrency?: string | null,
  ratePerNight?: number | null,
  registrationDate?: string | null,
  residenceCountry?: string | null,
  role?: Role | null,
  roleId?: string | null,
  roomType?: string | null,
  taxesCurrency?: string | null,
  taxesExtras?: number | null,
  ticketCurrency?: string | null,
  ticketFare?: number | null,
  totalTravelCost?: number | null,
  totalTravelCurrency?: string | null,
  transferCost?: number | null,
  transferCurrency?: string | null,
  transferDetails?: string | null,
  transferRequired?: boolean | null,
  updatedAt: string,
  visaRequired?: boolean | null,
  visaSupport?: boolean | null,
};

export type ModelDependentConnection = {
  __typename: "ModelDependentConnection",
  items:  Array<Dependent | null >,
  nextToken?: string | null,
};

export type Event = {
  __typename: "Event",
  budget?: number | null,
  categories?: Array< string | null > | null,
  collaborators?: ModelEventCollaboratorConnection | null,
  committedExpenses?: number | null,
  createdAt: string,
  currency?: string | null,
  dependentCount?: number | null,
  description?: string | null,
  documentFolders?: ModelDocumentFolderConnection | null,
  effectiveExpenses?: number | null,
  eventCreationDate?: string | null,
  eventDateType?: EventEventDateType | null,
  eventEndDate?: string | null,
  eventLocation?: string | null,
  eventManager?: string | null,
  eventManagerEmail?: string | null,
  eventManagerPhone?: string | null,
  eventSpecificDates?: Array< string | null > | null,
  eventStartDate?: string | null,
  eventStatus?: string | null,
  eventTime?: string | null,
  eventTitle?: string | null,
  eventType?: string | null,
  id: string,
  organizerId?: string | null,
  owner?: string | null,
  ownerEmail?: string | null,
  ownerName?: string | null,
  participantCount?: number | null,
  participantLimit?: number | null,
  participants?: ModelParticipantConnection | null,
  planKey?: string | null,
  roles?: ModelRoleConnection | null,
  suppliers?: ModelEventSupplierConnection | null,
  totalRegistrations?: number | null,
  updatedAt: string,
};

export type ModelEventCollaboratorConnection = {
  __typename: "ModelEventCollaboratorConnection",
  items:  Array<EventCollaborator | null >,
  nextToken?: string | null,
};

export type EventCollaborator = {
  __typename: "EventCollaborator",
  acceptedAt?: string | null,
  canViewTeamSchedule?: boolean | null,
  createdAt?: string | null,
  event?: Event | null,
  eventId: string,
  id: string,
  invitedAt: string,
  invitedBy: string,
  owner?: string | null,
  role?: EventCollaboratorRole | null,
  sharedFolderIds?: Array< string | null > | null,
  sharedSupplierIds?: Array< string | null > | null,
  status?: EventCollaboratorStatus | null,
  updatedAt?: string | null,
  userEmail: string,
  userId?: string | null,
  userName?: string | null,
};

export enum EventCollaboratorRole {
  CO_MANAGER = "CO_MANAGER",
  STAFF_CHECKIN = "STAFF_CHECKIN",
  STAFF_LOGISTICS = "STAFF_LOGISTICS",
}


export enum EventCollaboratorStatus {
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  PENDING = "PENDING",
}


export type ModelDocumentFolderConnection = {
  __typename: "ModelDocumentFolderConnection",
  items:  Array<DocumentFolder | null >,
  nextToken?: string | null,
};

export type DocumentFolder = {
  __typename: "DocumentFolder",
  color?: string | null,
  createdAt?: string | null,
  description?: string | null,
  event?: Event | null,
  eventId: string,
  icon?: string | null,
  id: string,
  isDefault?: boolean | null,
  name: string,
  order?: number | null,
  owner?: string | null,
  parentFolderId?: string | null,
  updatedAt?: string | null,
};

export enum EventEventDateType {
  range = "range",
  specific = "specific",
}


export type ModelParticipantConnection = {
  __typename: "ModelParticipantConnection",
  items:  Array<Participant | null >,
  nextToken?: string | null,
};

export type ModelRoleConnection = {
  __typename: "ModelRoleConnection",
  items:  Array<Role | null >,
  nextToken?: string | null,
};

export type Role = {
  __typename: "Role",
  archived?: boolean | null,
  createdAt: string,
  event?: Event | null,
  eventId: string,
  id: string,
  name: string,
  owner?: string | null,
  participants?: ModelParticipantConnection | null,
  updatedAt: string,
};

export type ModelEventSupplierConnection = {
  __typename: "ModelEventSupplierConnection",
  items:  Array<EventSupplier | null >,
  nextToken?: string | null,
};

export type EventSupplier = {
  __typename: "EventSupplier",
  approvalStatus?: EventSupplierApprovalStatus | null,
  approvedAt?: string | null,
  approvedBy?: string | null,
  createdAt: string,
  currency?: string | null,
  description?: string | null,
  event?: Event | null,
  eventId: string,
  externalRef?: string | null,
  id: string,
  invoiceS3Key?: string | null,
  owner?: string | null,
  paidAt?: string | null,
  quoteAmount?: number | null,
  rejectionReason?: string | null,
  requestedBy?: string | null,
  status?: EventSupplierStatus | null,
  supplier?: Supplier | null,
  supplierId: string,
  updatedAt: string,
};

export enum EventSupplierApprovalStatus {
  APPROVED = "APPROVED",
  DIRECT = "DIRECT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  REJECTED = "REJECTED",
}


export enum EventSupplierStatus {
  APPROVED = "APPROVED",
  PAID = "PAID",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
}


export type Supplier = {
  __typename: "Supplier",
  address?: string | null,
  category?: string | null,
  contactEmail?: string | null,
  contactName?: string | null,
  contactPhone?: string | null,
  country?: string | null,
  createdAt: string,
  currency?: string | null,
  estimateMaxAmount?: number | null,
  estimateMinAmount?: number | null,
  estimateUnit?: SupplierEstimateUnit | null,
  eventSuppliers?: ModelEventSupplierConnection | null,
  id: string,
  name: string,
  notes?: string | null,
  owner?: string | null,
  paymentDetails?: string | null,
  tags?: Array< string | null > | null,
  updatedAt: string,
  vatNumber?: string | null,
  website?: string | null,
};

export enum SupplierEstimateUnit {
  FIXED = "FIXED",
  PER_DAY = "PER_DAY",
  PER_EVENT = "PER_EVENT",
  PER_GUEST = "PER_GUEST",
  PER_HOUR = "PER_HOUR",
  PER_ITEM = "PER_ITEM",
}


export enum ParticipantParticipantStatus {
  ATTENDED = "ATTENDED",
  CANCELLED = "CANCELLED",
  CONFIRMED = "CONFIRMED",
  REGISTERED = "REGISTERED",
}


export enum ParticipantPaymentStatus {
  PAID = "PAID",
  PARTIAL = "PARTIAL",
  PENDING = "PENDING",
}


export enum DependentStatus {
  ATTENDED = "ATTENDED",
  NOT_ATTENDED = "NOT_ATTENDED",
  REGISTERED = "REGISTERED",
}


export type EmailLog = {
  __typename: "EmailLog",
  attempts?: number | null,
  createdAt?: string | null,
  deliveredAt?: string | null,
  emailType?: EmailLogEmailType | null,
  errorMessage?: string | null,
  eventId?: string | null,
  id: string,
  language?: EmailLogLanguage | null,
  lastAttemptAt?: string | null,
  messageId?: string | null,
  owner?: string | null,
  participantId?: string | null,
  sentAt?: string | null,
  status?: EmailLogStatus | null,
  templateName?: string | null,
  updatedAt?: string | null,
};

export enum EmailLogEmailType {
  eventCreation = "eventCreation",
  eventReminder = "eventReminder",
  eventUpdate = "eventUpdate",
  loginAlert = "loginAlert",
  participantConfirmation = "participantConfirmation",
  participantInvitation = "participantInvitation",
  saveTheDate = "saveTheDate",
  welcome = "welcome",
}


export enum EmailLogLanguage {
  en = "en",
  fr = "fr",
  pt = "pt",
}


export enum EmailLogStatus {
  BOUNCED = "BOUNCED",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  QUEUED = "QUEUED",
  SENT = "SENT",
}


export type GetEventAsCollaboratorResult = {
  __typename: "GetEventAsCollaboratorResult",
  access?: EventAccessData | null,
  canViewTeamSchedule?: boolean | null,
  event?: EventData | null,
  sharedFolderIds?: Array< string | null > | null,
  sharedSupplierIds?: Array< string | null > | null,
  userRole?: string | null,
};

export type EventAccessData = {
  __typename: "EventAccessData",
  participantLimit?: number | null,
  planKey?: string | null,
  reason?: string | null,
  writable?: boolean | null,
};

export type EventData = {
  __typename: "EventData",
  budget?: number | null,
  categories?: Array< string | null > | null,
  committedExpenses?: number | null,
  createdAt?: string | null,
  currency?: string | null,
  dependentCount?: number | null,
  description?: string | null,
  effectiveExpenses?: number | null,
  eventCreationDate?: string | null,
  eventDateType?: string | null,
  eventEndDate?: string | null,
  eventLocation?: string | null,
  eventManager?: string | null,
  eventManagerEmail?: string | null,
  eventManagerPhone?: string | null,
  eventSpecificDates?: Array< string | null > | null,
  eventStartDate?: string | null,
  eventStatus?: string | null,
  eventTime?: string | null,
  eventTitle?: string | null,
  eventType?: string | null,
  id: string,
  organizerId?: string | null,
  owner?: string | null,
  participantCount?: number | null,
  planKey?: string | null,
  totalRegistrations?: number | null,
  updatedAt?: string | null,
};

export type GetEventCollaboratorsReturnType = {
  __typename: "GetEventCollaboratorsReturnType",
  items?:  Array<CollaborationData | null > | null,
};

export type CollaborationData = {
  __typename: "CollaborationData",
  acceptedAt?: string | null,
  canViewTeamSchedule?: boolean | null,
  createdAt?: string | null,
  eventId: string,
  id: string,
  invitedAt: string,
  invitedBy: string,
  role: string,
  sharedFolderIds?: Array< string | null > | null,
  sharedSupplierIds?: Array< string | null > | null,
  status: string,
  updatedAt?: string | null,
  userEmail: string,
  userId?: string | null,
  userName?: string | null,
};

export type GetEventFoldersReturnType = {
  __typename: "GetEventFoldersReturnType",
  items?:  Array<DocumentFolderData | null > | null,
};

export type DocumentFolderData = {
  __typename: "DocumentFolderData",
  color?: string | null,
  createdAt?: string | null,
  description?: string | null,
  eventId: string,
  icon?: string | null,
  id: string,
  isDefault?: boolean | null,
  name: string,
  order?: number | null,
  owner: string,
  parentFolderId?: string | null,
  updatedAt?: string | null,
};

export type GetEventRolesReturnType = {
  __typename: "GetEventRolesReturnType",
  items?:  Array<RoleData | null > | null,
};

export type RoleData = {
  __typename: "RoleData",
  createdAt?: string | null,
  eventId: string,
  id: string,
  name: string,
  owner?: string | null,
  updatedAt?: string | null,
};

export type EventScheduleEntry = {
  __typename: "EventScheduleEntry",
  color?: string | null,
  createdAt?: string | null,
  date: string,
  description?: string | null,
  endTime?: string | null,
  eventId: string,
  id: string,
  location?: string | null,
  order?: number | null,
  owner?: string | null,
  participantIds?: Array< string | null > | null,
  startTime?: string | null,
  supplierId?: string | null,
  title: string,
  updatedAt?: string | null,
};

export type FidelizeIntegration = {
  __typename: "FidelizeIntegration",
  apiKey: string,
  createdAt?: string | null,
  id: string,
  isActive?: boolean | null,
  lastSyncAt?: string | null,
  owner?: string | null,
  updatedAt?: string | null,
};

export type Invoice = {
  __typename: "Invoice",
  amount?: number | null,
  createdAt?: string | null,
  currency?: string | null,
  id: string,
  invoiceNumber?: string | null,
  invoicePdfUrl?: string | null,
  invoiceUrl?: string | null,
  owner?: string | null,
  refundedAt?: string | null,
  status?: string | null,
  updatedAt?: string | null,
  userId?: string | null,
};

export type NotionDocument = {
  __typename: "NotionDocument",
  createdAt?: string | null,
  eventId: string,
  folderId?: string | null,
  id: string,
  importedAt?: string | null,
  notionLastEditedAt?: string | null,
  notionPageId: string,
  notionPageUrl?: string | null,
  owner?: string | null,
  s3Key: string,
  title: string,
  updatedAt?: string | null,
};

export type NotionIntegration = {
  __typename: "NotionIntegration",
  accessToken: string,
  botId: string,
  createdAt?: string | null,
  id: string,
  owner?: string | null,
  refreshToken?: string | null,
  updatedAt?: string | null,
  workspaceId: string,
  workspaceName?: string | null,
};

export type PaymentMethodData = {
  __typename: "PaymentMethodData",
  brand?: string | null,
  createdAt?: string | null,
  expiryMonth?: number | null,
  expiryYear?: number | null,
  id: string,
  last4?: string | null,
  owner?: string | null,
  paymentMethodId?: string | null,
  updatedAt?: string | null,
};

export type PlanPurchase = {
  __typename: "PlanPurchase",
  amount?: number | null,
  consumedAt?: string | null,
  consumedByEventId?: string | null,
  createdAt?: string | null,
  currency?: string | null,
  id: string,
  owner?: string | null,
  planKey: string,
  refundedAt?: string | null,
  stripeCheckoutSessionId?: string | null,
  stripePaymentIntentId?: string | null,
  tierKey?: string | null,
  updatedAt?: string | null,
  userId: string,
};

export type ProcessedStripeEvent = {
  __typename: "ProcessedStripeEvent",
  createdAt: string,
  eventId?: string | null,
  id: string,
  processedAt?: string | null,
  processedKey?: string | null,
  type?: string | null,
  updatedAt: string,
};

export type SupplierDetailData = {
  __typename: "SupplierDetailData",
  address?: string | null,
  category?: string | null,
  contactEmail?: string | null,
  contactName?: string | null,
  contactPhone?: string | null,
  country?: string | null,
  currency?: string | null,
  estimateMaxAmount?: number | null,
  estimateMinAmount?: number | null,
  estimateUnit?: string | null,
  id: string,
  name: string,
  notes?: string | null,
  paymentDetails?: string | null,
  tags?: Array< string | null > | null,
  vatNumber?: string | null,
  website?: string | null,
};

export type UserSubscription = {
  __typename: "UserSubscription",
  billingCycle?: string | null,
  cancelAt?: string | null,
  cancelAtPeriodEnd?: boolean | null,
  canceledAt?: string | null,
  createdAt?: string | null,
  currentPeriodEnd?: string | null,
  currentPeriodStart?: string | null,
  id: string,
  owner?: string | null,
  paymentMethodId?: string | null,
  planName?: string | null,
  priceId?: string | null,
  setupIntentId?: string | null,
  status?: string | null,
  stripeCustomerId?: string | null,
  subscriptionId?: string | null,
  updatedAt?: string | null,
};

export type ModelDependentFilterInput = {
  age?: ModelDependentAgeInput | null,
  and?: Array< ModelDependentFilterInput | null > | null,
  attendedDate?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelDependentFilterInput | null,
  or?: Array< ModelDependentFilterInput | null > | null,
  owner?: ModelStringInput | null,
  participantId?: ModelStringInput | null,
  status?: ModelDependentStatusInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelDependentAgeInput = {
  eq?: DependentAge | null,
  ne?: DependentAge | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelDependentStatusInput = {
  eq?: DependentStatus | null,
  ne?: DependentStatus | null,
};

export type ModelDocumentFolderFilterInput = {
  and?: Array< ModelDocumentFolderFilterInput | null > | null,
  color?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  icon?: ModelStringInput | null,
  id?: ModelStringInput | null,
  isDefault?: ModelBooleanInput | null,
  name?: ModelStringInput | null,
  not?: ModelDocumentFolderFilterInput | null,
  or?: Array< ModelDocumentFolderFilterInput | null > | null,
  order?: ModelIntInput | null,
  owner?: ModelStringInput | null,
  parentFolderId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelBooleanInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelIntInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelEmailLogFilterInput = {
  and?: Array< ModelEmailLogFilterInput | null > | null,
  attempts?: ModelIntInput | null,
  createdAt?: ModelStringInput | null,
  deliveredAt?: ModelStringInput | null,
  emailType?: ModelEmailLogEmailTypeInput | null,
  errorMessage?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  id?: ModelStringInput | null,
  language?: ModelEmailLogLanguageInput | null,
  lastAttemptAt?: ModelStringInput | null,
  messageId?: ModelStringInput | null,
  not?: ModelEmailLogFilterInput | null,
  or?: Array< ModelEmailLogFilterInput | null > | null,
  owner?: ModelStringInput | null,
  participantId?: ModelStringInput | null,
  sentAt?: ModelStringInput | null,
  status?: ModelEmailLogStatusInput | null,
  templateName?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelEmailLogEmailTypeInput = {
  eq?: EmailLogEmailType | null,
  ne?: EmailLogEmailType | null,
};

export type ModelEmailLogLanguageInput = {
  eq?: EmailLogLanguage | null,
  ne?: EmailLogLanguage | null,
};

export type ModelEmailLogStatusInput = {
  eq?: EmailLogStatus | null,
  ne?: EmailLogStatus | null,
};

export type ModelEmailLogConnection = {
  __typename: "ModelEmailLogConnection",
  items:  Array<EmailLog | null >,
  nextToken?: string | null,
};

export type ModelEventFilterInput = {
  and?: Array< ModelEventFilterInput | null > | null,
  budget?: ModelFloatInput | null,
  categories?: ModelStringInput | null,
  committedExpenses?: ModelFloatInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  dependentCount?: ModelIntInput | null,
  description?: ModelStringInput | null,
  effectiveExpenses?: ModelFloatInput | null,
  eventCreationDate?: ModelStringInput | null,
  eventDateType?: ModelEventEventDateTypeInput | null,
  eventEndDate?: ModelStringInput | null,
  eventLocation?: ModelStringInput | null,
  eventManager?: ModelStringInput | null,
  eventManagerEmail?: ModelStringInput | null,
  eventManagerPhone?: ModelStringInput | null,
  eventSpecificDates?: ModelStringInput | null,
  eventStartDate?: ModelStringInput | null,
  eventStatus?: ModelStringInput | null,
  eventTime?: ModelStringInput | null,
  eventTitle?: ModelStringInput | null,
  eventType?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelEventFilterInput | null,
  or?: Array< ModelEventFilterInput | null > | null,
  organizerId?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  ownerEmail?: ModelStringInput | null,
  ownerName?: ModelStringInput | null,
  participantCount?: ModelIntInput | null,
  participantLimit?: ModelIntInput | null,
  planKey?: ModelStringInput | null,
  totalRegistrations?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelFloatInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelEventEventDateTypeInput = {
  eq?: EventEventDateType | null,
  ne?: EventEventDateType | null,
};

export type ModelEventConnection = {
  __typename: "ModelEventConnection",
  items:  Array<Event | null >,
  nextToken?: string | null,
};

export type ModelEventCollaboratorFilterInput = {
  acceptedAt?: ModelStringInput | null,
  and?: Array< ModelEventCollaboratorFilterInput | null > | null,
  canViewTeamSchedule?: ModelBooleanInput | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  id?: ModelStringInput | null,
  invitedAt?: ModelStringInput | null,
  invitedBy?: ModelStringInput | null,
  not?: ModelEventCollaboratorFilterInput | null,
  or?: Array< ModelEventCollaboratorFilterInput | null > | null,
  owner?: ModelStringInput | null,
  role?: ModelEventCollaboratorRoleInput | null,
  sharedFolderIds?: ModelStringInput | null,
  sharedSupplierIds?: ModelStringInput | null,
  status?: ModelEventCollaboratorStatusInput | null,
  updatedAt?: ModelStringInput | null,
  userEmail?: ModelStringInput | null,
  userId?: ModelStringInput | null,
  userName?: ModelStringInput | null,
};

export type ModelEventCollaboratorRoleInput = {
  eq?: EventCollaboratorRole | null,
  ne?: EventCollaboratorRole | null,
};

export type ModelEventCollaboratorStatusInput = {
  eq?: EventCollaboratorStatus | null,
  ne?: EventCollaboratorStatus | null,
};

export type ListEventParticipantsResult = {
  __typename: "ListEventParticipantsResult",
  items?:  Array<ParticipantItemData | null > | null,
  totalCount?: number | null,
};

export type ParticipantItemData = {
  __typename: "ParticipantItemData",
  accommodationCost?: number | null,
  arrivalAirport?: string | null,
  arrivalDate?: string | null,
  arrivalFlight?: string | null,
  arrivalLayovers?: string | null,
  arrivalTime?: string | null,
  attendedDate?: string | null,
  bookingAgency?: string | null,
  bookingReference?: string | null,
  checkInDate?: string | null,
  checkOutDate?: string | null,
  confirmationDate?: string | null,
  createdAt?: string | null,
  departureAirport?: string | null,
  departureDate?: string | null,
  departureFlight?: string | null,
  departureTime?: string | null,
  dependents?:  Array<DependentItemData | null > | null,
  dependentsCount?: number | null,
  dietaryRestriction?: string | null,
  documentLast4?: string | null,
  documentationType?: string | null,
  emergencyContact?: string | null,
  eventId?: string | null,
  hotel?: string | null,
  id: string,
  internalId?: string | null,
  nationality?: string | null,
  nights?: number | null,
  organization?: string | null,
  owner?: string | null,
  participantEmail?: string | null,
  participantJob?: string | null,
  participantName?: string | null,
  participantNote?: string | null,
  participantPhone?: string | null,
  participantStatus?: string | null,
  paymentStatus?: string | null,
  photoUrl?: string | null,
  protocol?: string | null,
  rateCurrency?: string | null,
  ratePerNight?: number | null,
  registrationDate?: string | null,
  residenceCountry?: string | null,
  roleId?: string | null,
  roomType?: string | null,
  taxesCurrency?: string | null,
  taxesExtras?: number | null,
  ticketCurrency?: string | null,
  ticketFare?: number | null,
  totalTravelCost?: number | null,
  totalTravelCurrency?: string | null,
  transferCost?: number | null,
  transferCurrency?: string | null,
  transferDetails?: string | null,
  transferRequired?: boolean | null,
  updatedAt?: string | null,
  visaRequired?: boolean | null,
  visaSupport?: boolean | null,
};

export type DependentItemData = {
  __typename: "DependentItemData",
  age?: string | null,
  attendedDate?: string | null,
  createdAt?: string | null,
  eventId?: string | null,
  id: string,
  name?: string | null,
  participantId?: string | null,
  status?: string | null,
  updatedAt?: string | null,
};

export type ListScheduleEntriesResult = {
  __typename: "ListScheduleEntriesResult",
  authors?:  Array<ScheduleAuthorData | null > | null,
  items?:  Array<ScheduleEntryData | null > | null,
};

export type ScheduleAuthorData = {
  __typename: "ScheduleAuthorData",
  name?: string | null,
  userId: string,
};

export type ScheduleEntryData = {
  __typename: "ScheduleEntryData",
  color?: string | null,
  createdAt?: string | null,
  date: string,
  description?: string | null,
  endTime?: string | null,
  eventId: string,
  id: string,
  location?: string | null,
  order?: number | null,
  owner: string,
  participantIds?: Array< string | null > | null,
  startTime?: string | null,
  supplierId?: string | null,
  title: string,
  updatedAt?: string | null,
};

export type ModelEventScheduleEntryFilterInput = {
  and?: Array< ModelEventScheduleEntryFilterInput | null > | null,
  color?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  date?: ModelStringInput | null,
  description?: ModelStringInput | null,
  endTime?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  id?: ModelStringInput | null,
  location?: ModelStringInput | null,
  not?: ModelEventScheduleEntryFilterInput | null,
  or?: Array< ModelEventScheduleEntryFilterInput | null > | null,
  order?: ModelIntInput | null,
  owner?: ModelStringInput | null,
  participantIds?: ModelStringInput | null,
  startTime?: ModelStringInput | null,
  supplierId?: ModelStringInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelEventScheduleEntryConnection = {
  __typename: "ModelEventScheduleEntryConnection",
  items:  Array<EventScheduleEntry | null >,
  nextToken?: string | null,
};

export type ModelEventSupplierFilterInput = {
  and?: Array< ModelEventSupplierFilterInput | null > | null,
  approvalStatus?: ModelEventSupplierApprovalStatusInput | null,
  approvedAt?: ModelStringInput | null,
  approvedBy?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  externalRef?: ModelStringInput | null,
  id?: ModelStringInput | null,
  invoiceS3Key?: ModelStringInput | null,
  not?: ModelEventSupplierFilterInput | null,
  or?: Array< ModelEventSupplierFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paidAt?: ModelStringInput | null,
  quoteAmount?: ModelFloatInput | null,
  rejectionReason?: ModelStringInput | null,
  requestedBy?: ModelStringInput | null,
  status?: ModelEventSupplierStatusInput | null,
  supplierId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelEventSupplierApprovalStatusInput = {
  eq?: EventSupplierApprovalStatus | null,
  ne?: EventSupplierApprovalStatus | null,
};

export type ModelEventSupplierStatusInput = {
  eq?: EventSupplierStatus | null,
  ne?: EventSupplierStatus | null,
};

export type ListEventSuppliersResult = {
  __typename: "ListEventSuppliersResult",
  eventData?: EventDataSlice | null,
  items?:  Array<EventSupplierItemData | null > | null,
  sharedSuppliers?:  Array<SupplierSummaryData | null > | null,
};

export type EventDataSlice = {
  __typename: "EventDataSlice",
  budget?: number | null,
  committedExpenses?: number | null,
  effectiveExpenses?: number | null,
  eventTitle?: string | null,
  id: string,
};

export type EventSupplierItemData = {
  __typename: "EventSupplierItemData",
  approvalStatus?: string | null,
  approvedAt?: string | null,
  approvedBy?: string | null,
  createdAt?: string | null,
  eventId: string,
  id: string,
  invoiceS3Key?: string | null,
  owner?: string | null,
  paidAt?: string | null,
  quoteAmount?: number | null,
  rejectionReason?: string | null,
  requestedBy?: string | null,
  status?: string | null,
  supplier?: SupplierSummaryData | null,
  supplierId: string,
  updatedAt?: string | null,
};

export type SupplierSummaryData = {
  __typename: "SupplierSummaryData",
  category?: string | null,
  contactEmail?: string | null,
  contactName?: string | null,
  contactPhone?: string | null,
  currency?: string | null,
  estimateMaxAmount?: number | null,
  estimateMinAmount?: number | null,
  id: string,
  name: string,
};

export type ModelFidelizeIntegrationFilterInput = {
  and?: Array< ModelFidelizeIntegrationFilterInput | null > | null,
  apiKey?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  isActive?: ModelBooleanInput | null,
  lastSyncAt?: ModelStringInput | null,
  not?: ModelFidelizeIntegrationFilterInput | null,
  or?: Array< ModelFidelizeIntegrationFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelFidelizeIntegrationConnection = {
  __typename: "ModelFidelizeIntegrationConnection",
  items:  Array<FidelizeIntegration | null >,
  nextToken?: string | null,
};

export type ModelInvoiceFilterInput = {
  amount?: ModelFloatInput | null,
  and?: Array< ModelInvoiceFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  id?: ModelStringInput | null,
  invoiceNumber?: ModelStringInput | null,
  invoicePdfUrl?: ModelStringInput | null,
  invoiceUrl?: ModelStringInput | null,
  not?: ModelInvoiceFilterInput | null,
  or?: Array< ModelInvoiceFilterInput | null > | null,
  owner?: ModelStringInput | null,
  refundedAt?: ModelStringInput | null,
  status?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type ModelInvoiceConnection = {
  __typename: "ModelInvoiceConnection",
  items:  Array<Invoice | null >,
  nextToken?: string | null,
};

export type CollaboratedEventResult = {
  __typename: "CollaboratedEventResult",
  collaboration?: CollaborationData | null,
  event?: EventData | null,
  userRole: string,
};

export type ModelNotionDocumentFilterInput = {
  and?: Array< ModelNotionDocumentFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  folderId?: ModelStringInput | null,
  id?: ModelStringInput | null,
  importedAt?: ModelStringInput | null,
  not?: ModelNotionDocumentFilterInput | null,
  notionLastEditedAt?: ModelStringInput | null,
  notionPageId?: ModelStringInput | null,
  notionPageUrl?: ModelStringInput | null,
  or?: Array< ModelNotionDocumentFilterInput | null > | null,
  owner?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelNotionDocumentConnection = {
  __typename: "ModelNotionDocumentConnection",
  items:  Array<NotionDocument | null >,
  nextToken?: string | null,
};

export type ModelStringKeyConditionInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
};

export type ModelNotionIntegrationFilterInput = {
  accessToken?: ModelStringInput | null,
  and?: Array< ModelNotionIntegrationFilterInput | null > | null,
  botId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelNotionIntegrationFilterInput | null,
  or?: Array< ModelNotionIntegrationFilterInput | null > | null,
  owner?: ModelStringInput | null,
  refreshToken?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  workspaceId?: ModelStringInput | null,
  workspaceName?: ModelStringInput | null,
};

export type ModelNotionIntegrationConnection = {
  __typename: "ModelNotionIntegrationConnection",
  items:  Array<NotionIntegration | null >,
  nextToken?: string | null,
};

export type ListNotionPagesResult = {
  __typename: "ListNotionPagesResult",
  error?: string | null,
  hasMore?: boolean | null,
  nextCursor?: string | null,
  pages?:  Array<NotionPageItem | null > | null,
};

export type NotionPageItem = {
  __typename: "NotionPageItem",
  icon?: string | null,
  id: string,
  lastEditedAt?: string | null,
  propertyCount?: number | null,
  subtitle?: string | null,
  title: string,
  type?: string | null,
  url?: string | null,
};

export type ModelParticipantFilterInput = {
  accommodationCost?: ModelFloatInput | null,
  and?: Array< ModelParticipantFilterInput | null > | null,
  arrivalAirport?: ModelStringInput | null,
  arrivalDate?: ModelStringInput | null,
  arrivalFlight?: ModelStringInput | null,
  arrivalLayovers?: ModelStringInput | null,
  arrivalTime?: ModelStringInput | null,
  attendedDate?: ModelStringInput | null,
  bookingAgency?: ModelStringInput | null,
  bookingReference?: ModelStringInput | null,
  checkInDate?: ModelStringInput | null,
  checkOutDate?: ModelStringInput | null,
  confirmationDate?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  departureAirport?: ModelStringInput | null,
  departureDate?: ModelStringInput | null,
  departureFlight?: ModelStringInput | null,
  departureTime?: ModelStringInput | null,
  dependentsCount?: ModelIntInput | null,
  dietaryRestriction?: ModelStringInput | null,
  documentLast4?: ModelStringInput | null,
  documentationType?: ModelStringInput | null,
  emergencyContact?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  hotel?: ModelStringInput | null,
  id?: ModelIDInput | null,
  internalId?: ModelStringInput | null,
  nationality?: ModelStringInput | null,
  nights?: ModelIntInput | null,
  not?: ModelParticipantFilterInput | null,
  or?: Array< ModelParticipantFilterInput | null > | null,
  organization?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  participantEmail?: ModelStringInput | null,
  participantJob?: ModelStringInput | null,
  participantName?: ModelStringInput | null,
  participantNote?: ModelStringInput | null,
  participantPhone?: ModelStringInput | null,
  participantStatus?: ModelParticipantParticipantStatusInput | null,
  paymentStatus?: ModelParticipantPaymentStatusInput | null,
  photoUrl?: ModelStringInput | null,
  protocol?: ModelStringInput | null,
  rateCurrency?: ModelStringInput | null,
  ratePerNight?: ModelFloatInput | null,
  registrationDate?: ModelStringInput | null,
  residenceCountry?: ModelStringInput | null,
  roleId?: ModelStringInput | null,
  roomType?: ModelStringInput | null,
  taxesCurrency?: ModelStringInput | null,
  taxesExtras?: ModelFloatInput | null,
  ticketCurrency?: ModelStringInput | null,
  ticketFare?: ModelFloatInput | null,
  totalTravelCost?: ModelFloatInput | null,
  totalTravelCurrency?: ModelStringInput | null,
  transferCost?: ModelFloatInput | null,
  transferCurrency?: ModelStringInput | null,
  transferDetails?: ModelStringInput | null,
  transferRequired?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  visaRequired?: ModelBooleanInput | null,
  visaSupport?: ModelBooleanInput | null,
};

export type ModelParticipantParticipantStatusInput = {
  eq?: ParticipantParticipantStatus | null,
  ne?: ParticipantParticipantStatus | null,
};

export type ModelParticipantPaymentStatusInput = {
  eq?: ParticipantPaymentStatus | null,
  ne?: ParticipantPaymentStatus | null,
};

export type ModelPaymentMethodDataFilterInput = {
  and?: Array< ModelPaymentMethodDataFilterInput | null > | null,
  brand?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  expiryMonth?: ModelIntInput | null,
  expiryYear?: ModelIntInput | null,
  id?: ModelStringInput | null,
  last4?: ModelStringInput | null,
  not?: ModelPaymentMethodDataFilterInput | null,
  or?: Array< ModelPaymentMethodDataFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paymentMethodId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelPaymentMethodDataConnection = {
  __typename: "ModelPaymentMethodDataConnection",
  items:  Array<PaymentMethodData | null >,
  nextToken?: string | null,
};

export type ModelPlanPurchaseFilterInput = {
  amount?: ModelIntInput | null,
  and?: Array< ModelPlanPurchaseFilterInput | null > | null,
  consumedAt?: ModelStringInput | null,
  consumedByEventId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelPlanPurchaseFilterInput | null,
  or?: Array< ModelPlanPurchaseFilterInput | null > | null,
  owner?: ModelStringInput | null,
  planKey?: ModelStringInput | null,
  refundedAt?: ModelStringInput | null,
  stripeCheckoutSessionId?: ModelStringInput | null,
  stripePaymentIntentId?: ModelStringInput | null,
  tierKey?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type ModelPlanPurchaseConnection = {
  __typename: "ModelPlanPurchaseConnection",
  items:  Array<PlanPurchase | null >,
  nextToken?: string | null,
};

export type ModelProcessedStripeEventFilterInput = {
  and?: Array< ModelProcessedStripeEventFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelProcessedStripeEventFilterInput | null,
  or?: Array< ModelProcessedStripeEventFilterInput | null > | null,
  processedAt?: ModelStringInput | null,
  processedKey?: ModelStringInput | null,
  type?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelProcessedStripeEventConnection = {
  __typename: "ModelProcessedStripeEventConnection",
  items:  Array<ProcessedStripeEvent | null >,
  nextToken?: string | null,
};

export type ModelRoleFilterInput = {
  and?: Array< ModelRoleFilterInput | null > | null,
  archived?: ModelBooleanInput | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelRoleFilterInput | null,
  or?: Array< ModelRoleFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelSupplierFilterInput = {
  address?: ModelStringInput | null,
  and?: Array< ModelSupplierFilterInput | null > | null,
  category?: ModelStringInput | null,
  contactEmail?: ModelStringInput | null,
  contactName?: ModelStringInput | null,
  contactPhone?: ModelStringInput | null,
  country?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  estimateMaxAmount?: ModelFloatInput | null,
  estimateMinAmount?: ModelFloatInput | null,
  estimateUnit?: ModelSupplierEstimateUnitInput | null,
  id?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelSupplierFilterInput | null,
  notes?: ModelStringInput | null,
  or?: Array< ModelSupplierFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paymentDetails?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  vatNumber?: ModelStringInput | null,
  website?: ModelStringInput | null,
};

export type ModelSupplierEstimateUnitInput = {
  eq?: SupplierEstimateUnit | null,
  ne?: SupplierEstimateUnit | null,
};

export type ModelSupplierConnection = {
  __typename: "ModelSupplierConnection",
  items:  Array<Supplier | null >,
  nextToken?: string | null,
};

export type ModelUserSubscriptionFilterInput = {
  and?: Array< ModelUserSubscriptionFilterInput | null > | null,
  billingCycle?: ModelStringInput | null,
  cancelAt?: ModelStringInput | null,
  cancelAtPeriodEnd?: ModelBooleanInput | null,
  canceledAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currentPeriodEnd?: ModelStringInput | null,
  currentPeriodStart?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelUserSubscriptionFilterInput | null,
  or?: Array< ModelUserSubscriptionFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paymentMethodId?: ModelStringInput | null,
  planName?: ModelStringInput | null,
  priceId?: ModelStringInput | null,
  setupIntentId?: ModelStringInput | null,
  status?: ModelStringInput | null,
  stripeCustomerId?: ModelStringInput | null,
  subscriptionId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelUserSubscriptionConnection = {
  __typename: "ModelUserSubscriptionConnection",
  items:  Array<UserSubscription | null >,
  nextToken?: string | null,
};

export enum ConfirmParticipantLanguage {
  en = "en",
  fr = "fr",
  pt = "pt",
}


export type ConfirmParticipantReturnType = {
  __typename: "ConfirmParticipantReturnType",
  message?: string | null,
  success?: boolean | null,
  updatedDependentsCount?: number | null,
};

export type CreateBillingPortalSessionReturnType = {
  __typename: "CreateBillingPortalSessionReturnType",
  message?: string | null,
  sessionUrl?: string | null,
  success?: boolean | null,
};

export type CreateCheckoutSessionReturnType = {
  __typename: "CreateCheckoutSessionReturnType",
  message?: string | null,
  sessionUrl?: string | null,
  success?: boolean | null,
};

export type ModelDependentConditionInput = {
  age?: ModelDependentAgeInput | null,
  and?: Array< ModelDependentConditionInput | null > | null,
  attendedDate?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelDependentConditionInput | null,
  or?: Array< ModelDependentConditionInput | null > | null,
  owner?: ModelStringInput | null,
  participantId?: ModelStringInput | null,
  status?: ModelDependentStatusInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateDependentInput = {
  age?: DependentAge | null,
  attendedDate?: string | null,
  eventId?: string | null,
  id?: string | null,
  name?: string | null,
  participantId?: string | null,
  status?: DependentStatus | null,
};

export type CreateDependentCustomReturnType = {
  __typename: "CreateDependentCustomReturnType",
  age?: string | null,
  eventId?: string | null,
  id?: string | null,
  message?: string | null,
  name?: string | null,
  participantId?: string | null,
  status?: string | null,
  success?: boolean | null,
};

export type ModelDocumentFolderConditionInput = {
  and?: Array< ModelDocumentFolderConditionInput | null > | null,
  color?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  icon?: ModelStringInput | null,
  isDefault?: ModelBooleanInput | null,
  name?: ModelStringInput | null,
  not?: ModelDocumentFolderConditionInput | null,
  or?: Array< ModelDocumentFolderConditionInput | null > | null,
  order?: ModelIntInput | null,
  owner?: ModelStringInput | null,
  parentFolderId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateDocumentFolderInput = {
  color?: string | null,
  createdAt?: string | null,
  description?: string | null,
  eventId: string,
  icon?: string | null,
  id?: string | null,
  isDefault?: boolean | null,
  name: string,
  order?: number | null,
  owner?: string | null,
  parentFolderId?: string | null,
  updatedAt?: string | null,
};

export type ModelEmailLogConditionInput = {
  and?: Array< ModelEmailLogConditionInput | null > | null,
  attempts?: ModelIntInput | null,
  createdAt?: ModelStringInput | null,
  deliveredAt?: ModelStringInput | null,
  emailType?: ModelEmailLogEmailTypeInput | null,
  errorMessage?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  language?: ModelEmailLogLanguageInput | null,
  lastAttemptAt?: ModelStringInput | null,
  messageId?: ModelStringInput | null,
  not?: ModelEmailLogConditionInput | null,
  or?: Array< ModelEmailLogConditionInput | null > | null,
  owner?: ModelStringInput | null,
  participantId?: ModelStringInput | null,
  sentAt?: ModelStringInput | null,
  status?: ModelEmailLogStatusInput | null,
  templateName?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateEmailLogInput = {
  attempts?: number | null,
  createdAt?: string | null,
  deliveredAt?: string | null,
  emailType?: EmailLogEmailType | null,
  errorMessage?: string | null,
  eventId?: string | null,
  id?: string | null,
  language?: EmailLogLanguage | null,
  lastAttemptAt?: string | null,
  messageId?: string | null,
  participantId?: string | null,
  sentAt?: string | null,
  status?: EmailLogStatus | null,
  templateName?: string | null,
  updatedAt?: string | null,
};

export type CreateEventReturnType = {
  __typename: "CreateEventReturnType",
  event?: string | null,
  message?: string | null,
  success?: boolean | null,
};

export type ModelEventSupplierConditionInput = {
  and?: Array< ModelEventSupplierConditionInput | null > | null,
  approvalStatus?: ModelEventSupplierApprovalStatusInput | null,
  approvedAt?: ModelStringInput | null,
  approvedBy?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  externalRef?: ModelStringInput | null,
  invoiceS3Key?: ModelStringInput | null,
  not?: ModelEventSupplierConditionInput | null,
  or?: Array< ModelEventSupplierConditionInput | null > | null,
  owner?: ModelStringInput | null,
  paidAt?: ModelStringInput | null,
  quoteAmount?: ModelFloatInput | null,
  rejectionReason?: ModelStringInput | null,
  requestedBy?: ModelStringInput | null,
  status?: ModelEventSupplierStatusInput | null,
  supplierId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateEventSupplierInput = {
  approvalStatus?: EventSupplierApprovalStatus | null,
  approvedAt?: string | null,
  approvedBy?: string | null,
  currency?: string | null,
  description?: string | null,
  eventId: string,
  externalRef?: string | null,
  id?: string | null,
  invoiceS3Key?: string | null,
  paidAt?: string | null,
  quoteAmount?: number | null,
  rejectionReason?: string | null,
  requestedBy?: string | null,
  status?: EventSupplierStatus | null,
  supplierId: string,
};

export type ModelFidelizeIntegrationConditionInput = {
  and?: Array< ModelFidelizeIntegrationConditionInput | null > | null,
  apiKey?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  isActive?: ModelBooleanInput | null,
  lastSyncAt?: ModelStringInput | null,
  not?: ModelFidelizeIntegrationConditionInput | null,
  or?: Array< ModelFidelizeIntegrationConditionInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateFidelizeIntegrationInput = {
  apiKey: string,
  createdAt?: string | null,
  id?: string | null,
  isActive?: boolean | null,
  lastSyncAt?: string | null,
  updatedAt?: string | null,
};

export type ModelInvoiceConditionInput = {
  amount?: ModelFloatInput | null,
  and?: Array< ModelInvoiceConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  invoiceNumber?: ModelStringInput | null,
  invoicePdfUrl?: ModelStringInput | null,
  invoiceUrl?: ModelStringInput | null,
  not?: ModelInvoiceConditionInput | null,
  or?: Array< ModelInvoiceConditionInput | null > | null,
  owner?: ModelStringInput | null,
  refundedAt?: ModelStringInput | null,
  status?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type CreateInvoiceInput = {
  amount?: number | null,
  createdAt?: string | null,
  currency?: string | null,
  id?: string | null,
  invoiceNumber?: string | null,
  invoicePdfUrl?: string | null,
  invoiceUrl?: string | null,
  refundedAt?: string | null,
  status?: string | null,
  updatedAt?: string | null,
  userId?: string | null,
};

export type ModelNotionDocumentConditionInput = {
  and?: Array< ModelNotionDocumentConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  folderId?: ModelStringInput | null,
  importedAt?: ModelStringInput | null,
  not?: ModelNotionDocumentConditionInput | null,
  notionLastEditedAt?: ModelStringInput | null,
  notionPageId?: ModelStringInput | null,
  notionPageUrl?: ModelStringInput | null,
  or?: Array< ModelNotionDocumentConditionInput | null > | null,
  owner?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateNotionDocumentInput = {
  createdAt?: string | null,
  eventId: string,
  folderId?: string | null,
  id?: string | null,
  importedAt?: string | null,
  notionLastEditedAt?: string | null,
  notionPageId: string,
  notionPageUrl?: string | null,
  owner?: string | null,
  s3Key: string,
  title: string,
  updatedAt?: string | null,
};

export type ModelNotionIntegrationConditionInput = {
  accessToken?: ModelStringInput | null,
  and?: Array< ModelNotionIntegrationConditionInput | null > | null,
  botId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  not?: ModelNotionIntegrationConditionInput | null,
  or?: Array< ModelNotionIntegrationConditionInput | null > | null,
  owner?: ModelStringInput | null,
  refreshToken?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  workspaceId?: ModelStringInput | null,
  workspaceName?: ModelStringInput | null,
};

export type CreateNotionIntegrationInput = {
  accessToken: string,
  botId: string,
  createdAt?: string | null,
  id?: string | null,
  refreshToken?: string | null,
  updatedAt?: string | null,
  workspaceId: string,
  workspaceName?: string | null,
};

export type ModelParticipantConditionInput = {
  accommodationCost?: ModelFloatInput | null,
  and?: Array< ModelParticipantConditionInput | null > | null,
  arrivalAirport?: ModelStringInput | null,
  arrivalDate?: ModelStringInput | null,
  arrivalFlight?: ModelStringInput | null,
  arrivalLayovers?: ModelStringInput | null,
  arrivalTime?: ModelStringInput | null,
  attendedDate?: ModelStringInput | null,
  bookingAgency?: ModelStringInput | null,
  bookingReference?: ModelStringInput | null,
  checkInDate?: ModelStringInput | null,
  checkOutDate?: ModelStringInput | null,
  confirmationDate?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  departureAirport?: ModelStringInput | null,
  departureDate?: ModelStringInput | null,
  departureFlight?: ModelStringInput | null,
  departureTime?: ModelStringInput | null,
  dependentsCount?: ModelIntInput | null,
  dietaryRestriction?: ModelStringInput | null,
  documentLast4?: ModelStringInput | null,
  documentationType?: ModelStringInput | null,
  emergencyContact?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  hotel?: ModelStringInput | null,
  internalId?: ModelStringInput | null,
  nationality?: ModelStringInput | null,
  nights?: ModelIntInput | null,
  not?: ModelParticipantConditionInput | null,
  or?: Array< ModelParticipantConditionInput | null > | null,
  organization?: ModelStringInput | null,
  owner?: ModelStringInput | null,
  participantEmail?: ModelStringInput | null,
  participantJob?: ModelStringInput | null,
  participantName?: ModelStringInput | null,
  participantNote?: ModelStringInput | null,
  participantPhone?: ModelStringInput | null,
  participantStatus?: ModelParticipantParticipantStatusInput | null,
  paymentStatus?: ModelParticipantPaymentStatusInput | null,
  photoUrl?: ModelStringInput | null,
  protocol?: ModelStringInput | null,
  rateCurrency?: ModelStringInput | null,
  ratePerNight?: ModelFloatInput | null,
  registrationDate?: ModelStringInput | null,
  residenceCountry?: ModelStringInput | null,
  roleId?: ModelStringInput | null,
  roomType?: ModelStringInput | null,
  taxesCurrency?: ModelStringInput | null,
  taxesExtras?: ModelFloatInput | null,
  ticketCurrency?: ModelStringInput | null,
  ticketFare?: ModelFloatInput | null,
  totalTravelCost?: ModelFloatInput | null,
  totalTravelCurrency?: ModelStringInput | null,
  transferCost?: ModelFloatInput | null,
  transferCurrency?: ModelStringInput | null,
  transferDetails?: ModelStringInput | null,
  transferRequired?: ModelBooleanInput | null,
  updatedAt?: ModelStringInput | null,
  visaRequired?: ModelBooleanInput | null,
  visaSupport?: ModelBooleanInput | null,
};

export type CreateParticipantInput = {
  accommodationCost?: number | null,
  arrivalAirport?: string | null,
  arrivalDate?: string | null,
  arrivalFlight?: string | null,
  arrivalLayovers?: string | null,
  arrivalTime?: string | null,
  attendedDate?: string | null,
  bookingAgency?: string | null,
  bookingReference?: string | null,
  checkInDate?: string | null,
  checkOutDate?: string | null,
  confirmationDate?: string | null,
  departureAirport?: string | null,
  departureDate?: string | null,
  departureFlight?: string | null,
  departureTime?: string | null,
  dependentsCount?: number | null,
  dietaryRestriction?: string | null,
  documentLast4?: string | null,
  documentationType?: string | null,
  emergencyContact?: string | null,
  eventId: string,
  hotel?: string | null,
  id?: string | null,
  internalId?: string | null,
  nationality?: string | null,
  nights?: number | null,
  organization?: string | null,
  participantEmail?: string | null,
  participantJob?: string | null,
  participantName: string,
  participantNote?: string | null,
  participantPhone?: string | null,
  participantStatus?: ParticipantParticipantStatus | null,
  paymentStatus?: ParticipantPaymentStatus | null,
  photoUrl?: string | null,
  protocol?: string | null,
  rateCurrency?: string | null,
  ratePerNight?: number | null,
  registrationDate?: string | null,
  residenceCountry?: string | null,
  roleId?: string | null,
  roomType?: string | null,
  taxesCurrency?: string | null,
  taxesExtras?: number | null,
  ticketCurrency?: string | null,
  ticketFare?: number | null,
  totalTravelCost?: number | null,
  totalTravelCurrency?: string | null,
  transferCost?: number | null,
  transferCurrency?: string | null,
  transferDetails?: string | null,
  transferRequired?: boolean | null,
  visaRequired?: boolean | null,
  visaSupport?: boolean | null,
};

export type ModelPaymentMethodDataConditionInput = {
  and?: Array< ModelPaymentMethodDataConditionInput | null > | null,
  brand?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  expiryMonth?: ModelIntInput | null,
  expiryYear?: ModelIntInput | null,
  last4?: ModelStringInput | null,
  not?: ModelPaymentMethodDataConditionInput | null,
  or?: Array< ModelPaymentMethodDataConditionInput | null > | null,
  owner?: ModelStringInput | null,
  paymentMethodId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreatePaymentMethodDataInput = {
  brand?: string | null,
  createdAt?: string | null,
  expiryMonth?: number | null,
  expiryYear?: number | null,
  id?: string | null,
  last4?: string | null,
  paymentMethodId?: string | null,
  updatedAt?: string | null,
};

export type ModelPlanPurchaseConditionInput = {
  amount?: ModelIntInput | null,
  and?: Array< ModelPlanPurchaseConditionInput | null > | null,
  consumedAt?: ModelStringInput | null,
  consumedByEventId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  not?: ModelPlanPurchaseConditionInput | null,
  or?: Array< ModelPlanPurchaseConditionInput | null > | null,
  owner?: ModelStringInput | null,
  planKey?: ModelStringInput | null,
  refundedAt?: ModelStringInput | null,
  stripeCheckoutSessionId?: ModelStringInput | null,
  stripePaymentIntentId?: ModelStringInput | null,
  tierKey?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type CreatePlanPurchaseInput = {
  amount?: number | null,
  consumedAt?: string | null,
  consumedByEventId?: string | null,
  createdAt?: string | null,
  currency?: string | null,
  id?: string | null,
  planKey: string,
  refundedAt?: string | null,
  stripeCheckoutSessionId?: string | null,
  stripePaymentIntentId?: string | null,
  tierKey?: string | null,
  updatedAt?: string | null,
  userId: string,
};

export type ModelProcessedStripeEventConditionInput = {
  and?: Array< ModelProcessedStripeEventConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  not?: ModelProcessedStripeEventConditionInput | null,
  or?: Array< ModelProcessedStripeEventConditionInput | null > | null,
  processedAt?: ModelStringInput | null,
  processedKey?: ModelStringInput | null,
  type?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateProcessedStripeEventInput = {
  eventId?: string | null,
  id?: string | null,
  processedAt?: string | null,
  processedKey?: string | null,
  type?: string | null,
};

export type ModelRoleConditionInput = {
  and?: Array< ModelRoleConditionInput | null > | null,
  archived?: ModelBooleanInput | null,
  createdAt?: ModelStringInput | null,
  eventId?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelRoleConditionInput | null,
  or?: Array< ModelRoleConditionInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRoleInput = {
  archived?: boolean | null,
  eventId: string,
  id?: string | null,
  name: string,
};

export type ModelSupplierConditionInput = {
  address?: ModelStringInput | null,
  and?: Array< ModelSupplierConditionInput | null > | null,
  category?: ModelStringInput | null,
  contactEmail?: ModelStringInput | null,
  contactName?: ModelStringInput | null,
  contactPhone?: ModelStringInput | null,
  country?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currency?: ModelStringInput | null,
  estimateMaxAmount?: ModelFloatInput | null,
  estimateMinAmount?: ModelFloatInput | null,
  estimateUnit?: ModelSupplierEstimateUnitInput | null,
  name?: ModelStringInput | null,
  not?: ModelSupplierConditionInput | null,
  notes?: ModelStringInput | null,
  or?: Array< ModelSupplierConditionInput | null > | null,
  owner?: ModelStringInput | null,
  paymentDetails?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  vatNumber?: ModelStringInput | null,
  website?: ModelStringInput | null,
};

export type CreateSupplierInput = {
  address?: string | null,
  category?: string | null,
  contactEmail?: string | null,
  contactName?: string | null,
  contactPhone?: string | null,
  country?: string | null,
  currency?: string | null,
  estimateMaxAmount?: number | null,
  estimateMinAmount?: number | null,
  estimateUnit?: SupplierEstimateUnit | null,
  id?: string | null,
  name: string,
  notes?: string | null,
  owner?: string | null,
  paymentDetails?: string | null,
  tags?: Array< string | null > | null,
  vatNumber?: string | null,
  website?: string | null,
};

export type ModelUserSubscriptionConditionInput = {
  and?: Array< ModelUserSubscriptionConditionInput | null > | null,
  billingCycle?: ModelStringInput | null,
  cancelAt?: ModelStringInput | null,
  cancelAtPeriodEnd?: ModelBooleanInput | null,
  canceledAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  currentPeriodEnd?: ModelStringInput | null,
  currentPeriodStart?: ModelStringInput | null,
  not?: ModelUserSubscriptionConditionInput | null,
  or?: Array< ModelUserSubscriptionConditionInput | null > | null,
  owner?: ModelStringInput | null,
  paymentMethodId?: ModelStringInput | null,
  planName?: ModelStringInput | null,
  priceId?: ModelStringInput | null,
  setupIntentId?: ModelStringInput | null,
  status?: ModelStringInput | null,
  stripeCustomerId?: ModelStringInput | null,
  subscriptionId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateUserSubscriptionInput = {
  billingCycle?: string | null,
  cancelAt?: string | null,
  cancelAtPeriodEnd?: boolean | null,
  canceledAt?: string | null,
  createdAt?: string | null,
  currentPeriodEnd?: string | null,
  currentPeriodStart?: string | null,
  id?: string | null,
  paymentMethodId?: string | null,
  planName?: string | null,
  priceId?: string | null,
  setupIntentId?: string | null,
  status?: string | null,
  stripeCustomerId?: string | null,
  subscriptionId?: string | null,
  updatedAt?: string | null,
};

export type DeleteDependentInput = {
  id: string,
};

export type DeleteDependentCustomReturnType = {
  __typename: "DeleteDependentCustomReturnType",
  message?: string | null,
  success?: boolean | null,
};

export type DeleteDocumentFolderInput = {
  id: string,
};

export type DeleteEmailLogInput = {
  id: string,
};

export type DeleteEventCascadeResult = {
  __typename: "DeleteEventCascadeResult",
  deleted?: DeleteEventCascadeCounts | null,
  errors?: Array< string | null > | null,
  failed?: DeleteEventCascadeCounts | null,
  success: boolean,
};

export type DeleteEventCascadeCounts = {
  __typename: "DeleteEventCascadeCounts",
  collaborators?: number | null,
  dependents?: number | null,
  documentFolders?: number | null,
  emailLogs?: number | null,
  event?: number | null,
  eventSuppliers?: number | null,
  notionDocuments?: number | null,
  participants?: number | null,
  roles?: number | null,
  s3Objects?: number | null,
  scheduleEntries?: number | null,
};

export type DeleteEventFolderReturnType = {
  __typename: "DeleteEventFolderReturnType",
  id?: string | null,
  success?: boolean | null,
};

export type DeleteRoleResult = {
  __typename: "DeleteRoleResult",
  participantCount: number,
  success: boolean,
};

export type DeleteEventSupplierInput = {
  id: string,
};

export type DeleteFidelizeIntegrationInput = {
  id: string,
};

export type DeleteInvoiceInput = {
  id: string,
};

export type DeleteNotionDocumentInput = {
  id: string,
};

export type DeleteNotionIntegrationInput = {
  id: string,
};

export type DeleteParticipantInput = {
  id: string,
};

export type DeletePaymentMethodDataInput = {
  id: string,
};

export type DeletePlanPurchaseInput = {
  id: string,
};

export type DeleteProcessedStripeEventInput = {
  id: string,
};

export type DeleteRoleInput = {
  id: string,
};

export type DeleteScheduleEntryReturnType = {
  __typename: "DeleteScheduleEntryReturnType",
  id: string,
};

export type DeleteSupplierInput = {
  id: string,
};

export type DeleteSupplierCustomReturnType = {
  __typename: "DeleteSupplierCustomReturnType",
  eventCount?: number | null,
  message?: string | null,
  success?: boolean | null,
};

export type DeleteUserSubscriptionInput = {
  id: string,
};

export type ExchangeNotionTokenResult = {
  __typename: "ExchangeNotionTokenResult",
  error?: string | null,
  success: boolean,
  workspaceName?: string | null,
};

export type HandleStripeWebhookReturnType = {
  __typename: "HandleStripeWebhookReturnType",
  eventType?: string | null,
  message?: string | null,
  planType?: string | null,
  success?: boolean | null,
};

export type EventSupplierImportResult = {
  __typename: "EventSupplierImportResult",
  eventSuppliersCreated?: number | null,
  message?: string | null,
  reason?: string | null,
  rowsAlreadyLinkedOnEvent?: number | null,
  rowsDuplicatedInBatch?: number | null,
  success?: boolean | null,
  suppliersCreated?: number | null,
  suppliersDeduplicatedInBatch?: number | null,
  suppliersReused?: number | null,
  validationErrorCount?: number | null,
};

export type ImportNormalizedParticipantsReturnType = {
  __typename: "ImportNormalizedParticipantsReturnType",
  count?: number | null,
  details?: ImportNormalizedParticipantsReturnTypeDetails | null,
  duplicates?: string | null,
  message?: string | null,
  skipped?: number | null,
  success?: boolean | null,
};

export type ImportNormalizedParticipantsReturnTypeDetails = {
  __typename: "ImportNormalizedParticipantsReturnTypeDetails",
  dependentsCount?: number | null,
  eventId?: string | null,
  participantsCount?: number | null,
  skippedCount?: number | null,
};

export type SupplierImportResult = {
  __typename: "SupplierImportResult",
  duplicateCount?: number | null,
  message?: string | null,
  reason?: string | null,
  rowErrors?:  Array<SupplierImportRowError | null > | null,
  skippedCount?: number | null,
  success?: boolean | null,
  supplierCount?: number | null,
  validationErrorCount?: number | null,
  writeErrorCount?: number | null,
};

export type SupplierImportRowError = {
  __typename: "SupplierImportRowError",
  message?: string | null,
  row?: number | null,
};

export type ImportNotionPagesResult = {
  __typename: "ImportNotionPagesResult",
  documents?:  Array<ImportedNotionDoc | null > | null,
  errors?: Array< string | null > | null,
  failed?: number | null,
  imported?: number | null,
  success: boolean,
};

export type ImportedNotionDoc = {
  __typename: "ImportedNotionDoc",
  id: string,
  notionPageId: string,
  title: string,
};

export enum InviteCollaboratorLanguage {
  en = "en",
  fr = "fr",
  pt = "pt",
}


export enum InviteCollaboratorRole {
  CO_MANAGER = "CO_MANAGER",
  STAFF_CHECKIN = "STAFF_CHECKIN",
  STAFF_LOGISTICS = "STAFF_LOGISTICS",
}


export type RemoveEventSupplierReturnType = {
  __typename: "RemoveEventSupplierReturnType",
  deletedEventSupplierId?: string | null,
  message?: string | null,
};

export enum RevertEventSupplierApprovalNewStatus {
  APPROVED = "APPROVED",
  PAID = "PAID",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
}


export type SaveDocumentEditReturnType = {
  __typename: "SaveDocumentEditReturnType",
  expiresIn?: number | null,
  presignedUrl?: string | null,
};

export type SaveFidelizeApiKeyResult = {
  __typename: "SaveFidelizeApiKeyResult",
  error?: string | null,
  success: boolean,
};

export enum SendEmailEmailType {
  collaboratorInvitation = "collaboratorInvitation",
  eventCreation = "eventCreation",
  eventReminder = "eventReminder",
  eventUpdate = "eventUpdate",
  loginAlert = "loginAlert",
  participantConfirmation = "participantConfirmation",
  participantInvitation = "participantInvitation",
  saveTheDate = "saveTheDate",
  welcome = "welcome",
}


export enum SendEmailLanguage {
  en = "en",
  fr = "fr",
  pt = "pt",
}


export type SendEmailReturnType = {
  __typename: "SendEmailReturnType",
  error?: string | null,
  message?: string | null,
  success?: boolean | null,
};

export type FidelizeSyncResult = {
  __typename: "FidelizeSyncResult",
  created?: number | null,
  errors?: Array< string | null > | null,
  hasMore?: boolean | null,
  nextPage?: number | null,
  skipped?: number | null,
  success: boolean,
  totalCards?: number | null,
  updated?: number | null,
};

export type SyncMyDisplayNameReturnType = {
  __typename: "SyncMyDisplayNameReturnType",
  updatedCollaborations?: number | null,
  updatedEvents?: number | null,
};

export type UpdateDependentInput = {
  age?: DependentAge | null,
  attendedDate?: string | null,
  eventId?: string | null,
  id: string,
  name?: string | null,
  participantId?: string | null,
  status?: DependentStatus | null,
};

export type UpdateDependentCustomReturnType = {
  __typename: "UpdateDependentCustomReturnType",
  age?: string | null,
  attendedDate?: string | null,
  createdAt?: string | null,
  eventId?: string | null,
  id: string,
  name?: string | null,
  owner?: string | null,
  participantId?: string | null,
  status?: string | null,
  updatedAt?: string | null,
};

export type UpdateDocumentFolderInput = {
  color?: string | null,
  createdAt?: string | null,
  description?: string | null,
  eventId?: string | null,
  icon?: string | null,
  id: string,
  isDefault?: boolean | null,
  name?: string | null,
  order?: number | null,
  owner?: string | null,
  parentFolderId?: string | null,
  updatedAt?: string | null,
};

export type UpdateEmailLogInput = {
  attempts?: number | null,
  createdAt?: string | null,
  deliveredAt?: string | null,
  emailType?: EmailLogEmailType | null,
  errorMessage?: string | null,
  eventId?: string | null,
  id: string,
  language?: EmailLogLanguage | null,
  lastAttemptAt?: string | null,
  messageId?: string | null,
  participantId?: string | null,
  sentAt?: string | null,
  status?: EmailLogStatus | null,
  templateName?: string | null,
  updatedAt?: string | null,
};

export type UpdateEventReturnType = {
  __typename: "UpdateEventReturnType",
  event?: string | null,
  message?: string | null,
  success?: boolean | null,
};

export type UpdateEventSupplierInput = {
  approvalStatus?: EventSupplierApprovalStatus | null,
  approvedAt?: string | null,
  approvedBy?: string | null,
  currency?: string | null,
  description?: string | null,
  eventId?: string | null,
  externalRef?: string | null,
  id: string,
  invoiceS3Key?: string | null,
  paidAt?: string | null,
  quoteAmount?: number | null,
  rejectionReason?: string | null,
  requestedBy?: string | null,
  status?: EventSupplierStatus | null,
  supplierId?: string | null,
};

export type UpdateFidelizeIntegrationInput = {
  apiKey?: string | null,
  createdAt?: string | null,
  id: string,
  isActive?: boolean | null,
  lastSyncAt?: string | null,
  updatedAt?: string | null,
};

export type UpdateInvoiceInput = {
  amount?: number | null,
  createdAt?: string | null,
  currency?: string | null,
  id: string,
  invoiceNumber?: string | null,
  invoicePdfUrl?: string | null,
  invoiceUrl?: string | null,
  refundedAt?: string | null,
  status?: string | null,
  updatedAt?: string | null,
  userId?: string | null,
};

export type UpdateNotionDocumentInput = {
  createdAt?: string | null,
  eventId?: string | null,
  folderId?: string | null,
  id: string,
  importedAt?: string | null,
  notionLastEditedAt?: string | null,
  notionPageId?: string | null,
  notionPageUrl?: string | null,
  owner?: string | null,
  s3Key?: string | null,
  title?: string | null,
  updatedAt?: string | null,
};

export type UpdateNotionIntegrationInput = {
  accessToken?: string | null,
  botId?: string | null,
  createdAt?: string | null,
  id: string,
  refreshToken?: string | null,
  updatedAt?: string | null,
  workspaceId?: string | null,
  workspaceName?: string | null,
};

export type UpdateParticipantInput = {
  accommodationCost?: number | null,
  arrivalAirport?: string | null,
  arrivalDate?: string | null,
  arrivalFlight?: string | null,
  arrivalLayovers?: string | null,
  arrivalTime?: string | null,
  attendedDate?: string | null,
  bookingAgency?: string | null,
  bookingReference?: string | null,
  checkInDate?: string | null,
  checkOutDate?: string | null,
  confirmationDate?: string | null,
  departureAirport?: string | null,
  departureDate?: string | null,
  departureFlight?: string | null,
  departureTime?: string | null,
  dependentsCount?: number | null,
  dietaryRestriction?: string | null,
  documentLast4?: string | null,
  documentationType?: string | null,
  emergencyContact?: string | null,
  eventId?: string | null,
  hotel?: string | null,
  id: string,
  internalId?: string | null,
  nationality?: string | null,
  nights?: number | null,
  organization?: string | null,
  participantEmail?: string | null,
  participantJob?: string | null,
  participantName?: string | null,
  participantNote?: string | null,
  participantPhone?: string | null,
  participantStatus?: ParticipantParticipantStatus | null,
  paymentStatus?: ParticipantPaymentStatus | null,
  photoUrl?: string | null,
  protocol?: string | null,
  rateCurrency?: string | null,
  ratePerNight?: number | null,
  registrationDate?: string | null,
  residenceCountry?: string | null,
  roleId?: string | null,
  roomType?: string | null,
  taxesCurrency?: string | null,
  taxesExtras?: number | null,
  ticketCurrency?: string | null,
  ticketFare?: number | null,
  totalTravelCost?: number | null,
  totalTravelCurrency?: string | null,
  transferCost?: number | null,
  transferCurrency?: string | null,
  transferDetails?: string | null,
  transferRequired?: boolean | null,
  visaRequired?: boolean | null,
  visaSupport?: boolean | null,
};

export type UpdatePaymentMethodDataInput = {
  brand?: string | null,
  createdAt?: string | null,
  expiryMonth?: number | null,
  expiryYear?: number | null,
  id: string,
  last4?: string | null,
  paymentMethodId?: string | null,
  updatedAt?: string | null,
};

export type UpdatePlanPurchaseInput = {
  amount?: number | null,
  consumedAt?: string | null,
  consumedByEventId?: string | null,
  createdAt?: string | null,
  currency?: string | null,
  id: string,
  planKey?: string | null,
  refundedAt?: string | null,
  stripeCheckoutSessionId?: string | null,
  stripePaymentIntentId?: string | null,
  tierKey?: string | null,
  updatedAt?: string | null,
  userId?: string | null,
};

export type UpdateProcessedStripeEventInput = {
  eventId?: string | null,
  id: string,
  processedAt?: string | null,
  processedKey?: string | null,
  type?: string | null,
};

export type UpdateRoleInput = {
  archived?: boolean | null,
  eventId?: string | null,
  id: string,
  name?: string | null,
};

export type UpdateSupplierInput = {
  address?: string | null,
  category?: string | null,
  contactEmail?: string | null,
  contactName?: string | null,
  contactPhone?: string | null,
  country?: string | null,
  currency?: string | null,
  estimateMaxAmount?: number | null,
  estimateMinAmount?: number | null,
  estimateUnit?: SupplierEstimateUnit | null,
  id: string,
  name?: string | null,
  notes?: string | null,
  owner?: string | null,
  paymentDetails?: string | null,
  tags?: Array< string | null > | null,
  vatNumber?: string | null,
  website?: string | null,
};

export type UpdateUserSubscriptionInput = {
  billingCycle?: string | null,
  cancelAt?: string | null,
  cancelAtPeriodEnd?: boolean | null,
  canceledAt?: string | null,
  createdAt?: string | null,
  currentPeriodEnd?: string | null,
  currentPeriodStart?: string | null,
  id: string,
  paymentMethodId?: string | null,
  planName?: string | null,
  priceId?: string | null,
  setupIntentId?: string | null,
  status?: string | null,
  stripeCustomerId?: string | null,
  subscriptionId?: string | null,
  updatedAt?: string | null,
};

export type UploadParticipantsReturnType = {
  __typename: "UploadParticipantsReturnType",
  count?: number | null,
  details?: UploadParticipantsReturnTypeDetails | null,
  duplicates?: string | null,
  message?: string | null,
  skipped?: number | null,
  success?: boolean | null,
};

export type UploadParticipantsReturnTypeDetails = {
  __typename: "UploadParticipantsReturnTypeDetails",
  dependentsCount?: number | null,
  eventId?: string | null,
  participantsCount?: number | null,
  skippedCount?: number | null,
};

export type ModelSubscriptionDependentFilterInput = {
  age?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionDependentFilterInput | null > | null,
  attendedDate?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionDependentFilterInput | null > | null,
  owner?: ModelStringInput | null,
  participantId?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionDocumentFolderFilterInput = {
  and?: Array< ModelSubscriptionDocumentFolderFilterInput | null > | null,
  color?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  icon?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  isDefault?: ModelSubscriptionBooleanInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionDocumentFolderFilterInput | null > | null,
  order?: ModelSubscriptionIntInput | null,
  owner?: ModelStringInput | null,
  parentFolderId?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionBooleanInput = {
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelSubscriptionIntInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionEmailLogFilterInput = {
  and?: Array< ModelSubscriptionEmailLogFilterInput | null > | null,
  attempts?: ModelSubscriptionIntInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  deliveredAt?: ModelSubscriptionStringInput | null,
  emailType?: ModelSubscriptionStringInput | null,
  errorMessage?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  language?: ModelSubscriptionStringInput | null,
  lastAttemptAt?: ModelSubscriptionStringInput | null,
  messageId?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionEmailLogFilterInput | null > | null,
  owner?: ModelStringInput | null,
  participantId?: ModelSubscriptionStringInput | null,
  sentAt?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  templateName?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionEventSupplierFilterInput = {
  and?: Array< ModelSubscriptionEventSupplierFilterInput | null > | null,
  approvalStatus?: ModelSubscriptionStringInput | null,
  approvedAt?: ModelSubscriptionStringInput | null,
  approvedBy?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currency?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  externalRef?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  invoiceS3Key?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionEventSupplierFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paidAt?: ModelSubscriptionStringInput | null,
  quoteAmount?: ModelSubscriptionFloatInput | null,
  rejectionReason?: ModelSubscriptionStringInput | null,
  requestedBy?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  supplierId?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionFloatInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionFidelizeIntegrationFilterInput = {
  and?: Array< ModelSubscriptionFidelizeIntegrationFilterInput | null > | null,
  apiKey?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  isActive?: ModelSubscriptionBooleanInput | null,
  lastSyncAt?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionFidelizeIntegrationFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionInvoiceFilterInput = {
  amount?: ModelSubscriptionFloatInput | null,
  and?: Array< ModelSubscriptionInvoiceFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currency?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  invoiceNumber?: ModelSubscriptionStringInput | null,
  invoicePdfUrl?: ModelSubscriptionStringInput | null,
  invoiceUrl?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionInvoiceFilterInput | null > | null,
  owner?: ModelStringInput | null,
  refundedAt?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  userId?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionNotionDocumentFilterInput = {
  and?: Array< ModelSubscriptionNotionDocumentFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  folderId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  importedAt?: ModelSubscriptionStringInput | null,
  notionLastEditedAt?: ModelSubscriptionStringInput | null,
  notionPageId?: ModelSubscriptionStringInput | null,
  notionPageUrl?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionNotionDocumentFilterInput | null > | null,
  owner?: ModelStringInput | null,
  s3Key?: ModelSubscriptionStringInput | null,
  title?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionNotionIntegrationFilterInput = {
  accessToken?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionNotionIntegrationFilterInput | null > | null,
  botId?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionNotionIntegrationFilterInput | null > | null,
  owner?: ModelStringInput | null,
  refreshToken?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  workspaceId?: ModelSubscriptionStringInput | null,
  workspaceName?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionParticipantFilterInput = {
  accommodationCost?: ModelSubscriptionFloatInput | null,
  and?: Array< ModelSubscriptionParticipantFilterInput | null > | null,
  arrivalAirport?: ModelSubscriptionStringInput | null,
  arrivalDate?: ModelSubscriptionStringInput | null,
  arrivalFlight?: ModelSubscriptionStringInput | null,
  arrivalLayovers?: ModelSubscriptionStringInput | null,
  arrivalTime?: ModelSubscriptionStringInput | null,
  attendedDate?: ModelSubscriptionStringInput | null,
  bookingAgency?: ModelSubscriptionStringInput | null,
  bookingReference?: ModelSubscriptionStringInput | null,
  checkInDate?: ModelSubscriptionStringInput | null,
  checkOutDate?: ModelSubscriptionStringInput | null,
  confirmationDate?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  departureAirport?: ModelSubscriptionStringInput | null,
  departureDate?: ModelSubscriptionStringInput | null,
  departureFlight?: ModelSubscriptionStringInput | null,
  departureTime?: ModelSubscriptionStringInput | null,
  dependentsCount?: ModelSubscriptionIntInput | null,
  dietaryRestriction?: ModelSubscriptionStringInput | null,
  documentLast4?: ModelSubscriptionStringInput | null,
  documentationType?: ModelSubscriptionStringInput | null,
  emergencyContact?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  hotel?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  internalId?: ModelSubscriptionStringInput | null,
  nationality?: ModelSubscriptionStringInput | null,
  nights?: ModelSubscriptionIntInput | null,
  or?: Array< ModelSubscriptionParticipantFilterInput | null > | null,
  organization?: ModelSubscriptionStringInput | null,
  owner?: ModelStringInput | null,
  participantEmail?: ModelSubscriptionStringInput | null,
  participantJob?: ModelSubscriptionStringInput | null,
  participantName?: ModelSubscriptionStringInput | null,
  participantNote?: ModelSubscriptionStringInput | null,
  participantPhone?: ModelSubscriptionStringInput | null,
  participantStatus?: ModelSubscriptionStringInput | null,
  paymentStatus?: ModelSubscriptionStringInput | null,
  photoUrl?: ModelSubscriptionStringInput | null,
  protocol?: ModelSubscriptionStringInput | null,
  rateCurrency?: ModelSubscriptionStringInput | null,
  ratePerNight?: ModelSubscriptionFloatInput | null,
  registrationDate?: ModelSubscriptionStringInput | null,
  residenceCountry?: ModelSubscriptionStringInput | null,
  roleId?: ModelSubscriptionStringInput | null,
  roomType?: ModelSubscriptionStringInput | null,
  taxesCurrency?: ModelSubscriptionStringInput | null,
  taxesExtras?: ModelSubscriptionFloatInput | null,
  ticketCurrency?: ModelSubscriptionStringInput | null,
  ticketFare?: ModelSubscriptionFloatInput | null,
  totalTravelCost?: ModelSubscriptionFloatInput | null,
  totalTravelCurrency?: ModelSubscriptionStringInput | null,
  transferCost?: ModelSubscriptionFloatInput | null,
  transferCurrency?: ModelSubscriptionStringInput | null,
  transferDetails?: ModelSubscriptionStringInput | null,
  transferRequired?: ModelSubscriptionBooleanInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  visaRequired?: ModelSubscriptionBooleanInput | null,
  visaSupport?: ModelSubscriptionBooleanInput | null,
};

export type ModelSubscriptionPaymentMethodDataFilterInput = {
  and?: Array< ModelSubscriptionPaymentMethodDataFilterInput | null > | null,
  brand?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  expiryMonth?: ModelSubscriptionIntInput | null,
  expiryYear?: ModelSubscriptionIntInput | null,
  id?: ModelSubscriptionStringInput | null,
  last4?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionPaymentMethodDataFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paymentMethodId?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionPlanPurchaseFilterInput = {
  amount?: ModelSubscriptionIntInput | null,
  and?: Array< ModelSubscriptionPlanPurchaseFilterInput | null > | null,
  consumedAt?: ModelSubscriptionStringInput | null,
  consumedByEventId?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currency?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionPlanPurchaseFilterInput | null > | null,
  owner?: ModelStringInput | null,
  planKey?: ModelSubscriptionStringInput | null,
  refundedAt?: ModelSubscriptionStringInput | null,
  stripeCheckoutSessionId?: ModelSubscriptionStringInput | null,
  stripePaymentIntentId?: ModelSubscriptionStringInput | null,
  tierKey?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  userId?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionProcessedStripeEventFilterInput = {
  and?: Array< ModelSubscriptionProcessedStripeEventFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionProcessedStripeEventFilterInput | null > | null,
  processedAt?: ModelSubscriptionStringInput | null,
  processedKey?: ModelSubscriptionStringInput | null,
  type?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRoleFilterInput = {
  and?: Array< ModelSubscriptionRoleFilterInput | null > | null,
  archived?: ModelSubscriptionBooleanInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  eventId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRoleFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionSupplierFilterInput = {
  address?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionSupplierFilterInput | null > | null,
  category?: ModelSubscriptionStringInput | null,
  contactEmail?: ModelSubscriptionStringInput | null,
  contactName?: ModelSubscriptionStringInput | null,
  contactPhone?: ModelSubscriptionStringInput | null,
  country?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currency?: ModelSubscriptionStringInput | null,
  estimateMaxAmount?: ModelSubscriptionFloatInput | null,
  estimateMinAmount?: ModelSubscriptionFloatInput | null,
  estimateUnit?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  name?: ModelSubscriptionStringInput | null,
  notes?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionSupplierFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paymentDetails?: ModelSubscriptionStringInput | null,
  tags?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  vatNumber?: ModelSubscriptionStringInput | null,
  website?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionUserSubscriptionFilterInput = {
  and?: Array< ModelSubscriptionUserSubscriptionFilterInput | null > | null,
  billingCycle?: ModelSubscriptionStringInput | null,
  cancelAt?: ModelSubscriptionStringInput | null,
  cancelAtPeriodEnd?: ModelSubscriptionBooleanInput | null,
  canceledAt?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  currentPeriodEnd?: ModelSubscriptionStringInput | null,
  currentPeriodStart?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionUserSubscriptionFilterInput | null > | null,
  owner?: ModelStringInput | null,
  paymentMethodId?: ModelSubscriptionStringInput | null,
  planName?: ModelSubscriptionStringInput | null,
  priceId?: ModelSubscriptionStringInput | null,
  setupIntentId?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  stripeCustomerId?: ModelSubscriptionStringInput | null,
  subscriptionId?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type CheckNotionUpdatesQueryVariables = {
  eventId: string,
  folderId: string,
};

export type CheckNotionUpdatesQuery = {
  checkNotionUpdates?:  {
    __typename: "CheckNotionUpdatesResult",
    error?: string | null,
    outdated?: number | null,
    total?: number | null,
    updates?:  Array< {
      __typename: "NotionUpdateItem",
      id: string,
      notionLastEditedAt?: string | null,
      notionPageId: string,
      s3Key: string,
      storedLastEditedAt?: string | null,
      title: string,
    } | null > | null,
  } | null,
};

export type GetAccountAccessQueryVariables = {
};

export type GetAccountAccessQuery = {
  getAccountAccess?:  {
    __typename: "AccountAccessResult",
    canCreateEvent?: boolean | null,
    planKey?: string | null,
    reason?: string | null,
  } | null,
};

export type GetDependentQueryVariables = {
  id: string,
};

export type GetDependentQuery = {
  getDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type GetDocumentFolderQueryVariables = {
  id: string,
};

export type GetDocumentFolderQuery = {
  getDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type GetEmailLogQueryVariables = {
  id: string,
};

export type GetEmailLogQuery = {
  getEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type GetEventQueryVariables = {
  id: string,
};

export type GetEventQuery = {
  getEvent?:  {
    __typename: "Event",
    budget?: number | null,
    categories?: Array< string | null > | null,
    collaborators?:  {
      __typename: "ModelEventCollaboratorConnection",
      nextToken?: string | null,
    } | null,
    committedExpenses?: number | null,
    createdAt: string,
    currency?: string | null,
    dependentCount?: number | null,
    description?: string | null,
    documentFolders?:  {
      __typename: "ModelDocumentFolderConnection",
      nextToken?: string | null,
    } | null,
    effectiveExpenses?: number | null,
    eventCreationDate?: string | null,
    eventDateType?: EventEventDateType | null,
    eventEndDate?: string | null,
    eventLocation?: string | null,
    eventManager?: string | null,
    eventManagerEmail?: string | null,
    eventManagerPhone?: string | null,
    eventSpecificDates?: Array< string | null > | null,
    eventStartDate?: string | null,
    eventStatus?: string | null,
    eventTime?: string | null,
    eventTitle?: string | null,
    eventType?: string | null,
    id: string,
    organizerId?: string | null,
    owner?: string | null,
    ownerEmail?: string | null,
    ownerName?: string | null,
    participantCount?: number | null,
    participantLimit?: number | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    planKey?: string | null,
    roles?:  {
      __typename: "ModelRoleConnection",
      nextToken?: string | null,
    } | null,
    suppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    totalRegistrations?: number | null,
    updatedAt: string,
  } | null,
};

export type GetEventAsCollaboratorQueryVariables = {
  eventId: string,
};

export type GetEventAsCollaboratorQuery = {
  getEventAsCollaborator?:  {
    __typename: "GetEventAsCollaboratorResult",
    access?:  {
      __typename: "EventAccessData",
      participantLimit?: number | null,
      planKey?: string | null,
      reason?: string | null,
      writable?: boolean | null,
    } | null,
    canViewTeamSchedule?: boolean | null,
    event?:  {
      __typename: "EventData",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt?: string | null,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: string | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      participantCount?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt?: string | null,
    } | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    userRole?: string | null,
  } | null,
};

export type GetEventCollaboratorQueryVariables = {
  id: string,
};

export type GetEventCollaboratorQuery = {
  getEventCollaborator?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type GetEventCollaboratorsQueryVariables = {
  eventId: string,
};

export type GetEventCollaboratorsQuery = {
  getEventCollaborators?:  {
    __typename: "GetEventCollaboratorsReturnType",
    items?:  Array< {
      __typename: "CollaborationData",
      acceptedAt?: string | null,
      canViewTeamSchedule?: boolean | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invitedAt: string,
      invitedBy: string,
      role: string,
      sharedFolderIds?: Array< string | null > | null,
      sharedSupplierIds?: Array< string | null > | null,
      status: string,
      updatedAt?: string | null,
      userEmail: string,
      userId?: string | null,
      userName?: string | null,
    } | null > | null,
  } | null,
};

export type GetEventFoldersQueryVariables = {
  eventId: string,
};

export type GetEventFoldersQuery = {
  getEventFolders?:  {
    __typename: "GetEventFoldersReturnType",
    items?:  Array< {
      __typename: "DocumentFolderData",
      color?: string | null,
      createdAt?: string | null,
      description?: string | null,
      eventId: string,
      icon?: string | null,
      id: string,
      isDefault?: boolean | null,
      name: string,
      order?: number | null,
      owner: string,
      parentFolderId?: string | null,
      updatedAt?: string | null,
    } | null > | null,
  } | null,
};

export type GetEventRolesQueryVariables = {
  eventId: string,
};

export type GetEventRolesQuery = {
  getEventRoles?:  {
    __typename: "GetEventRolesReturnType",
    items?:  Array< {
      __typename: "RoleData",
      createdAt?: string | null,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt?: string | null,
    } | null > | null,
  } | null,
};

export type GetEventScheduleEntryQueryVariables = {
  id: string,
};

export type GetEventScheduleEntryQuery = {
  getEventScheduleEntry?:  {
    __typename: "EventScheduleEntry",
    color?: string | null,
    createdAt?: string | null,
    date: string,
    description?: string | null,
    endTime?: string | null,
    eventId: string,
    id: string,
    location?: string | null,
    order?: number | null,
    owner?: string | null,
    participantIds?: Array< string | null > | null,
    startTime?: string | null,
    supplierId?: string | null,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type GetEventSupplierQueryVariables = {
  id: string,
};

export type GetEventSupplierQuery = {
  getEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type GetFidelizeIntegrationQueryVariables = {
  id: string,
};

export type GetFidelizeIntegrationQuery = {
  getFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type GetInvoiceQueryVariables = {
  id: string,
};

export type GetInvoiceQuery = {
  getInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type GetNotionDocumentQueryVariables = {
  id: string,
};

export type GetNotionDocumentQuery = {
  getNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type GetNotionIntegrationQueryVariables = {
  id: string,
};

export type GetNotionIntegrationQuery = {
  getNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type GetParticipantQueryVariables = {
  id: string,
};

export type GetParticipantQuery = {
  getParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type GetPaymentMethodDataQueryVariables = {
  id: string,
};

export type GetPaymentMethodDataQuery = {
  getPaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type GetPlanPurchaseQueryVariables = {
  id: string,
};

export type GetPlanPurchaseQuery = {
  getPlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type GetProcessedStripeEventQueryVariables = {
  id: string,
};

export type GetProcessedStripeEventQuery = {
  getProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRoleQueryVariables = {
  id: string,
};

export type GetRoleQuery = {
  getRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type GetSupplierQueryVariables = {
  id: string,
};

export type GetSupplierQuery = {
  getSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type GetSupplierForEventQueryVariables = {
  eventId: string,
  supplierId: string,
};

export type GetSupplierForEventQuery = {
  getSupplierForEvent?:  {
    __typename: "SupplierDetailData",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: string | null,
    id: string,
    name: string,
    notes?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type GetUserSubscriptionQueryVariables = {
  id: string,
};

export type GetUserSubscriptionQuery = {
  getUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type ListDependentsQueryVariables = {
  filter?: ModelDependentFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListDependentsQuery = {
  listDependents?:  {
    __typename: "ModelDependentConnection",
    items:  Array< {
      __typename: "Dependent",
      age?: DependentAge | null,
      attendedDate?: string | null,
      createdAt: string,
      eventId?: string | null,
      id: string,
      name?: string | null,
      owner?: string | null,
      participantId?: string | null,
      status?: DependentStatus | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListDocumentFolderByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelDocumentFolderFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListDocumentFolderByEventIdQuery = {
  listDocumentFolderByEventId?:  {
    __typename: "ModelDocumentFolderConnection",
    items:  Array< {
      __typename: "DocumentFolder",
      color?: string | null,
      createdAt?: string | null,
      description?: string | null,
      eventId: string,
      icon?: string | null,
      id: string,
      isDefault?: boolean | null,
      name: string,
      order?: number | null,
      owner?: string | null,
      parentFolderId?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListDocumentFoldersQueryVariables = {
  filter?: ModelDocumentFolderFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListDocumentFoldersQuery = {
  listDocumentFolders?:  {
    __typename: "ModelDocumentFolderConnection",
    items:  Array< {
      __typename: "DocumentFolder",
      color?: string | null,
      createdAt?: string | null,
      description?: string | null,
      eventId: string,
      icon?: string | null,
      id: string,
      isDefault?: boolean | null,
      name: string,
      order?: number | null,
      owner?: string | null,
      parentFolderId?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEmailLogByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelEmailLogFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEmailLogByEventIdQuery = {
  listEmailLogByEventId?:  {
    __typename: "ModelEmailLogConnection",
    items:  Array< {
      __typename: "EmailLog",
      attempts?: number | null,
      createdAt?: string | null,
      deliveredAt?: string | null,
      emailType?: EmailLogEmailType | null,
      errorMessage?: string | null,
      eventId?: string | null,
      id: string,
      language?: EmailLogLanguage | null,
      lastAttemptAt?: string | null,
      messageId?: string | null,
      owner?: string | null,
      participantId?: string | null,
      sentAt?: string | null,
      status?: EmailLogStatus | null,
      templateName?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEmailLogsQueryVariables = {
  filter?: ModelEmailLogFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEmailLogsQuery = {
  listEmailLogs?:  {
    __typename: "ModelEmailLogConnection",
    items:  Array< {
      __typename: "EmailLog",
      attempts?: number | null,
      createdAt?: string | null,
      deliveredAt?: string | null,
      emailType?: EmailLogEmailType | null,
      errorMessage?: string | null,
      eventId?: string | null,
      id: string,
      language?: EmailLogLanguage | null,
      lastAttemptAt?: string | null,
      messageId?: string | null,
      owner?: string | null,
      participantId?: string | null,
      sentAt?: string | null,
      status?: EmailLogStatus | null,
      templateName?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventByOrganizerIdQueryVariables = {
  filter?: ModelEventFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  organizerId: string,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventByOrganizerIdQuery = {
  listEventByOrganizerId?:  {
    __typename: "ModelEventConnection",
    items:  Array< {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventCollaboratorByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelEventCollaboratorFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventCollaboratorByEventIdQuery = {
  listEventCollaboratorByEventId?:  {
    __typename: "ModelEventCollaboratorConnection",
    items:  Array< {
      __typename: "EventCollaborator",
      acceptedAt?: string | null,
      canViewTeamSchedule?: boolean | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invitedAt: string,
      invitedBy: string,
      owner?: string | null,
      role?: EventCollaboratorRole | null,
      sharedFolderIds?: Array< string | null > | null,
      sharedSupplierIds?: Array< string | null > | null,
      status?: EventCollaboratorStatus | null,
      updatedAt?: string | null,
      userEmail: string,
      userId?: string | null,
      userName?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventCollaboratorByUserEmailQueryVariables = {
  filter?: ModelEventCollaboratorFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  userEmail: string,
};

export type ListEventCollaboratorByUserEmailQuery = {
  listEventCollaboratorByUserEmail?:  {
    __typename: "ModelEventCollaboratorConnection",
    items:  Array< {
      __typename: "EventCollaborator",
      acceptedAt?: string | null,
      canViewTeamSchedule?: boolean | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invitedAt: string,
      invitedBy: string,
      owner?: string | null,
      role?: EventCollaboratorRole | null,
      sharedFolderIds?: Array< string | null > | null,
      sharedSupplierIds?: Array< string | null > | null,
      status?: EventCollaboratorStatus | null,
      updatedAt?: string | null,
      userEmail: string,
      userId?: string | null,
      userName?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventCollaboratorByUserIdQueryVariables = {
  filter?: ModelEventCollaboratorFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  userId: string,
};

export type ListEventCollaboratorByUserIdQuery = {
  listEventCollaboratorByUserId?:  {
    __typename: "ModelEventCollaboratorConnection",
    items:  Array< {
      __typename: "EventCollaborator",
      acceptedAt?: string | null,
      canViewTeamSchedule?: boolean | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invitedAt: string,
      invitedBy: string,
      owner?: string | null,
      role?: EventCollaboratorRole | null,
      sharedFolderIds?: Array< string | null > | null,
      sharedSupplierIds?: Array< string | null > | null,
      status?: EventCollaboratorStatus | null,
      updatedAt?: string | null,
      userEmail: string,
      userId?: string | null,
      userName?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventCollaboratorsQueryVariables = {
  filter?: ModelEventCollaboratorFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventCollaboratorsQuery = {
  listEventCollaborators?:  {
    __typename: "ModelEventCollaboratorConnection",
    items:  Array< {
      __typename: "EventCollaborator",
      acceptedAt?: string | null,
      canViewTeamSchedule?: boolean | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invitedAt: string,
      invitedBy: string,
      owner?: string | null,
      role?: EventCollaboratorRole | null,
      sharedFolderIds?: Array< string | null > | null,
      sharedSupplierIds?: Array< string | null > | null,
      status?: EventCollaboratorStatus | null,
      updatedAt?: string | null,
      userEmail: string,
      userId?: string | null,
      userName?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventParticipantsQueryQueryVariables = {
  eventId: string,
};

export type ListEventParticipantsQueryQuery = {
  listEventParticipantsQuery?:  {
    __typename: "ListEventParticipantsResult",
    items?:  Array< {
      __typename: "ParticipantItemData",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt?: string | null,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId?: string | null,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName?: string | null,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: string | null,
      paymentStatus?: string | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt?: string | null,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null > | null,
    totalCount?: number | null,
  } | null,
};

export type ListEventScheduleQueryVariables = {
  eventId: string,
};

export type ListEventScheduleQuery = {
  listEventSchedule?:  {
    __typename: "ListScheduleEntriesResult",
    authors?:  Array< {
      __typename: "ScheduleAuthorData",
      name?: string | null,
      userId: string,
    } | null > | null,
    items?:  Array< {
      __typename: "ScheduleEntryData",
      color?: string | null,
      createdAt?: string | null,
      date: string,
      description?: string | null,
      endTime?: string | null,
      eventId: string,
      id: string,
      location?: string | null,
      order?: number | null,
      owner: string,
      participantIds?: Array< string | null > | null,
      startTime?: string | null,
      supplierId?: string | null,
      title: string,
      updatedAt?: string | null,
    } | null > | null,
  } | null,
};

export type ListEventScheduleEntriesQueryVariables = {
  filter?: ModelEventScheduleEntryFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventScheduleEntriesQuery = {
  listEventScheduleEntries?:  {
    __typename: "ModelEventScheduleEntryConnection",
    items:  Array< {
      __typename: "EventScheduleEntry",
      color?: string | null,
      createdAt?: string | null,
      date: string,
      description?: string | null,
      endTime?: string | null,
      eventId: string,
      id: string,
      location?: string | null,
      order?: number | null,
      owner?: string | null,
      participantIds?: Array< string | null > | null,
      startTime?: string | null,
      supplierId?: string | null,
      title: string,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventScheduleEntryByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelEventScheduleEntryFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventScheduleEntryByEventIdQuery = {
  listEventScheduleEntryByEventId?:  {
    __typename: "ModelEventScheduleEntryConnection",
    items:  Array< {
      __typename: "EventScheduleEntry",
      color?: string | null,
      createdAt?: string | null,
      date: string,
      description?: string | null,
      endTime?: string | null,
      eventId: string,
      id: string,
      location?: string | null,
      order?: number | null,
      owner?: string | null,
      participantIds?: Array< string | null > | null,
      startTime?: string | null,
      supplierId?: string | null,
      title: string,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventSupplierByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelEventSupplierFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventSupplierByEventIdQuery = {
  listEventSupplierByEventId?:  {
    __typename: "ModelEventSupplierConnection",
    items:  Array< {
      __typename: "EventSupplier",
      approvalStatus?: EventSupplierApprovalStatus | null,
      approvedAt?: string | null,
      approvedBy?: string | null,
      createdAt: string,
      currency?: string | null,
      description?: string | null,
      eventId: string,
      externalRef?: string | null,
      id: string,
      invoiceS3Key?: string | null,
      owner?: string | null,
      paidAt?: string | null,
      quoteAmount?: number | null,
      rejectionReason?: string | null,
      requestedBy?: string | null,
      status?: EventSupplierStatus | null,
      supplierId: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventSuppliersQueryVariables = {
  filter?: ModelEventSupplierFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListEventSuppliersQuery = {
  listEventSuppliers?:  {
    __typename: "ModelEventSupplierConnection",
    items:  Array< {
      __typename: "EventSupplier",
      approvalStatus?: EventSupplierApprovalStatus | null,
      approvedAt?: string | null,
      approvedBy?: string | null,
      createdAt: string,
      currency?: string | null,
      description?: string | null,
      eventId: string,
      externalRef?: string | null,
      id: string,
      invoiceS3Key?: string | null,
      owner?: string | null,
      paidAt?: string | null,
      quoteAmount?: number | null,
      rejectionReason?: string | null,
      requestedBy?: string | null,
      status?: EventSupplierStatus | null,
      supplierId: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEventSuppliersQueryQueryVariables = {
  eventId: string,
};

export type ListEventSuppliersQueryQuery = {
  listEventSuppliersQuery?:  {
    __typename: "ListEventSuppliersResult",
    eventData?:  {
      __typename: "EventDataSlice",
      budget?: number | null,
      committedExpenses?: number | null,
      effectiveExpenses?: number | null,
      eventTitle?: string | null,
      id: string,
    } | null,
    items?:  Array< {
      __typename: "EventSupplierItemData",
      approvalStatus?: string | null,
      approvedAt?: string | null,
      approvedBy?: string | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invoiceS3Key?: string | null,
      owner?: string | null,
      paidAt?: string | null,
      quoteAmount?: number | null,
      rejectionReason?: string | null,
      requestedBy?: string | null,
      status?: string | null,
      supplierId: string,
      updatedAt?: string | null,
    } | null > | null,
    sharedSuppliers?:  Array< {
      __typename: "SupplierSummaryData",
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      id: string,
      name: string,
    } | null > | null,
  } | null,
};

export type ListEventsQueryVariables = {
  filter?: ModelEventFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListEventsQuery = {
  listEvents?:  {
    __typename: "ModelEventConnection",
    items:  Array< {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListFidelizeIntegrationsQueryVariables = {
  filter?: ModelFidelizeIntegrationFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListFidelizeIntegrationsQuery = {
  listFidelizeIntegrations?:  {
    __typename: "ModelFidelizeIntegrationConnection",
    items:  Array< {
      __typename: "FidelizeIntegration",
      apiKey: string,
      createdAt?: string | null,
      id: string,
      isActive?: boolean | null,
      lastSyncAt?: string | null,
      owner?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListInvoicesQueryVariables = {
  filter?: ModelInvoiceFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListInvoicesQuery = {
  listInvoices?:  {
    __typename: "ModelInvoiceConnection",
    items:  Array< {
      __typename: "Invoice",
      amount?: number | null,
      createdAt?: string | null,
      currency?: string | null,
      id: string,
      invoiceNumber?: string | null,
      invoicePdfUrl?: string | null,
      invoiceUrl?: string | null,
      owner?: string | null,
      refundedAt?: string | null,
      status?: string | null,
      updatedAt?: string | null,
      userId?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListMyCollaboratedEventsQueryVariables = {
};

export type ListMyCollaboratedEventsQuery = {
  listMyCollaboratedEvents?:  Array< {
    __typename: "CollaboratedEventResult",
    collaboration?:  {
      __typename: "CollaborationData",
      acceptedAt?: string | null,
      canViewTeamSchedule?: boolean | null,
      createdAt?: string | null,
      eventId: string,
      id: string,
      invitedAt: string,
      invitedBy: string,
      role: string,
      sharedFolderIds?: Array< string | null > | null,
      sharedSupplierIds?: Array< string | null > | null,
      status: string,
      updatedAt?: string | null,
      userEmail: string,
      userId?: string | null,
      userName?: string | null,
    } | null,
    event?:  {
      __typename: "EventData",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt?: string | null,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: string | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      participantCount?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt?: string | null,
    } | null,
    userRole: string,
  } | null > | null,
};

export type ListMyPendingInvitationsQueryVariables = {
};

export type ListMyPendingInvitationsQuery = {
  listMyPendingInvitations?:  Array< {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null > | null,
};

export type ListNotionDocumentByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelNotionDocumentFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListNotionDocumentByEventIdQuery = {
  listNotionDocumentByEventId?:  {
    __typename: "ModelNotionDocumentConnection",
    items:  Array< {
      __typename: "NotionDocument",
      createdAt?: string | null,
      eventId: string,
      folderId?: string | null,
      id: string,
      importedAt?: string | null,
      notionLastEditedAt?: string | null,
      notionPageId: string,
      notionPageUrl?: string | null,
      owner?: string | null,
      s3Key: string,
      title: string,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListNotionDocumentByNotionPageIdAndEventIdQueryVariables = {
  eventId?: ModelStringKeyConditionInput | null,
  filter?: ModelNotionDocumentFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  notionPageId: string,
  sortDirection?: ModelSortDirection | null,
};

export type ListNotionDocumentByNotionPageIdAndEventIdQuery = {
  listNotionDocumentByNotionPageIdAndEventId?:  {
    __typename: "ModelNotionDocumentConnection",
    items:  Array< {
      __typename: "NotionDocument",
      createdAt?: string | null,
      eventId: string,
      folderId?: string | null,
      id: string,
      importedAt?: string | null,
      notionLastEditedAt?: string | null,
      notionPageId: string,
      notionPageUrl?: string | null,
      owner?: string | null,
      s3Key: string,
      title: string,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListNotionDocumentsQueryVariables = {
  filter?: ModelNotionDocumentFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListNotionDocumentsQuery = {
  listNotionDocuments?:  {
    __typename: "ModelNotionDocumentConnection",
    items:  Array< {
      __typename: "NotionDocument",
      createdAt?: string | null,
      eventId: string,
      folderId?: string | null,
      id: string,
      importedAt?: string | null,
      notionLastEditedAt?: string | null,
      notionPageId: string,
      notionPageUrl?: string | null,
      owner?: string | null,
      s3Key: string,
      title: string,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListNotionIntegrationsQueryVariables = {
  filter?: ModelNotionIntegrationFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListNotionIntegrationsQuery = {
  listNotionIntegrations?:  {
    __typename: "ModelNotionIntegrationConnection",
    items:  Array< {
      __typename: "NotionIntegration",
      accessToken: string,
      botId: string,
      createdAt?: string | null,
      id: string,
      owner?: string | null,
      refreshToken?: string | null,
      updatedAt?: string | null,
      workspaceId: string,
      workspaceName?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListNotionPagesQueryVariables = {
  cursor?: string | null,
  query?: string | null,
};

export type ListNotionPagesQuery = {
  listNotionPages?:  {
    __typename: "ListNotionPagesResult",
    error?: string | null,
    hasMore?: boolean | null,
    nextCursor?: string | null,
    pages?:  Array< {
      __typename: "NotionPageItem",
      icon?: string | null,
      id: string,
      lastEditedAt?: string | null,
      propertyCount?: number | null,
      subtitle?: string | null,
      title: string,
      type?: string | null,
      url?: string | null,
    } | null > | null,
  } | null,
};

export type ListParticipantsQueryVariables = {
  filter?: ModelParticipantFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListParticipantsQuery = {
  listParticipants?:  {
    __typename: "ModelParticipantConnection",
    items:  Array< {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListPaymentMethodDataQueryVariables = {
  filter?: ModelPaymentMethodDataFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPaymentMethodDataQuery = {
  listPaymentMethodData?:  {
    __typename: "ModelPaymentMethodDataConnection",
    items:  Array< {
      __typename: "PaymentMethodData",
      brand?: string | null,
      createdAt?: string | null,
      expiryMonth?: number | null,
      expiryYear?: number | null,
      id: string,
      last4?: string | null,
      owner?: string | null,
      paymentMethodId?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListPlanPurchaseByUserIdQueryVariables = {
  filter?: ModelPlanPurchaseFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  userId: string,
};

export type ListPlanPurchaseByUserIdQuery = {
  listPlanPurchaseByUserId?:  {
    __typename: "ModelPlanPurchaseConnection",
    items:  Array< {
      __typename: "PlanPurchase",
      amount?: number | null,
      consumedAt?: string | null,
      consumedByEventId?: string | null,
      createdAt?: string | null,
      currency?: string | null,
      id: string,
      owner?: string | null,
      planKey: string,
      refundedAt?: string | null,
      stripeCheckoutSessionId?: string | null,
      stripePaymentIntentId?: string | null,
      tierKey?: string | null,
      updatedAt?: string | null,
      userId: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListPlanPurchasesQueryVariables = {
  filter?: ModelPlanPurchaseFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPlanPurchasesQuery = {
  listPlanPurchases?:  {
    __typename: "ModelPlanPurchaseConnection",
    items:  Array< {
      __typename: "PlanPurchase",
      amount?: number | null,
      consumedAt?: string | null,
      consumedByEventId?: string | null,
      createdAt?: string | null,
      currency?: string | null,
      id: string,
      owner?: string | null,
      planKey: string,
      refundedAt?: string | null,
      stripeCheckoutSessionId?: string | null,
      stripePaymentIntentId?: string | null,
      tierKey?: string | null,
      updatedAt?: string | null,
      userId: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListProcessedStripeEventsQueryVariables = {
  filter?: ModelProcessedStripeEventFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProcessedStripeEventsQuery = {
  listProcessedStripeEvents?:  {
    __typename: "ModelProcessedStripeEventConnection",
    items:  Array< {
      __typename: "ProcessedStripeEvent",
      createdAt: string,
      eventId?: string | null,
      id: string,
      processedAt?: string | null,
      processedKey?: string | null,
      type?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRoleByEventIdQueryVariables = {
  eventId: string,
  filter?: ModelRoleFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRoleByEventIdQuery = {
  listRoleByEventId?:  {
    __typename: "ModelRoleConnection",
    items:  Array< {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRolesQueryVariables = {
  filter?: ModelRoleFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListRolesQuery = {
  listRoles?:  {
    __typename: "ModelRoleConnection",
    items:  Array< {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListSupplierByOwnerQueryVariables = {
  filter?: ModelSupplierFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  owner: string,
  sortDirection?: ModelSortDirection | null,
};

export type ListSupplierByOwnerQuery = {
  listSupplierByOwner?:  {
    __typename: "ModelSupplierConnection",
    items:  Array< {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListSuppliersQueryVariables = {
  filter?: ModelSupplierFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListSuppliersQuery = {
  listSuppliers?:  {
    __typename: "ModelSupplierConnection",
    items:  Array< {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListUserSubscriptionByStripeCustomerIdQueryVariables = {
  filter?: ModelUserSubscriptionFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  stripeCustomerId: string,
};

export type ListUserSubscriptionByStripeCustomerIdQuery = {
  listUserSubscriptionByStripeCustomerId?:  {
    __typename: "ModelUserSubscriptionConnection",
    items:  Array< {
      __typename: "UserSubscription",
      billingCycle?: string | null,
      cancelAt?: string | null,
      cancelAtPeriodEnd?: boolean | null,
      canceledAt?: string | null,
      createdAt?: string | null,
      currentPeriodEnd?: string | null,
      currentPeriodStart?: string | null,
      id: string,
      owner?: string | null,
      paymentMethodId?: string | null,
      planName?: string | null,
      priceId?: string | null,
      setupIntentId?: string | null,
      status?: string | null,
      stripeCustomerId?: string | null,
      subscriptionId?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListUserSubscriptionsQueryVariables = {
  filter?: ModelUserSubscriptionFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListUserSubscriptionsQuery = {
  listUserSubscriptions?:  {
    __typename: "ModelUserSubscriptionConnection",
    items:  Array< {
      __typename: "UserSubscription",
      billingCycle?: string | null,
      cancelAt?: string | null,
      cancelAtPeriodEnd?: boolean | null,
      canceledAt?: string | null,
      createdAt?: string | null,
      currentPeriodEnd?: string | null,
      currentPeriodStart?: string | null,
      id: string,
      owner?: string | null,
      paymentMethodId?: string | null,
      planName?: string | null,
      priceId?: string | null,
      setupIntentId?: string | null,
      status?: string | null,
      stripeCustomerId?: string | null,
      subscriptionId?: string | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type AcceptInvitationMutationVariables = {
  invitationId: string,
};

export type AcceptInvitationMutation = {
  acceptInvitation?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type AdjustApprovedEventSupplierQuoteMutationVariables = {
  eventSupplierId: string,
  newQuoteAmount: number,
};

export type AdjustApprovedEventSupplierQuoteMutation = {
  adjustApprovedEventSupplierQuote?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type ApproveSupplierSelectionMutationVariables = {
  approved: boolean,
  eventSupplierId: string,
  rejectionReason?: string | null,
};

export type ApproveSupplierSelectionMutation = {
  approveSupplierSelection?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type ConfirmParticipantMutationVariables = {
  attendedDate?: string | null,
  dependentUpdates?: string | null,
  eventId: string,
  language?: ConfirmParticipantLanguage | null,
  participantId?: string | null,
  participantStatus?: string | null,
};

export type ConfirmParticipantMutation = {
  confirmParticipant?:  {
    __typename: "ConfirmParticipantReturnType",
    message?: string | null,
    success?: boolean | null,
    updatedDependentsCount?: number | null,
  } | null,
};

export type CreateBillingPortalSessionMutationVariables = {
  returnUrl?: string | null,
};

export type CreateBillingPortalSessionMutation = {
  createBillingPortalSession?:  {
    __typename: "CreateBillingPortalSessionReturnType",
    message?: string | null,
    sessionUrl?: string | null,
    success?: boolean | null,
  } | null,
};

export type CreateCheckoutSessionMutationVariables = {
  billingCycle?: string | null,
  cancelUrl?: string | null,
  customerEmail?: string | null,
  eventId?: string | null,
  intent?: string | null,
  planKey?: string | null,
  successUrl?: string | null,
  tierKey?: string | null,
};

export type CreateCheckoutSessionMutation = {
  createCheckoutSession?:  {
    __typename: "CreateCheckoutSessionReturnType",
    message?: string | null,
    sessionUrl?: string | null,
    success?: boolean | null,
  } | null,
};

export type CreateDependentMutationVariables = {
  condition?: ModelDependentConditionInput | null,
  input: CreateDependentInput,
};

export type CreateDependentMutation = {
  createDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type CreateDependentCustomMutationVariables = {
  age?: string | null,
  eventId: string,
  name: string,
  participantId: string,
  status?: string | null,
};

export type CreateDependentCustomMutation = {
  createDependentCustom?:  {
    __typename: "CreateDependentCustomReturnType",
    age?: string | null,
    eventId?: string | null,
    id?: string | null,
    message?: string | null,
    name?: string | null,
    participantId?: string | null,
    status?: string | null,
    success?: boolean | null,
  } | null,
};

export type CreateDocumentFolderMutationVariables = {
  condition?: ModelDocumentFolderConditionInput | null,
  input: CreateDocumentFolderInput,
};

export type CreateDocumentFolderMutation = {
  createDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type CreateEmailLogMutationVariables = {
  condition?: ModelEmailLogConditionInput | null,
  input: CreateEmailLogInput,
};

export type CreateEmailLogMutation = {
  createEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type CreateEventMutationVariables = {
  budget?: number | null,
  categories?: Array< string | null > | null,
  currency?: string | null,
  description?: string | null,
  eventDateType?: string | null,
  eventEndDate?: string | null,
  eventLocation?: string | null,
  eventManager?: string | null,
  eventManagerEmail?: string | null,
  eventManagerPhone?: string | null,
  eventSpecificDates?: Array< string | null > | null,
  eventStartDate?: string | null,
  eventStatus?: string | null,
  eventTime?: string | null,
  eventTitle?: string | null,
  eventType?: string | null,
};

export type CreateEventMutation = {
  createEvent?:  {
    __typename: "CreateEventReturnType",
    event?: string | null,
    message?: string | null,
    success?: boolean | null,
  } | null,
};

export type CreateEventFolderMutationVariables = {
  color?: string | null,
  description?: string | null,
  eventId: string,
  isDefault?: boolean | null,
  name: string,
  order?: number | null,
  parentFolderId?: string | null,
};

export type CreateEventFolderMutation = {
  createEventFolder?:  {
    __typename: "DocumentFolderData",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner: string,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type CreateEventRoleMutationVariables = {
  eventId: string,
  name: string,
};

export type CreateEventRoleMutation = {
  createEventRole?:  {
    __typename: "RoleData",
    createdAt?: string | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type CreateEventSupplierMutationVariables = {
  condition?: ModelEventSupplierConditionInput | null,
  input: CreateEventSupplierInput,
};

export type CreateEventSupplierMutation = {
  createEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type CreateFidelizeIntegrationMutationVariables = {
  condition?: ModelFidelizeIntegrationConditionInput | null,
  input: CreateFidelizeIntegrationInput,
};

export type CreateFidelizeIntegrationMutation = {
  createFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type CreateInvoiceMutationVariables = {
  condition?: ModelInvoiceConditionInput | null,
  input: CreateInvoiceInput,
};

export type CreateInvoiceMutation = {
  createInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type CreateNotionDocumentMutationVariables = {
  condition?: ModelNotionDocumentConditionInput | null,
  input: CreateNotionDocumentInput,
};

export type CreateNotionDocumentMutation = {
  createNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type CreateNotionIntegrationMutationVariables = {
  condition?: ModelNotionIntegrationConditionInput | null,
  input: CreateNotionIntegrationInput,
};

export type CreateNotionIntegrationMutation = {
  createNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type CreateParticipantMutationVariables = {
  condition?: ModelParticipantConditionInput | null,
  input: CreateParticipantInput,
};

export type CreateParticipantMutation = {
  createParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type CreateParticipantAsCollaboratorMutationVariables = {
  accommodationCost?: number | null,
  arrivalAirport?: string | null,
  arrivalDate?: string | null,
  arrivalFlight?: string | null,
  arrivalLayovers?: string | null,
  arrivalTime?: string | null,
  bookingAgency?: string | null,
  bookingReference?: string | null,
  checkInDate?: string | null,
  checkOutDate?: string | null,
  departureAirport?: string | null,
  departureDate?: string | null,
  departureFlight?: string | null,
  departureTime?: string | null,
  dependentsCount?: number | null,
  dietaryRestriction?: string | null,
  documentLast4?: string | null,
  documentationType?: string | null,
  emergencyContact?: string | null,
  eventId: string,
  hotel?: string | null,
  internalId?: string | null,
  nationality?: string | null,
  nights?: number | null,
  organization?: string | null,
  participantEmail?: string | null,
  participantJob?: string | null,
  participantName?: string | null,
  participantNote?: string | null,
  participantPhone?: string | null,
  participantStatus?: string | null,
  paymentStatus?: string | null,
  photoUrl?: string | null,
  protocol?: string | null,
  rateCurrency?: string | null,
  ratePerNight?: number | null,
  registrationDate?: string | null,
  residenceCountry?: string | null,
  roleId?: string | null,
  roomType?: string | null,
  taxesCurrency?: string | null,
  taxesExtras?: number | null,
  ticketCurrency?: string | null,
  ticketFare?: number | null,
  totalTravelCost?: number | null,
  totalTravelCurrency?: string | null,
  transferCost?: number | null,
  transferCurrency?: string | null,
  transferDetails?: string | null,
  transferRequired?: boolean | null,
  visaRequired?: boolean | null,
  visaSupport?: boolean | null,
};

export type CreateParticipantAsCollaboratorMutation = {
  createParticipantAsCollaborator?:  {
    __typename: "ParticipantItemData",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt?: string | null,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  Array< {
      __typename: "DependentItemData",
      age?: string | null,
      attendedDate?: string | null,
      createdAt?: string | null,
      eventId?: string | null,
      id: string,
      name?: string | null,
      participantId?: string | null,
      status?: string | null,
      updatedAt?: string | null,
    } | null > | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    eventId?: string | null,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName?: string | null,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: string | null,
    paymentStatus?: string | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt?: string | null,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type CreatePaymentMethodDataMutationVariables = {
  condition?: ModelPaymentMethodDataConditionInput | null,
  input: CreatePaymentMethodDataInput,
};

export type CreatePaymentMethodDataMutation = {
  createPaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type CreatePlanPurchaseMutationVariables = {
  condition?: ModelPlanPurchaseConditionInput | null,
  input: CreatePlanPurchaseInput,
};

export type CreatePlanPurchaseMutation = {
  createPlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type CreateProcessedStripeEventMutationVariables = {
  condition?: ModelProcessedStripeEventConditionInput | null,
  input: CreateProcessedStripeEventInput,
};

export type CreateProcessedStripeEventMutation = {
  createProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRoleMutationVariables = {
  condition?: ModelRoleConditionInput | null,
  input: CreateRoleInput,
};

export type CreateRoleMutation = {
  createRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type CreateScheduleEntryMutationVariables = {
  color?: string | null,
  date: string,
  description?: string | null,
  endTime?: string | null,
  eventId: string,
  location?: string | null,
  order?: number | null,
  participantIds?: Array< string | null > | null,
  startTime?: string | null,
  supplierId?: string | null,
  title: string,
};

export type CreateScheduleEntryMutation = {
  createScheduleEntry?:  {
    __typename: "ScheduleEntryData",
    color?: string | null,
    createdAt?: string | null,
    date: string,
    description?: string | null,
    endTime?: string | null,
    eventId: string,
    id: string,
    location?: string | null,
    order?: number | null,
    owner: string,
    participantIds?: Array< string | null > | null,
    startTime?: string | null,
    supplierId?: string | null,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type CreateSupplierMutationVariables = {
  condition?: ModelSupplierConditionInput | null,
  input: CreateSupplierInput,
};

export type CreateSupplierMutation = {
  createSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type CreateUserSubscriptionMutationVariables = {
  condition?: ModelUserSubscriptionConditionInput | null,
  input: CreateUserSubscriptionInput,
};

export type CreateUserSubscriptionMutation = {
  createUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type DeclineInvitationMutationVariables = {
  invitationId: string,
};

export type DeclineInvitationMutation = {
  declineInvitation?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type DeleteDependentMutationVariables = {
  condition?: ModelDependentConditionInput | null,
  input: DeleteDependentInput,
};

export type DeleteDependentMutation = {
  deleteDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type DeleteDependentCustomMutationVariables = {
  id: string,
};

export type DeleteDependentCustomMutation = {
  deleteDependentCustom?:  {
    __typename: "DeleteDependentCustomReturnType",
    message?: string | null,
    success?: boolean | null,
  } | null,
};

export type DeleteDocumentFolderMutationVariables = {
  condition?: ModelDocumentFolderConditionInput | null,
  input: DeleteDocumentFolderInput,
};

export type DeleteDocumentFolderMutation = {
  deleteDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type DeleteEmailLogMutationVariables = {
  condition?: ModelEmailLogConditionInput | null,
  input: DeleteEmailLogInput,
};

export type DeleteEmailLogMutation = {
  deleteEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type DeleteEventCascadeMutationVariables = {
  eventId: string,
};

export type DeleteEventCascadeMutation = {
  deleteEventCascade?:  {
    __typename: "DeleteEventCascadeResult",
    deleted?:  {
      __typename: "DeleteEventCascadeCounts",
      collaborators?: number | null,
      dependents?: number | null,
      documentFolders?: number | null,
      emailLogs?: number | null,
      event?: number | null,
      eventSuppliers?: number | null,
      notionDocuments?: number | null,
      participants?: number | null,
      roles?: number | null,
      s3Objects?: number | null,
      scheduleEntries?: number | null,
    } | null,
    errors?: Array< string | null > | null,
    failed?:  {
      __typename: "DeleteEventCascadeCounts",
      collaborators?: number | null,
      dependents?: number | null,
      documentFolders?: number | null,
      emailLogs?: number | null,
      event?: number | null,
      eventSuppliers?: number | null,
      notionDocuments?: number | null,
      participants?: number | null,
      roles?: number | null,
      s3Objects?: number | null,
      scheduleEntries?: number | null,
    } | null,
    success: boolean,
  } | null,
};

export type DeleteEventFolderMutationVariables = {
  eventId: string,
  id: string,
};

export type DeleteEventFolderMutation = {
  deleteEventFolder?:  {
    __typename: "DeleteEventFolderReturnType",
    id?: string | null,
    success?: boolean | null,
  } | null,
};

export type DeleteEventRoleValidatedMutationVariables = {
  eventId: string,
  roleId: string,
};

export type DeleteEventRoleValidatedMutation = {
  deleteEventRoleValidated?:  {
    __typename: "DeleteRoleResult",
    participantCount: number,
    success: boolean,
  } | null,
};

export type DeleteEventSupplierMutationVariables = {
  condition?: ModelEventSupplierConditionInput | null,
  input: DeleteEventSupplierInput,
};

export type DeleteEventSupplierMutation = {
  deleteEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type DeleteFidelizeIntegrationMutationVariables = {
  condition?: ModelFidelizeIntegrationConditionInput | null,
  input: DeleteFidelizeIntegrationInput,
};

export type DeleteFidelizeIntegrationMutation = {
  deleteFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type DeleteInvoiceMutationVariables = {
  condition?: ModelInvoiceConditionInput | null,
  input: DeleteInvoiceInput,
};

export type DeleteInvoiceMutation = {
  deleteInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type DeleteNotionDocumentMutationVariables = {
  condition?: ModelNotionDocumentConditionInput | null,
  input: DeleteNotionDocumentInput,
};

export type DeleteNotionDocumentMutation = {
  deleteNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type DeleteNotionIntegrationMutationVariables = {
  condition?: ModelNotionIntegrationConditionInput | null,
  input: DeleteNotionIntegrationInput,
};

export type DeleteNotionIntegrationMutation = {
  deleteNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type DeleteParticipantMutationVariables = {
  condition?: ModelParticipantConditionInput | null,
  input: DeleteParticipantInput,
};

export type DeleteParticipantMutation = {
  deleteParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type DeleteParticipantsMutationVariables = {
  participantIds?: Array< string | null > | null,
};

export type DeleteParticipantsMutation = {
  deleteParticipants?: Array< string | null > | null,
};

export type DeletePaymentMethodDataMutationVariables = {
  condition?: ModelPaymentMethodDataConditionInput | null,
  input: DeletePaymentMethodDataInput,
};

export type DeletePaymentMethodDataMutation = {
  deletePaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type DeletePlanPurchaseMutationVariables = {
  condition?: ModelPlanPurchaseConditionInput | null,
  input: DeletePlanPurchaseInput,
};

export type DeletePlanPurchaseMutation = {
  deletePlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type DeleteProcessedStripeEventMutationVariables = {
  condition?: ModelProcessedStripeEventConditionInput | null,
  input: DeleteProcessedStripeEventInput,
};

export type DeleteProcessedStripeEventMutation = {
  deleteProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRoleMutationVariables = {
  condition?: ModelRoleConditionInput | null,
  input: DeleteRoleInput,
};

export type DeleteRoleMutation = {
  deleteRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type DeleteScheduleEntryMutationVariables = {
  eventId: string,
  id: string,
};

export type DeleteScheduleEntryMutation = {
  deleteScheduleEntry?:  {
    __typename: "DeleteScheduleEntryReturnType",
    id: string,
  } | null,
};

export type DeleteSupplierMutationVariables = {
  condition?: ModelSupplierConditionInput | null,
  input: DeleteSupplierInput,
};

export type DeleteSupplierMutation = {
  deleteSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type DeleteSupplierCustomMutationVariables = {
  supplierId: string,
};

export type DeleteSupplierCustomMutation = {
  deleteSupplierCustom?:  {
    __typename: "DeleteSupplierCustomReturnType",
    eventCount?: number | null,
    message?: string | null,
    success?: boolean | null,
  } | null,
};

export type DeleteUserDataMutationVariables = {
  sub?: string | null,
};

export type DeleteUserDataMutation = {
  deleteUserData?: boolean | null,
};

export type DeleteUserSubscriptionMutationVariables = {
  condition?: ModelUserSubscriptionConditionInput | null,
  input: DeleteUserSubscriptionInput,
};

export type DeleteUserSubscriptionMutation = {
  deleteUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type ExchangeNotionTokenMutationVariables = {
  code: string,
  redirectUri: string,
};

export type ExchangeNotionTokenMutation = {
  exchangeNotionToken?:  {
    __typename: "ExchangeNotionTokenResult",
    error?: string | null,
    success: boolean,
    workspaceName?: string | null,
  } | null,
};

export type HandleStripeWebhookMutationVariables = {
  body?: string | null,
  signature?: string | null,
};

export type HandleStripeWebhookMutation = {
  handleStripeWebhook?:  {
    __typename: "HandleStripeWebhookReturnType",
    eventType?: string | null,
    message?: string | null,
    planType?: string | null,
    success?: boolean | null,
  } | null,
};

export type ImportNormalizedEventSuppliersMutationVariables = {
  eventId: string,
  rows: string,
};

export type ImportNormalizedEventSuppliersMutation = {
  importNormalizedEventSuppliers?:  {
    __typename: "EventSupplierImportResult",
    eventSuppliersCreated?: number | null,
    message?: string | null,
    reason?: string | null,
    rowsAlreadyLinkedOnEvent?: number | null,
    rowsDuplicatedInBatch?: number | null,
    success?: boolean | null,
    suppliersCreated?: number | null,
    suppliersDeduplicatedInBatch?: number | null,
    suppliersReused?: number | null,
    validationErrorCount?: number | null,
  } | null,
};

export type ImportNormalizedParticipantsMutationVariables = {
  eventId: string,
  participants: string,
};

export type ImportNormalizedParticipantsMutation = {
  importNormalizedParticipants?:  {
    __typename: "ImportNormalizedParticipantsReturnType",
    count?: number | null,
    details?:  {
      __typename: "ImportNormalizedParticipantsReturnTypeDetails",
      dependentsCount?: number | null,
      eventId?: string | null,
      participantsCount?: number | null,
      skippedCount?: number | null,
    } | null,
    duplicates?: string | null,
    message?: string | null,
    skipped?: number | null,
    success?: boolean | null,
  } | null,
};

export type ImportNormalizedSuppliersMutationVariables = {
  rowOffset?: number | null,
  suppliers: string,
};

export type ImportNormalizedSuppliersMutation = {
  importNormalizedSuppliers?:  {
    __typename: "SupplierImportResult",
    duplicateCount?: number | null,
    message?: string | null,
    reason?: string | null,
    rowErrors?:  Array< {
      __typename: "SupplierImportRowError",
      message?: string | null,
      row?: number | null,
    } | null > | null,
    skippedCount?: number | null,
    success?: boolean | null,
    supplierCount?: number | null,
    validationErrorCount?: number | null,
    writeErrorCount?: number | null,
  } | null,
};

export type ImportNotionPagesMutationVariables = {
  eventId: string,
  folderId: string,
  pageIds?: Array< string > | null,
};

export type ImportNotionPagesMutation = {
  importNotionPages?:  {
    __typename: "ImportNotionPagesResult",
    documents?:  Array< {
      __typename: "ImportedNotionDoc",
      id: string,
      notionPageId: string,
      title: string,
    } | null > | null,
    errors?: Array< string | null > | null,
    failed?: number | null,
    imported?: number | null,
    success: boolean,
  } | null,
};

export type InviteCollaboratorMutationVariables = {
  email: string,
  eventId: string,
  language?: InviteCollaboratorLanguage | null,
  role?: InviteCollaboratorRole | null,
  sharedFolderIds?: Array< string | null > | null,
  sharedSupplierIds?: Array< string | null > | null,
};

export type InviteCollaboratorMutation = {
  inviteCollaborator?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type ProcessSupplierApprovalMutationVariables = {
  eventSupplierId: string,
  quoteAmount?: number | null,
};

export type ProcessSupplierApprovalMutation = {
  processSupplierApproval?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type ProcessSupplierPaymentMutationVariables = {
  eventSupplierId: string,
};

export type ProcessSupplierPaymentMutation = {
  processSupplierPayment?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type RemoveEventSupplierMutationVariables = {
  eventSupplierId: string,
};

export type RemoveEventSupplierMutation = {
  removeEventSupplier?:  {
    __typename: "RemoveEventSupplierReturnType",
    deletedEventSupplierId?: string | null,
    message?: string | null,
  } | null,
};

export type RevertEventSupplierApprovalMutationVariables = {
  eventSupplierId: string,
  newStatus?: RevertEventSupplierApprovalNewStatus | null,
};

export type RevertEventSupplierApprovalMutation = {
  revertEventSupplierApproval?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type RevokeCollaboratorMutationVariables = {
  collaboratorId: string,
};

export type RevokeCollaboratorMutation = {
  revokeCollaborator?: boolean | null,
};

export type SaveDocumentEditMutationVariables = {
  documentPath: string,
  eventId: string,
  folderId: string,
};

export type SaveDocumentEditMutation = {
  saveDocumentEdit?:  {
    __typename: "SaveDocumentEditReturnType",
    expiresIn?: number | null,
    presignedUrl?: string | null,
  } | null,
};

export type SaveFidelizeApiKeyMutationVariables = {
  apiKey: string,
};

export type SaveFidelizeApiKeyMutation = {
  saveFidelizeApiKey?:  {
    __typename: "SaveFidelizeApiKeyResult",
    error?: string | null,
    success: boolean,
  } | null,
};

export type SelectEventSupplierMutationVariables = {
  eventId: string,
  quoteAmount?: number | null,
  supplierId: string,
};

export type SelectEventSupplierMutation = {
  selectEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type SendEmailMutationVariables = {
  attachmentContent?: string | null,
  attachmentContentType?: string | null,
  attachmentFilename?: string | null,
  confirmationLink?: Array< string | null > | null,
  emailType?: SendEmailEmailType | null,
  eventCategories?: string | null,
  eventDate?: string | null,
  eventDateType?: string | null,
  eventEndDate?: string | null,
  eventId?: string | null,
  eventLocation?: string | null,
  eventManager?: string | null,
  eventManagerContact?: string | null,
  eventManagerName?: string | null,
  eventName?: string | null,
  eventSpecificDates?: Array< string | null > | null,
  eventStartDate?: string | null,
  eventTime?: string | null,
  eventTitle?: string | null,
  eventType?: string | null,
  language?: SendEmailLanguage | null,
  participantId?: Array< string | null > | null,
  participantName?: Array< string | null > | null,
  to?: Array< string | null > | null,
};

export type SendEmailMutation = {
  sendEmail?:  {
    __typename: "SendEmailReturnType",
    error?: string | null,
    message?: string | null,
    success?: boolean | null,
  } | null,
};

export type SyncFidelizeParticipantsMutationVariables = {
  eventId: string,
  page?: number | null,
  templateIds?: Array< number | null > | null,
};

export type SyncFidelizeParticipantsMutation = {
  syncFidelizeParticipants?:  {
    __typename: "FidelizeSyncResult",
    created?: number | null,
    errors?: Array< string | null > | null,
    hasMore?: boolean | null,
    nextPage?: number | null,
    skipped?: number | null,
    success: boolean,
    totalCards?: number | null,
    updated?: number | null,
  } | null,
};

export type SyncMyDisplayNameMutationVariables = {
};

export type SyncMyDisplayNameMutation = {
  syncMyDisplayName?:  {
    __typename: "SyncMyDisplayNameReturnType",
    updatedCollaborations?: number | null,
    updatedEvents?: number | null,
  } | null,
};

export type UpdateCollaboratorFoldersMutationVariables = {
  collaboratorId: string,
  sharedFolderIds: Array< string | null >,
};

export type UpdateCollaboratorFoldersMutation = {
  updateCollaboratorFolders?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type UpdateCollaboratorRoleMutationVariables = {
  collaboratorId: string,
  newRole: string,
};

export type UpdateCollaboratorRoleMutation = {
  updateCollaboratorRole?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type UpdateCollaboratorScheduleAccessMutationVariables = {
  canViewTeamSchedule: boolean,
  collaboratorId: string,
};

export type UpdateCollaboratorScheduleAccessMutation = {
  updateCollaboratorScheduleAccess?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type UpdateCollaboratorSuppliersMutationVariables = {
  collaboratorId: string,
  sharedSupplierIds: Array< string | null >,
};

export type UpdateCollaboratorSuppliersMutation = {
  updateCollaboratorSuppliers?:  {
    __typename: "EventCollaborator",
    acceptedAt?: string | null,
    canViewTeamSchedule?: boolean | null,
    createdAt?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    invitedAt: string,
    invitedBy: string,
    owner?: string | null,
    role?: EventCollaboratorRole | null,
    sharedFolderIds?: Array< string | null > | null,
    sharedSupplierIds?: Array< string | null > | null,
    status?: EventCollaboratorStatus | null,
    updatedAt?: string | null,
    userEmail: string,
    userId?: string | null,
    userName?: string | null,
  } | null,
};

export type UpdateDependentMutationVariables = {
  condition?: ModelDependentConditionInput | null,
  input: UpdateDependentInput,
};

export type UpdateDependentMutation = {
  updateDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type UpdateDependentCustomMutationVariables = {
  age?: string | null,
  id: string,
  name?: string | null,
};

export type UpdateDependentCustomMutation = {
  updateDependentCustom?:  {
    __typename: "UpdateDependentCustomReturnType",
    age?: string | null,
    attendedDate?: string | null,
    createdAt?: string | null,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participantId?: string | null,
    status?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateDocumentFolderMutationVariables = {
  condition?: ModelDocumentFolderConditionInput | null,
  input: UpdateDocumentFolderInput,
};

export type UpdateDocumentFolderMutation = {
  updateDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateEmailLogMutationVariables = {
  condition?: ModelEmailLogConditionInput | null,
  input: UpdateEmailLogInput,
};

export type UpdateEmailLogMutation = {
  updateEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateEventMutationVariables = {
  budget?: number | null,
  categories?: Array< string | null > | null,
  currency?: string | null,
  description?: string | null,
  eventDateType?: string | null,
  eventEndDate?: string | null,
  eventId: string,
  eventLocation?: string | null,
  eventManager?: string | null,
  eventManagerEmail?: string | null,
  eventManagerPhone?: string | null,
  eventSpecificDates?: Array< string | null > | null,
  eventStartDate?: string | null,
  eventStatus?: string | null,
  eventTime?: string | null,
  eventTitle?: string | null,
  eventType?: string | null,
};

export type UpdateEventMutation = {
  updateEvent?:  {
    __typename: "UpdateEventReturnType",
    event?: string | null,
    message?: string | null,
    success?: boolean | null,
  } | null,
};

export type UpdateEventFolderMutationVariables = {
  color?: string | null,
  description?: string | null,
  eventId: string,
  id: string,
  name?: string | null,
  order?: number | null,
};

export type UpdateEventFolderMutation = {
  updateEventFolder?:  {
    __typename: "DocumentFolderData",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner: string,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateEventRoleMutationVariables = {
  eventId: string,
  name: string,
  roleId: string,
};

export type UpdateEventRoleMutation = {
  updateEventRole?:  {
    __typename: "RoleData",
    createdAt?: string | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateEventSupplierMutationVariables = {
  condition?: ModelEventSupplierConditionInput | null,
  input: UpdateEventSupplierInput,
};

export type UpdateEventSupplierMutation = {
  updateEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type UpdateEventSupplierForRoleMutationVariables = {
  eventSupplierId: string,
  invoiceS3Key?: string | null,
  quoteAmount?: number | null,
  status?: string | null,
};

export type UpdateEventSupplierForRoleMutation = {
  updateEventSupplierForRole?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type UpdateFidelizeIntegrationMutationVariables = {
  condition?: ModelFidelizeIntegrationConditionInput | null,
  input: UpdateFidelizeIntegrationInput,
};

export type UpdateFidelizeIntegrationMutation = {
  updateFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateInvoiceMutationVariables = {
  condition?: ModelInvoiceConditionInput | null,
  input: UpdateInvoiceInput,
};

export type UpdateInvoiceMutation = {
  updateInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type UpdateNotionDocumentMutationVariables = {
  condition?: ModelNotionDocumentConditionInput | null,
  input: UpdateNotionDocumentInput,
};

export type UpdateNotionDocumentMutation = {
  updateNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type UpdateNotionIntegrationMutationVariables = {
  condition?: ModelNotionIntegrationConditionInput | null,
  input: UpdateNotionIntegrationInput,
};

export type UpdateNotionIntegrationMutation = {
  updateNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type UpdateParticipantMutationVariables = {
  condition?: ModelParticipantConditionInput | null,
  input: UpdateParticipantInput,
};

export type UpdateParticipantMutation = {
  updateParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type UpdateParticipantAsCollaboratorMutationVariables = {
  accommodationCost?: number | null,
  arrivalAirport?: string | null,
  arrivalDate?: string | null,
  arrivalFlight?: string | null,
  arrivalLayovers?: string | null,
  arrivalTime?: string | null,
  bookingAgency?: string | null,
  bookingReference?: string | null,
  checkInDate?: string | null,
  checkOutDate?: string | null,
  departureAirport?: string | null,
  departureDate?: string | null,
  departureFlight?: string | null,
  departureTime?: string | null,
  dietaryRestriction?: string | null,
  documentLast4?: string | null,
  documentationType?: string | null,
  emergencyContact?: string | null,
  eventId: string,
  hotel?: string | null,
  id: string,
  internalId?: string | null,
  nationality?: string | null,
  nights?: number | null,
  organization?: string | null,
  participantEmail?: string | null,
  participantJob?: string | null,
  participantName?: string | null,
  participantNote?: string | null,
  participantPhone?: string | null,
  participantStatus?: string | null,
  paymentStatus?: string | null,
  photoUrl?: string | null,
  protocol?: string | null,
  rateCurrency?: string | null,
  ratePerNight?: number | null,
  residenceCountry?: string | null,
  roleId?: string | null,
  roomType?: string | null,
  taxesCurrency?: string | null,
  taxesExtras?: number | null,
  ticketCurrency?: string | null,
  ticketFare?: number | null,
  totalTravelCost?: number | null,
  totalTravelCurrency?: string | null,
  transferCost?: number | null,
  transferCurrency?: string | null,
  transferDetails?: string | null,
  transferRequired?: boolean | null,
  visaRequired?: boolean | null,
  visaSupport?: boolean | null,
};

export type UpdateParticipantAsCollaboratorMutation = {
  updateParticipantAsCollaborator?:  {
    __typename: "ParticipantItemData",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt?: string | null,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  Array< {
      __typename: "DependentItemData",
      age?: string | null,
      attendedDate?: string | null,
      createdAt?: string | null,
      eventId?: string | null,
      id: string,
      name?: string | null,
      participantId?: string | null,
      status?: string | null,
      updatedAt?: string | null,
    } | null > | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    eventId?: string | null,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName?: string | null,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: string | null,
    paymentStatus?: string | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt?: string | null,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type UpdatePaymentMethodDataMutationVariables = {
  condition?: ModelPaymentMethodDataConditionInput | null,
  input: UpdatePaymentMethodDataInput,
};

export type UpdatePaymentMethodDataMutation = {
  updatePaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdatePlanPurchaseMutationVariables = {
  condition?: ModelPlanPurchaseConditionInput | null,
  input: UpdatePlanPurchaseInput,
};

export type UpdatePlanPurchaseMutation = {
  updatePlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type UpdateProcessedStripeEventMutationVariables = {
  condition?: ModelProcessedStripeEventConditionInput | null,
  input: UpdateProcessedStripeEventInput,
};

export type UpdateProcessedStripeEventMutation = {
  updateProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRoleMutationVariables = {
  condition?: ModelRoleConditionInput | null,
  input: UpdateRoleInput,
};

export type UpdateRoleMutation = {
  updateRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type UpdateScheduleEntryMutationVariables = {
  color?: string | null,
  date?: string | null,
  description?: string | null,
  endTime?: string | null,
  eventId: string,
  id: string,
  location?: string | null,
  order?: number | null,
  participantIds?: Array< string | null > | null,
  startTime?: string | null,
  supplierId?: string | null,
  title?: string | null,
};

export type UpdateScheduleEntryMutation = {
  updateScheduleEntry?:  {
    __typename: "ScheduleEntryData",
    color?: string | null,
    createdAt?: string | null,
    date: string,
    description?: string | null,
    endTime?: string | null,
    eventId: string,
    id: string,
    location?: string | null,
    order?: number | null,
    owner: string,
    participantIds?: Array< string | null > | null,
    startTime?: string | null,
    supplierId?: string | null,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type UpdateSupplierMutationVariables = {
  condition?: ModelSupplierConditionInput | null,
  input: UpdateSupplierInput,
};

export type UpdateSupplierMutation = {
  updateSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type UpdateUserSubscriptionMutationVariables = {
  condition?: ModelUserSubscriptionConditionInput | null,
  input: UpdateUserSubscriptionInput,
};

export type UpdateUserSubscriptionMutation = {
  updateUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type UploadParticipantsMutationVariables = {
  eventId?: string | null,
  file?: string | null,
};

export type UploadParticipantsMutation = {
  uploadParticipants?:  {
    __typename: "UploadParticipantsReturnType",
    count?: number | null,
    details?:  {
      __typename: "UploadParticipantsReturnTypeDetails",
      dependentsCount?: number | null,
      eventId?: string | null,
      participantsCount?: number | null,
      skippedCount?: number | null,
    } | null,
    duplicates?: string | null,
    message?: string | null,
    skipped?: number | null,
    success?: boolean | null,
  } | null,
};

export type UploadSupplierMutationVariables = {
  file: string,
};

export type UploadSupplierMutation = {
  uploadSupplier?:  {
    __typename: "SupplierImportResult",
    duplicateCount?: number | null,
    message?: string | null,
    reason?: string | null,
    rowErrors?:  Array< {
      __typename: "SupplierImportRowError",
      message?: string | null,
      row?: number | null,
    } | null > | null,
    skippedCount?: number | null,
    success?: boolean | null,
    supplierCount?: number | null,
    validationErrorCount?: number | null,
    writeErrorCount?: number | null,
  } | null,
};

export type OnCreateDependentSubscriptionVariables = {
  filter?: ModelSubscriptionDependentFilterInput | null,
  owner?: string | null,
};

export type OnCreateDependentSubscription = {
  onCreateDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type OnCreateDocumentFolderSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentFolderFilterInput | null,
  owner?: string | null,
};

export type OnCreateDocumentFolderSubscription = {
  onCreateDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnCreateEmailLogSubscriptionVariables = {
  filter?: ModelSubscriptionEmailLogFilterInput | null,
  owner?: string | null,
};

export type OnCreateEmailLogSubscription = {
  onCreateEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnCreateEventSupplierSubscriptionVariables = {
  filter?: ModelSubscriptionEventSupplierFilterInput | null,
  owner?: string | null,
};

export type OnCreateEventSupplierSubscription = {
  onCreateEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type OnCreateFidelizeIntegrationSubscriptionVariables = {
  filter?: ModelSubscriptionFidelizeIntegrationFilterInput | null,
  owner?: string | null,
};

export type OnCreateFidelizeIntegrationSubscription = {
  onCreateFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnCreateInvoiceSubscriptionVariables = {
  filter?: ModelSubscriptionInvoiceFilterInput | null,
  owner?: string | null,
};

export type OnCreateInvoiceSubscription = {
  onCreateInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type OnCreateNotionDocumentSubscriptionVariables = {
  filter?: ModelSubscriptionNotionDocumentFilterInput | null,
  owner?: string | null,
};

export type OnCreateNotionDocumentSubscription = {
  onCreateNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type OnCreateNotionIntegrationSubscriptionVariables = {
  filter?: ModelSubscriptionNotionIntegrationFilterInput | null,
  owner?: string | null,
};

export type OnCreateNotionIntegrationSubscription = {
  onCreateNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type OnCreateParticipantSubscriptionVariables = {
  filter?: ModelSubscriptionParticipantFilterInput | null,
  owner?: string | null,
};

export type OnCreateParticipantSubscription = {
  onCreateParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type OnCreatePaymentMethodDataSubscriptionVariables = {
  filter?: ModelSubscriptionPaymentMethodDataFilterInput | null,
  owner?: string | null,
};

export type OnCreatePaymentMethodDataSubscription = {
  onCreatePaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnCreatePlanPurchaseSubscriptionVariables = {
  filter?: ModelSubscriptionPlanPurchaseFilterInput | null,
  owner?: string | null,
};

export type OnCreatePlanPurchaseSubscription = {
  onCreatePlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type OnCreateProcessedStripeEventSubscriptionVariables = {
  filter?: ModelSubscriptionProcessedStripeEventFilterInput | null,
};

export type OnCreateProcessedStripeEventSubscription = {
  onCreateProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRoleSubscriptionVariables = {
  filter?: ModelSubscriptionRoleFilterInput | null,
  owner?: string | null,
};

export type OnCreateRoleSubscription = {
  onCreateRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type OnCreateSupplierSubscriptionVariables = {
  filter?: ModelSubscriptionSupplierFilterInput | null,
  owner?: string | null,
};

export type OnCreateSupplierSubscription = {
  onCreateSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type OnCreateUserSubscriptionSubscriptionVariables = {
  filter?: ModelSubscriptionUserSubscriptionFilterInput | null,
  owner?: string | null,
};

export type OnCreateUserSubscriptionSubscription = {
  onCreateUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnDeleteDependentSubscriptionVariables = {
  filter?: ModelSubscriptionDependentFilterInput | null,
  owner?: string | null,
};

export type OnDeleteDependentSubscription = {
  onDeleteDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteDocumentFolderSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentFolderFilterInput | null,
  owner?: string | null,
};

export type OnDeleteDocumentFolderSubscription = {
  onDeleteDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnDeleteEmailLogSubscriptionVariables = {
  filter?: ModelSubscriptionEmailLogFilterInput | null,
  owner?: string | null,
};

export type OnDeleteEmailLogSubscription = {
  onDeleteEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnDeleteEventSupplierSubscriptionVariables = {
  filter?: ModelSubscriptionEventSupplierFilterInput | null,
  owner?: string | null,
};

export type OnDeleteEventSupplierSubscription = {
  onDeleteEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteFidelizeIntegrationSubscriptionVariables = {
  filter?: ModelSubscriptionFidelizeIntegrationFilterInput | null,
  owner?: string | null,
};

export type OnDeleteFidelizeIntegrationSubscription = {
  onDeleteFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnDeleteInvoiceSubscriptionVariables = {
  filter?: ModelSubscriptionInvoiceFilterInput | null,
  owner?: string | null,
};

export type OnDeleteInvoiceSubscription = {
  onDeleteInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type OnDeleteNotionDocumentSubscriptionVariables = {
  filter?: ModelSubscriptionNotionDocumentFilterInput | null,
  owner?: string | null,
};

export type OnDeleteNotionDocumentSubscription = {
  onDeleteNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type OnDeleteNotionIntegrationSubscriptionVariables = {
  filter?: ModelSubscriptionNotionIntegrationFilterInput | null,
  owner?: string | null,
};

export type OnDeleteNotionIntegrationSubscription = {
  onDeleteNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type OnDeleteParticipantSubscriptionVariables = {
  filter?: ModelSubscriptionParticipantFilterInput | null,
  owner?: string | null,
};

export type OnDeleteParticipantSubscription = {
  onDeleteParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type OnDeletePaymentMethodDataSubscriptionVariables = {
  filter?: ModelSubscriptionPaymentMethodDataFilterInput | null,
  owner?: string | null,
};

export type OnDeletePaymentMethodDataSubscription = {
  onDeletePaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnDeletePlanPurchaseSubscriptionVariables = {
  filter?: ModelSubscriptionPlanPurchaseFilterInput | null,
  owner?: string | null,
};

export type OnDeletePlanPurchaseSubscription = {
  onDeletePlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type OnDeleteProcessedStripeEventSubscriptionVariables = {
  filter?: ModelSubscriptionProcessedStripeEventFilterInput | null,
};

export type OnDeleteProcessedStripeEventSubscription = {
  onDeleteProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRoleSubscriptionVariables = {
  filter?: ModelSubscriptionRoleFilterInput | null,
  owner?: string | null,
};

export type OnDeleteRoleSubscription = {
  onDeleteRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteSupplierSubscriptionVariables = {
  filter?: ModelSubscriptionSupplierFilterInput | null,
  owner?: string | null,
};

export type OnDeleteSupplierSubscription = {
  onDeleteSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type OnDeleteUserSubscriptionSubscriptionVariables = {
  filter?: ModelSubscriptionUserSubscriptionFilterInput | null,
  owner?: string | null,
};

export type OnDeleteUserSubscriptionSubscription = {
  onDeleteUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdateDependentSubscriptionVariables = {
  filter?: ModelSubscriptionDependentFilterInput | null,
  owner?: string | null,
};

export type OnUpdateDependentSubscription = {
  onUpdateDependent?:  {
    __typename: "Dependent",
    age?: DependentAge | null,
    attendedDate?: string | null,
    createdAt: string,
    eventId?: string | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    participant?:  {
      __typename: "Participant",
      accommodationCost?: number | null,
      arrivalAirport?: string | null,
      arrivalDate?: string | null,
      arrivalFlight?: string | null,
      arrivalLayovers?: string | null,
      arrivalTime?: string | null,
      attendedDate?: string | null,
      bookingAgency?: string | null,
      bookingReference?: string | null,
      checkInDate?: string | null,
      checkOutDate?: string | null,
      confirmationDate?: string | null,
      createdAt: string,
      departureAirport?: string | null,
      departureDate?: string | null,
      departureFlight?: string | null,
      departureTime?: string | null,
      dependentsCount?: number | null,
      dietaryRestriction?: string | null,
      documentLast4?: string | null,
      documentationType?: string | null,
      emergencyContact?: string | null,
      eventId: string,
      hotel?: string | null,
      id: string,
      internalId?: string | null,
      nationality?: string | null,
      nights?: number | null,
      organization?: string | null,
      owner?: string | null,
      participantEmail?: string | null,
      participantJob?: string | null,
      participantName: string,
      participantNote?: string | null,
      participantPhone?: string | null,
      participantStatus?: ParticipantParticipantStatus | null,
      paymentStatus?: ParticipantPaymentStatus | null,
      photoUrl?: string | null,
      protocol?: string | null,
      rateCurrency?: string | null,
      ratePerNight?: number | null,
      registrationDate?: string | null,
      residenceCountry?: string | null,
      roleId?: string | null,
      roomType?: string | null,
      taxesCurrency?: string | null,
      taxesExtras?: number | null,
      ticketCurrency?: string | null,
      ticketFare?: number | null,
      totalTravelCost?: number | null,
      totalTravelCurrency?: string | null,
      transferCost?: number | null,
      transferCurrency?: string | null,
      transferDetails?: string | null,
      transferRequired?: boolean | null,
      updatedAt: string,
      visaRequired?: boolean | null,
      visaSupport?: boolean | null,
    } | null,
    participantId?: string | null,
    status?: DependentStatus | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateDocumentFolderSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentFolderFilterInput | null,
  owner?: string | null,
};

export type OnUpdateDocumentFolderSubscription = {
  onUpdateDocumentFolder?:  {
    __typename: "DocumentFolder",
    color?: string | null,
    createdAt?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    icon?: string | null,
    id: string,
    isDefault?: boolean | null,
    name: string,
    order?: number | null,
    owner?: string | null,
    parentFolderId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdateEmailLogSubscriptionVariables = {
  filter?: ModelSubscriptionEmailLogFilterInput | null,
  owner?: string | null,
};

export type OnUpdateEmailLogSubscription = {
  onUpdateEmailLog?:  {
    __typename: "EmailLog",
    attempts?: number | null,
    createdAt?: string | null,
    deliveredAt?: string | null,
    emailType?: EmailLogEmailType | null,
    errorMessage?: string | null,
    eventId?: string | null,
    id: string,
    language?: EmailLogLanguage | null,
    lastAttemptAt?: string | null,
    messageId?: string | null,
    owner?: string | null,
    participantId?: string | null,
    sentAt?: string | null,
    status?: EmailLogStatus | null,
    templateName?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdateEventSupplierSubscriptionVariables = {
  filter?: ModelSubscriptionEventSupplierFilterInput | null,
  owner?: string | null,
};

export type OnUpdateEventSupplierSubscription = {
  onUpdateEventSupplier?:  {
    __typename: "EventSupplier",
    approvalStatus?: EventSupplierApprovalStatus | null,
    approvedAt?: string | null,
    approvedBy?: string | null,
    createdAt: string,
    currency?: string | null,
    description?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    externalRef?: string | null,
    id: string,
    invoiceS3Key?: string | null,
    owner?: string | null,
    paidAt?: string | null,
    quoteAmount?: number | null,
    rejectionReason?: string | null,
    requestedBy?: string | null,
    status?: EventSupplierStatus | null,
    supplier?:  {
      __typename: "Supplier",
      address?: string | null,
      category?: string | null,
      contactEmail?: string | null,
      contactName?: string | null,
      contactPhone?: string | null,
      country?: string | null,
      createdAt: string,
      currency?: string | null,
      estimateMaxAmount?: number | null,
      estimateMinAmount?: number | null,
      estimateUnit?: SupplierEstimateUnit | null,
      id: string,
      name: string,
      notes?: string | null,
      owner?: string | null,
      paymentDetails?: string | null,
      tags?: Array< string | null > | null,
      updatedAt: string,
      vatNumber?: string | null,
      website?: string | null,
    } | null,
    supplierId: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateFidelizeIntegrationSubscriptionVariables = {
  filter?: ModelSubscriptionFidelizeIntegrationFilterInput | null,
  owner?: string | null,
};

export type OnUpdateFidelizeIntegrationSubscription = {
  onUpdateFidelizeIntegration?:  {
    __typename: "FidelizeIntegration",
    apiKey: string,
    createdAt?: string | null,
    id: string,
    isActive?: boolean | null,
    lastSyncAt?: string | null,
    owner?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdateInvoiceSubscriptionVariables = {
  filter?: ModelSubscriptionInvoiceFilterInput | null,
  owner?: string | null,
};

export type OnUpdateInvoiceSubscription = {
  onUpdateInvoice?:  {
    __typename: "Invoice",
    amount?: number | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    invoiceNumber?: string | null,
    invoicePdfUrl?: string | null,
    invoiceUrl?: string | null,
    owner?: string | null,
    refundedAt?: string | null,
    status?: string | null,
    updatedAt?: string | null,
    userId?: string | null,
  } | null,
};

export type OnUpdateNotionDocumentSubscriptionVariables = {
  filter?: ModelSubscriptionNotionDocumentFilterInput | null,
  owner?: string | null,
};

export type OnUpdateNotionDocumentSubscription = {
  onUpdateNotionDocument?:  {
    __typename: "NotionDocument",
    createdAt?: string | null,
    eventId: string,
    folderId?: string | null,
    id: string,
    importedAt?: string | null,
    notionLastEditedAt?: string | null,
    notionPageId: string,
    notionPageUrl?: string | null,
    owner?: string | null,
    s3Key: string,
    title: string,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdateNotionIntegrationSubscriptionVariables = {
  filter?: ModelSubscriptionNotionIntegrationFilterInput | null,
  owner?: string | null,
};

export type OnUpdateNotionIntegrationSubscription = {
  onUpdateNotionIntegration?:  {
    __typename: "NotionIntegration",
    accessToken: string,
    botId: string,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    refreshToken?: string | null,
    updatedAt?: string | null,
    workspaceId: string,
    workspaceName?: string | null,
  } | null,
};

export type OnUpdateParticipantSubscriptionVariables = {
  filter?: ModelSubscriptionParticipantFilterInput | null,
  owner?: string | null,
};

export type OnUpdateParticipantSubscription = {
  onUpdateParticipant?:  {
    __typename: "Participant",
    accommodationCost?: number | null,
    arrivalAirport?: string | null,
    arrivalDate?: string | null,
    arrivalFlight?: string | null,
    arrivalLayovers?: string | null,
    arrivalTime?: string | null,
    attendedDate?: string | null,
    bookingAgency?: string | null,
    bookingReference?: string | null,
    checkInDate?: string | null,
    checkOutDate?: string | null,
    confirmationDate?: string | null,
    createdAt: string,
    departureAirport?: string | null,
    departureDate?: string | null,
    departureFlight?: string | null,
    departureTime?: string | null,
    dependents?:  {
      __typename: "ModelDependentConnection",
      nextToken?: string | null,
    } | null,
    dependentsCount?: number | null,
    dietaryRestriction?: string | null,
    documentLast4?: string | null,
    documentationType?: string | null,
    emergencyContact?: string | null,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    hotel?: string | null,
    id: string,
    internalId?: string | null,
    nationality?: string | null,
    nights?: number | null,
    organization?: string | null,
    owner?: string | null,
    participantEmail?: string | null,
    participantJob?: string | null,
    participantName: string,
    participantNote?: string | null,
    participantPhone?: string | null,
    participantStatus?: ParticipantParticipantStatus | null,
    paymentStatus?: ParticipantPaymentStatus | null,
    photoUrl?: string | null,
    protocol?: string | null,
    rateCurrency?: string | null,
    ratePerNight?: number | null,
    registrationDate?: string | null,
    residenceCountry?: string | null,
    role?:  {
      __typename: "Role",
      archived?: boolean | null,
      createdAt: string,
      eventId: string,
      id: string,
      name: string,
      owner?: string | null,
      updatedAt: string,
    } | null,
    roleId?: string | null,
    roomType?: string | null,
    taxesCurrency?: string | null,
    taxesExtras?: number | null,
    ticketCurrency?: string | null,
    ticketFare?: number | null,
    totalTravelCost?: number | null,
    totalTravelCurrency?: string | null,
    transferCost?: number | null,
    transferCurrency?: string | null,
    transferDetails?: string | null,
    transferRequired?: boolean | null,
    updatedAt: string,
    visaRequired?: boolean | null,
    visaSupport?: boolean | null,
  } | null,
};

export type OnUpdatePaymentMethodDataSubscriptionVariables = {
  filter?: ModelSubscriptionPaymentMethodDataFilterInput | null,
  owner?: string | null,
};

export type OnUpdatePaymentMethodDataSubscription = {
  onUpdatePaymentMethodData?:  {
    __typename: "PaymentMethodData",
    brand?: string | null,
    createdAt?: string | null,
    expiryMonth?: number | null,
    expiryYear?: number | null,
    id: string,
    last4?: string | null,
    owner?: string | null,
    paymentMethodId?: string | null,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdatePlanPurchaseSubscriptionVariables = {
  filter?: ModelSubscriptionPlanPurchaseFilterInput | null,
  owner?: string | null,
};

export type OnUpdatePlanPurchaseSubscription = {
  onUpdatePlanPurchase?:  {
    __typename: "PlanPurchase",
    amount?: number | null,
    consumedAt?: string | null,
    consumedByEventId?: string | null,
    createdAt?: string | null,
    currency?: string | null,
    id: string,
    owner?: string | null,
    planKey: string,
    refundedAt?: string | null,
    stripeCheckoutSessionId?: string | null,
    stripePaymentIntentId?: string | null,
    tierKey?: string | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type OnUpdateProcessedStripeEventSubscriptionVariables = {
  filter?: ModelSubscriptionProcessedStripeEventFilterInput | null,
};

export type OnUpdateProcessedStripeEventSubscription = {
  onUpdateProcessedStripeEvent?:  {
    __typename: "ProcessedStripeEvent",
    createdAt: string,
    eventId?: string | null,
    id: string,
    processedAt?: string | null,
    processedKey?: string | null,
    type?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRoleSubscriptionVariables = {
  filter?: ModelSubscriptionRoleFilterInput | null,
  owner?: string | null,
};

export type OnUpdateRoleSubscription = {
  onUpdateRole?:  {
    __typename: "Role",
    archived?: boolean | null,
    createdAt: string,
    event?:  {
      __typename: "Event",
      budget?: number | null,
      categories?: Array< string | null > | null,
      committedExpenses?: number | null,
      createdAt: string,
      currency?: string | null,
      dependentCount?: number | null,
      description?: string | null,
      effectiveExpenses?: number | null,
      eventCreationDate?: string | null,
      eventDateType?: EventEventDateType | null,
      eventEndDate?: string | null,
      eventLocation?: string | null,
      eventManager?: string | null,
      eventManagerEmail?: string | null,
      eventManagerPhone?: string | null,
      eventSpecificDates?: Array< string | null > | null,
      eventStartDate?: string | null,
      eventStatus?: string | null,
      eventTime?: string | null,
      eventTitle?: string | null,
      eventType?: string | null,
      id: string,
      organizerId?: string | null,
      owner?: string | null,
      ownerEmail?: string | null,
      ownerName?: string | null,
      participantCount?: number | null,
      participantLimit?: number | null,
      planKey?: string | null,
      totalRegistrations?: number | null,
      updatedAt: string,
    } | null,
    eventId: string,
    id: string,
    name: string,
    owner?: string | null,
    participants?:  {
      __typename: "ModelParticipantConnection",
      nextToken?: string | null,
    } | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateSupplierSubscriptionVariables = {
  filter?: ModelSubscriptionSupplierFilterInput | null,
  owner?: string | null,
};

export type OnUpdateSupplierSubscription = {
  onUpdateSupplier?:  {
    __typename: "Supplier",
    address?: string | null,
    category?: string | null,
    contactEmail?: string | null,
    contactName?: string | null,
    contactPhone?: string | null,
    country?: string | null,
    createdAt: string,
    currency?: string | null,
    estimateMaxAmount?: number | null,
    estimateMinAmount?: number | null,
    estimateUnit?: SupplierEstimateUnit | null,
    eventSuppliers?:  {
      __typename: "ModelEventSupplierConnection",
      nextToken?: string | null,
    } | null,
    id: string,
    name: string,
    notes?: string | null,
    owner?: string | null,
    paymentDetails?: string | null,
    tags?: Array< string | null > | null,
    updatedAt: string,
    vatNumber?: string | null,
    website?: string | null,
  } | null,
};

export type OnUpdateUserSubscriptionSubscriptionVariables = {
  filter?: ModelSubscriptionUserSubscriptionFilterInput | null,
  owner?: string | null,
};

export type OnUpdateUserSubscriptionSubscription = {
  onUpdateUserSubscription?:  {
    __typename: "UserSubscription",
    billingCycle?: string | null,
    cancelAt?: string | null,
    cancelAtPeriodEnd?: boolean | null,
    canceledAt?: string | null,
    createdAt?: string | null,
    currentPeriodEnd?: string | null,
    currentPeriodStart?: string | null,
    id: string,
    owner?: string | null,
    paymentMethodId?: string | null,
    planName?: string | null,
    priceId?: string | null,
    setupIntentId?: string | null,
    status?: string | null,
    stripeCustomerId?: string | null,
    subscriptionId?: string | null,
    updatedAt?: string | null,
  } | null,
};
