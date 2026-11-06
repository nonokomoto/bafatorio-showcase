import { defineFunction } from '@aws-amplify/backend';

export const notionCheckUpdatesFunction = defineFunction({
  name: 'notion-check-updates',
  resourceGroupName: 'data',
  timeoutSeconds: 20,
});
