/**
 * @file update-collaborator-folders/resource.ts
 * @description Lambda function resource for updating collaborator shared folders
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateCollaboratorFoldersFunction = defineFunction({
  name: 'update-collaborator-folders',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
