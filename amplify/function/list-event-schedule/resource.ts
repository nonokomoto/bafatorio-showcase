import { defineFunction } from '@aws-amplify/backend';

export const listEventScheduleFunction = defineFunction({
  name: 'list-event-schedule',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
