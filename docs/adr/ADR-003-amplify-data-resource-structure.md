# ADR-003: Estrutura do Amplify Data Resource

**Status:** Aceite  
**Data:** 2026-01-23  
**Autor:** Ney Carvalho  
**Decisores:** Ney Carvalho

> **Atualização 2026-07-10 (sunset launch v1.0):** os modelos `Note` e
> `ConversationMessage` foram removidos do schema e as respetivas tabelas
> DynamoDB destruídas. Ver `docs/plans/2026-07-02-feature-sunset-design.md` e
> PR #154. Os diagramas e listas abaixo já refletem a remoção.

---

## Contexto

O Bafatorio utiliza AWS Amplify Gen 2 para definir o backend. O ficheiro central `amplify/data/resource.ts` define:
- Modelos de dados (DynamoDB tables)
- Relações entre modelos
- Regras de autorização
- Custom mutations com Lambda handlers
- Secondary indexes

Este ADR documenta a estrutura adoptada e as decisões de design.

---

## Decisão

### Estrutura do Ficheiro resource.ts

```
amplify/data/resource.ts
├── Imports (Lambda functions)
├── Schema Definition
│   ├── Models (a.model) — 18 modelos
│   │   ├── Event Management (Event, Participant, Dependent, Role)
│   │   ├── Supplier Management (Supplier, EventSupplier)
│   │   ├── Collaboration (EventCollaborator, DocumentFolder)
│   │   ├── Billing (UserSubscription, PaymentMethodData, Invoice, PricingPlan)
│   │   ├── System (StripeEvent, ProcessedStripeEvent, EmailLog)
│   │   └── Integrations (NotionIntegration, NotionDocument, FidelizeIntegration)
│   └── Custom Mutations & Queries (a.mutation / a.query) — 50 operações
│       ├── Participant Operations (CRUD, import, upload, confirm)
│       ├── Dependent Operations (CRUD custom)
│       ├── Email Operations
│       ├── Billing Operations (checkout, portal, webhook, payment)
│       ├── Supplier Operations (approval, payment, import, select)
│       ├── Collaboration Operations (invite, accept, decline, revoke, update role/folders/suppliers)
│       ├── Collaboration Queries (getEventAsCollaborator, listMyPending, etc.)
│       ├── Event Structure (roles, folders CRUD)
│       ├── Notion Integration (exchange token, list/import pages, check updates)
│       ├── Fidelize Integration (save API key, sync participants)
│       └── AI Operations
├── Schema Export
└── Data Configuration
```

---

## Modelos de Dados

### Event Management Domain

```typescript
// Modelo principal - Evento
Event: a.model({
  eventTitle: a.string(),
  eventManager: a.string(),
  eventDate: a.datetime(),
  eventStatus: a.string(),
  budget: a.float(),
  committedExpenses: a.float(),    // Despesas aprovadas
  effectiveExpenses: a.float(),    // Despesas pagas
  // Relações
  participants: a.hasMany('Participant', 'eventId'),
  suppliers: a.hasMany('EventSupplier', 'eventId')
})

// Role (perfil de participante por evento)
Role: a.model({
  name: a.string().required(),
  eventId: a.string().required(),
  event: a.belongsTo('Event', 'eventId'),
  participants: a.hasMany('Participant', 'roleId')
})
.secondaryIndexes((index) => [
  index('eventId').name('byEventId'),
])

// Participante do evento
Participant: a.model({
  participantName: a.string(),
  participantEmail: a.string(),
  participantStatus: a.string(),   // invited, confirmed, attended, etc.
  attendedDate: a.datetime(),
  dependentsCount: a.integer(),
  // Relações
  event: a.belongsTo('Event', 'eventId'),
  dependents: a.hasMany('Dependent', 'participantId')
})

// Acompanhante do participante
Dependent: a.model({
  name: a.string(),
  age: a.enum(['baby', 'child', 'adult']),
  status: a.enum(['REGISTERED', 'ATTENDED', 'NOT_ATTENDED']),
  attendedDate: a.datetime(),
  // Relação
  participant: a.belongsTo('Participant', 'participantId')
})
```

### Supplier Management Domain

