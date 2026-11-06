/**
 * @file list-event-folders/resource.ts
 * @description Lambda function resource for listing event folders
 */

import { defineFunction } from '@aws-amplify/backend';

export const listEventFoldersFunction = defineFunction({
  name: 'list-event-folders',
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
  timeoutSeconds: 30,
});
