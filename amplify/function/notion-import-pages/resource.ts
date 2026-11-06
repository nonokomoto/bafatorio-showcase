import { defineFunction } from '@aws-amplify/backend';

export const notionImportPagesFunction = defineFunction({
  name: 'notion-import-pages',
  resourceGroupName: 'data',
  timeoutSeconds: 29,
});
