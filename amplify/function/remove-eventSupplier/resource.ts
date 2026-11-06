import { defineFunction } from '@aws-amplify/backend';

export const removeEventSupplierFunction = defineFunction({
    name: 'removeEventSupplierFunction',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    // Environment variables are set dynamically in backend.ts using addEnvironment()
});

