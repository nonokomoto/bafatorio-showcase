/**
 * @file update-collaborator-role/resource.ts
 * @description Lambda function resource for updating a collaborator's role
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateCollaboratorRoleFunction = defineFunction({
  name: 'update-collaborator-role',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
