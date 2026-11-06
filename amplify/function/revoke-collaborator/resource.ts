// function/revoke-collaborator/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const revokeCollaboratorFunction = defineFunction({
  name: 'revokeCollaborator',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
