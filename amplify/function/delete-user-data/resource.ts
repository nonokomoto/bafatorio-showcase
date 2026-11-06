//function/delete-user-data/resource
import { defineFunction } from "@aws-amplify/backend";

export const deleteUserDataFunction = defineFunction({
    name: 'deleteUserData',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    timeoutSeconds: 600, // 10 minutes - enough time to delete from multiple tables and S3
    memoryMB: 512, // Increase memory for multiple concurrent operations
    // Environment variables are set dynamically in backend.ts
});