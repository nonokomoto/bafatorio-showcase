# ADR-004: Amplify Backend Complete Architecture

**Status:** Accepted
**Date:** 2026-01-23
**Authors:** Bafatorio Development Team

## Context

O Bafatorio é uma plataforma serverless de gestão de eventos construída com AWS Amplify Gen 2. Este ADR documenta a arquitetura completa do backend, incluindo todos os recursos AWS utilizados, as suas interações, e as decisões arquitecturais tomadas.

> **Nota:** Para detalhes sobre modelos de dados e custom mutations, consultar [ADR-003](ADR-003-amplify-data-resource-structure.md) (fonte de verdade).

## Decision

### Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BAFATORIO BACKEND                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Cognito   │    │  AppSync    │    │     S3      │    │    SES      │     │
│  │ (Auth)      │    │ (GraphQL)   │    │ (Storage)   │    │ (Email)     │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │                  │            │
│         ▼                  ▼                  ▼                  ▼            │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │                        LAMBDA FUNCTIONS (53)                         │     │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │     │
│  │  │ Auth        │ │ Event Mgmt  │ │ Supplier    │ │ Stripe      │    │     │
│  │  │ Functions   │ │ & Import    │ │ Management  │ │ Functions   │    │     │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │     │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │     │
│  │  │ Email       │ │ Collabora-  │ │ Notion &    │ │ Streams     │    │     │
│  │  │ Processing  │ │ tion (15)   │ │ Fidelize    │ │ (DynamoDB)  │    │     │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
│         │                  │                  │                  │            │
│         ▼                  ▼                  ▼                  ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  DynamoDB   │    │    SQS      │    │    KMS      │    │ CloudWatch  │     │
│  │ (20 Tables) │    │ (Email Q)   │    │ (Encryption)│    │ (Logs)      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. AWS Services Utilizados

### 1.1 Core Services

| Serviço | Propósito | Configuração Principal |
|---------|-----------|------------------------|
| **Amazon Cognito** | Autenticação e autorização | User Pools com grupos `USER` e `ADMIN` |
| **AWS AppSync** | API GraphQL | Owner-based auth + API Key para endpoints públicos |
| **Amazon DynamoDB** | Base de dados NoSQL | 20 tabelas com owner authorization |
| **Amazon S3** | Armazenamento de ficheiros | Bucket `userStorage` para documentos + buckets partilhados |
| **AWS Lambda** | Computação serverless | 53 funções para business logic + shared utils |

### 1.2 Supporting Services

| Serviço | Propósito | Configuração Principal |
|---------|-----------|------------------------|
| **Amazon SES** | Envio de emails | Templates multilíngue (pt/en/fr) |
| **Amazon SQS** | Fila de emails | EmailQueue + Dead Letter Queue |
| **AWS KMS** | Encriptação | Tokens Notion e API keys Fidelize |
| **AWS SSM Parameter Store** | Secrets | Chaves Stripe e outros secrets |
| **Amazon CloudWatch** | Monitorização | Logs de Lambda (monitoring desligado) |

---

## 2. Data Models (20 Tabelas)

> **Fonte de verdade:** [ADR-003](ADR-003-amplify-data-resource-structure.md) documenta todos os modelos, campos, relações e secondary indexes.

### Resumo por Domínio

| Domínio | Modelos | Propósito |
|---------|---------|-----------|
| Event Management | Event, Participant, Dependent, Note, Role | Gestão de eventos e participantes |
| Supplier Management | Supplier, EventSupplier | Catálogo e associação a eventos |
| Collaboration | EventCollaborator, DocumentFolder | Equipa e documentos partilhados |
| Billing | UserSubscription, PaymentMethodData, Invoice, PricingPlan | Stripe subscriptions |
| System | StripeEvent, ProcessedStripeEvent, EmailLog | Idempotência e tracking |
| Integrations | NotionIntegration, NotionDocument, FidelizeIntegration | OAuth tokens e metadata |
| AI | ConversationMessage | Histórico do chatbot Akili |