```typescript
// Fornecedor (catálogo do utilizador)
Supplier: a.model({
  id: a.string().required(),
  name: a.string().required(),
  category: a.string(),
  estimateMinAmount: a.float(),
  estimateMaxAmount: a.float(),
  estimateUnit: a.enum(['FIXED', 'PER_EVENT', 'PER_HOUR', ...]),
  // Relação
  eventSuppliers: a.hasMany('EventSupplier', 'supplierId')
})
.identifier(['id'])  // Custom ID (não auto-gerado)

// Associação Evento ↔ Fornecedor (com orçamento e approval workflow)
EventSupplier: a.model({
  id: a.string().required(),
  eventId: a.string().required(),
  supplierId: a.string().required(),
  quoteAmount: a.float(),
  status: a.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED']),
  invoiceS3Key: a.string(),

  paidAt: a.datetime(),
  // Approval workflow fields (ADR-015)
  requestedBy: a.string(),                // userId de quem solicitou
  approvalStatus: a.enum(['DIRECT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']),
  approvedBy: a.string(),                 // userId de quem aprovou
  approvedAt: a.datetime(),
  rejectionReason: a.string(),
  // Relações
  event: a.belongsTo('Event', 'eventId'),
  supplier: a.belongsTo('Supplier', 'supplierId')
})
.identifier(['id'])
```

### Collaboration Domain (ADR-015)

```typescript
// Colaborador de evento (controle de acesso por evento)
EventCollaborator: a.model({
  id: a.string().required(),
  eventId: a.string().required(),
  userId: a.string(),                     // Preenchido após aceitar (Cognito sub)
  userEmail: a.string().required(),       // Email do convidado
  role: a.enum(['CO_MANAGER', 'STAFF_CHECKIN', 'STAFF_LOGISTICS']),
  sharedFolderIds: a.string().array(),    // IDs de DocumentFolders partilhados
  status: a.enum(['PENDING', 'ACCEPTED', 'DECLINED']),
  invitedBy: a.string().required(),       // userId de quem convidou
  invitedAt: a.datetime().required(),
  acceptedAt: a.datetime(),
  event: a.belongsTo('Event', 'eventId'),
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('eventId').name('byEventId'),
  index('userId').name('byUserId'),
  index('userEmail').name('byUserEmail'),
])
.authorization((rules) => [
  rules.owner(),
  rules.authenticated().to(['read']),
])

// Pasta de documentos para organizar documentos do evento
DocumentFolder: a.model({
  id: a.string().required(),
  eventId: a.string().required(),
  name: a.string().required(),
  description: a.string(),
  color: a.string(),
  icon: a.string(),
  order: a.integer(),
  parentFolderId: a.string(),
  event: a.belongsTo('Event', 'eventId'),
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('eventId').name('byEventId'),
])
.authorization((rules) => [rules.owner()])
```

### Billing Domain (Stripe Integration)

```typescript
UserSubscription: a.model({
  id: a.string().required(),
  stripeCustomerId: a.string(),
  subscriptionId: a.string(),
  planName: a.string(),
  status: a.string(),              // active, canceled, past_due
  currentPeriodEnd: a.datetime(),
  flexEvents: a.integer(),         // Para plano Flex
  flexEventsRemaining: a.integer()
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('stripeCustomerId').name('byCustomerId')  // Para webhooks
])
```

### Integrations Domain (ADR-023, ADR-024)

```typescript
// Notion Integration - OAuth tokens per user (KMS-encrypted)
NotionIntegration: a.model({
  id: a.string().required(),       // userId
  accessToken: a.string().required(),
  refreshToken: a.string(),
  workspaceId: a.string().required(),
  workspaceName: a.string(),
  botId: a.string().required(),
})
.identifier(['id'])

// Notion Document - metadata for imported pages (content in S3)
NotionDocument: a.model({
  id: a.string().required(),
  eventId: a.string().required(),
  folderId: a.string(),
  notionPageId: a.string().required(),
  title: a.string().required(),
  s3Key: a.string().required(),
  notionLastEditedAt: a.string(),
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('eventId').name('byEventId'),
  index('notionPageId').sortKeys(['eventId']).name('byNotionPageId'),
])

// Fidelize Integration - encrypted API key per user
FidelizeIntegration: a.model({
  id: a.string().required(),       // userId
  apiKey: a.string().required(),   // KMS-encrypted
  isActive: a.boolean(),
  lastSyncAt: a.datetime(),
})
.identifier(['id'])
```

---

## Regras de Autorização

### Padrão: Owner-based

```typescript
.authorization((rules) => [
  rules.owner(),  // Apenas o criador pode CRUD
])
```

### Com Grupos

```typescript
// Para modelos de billing (utilizadores registados podem ler)
.authorization((rules) => [
  rules.owner(),
  rules.group('USER'),       // ADR-017: migrado de 'REGISTERED' para 'USER'
])

// Para modelos de admin
.authorization((rules) => [
  rules.group('ADMIN'),
])
```

