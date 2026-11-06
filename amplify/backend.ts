import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { Aspects, CfnResource, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';

// Auth Function resources
import { postConfirmation } from './auth/post-confirmation/resource';
import { customMessage } from './auth/custom-message/resource';

// App Function resources
import { deleteParticipants } from './function/delete-participants/resource';
import { deleteDependent } from './function/delete-dependent/resource';
import { updateDependentFunction } from './function/update-dependent/resource';
import { createDependentFunction } from './function/create-dependent/resource';
import { uploadParticipants } from './function/upload-participant/resource';
import { deleteUserDataFunction } from './function/delete-user-data/resource';
import { deleteEventCascadeFunction } from './function/delete-event-cascade/resource';
import { sendEmail } from './function/send-email/resource';
import { confirmParticipant } from './function/confirm-participant/resource';
import { processEmailQueue } from './function/send-email/process-email-queue/resource';
import { createQueueResources } from './function/send-email/process-email-queue/resource';
import { updateEventBudgetFunction } from './function/supplier/resource';
import { processSupplierPaymentFunction } from './function/process-supplier-payment/resource';
import { removeEventSupplierFunction } from './function/remove-eventSupplier/resource';
import { revertEventSupplierApproval } from './function/rever-event-supplier-aproval/resource';
import { adjustApprovedEventSupplierQuote } from './function/adjust-approved-event-supplier-quote/resource';
import { uploadSupplierFunction } from './function/upload-supplier/resource';
import { importNormalizedParticipantsFunction } from './function/import-normalized-participants/resource';
import { importNormalizedSuppliersFunction } from './function/import-normalized-suppliers/resource';
import { importNormalizedEventSuppliersFunction } from './function/import-normalized-event-suppliers/resource';
import { eventStream } from './function/eventStream/resource';
import { participantStream } from './function/participant-stream/resource';
import { dependentStream } from './function/dependent-stream/resource';
// Stripe Function resources
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { handleStripeWebhook } from './function/handle-stripe-webhook/resource';
import { saveEarlyAccessLeadFunction } from './function/save-early-access-lead/resource';
import { createCheckoutSession } from './function/create-checkout-session/resource';
import { createBillingPortalSession } from './function/create-biling-portal-session/resource';
// Collaborator Function resources (ACCESS_LEVELS_STRATEGY.md)
import { inviteCollaboratorFunction } from './function/invite-collaborator/resource';
import { acceptInvitationFunction } from './function/accept-invitation/resource';
import { declineInvitationFunction } from './function/decline-invitation/resource';
import { revokeCollaboratorFunction } from './function/revoke-collaborator/resource';
import { listMyPendingInvitationsFunction } from './function/list-my-pending-invitations/resource';
import { listMyCollaboratedEventsFunction } from './function/list-my-collaborated-events/resource';
import { getEventAsCollaboratorFunction } from './function/get-event-as-collaborator/resource';
import { listEventCollaboratorsFunction } from './function/list-event-collaborators/resource';
import { listEventFoldersFunction } from './function/list-event-folders/resource';
import { updateCollaboratorFoldersFunction } from './function/update-collaborator-folders/resource';
import { updateCollaboratorSuppliersFunction } from './function/update-collaborator-suppliers/resource';
import { updateCollaboratorRoleFunction } from './function/update-collaborator-role/resource';
import { updateCollaboratorScheduleAccessFunction } from './function/update-collaborator-schedule-access/resource';
// Supplier Selection functions (ACCESS_LEVELS_STRATEGY.md - approval flow)
import { selectEventSupplierFunction } from './function/select-event-supplier/resource';
import { approveSupplierSelectionFunction } from './function/approve-supplier-selection/resource';
import { updateEventSupplierForRoleFunction } from './function/update-event-supplier-for-role/resource';
// List event suppliers (collaborator-aware, bypasses owner auth)
import { listEventSuppliersFunction } from './function/list-event-suppliers/resource';
// List event participants (collaborator-aware, bypasses owner auth)
import { listEventParticipantsFunction } from './function/list-event-participants/resource';
// Create participant as collaborator (bypasses owner auth, sets event owner as record owner)
import { createParticipantCollaboratorFunction } from './function/create-participant-collaborator/resource';
// Update participant as collaborator (bypasses owner auth)
import { updateParticipantCollaboratorFunction } from './function/update-participant-collaborator/resource';
// Get supplier details scoped to event (bypasses owner auth with event-level access check)
import { getSupplierForEventFunction } from './function/get-supplier-for-event/resource';
// create-event (gate de conta + snapshot planKey — substitui a mutation automática)
import { createEventFunction } from './function/events/create-event/resource';
// update-event (role event:edit + janela de escrita — substitui a mutation automática)
import { updateEventFunction } from './function/events/update-event/resource';
import { syncMyDisplayNameFunction } from './function/events/sync-my-display-name/resource';
// get-account-access (query de acesso de conta para a UI)
import { getAccountAccessFunction } from './function/billing/get-account-access/resource';
// Role functions (event-scoped roles for collaborator access)
import { listEventRolesFunction } from './function/list-event-roles/resource';
import { createEventRoleFunction } from './function/create-event-role/resource';
import { updateEventRoleFunction } from './function/update-event-role/resource';
import { deleteEventRoleValidatedFunction } from './function/delete-event-role-validated/resource';
// Folder CRUD functions (ADR-021: Lambda-backed folder operations)
import { createEventFolderFunction } from './function/create-event-folder/resource';
import { updateEventFolderFunction } from './function/update-event-folder/resource';
import { deleteEventFolderFunction } from './function/delete-event-folder/resource';
import { deleteSupplierFunction } from './function/delete-supplier/resource';
// Fidelize integration functions
import { fidelizeSaveApiKeyFunction } from './function/fidelize-save-api-key/resource';
import { fidelizeSyncParticipantsFunction } from './function/fidelize-sync-participants/resource';
import * as kms from 'aws-cdk-lib/aws-kms';
// Notion integration functions
import { notionExchangeTokenFunction } from './function/notion-exchange-token/resource';
import { notionListPagesFunction } from './function/notion-list-pages/resource';
import { notionImportPagesFunction } from './function/notion-import-pages/resource';
import { notionCheckUpdatesFunction } from './function/notion-check-updates/resource';
// Document editing functions
import { saveDocumentEditFunction } from './function/save-document-edit/resource';
// Schedule functions (ADR-029)
import { listEventScheduleFunction } from './function/list-event-schedule/resource';
import { createEventScheduleEntryFunction as createScheduleEntryFunction } from './function/create-event-schedule-entry/resource';
import { updateScheduleEntryFunction } from './function/update-schedule-entry/resource';
import { deleteScheduleEntryFunction } from './function/delete-schedule-entry/resource';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ 
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
  postConfirmation: {
    ...postConfirmation,
    monitoring: { enabled: false }
  },
  customMessage: {
    ...customMessage,
    monitoring: { enabled: false }
  },
  deleteParticipants: {
    ...deleteParticipants,
    monitoring: { enabled: false }
  },
  deleteEventCascade: {
    ...deleteEventCascadeFunction,
    monitoring: { enabled: false }
  },
  deleteDependent: {
    ...deleteDependent,
    monitoring: { enabled: false }
  },
  updateDependent: {
    ...updateDependentFunction,
    monitoring: { enabled: false }
  },
  createDependent: {
    ...createDependentFunction,
    monitoring: { enabled: false }
  },
  uploadParticipants: {
    ...uploadParticipants,
    monitoring: { enabled: false }
  },
  deleteUserData: {
    ...deleteUserDataFunction,
    monitoring: { enabled: false }
  },
  sendEmail: {
    ...sendEmail,
    monitoring: { enabled: false }
  },
  confirmParticipant: {
    ...confirmParticipant,
    monitoring: { enabled: false }
  },
  handleStripeWebhook: {
    ...handleStripeWebhook,
    monitoring: { enabled: false }
  },
  saveEarlyAccessLead: {
    ...saveEarlyAccessLeadFunction,
    monitoring: { enabled: false }
  },
  createCheckoutSession: {
    ...createCheckoutSession,
    monitoring: { enabled: false }
  },
  createBillingPortalSession: {
    ...createBillingPortalSession,
    monitoring: { enabled: false }
  },
  processEmailQueue: {
    ...processEmailQueue,
    monitoring: { enabled: false }
  },
  updateEventBudget: {
    ...updateEventBudgetFunction,
    monitoring: { enabled: false }
  },
  processSupplierPayment: {
    ...processSupplierPaymentFunction,
    monitoring: { enabled: false }
  },
  removeEventSupplier: {
    ...removeEventSupplierFunction,
    monitoring: { enabled: false }
  },
  revertEventSupplierApproval: {
    ...revertEventSupplierApproval,
    monitoring: { enabled: false }
  },
  adjustApprovedEventSupplierQuote: {
    ...adjustApprovedEventSupplierQuote,
    monitoring: { enabled: false }
  },
  uploadSupplier: {
    ...uploadSupplierFunction,
    monitoring: { enabled: false }
  },
  importNormalizedParticipants: {
    ...importNormalizedParticipantsFunction,
    monitoring: { enabled: false }
  },
  importNormalizedSuppliers: {
    ...importNormalizedSuppliersFunction,
    monitoring: { enabled: false }
  },
  importNormalizedEventSuppliers: {
    ...importNormalizedEventSuppliersFunction,
    monitoring: { enabled: false }
  },
  // Event Stream Lambda definition
  eventStream: {
    ...eventStream,
    monitoring: { enabled: false }
  },
  // Participant Stream Lambda definition (updates participantCount + totalRegistrations)
  participantStream: {
    ...participantStream,
    monitoring: { enabled: false }
  },
  // Dependent Stream Lambda definition (updates dependentCount + totalRegistrations)
  dependentStream: {
    ...dependentStream,
    monitoring: { enabled: false }
  },
  // Collaborator Lambda definitions (ACCESS_LEVELS_STRATEGY.md)
  inviteCollaborator: {
    ...inviteCollaboratorFunction,
    monitoring: { enabled: false }
  },
  acceptInvitation: {
    ...acceptInvitationFunction,
    monitoring: { enabled: false }
  },
  declineInvitation: {
    ...declineInvitationFunction,
    monitoring: { enabled: false }
  },
  revokeCollaborator: {
    ...revokeCollaboratorFunction,
    monitoring: { enabled: false }
  },
  listMyPendingInvitations: {
    ...listMyPendingInvitationsFunction,
    monitoring: { enabled: false }
  },
  listMyCollaboratedEvents: {
    ...listMyCollaboratedEventsFunction,
    monitoring: { enabled: false }
  },
  getEventAsCollaborator: {
    ...getEventAsCollaboratorFunction,
    monitoring: { enabled: false }
  },
  listEventCollaborators: {
    ...listEventCollaboratorsFunction,
    monitoring: { enabled: false }
  },
  listEventFolders: {
    ...listEventFoldersFunction,
    monitoring: { enabled: false }
  },
  listEventSchedule: {
    ...listEventScheduleFunction,
    monitoring: { enabled: false }
  },
  createScheduleEntry: {
    ...createScheduleEntryFunction,
    monitoring: { enabled: false }
  },
  updateScheduleEntry: {
    ...updateScheduleEntryFunction,
    monitoring: { enabled: false }
  },
  deleteScheduleEntry: {
    ...deleteScheduleEntryFunction,
    monitoring: { enabled: false }
  },
  updateCollaboratorFolders: {
    ...updateCollaboratorFoldersFunction,
    monitoring: { enabled: false }
  },
  updateCollaboratorSuppliers: {
    ...updateCollaboratorSuppliersFunction,
    monitoring: { enabled: false }
  },
  updateCollaboratorRole: {
    ...updateCollaboratorRoleFunction,
    monitoring: { enabled: false }
  },
  updateCollaboratorScheduleAccess: {
    ...updateCollaboratorScheduleAccessFunction,
    monitoring: { enabled: false }
  },
  // Supplier Selection functions (ACCESS_LEVELS_STRATEGY.md - approval flow)
  selectEventSupplier: {
    ...selectEventSupplierFunction,
    monitoring: { enabled: false }
  },
  approveSupplierSelection: {
    ...approveSupplierSelectionFunction,
    monitoring: { enabled: false }
  },
  updateEventSupplierForRole: {
    ...updateEventSupplierForRoleFunction,
    monitoring: { enabled: false }
  },
  listEventSuppliers: {
    ...listEventSuppliersFunction,
    monitoring: { enabled: false }
  },
  listEventParticipants: {
    ...listEventParticipantsFunction,
    monitoring: { enabled: false }
  },
  createParticipantCollaborator: {
    ...createParticipantCollaboratorFunction,
    monitoring: { enabled: false }
  },
  updateParticipantCollaborator: {
    ...updateParticipantCollaboratorFunction,
    monitoring: { enabled: false }
  },
  getSupplierForEvent: {
    ...getSupplierForEventFunction,
    monitoring: { enabled: false }
  },
  // Role functions (event-scoped roles for collaborator access)
  listEventRoles: {
    ...listEventRolesFunction,
    monitoring: { enabled: false }
  },
  createEvent: {
    ...createEventFunction,
    monitoring: { enabled: false }
  },
  updateEvent: {
    ...updateEventFunction,
    monitoring: { enabled: false }
  },
  syncMyDisplayName: {
    ...syncMyDisplayNameFunction,
    monitoring: { enabled: false }
  },
  getAccountAccess: {
    ...getAccountAccessFunction,
    monitoring: { enabled: false }
  },
  createEventRole: {
    ...createEventRoleFunction,
    monitoring: { enabled: false }
  },
  updateEventRole: {
    ...updateEventRoleFunction,
    monitoring: { enabled: false }
  },
  deleteEventRoleValidated: {
    ...deleteEventRoleValidatedFunction,
    monitoring: { enabled: false }
  },
  // Folder CRUD functions (ADR-021)
  createEventFolder: {
    ...createEventFolderFunction,
    monitoring: { enabled: false }
  },
  updateEventFolder: {
    ...updateEventFolderFunction,
    monitoring: { enabled: false }
  },
  deleteEventFolder: {
    ...deleteEventFolderFunction,
    monitoring: { enabled: false }
  },
  deleteSupplier: {
    ...deleteSupplierFunction,
    monitoring: { enabled: false }
  },
  // Fidelize integration functions
  fidelizeSaveApiKey: {
    ...fidelizeSaveApiKeyFunction,
    monitoring: { enabled: false }
  },
  fidelizeSyncParticipants: {
    ...fidelizeSyncParticipantsFunction,
    monitoring: { enabled: false }
  },
  // Notion integration functions
  notionExchangeToken: {
    ...notionExchangeTokenFunction,
    monitoring: { enabled: false }
  },
  notionListPages: {
    ...notionListPagesFunction,
    monitoring: { enabled: false }
  },
  notionImportPages: {
    ...notionImportPagesFunction,
    monitoring: { enabled: false }
  },
  notionCheckUpdates: notionCheckUpdatesFunction,
  // Document editing functions
  saveDocumentEdit: {
    ...saveDocumentEditFunction,
    monitoring: { enabled: false }
  },
});

