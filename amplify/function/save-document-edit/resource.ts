import { defineFunction } from '@aws-amplify/backend';

export const saveDocumentEditFunction = defineFunction({
  name: 'save-document-edit',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});
