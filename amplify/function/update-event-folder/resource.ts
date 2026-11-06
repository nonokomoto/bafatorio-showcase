/**
 * @file update-event-folder/resource.ts
 * @description Lambda function resource for updating event document folders (ADR-021)
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateEventFolderFunction = defineFunction({
  name: 'update-event-folder',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