// Create queue resources
const { queue, deadLetterQueue, queueUrl, dlqUrl } = createQueueResources(backend.processEmailQueue.resources.lambda);

// Acesso pessoal ao S3 para quem pertence a um grupo (issue #162 / achado do
// review de storage). O post-confirmation inscreve toda a gente em USER, e o
// Cognito faz a sessão assumir o ROLE DO GRUPO — o role 'authenticated', onde
// o allow.entity('identity') gera a policy escopada, nunca chega a ser usado.
// Como o allow.groups() do defineStorage substitui {entity_id} por '*', exprimir
// isto no storage/resource.ts daria a qualquer membro poder sobre os ficheiros
// de todos. Fica aqui, com a variável de sessão que a AWS resolve no pedido.
// A policy vive no stack do storage: pendurá-la no role a partir do stack de
// auth faria auth depender de storage, e storage já depende de auth (circular).
const userStorageBucket = backend.storage.resources.bucket;
const storageStack = Stack.of(userStorageBucket);
const identityScopedStorageAccess = new iam.PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [
    `${userStorageBucket.bucketArn}/profile-pictures/\${cognito-identity.amazonaws.com:sub}/*`,
    `${userStorageBucket.bucketArn}/documents/\${cognito-identity.amazonaws.com:sub}/*`,
  ],
});
// O ListBucket é sobre o bucket inteiro, por isso o escopo vai na condição de
// prefixo — sem isto o list() da limpeza de conta (issue #162) dá AccessDenied,
// já que o ListBucket que os grupos têm está condicionado a event-documents/.
const identityScopedStorageList = new iam.PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [userStorageBucket.bucketArn],
  conditions: {
    StringLike: {
      's3:prefix': [
        'profile-pictures/${cognito-identity.amazonaws.com:sub}/*',
        'documents/${cognito-identity.amazonaws.com:sub}/*',
      ],
    },
  },
});
for (const groupName of ['USER', 'ADMIN']) {
  const groupRole = iam.Role.fromRoleArn(
    storageStack,
    `${groupName}GroupRoleIdentityScopedStorage`,
    backend.auth.resources.groups[groupName].role.roleArn,
    { mutable: true }
  );
  groupRole.addToPrincipalPolicy(identityScopedStorageAccess);
  groupRole.addToPrincipalPolicy(identityScopedStorageList);
}

// Add environment variables for storage bucket
backend.deleteUserData.addEnvironment('BAFATORIO_APP_S3_BUCKET_NAME', backend.storage.resources.bucket.bucketName);

// Add environment variables for DynamoDB tables to delete participants function
backend.deleteParticipants.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.deleteParticipants.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.deleteParticipants.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteParticipants.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);

// Add environment variables for DynamoDB tables to delete dependent function
backend.deleteDependent.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.deleteDependent.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.deleteDependent.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteDependent.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);

