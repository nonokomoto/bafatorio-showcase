/**
 * @file delete-event-folder/resource.ts
 * @description Lambda function resource for deleting event document folders (ADR-021)
 */

import { defineFunction } from '@aws-amplify/backend';

export const deleteEventFolderFunction = defineFunction({
  name: 'delete-event-folder',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
