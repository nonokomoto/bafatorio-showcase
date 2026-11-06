import { defineFunction } from "@aws-amplify/backend";

export const participantStream = defineFunction({
    name: 'participantStreamHandler',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    // Environment variables are set dynamically in backend.ts
});
