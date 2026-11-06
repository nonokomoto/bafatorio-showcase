# ADR-024: Fidelize Integration Architecture

## Status
**Accepted** | Data: 2026-03-13

## Contexto

O Bafatorio precisa de permitir que os organizadores de eventos sincronizem participantes diretamente da plataforma Fidelize (digital wallet/membership cards). Requisitos:

- Autenticacao via API key (por utilizador)
- Sincronizacao de cards Fidelize como participantes de eventos
- Deduplicacao inteligente (por internalId, email, phone)
- Merge nao-destrutivo (preencher campos vazios, nunca sobrescrever dados existentes)
- Encriptacao da API key com AWS KMS
- Controlo de acesso: apenas OWNER e CO_MANAGER podem sincronizar
- Mapeamento automatico de Fidelize tiers para roles do evento
- Suporte a paginacao com timeout safety (Lambda 30s)

## Decisao

Implementamos uma integracao Fidelize com duas Lambdas, um modelo DynamoDB, encriptacao KMS e uma camada frontend com RTK Query + hook customizado. O padrao segue a arquitectura estabelecida na ADR-023 (Notion) adaptada para sincronizacao de participantes.

### Arquitectura de Alto Nivel

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       FIDELIZE INTEGRATION FLOW                              │
└──────────────────────────────────────────────────────────────────────────────┘

  1. Setup Flow (Settings)                2. Sync Flow (Participants)

  ┌──────────────┐                        ┌──────────────────┐
  │  Settings    │                        │ FidelizeSyncModal│
  │  /profile    │                        │ (select templates│
  │  Integracoes │                        │  + start sync)   │
  └──────┬───────┘                        └────────┬─────────┘
         │ apiKey                                  │ eventId, templateIds, page
         ▼                                         ▼
  ┌──────────────┐                        ┌──────────────────┐
  │ fidelize-    │                        │ fidelize-sync-   │
  │ save-api-key │                        │ participants     │
  │ Lambda       │                        │ Lambda           │
  └──────┬───────┘                        └───────┬──────────┘
         │                                        │
         ├─── Validate key ◄── Fidelize API       ├─── Verify OWNER/CO_MANAGER
         │    GET /api/v2/templates                ├─── Decrypt API key (KMS)
         │                                        ├─── Fetch cards ◄── Fidelize API
         ├─── Encrypt (KMS)                       │    GET /api/v2/cards
         │                                        ├─── Load existing participants
         ▼                                        ├─── Dedup + merge/create
  ┌──────────────┐                                ▼
  │ DynamoDB     │                        ┌──────────────────┐
  │ Fidelize-    │                        │ DynamoDB          │
  │ Integration  │                        │ Participant table │
  │ (KMS encrypt)│                        │ + Role table      │
  └──────────────┘                        └──────────────────┘
