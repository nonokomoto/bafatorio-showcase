// function/accept-invitation/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const acceptInvitationFunction = defineFunction({
  name: 'acceptInvitation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
  environment: {
    BAFATORIO_APP_USER_POOL_ID: process.env.BAFATORIO_APP_USER_POOL_ID || '',
  },
});
