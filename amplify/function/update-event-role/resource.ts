/**
 * @file update-event-role/resource.ts
 * @description Lambda function resource for updating event-scoped roles
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateEventRoleFunction = defineFunction({
  name: 'update-event-role',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