---

## 3. Lambda Functions (53 Total)

> **Inventário completo de mutations/queries GraphQL:** [ADR-003](ADR-003-amplify-data-resource-structure.md) lista todas as 50 custom mutations/queries com handler Lambda, auth type e propósito.

A maioria das Lambdas são handlers de mutations/queries GraphQL (documentados no ADR-003). Esta secção documenta apenas as **funções com triggers especiais** (não-GraphQL) e os utilitários partilhados.

### 3.1 Funções com Triggers Especiais

| Function | Trigger | Propósito |
|----------|---------|-----------|
| `postConfirmation` | Cognito Post-Confirmation | Adicionar user ao grupo `USER`, enviar welcome email via SES |
| `processEmailQueue` | SQS Event Source | Processar fila de emails em batch via SES |
| `handleStripeWebhook` | Function URL (Public) | Processar webhooks Stripe (idempotência via ProcessedStripeEvent) |
| `eventStream` | DynamoDB Stream (Event table) | Processar alterações em eventos |
| `participantStream` | DynamoDB Stream (Participant table) | Processar alterações em participantes |
| `dependentStream` | DynamoDB Stream (Dependent table) | Processar alterações em dependentes |

### 3.2 Shared Utilities

```
amplify/function/shared/
├── importUtils.ts    # Batch write, dedup, access check para imports
└── package.json      # Dependências partilhadas (uuid, notion SDK, etc.)
```

> **Atenção:** `importUtils.ts` faz `requireEnv()` no top-level para todas as tabelas. Qualquer Lambda que importe deste módulo precisa de todas as env vars declaradas via `addEnvironment()`, mesmo que não as use em runtime.

### 3.3 Resumo por Domínio

| Domínio | Lambdas | Trigger |
|---------|---------|---------|
| Participants | 7 | GraphQL |
| Dependents | 3 | GraphQL |
| Suppliers | 11 | GraphQL |
| Email | 1 (+ sub-function processEmailQueue) | GraphQL + SQS |
| Billing/Stripe | 3 GraphQL + 1 Function URL | Misto |
| Collaboration | 11 | GraphQL |
| Event Structure | 6 | GraphQL |
| Notion | 4 | GraphQL |
| Fidelize | 2 | GraphQL |
| Streams | 3 | DynamoDB Stream |
| System | 1 | GraphQL |
| **Total (`amplify/function/`)** | **53** + shared/ ||
| Auth (`amplify/auth/`) | 1 (postConfirmation) | Cognito |

---

## 4. Event Sources & Triggers

### 4.1 DynamoDB Streams

3 streams configurados para Event, Participant e Dependent tables:

```typescript
backend.eventStream.resources.lambda.addEventSource(
  new lambdaEventSources.DynamoEventSource(backend.data.resources.tables.Event, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 3,
    enabled: true
  })
);
// Idem para participantStream (Participant) e dependentStream (Dependent)
```

### 4.2 SQS Event Source

```typescript
backend.processEmailQueue.resources.lambda.addEventSource(
  new lambdaEventSources.SqsEventSource(queue, {
    batchSize: 10,
    maxBatchingWindow: Duration.seconds(30),
    reportBatchItemFailures: true,
  })
);
```

**Flow de Email:**
```
sendEmail Mutation → SQS Queue → processEmailQueue → SES → User Inbox
                         ↓ (falha após 3 tentativas)
                    Dead Letter Queue → Manual review
```

### 4.3 Function URL (Webhooks)

```typescript
const stripeWebhookUrlObject = backend.handleStripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE
});
```

---

## 5. IAM Policies

### 5.1 Policy Patterns

As permissões são atribuídas via `addToRolePolicy()` com helper `tablePolicy()`:

