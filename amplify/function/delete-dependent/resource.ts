import { defineFunction } from '@aws-amplify/backend';

export const deleteDependent = defineFunction({
  name: 'deleteDependent',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});
