/**
 * @file create-event-role/resource.ts
 * @description Lambda function resource for creating event-scoped roles
 */

import { defineFunction } from '@aws-amplify/backend';

export const createEventRoleFunction = defineFunction({
  name: 'create-event-role',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
