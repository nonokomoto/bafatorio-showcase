import { defineFunction } from '@aws-amplify/backend';

export const createDependentFunction = defineFunction({
  name: 'createDependent',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});