// Add environment variables for DynamoDB tables to update dependent function
backend.updateDependent.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.updateDependent.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateDependent.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateDependent.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for DynamoDB tables to create dependent function
backend.createDependent.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.createDependent.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.createDependent.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.createDependent.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.createDependent.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for DynamoDB tables to upload participants function
backend.uploadParticipants.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.uploadParticipants.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.uploadParticipants.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.uploadParticipants.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.uploadParticipants.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.uploadParticipants.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);

// Add environment variables for EventSupplier-related Lambda functions
backend.updateEventBudget.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateEventBudget.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.updateEventBudget.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.updateEventBudget.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateEventBudget.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.processSupplierPayment.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.processSupplierPayment.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.processSupplierPayment.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.processSupplierPayment.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.removeEventSupplier.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.removeEventSupplier.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.removeEventSupplier.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.removeEventSupplier.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.deleteSupplier.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.deleteSupplier.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.deleteSupplier.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.revertEventSupplierApproval.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.revertEventSupplierApproval.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.revertEventSupplierApproval.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.revertEventSupplierApproval.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.adjustApprovedEventSupplierQuote.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.adjustApprovedEventSupplierQuote.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.adjustApprovedEventSupplierQuote.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.adjustApprovedEventSupplierQuote.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for deleteUserData function (needs all tables for complete data deletion)
backend.deleteUserData.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME', backend.data.resources.tables['PaymentMethodData'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_INVOICE_TABLE_NAME', backend.data.resources.tables['Invoice'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_EMAIL_LOG_TABLE_NAME', backend.data.resources.tables['EmailLog'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
// Registos financeiros: a eliminação anonimiza-os em vez de os apagar.
backend.deleteUserData.addEnvironment('BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME', backend.data.resources.tables['PlanPurchase'].tableName);
// Tabelas extra do cascade partilhado (ADR-035)
backend.deleteUserData.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_EVENT_SCHEDULE_ENTRY_TABLE_NAME', backend.data.resources.tables['EventScheduleEntry'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_NOTION_DOCUMENT_TABLE_NAME', backend.data.resources.tables['NotionDocument'].tableName);
backend.deleteUserData.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Environment variables for deleteEventCascade (ADR-035 — all event child tables + S3)
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_EVENT_SCHEDULE_ENTRY_TABLE_NAME', backend.data.resources.tables['EventScheduleEntry'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_NOTION_DOCUMENT_TABLE_NAME', backend.data.resources.tables['NotionDocument'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_EMAIL_LOG_TABLE_NAME', backend.data.resources.tables['EmailLog'].tableName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_S3_BUCKET_NAME', backend.storage.resources.bucket.bucketName);
backend.deleteEventCascade.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for uploadSupplier function
backend.uploadSupplier.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.uploadSupplier.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Environment variables for importNormalizedParticipants
backend.importNormalizedParticipants.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.importNormalizedParticipants.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.importNormalizedParticipants.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.importNormalizedParticipants.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.importNormalizedParticipants.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.importNormalizedParticipants.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Environment variables for importNormalizedSuppliers
backend.importNormalizedSuppliers.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.importNormalizedSuppliers.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.importNormalizedSuppliers.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.importNormalizedSuppliers.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.importNormalizedSuppliers.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.importNormalizedSuppliers.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Environment variables for importNormalizedEventSuppliers (dual-write: Supplier + EventSupplier)
backend.importNormalizedEventSuppliers.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.importNormalizedEventSuppliers.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.importNormalizedEventSuppliers.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.importNormalizedEventSuppliers.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.importNormalizedEventSuppliers.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for Collaborator functions (ACCESS_LEVELS_STRATEGY.md)
backend.inviteCollaborator.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.inviteCollaborator.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.inviteCollaborator.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
// O guard de auto-convite compara o email REAL de quem convida, e os access
// tokens não o trazem — tem de vir do Cognito.
backend.inviteCollaborator.addEnvironment('BAFATORIO_APP_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.inviteCollaborator.addEnvironment('EMAIL_QUEUE_URL', queueUrl);
backend.inviteCollaborator.addEnvironment('BAFATORIO_APP_EMAIL_LOG_TABLE_NAME', backend.data.resources.tables['EmailLog'].tableName);
backend.inviteCollaborator.addEnvironment('BAFATORIO_APP_BASE_URL', process.env.BAFATORIO_APP_BASE_URL || 'https://bafatorio.com');

backend.acceptInvitation.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.acceptInvitation.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.acceptInvitation.addEnvironment('BAFATORIO_APP_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);

backend.declineInvitation.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.declineInvitation.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.declineInvitation.addEnvironment('BAFATORIO_APP_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);

backend.revokeCollaborator.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.revokeCollaborator.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.revokeCollaborator.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.listMyPendingInvitations.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listMyPendingInvitations.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.listMyPendingInvitations.addEnvironment('BAFATORIO_APP_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);

backend.listMyCollaboratedEvents.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listMyCollaboratedEvents.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listMyCollaboratedEvents.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.getEventAsCollaborator.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.getEventAsCollaborator.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.getEventAsCollaborator.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
backend.getEventAsCollaborator.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.listEventCollaborators.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listEventCollaborators.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listEventCollaborators.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.listEventFolders.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listEventFolders.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listEventFolders.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.listEventFolders.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.listEventSchedule.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listEventSchedule.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listEventSchedule.addEnvironment('BAFATORIO_APP_SCHEDULE_TABLE_NAME', backend.data.resources.tables['EventScheduleEntry'].tableName);
backend.listEventSchedule.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_SCHEDULE_TABLE_NAME', backend.data.resources.tables['EventScheduleEntry'].tableName);
backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.createScheduleEntry.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_SCHEDULE_TABLE_NAME', backend.data.resources.tables['EventScheduleEntry'].tableName);
backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.updateScheduleEntry.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.deleteScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteScheduleEntry.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.deleteScheduleEntry.addEnvironment('BAFATORIO_APP_SCHEDULE_TABLE_NAME', backend.data.resources.tables['EventScheduleEntry'].tableName);
backend.deleteScheduleEntry.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.updateCollaboratorFolders.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateCollaboratorFolders.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateCollaboratorFolders.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.updateCollaboratorSuppliers.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateCollaboratorSuppliers.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateCollaboratorSuppliers.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.updateCollaboratorRole.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateCollaboratorRole.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateCollaboratorRole.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.updateCollaboratorScheduleAccess.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateCollaboratorScheduleAccess.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateCollaboratorScheduleAccess.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for Supplier Selection functions (ACCESS_LEVELS_STRATEGY.md)
backend.selectEventSupplier.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.selectEventSupplier.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.selectEventSupplier.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.selectEventSupplier.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.selectEventSupplier.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.approveSupplierSelection.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.approveSupplierSelection.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.approveSupplierSelection.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.approveSupplierSelection.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

backend.updateEventSupplierForRole.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateEventSupplierForRole.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.updateEventSupplierForRole.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateEventSupplierForRole.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for listEventSuppliers function (collaborator-aware supplier listing)
backend.listEventSuppliers.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listEventSuppliers.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.listEventSuppliers.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.listEventSuppliers.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listEventSuppliers.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for listEventParticipants function (collaborator-aware participant listing)
backend.listEventParticipants.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listEventParticipants.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listEventParticipants.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.listEventParticipants.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.listEventParticipants.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.listEventParticipants.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for createParticipantCollaborator function
backend.createParticipantCollaborator.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.createParticipantCollaborator.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.createParticipantCollaborator.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.createParticipantCollaborator.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.createParticipantCollaborator.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for updateParticipantCollaborator function
backend.updateParticipantCollaborator.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateParticipantCollaborator.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.updateParticipantCollaborator.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateParticipantCollaborator.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.updateParticipantCollaborator.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for confirmParticipant function
backend.confirmParticipant.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.confirmParticipant.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.confirmParticipant.addEnvironment('BAFATORIO_APP_DEPENDENT_TABLE_NAME', backend.data.resources.tables['Dependent'].tableName);
backend.confirmParticipant.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.confirmParticipant.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// --- Gate de billing (§4) nas mutations de participantes: cada Lambda lê a
// UserSubscription do dono via ensureEventWritable (entitlementGate) ---
const PARTICIPANT_GATED_FUNCTIONS = [
  backend.createParticipantCollaborator,
  backend.updateParticipantCollaborator,
  backend.deleteParticipants,
  backend.uploadParticipants,
  backend.importNormalizedParticipants,
  backend.confirmParticipant,
  backend.createDependent,
  backend.updateDependent,
  backend.deleteDependent,
];
for (const fn of PARTICIPANT_GATED_FUNCTIONS) {
  fn.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
}

// Add environment variables for createCheckoutSession function
backend.createCheckoutSession.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
// Upgrade de escalão (ADR-038): o teto gravado no evento é a autoridade do
// escalão de origem, e a diferença calcula-se a partir dele no servidor.
backend.createCheckoutSession.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);

// O portal resolve o customer do registo do próprio caller (ADR-019) — precisa
// de ler a UserSubscription para não confiar no customerId do argumento.
backend.createBillingPortalSession.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);

// Add environment variables for eventStream function
backend.eventStream.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.eventStream.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for participantStream function
backend.participantStream.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.participantStream.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for dependentStream function
backend.dependentStream.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.dependentStream.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.dependentStream.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Add environment variables for handleStripeWebhook function
backend.handleStripeWebhook.addEnvironment('BAFATORIO_APP_PROCESSED_EVENTS_TABLE_NAME', backend.data.resources.tables['ProcessedStripeEvent'].tableName);
backend.handleStripeWebhook.addEnvironment('BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME', backend.data.resources.tables['PlanPurchase'].tableName);
backend.handleStripeWebhook.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
backend.handleStripeWebhook.addEnvironment('BAFATORIO_APP_INVOICE_TABLE_NAME', backend.data.resources.tables['Invoice'].tableName);
backend.handleStripeWebhook.addEnvironment('BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME', backend.data.resources.tables['PaymentMethodData'].tableName);
// O teto do evento sobe no webhook, depois do pagamento confirmado (ADR-034).
backend.handleStripeWebhook.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);

/**
 * Configure SQS trigger for Lambda
 */
backend.processEmailQueue.addEnvironment('EMAIL_QUEUE_URL', queueUrl);
backend.processEmailQueue.addEnvironment('EMAIL_DLQ_URL', dlqUrl);
backend.processEmailQueue.addEnvironment('BAFATORIO_APP_EMAIL_LOG_TABLE_NAME', backend.data.resources.tables['EmailLog'].tableName);
backend.sendEmail.addEnvironment('EMAIL_QUEUE_URL', queueUrl);
backend.sendEmail.addEnvironment('BAFATORIO_APP_EMAIL_LOG_TABLE_NAME', backend.data.resources.tables['EmailLog'].tableName);
backend.sendEmail.addEnvironment('BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME', process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || 'bafatorio-template-storage');
backend.processEmailQueue.addEnvironment('BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME', process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || 'bafatorio-template-storage');
backend.confirmParticipant.addEnvironment('EMAIL_QUEUE_URL', queueUrl);
// NOTE: EMAIL_QUEUE_URL removed from postConfirmation to avoid circular dependency
// The postConfirmation handler now sends welcome emails directly via SES

backend.processEmailQueue.resources.lambda.addEventSource(new lambdaEventSources.SqsEventSource(queue, {
  batchSize: 10,
  maxBatchingWindow: Duration.seconds(30),
  reportBatchItemFailures: true,
}));



// Configure SQS policy for Lambda
const sqsPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'sqs:SendMessage',
    'sqs:ReceiveMessage',
    'sqs:DeleteMessage',
    'sqs:GetQueueAttributes',
    'sqs:GetQueueUrl',

  ],
  resources: [
    queue.queueArn,
    deadLetterQueue.queueArn
  ]
});

