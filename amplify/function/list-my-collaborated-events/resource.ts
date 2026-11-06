// function/list-my-collaborated-events/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const listMyCollaboratedEventsFunction = defineFunction({
  name: 'listMyCollaboratedEvents',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
