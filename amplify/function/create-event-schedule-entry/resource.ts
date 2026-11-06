import { defineFunction } from '@aws-amplify/backend';

export const createEventScheduleEntryFunction = defineFunction({
  name: 'create-event-schedule-entry',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
