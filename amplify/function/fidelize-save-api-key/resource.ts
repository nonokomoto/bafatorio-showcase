import { defineFunction } from '@aws-amplify/backend';

export const fidelizeSaveApiKeyFunction = defineFunction({
  name: 'fidelize-save-api-key',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
