/**
 * @file delete-event-role-validated/resource.ts
 * @description Lambda function resource for safely deleting event-scoped roles with participant validation
 */

import { defineFunction } from '@aws-amplify/backend';

export const deleteEventRoleValidatedFunction = defineFunction({
  name: 'delete-event-role-validated',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