### Acesso Público (API Key)

```typescript
// Para endpoints públicos (webhooks, confirmação de presença)
.authorization(allow => allow.publicApiKey())
```

---

## Custom Mutations

### Padrão de Definição

```typescript
nomeDaMutation: a
  .mutation()
  .arguments({
    param1: a.string().required(),
    param2: a.integer(),
  })
  .returns(a.customType({
    success: a.boolean(),
    message: a.string(),
    data: a.ref('ModelName')  // Referência a modelo existente
  }))
  .authorization((rules) => [
    rules.authenticated(),  // ou allow.publicApiKey()
  ])
  .handler(a.handler.function(lambdaFunction))
```

### Inventory de Custom Mutations

| Mutation/Query | Handler Lambda | Auth | Propósito |
|----------------|---------------|------|-----------|
| **Participant Operations** ||||
| `deleteParticipants` | delete-participants | authenticated | Eliminar múltiplos participantes |
| `uploadParticipants` | upload-participant | authenticated | Import Excel de participantes (fallback determinístico por template) |
| `importNormalizedParticipants` | import-normalized-participants | authenticated | Import JSON normalizado de participantes (via LLM, api-bafatorio) |
| `confirmParticipant` | confirm-participant | **publicApiKey** | Confirmação pública de presença |
| `listEventParticipantsQuery` | list-event-participants | authenticated | Listar participantes com access check (query) |
| `createParticipantAsCollaborator` | create-participant-collaborator | authenticated | Criar participante como colaborador |
| `updateParticipantAsCollaborator` | update-participant-collaborator | authenticated | Atualizar participante como colaborador |
| **Dependent Operations** ||||
| `deleteDependentCustom` | delete-dependent | authenticated | Eliminar dependente (bypass owner) |
| `updateDependentCustom` | update-dependent | authenticated | Atualizar dependente (bypass owner) |
| `createDependentCustom` | create-dependent | authenticated | Criar dependente (bypass owner) |
| **Email Operations** ||||
| `sendEmail` | send-email | authenticated | Enviar emails via SES queue |
| **Billing Operations** ||||
| `updatePaymentMethod` | update-payment-method | authenticated | Atualizar cartão no Stripe |
| `createCheckoutSession` | create-checkout-session | authenticated | Iniciar checkout Stripe |
| `createBillingPortalSession` | create-biling-portal-session | authenticated | Aceder portal Stripe |
| `handleStripeWebhook` | handle-stripe-webhook | **publicApiKey** | Receber webhooks Stripe |
| **Supplier Operations** ||||
| `processSupplierApproval` | supplier | authenticated | Aprovar fornecedor → atualiza budget |
| `processSupplierPayment` | process-supplier-payment | authenticated | Marcar como pago → atualiza expenses |
| `removeEventSupplier` | remove-eventSupplier | authenticated | Remover fornecedor do evento |
| `revertEventSupplierApproval` | rever-event-supplier-aproval | authenticated | Reverter aprovação |
| `adjustApprovedEventSupplierQuote` | adjust-approved-event-supplier-quote | authenticated | Ajustar valor após aprovação |
| `uploadSupplier` | upload-supplier | authenticated | Import Excel de fornecedores |
| `importNormalizedSuppliers` | import-normalized-suppliers | authenticated | Import JSON normalizado de fornecedores |
| `selectEventSupplier` | select-event-supplier | authenticated | Selecionar fornecedor (com approval flow) |
| `approveSupplierSelection` | approve-supplier-selection | authenticated | Aprovar/rejeitar seleção pendente |
| `listEventSuppliersQuery` | list-event-suppliers | authenticated | Listar fornecedores com access check (query) |
| `getSupplierForEvent` | get-supplier-for-event | authenticated | Obter fornecedor no contexto de evento (query) |
| **Collaboration Operations** ||||
| `inviteCollaborator` | invite-collaborator | authenticated | Convidar colaborador por email |
| `acceptInvitation` | accept-invitation | authenticated | Aceitar convite pendente |
| `declineInvitation` | decline-invitation | authenticated | Recusar convite pendente |
| `revokeCollaborator` | revoke-collaborator | authenticated | Remover colaborador |
| `updateCollaboratorFolders` | update-collaborator-folders | authenticated | Partilhar pastas com colaborador |
| `updateCollaboratorSuppliers` | update-collaborator-suppliers | authenticated | Partilhar fornecedores com colaborador |
| `updateCollaboratorRole` | update-collaborator-role | authenticated | Alterar role de colaborador |
| `listMyPendingInvitations` | list-my-pending-invitations | authenticated | Listar convites pendentes (query) |
| `listMyCollaboratedEvents` | list-my-collaborated-events | authenticated | Listar eventos colaborados (query) |
| `getEventAsCollaborator` | get-event-as-collaborator | authenticated | Obter evento como colaborador (query) |
| `getEventCollaborators` | list-event-collaborators | authenticated | Listar colaboradores de evento (query) |
| **Event Structure** ||||
| `getEventRoles` | list-event-roles | authenticated | Listar roles do evento (query) |
| `createEventRole` | create-event-role | authenticated | Criar role no evento |
| `getEventFolders` | list-event-folders | authenticated | Listar pastas de documentos (query) |
| `createEventFolder` | create-event-folder | authenticated | Criar pasta de documentos |
| `updateEventFolder` | update-event-folder | authenticated | Atualizar pasta de documentos |
| `deleteEventFolder` | delete-event-folder | authenticated | Eliminar pasta de documentos |
| **User Operations** ||||
| `deleteUserData` | delete-user-data | authenticated | GDPR - eliminar dados do user |
| **Notion Integration (ADR-023)** ||||
| `exchangeNotionToken` | notion-exchange-token | authenticated | OAuth token exchange |
| `listNotionPages` | notion-list-pages | authenticated | Listar páginas do workspace |
| `importNotionPages` | notion-import-pages | authenticated | Importar páginas para S3 |
| `checkNotionUpdates` | notion-check-updates | authenticated | Verificar atualizações de páginas |
| **Fidelize Integration (ADR-024)** ||||
| `saveFidelizeApiKey` | fidelize-save-api-key | authenticated | Guardar API key (KMS-encrypted) |
| `syncFidelizeParticipants` | fidelize-sync-participants | authenticated | Sincronizar participantes do Fidelize |
| **AI Operations** ||||
| `InvokeChatbot` | chatbot-resolver | authenticated | Interagir com Akili AI |

