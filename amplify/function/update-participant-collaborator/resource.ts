import { defineFunction } from "@aws-amplify/backend";

export const updateParticipantCollaboratorFunction = defineFunction({
    name: 'update-participant-collaborator',
    entry: './handler.ts',
    resourceGroupName: 'data',
});
