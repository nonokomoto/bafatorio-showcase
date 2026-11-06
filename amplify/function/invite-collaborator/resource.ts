// function/invite-collaborator/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const inviteCollaboratorFunction = defineFunction({
  name: 'inviteCollaborator',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
  environment: {}
});
