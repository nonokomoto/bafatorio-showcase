import { defineFunction } from "@aws-amplify/backend";

export const dependentStream = defineFunction({
    name: 'dependentStreamHandler',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    // Environment variables are set dynamically in backend.ts
});
