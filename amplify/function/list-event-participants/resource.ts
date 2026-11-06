// function/list-event-participants/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const listEventParticipantsFunction = defineFunction({
  name: 'listEventParticipants',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