```typescript
// Helper para DynamoDB table policies
const tablePolicy = (tableNames: string[], actions: string[]) => new PolicyStatement({
  actions,
  resources: tableNames.map(t => backend.data.resources.tables[t].tableArn + '*')
});

// Constantes de acesso
const DDB_READ = ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'];
const DDB_READ_WRITE = [...DDB_READ, 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'];
const DDB_READ_WRITE_BATCH = [...DDB_READ_WRITE, 'dynamodb:BatchWriteItem', 'dynamodb:BatchGetItem'];
```

### 5.2 Padrões por Grupo de Funções

| Grupo | DynamoDB | SQS | SES | S3 | KMS | SSM | Cognito |
|-------|----------|-----|-----|----|----|-----|---------|
| Participant ops | Read/Write (Participant, Dependent, Event) | - | - | - | - | - | - |
| Supplier ops | Read/Write (Supplier, EventSupplier, Event) | - | - | - | - | - | - |
| Email | Read/Write (EmailLog) | ✓ Send | ✓ Send | ✓ Templates | - | - | - |
| Stripe | Read/Write (UserSubscription, PaymentMethodData, Invoice) | - | - | - | - | ✓ Secrets | - |
| Collaboration | Read/Write (Event, EventCollaborator, EmailLog) | - | - | - | - | - | - |
| Notion | Read/Write (NotionIntegration, NotionDocument) | - | - | ✓ S3 upload | ✓ Token encryption | - | - |
| Fidelize | Read/Write (FidelizeIntegration, Participant) | - | - | - | ✓ API key encryption | - | - |
| Streams | Read/Write (Event/Participant/Dependent) | - | - | - | - | - | ✓ Groups |
| AI | Read/Write (ConversationMessage) | - | - | - | - | - | - |
| Auth (postConfirmation) | - | - | ✓ Welcome | ✓ Templates | - | - | ✓ AddToGroup |

### 5.3 External Resources

```typescript
// S3 Templates — acesso cross-bucket para email templates
sesTemplatesBucketPolicy: ['s3:GetObject', 's3:ListBucket']
  // Resource: arn:aws:s3:::bafatorio-template-storage/*

// Stripe Secrets
stripeSecretPolicy: ['ssm:GetParameter', 'ssm:GetParameters', 'kms:Decrypt']

// KMS — Notion token and Fidelize API key encryption
kmsPolicy: ['kms:Encrypt', 'kms:Decrypt', 'kms:GenerateDataKey']
```

---

## 6. Storage Configuration

### 6.1 S3 Bucket Structure

```
userStorage/
├── profile-pictures/{identity_id}/
│   └── *.jpg, *.png, ...
└── documents/{identity_id}/
    └── *.pdf, *.xlsx, ...
```

### 6.2 Access Rules

```typescript
// Profile Pictures
'profile-pictures/{entity_id}/*': [
  allow.authenticated.to(['read']),
  allow.entity('identity').to(['read', 'write', 'delete']),
  allow.groups(['USER', 'ADMIN']).to(['list', 'write', 'delete', 'get'])
]

// Documents
'documents/{entity_id}/*': [
  allow.authenticated.to(['list']),
  allow.entity('identity').to(['write', 'delete', 'read']),
  allow.groups(['USER', 'ADMIN']).to(['list', 'write', 'delete', 'get'])
]
```

### 6.3 External S3 Buckets

| Bucket | Propósito |
|--------|-----------|
| `bafatorio-template-storage` | Templates HTML de email (`email-templates/{pt,en,fr}/`) |
| `bafatorio-knowledge-base-source` | Ficheiros fonte para RAG / Akili |
| `bafatoriodevdatae4de9-staging` | Dados de staging |

---

## 7. Environment Variables

### 7.1 Padrão de Injeção

Todas as env vars de tabelas DynamoDB são injectadas via `addEnvironment()` no `backend.ts`:

```typescript
backend.<functionName>.addEnvironment(
  'BAFATORIO_APP_<TABLE>_TABLE_NAME',
  backend.data.resources.tables['<Model>'].tableName
);
```

