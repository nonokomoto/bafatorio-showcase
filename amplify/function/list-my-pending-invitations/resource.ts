// function/list-my-pending-invitations/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const listMyPendingInvitationsFunction = defineFunction({
  name: 'listMyPendingInvitations',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
