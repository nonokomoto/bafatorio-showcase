import { defineFunction, secret } from '@aws-amplify/backend';

export const saveEarlyAccessLeadFunction = defineFunction({
  name: 'save-early-access-lead',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 256,
  resourceGroupName: 'data',
  environment: {
    EARLY_ACCESS_RATE_LIMIT_SECRET: secret('EARLY_ACCESS_RATE_LIMIT_SECRET'),
  },
});
