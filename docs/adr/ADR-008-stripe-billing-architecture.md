# ADR-008: Stripe Billing System Architecture

## Status
**Accepted** | Data: 2025-01-23

## Contexto

O Bafatorio necessita de um sistema de faturação para monetizar a plataforma. Os requisitos incluem:

- Dois tipos de planos: **Plano Organizador** (subscrição) e **Plano Flex** (pay-per-use)
- Checkout seguro via Stripe
- Portal de faturação self-service para gestão de pagamentos
- Webhooks para sincronização em tempo real
- Controlo de acesso a funcionalidades baseado em estado da subscrição
- Histórico de faturas acessível ao utilizador

## Decisão

Implementámos uma arquitetura baseada em Stripe Checkout + Webhooks, com sincronização via DynamoDB e integração com Cognito para controlo de acesso.

### Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         STRIPE BILLING FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│ createCheckout   │────▶│    Stripe       │
│  (React)    │     │ Session Lambda   │     │   Checkout      │
└─────────────┘     └──────────────────┘     └─────────────────┘
      │                                              │
      │                                              │ Payment Success
      │                                              ▼
      │                                       ┌─────────────────┐
      │                                       │    Stripe       │
      │                                       │   Webhooks      │
      │                                       └─────────────────┘
      │                                              │
      │                                              ▼
      │         ┌───────────────────────────────────────────────┐
      │         │           handle-stripe-webhook               │
      │         │                Lambda                         │
      │         └───────────────────────────────────────────────┘
      │                          │
      │          ┌───────────────┼───────────────┐
      │          ▼               ▼               ▼
      │    ┌───────────┐  ┌───────────┐  ┌───────────┐
      │    │ DynamoDB  │  │ DynamoDB  │  │  Cognito  │
      │    │ UserSub   │  │ Invoice   │  │  Groups   │
      │    └───────────┘  └───────────┘  └───────────┘
      │          │               │               │
      │          └───────────────┴───────────────┘
      │                          │
      ▼                          ▼
