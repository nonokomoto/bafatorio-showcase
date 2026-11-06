import { defineFunction } from "@aws-amplify/backend";

export const createParticipantCollaboratorFunction = defineFunction({
    name: 'create-participant-collaborator',
    entry: './handler.ts',
    resourceGroupName: 'data',
});
