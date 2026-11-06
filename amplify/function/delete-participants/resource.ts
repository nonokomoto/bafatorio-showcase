//funtion/delete-participants/resource
import { defineFunction } from "@aws-amplify/backend";

export const deleteParticipants = defineFunction({
    name: 'deleteParticipants',
    entry: './handler.ts',
    timeoutSeconds: 600,
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});

