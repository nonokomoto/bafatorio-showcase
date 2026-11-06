/**
 * @file update-event-supplier-for-role/handler.ts
 * @description Lambda-backed update for EventSupplier that honors the shared
 * event permission matrix (ADR-015 / ADR-019). Callers need SUPPLIER_EDIT.
 * Allowed fields are scoped to what the UI currently mutates — approval and
 * payment follow their dedicated workflows.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

import { EVENT_PERMISSIONS } from '../shared/eventPermissions';
import { resolveEventAccess } from '../shared/resolveEventAccess';
import { ensureEventWritable } from '../shared/entitlementGate';

interface UpdateEventSupplierForRoleArgs {
  eventSupplierId: string;
  quoteAmount?: number | null;
  status?: 'PENDING' | 'COUNTING_ON' | 'REJECTED' | null;
  invoiceS3Key?: string | null;
}

interface EventSupplier {
  id: string;
  eventId: string;
  supplierId: string;
  quoteAmount?: number | null;
  status?: string | null;
  invoiceS3Key?: string | null;
  owner: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const EVENT_SUPPLIER_TABLE = process.env.BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME || '';
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE = process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';
const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// None of these touch the event balances, so they can be set freely here.
const ALLOWED_STATUSES = new Set(['PENDING', 'COUNTING_ON', 'REJECTED']);
// APPROVED/PAID rows hold money in committed/effective expenses — leaving them
// must go through revertEventSupplierApproval so the balance is released.
const BALANCE_HOLDING_STATUSES = new Set(['APPROVED', 'PAID']);

export const handler = async (
  event: AppSyncResolverEvent<UpdateEventSupplierForRoleArgs>
): Promise<EventSupplier> => {
  const { eventSupplierId, quoteAmount, status, invoiceS3Key } = event.arguments;

  const identity = event.identity as { sub?: string };
  const userId = identity?.sub;
  if (!userId) {
    throw new Error('User identity not found');
  }

  if (!EVENT_SUPPLIER_TABLE || !EVENT_TABLE || !COLLABORATOR_TABLE) {
    throw new Error('Internal server configuration error');
  }

  const supplierResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      Key: marshall({ id: eventSupplierId }),
      ConsistentRead: true,
    })
  );
  if (!supplierResult.Item) {
    throw new Error('EventSupplier not found');
  }
  const eventSupplier = unmarshall(supplierResult.Item) as EventSupplier;

  const access = await resolveEventAccess({
    eventTableName: EVENT_TABLE,
    collaboratorTableName: COLLABORATOR_TABLE,
    eventId: eventSupplier.eventId,
    userId,
  });

  if (!access.hasPermission(EVENT_PERMISSIONS.SUPPLIER_EDIT)) {
    throw new Error('Unauthorized: caller lacks supplier:edit permission');
  }

  // Checked only after authorization so a caller without access can't probe
  // whether a row is APPROVED/PAID from the error message. `null` counts as a
  // status write too: clearing an APPROVED status would strand its balance.
  const writesStatus = status !== undefined;
  if (
    writesStatus &&
    ((status !== null && !ALLOWED_STATUSES.has(status)) ||
      (status !== eventSupplier.status && BALANCE_HOLDING_STATUSES.has(eventSupplier.status ?? '')))
  ) {
    throw new Error(
      'Status transition must follow the approval/payment workflow, not this mutation.'
    );
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
  const sets: string[] = ['updatedAt = :updatedAt'];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (quoteAmount !== undefined) {
    sets.push('quoteAmount = :quoteAmount');
    values[':quoteAmount'] = quoteAmount;
  }
  if (status !== undefined) {
    sets.push('#st = :status');
    names['#st'] = 'status';
    values[':status'] = status;
  }
  if (invoiceS3Key !== undefined) {
    sets.push('invoiceS3Key = :invoiceS3Key');
    values[':invoiceS3Key'] = invoiceS3Key;
  }

  const updateExpression = `SET ${sets.join(', ')}`;

  // The check above ran on a snapshot; an approval/payment can land before this
  // write. Re-asserting it in the condition makes the check-and-write atomic.
  let conditionExpression = 'attribute_exists(id)';
  if (writesStatus) {
    conditionExpression += ' AND (attribute_not_exists(#st) OR NOT (#st IN (:approved, :paid)))';
    values[':approved'] = 'APPROVED';
    values[':paid'] = 'PAID';
  }

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: EVENT_SUPPLIER_TABLE,
        Key: marshall({ id: eventSupplierId }),
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: marshall(values, { removeUndefinedValues: true }),
        ConditionExpression: conditionExpression,
      })
    );
  } catch (error) {
    if (writesStatus && (error as { name?: string })?.name === 'ConditionalCheckFailedException') {
      throw new Error(
        'Supplier status changed meanwhile (approved or paid). Status transitions from there must follow the approval/payment workflow.'
      );
    }
    throw error;
  }

  const updatedResult = await client.send(
    new GetItemCommand({
      TableName: EVENT_SUPPLIER_TABLE,
      Key: marshall({ id: eventSupplierId }),
    })
  );

  if (!updatedResult.Item) {
    return { ...eventSupplier, updatedAt: now };
  }

  return unmarshall(updatedResult.Item) as EventSupplier;
};