// Add this policy for the confirmParticipant Lambda
const confirmParticipantSqsPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'sqs:SendMessage',
    'sqs:GetQueueUrl'
  ],
  resources: [queue.queueArn]
});

// Configure SES policy for Lambda (SES does not support resource-level scoping for templates/send)
const sesPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'ses:SendEmail',
    'ses:SendRawEmail',
    'ses:GetTemplate',
    'ses:UpdateTemplate',
    'ses:CreateTemplate',
    'ses:DeleteTemplate',
    'ses:ListTemplates',
    'ses:VerifyEmailIdentity'
  ],
  resources: ['*']
});

// Configure SQS policy for Lambda
const sendEmailSqsPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'sqs:SendMessage',
    'sqs:GetQueueUrl'
  ],
  resources: [queue.queueArn, deadLetterQueue.queueArn]
});

// ============ IAM POLICY HELPERS (Least Privilege per ADR-004) ============

/** Helper to create a DynamoDB policy scoped to specific tables + their GSIs */
const tablePolicy = (tableNames: string[], actions: string[]) =>
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions,
    resources: tableNames.flatMap(name => [
      backend.data.resources.tables[name].tableArn,
      `${backend.data.resources.tables[name].tableArn}/index/*`,
    ]),
  });

// Common DynamoDB action sets (least privilege)
const DDB_READ = ['dynamodb:GetItem', 'dynamodb:Query'];
const DDB_READ_WRITE = ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:Query'];
const DDB_READ_WRITE_BATCH = ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:BatchWriteItem'];
const DDB_FULL = [
  'dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem',
  'dynamodb:Query', 'dynamodb:BatchWriteItem', 'dynamodb:TransactWriteItems',
];

// Configure CloudWatch policy for Lambda (CloudWatch does not support resource-level scoping)
const cloudWatchPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'cloudwatch:PutMetricData'
  ],
  resources: ['*']
});

// Configure Cognito policy scoped to our User Pool
const cognitoPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'cognito-idp:AdminGetUser',
    'cognito-idp:ListUsers'
  ],
  resources: [backend.auth.resources.userPool.userPoolArn]
});

// Configure Lambda invoke policy scoped to sendEmail function
const lambdaInvokePolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'lambda:InvokeFunction'
  ],
  resources: [backend.sendEmail.resources.lambda.functionArn]
});

// Configure S3 read policy for email templates
const s3TemplatesPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    's3:GetObject',
    's3:ListBucket'
  ],
  resources: [
    'arn:aws:s3:::bafatorio-template-storage',
    'arn:aws:s3:::bafatorio-template-storage/*'
  ]
});

// deleteOperationsPolicy removed — merged into per-function table policies (least privilege)

// Configure S3 policy for delete user data function
const s3DeleteUserDataPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    's3:ListBucket',
    's3:ListObjectsV2',
    's3:DeleteObject',
    's3:DeleteObjectVersion'
  ],
  resources: [
    backend.storage.resources.bucket.bucketArn,
    `${backend.storage.resources.bucket.bucketArn}/*`
  ]
});

// Stripe secrets — scoped to Amplify-managed SSM parameters
const stripeSecretsPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'ssm:GetParameter',
    'ssm:GetParameters',
  ],
  resources: [`arn:aws:ssm:eu-west-1:*:parameter/amplify/*`]
});

// KMS decrypt for SSM SecureString (KMS does not support fine-grained resource scoping for default keys)
const kmsDecryptPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Decrypt'],
  resources: ['*']
});

// deleteParticipantsDependentTablePolicy removed — now covered by per-function tablePolicy

// ============ PER-FUNCTION DynamoDB POLICIES (Least Privilege) ============

// --- Delete-related functions ---
backend.deleteParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Participant', 'Dependent', 'Event'], DDB_FULL));
backend.deleteParticipants.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
backend.deleteDependent.resources.lambda.addToRolePolicy(tablePolicy(['Participant', 'Dependent', 'Event'], DDB_FULL));
backend.deleteDependent.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
// --- updateDependent (read Dependent+Event to verify access, write Dependent) ---
backend.updateDependent.resources.lambda.addToRolePolicy(tablePolicy(['Dependent', 'Event'], DDB_READ_WRITE));
backend.updateDependent.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
// --- Create dependent (bypass owner auth, sets event owner as record owner) ---
backend.createDependent.resources.lambda.addToRolePolicy(tablePolicy(['Dependent', 'Participant'], DDB_FULL));
backend.createDependent.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.deleteUserData.resources.lambda.addToRolePolicy(tablePolicy([
  'Event', 'Participant', 'Dependent', 'Supplier', 'EventSupplier',
  'EmailLog', 'UserSubscription', 'PaymentMethodData', 'Invoice', 'PlanPurchase',
  // Cascade partilhado (ADR-035)
  'EventCollaborator', 'Role', 'DocumentFolder', 'EventScheduleEntry', 'NotionDocument',
], DDB_FULL));
// A eliminação de conta procura por 'owner', que não tem GSI em 5 destas 7
// tabelas — daí o Scan, que o DDB_FULL não inclui (e que não se acrescenta lá
// para não o dar a dezenas de Lambdas). Sem isto a mutation falhava inteira:
// o AccessDenied acontecia no primeiro passo e nada era apagado, apesar de a
// UI dizer que sim. Scan é aceitável aqui porque a operação é rara e única por
// utilizador; um GSI por tabela custaria escrita e armazenamento permanentes.
// Nota de correção: o 'owner' vem em dois formatos (sub e sub::sub) e há
// eventos antigos sem organizerId, pelo que o GSI byOrganizerId do Event não
// serve de substituto — perderia registos legacy.
backend.deleteUserData.resources.lambda.addToRolePolicy(tablePolicy([
  'Event', 'Participant', 'Supplier', 'EmailLog',
  'UserSubscription', 'PaymentMethodData', 'Invoice', 'PlanPurchase',
], ['dynamodb:Scan']));
backend.deleteUserData.resources.lambda.addToRolePolicy(s3DeleteUserDataPolicy);
// deleteEventCascade (ADR-035): Query+BatchWrite+Delete em todas as tabelas filhas do evento
backend.deleteEventCascade.resources.lambda.addToRolePolicy(tablePolicy([
  'Event', 'Participant', 'Dependent', 'EventSupplier', 'EventCollaborator',
  'Role', 'DocumentFolder', 'EventScheduleEntry', 'NotionDocument', 'EmailLog',
], DDB_FULL));
backend.deleteEventCascade.resources.lambda.addToRolePolicy(s3DeleteUserDataPolicy);
backend.removeEventSupplier.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'EventCollaborator'], DDB_FULL));
backend.deleteSupplier.resources.lambda.addToRolePolicy(tablePolicy(['Supplier'], DDB_FULL));
backend.deleteSupplier.resources.lambda.addToRolePolicy(tablePolicy(['EventSupplier'], ['dynamodb:Scan']));
backend.revertEventSupplierApproval.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'EventCollaborator'], DDB_FULL));
backend.adjustApprovedEventSupplierQuote.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'EventCollaborator'], DDB_FULL));