---

## Integração com Lambda Functions

### Estrutura de Pastas

```
amplify/function/
├── chatbot-resolver/
│   ├── resource.ts      # defineFunction()
│   └── handler.ts       # Código da função
├── send-email/
│   ├── resource.ts
│   └── handler.ts
├── handle-stripe-webhook/
│   ├── resource.ts
│   └── handler.ts
└── ... (53 functions + shared/ utils)
```

### Padrão de Definição (resource.ts)

```typescript
// amplify/function/send-email/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const sendEmail = defineFunction({
  name: 'send-email',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    SES_REGION: 'eu-west-1',
    SQS_QUEUE_URL: 'arn:aws:sqs:...'
  }
});
```

### Registo no Backend (backend.ts)

```typescript
// amplify/backend.ts
import { sendEmail } from './function/send-email/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  sendEmail,  // Registar função
  // ...
});

// Adicionar permissões IAM
backend.sendEmail.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'sqs:SendMessage'],
    resources: ['*']
  })
);
```

---

## Secondary Indexes

### Definição

```typescript
UserSubscription: a.model({ ... })
  .secondaryIndexes((index) => [
    index('stripeCustomerId').name('byCustomerId'),
  ])
```

### Query Gerada Automaticamente

```typescript
// Graphql/queries.ts (gerado)
export const listUserSubscriptionByStripeCustomerId = /* GraphQL */ `
  query ListUserSubscriptionByStripeCustomerId($stripeCustomerId: String!) {
    listUserSubscriptionByStripeCustomerId(stripeCustomerId: $stripeCustomerId) {
      items { ... }
    }
  }
`;
```

### Uso

```typescript
// Para encontrar subscription pelo Stripe Customer ID (útil em webhooks)
const { data } = await client.graphql({
  query: queries.listUserSubscriptionByStripeCustomerId,
  variables: { stripeCustomerId: 'cus_xxx' }
});
```

---

## Diagrama de Relações

