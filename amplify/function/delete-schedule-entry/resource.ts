import { defineFunction } from '@aws-amplify/backend';

export const deleteScheduleEntryFunction = defineFunction({
  name: 'delete-schedule-entry',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
