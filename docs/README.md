# Bafatorio - Documentacao Tecnica

## Indice de ADRs (Architecture Decision Records)

| # | Titulo | Status | Data |
|---|--------|--------|------|
| [001](adr/ADR-001-amplify-environments-architecture.md) | Arquitetura de Ambientes AWS Amplify | Aceite | 2026-01-23 |
| [002](adr/ADR-002-graphql-file-management.md) | Gestao de Ficheiros GraphQL no Amplify Gen 2 | Aceite | 2026-01-23 |
| [003](adr/ADR-003-amplify-data-resource-structure.md) | Estrutura do Amplify Data Resource | Aceite | 2026-01-23 |
| [004](adr/ADR-004-amplify-backend-complete-architecture.md) | Amplify Backend Complete Architecture | Accepted | 2026-01-23 |
| [005](adr/ADR-005-frontend-api-architecture.md) | Frontend API Architecture (RTK Query + Amplify) | Accepted | 2026-01-23 |
| [006](adr/ADR-006-authentication-authorization.md) | Authentication & Authorization Architecture | Accepted | 2026-01-23 |
| [007](adr/ADR-007-email-system-architecture.md) | Email System Architecture | Accepted | 2025-01-23 |
| [008](adr/ADR-008-stripe-billing-architecture.md) | Stripe Billing System Architecture | Accepted | 2025-01-23 |
| [009](adr/ADR-009-akili-chatbot-architecture.md) | AI Chatbot (Akili) Architecture | Accepted | 2025-01-23 |
| [010](adr/ADR-010-internationalization-architecture.md) | Internationalization (i18n) Architecture | Accepted | 2025-01-23 |
| [011](adr/ADR-011-design-system-architecture.md) | Arquitetura do Design System | Aceite | 2025-01-01 |
| [012](adr/ADR-012-graphql-relational-queries-architecture.md) | GraphQL Relational Queries & Cache Architecture | Implemented | 2026-01-24 |
| [013](adr/ADR-013-dynamodb-owner-authorization-keys.md) | DynamoDB Owner Authorization & Composite Keys | Implemented | 2026-01-24 |
| [014](adr/ADR-014-git-workflow-branch-strategy.md) | Git Workflow e Estrategia de Branches | Aceite | 2026-01-24 |
| [015](adr/ADR-015-event-collaboration-access-control.md) | Event Collaboration & Access Control | Accepted | 2026-02-05 |
| [016](adr/ADR-016-supplier-api-discrepancy-analysis.md) | Analise de Discrepancias — Supplier API | Implementada | 2026-02-10 |
| [017](adr/ADR-017-cognito-groups-supplier-sharing-architecture.md) | Cognito Groups Simplification & Supplier Sharing | Implemented | 2026-02-11 |
| [018](adr/ADR-018-participant-role-migration.md) | Migracao participantRole → roleId (Role Table) | Aceite | 2026-02-13 |
| [019](adr/ADR-019-event-scoped-roles.md) | Event-Scoped Roles | Aceite | 2026-02-13 |
| [020](adr/ADR-020-safe-deploy-schema-changes.md) | Safe Deploy de Schema Changes | Aceite | 2026-02-13 |
| [021](adr/ADR-021-document-folder-lambda-crud.md) | Document Folder Lambda CRUD | Aceite | 2026-02-20 |
| [022](adr/ADR-022-dev-overlay-beta-pattern.md) | Dev Overlay & Beta Pattern | Aceite | 2026-02-24 |

---

## Resumos por Area

### Infraestrutura & Backend

- **ADR-001** — Define 4 ambientes AWS Amplify: 2 sandboxes pessoais + branches `development` e `main` (producao). Cada ambiente tem User Pool, AppSync API e tabelas DynamoDB independentes.
- **ADR-003** — Estrutura do `amplify/data/resource.ts`: modelos DynamoDB, relacoes entre modelos, regras de autorizacao (`owner()`), e custom queries/mutations com Lambda resolvers.
- **ADR-004** — Arquitetura completa do backend serverless: 15+ Lambda functions, S3 storage, SES email, Stripe webhooks, RAG sync, e todas as IAM policies em `amplify/backend.ts`.
- **ADR-013** — Chaves compostas DynamoDB com `owner` authorization: Lambdas devem usar `owner` como sort key ao aceder tabelas diretamente via SDK.

