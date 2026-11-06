/**
 * @file events/update-event/resource.ts
 * @description Lambda de edição de eventos gated (role event:edit + janela de
 * escrita §4). Substitui a mutation automática do modelo Event.
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateEventFunction = defineFunction({
  name: 'update-event',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
