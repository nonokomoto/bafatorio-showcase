import { defineFunction } from '@aws-amplify/backend';

export const importNormalizedSuppliersFunction = defineFunction({
  name: 'importNormalizedSuppliers',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
  // Environment variables are set dynamically in backend.ts
});
