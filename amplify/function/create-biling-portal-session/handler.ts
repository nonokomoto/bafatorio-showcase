import { Context } from 'aws-lambda';
import { Stripe } from 'stripe';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const ddbClient = new DynamoDBClient({});
const logger = new Logger({ serviceName: 'create-billing-portal-session' });

const USER_SUBSCRIPTION_TABLE = process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: { arguments: any; identity?: { sub?: string } }, context?: Context) => {
    if (context) logger.addContext(context);

    // O requester é quem o Cognito diz — nunca o argumento customerId (ADR-019).
    // Aceitar o customerId do cliente permitia abrir o portal de OUTRO cliente:
    // ver faturas, cancelar subscrições, trocar o cartão de outra pessoa.
    const userId = event.identity?.sub;
    const { returnUrl } = event.arguments;
    if (!userId || !returnUrl) {
        logger.error('Invalid request', { hasUserId: Boolean(userId), hasReturnUrl: Boolean(returnUrl) });
        return { success: false, message: 'Invalid request' };
    }

    // O customer resolve-se do registo do próprio caller, não do argumento.
    const subscription = await ddbClient.send(new GetItemCommand({
        TableName: USER_SUBSCRIPTION_TABLE,
        Key: { id: { S: userId } },
    }));
    const customerId = subscription.Item?.stripeCustomerId?.S;
    if (!customerId) {
        logger.warn('No Stripe customer for caller', { userId });
        return { success: false, message: 'No billing account to manage' };
    }

    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        logger.info('Billing portal session created', { userId });
        return {
            success: true,
            sessionUrl: portalSession.url,
            message: 'Billing portal session created successfully',
        };
    } catch (error) {
        logger.error('Error creating billing portal session', { error });
        return { success: false, message: 'Error creating billing portal session' };
    }
};
