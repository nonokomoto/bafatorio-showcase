// function/get-event-as-collaborator/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const getEventAsCollaboratorFunction = defineFunction({
  name: 'getEventAsCollaborator',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
