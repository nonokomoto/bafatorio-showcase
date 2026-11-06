// function/decline-invitation/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const declineInvitationFunction = defineFunction({
  name: 'declineInvitation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
