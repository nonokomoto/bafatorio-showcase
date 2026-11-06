import { defineFunction } from "@aws-amplify/backend";

export const confirmParticipant = defineFunction({
    name: 'confirm-participant',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    // Environment variables are set dynamically in backend.ts
});