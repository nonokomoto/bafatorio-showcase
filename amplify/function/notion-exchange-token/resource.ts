import { defineFunction, secret } from '@aws-amplify/backend';

export const notionExchangeTokenFunction = defineFunction({
  name: 'notion-exchange-token',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
  environment: {
    NOTION_CLIENT_ID: secret('NOTION_CLIENT_ID'),
    NOTION_CLIENT_SECRET: secret('NOTION_CLIENT_SECRET'),
  },
});
