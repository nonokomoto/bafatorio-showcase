/**
 * @file events/create-event/resource.ts
 * @description Lambda de criação de eventos com gate de conta (substitui a
 * mutation automática do modelo Event). Primeira função na estrutura por
 * domínio (events/) — as existentes migram num chore separado.
 */

import { defineFunction } from '@aws-amplify/backend';

export const createEventFunction = defineFunction({
  name: 'create-event',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
