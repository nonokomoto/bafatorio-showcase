import { defineFunction } from '@aws-amplify/backend';

export const importNormalizedEventSuppliersFunction = defineFunction({
  name: 'importNormalizedEventSuppliers',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data',
});
