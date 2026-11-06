import { defineFunction } from '@aws-amplify/backend';

export const updateScheduleEntryFunction = defineFunction({
  name: 'update-schedule-entry',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