### Frontend & API

- **ADR-002** — Ficheiros `Graphql/` sao **auto-gerados** por `npx ampx generate graphql-client-code`. Nunca editar manualmente.
- **ADR-005** — RTK Query + Amplify Data Client: `baseApi` com `graphqlBaseQuery`, cache tags, e padroes de invalidacao.
- **ADR-012** — Queries relacionais GraphQL (nested selectionSets) e estrategia de cache com tag-based invalidation.
- **ADR-016** — Analise de discrepancias na Supplier API vs padroes estabelecidos em Event/Participant APIs.

### Autenticacao & Autorizacao

- **ADR-006** — AWS Cognito (email/password + Google OAuth), JWT tokens, e gestao de sessoes.
- **ADR-015** — Controle de acesso a eventos: roles OWNER > CO_MANAGER > STAFF_LOGISTICS > STAFF_CHECKIN. Hook `useEventRole()` no frontend.
- **ADR-017** — Simplificacao de Cognito Groups (4 → 2: REGISTERED + MANAGER) e partilha de suppliers entre colaboradores.

### Funcionalidades

- **ADR-007** — Sistema de email assincrono com SES, templates multilingue (PT/EN/FR), rate limiting, e retry strategy.
- **ADR-008** — Stripe billing: Plano Organizador (subscricao) + Plano Flex (pay-per-use), webhooks, e portal self-service.
- **ADR-009** — Chatbot AI "Akili": Claude API com RAG sobre dados do utilizador, prompt caching, e suporte multilingue.
- **ADR-010** — i18n com react-i18next: 3 locales (pt-PT, en-US, fr-FR), organizacao modular por funcionalidade.
- **ADR-011** — Design system: Tailwind CSS com tokens customizados, dark mode, glassmorphism, componentes UI reutilizaveis.

### Dados & Migracoes

- **ADR-018** — Migracao de `participantRole` (string hardcoded) para `roleId` (FK para tabela Role). Inclui backward compatibility nos Lambdas, hook `useRoleLookup`, e script de migracao.
- **ADR-019** — Roles com scope por evento: cada role pertence a um evento especifico, sem partilha global.
- **ADR-020** — Processo de deploy seguro para alteracoes de schema DynamoDB: adicionar campos antes de remover, janela de migracao.

### Operacoes & Deploy

- **ADR-021** — CRUD de pastas de documentos via Lambda: criacao, listagem, upload e eliminacao de ficheiros em S3 com prefixo por evento.
- **ADR-022** — Padrao Dev Overlay & Beta: banner de ambiente visivel apenas em desenvolvimento, flags de features beta.

### Workflow

- **ADR-014** — Git workflow: `main` (producao), `development` (staging), feature branches. PRs obrigatorios para `main`.

---

## Ambientes

| Ambiente | Branch | Sufixo DynamoDB | Notas |
|----------|--------|-----------------|-------|
| Sandbox MacBook | — | `<api-id>` | Dev local (Ney) |
| Sandbox devsandbox | — | `<api-id>` | Dev local (Alex) |
| Development | `development` | `<api-id>` | Staging/QA |
| Production | `main` | `<api-id>` | Producao |

---

## Notas Importantes

### Lambdas & IAM
- `DDB_READ` inclui apenas `GetItem` + `Query` — **nao inclui `Scan`**
- Lambdas que precisam de `Scan` na tabela Role: `listEventParticipants`, `updateParticipantCollaborator`, `uploadParticipants`
- `uploadParticipants` tambem precisa de `PutItem` na Role (cria roles novos durante upload)
- Todas as IAM policies estao centralizadas em `amplify/backend.ts`

### GraphQL
- Ficheiros em `Graphql/` sao **auto-gerados** — nunca editar manualmente
- Regenerar com: `npx ampx generate graphql-client-code --stack <STACK> --out Graphql/ --format graphql-codegen --statement-target typescript --type-target typescript`

### Deploy
- Push para `main` → deploy automatico em producao
- Push para `development` → deploy automatico em staging
- Sandboxes: `npx ampx sandbox` (local, por developer)
