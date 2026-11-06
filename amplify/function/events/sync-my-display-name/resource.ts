/**
 * @file events/sync-my-display-name/resource.ts
 * @description Propaga o nome real do Cognito para os snapshots
 * desnormalizados (EventCollaborator.userName, Event.ownerName) depois de o
 * utilizador mudar o nome no perfil.
 */

import { defineFunction } from '@aws-amplify/backend';

export const syncMyDisplayNameFunction = defineFunction({
  name: 'sync-my-display-name',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