```

## Componentes

### 1. Backend — Lambda Functions

#### A. `fidelize-save-api-key` (30s timeout)

**Responsabilidade:** Validar, encriptar e guardar a API key do Fidelize.

**Fluxo:**
1. Extrair `userId` do token Cognito
2. Validar API key chamando `GET /api/v2/templates` no Fidelize
3. Se invalida (401/403) → retornar erro
4. Encriptar key com AWS KMS (AES-256, base64)
5. Upsert no DynamoDB `FidelizeIntegration` com `UpdateExpression`
6. Retornar `{ success: true }`

**Seguranca:**
- API key nunca e registada em logs (apenas length/status)
- `if_not_exists(createdAt)` preserva timestamp original em re-saves
- Owner-only authorization rule no DynamoDB

#### B. `fidelize-sync-participants` (30s timeout, 25s safety margin)

**Responsabilidade:** Buscar cards do Fidelize e sincronizar como participantes do evento.

**Fluxo:**
1. **Autorizacao:** Verificar se user e OWNER do evento ou CO_MANAGER aceite
2. **Desencriptar:** Buscar API key do DynamoDB e desencriptar via KMS
3. **Fetch cards:** `GET /api/v2/cards?page={n}` com paginacao
4. **Filtrar:** Por templateIds (opcional, se vazio importa todos)
5. **Carregar existentes:** Query participantes do evento, construir 3 indices de dedup
6. **Processar cada card:** Dedup → update ou create
7. **Timeout control:** Se >25s, retornar `hasMore: true` com `nextPage`
8. **Atualizar** `lastSyncAt` no FidelizeIntegration

**Estrategia de Deduplicacao (por prioridade):**

| Prioridade | Campo | Logica |
|------------|-------|--------|
| 1 | `internalId` | Match exacto `fidelize:{card.id}` |
| 2 | `email` | Normalizado (trim, lowercase) |
| 3 | `phone` | Normalizado (apenas digitos) |

**Merge Nao-Destrutivo:**
- Apenas preenche campos vazios no participante existente
- Nunca sobrescreve `participantName`, `participantEmail`, etc. se ja existirem
- Status so e promovido (REGISTERED → CONFIRMED), nunca retrocedido
- Estados finais (ATTENDED, CANCELLED) nunca sao alterados
- `roleId` so e preenchido se atualmente vazio

**Mapeamento de Status:**

| Fidelize Status | Participant Status |
|----------------|--------------------|
| `installed` | CONFIRMED |
| `not_installed` | REGISTERED |
| `deleted` | CANCELLED |
| outro | REGISTERED |

**Mapeamento de Tiers:**

| Fidelize Tier | BafatorioApp Role |
|---------------|-------------------|
| Participant | Participant |
| Volunteer | Volunteer |
| Speaker | Speaker |
| Partner | Partner |
| Organization | Organization |
| Ambassador | Ambassador |
| Potenciais | Human Leaders |

**Criacao de Roles:**
- RoleId determinisico: `SHA256(${eventId}:${roleName.lowercase})`
- Previne duplicados em invocacoes concorrentes
- `ConditionExpression: 'attribute_not_exists(id)'` para idempotencia

### 2. Data Model — DynamoDB

#### FidelizeIntegration

```typescript
FidelizeIntegration: a.model({
  id: a.string().required(),       // userId (Primary Key)
  apiKey: a.string().required(),   // KMS-encrypted, base64-encoded
  isActive: a.boolean(),           // Conexao activa
  lastSyncAt: a.datetime(),        // Ultimo sync bem-sucedido
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
.identifier(['id'])
.authorization((rules) => [rules.owner()])
```

#### GraphQL Mutations

```graphql
# Guardar/validar API key
saveFidelizeApiKey(apiKey: String!): SaveFidelizeApiKeyResult
  → { success, error }

# Sincronizar participantes
syncFidelizeParticipants(
  eventId: String!,
  templateIds: [Int],
  page: Int
): FidelizeSyncResult
  → { success, created, updated, skipped, totalCards, errors[], hasMore, nextPage }
```

### 3. Infraestrutura (CDK)

**KMS Key:** Dedicada para encriptacao de API keys Fidelize (rotacao anual automatica).

**IAM Policies:**

| Lambda | Permissoes |
|--------|------------|
| `save-api-key` | KMS:Encrypt, DynamoDB:UpdateItem (FidelizeIntegration) |
| `sync-participants` | KMS:Decrypt, DynamoDB:Query/Get (Event, EventCollaborator), DynamoDB:CRUD (Participant, Role), DynamoDB:Get/Update (FidelizeIntegration) |

**Variaveis de ambiente:** Table names, KMS key ARN, region — injectadas via CDK.

### 4. Frontend

#### A. `FidelizeIntegrationSettings.jsx` (Settings → Integracoes)

- Input para API key com validacao
- Estado da conexao (badge Connected/Disconnected)
- Ultimo sync formatado
- Botao Connect/Disconnect
- Usa `useFidelizeStatus` hook + `saveFidelizeApiKey` mutation

#### B. `FidelizeSyncModal.jsx` (Participants tab)

**Maquina de estados:** `idle` → `syncing` → `success` | `error`

- **idle:** Selecao de templates (chips toggle), botao "Start Sync"
- **syncing:** Spinner com icone Fidelize, modal bloqueado
- **success:** Resumo (created/updated/skipped com percentagens), erros por card, botao "Continue Sync" se `hasMore`
- **error:** Mensagem de erro, botao "Try Again"

Templates hardcoded para Human Leaders Congress:

| Template ID | Nome | Cor |
|-------------|------|-----|
| 1024312 | Participant | primary |
| 1024321 | Volunteer | success |
| 1024323 | Speaker | info |
| 1024325 | Partner | warning |
| 1029846 | Organization | secondary |
| 1029847 | Ambassador | error |
| 1030208 | Human Leaders | primary |

#### C. `useFidelizeStatus.js` (Custom hook)

- Cache em memoria com TTL de 5 minutos
- Query ao modelo `FidelizeIntegration` via Amplify data client
- Metodos: `disconnect()` (delete + clear cache), `refetch()` (force query)
- Retorna: `{ isConnected, lastSyncAt, isLoading, disconnect, refetch }`

#### D. `fidelizeApi.js` (RTK Query service)

- `saveFidelizeApiKey` mutation → invalida tag `FidelizeIntegration`
- `syncFidelizeParticipants` mutation → invalida tag `FidelizeIntegration`
- Base query customizada com `generateClient()` do Amplify

### 5. Modelo de Seguranca

| Camada | Mecanismo |
|--------|-----------|
| Autenticacao | Cognito identity tokens (AppSync auth rules) |
| Autorizacao | OWNER/CO_MANAGER check no Lambda antes de qualquer operacao |
| Encriptacao at rest | AES-256 KMS (API keys encriptadas no DynamoDB) |
| Encriptacao in transit | HTTPS (Fidelize API, AWS APIs) |
| Encriptacao in memory | Desencriptada apenas durante execucao Lambda, nunca logada |
| Rotacao de chaves | AWS KMS rotacao anual automatica |
| Scope do token | Per-user (API key pertence ao utilizador, nao ao evento) |
| Ownership dos dados | Participantes criados com `owner = eventOwner` (permission boundary) |
| Protecao de estados | ATTENDED/CANCELLED nunca sobrescritos pelo sync |

### 6. Tratamento de Erros

| Cenario | Comportamento |
|---------|---------------|
| API key invalida (401/403) | Retorna erro claro ao utilizador |
| Rate limit (429) | Mensagem para aguardar e tentar novamente |
| KMS encrypt/decrypt falha | Erro interno logado, mensagem generica ao user |
| Card sem nome | Skipped (contabilizado no resumo) |
| Duplicado no mesmo batch | Primeiro = updated, subsequentes = skipped |
| Timeout >25s | Retorna `hasMore: true` com `nextPage` para retry |
| Erro por card individual | Adicionado ao array `errors[]`, sync continua |
| User sem permissao | Lambda rejeita antes de desencriptar |

## Comparacao com Notion (ADR-023)

| Aspecto | Notion | Fidelize |
|---------|--------|----------|
| API externa | Notion (OAuth 2.0) | Fidelize (API key) |
| Tipo de dados | Documentos/paginas → S3 | Cards → Participantes DynamoDB |
| Encriptacao | KMS (OAuth tokens) | KMS (API key) |
| Autorizacao | OWNER/CO_MANAGER/STAFF_LOGISTICS | OWNER/CO_MANAGER |
| Modo sync | One-shot (snapshot) | One-shot com paginacao |
| Deduplicacao | Por notionPageId | Por internalId/email/phone |
| Merge | Sobrescreve (import = snapshot) | Nao-destrutivo (preenche vazios) |
| Role mapping | N/A | Tier → Role (criacao automatica) |
| Limite por call | 5 paginas (timeout) | Paginado (timeout safety 25s) |

## Consequencias

### Positivas
- Sincronizacao automatizada reduz trabalho manual de registo de participantes
- Deduplicacao inteligente previne duplicados sem perder dados existentes
- Merge nao-destrutivo respeita alteracoes manuais feitas no BafatorioApp
- Paginacao com timeout safety permite importar grandes volumes
- API key encriptada com KMS segue best practices de seguranca
- Mapeamento de tiers automatiza atribuicao de roles

### Negativas
- Templates hardcoded para Human Leaders Congress — necessita parametrizacao para outros eventos
- Sem sync automatico/periodico (requer accao manual do utilizador)
- Mapeamento tier → role e fixo, nao configuravel pelo utilizador
- API key e per-user, nao partilhada entre co-managers do mesmo evento

### Trabalho Futuro
- Parametrizar templates via fetch dinamico da API Fidelize (`GET /api/v2/templates`)
- Adicionar sync periodico via EventBridge/cron
- Permitir mapeamento customizado de tiers para roles
- Dashboard de historico de syncs com metricas