// --- Stripe-related functions (SSM secrets scoped to Amplify parameters) ---
backend.handleStripeWebhook.resources.lambda.addToRolePolicy(stripeSecretsPolicy);
backend.handleStripeWebhook.resources.lambda.addToRolePolicy(kmsDecryptPolicy);
backend.handleStripeWebhook.resources.lambda.addToRolePolicy(tablePolicy([
  'ProcessedStripeEvent', 'UserSubscription', 'Invoice', 'PaymentMethodData', 'PlanPurchase',
], DDB_READ_WRITE));
// Só o teto do evento — o upgrade de escalão não mexe em mais nada do Event.
backend.handleStripeWebhook.resources.lambda.addToRolePolicy(tablePolicy(['Event'], ['dynamodb:UpdateItem']));
backend.createCheckoutSession.resources.lambda.addToRolePolicy(stripeSecretsPolicy);
backend.createCheckoutSession.resources.lambda.addToRolePolicy(kmsDecryptPolicy);

// --- Core app functions ---
backend.sendEmail.resources.lambda.addToRolePolicy(tablePolicy(['EmailLog'], DDB_READ_WRITE));
backend.sendEmail.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.uploadParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Participant', 'Dependent', 'Event'], DDB_READ_WRITE_BATCH));
backend.uploadParticipants.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
backend.uploadParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Role'], [...DDB_READ, 'dynamodb:PutItem', 'dynamodb:UpdateItem']));
backend.processEmailQueue.resources.lambda.addToRolePolicy(tablePolicy(['EmailLog'], DDB_READ_WRITE));
backend.confirmParticipant.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'Participant', 'Dependent'], DDB_READ_WRITE));
backend.confirmParticipant.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
backend.createCheckoutSession.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ_WRITE));
// Leitura apenas: o checkout lê o teto atual para calcular a diferença; quem o
// escreve é o webhook, depois de o pagamento entrar.
backend.createCheckoutSession.resources.lambda.addToRolePolicy(tablePolicy(['Event'], DDB_READ));
backend.createBillingPortalSession.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ));
backend.updateEventBudget.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'Supplier', 'EventCollaborator'], [...DDB_READ_WRITE, 'dynamodb:TransactWriteItems']));
backend.processSupplierPayment.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'EventCollaborator'], [...DDB_READ_WRITE, 'dynamodb:TransactWriteItems']));
backend.uploadSupplier.resources.lambda.addToRolePolicy(tablePolicy(['Supplier'], DDB_READ_WRITE_BATCH));
backend.importNormalizedParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Participant', 'Dependent', 'Event'], DDB_READ_WRITE_BATCH));
backend.importNormalizedParticipants.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
backend.importNormalizedParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Role'], [...DDB_READ, 'dynamodb:PutItem', 'dynamodb:UpdateItem']));
backend.importNormalizedSuppliers.resources.lambda.addToRolePolicy(tablePolicy(['Supplier'], DDB_READ_WRITE_BATCH));
backend.importNormalizedEventSuppliers.resources.lambda.addToRolePolicy(tablePolicy(['Supplier', 'EventSupplier', 'Event'], DDB_READ_WRITE_BATCH));
backend.importNormalizedEventSuppliers.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
// --- Stream functions ---
backend.eventStream.resources.lambda.addToRolePolicy(tablePolicy(['Event'], DDB_READ_WRITE));

// --- Collaborator functions (ADR-015) ---
backend.inviteCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'EmailLog'], DDB_READ_WRITE));

// Configure SQS policy for inviteCollaborator
const inviteCollaboratorSqsPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'sqs:SendMessage',
    'sqs:GetQueueUrl'
  ],
  resources: [queue.queueArn]
});
backend.inviteCollaborator.resources.lambda.addToRolePolicy(inviteCollaboratorSqsPolicy);
// Add Cognito permission to get user attributes (scoped to our User Pool)
backend.inviteCollaborator.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:AdminGetUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));

backend.acceptInvitation.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ_WRITE));
// Add Cognito permission to get user attributes (scoped to our User Pool)
backend.acceptInvitation.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:AdminGetUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.declineInvitation.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ_WRITE));
// Add Cognito permission to get user attributes (scoped to our User Pool)
backend.declineInvitation.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:AdminGetUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.revokeCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_FULL));
backend.listMyPendingInvitations.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator'], DDB_READ));
// Add Cognito permission to get user attributes (scoped to our User Pool)
backend.listMyPendingInvitations.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:AdminGetUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.listMyCollaboratedEvents.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator', 'Event'], [...DDB_READ, 'dynamodb:BatchGetItem']));
backend.getEventAsCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'UserSubscription'], DDB_READ));
backend.listEventCollaborators.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.listEventFolders.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'DocumentFolder'], DDB_READ));
backend.listEventSchedule.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'EventScheduleEntry'], DDB_READ));
backend.createScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'EventScheduleEntry'], DDB_READ_WRITE));
backend.createScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['EventSupplier'], ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem']));
backend.createScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Supplier'], DDB_READ));
// Só leitura: a agenda valida que os participantes são deste evento, nunca os escreve.
backend.createScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Participant'], ['dynamodb:BatchGetItem']));
backend.updateScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'EventScheduleEntry'], DDB_READ_WRITE));
backend.updateScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['EventSupplier'], ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem']));
backend.updateScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Supplier'], DDB_READ));
// Só leitura: a agenda valida que os participantes são deste evento, nunca os escreve.
backend.updateScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Participant'], ['dynamodb:BatchGetItem']));
backend.deleteScheduleEntry.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'EventScheduleEntry'], DDB_FULL));
backend.updateCollaboratorFolders.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ_WRITE));
backend.updateCollaboratorSuppliers.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ_WRITE));
backend.updateCollaboratorRole.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ_WRITE));
backend.updateCollaboratorScheduleAccess.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ_WRITE));

// --- Supplier Selection functions (ADR-015 approval flow) ---
backend.selectEventSupplier.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'Supplier', 'EventSupplier', 'EventCollaborator'], DDB_READ_WRITE));
backend.approveSupplierSelection.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'EventCollaborator'], DDB_FULL));
backend.updateEventSupplierForRole.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'EventCollaborator'], DDB_READ_WRITE));

// --- listEventSuppliers (read-only) ---
backend.listEventSuppliers.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventSupplier', 'Supplier', 'EventCollaborator'], DDB_READ));

// --- listEventParticipants (read-only; Role uses byEventId GSI — no Scan needed) ---
backend.listEventParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'Participant', 'Dependent', 'Role'], DDB_READ));

// --- getSupplierForEvent (read-only: Event, EventCollaborator, EventSupplier, Supplier) ---
backend.getSupplierForEvent.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.getSupplierForEvent.addEnvironment('BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME', backend.data.resources.tables['EventSupplier'].tableName);
backend.getSupplierForEvent.addEnvironment('BAFATORIO_APP_SUPPLIER_TABLE_NAME', backend.data.resources.tables['Supplier'].tableName);
backend.getSupplierForEvent.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.getSupplierForEvent.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.getSupplierForEvent.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'EventSupplier', 'Supplier'], DDB_READ));

// --- listEventRoles (read-only: Event, EventCollaborator, Role) ---
backend.listEventRoles.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.listEventRoles.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.listEventRoles.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.listEventRoles.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.listEventRoles.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'Role'], DDB_READ));

// --- createEvent (gate de conta: lê UserSubscription+PlanPurchase, conta eventos, escreve Event + consome PlanPurchase) ---
backend.createEvent.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.createEvent.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
backend.createEvent.addEnvironment('BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME', backend.data.resources.tables['PlanPurchase'].tableName);
backend.createEvent.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
// O Event.ownerName/ownerEmail vem do Cognito: os access tokens do AppSync não
// trazem o email. Ver o campo em data/resource.ts.
backend.createEvent.addEnvironment('BAFATORIO_APP_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.createEvent.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:AdminGetUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
backend.createEvent.resources.lambda.addToRolePolicy(tablePolicy(['Event'], [...DDB_READ, 'dynamodb:PutItem']));
backend.createEvent.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ));
backend.createEvent.resources.lambda.addToRolePolicy(tablePolicy(['PlanPurchase'], [...DDB_READ, 'dynamodb:UpdateItem']));

