import { defineFunction } from '@aws-amplify/backend';

export const updateEventSupplierForRoleFunction = defineFunction({
  name: 'updateEventSupplierForRole',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
