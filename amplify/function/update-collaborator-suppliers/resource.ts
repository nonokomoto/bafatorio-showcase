/**
 * @file update-collaborator-suppliers/resource.ts
 * @description Lambda function resource for updating collaborator shared suppliers
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateCollaboratorSuppliersFunction = defineFunction({
  name: 'update-collaborator-suppliers',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