// --- updateEvent (role via Event+EventCollaborator, janela de escrita via UserSubscription, escreve Event) ---
backend.updateEvent.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateEvent.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateEvent.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
backend.updateEvent.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.updateEvent.resources.lambda.addToRolePolicy(tablePolicy(['Event'], [...DDB_READ, 'dynamodb:UpdateItem']));
backend.updateEvent.resources.lambda.addToRolePolicy(tablePolicy(['EventCollaborator', 'UserSubscription'], DDB_READ));

// --- syncMyDisplayName (propaga o nome do Cognito para os snapshots userName/ownerName do próprio caller) ---
backend.syncMyDisplayName.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.syncMyDisplayName.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.syncMyDisplayName.addEnvironment('BAFATORIO_APP_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.syncMyDisplayName.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.syncMyDisplayName.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], [...DDB_READ, 'dynamodb:UpdateItem']));
backend.syncMyDisplayName.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:AdminGetUser'],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));

// --- getAccountAccess (read-only: mesma decisão do gate do create-event) ---
backend.getAccountAccess.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.getAccountAccess.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
backend.getAccountAccess.addEnvironment('BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME', backend.data.resources.tables['PlanPurchase'].tableName);
backend.getAccountAccess.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.getAccountAccess.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'UserSubscription', 'PlanPurchase'], DDB_READ));

// --- createEventRole (read Event+EventCollaborator, read+write Role) ---
backend.createEventRole.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.createEventRole.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.createEventRole.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.createEventRole.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.createEventRole.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.createEventRole.resources.lambda.addToRolePolicy(tablePolicy(['Role'], [...DDB_READ, 'dynamodb:PutItem', 'dynamodb:UpdateItem']));

// --- updateEventRole (read Event+EventCollaborator, read+write Role, CloudWatch metrics) ---
backend.updateEventRole.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateEventRole.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateEventRole.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.updateEventRole.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.updateEventRole.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.updateEventRole.resources.lambda.addToRolePolicy(tablePolicy(['Role'], [...DDB_READ, 'dynamodb:UpdateItem']));
backend.updateEventRole.resources.lambda.addToRolePolicy(cloudWatchPolicy);

// --- deleteEventRoleValidated (read Event+EventCollaborator+Role+Participant, soft-delete Role via UpdateItem, CloudWatch metrics) ---
backend.deleteEventRoleValidated.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteEventRoleValidated.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.deleteEventRoleValidated.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);
backend.deleteEventRoleValidated.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.deleteEventRoleValidated.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.deleteEventRoleValidated.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'Role', 'Participant'], DDB_READ));
backend.deleteEventRoleValidated.resources.lambda.addToRolePolicy(tablePolicy(['Role'], ['dynamodb:UpdateItem']));
backend.deleteEventRoleValidated.resources.lambda.addToRolePolicy(cloudWatchPolicy);

// --- Folder CRUD functions (ADR-021) ---
backend.createEventFolder.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.createEventFolder.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.createEventFolder.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.createEventFolder.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.createEventFolder.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.createEventFolder.resources.lambda.addToRolePolicy(tablePolicy(['DocumentFolder'], [...DDB_READ, 'dynamodb:PutItem']));

backend.updateEventFolder.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.updateEventFolder.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.updateEventFolder.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.updateEventFolder.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.updateEventFolder.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.updateEventFolder.resources.lambda.addToRolePolicy(tablePolicy(['DocumentFolder'], [...DDB_READ, 'dynamodb:UpdateItem']));

backend.deleteEventFolder.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.deleteEventFolder.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.deleteEventFolder.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.deleteEventFolder.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.deleteEventFolder.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.deleteEventFolder.resources.lambda.addToRolePolicy(tablePolicy(['DocumentFolder'], [...DDB_READ, 'dynamodb:DeleteItem']));

// --- createParticipantCollaborator (read Event+Collaborator+Role, write Participant) ---
backend.createParticipantCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'Role'], DDB_READ));
backend.createParticipantCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Participant'], DDB_READ_WRITE));

// --- updateParticipantCollaborator (read Event+Collaborator+Role, read+write Participant) ---
backend.updateParticipantCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'Role'], DDB_READ));
backend.updateParticipantCollaborator.resources.lambda.addToRolePolicy(tablePolicy(['Participant'], DDB_READ_WRITE));

// Gate de billing (§4): as Lambdas gated de participantes leem a UserSubscription do dono
for (const fn of PARTICIPANT_GATED_FUNCTIONS) {
  fn.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ));
}

// Gate de billing (§4) nas mutations de suppliers — janela de escrita + limite de 10
const SUPPLIER_GATED_FUNCTIONS = [
  backend.selectEventSupplier,
  backend.approveSupplierSelection,
  backend.updateEventSupplierForRole,
  backend.updateEventBudget,
  backend.processSupplierPayment,
  backend.removeEventSupplier,
  backend.revertEventSupplierApproval,
  backend.adjustApprovedEventSupplierQuote,
  backend.importNormalizedEventSuppliers,
];
for (const fn of SUPPLIER_GATED_FUNCTIONS) {
  fn.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
  fn.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ));
}

// Gate de billing (§4) em docs/pastas/integrações — janela + limite de 2 pastas + nível pago
const DOCS_GATED_FUNCTIONS = [
  backend.createEventFolder,
  backend.updateEventFolder,
  backend.deleteEventFolder,
  backend.saveDocumentEdit,
  backend.notionImportPages,
  backend.fidelizeSyncParticipants,
];
for (const fn of DOCS_GATED_FUNCTIONS) {
  fn.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
  fn.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ));
}

// Gate de billing (§4) em agenda + roles — janela de escrita
const SCHEDULE_ROLE_GATED_FUNCTIONS = [
  backend.createScheduleEntry,
  backend.updateScheduleEntry,
  backend.deleteScheduleEntry,
  backend.createEventRole,
  backend.updateEventRole,
  backend.deleteEventRoleValidated,
];
for (const fn of SCHEDULE_ROLE_GATED_FUNCTIONS) {
  fn.addEnvironment('BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME', backend.data.resources.tables['UserSubscription'].tableName);
  fn.resources.lambda.addToRolePolicy(tablePolicy(['UserSubscription'], DDB_READ));
}

// Add environment variables for sendEmail access control (Event + EventCollaborator)
backend.sendEmail.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.sendEmail.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);

// Add SQS policy to the sendEmail lambda function
backend.sendEmail.resources.lambda.addToRolePolicy(sendEmailSqsPolicy);

// Add SES policy to the sendEmail lambda function
backend.sendEmail.resources.lambda.addToRolePolicy(sesPolicy);
backend.processEmailQueue.resources.lambda.addToRolePolicy(sqsPolicy);
backend.processEmailQueue.resources.lambda.addToRolePolicy(sesPolicy);

// Add S3 template access policy to email-related lambda functions
backend.sendEmail.resources.lambda.addToRolePolicy(s3TemplatesPolicy);
backend.processEmailQueue.resources.lambda.addToRolePolicy(s3TemplatesPolicy);

// Add SQS policy to the confirmParticipant lambda function
backend.confirmParticipant.resources.lambda.addToRolePolicy(confirmParticipantSqsPolicy);


// Add SES policy to post-confirmation function (for direct welcome email sending)
const postConfirmationSesPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['ses:SendEmail', 'ses:SendRawEmail'],
  resources: ['*']
});
backend.postConfirmation.resources.lambda.addToRolePolicy(postConfirmationSesPolicy);

// Add CloudWatch policy to the lambda functions
backend.sendEmail.resources.lambda.addToRolePolicy(cloudWatchPolicy);
backend.processEmailQueue.resources.lambda.addToRolePolicy(cloudWatchPolicy);
backend.eventStream.resources.lambda.addToRolePolicy(cloudWatchPolicy);

// Add Cognito policy to eventStream lambda function
backend.eventStream.resources.lambda.addToRolePolicy(cognitoPolicy);

// Add Lambda invoke policy to eventStream lambda function
backend.eventStream.resources.lambda.addToRolePolicy(lambdaInvokePolicy);

// DynamoDB Streams action set
const DDB_STREAM_ACTIONS = ['dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:DescribeStream', 'dynamodb:ListStreams'];

// Add DynamoDB Streams permission scoped to Event table stream
backend.eventStream.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: DDB_STREAM_ACTIONS,
  resources: [`${backend.data.resources.tables['Event'].tableArn}/stream/*`],
}));

// Passar dinamicamente o nome da função sendEmail para a função eventStream
// Isso evita a necessidade de hardcoded o nome da função
backend.eventStream.addEnvironment('BAFATORIO_APP_SEND_EMAIL_FUNCTION_NAME', backend.sendEmail.resources.lambda.functionName);



