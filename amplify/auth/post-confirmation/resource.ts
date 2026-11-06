import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  // optionally define an environment variable for your group name
  environment: {
    GROUP_NAME: 'USER',
    BAFATORIO_APP_DEFAULT_FROM_EMAIL: 'noreply@bafatorio.com'
  },
  resourceGroupName: 'auth',
});