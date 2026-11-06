import { defineFunction } from '@aws-amplify/backend';

export const notionListPagesFunction = defineFunction({
  name: 'notion-list-pages',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
