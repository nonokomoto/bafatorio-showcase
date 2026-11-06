/**
 * @file billing/get-account-access/resource.ts
 * @description Query de acesso de conta para a UI — mesma decisão do gate do
 * create-event (resolveAccountEntitlements), sem efeitos secundários.
 */

import { defineFunction } from '@aws-amplify/backend';

export const getAccountAccessFunction = defineFunction({
  name: 'get-account-access',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
