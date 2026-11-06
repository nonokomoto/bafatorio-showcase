import { defineFunction } from '@aws-amplify/backend';

export const fidelizeSyncParticipantsFunction = defineFunction({
  name: 'fidelize-sync-participants',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
