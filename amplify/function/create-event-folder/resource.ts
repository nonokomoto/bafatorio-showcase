/**
 * @file create-event-folder/resource.ts
 * @description Lambda function resource for creating event document folders (ADR-021)
 */

import { defineFunction } from '@aws-amplify/backend';

export const createEventFolderFunction = defineFunction({
  name: 'create-event-folder',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
