import { defineFunction } from '@aws-amplify/backend';

export const listEventCollaboratorsFunction = defineFunction({
  name: 'list-event-collaborators',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
  environment: {
    BAFATORIO_APP_REGION: 'eu-west-1',
  },
});
