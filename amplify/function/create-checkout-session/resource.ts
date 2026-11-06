import { defineFunction, secret } from "@aws-amplify/backend";

export const createCheckoutSession = defineFunction({
    name: 'createCheckoutSession',
    entry: './handler.ts',
    resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
    environment: {
        STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
        // Price IDs por ambiente (test vs live) — o preço resolve-se no servidor;
        // o frontend só envia planKey + billingCycle (src/Api/billingCheckout.js).
        STRIPE_PRICE_PRO_MONTHLY: secret('STRIPE_PRICE_PRO_MONTHLY'),
        STRIPE_PRICE_PRO_ANNUAL: secret('STRIPE_PRICE_PRO_ANNUAL'),
        // Um price por escalão do Por Evento (ADR-038). O STRIPE_PRICE_PAY_PER_EVENT
        // antigo saiu daqui; só se apaga da Stripe DEPOIS do deploy, porque as
        // Lambdas em execução ainda o leem.
        STRIPE_PRICE_PPE_100: secret('STRIPE_PRICE_PPE_100'),
        STRIPE_PRICE_PPE_200: secret('STRIPE_PRICE_PPE_200'),
        STRIPE_PRICE_PPE_UNLIMITED: secret('STRIPE_PRICE_PPE_UNLIMITED'),
        // Produto dedicado do upgrade de escalão: as diferenças são cobradas por
        // price_data inline, sem preços de catálogo (ADR-034).
        STRIPE_PRODUCT_TIER_UPGRADE: secret('STRIPE_PRODUCT_TIER_UPGRADE'),
    },
    // Other environment variables are set dynamically in backend.ts
});