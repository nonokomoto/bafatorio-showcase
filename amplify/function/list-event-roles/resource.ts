/**
 * @file list-event-roles/resource.ts
 * @description Lambda function resource for listing event roles
 */

import { defineFunction } from '@aws-amplify/backend';

export const listEventRolesFunction = defineFunction({
  name: 'list-event-roles',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