> **IMPORTANTE:** No sandbox local, o Amplify CLI injeta env vars implicitamente. Em branch deploys (development/main), **apenas** as vars declaradas explicitamente via `addEnvironment()` são configuradas. Ver fix em commit `22afb76` para exemplo deste problema.

### 7.2 Variáveis Comuns

```typescript
BAFATORIO_APP_REGION: 'eu-west-1'

// Email
EMAIL_QUEUE_URL: '<generated-sqs-url>'
EMAIL_DLQ_URL: '<generated-dlq-url>'
BAFATORIO_APP_DEFAULT_FROM_EMAIL: 'noreply@bafatorio.com'

// Stripe (secrets via SSM)
STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET')
```

---

## 8. Outputs Personalizados

```typescript
backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrlObject.url,
    emailQueueUrl: queueUrl,
    emailDlqUrl: dlqUrl
  }
});
```

---

## 9. Monitorização

### 9.1 CloudWatch Configuration
- **Monitoring disabled** em todas as funções Lambda (`monitoring: { enabled: false }`)
- **CloudWatch Logs** habilitados automaticamente
- **Custom Metrics** via `cloudwatch:PutMetricData` policy

### 9.2 Dead Letter Queue
- **Retenção:** 14 dias
- **Encriptação:** KMS Managed
- **SSL Enforced:** true
- Emails que falham 3x vão para DLQ para revisão manual

---

## Consequences

### Positivas
1. **Escalabilidade**: Arquitetura serverless escala automaticamente
2. **Separação de Concerns**: Cada Lambda tem responsabilidade única
3. **Resiliência**: DLQ previne perda de emails importantes
4. **Segurança**: Owner-based authorization isola dados por utilizador
5. **Flexibilidade**: Custom mutations permitem lógica de negócio complexa

### Negativas
1. **Complexidade**: 53 funções Lambda requerem manutenção
2. **Cold Starts**: Funções serverless podem ter latência inicial
3. **Custo Potencial**: Muitas invocações Lambda podem aumentar custos
4. **Shared importUtils**: Top-level `requireEnv()` obriga todas as Lambdas que importam utils partilhados a declarar env vars que podem não usar

### Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Dados órfãos após delete | Cascade delete via Lambda functions |
| Email delivery failures | SQS + DLQ + retry mechanism |
| Stripe webhook duplicates | ProcessedStripeEvent idempotency table |
| Data breach | Owner-based auth + encryption at rest |
| Missing env vars em branch deploys | Verificar `addEnvironment()` para cada Lambda |

---

## Related ADRs
- [ADR-001: Amplify Environments Architecture](ADR-001-amplify-environments-architecture.md)
- [ADR-002: GraphQL File Management](ADR-002-graphql-file-management.md)
- [ADR-003: Amplify Data Resource Structure](ADR-003-amplify-data-resource-structure.md) — **Fonte de verdade para modelos e mutations**
- [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md)
- [ADR-023: Notion Integration Architecture](ADR-023-notion-integration-architecture.md)
- [ADR-024: Fidelize Integration Architecture](ADR-024-fidelize-integration-architecture.md)

---

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2026-01-23 | Dev Team | Initial version documenting complete backend architecture |
| 2026-02-05 | Dev Team | Adicionado 14 Lambdas de colaboração, EventCollaborator/DocumentFolder tables, campos approval EventSupplier, stream functions |
| 2026-03-20 | Ney Carvalho | Refactor: removida duplicação de modelos/mutations (→ ADR-003 como fonte de verdade); secção 3 reduzida a triggers especiais + resumo por domínio (eliminadas 12 sub-secções duplicadas); atualizado Lambda count (33→53), tabelas (14→20); corrigido Cognito groups (→ USER/ADMIN); adicionada nota sobre env vars em branch deploys; atualizada IAM matrix |