┌─────────────┐     ┌───────────────────────────────┐
│   Redux     │◀────│    GraphQL Subscriptions      │
│   Store     │     │   (Real-time Updates)         │
└─────────────┘     └───────────────────────────────┘
```

## Componentes Principais

### 1. Modelos de Dados (DynamoDB)

#### UserSubscription
```typescript
UserSubscription: a.model({
  id: a.string().required(),           // userId (Cognito sub)
  stripeCustomerId: a.string(),        // cus_xxxxx
  subscriptionId: a.string(),          // sub_xxxxx (null para Flex)
  paymentMethodId: a.string(),         // pm_xxxxx
  setupIntentId: a.string(),           // seti_xxxxx
  planName: a.string(),                // "Plano Organizador" | "Plano Flex"
  priceId: a.string(),                 // price_xxxxx
  status: a.string(),                  // active | canceled | past_due | trialing
  currentPeriodStart: a.datetime(),    // Início do período atual
  currentPeriodEnd: a.datetime(),      // Fim do período atual
  cancelAtPeriodEnd: a.boolean(),      // Cancelar no fim do período
  canceledAt: a.datetime(),            // Data de cancelamento
  flexEvents: a.integer(),             // Total de eventos Flex comprados
  flexEventsRemaining: a.integer(),    // Eventos Flex disponíveis
  flexEventsUsed: a.integer(),         // Eventos Flex consumidos
  billingCycle: a.string(),            // Monthly | Semi-annual | Annual | one-time
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('stripeCustomerId').name('byCustomerId'),
])
.authorization((rules) => [
  rules.owner().to(['read']),   // escrita só das Lambdas via IAM
])
```

#### PaymentMethodData
```typescript
PaymentMethodData: a.model({
  id: a.string().required(),    // userId
  brand: a.string(),            // visa | mastercard | amex
  last4: a.string(),            // Últimos 4 dígitos
  expiryMonth: a.integer(),     // 1-12
  expiryYear: a.integer(),      // 2024, 2025, etc.
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.identifier(['id'])
.authorization((rules) => [
  rules.owner().to(['read']),   // escrita só das Lambdas via IAM
])
```

#### Invoice
```typescript
Invoice: a.model({
  id: a.string().required(),     // in_xxxxx (Stripe Invoice ID)
  userId: a.string(),            // userId
  amount: a.float(),             // Valor em euros (ex: 49.99)
  currency: a.string(),          // eur | usd
  status: a.string(),            // paid | open | draft | void
  invoiceUrl: a.string(),        // URL para visualizar online
  invoicePdfUrl: a.string(),     // URL para download PDF
  invoiceNumber: a.string(),     // INV-0001
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.identifier(['id'])
.authorization((rules) => [
  rules.owner().to(['read']),   // escrita só das Lambdas via IAM
])
```

> **Autorização (correção de segurança 2026-07-13).** Os três modelos usavam
> `rules.owner()` + `rules.group('USER')`. No Amplify Gen 2 um `group(...)` **sem
> `.to(...)`** concede CRUD sobre **todos** os registos do modelo; como toda a
> conta confirmada entra no grupo `USER` (post-confirmation), isto equivalia a
> leitura/escrita cross-tenant de subscrições, cartões e faturas — e permitia
> forjar `UserSubscription{planName:'PRO'}` para contornar o gate de eventos.
> A regra passou a `rules.owner().to(['read'])`: o dono só lê; a escrita é
> exclusiva das Lambdas (webhook) via IAM. Para o `rules.owner` funcionar, as
> Lambdas gravam o campo `owner` no formato `userId::userId` (igual ao
> `PlanPurchase`). O portal Stripe deixou de aceitar `customerId` do cliente —
> resolve-o da identity do caller (ADR-019).

### 2. Planos e Preços

| Plano | Tipo | Ciclo | Price ID | Descrição |
|-------|------|-------|----------|-----------|
| Plano Organizador | Subscrição | Mensal | `price_xxx_monthly` | Eventos ilimitados |
| Plano Organizador | Subscrição | Semestral | `price_xxx_semi` | 6 meses, desconto |
| Plano Organizador | Subscrição | Anual | `price_xxx_annual` | 12 meses, maior desconto |
| Plano Flex 1 | One-time | - | `price_1Pw3H2...` | 1 evento avulso |
| Plano Flex 3 | One-time | - | `price_1Pw3Sk...VVme` | 3 eventos |
| Plano Flex 5 | One-time | - | `price_1Pw3Sk...QB2e` | 5 eventos |
| Plano Flex 10 | One-time | - | `price_1Pw3Sk...5oYV` | 10 eventos |

### 3. Lambda Functions

#### create-checkout-session
```typescript
// Mutation GraphQL
createCheckoutSession: a.mutation()
  .arguments({
    userId: a.string(),
    priceId: a.string(),
    flexEvents: a.integer(),
    planName: a.string(),
    successUrl: a.string(),
    cancelUrl: a.string(),
    customerEmail: a.string(),
    name: a.string(),
    phone: a.string(),
    street: a.string(),
    postalCode: a.string(),
    country: a.string(),
    company: a.string(),
    vat: a.string(),
  })
  .returns({ success, sessionUrl, message })
  .handler(createCheckoutSession)
```

**Fluxo:**
1. Valida email do cliente
2. Verifica se já existe `stripeCustomerId` no DynamoDB
3. Cria ou reutiliza cliente Stripe
4. Determina modo: `subscription` ou `payment` (Flex)
5. Cria sessão Stripe Checkout
6. Retorna `sessionUrl` para redirect

#### create-billing-portal-session
```typescript
// Mutation GraphQL
createBillingPortalSession: a.mutation()
  .arguments({
    userId: a.string(),
    customerId: a.string(),
    returnUrl: a.string(),
  })
  .returns({ success, sessionUrl, message })
  .handler(createBillingPortalSession)
```

**Funcionalidades do Portal:**
- Atualizar método de pagamento
- Ver histórico de faturas
- Cancelar subscrição
- Atualizar dados de faturação

#### update-payment-method
```typescript
// Mutation GraphQL
updatePaymentMethod: a.mutation()
  .arguments({
    userId: a.string(),
    paymentMethodId: a.string(),
  })
  .returns({ success, message, billingPortalUrl })
  .handler(updatePaymentMethod)
```

### 4. Webhook Handler (handle-stripe-webhook)

**Eventos Processados:**

| Evento | Ação |
|--------|------|
| `customer.created` | Cria `UserSubscription` com `stripeCustomerId` |
| `payment_method.attached` | Atualiza `PaymentMethodData` (brand, last4, expiry) |
| `customer.subscription.created` | Atualiza `UserSubscription` com detalhes da subscrição |
| `invoice.payment_succeeded` | Atualiza status para `active`, processa Flex events |
| `invoice.paid` | Atualiza status da subscrição, cria `Invoice` |
| `customer.subscription.deleted` | Atualiza status para `canceled` |

**Idempotência:**
```typescript
// Verifica se evento já foi processado
const processedKey = `${stripeEvent.id}:${stripeEvent.type}`;
if (await isEventProcessed(processedKey)) {
  return { received: true, alreadyProcessed: true };
}

// Processa evento...

// Marca como processado
await markEventAsProcessed(processedKey, stripeEvent);
```

**Tabelas de Controlo:**
- `StripeEvent` - Armazena todos os eventos raw
- `ProcessedStripeEvent` - Controlo de idempotência

### 5. Controlo de Acesso por Subscrição

O acesso a funcionalidades premium é controlado pelo estado da subscrição em DynamoDB (campo `status` do `UserSubscription`), verificado no frontend via `useSubscriptionAccess` hook. Os grupos Cognito (`USER`, `ADMIN`) controlam apenas o nível de acesso à plataforma, não o estado da subscrição.

> **Nota:** Os antigos grupos Cognito ACTIVE/REGISTERED foram migrados para USER/ADMIN. Ver [ADR-017](ADR-017-cognito-groups-supplier-sharing.md).

### 6. Estado Redux (Frontend)

```javascript
// src/Redux/Subscription/subscriptionSlice.js
const initialState = {
  plan: {
    name: null,                    // "Plano Organizador" | "Plano Flex"
    status: null,                  // active | canceled | past_due
    billingCycle: null,            // Monthly | Annual
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    flexEvents: null,              // Total Flex
    flexEventsRemaining: null,     // Disponíveis
    flexEventsUsed: null,          // Consumidos
    stripeCustomerId: null,
    subscriptionId: null,
    paymentMethodId: null,
  },
  payment: {
    brand: null,                   // visa | mastercard
    last4: null,                   // "4242"
    expiryMonth: null,
    expiryYear: null,
  },
  invoices: [],                    // Lista de faturas
  loadingStatus: 'idle',           // idle | loading | succeeded | failed
  error: null,
  lastFetchTime: null,
  cacheTimeout: 5 * 1000,          // 5 segundos de cache
};
```

**Async Thunk:**
```javascript
export const fetchSubscriptionData = createAsyncThunk(
  'subscription/fetchData',
  async (_, { getState }) => {
    const userId = (await fetchUserAttributes()).sub;
    
    const [subscriptionData, paymentData, invoicesData] = await Promise.all([
      fetchGraphQLData(getUserSubscription, { id: userId }),
      fetchGraphQLData(getPaymentMethodData, { id: userId }),
      fetchGraphQLData(listInvoices, { filter: { userId: { eq: userId } } }),
    ]);
    
    return { subscriptionData, paymentData, invoicesData };
  }
);
```

**Real-time Subscriptions:**
```javascript
export function startSubscriptions(dispatch, userId) {
  // Subscrição para atualizações de UserSubscription
  userSubscription = client.graphql({ 
    query: onUpdateUserSubscription,
    variables: { id: userId }
  }).subscribe({
    next: ({ data }) => {
      dispatch(updateSubscriptionData({ plan: data.onUpdateUserSubscription }));
    }
  });

  // Subscrição para novos métodos de pagamento
  paymentMethodSubscription = client.graphql({
    query: onUpdatePaymentMethodData,
    variables: { id: userId }
  }).subscribe({...});

  // Subscrição para novas faturas
  invoiceSubscription = client.graphql({ 
    query: onCreateInvoice,
    variables: { filter: { userId: { eq: userId } } }
  }).subscribe({...});
}
```

### 7. Fluxo de Compra Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHECKOUT FLOW (SUBSCRIPTION)                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. User clica "Subscrever"
         │
         ▼
2. Frontend chama createCheckoutSession mutation
         │
         ▼
3. Lambda cria/recupera Stripe Customer
         │
         ▼
4. Lambda cria Stripe Checkout Session (mode: subscription)
         │
         ▼
5. Frontend redireciona para Stripe Checkout URL
         │
         ▼
6. User completa pagamento no Stripe
         │
         ▼
7. Stripe envia webhooks:
   ├── customer.created (se novo)
   ├── payment_method.attached
   ├── customer.subscription.created
   ├── invoice.payment_succeeded
   └── invoice.paid
         │
         ▼
8. handle-stripe-webhook Lambda processa cada evento:
   ├── Atualiza UserSubscription no DynamoDB
   ├── Atualiza PaymentMethodData no DynamoDB
   └── Cria Invoice no DynamoDB
         │
         ▼
9. GraphQL Subscriptions notificam Frontend
         │
         ▼
10. Redux store atualiza automaticamente
         │
         ▼
11. UI reflete novo estado (premium features desbloqueadas)
```

### 8. Fluxo Flex (Pay-per-Use)

```typescript
// Checkout em modo payment (não subscription)
if (!isSubscription) {
  session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: flexEvents || 1,  // Quantidade de eventos
    }],
    mode: 'payment',              // One-time payment
    invoice_creation: { enabled: true },
    // ...
  });
}

// Webhook atualiza flexEvents
async function updateUserSubscriptionForFlex(invoice, userId) {
  const newEvents = calculateFlexEventsFromInvoice(invoice);
  
  // Incrementa eventos existentes
  await ddbClient.send(new UpdateItemCommand({
    UpdateExpression: 'SET flexEvents = :total, flexEventsRemaining = :remaining',
    ExpressionAttributeValues: {
      ':total': { N: (currentFlexEvents + newEvents).toString() },
      ':remaining': { N: (currentRemaining + newEvents).toString() },
    }
  }));
}
```

### 9. Consumo de Flex Events

```javascript
// src/Api/services/eventApi.js - Ao criar evento
async onQueryStarted({ eventData }, { dispatch, getState }) {
  const subscription = getState().subscription.plan;
  
  if (subscription && subscription.flexEventsRemaining > 0) {
    // Decrementa evento Flex
    await client.graphql({
      query: mutations.updateUserSubscription,
      variables: {
        input: {
          id: userId,
          flexEventsRemaining: subscription.flexEventsRemaining - 1,
          flexEventsUsed: (subscription.flexEventsUsed || 0) + 1,
        }
      }
    });
    
    // Atualiza estado local
    dispatch(updateSubscriptionData({
      plan: {
        flexEventsRemaining: subscription.flexEventsRemaining - 1,
        flexEventsUsed: (subscription.flexEventsUsed || 0) + 1,
      }
    }));
  }
}
```

### 10. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para validar webhooks |
| `BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME` | Tabela DynamoDB UserSubscription |
| `BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME` | Tabela DynamoDB PaymentMethodData |
| `BAFATORIO_APP_INVOICE_TABLE_NAME` | Tabela DynamoDB Invoice |
| `BAFATORIO_APP_STRIPE_EVENTS_TABLE_NAME` | Tabela DynamoDB StripeEvent |
| `BAFATORIO_APP_PROCESSED_EVENTS_TABLE_NAME` | Tabela DynamoDB ProcessedStripeEvent |
| `BAFATORIO_APP_USER_POOL_ID` | ID do Cognito User Pool |

### 11. Permissões IAM

```typescript
// handle-stripe-webhook
{
  Effect: 'Allow',
  Action: [
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:GetItem',
    'dynamodb:Query'
  ],
  Resource: [
    userSubscriptionTable.tableArn,
    `${userSubscriptionTable.tableArn}/index/*`,
    paymentMethodDataTable.tableArn,
    invoiceTable.tableArn,
    stripeEventsTable.tableArn,
    processedStripeEventsTable.tableArn
  ]
}
```

## Consequências

### Positivas
- ✅ **Segurança**: Pagamentos processados inteiramente pelo Stripe (PCI compliant)
- ✅ **Flexibilidade**: Dois modelos de negócio (subscrição + pay-per-use)
- ✅ **Self-service**: Portal de faturação permite gestão autónoma
- ✅ **Real-time**: GraphQL subscriptions atualizam UI instantaneamente
- ✅ **Idempotência**: Webhooks processados apenas uma vez
- ✅ **Controlo de acesso**: Estado da subscrição em DynamoDB controla features premium

### Negativas
- ⚠️ **Complexidade**: Múltiplos componentes a sincronizar
- ⚠️ **Latência**: Webhooks podem ter delay de segundos
- ⚠️ **Dependência**: Forte dependência do Stripe
- ⚠️ **Debugging**: Logs distribuídos entre Stripe e AWS

## Monitorização Recomendada

### Alarmes CloudWatch
1. **Webhook failures**: >5% de webhooks falhados
2. **Subscription sync lag**: UserSubscription desatualizado >1 minuto
3. **Payment failures**: Taxa de pagamentos falhados >10%
4. **DLQ não vazia**: Eventos Stripe não processados

### Métricas
- Webhooks recebidos por hora
- Tempo de processamento de webhook
- Conversão checkout → pagamento
- Churn rate (cancelamentos)

## Stripe Dashboard

Configurações necessárias no Stripe Dashboard:
1. **Webhook endpoint**: `https://api.bafatorio.com/stripe-webhook`
2. **Eventos a enviar**: customer.*, invoice.*, payment_method.*
3. **Billing Portal**: Configurar branding e features permitidas
4. **Products**: Criar produtos e preços conforme tabela acima

## Referências

- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe API Reference](https://stripe.com/docs/api)

---

**Autor**: Sistema de Documentação Bafatorio
**Última Atualização**: 2026-03-20

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2025-01-23 | Dev Team | Initial version documenting Stripe billing architecture |
| 2026-03-20 | Ney Carvalho | Corrigido referências a grupos Cognito obsoletos (REGISTERED → USER; removido grupo ACTIVE inexistente) |
| 2026-07-13 | Ney Carvalho | Correção de segurança: `group('USER')` → `owner().to(['read'])` nos 3 modelos de billing (fechava CRUD cross-tenant + PRO grátis); Lambdas gravam `owner`; portal Stripe amarrado à identity |
