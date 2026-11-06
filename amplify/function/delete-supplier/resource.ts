import { defineFunction } from '@aws-amplify/backend';

export const deleteSupplierFunction = defineFunction({
  name: 'deleteSupplier',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
