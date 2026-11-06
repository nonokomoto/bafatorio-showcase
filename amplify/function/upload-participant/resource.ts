import { defineFunction } from "@aws-amplify/backend";

export const uploadParticipants = defineFunction({
    name: 'uploadParticipants',
    entry: './handler.ts',
    timeoutSeconds: 60,
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    // Environment variables are set dynamically in backend.ts
    // to use the correct table names for each environment (sandbox/production)
});