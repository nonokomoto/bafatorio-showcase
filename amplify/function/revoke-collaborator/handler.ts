/**
 * @file revoke-collaborator/handler.ts
 * @description Lambda function to revoke/remove a collaborator from an event
 * Deletes the EventCollaborator record
 *
 * Per ACCESS_LEVELS_STRATEGY.md:
 * - OWNER can remove anyone
 * - CO_MANAGER can remove Staff (but not other Co-Managers)
 * - Staff cannot remove anyone
 *
 * Follows ADR-013 pattern for DynamoDB owner keys
 */

import {
  DynamoDBClient,
  GetItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

// Types
interface RevokeCollaboratorArgs {
  collaboratorId: string;
}

/**
 * Normalize user ID to handle both Amplify Gen 1 (userId::userId) and Gen 2 (userId) formats.
 * Ensures consistent owner comparison across all Lambda handlers.
 * @see get-event-as-collaborator/handler.ts for canonical implementation
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

// DynamoDB client
const client = new DynamoDBClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

// Table names from environment
const EVENT_TABLE = process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '';
const COLLABORATOR_TABLE =
  process.env.BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME || '';

/**
 * Main handler for revoking collaborators
 */
export const handler = async (
  event: AppSyncResolverEvent<RevokeCollaboratorArgs>
): Promise<boolean> => {
  const { collaboratorId } = event.arguments;

  // 1. Extract revoker identity
  const identity = event.identity as { sub?: string };
  const revokerId = identity?.sub;

  if (!revokerId) {
    console.error('[revokeCollaborator] Identity error: user not found');
    throw new Error('User identity not found');
  }

  console.log(
    `[revokeCollaborator] Revoke request for ${collaboratorId} by ${revokerId}`
  );

  // 2. First, we need to find the collaborator record
  // Fetch by id (Partition Key)
  const getResult = await client.send(
    new GetItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
    })
  );

  let collaborator;

  if (getResult.Item) {
    collaborator = unmarshall(getResult.Item);
    console.log(
      `[revokeCollaborator] Found collaborator: ${collaborator.userEmail}`
    );
  } else {
    console.error(
      `[revokeCollaborator] Cannot find collaborator record ${collaboratorId}`
    );
    throw new Error('Collaborator not found');
  }

  // 3. Verify revoker has permission to remove this collaborator
  const eventId = collaborator.eventId;

  // Check if revoker is the event owner using normalized comparison
  let isEventOwner = false;
  try {
    const eventResult = await client.send(
      new GetItemCommand({
        TableName: EVENT_TABLE,
        Key: marshall({ id: eventId }),
        ProjectionExpression: 'id, #owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
      })
    );

    if (eventResult.Item) {
      const eventItem = unmarshall(eventResult.Item);
      if (normalizeUserId(eventItem.owner) === revokerId) {
        isEventOwner = true;
        console.log(`[revokeCollaborator] Revoker is event owner`);
      } else {
        console.log(`[revokeCollaborator] Revoker ${revokerId} is NOT owner (owner normalized: ${normalizeUserId(eventItem.owner)})`);
      }
    }
  } catch (err) {
    console.error(`[revokeCollaborator] Error checking event ownership:`, err);
    isEventOwner = false;
  }

  if (!isEventOwner) {
    // Check if revoker is CO_MANAGER for this event
    const revokerCollabQuery = await client.send(
      new QueryCommand({
        TableName: COLLABORATOR_TABLE,
        IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :eid',
        FilterExpression: 'userId = :uid AND #st = :accepted',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: marshall({
          ':eid': eventId,
          ':uid': revokerId,
          ':accepted': 'ACCEPTED',
        }),
      })
    );

    const revokerCollab = revokerCollabQuery.Items?.[0]
      ? unmarshall(revokerCollabQuery.Items[0])
      : null;

    if (!revokerCollab || revokerCollab.role !== 'CO_MANAGER') {
      console.error(
        `[revokeCollaborator] User ${revokerId} is not authorized to revoke collaborators`
      );
      throw new Error('Unauthorized: Only owners and co-managers can remove collaborators');
    }

    // CO_MANAGER can only remove Staff, not other Co-Managers
    if (collaborator.role === 'CO_MANAGER') {
      console.error(
        `[revokeCollaborator] CO_MANAGER cannot remove another CO_MANAGER`
      );
      throw new Error('Unauthorized: Co-managers cannot remove other co-managers');
    }

    console.log(`[revokeCollaborator] CO_MANAGER removing ${collaborator.role}`);
  }

  // 4. Delete the collaborator record
  await client.send(
    new DeleteItemCommand({
      TableName: COLLABORATOR_TABLE,
      Key: marshall({ id: collaboratorId }),
    })
  );

  console.log(
    `[revokeCollaborator] Collaborator revoked: ${collaboratorId} (${collaborator.userEmail})`
  );

  return true;
};