// Adicionar o DynamoDB Stream como fonte de eventos para a função Lambda
backend.eventStream.resources.lambda.addEventSource(
  new lambdaEventSources.DynamoEventSource(backend.data.resources.tables.Event, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
    enabled: true
  })
);

// Add DynamoDB and Streams policies to participantStream (scoped to Event table + Participant stream)
backend.participantStream.resources.lambda.addToRolePolicy(tablePolicy(['Event'], DDB_READ_WRITE));
backend.participantStream.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: DDB_STREAM_ACTIONS,
  resources: [`${backend.data.resources.tables['Participant'].tableArn}/stream/*`],
}));

// DLQ for participant stream — failed records are retained for 14 days
const participantStreamDlq = new sqs.Queue(backend.participantStream.resources.lambda, 'ParticipantStreamDLQ', {
  retentionPeriod: Duration.days(14),
  enforceSSL: true
});

// Add Participant table DynamoDB Stream as event source for participantStream
backend.participantStream.resources.lambda.addEventSource(
  new lambdaEventSources.DynamoEventSource(backend.data.resources.tables.Participant, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
    reportBatchItemFailures: true,
    onFailure: new lambdaEventSources.SqsDlq(participantStreamDlq),
    enabled: true
  })
);

// Add DynamoDB and Streams policies to dependentStream (scoped to Event+Participant tables + Dependent stream)
backend.dependentStream.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'Participant'], DDB_READ_WRITE));
backend.dependentStream.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: DDB_STREAM_ACTIONS,
  resources: [`${backend.data.resources.tables['Dependent'].tableArn}/stream/*`],
}));

// DLQ for dependent stream — failed records are retained for 14 days
const dependentStreamDlq = new sqs.Queue(backend.dependentStream.resources.lambda, 'DependentStreamDLQ', {
  retentionPeriod: Duration.days(14),
  enforceSSL: true
});

// Add Dependent table DynamoDB Stream as event source for dependentStream
backend.dependentStream.resources.lambda.addEventSource(
  new lambdaEventSources.DynamoEventSource(backend.data.resources.tables.Dependent, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
    reportBatchItemFailures: true,
    onFailure: new lambdaEventSources.SqsDlq(dependentStreamDlq),
    enabled: true
  })
);

// ── RAG Sync Lambda: DynamoDB Streams → api-bafatorio RAG embeddings ──

// Read-only access to Supplier and Role tables (to resolve names for EventSupplier/Participant records)
const stripeWebhookUrlObject = backend.handleStripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE
});

// === hello.bafatorio.com early-access lead capture ===
// Resources share the data stack with the Amplify-managed Lambda to avoid a
// circular cross-stack dependency (API -> Lambda -> DynamoDB).
const helloLeadsStack = backend.data.stack;
const isHelloProduction = process.env.AWS_BRANCH === 'main';
// development also holds real event leads (interim store until the prod
// migration), so its table gets the same durability guarantees as prod.
const helloLeadsHoldRealData = isHelloProduction || process.env.AWS_BRANCH === 'development';
const helloAllowedOrigins = isHelloProduction
  ? ['https://hello.bafatorio.com', 'https://www.hello.bafatorio.com']
  : [
      'https://hello.bafatorio.com',
      'https://www.hello.bafatorio.com',
      'http://localhost:4173',
      'http://localhost:5173',
    ];

const earlyAccessLeadsTable = new dynamodb.Table(helloLeadsStack, 'HelloEarlyAccessLeads', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  timeToLiveAttribute: 'expiresAt',
  pointInTimeRecovery: helloLeadsHoldRealData,
  deletionProtection: helloLeadsHoldRealData,
  removalPolicy: helloLeadsHoldRealData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
});

backend.saveEarlyAccessLead.addEnvironment(
  'EARLY_ACCESS_LEADS_TABLE_NAME',
  earlyAccessLeadsTable.tableName
);
backend.saveEarlyAccessLead.addEnvironment(
  'EARLY_ACCESS_CAMPAIGN_ID',
  'human-leaders-cabo-verde-2026'
);
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_SOURCE', 'human-leaders-qr');
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_PRIVACY_VERSION', '2026-07-16');
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_RATE_LIMIT_MAX', '5');
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_RATE_LIMIT_WINDOW_SECONDS', '600');
earlyAccessLeadsTable.grant(
  backend.saveEarlyAccessLead.resources.lambda,
  'dynamodb:PutItem',
  'dynamodb:UpdateItem'
);

// Welcome email to new leads, sent best-effort from the leads Lambda (ADR-037
// keeps hello self-contained — no coupling to the app's SES/template pipeline).
// SES authorisation mirrors the app's transactional sender (sesPolicy above):
// ses:SendEmail with Resource '*' and no ses:FromAddress condition. Both an
// identity-ARN resource scope and the condition caused AccessDenied here — SES
// does not match ses:FromAddress against a From header carrying an RFC 2047
// encoded display name. The From address is fixed in the handler, so the
// effective sender stays constrained regardless.
const earlyAccessFromEmail = 'support@bafatorio.com';
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_FROM_EMAIL', earlyAccessFromEmail);
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_REPLY_TO_EMAIL', earlyAccessFromEmail);
backend.saveEarlyAccessLead.addEnvironment('EARLY_ACCESS_FROM_NAME', 'Equipa Bafatório');
backend.saveEarlyAccessLead.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['ses:SendEmail'],
    resources: ['*'],
  })
);

if (isHelloProduction) {
  backend.saveEarlyAccessLead.resources.cfnResources.cfnFunction.reservedConcurrentExecutions = 20;
}

const helloLeadsAccessLogs = new logs.LogGroup(helloLeadsStack, 'HelloLeadsApiAccessLogs', {
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy: isHelloProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
});

const helloLeadsApi = new apigatewayv2.HttpApi(helloLeadsStack, 'HelloLeadsHttpApi', {
  description: 'Public early-access lead endpoint for hello.bafatorio.com',
  createDefaultStage: false,
  corsPreflight: {
    allowOrigins: helloAllowedOrigins,
    allowMethods: [apigatewayv2.CorsHttpMethod.POST],
    allowHeaders: ['content-type'],
    maxAge: Duration.days(1),
  },
});

helloLeadsApi.addRoutes({
  path: '/v1/leads',
  methods: [apigatewayv2.HttpMethod.POST],
  integration: new apigatewayv2Integrations.HttpLambdaIntegration(
    'HelloLeadsLambdaIntegration',
    backend.saveEarlyAccessLead.resources.lambda,
    { timeout: Duration.seconds(10) }
  ),
});

new apigatewayv2.HttpStage(helloLeadsStack, 'HelloLeadsDefaultStage', {
  httpApi: helloLeadsApi,
  stageName: '$default',
  autoDeploy: true,
  detailedMetricsEnabled: true,
  throttle: { rateLimit: 50, burstLimit: 100 },
  accessLogSettings: {
    destination: new apigatewayv2.LogGroupLogDestination(helloLeadsAccessLogs),
    format: AccessLogFormat.custom(JSON.stringify({
      requestId: '$context.requestId',
      routeKey: '$context.routeKey',
      status: '$context.status',
      responseLength: '$context.responseLength',
      integrationLatency: '$context.integrationLatency',
    })),
  },
});

