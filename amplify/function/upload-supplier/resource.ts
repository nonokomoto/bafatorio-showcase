import { defineFunction } from '@aws-amplify/backend';

export const uploadSupplierFunction = defineFunction({
    name: 'uploadSupplier',
    entry: './handler.ts',
    timeoutSeconds: 60,
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    // Environment variables are set dynamically in backend.ts
});