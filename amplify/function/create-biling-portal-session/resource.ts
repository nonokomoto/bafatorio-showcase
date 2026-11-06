import { defineFunction, secret } from '@aws-amplify/backend';


export const createBillingPortalSession = defineFunction({
    name: 'createBillingPortalSession',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    environment: {
        STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    },
})