new cloudwatch.Alarm(helloLeadsStack, 'HelloLeadsApiServerErrorsAlarm', {
  metric: helloLeadsApi.metricServerError({
    period: Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 1,
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

new cloudwatch.Alarm(helloLeadsStack, 'HelloLeadsLambdaThrottlesAlarm', {
  metric: backend.saveEarlyAccessLead.resources.lambda.metricThrottles({
    period: Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 1,
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
// === End hello.bafatorio.com lead capture ===

// Atualizar outputs para incluir as URLs das filas
// API key rotation completed successfully - override removed to use default logical ID
// backend.data.resources.cfnResources.cfnApiKey?.overrideLogicalId(
//   `recoverApiKey${new Date().getTime()}`
// );

// === Fidelize Integration: KMS, env vars, IAM policies ===
const fidelizeStack = backend.createStack('FidelizeTokenEncryption');
const fidelizeTokenKey = new kms.Key(fidelizeStack, 'FidelizeTokenKey', {
  description: 'Encrypts Fidelize API keys at rest',
  enableKeyRotation: true,
});

const fidelizeIntegrationTableName = backend.data.resources.tables['FidelizeIntegration'].tableName;

// fidelize-save-api-key env vars
backend.fidelizeSaveApiKey.addEnvironment('FIDELIZE_INTEGRATION_TABLE_NAME', fidelizeIntegrationTableName);
backend.fidelizeSaveApiKey.addEnvironment('KMS_KEY_ID', fidelizeTokenKey.keyId);
backend.fidelizeSaveApiKey.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// fidelize-sync-participants env vars
backend.fidelizeSyncParticipants.addEnvironment('FIDELIZE_INTEGRATION_TABLE_NAME', fidelizeIntegrationTableName);
backend.fidelizeSyncParticipants.addEnvironment('KMS_KEY_ID', fidelizeTokenKey.keyId);
backend.fidelizeSyncParticipants.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.fidelizeSyncParticipants.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.fidelizeSyncParticipants.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.fidelizeSyncParticipants.addEnvironment('BAFATORIO_APP_PARTICIPANT_TABLE_NAME', backend.data.resources.tables['Participant'].tableName);
backend.fidelizeSyncParticipants.addEnvironment('BAFATORIO_APP_ROLE_TABLE_NAME', backend.data.resources.tables['Role'].tableName);

// fidelize-save-api-key IAM: KMS encrypt + DynamoDB write on FidelizeIntegration
backend.fidelizeSaveApiKey.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Encrypt'],
  resources: [fidelizeTokenKey.keyArn],
}));
backend.fidelizeSaveApiKey.resources.lambda.addToRolePolicy(tablePolicy(['FidelizeIntegration'], DDB_READ_WRITE));

// fidelize-sync-participants IAM: KMS decrypt + DynamoDB read/write
backend.fidelizeSyncParticipants.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Decrypt'],
  resources: [fidelizeTokenKey.keyArn],
}));
backend.fidelizeSyncParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator'], DDB_READ));
backend.fidelizeSyncParticipants.resources.lambda.addToRolePolicy(tablePolicy(['FidelizeIntegration'], DDB_READ_WRITE));
backend.fidelizeSyncParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Participant'], DDB_READ_WRITE));
backend.fidelizeSyncParticipants.resources.lambda.addToRolePolicy(tablePolicy(['Role'], [...DDB_READ, 'dynamodb:PutItem', 'dynamodb:UpdateItem']));

// === Notion Integration: KMS key + env vars ===
const notionStack = backend.createStack('NotionTokenEncryption');
const notionTokenKey = new kms.Key(notionStack, 'NotionTokenKey', {
  description: 'Encrypts Notion OAuth access tokens at rest',
  enableKeyRotation: true,
});
const notionIntegrationTable = backend.data.resources.tables['NotionIntegration'];
const notionDocumentTable = backend.data.resources.tables['NotionDocument'];
const notionIntegrationTableName = notionIntegrationTable.tableName;
const notionDocumentTableName = notionDocumentTable.tableName;
const storageBucketName = backend.storage.resources.bucket.bucketName;

// notion-exchange-token env vars
backend.notionExchangeToken.addEnvironment('NOTION_INTEGRATION_TABLE_NAME', notionIntegrationTableName);
backend.notionExchangeToken.addEnvironment('KMS_KEY_ID', notionTokenKey.keyId);
backend.notionExchangeToken.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// notion-list-pages env vars
backend.notionListPages.addEnvironment('NOTION_INTEGRATION_TABLE_NAME', notionIntegrationTableName);
backend.notionListPages.addEnvironment('KMS_KEY_ID', notionTokenKey.keyId);
backend.notionListPages.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// notion-check-updates env vars
backend.notionCheckUpdates.addEnvironment('NOTION_INTEGRATION_TABLE_NAME', notionIntegrationTableName);
backend.notionCheckUpdates.addEnvironment('NOTION_DOCUMENT_TABLE_NAME', notionDocumentTableName);
backend.notionCheckUpdates.addEnvironment('KMS_KEY_ID', notionTokenKey.keyId);
backend.notionCheckUpdates.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.notionCheckUpdates.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.notionCheckUpdates.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);

// notion-import-pages env vars
backend.notionImportPages.addEnvironment('NOTION_INTEGRATION_TABLE_NAME', notionIntegrationTableName);
backend.notionImportPages.addEnvironment('NOTION_DOCUMENT_TABLE_NAME', notionDocumentTableName);
backend.notionImportPages.addEnvironment('BAFATORIO_APP_S3_BUCKET_NAME', storageBucketName);
backend.notionImportPages.addEnvironment('KMS_KEY_ID', notionTokenKey.keyId);
backend.notionImportPages.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');
backend.notionImportPages.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.notionImportPages.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);

// === notion-exchange-token IAM ===
backend.notionExchangeToken.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Encrypt'],
  resources: [notionTokenKey.keyArn],
}));
backend.notionExchangeToken.resources.lambda.addToRolePolicy(
  tablePolicy(['NotionIntegration'], DDB_READ_WRITE)
);
// NOTION_CLIENT_ID/SECRET are injected via secret() in resource.ts (Amplify handles SSM access)

// === notion-list-pages IAM ===
backend.notionListPages.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Decrypt'],
  resources: [notionTokenKey.keyArn],
}));
backend.notionListPages.resources.lambda.addToRolePolicy(
  tablePolicy(['NotionIntegration'], [...DDB_READ, 'dynamodb:DeleteItem'])
);

// === notion-check-updates IAM ===
backend.notionCheckUpdates.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Decrypt'],
  resources: [notionTokenKey.keyArn],
}));
backend.notionCheckUpdates.resources.lambda.addToRolePolicy(
  tablePolicy(['Event', 'EventCollaborator'], DDB_READ)
);
backend.notionCheckUpdates.resources.lambda.addToRolePolicy(
  tablePolicy(['NotionIntegration'], [...DDB_READ, 'dynamodb:DeleteItem'])
);
backend.notionCheckUpdates.resources.lambda.addToRolePolicy(
  tablePolicy(['NotionDocument'], DDB_READ)
);

// === notion-import-pages IAM ===
backend.notionImportPages.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['kms:Decrypt'],
  resources: [notionTokenKey.keyArn],
}));
backend.notionImportPages.resources.lambda.addToRolePolicy(
  tablePolicy(['Event', 'EventCollaborator'], DDB_READ)
);
backend.notionImportPages.resources.lambda.addToRolePolicy(
  tablePolicy(['NotionIntegration'], [...DDB_READ, 'dynamodb:DeleteItem'])
);
backend.notionImportPages.resources.lambda.addToRolePolicy(
  tablePolicy(['NotionDocument'], DDB_READ_WRITE)
);
backend.notionImportPages.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:PutObject', 's3:DeleteObject'],
  resources: [`${backend.storage.resources.bucket.bucketArn}/event-documents/*`],
}));
// === End Notion Integration ===

// === Document Editing: save-document-edit Lambda (AppSync resolver, ADR-021) ===
// Identity is injected by Cognito via AppSync — no Function URL, no spoofable userId header.
// The Lambda authorizes the edit and returns a short-lived pre-signed S3 PUT URL.
backend.saveDocumentEdit.addEnvironment('BAFATORIO_APP_EVENT_TABLE_NAME', backend.data.resources.tables['Event'].tableName);
backend.saveDocumentEdit.addEnvironment('BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME', backend.data.resources.tables['EventCollaborator'].tableName);
backend.saveDocumentEdit.addEnvironment('BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME', backend.data.resources.tables['DocumentFolder'].tableName);
backend.saveDocumentEdit.addEnvironment('BAFATORIO_APP_S3_BUCKET_NAME', backend.storage.resources.bucket.bucketName);
backend.saveDocumentEdit.addEnvironment('BAFATORIO_APP_REGION', 'eu-west-1');

// Read Event, EventCollaborator, DocumentFolder (+ byEventId index on EventCollaborator)
backend.saveDocumentEdit.resources.lambda.addToRolePolicy(tablePolicy(['Event', 'EventCollaborator', 'DocumentFolder'], DDB_READ));
// s3:PutObject is required on the underlying role so the pre-signed URL is valid when used.
backend.saveDocumentEdit.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:PutObject'],
  resources: [`${backend.storage.resources.bucket.bucketArn}/event-documents/*`],
}));

backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrlObject.url,
    emailQueueUrl: queueUrl,
    emailDlqUrl: dlqUrl,
    helloBafatorioLeadsApiUrl: helloLeadsApi.apiEndpoint,
  }
});

// ADR-031 — Suppress sandbox GSI table replacement.
//
// In sandbox, @aws-amplify/backend-data adds a CDK Aspect that sets
// `replaceTableUponGsiUpdate=true` on every Custom::AmplifyDynamoDBTable.
// The handler then performs DROP+CREATE on any add/remove of a GSI —
// including the implicit ones from hasMany/belongsTo — wiping all data.
//
// This counter-Aspect forces the property back to `false`, so sandbox
// behaves like branch deployments (in-place atomic GSI updates).
// Key-schema changes still throw safely; only GSI add/remove is affected.
//
// Priority 1000 (higher than the default Aspect's priority) guarantees
// this runs last regardless of registration order.
//
// REMOVE this override temporarily when you want to validate, in sandbox,
// whether a schema change would cause a destructive table replace in
// production — i.e., when you intentionally want sandbox to be a canary
// for replacement risk. For day-to-day iteration, leave it in place.
Aspects.of(backend.stack).add(
  {
    visit(scope) {
      if (
        scope instanceof CfnResource &&
        scope.cfnResourceType === 'Custom::AmplifyDynamoDBTable'
      ) {
        scope.addPropertyOverride('replaceTableUponGsiUpdate', false);
      }
    },
  },
  { priority: 1000 }
);
