/**
 * @file approve-supplier-selection/handler.ts
 * @description Lambda function to approve/reject pending supplier selections.
 * Authorization is delegated to the shared event permission matrix (ADR-015):
 * the caller must resolve as OWNER/collaborator and hold `supplier:approve`.
 * Follows ADR-013 for DynamoDB owner-key normalization.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

interface ApproveSupplierSelectionArgs {
  eventSupplierId: string;
  approved: boolean;
  rejectionReason?: string;
}

interface EventSupplier {
  id: string;
  eventId: string;
  supplierId: string;
  quoteAmount?: number;
  status: string;
  approvalStatus: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const EVENT_SUPPLIER_TABLE =
  process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

export const handler = async (
  event: AppSyncResolverEvent<ApproveSupplierSelectionArgs>
): Promise<EventSupplier> => {
  const { eventSupplierId, approved, rejectionReason } = event.arguments;

  const identity = event.identity as { sub?: string };
  const approverId = identity?.sub;

  if (!approverId) {
    throw new Error('User identity not found');
  }

  const supplierResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      Key: marshall({ id: eventSupplierId }),
      ConsistentRead: true,
    })
  );

  const eventSupplier = supplierResult.Item
    ? (unmarshall(supplierResult.Item) as EventSupplier)
    : null;

  if (!eventSupplier) {
    throw new Error('EventSupplier not found');
  }

  if (eventSupplier.approvalStatus !== 'PENDING_APPROVAL') {
    throw new Error(
      `This supplier selection is not pending approval (current status: ${eventSupplier.approvalStatus})`
    );
  }

  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId: eventSupplier.eventId,
    userId: approverId,
  });

  if (!access.hasPermission(EVENT_PERMISSIONS.SUPPLIER_APPROVE)) {
    throw new Error('Unauthorized: caller lacks supplier:approve permission');
  }

  // Gate de billing (§4): toda a escrita respeita a janela do plano do dono.
  await ensureEventWritable({
    eventTableName: EVENT_TABLE,
    subscriptionTableName: USER_SUBSCRIPTION_TABLE,
    eventId: eventSupplier.eventId,
    // Event já carregado pelo resolveEventAccess — evita o segundo GetItem
    eventRecord: access.eventRecord,
  });

  const now = new Date().toISOString();
  const newApprovalStatus = approved ? 'APPROVED' : 'REJECTED';
  const newSupplierStatus = approved ? 'APPROVED' : 'REJECTED';

  let updateExpression =
    'SET approvalStatus = :approvalStatus, #st = :supplierStatus, approvedBy = :approvedBy, approvedAt = :approvedAt, updatedAt = :updatedAt';
  const expressionAttributeNames: Record<string, string> = {
    '#st': 'status',
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ':approvalStatus': newApprovalStatus,
    ':supplierStatus': newSupplierStatus,
    ':approvedBy': approverId,
    ':approvedAt': now,
    ':updatedAt': now,
    ':pendingApproval': 'PENDING_APPROVAL',
  };

  if (!approved && rejectionReason) {
    updateExpression += ', rejectionReason = :rejectionReason';
    expressionAttributeValues[':rejectionReason'] = rejectionReason;
  }

  const quoteAmount = eventSupplier.quoteAmount || 0;
  const shouldUpdateBudget = approved && quoteAmount > 0;

  if (shouldUpdateBudget) {
    const transactItems = [
      {
        Update: {
          TableName: EVENT_SUPPLIER_TABLE,
          Key: marshall({ id: eventSupplierId }),
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: marshall(expressionAttributeValues),
          ConditionExpression: 'approvalStatus = :pendingApproval',
        },
      },
      {
        Update: {
          TableName: EVENT_TABLE,
          Key: marshall({ id: eventSupplier.eventId }),
          UpdateExpression:
            'SET committedExpenses = if_not_exists(committedExpenses, :zero) + :quote',
          ExpressionAttributeValues: marshall({
            ':quote': quoteAmount,
            ':zero': 0,
          }),
          ConditionExpression: 'attribute_exists(id)',
        },
      },
    ];

    await client.send(
      new TransactWriteItemsCommand({ TransactItems: transactItems })
    );
  } else {
    await client.send(
      new UpdateItemCommand({
        TableName: EVENT_SUPPLIER_TABLE,
        Key: marshall({ id: eventSupplierId }),
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ConditionExpression: 'approvalStatus = :pendingApproval',
      })
    );
  }

  const updatedResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      Key: marshall({ id: eventSupplierId }),
    })
  );

  const updatedEventSupplier = updatedResult.Item
    ? (unmarshall(updatedResult.Item) as EventSupplier)
    : {
        ...eventSupplier,
        approvalStatus: newApprovalStatus,
        status: newSupplierStatus,
        approvedBy: approverId,
        approvedAt: now,
      };

  return updatedEventSupplier;
};