```
┌─────────────────────────────────────────────────────────────────┐
│                         EVENT DOMAIN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐     hasMany     ┌─────────────┐                   │
│  │  Event  │ ───────────────▶│ Participant │                   │
│  └────┬────┘                 └──────┬──────┘                   │
│       │                             │                           │
│       │ hasMany                     │ hasMany                   │
│       ▼                             ▼                           │
│  ┌─────────┐   ┌───────────┐                                  │
│  │  Role   │   │ Dependent │                                  │
│  │GSI:Event│   └───────────┘                                  │
│  └─────────┘                                                   │
│       │ hasMany                                                 │
│       ▼                                                         │
│  ┌──────────────┐    belongsTo    ┌──────────┐                 │
│  │EventSupplier │ ───────────────▶│ Supplier │                 │
│  └──────────────┘                 └──────────┘                 │
│                                                                 │
│       │ hasMany (ADR-015)                                       │
│       ▼                                                         │
│  ┌──────────────────┐   ┌───────────────┐                      │
│  │EventCollaborator │   │DocumentFolder │                      │
│  │ GSI: byEventId   │   │ GSI: byEventId│                      │
│  │ GSI: byUserId    │   └───────────────┘                      │
│  │ GSI: byUserEmail │                                           │
│  └──────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BILLING DOMAIN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────┐      │
│  │ UserSubscription │  │ PaymentMethodData │  │ Invoice │      │
│  └──────────────────┘  └───────────────────┘  └─────────┘      │
│           │                                                     │
│           │ GSI: byCustomerId                                   │
│           ▼                                                     │
│  ┌─────────────────────────────────────────┐                   │
│  │ Stripe Webhooks (via handleStripeWebhook)│                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATIONS DOMAIN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐   ┌────────────────┐                    │
│  │NotionIntegration  │   │NotionDocument  │                    │
│  │ (OAuth per-user)  │   │GSI: byEventId  │                    │
│  └───────────────────┘   │GSI: byPageId   │                    │
│                          └────────────────┘                    │
│  ┌─────────────────────┐                                       │
│  │FidelizeIntegration  │                                       │
│  │ (API key per-user)  │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM DOMAIN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ EmailLog │  │ ProcessedStripeEvent  │  │ PricingPlan     │  │
│  └──────────┘  └───────────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Consequências

### Positivas

1. **Schema centralizado** - Uma fonte de verdade para todos os modelos
2. **Type safety** - Tipos gerados automaticamente
3. **Autorização declarativa** - Regras claras e auditáveis
4. **Serverless** - Sem gestão de infraestrutura
5. **Escalável** - DynamoDB + Lambda escala automaticamente

### Negativas

1. **Vendor lock-in** - Fortemente acoplado à AWS
2. **Complexidade** - Muitas abstrações a aprender
3. **Debugging** - Difícil debugar Lambda em produção
4. **Cold starts** - Latência inicial em funções Lambda

### Trade-offs Aceites

| Decisão | Trade-off |
|---------|-----------|
| Owner-based auth por defeito | Simplicidade vs. flexibilidade |
| Custom mutations com Lambda | Poder vs. complexidade |
| DynamoDB | Escalabilidade vs. queries complexas |
| Secondary indexes | Performance vs. custo |

---

## Políticas

### Ao Adicionar Novo Modelo

1. Definir em `amplify/data/resource.ts`
2. Adicionar regras de autorização apropriadas
3. Definir relações se necessário
4. Regenerar código GraphQL
5. Criar testes

### Ao Adicionar Custom Mutation

1. Criar Lambda em `amplify/function/{nome}/`
2. Definir mutation em `resource.ts`
3. Registar função em `backend.ts`
4. Adicionar permissões IAM necessárias
5. Regenerar código GraphQL

### Ao Alterar Schema Existente

1. **BACKUP primeiro** (`./scripts/backup-dev-tables.sh`)
2. Fazer alteração em `resource.ts`
3. Testar em sandbox
4. Regenerar código GraphQL
5. Verificar se frontend ainda funciona
6. Deploy para produção

---

## Referências

- [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md) - **Detalhes sobre EventCollaborator, roles e permissions**
- [Amplify Gen 2 - Data Modeling](https://docs.amplify.aws/gen2/build-a-backend/data/data-modeling/)
- [Amplify Gen 2 - Authorization](https://docs.amplify.aws/gen2/build-a-backend/data/customize-authz/)
- [Amplify Gen 2 - Custom Mutations](https://docs.amplify.aws/gen2/build-a-backend/data/custom-business-logic/)
- [amplify/data/resource.ts](../../amplify/data/resource.ts) - Ficheiro fonte
- [amplify/backend.ts](../../amplify/backend.ts) - Configuração central

---

## Histórico

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-01-23 | Criação inicial | Ney Carvalho |
| 2026-02-05 | Adicionado EventCollaborator, DocumentFolder, campos approval EventSupplier, mutations de colaboração | Bafatorio Dev Team |
| 2026-03-20 | Inventário completo: adicionados modelos Role, NotionIntegration, NotionDocument, FidelizeIntegration; atualizado inventário de mutations (32→50); contagem de Lambdas (33→53); adicionado Integrations Domain ao diagrama | Ney Carvalho |
