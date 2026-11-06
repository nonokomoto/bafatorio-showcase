/**
 * @file billingApi.js
 * @description RTK Query API para os dados de billing da conta (modelo
 * Grátis/Pro/Por-evento — docs/plans/2026-07-11-billing-subscription-model.md).
 *
 * Leitura direta dos modelos (owner read): UserSubscription (escrito pelo
 * webhook Stripe, planName canónico + status incl. 'paused'), PlanPurchase
 * (compras Pay-per-event) e PaymentMethodData (cartão atual, mantido em sync
 * pelo webhook em payment_method.attached/detached). Faturas e alterações ao
 * método de pagamento vivem no portal Stripe (createBillingPortalSession).
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';
import { resolvePlanKey } from '../../Utils/plans';

// Custom base query for Amplify GraphQL
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    console.error('[billingApi] GraphQL error:', error.message || error);
    return { error: { status: error.statusCode, data: error, message: error.message } };
  }
};

const GET_MY_SUBSCRIPTION_DOCUMENT = /* GraphQL */ `
  query GetUserSubscription($id: String!) {
    getUserSubscription(id: $id) {
      id
      planName
      status
      billingCycle
      currentPeriodEnd
      cancelAtPeriodEnd
      cancelAt
      canceledAt
    }
  }
`;

const GET_MY_PAYMENT_METHOD_DOCUMENT = /* GraphQL */ `
  query GetPaymentMethodData($id: String!) {
    getPaymentMethodData(id: $id) {
      id
      brand
      last4
      expiryMonth
      expiryYear
    }
  }
`;

const LIST_MY_PLAN_PURCHASES_DOCUMENT = /* GraphQL */ `
  query ListPlanPurchaseByUserId($userId: String!, $limit: Int) {
    listPlanPurchaseByUserId(userId: $userId, limit: $limit) {
      items {
        id
        planKey
        amount
        currency
        consumedByEventId
        consumedAt
        refundedAt
        createdAt
      }
      nextToken
    }
  }
`;

const CREATE_BILLING_PORTAL_SESSION_DOCUMENT = /* GraphQL */ `
  mutation CreateBillingPortalSession($returnUrl: String) {
    createBillingPortalSession(returnUrl: $returnUrl) {
      success
      sessionUrl
      message
    }
  }
`;

// Get por owner a um registo keyed pelo próprio userId. Item inexistente (ou
// owner que não bate, ex.: legado) devolve Unauthorized no AppSync — auth por
// owner não avalia itens que não existem. Como a query é sempre ao próprio id,
// isso é "não existe", não um erro; outros erros propagam.
const ownerGet = async (document, rootField, userId) => {
  try {
    const response = await getClient().graphql({ query: document, variables: { id: userId } });
    return { data: response.data?.[rootField] ?? null };
  } catch (error) {
    const errors = Array.isArray(error?.errors) ? error.errors : [];
    if (errors.length > 0 && errors.every((e) => e?.errorType === 'Unauthorized')) {
      return { data: null };
    }
    console.error('[billingApi] GraphQL error:', error.message || error);
    return { error: { status: error.statusCode, data: error, message: error.message } };
  }
};

export const billingApi = createApi({
  reducerPath: 'billingApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Subscription', 'PlanPurchase', 'PaymentMethod'],
  endpoints: (builder) => ({
    // Subscrição Pro da conta (id do registo = userId). null = nunca subscreveu.
    // planKey é o planName normalizado — nomes legados resolvem para null
    // (fail-closed, plans.js) e a UI trata como "sem plano".
    getMySubscription: builder.query({
      queryFn: async (userId) => {
        const result = await ownerGet(GET_MY_SUBSCRIPTION_DOCUMENT, 'getUserSubscription', userId);
        if (result.error || !result.data) return result;
        return { data: { ...result.data, planKey: resolvePlanKey(result.data.planName) } };
      },
      providesTags: ['Subscription'],
    }),

    // Cartão atual (um por utilizador, mantido pelo webhook em
    // payment_method.attached/detached). null = sem cartão guardado.
    getMyPaymentMethod: builder.query({
      queryFn: (userId) => ownerGet(GET_MY_PAYMENT_METHOD_DOCUMENT, 'getPaymentMethodData', userId),
      providesTags: ['PaymentMethod'],
    }),

    // Compras Pay-per-event (GSI byUserId). Uma página de 100 chega — cada
    // compra é um evento; ninguém compra centenas.
    getMyPlanPurchases: builder.query({
      query: (userId) => ({
        document: LIST_MY_PLAN_PURCHASES_DOCUMENT,
        variables: { userId, limit: 100 },
      }),
      transformResponse: (response) => response?.listPlanPurchaseByUserId?.items ?? [],
      providesTags: ['PlanPurchase'],
    }),

    // Portal Stripe — o customer resolve-se no backend a partir da identity
    // (ADR-019); o cliente só envia o returnUrl.
    createBillingPortalSession: builder.mutation({
      query: ({ returnUrl }) => ({
        document: CREATE_BILLING_PORTAL_SESSION_DOCUMENT,
        variables: { returnUrl },
      }),
      transformResponse: (response) => response?.createBillingPortalSession,
    }),
  }),
});

export const {
  useGetMySubscriptionQuery,
  useGetMyPaymentMethodQuery,
  useGetMyPlanPurchasesQuery,
  useCreateBillingPortalSessionMutation,
} = billingApi;
