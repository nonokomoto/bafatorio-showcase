import { defineFunction } from '@aws-amplify/backend';

export const updateDependentFunction = defineFunction({
  name: 'updateDependent',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});
