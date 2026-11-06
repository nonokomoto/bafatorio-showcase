import { defineFunction, secret } from "@aws-amplify/backend";

export const handleStripeWebhook = defineFunction({
    name: 'handleStripeWebhook',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    environment: {
        STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
        STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
    },
    // Other environment variables are set dynamically in backend.ts
});