# ADR-023: Notion Integration Architecture

## Status
**Accepted** (Amended 2026-03-14 — SDK v5 upgrade, native Markdown, sync updates, simplified UI) | Data: 2026-02-26

## Contexto

O Bafatorio precisa de permitir que os utilizadores importem documentos estratégicos diretamente do Notion para os seus eventos. Requisitos:

- Autenticação OAuth 2.0 com o Notion (por utilizador)
- Listagem e pesquisa de páginas Notion com paginação
- Importação de até 5 páginas por pedido, convertidas para Markdown
- Armazenamento no S3 + metadados em DynamoDB
- Encriptação dos tokens OAuth com AWS KMS
- Controlo de acesso baseado em roles (OWNER, CO_MANAGER, STAFF_LOGISTICS)
- Integração transparente com o tab Documents existente
- Sincronização de documentos já importados com alterações no Notion

## Decisão

Implementámos uma integração Notion com quatro Lambdas, dois modelos DynamoDB, encriptação KMS e uma camada frontend com RTK Query + hooks customizados.

### Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       NOTION INTEGRATION FLOW                                │
└──────────────────────────────────────────────────────────────────────────────┘

  1. OAuth Flow                          2. Import Flow

  ┌──────────┐    ┌──────────────┐       ┌──────────────┐    ┌────────────────┐
  │ Settings │───▶│ Notion OAuth │       │ Import Modal │───▶│ notion-list-   │
  │   Page   │    │   Screen     │       │  (max 5 pp)  │    │ pages Lambda   │
  └──────────┘    └──────┬───────┘       └──────┬───────┘    └────────────────┘
                         │ code                  │ pageIds
                         ▼                       ▼
                  ┌──────────────┐       ┌────────────────┐
                  │ /notion/     │       │ notion-import- │
                  │  callback    │       │ pages Lambda   │
                  └──────┬───────┘       └───────┬────────┘
                         │                       │
                         ▼                       ├──────────────┐
                  ┌──────────────┐               ▼              ▼
                  │ notion-      │        ┌───────────┐  ┌────────────┐
                  │ exchange-    │        │    S3      │  │ DynamoDB   │
                  │ token Lambda │        │ (.md file) │  │ NotionDoc  │
                  └──────┬───────┘        └───────────┘  └────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ DynamoDB     │
                  │ NotionInteg. │
                  │ (KMS encrypt)│
                  └──────────────┘

  3. Viewing Flow                        4. Sync Flow

  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐    ┌────────────────┐
  │ Documents    │───▶│ S3 pre-      │   │ Sync Modal   │───▶│ notion-check-  │
  │ Tab (.md)    │    │ signed URL   │   │ (check +     │    │ updates Lambda │
  └──────────────┘    └──────┬───────┘   │  update all) │    └────────┬───────┘
                             ▼           └──────┬───────┘             │
                      ┌──────────────┐          │                     ▼
                      │ Markdown     │          ▼              ┌────────────────┐
                      │ Renderer     │   ┌────────────────┐    │ Compare        │
                      │ (react-md)   │   │ notion-import- │    │ last_edited_   │
                      └──────────────┘   │ pages Lambda   │    │ time vs stored │
                                         │ (update mode)  │    └────────────────┘
                                         └────────────────┘
```

## Componentes

### 1. Estrutura de Ficheiros

```
amplify/function/
├── notion-exchange-token/
│   ├── handler.ts              # OAuth code → token exchange
│   └── resource.ts             # Lambda definition (timeout: 30s)
├── notion-list-pages/
│   ├── handler.ts              # Pesquisa e listagem paginada (só páginas)
│   └── resource.ts             # Lambda definition (timeout: 30s)
├── notion-import-pages/
│   ├── handler.ts              # Importação + re-importação (update mode)
│   └── resource.ts             # Lambda definition (timeout: 29s)
├── notion-check-updates/
│   ├── handler.ts              # Verifica alterações no Notion
│   └── resource.ts             # Lambda definition (timeout: 20s)
└── shared/
    ├── notionClient.ts         # Cliente Notion + token validation
    └── kmsUtils.ts             # Encrypt/decrypt KMS helpers

amplify/data/resource.ts        # Modelos + tipos + mutations/queries GraphQL
amplify/backend.ts              # CDK: KMS key, IAM policies

src/
├── Api/services/notionApi.js   # RTK Query endpoints
├── Components/
│   ├── Settings/NotionIntegrationSettings.jsx   # UI de ligação OAuth
│   ├── Pages/NotionCallback.jsx                 # Callback OAuth handler
│   └── EventDetails/
│       ├── NotionImportModal.jsx                # Modal de importação (só páginas)
│       ├── NotionSyncModal.jsx                  # Modal de sincronização
│       ├── DocumentPreviewModal.jsx             # Preview modal (routes by file type)
│       ├── documentPreviewRenderers/            # Per-type renderers (Markdown, Image, Text, etc.)
│       └── Documents.jsx                        # Integração no tab
├── Hook/useNotionStatus.js     # Hook de estado da conexão
├── Utils/notionConstants.js    # Client ID + redirect URI
└── i18n/locales/
    ├── en-US/ (settings.json, event.json)
    ├── pt-PT/ (settings.json, event.json)
    └── fr-FR/ (settings.json, event.json)
```

### 2. Modelos de Dados

#### NotionIntegration (tokens OAuth por utilizador)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (PK) | userId |
| `accessToken` | String | Token encriptado com KMS (Base64) |
| `refreshToken` | String? | Refresh token encriptado (opcional) |
| `workspaceId` | String | ID do workspace Notion |
| `workspaceName` | String? | Nome do workspace (display) |
| `botId` | String | ID do bot/app Notion |

**Autorização:** Owner only (cada utilizador só acede aos seus tokens).

#### NotionDocument (metadados de documentos importados)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (PK) | UUID do documento |
| `eventId` | String | Evento associado |
| `folderId` | String? | Pasta destino (opcional) |
| `notionPageId` | String | ID original da página Notion |
| `notionPageUrl` | String? | URL da página Notion |
| `title` | String | Título do documento |
| `s3Key` | String | Caminho no S3 para o Markdown |
| `notionLastEditedAt` | String? | Última edição no Notion (para sync) |
| `importedAt` | DateTime? | Timestamp da importação/atualização |
| `owner` | String? | Utilizador que importou |

**Índices secundários:**
- `byEventId` — listar docs de um evento/pasta
- `byNotionPageId` (sort: `eventId`) — prevenir importações duplicadas + update mode

**Autorização:** Owner (full) + groups USER/ADMIN (read, update, delete).

### 3. OAuth App Registration

A integração OAuth do Bafatorio está registada no Notion na conta **owner@example.com** em [notion.so/my-integrations](https://www.notion.so/my-integrations).

- **Client ID:** `00000000-0000-0000-0000-000000000000` (público, em `.env` como `VITE_NOTION_CLIENT_ID`)
- **Client Secret:** gerido via Amplify secrets (`NOTION_CLIENT_SECRET`)
- **Redirect URIs configurados no Notion:**
  - `https://app.bafatorio.com/app/notion/callback` (produção)
  - `https://development.dEXAMPLEAPPID.amplifyapp.com/app/notion/callback` (development)
  - `http://localhost:5173/app/notion/callback` (local dev)
  - `http://localhost:5174/app/notion/callback` (local dev, port alternativo)

#### SSM Secrets — Paths por Environment

O Amplify Hosting usa paths SSM com branch identifier (diferente do `npx ampx sandbox secret set`):

| Environment | SSM Path |
|---|---|
| Sandbox (macbook) | `/amplify/bafatorioapp/macbook-sandbox-5ae7aff9f2/NOTION_CLIENT_*` |
| Development | `/amplify/dEXAMPLEAPPID/development-branch-b62b964697/NOTION_CLIENT_*` |
| Main (produção) | `/amplify/dEXAMPLEAPPID/main-branch-80b14afd35/NOTION_CLIENT_*` |

**IMPORTANTE:** `npx ampx sandbox secret set` cria em `/amplify/dEXAMPLEAPPID/development/...` (path curto) mas o Lambda em Amplify Hosting procura em `/amplify/dEXAMPLEAPPID/development-branch-b62b964697/...` (path com identifier). Os secrets devem existir em ambos os paths, ou ser criados directamente via AWS CLI:

```bash
aws ssm put-parameter --name "/amplify/dEXAMPLEAPPID/development-branch-b62b964697/NOTION_CLIENT_SECRET" --value "<secret>" --type SecureString --overwrite
```

### 4. Lambda Functions

#### A. `notion-exchange-token` — OAuth Token Exchange

**Fluxo:**
1. Recebe `code` + `redirectUri` do frontend
2. Valida `redirectUri` contra whitelist
3. Troca code por tokens via `POST https://api.notion.com/v1/oauth/token`
4. Verifica conflito de workspace (impede múltiplos workspaces por utilizador)
5. Encripta `access_token` com KMS
6. Guarda no DynamoDB como registo único por `userId`

**IAM:** DynamoDB PutItem/GetItem + KMS Encrypt

#### B. `notion-list-pages` — Pesquisa de Páginas

**Fluxo:**
1. Desencripta token do utilizador via `getNotionClient(userId)`
2. Chama Notion Search API com `filter: { value: 'page', property: 'object' }` — **só retorna páginas** (databases filtrados na API)
3. Paginação por cursor (page_size: 20), ordenados por `last_edited_time` desc
4. Extrai título e ícone emoji de cada página
5. Em caso de 401: apaga integração

**Nota:** SDK v5.10+ tem retry automático com backoff — sem `withRetry` manual.

**IAM:** DynamoDB GetItem/DeleteItem + KMS Decrypt

#### C. `notion-import-pages` — Importação de Páginas

**Fluxo:**
1. Verifica autorização: utilizador é owner do evento OU colaborador com role `CO_MANAGER` ou `STAFF_LOGISTICS`
2. Máximo 5 páginas por pedido (2s delay entre elas)
3. Para cada página:
   - `pages.retrieve()` + `pages.retrieveMarkdown()` em paralelo (Promise.all)
   - Sanitiza markdown (remove `<callout>`, `<unknown>`, `<empty-block>`, tags HTML)
   - Prepend título como H1
   - Persiste imagens Notion para S3
   - **Update mode:** se `NotionDocument` já existe para o `notionPageId` na mesma pasta, reutiliza o `s3Key` existente e faz update no DynamoDB (em vez de criar novo)
   - Se novo: gera novo `s3Key` e `docId`
4. Se o DynamoDB falhar após S3 upload → rollback (apaga objeto S3, apenas para novos docs)

**IAM:** DynamoDB (multi-table) + S3 PutObject/DeleteObject + KMS Decrypt

#### D. `notion-check-updates` — Verificação de Alterações

**Fluxo:**
1. Verifica autorização (mesmo padrão da import-pages)
2. Recebe `eventId` + `folderId`
3. Query `NotionDocument` por `eventId` + filtra por `folderId`
4. Para cada doc: `pages.retrieve(notionPageId)` → compara `last_edited_time` com `notionLastEditedAt` guardado
5. Retorna lista dos docs com alterações + totais

**IAM:** DynamoDB Query (NotionDocument, Event, EventCollaborator) + KMS Decrypt

### 5. Segurança

| Camada | Implementação |
|--------|---------------|
| **Tokens em repouso** | AES-256 via AWS KMS com rotação anual automática |
| **Tokens em trânsito** | HTTPS (Notion API + AWS APIs) |
| **Tokens em memória** | Apenas desencriptados na Lambda, nunca logados |
| **CSRF** | Estado UUID gerado no frontend, validado no callback OAuth |
| **Redirect URI** | Whitelist rígida no backend |
| **Workspace** | Impede múltiplos workspaces por utilizador |
| **Importação** | Verificação de role no evento (owner ou CO_MANAGER/STAFF_LOGISTICS) |
| **Sync** | Mesma verificação de role que importação |
| **Documentos S3** | Pre-signed URLs com expiração de 5 minutos |

### 6. Fluxo OAuth Completo (Frontend)

1. **Settings → "Connect Notion"** (`NotionIntegrationSettings.jsx`)
   - Gera UUID → `sessionStorage['notion_oauth_state']`
   - Redirect para `https://api.notion.com/v1/oauth/authorize`

2. **Notion autoriza** → redirect para `/app/notion/callback?code=...&state=...`

3. **NotionCallback.jsx** processa:
   - Valida `state` contra `sessionStorage`
   - Chama mutation `exchangeNotionToken(code, redirectUri)`
   - Sucesso → mostra workspace name, redireciona para settings em 2s

4. **Verificação de estado** — `useNotionStatus(userId)` hook:
   - Query direto ao modelo `NotionIntegration` via Amplify client
   - Retorna `{ isConnected, workspaceName, isLoading, disconnect, refetch }`

### 7. Fluxo de Importação (Frontend)

1. **Documents tab** mostra botão "Import from Notion" se `isNotionConnected`
2. **NotionImportModal** abre com listagem de **páginas apenas** (databases filtrados na API):
   - Pesquisa com query string
   - "Load more" para paginação por cursor
   - Seleção múltipla até 5 páginas (checkboxes visíveis com `border-2`)
   - Modal com tamanho fixo (`2xl`, 600px altura) para evitar layout shifts
3. **Import** → mutation `importNotionPages(eventId, pageIds, folderId)`
   - Fetch inicial usa `.unwrap()` directamente (evita stale cache do RTK Query)
   - `invalidatesTags: ['NotionPages']` após import para limpar cache
4. **Resultado**:
   - Sucesso → fecha modal (500ms), atualização optimista do folder count, refetch folders + documents
   - Falha → mensagem de erro inline

### 8. Fluxo de Sincronização (Frontend)

1. **Botão "Sincronizar"** no header da tabela de documentos (só dentro de pastas, se Notion conectado)
2. **NotionSyncModal** abre e verifica automaticamente:
   - Estado "checking" → spinner
   - Estado "results" → lista de docs desatualizados (título + tempo desde edição) ou "Tudo atualizado"
   - Botão "Atualizar todos" → re-importa (update mode reutiliza s3Key)
   - Estado "done" → sucesso com contagem
3. **Após sync** → invalida caches, refetch documentos

### 9. Visualização de Documentos Importados

- Documentos `.md` aparecem no tab Documents numa **tabela com grid CSS**
- Colunas: Nome (ícone específico por tipo), Tamanho, Modificado, Tipo, Criador (da pasta), Acesso (colaboradores)
- Colunas Criador/Acesso só visíveis dentro de pastas
- Responsive: mobile mostra só Nome + Tamanho
- Click abre `DocumentPreviewModal` (side panel):
  - Ícone específico por tipo de ficheiro (FaFilePdf, FaFileImage, etc.)
  - `MarkdownRenderer` com `react-markdown` + `remark-gfm` + `remark-emoji`
  - Markdown sanitizado (sem tags HTML do Notion)
  - Título H1 prepended no conteúdo
  - Max-width 680px para legibilidade
  - Opção "Save as PDF"

### 10. Matriz de Permissões

| Operação | OWNER | CO_MANAGER | STAFF_LOGISTICS | STAFF_CHECKIN |
|----------|-------|------------|-----------------|---------------|
| Conectar Notion (pessoal) | Sim | Sim | Sim | Sim |
| Desconectar Notion | Sim | Sim | Sim | Sim |
| Importar para evento | Sim | Sim | Sim | Não |
| Sincronizar docs | Sim | Sim | Sim | Não |
| Ver docs importados | Sim | Sim | Sim | Não |
| Apagar docs importados | Sim | Own folder | Own folder | Não |

### 11. API Frontend (RTK Query)

```javascript
// src/Api/services/notionApi.js
notionApi = createApi({
  tagTypes: ['NotionConnection', 'NotionPages'],
  endpoints: {
    exchangeNotionToken:  mutation  → invalidates NotionConnection
    listNotionPages:      query    → provides NotionPages (lazy)
    importNotionPages:    mutation  → invalidates NotionPages
    checkNotionUpdates:   query    → (lazy, no cache tags)
  }
})

// Hooks exportados
useExchangeNotionTokenMutation()
useLazyListNotionPagesQuery()
useImportNotionPagesMutation()
useLazyCheckNotionUpdatesQuery()
```

### 12. Dependências Externas

| Pacote | Versão | Utilização |
|--------|--------|------------|
| `@notionhq/client` | ^5.12.0 | SDK oficial do Notion (v5 com `retrieveMarkdown()` nativo + retry automático) |
| `react-markdown` | ^10.1.0 | Renderização Markdown no frontend |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown (tabelas, listas) |
| `remark-emoji` | ^5.0.1 | Suporte a emojis no Markdown |

**Nota:** `notion-to-md` foi removido — substituído pelo endpoint nativo `pages.retrieveMarkdown()` do SDK v5.11+.

### 13. Variáveis de Ambiente

**Secrets (Amplify):**
- `NOTION_CLIENT_ID` — OAuth client ID
- `NOTION_CLIENT_SECRET` — OAuth client secret

**Frontend (.env):**
- `VITE_NOTION_CLIENT_ID` — Client ID público para o redirect OAuth

**Injetadas pelo CDK:**
- `NOTION_INTEGRATION_TABLE_NAME`, `NOTION_DOCUMENT_TABLE_NAME`
- `KMS_KEY_ID`, `BAFATORIO_APP_REGION`
- `BAFATORIO_APP_EVENT_TABLE_NAME`, `BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME`
- `BAFATORIO_APP_S3_BUCKET_NAME`

## Limitações Conhecidas

1. **Máximo 5 páginas por pedido** — constraint do timeout de 30s do AppSync. Com 2s delay entre páginas, 5 é o limite seguro.

2. **Um workspace por utilizador** — a Lambda de exchange rejeita se o utilizador já tem integração com um workspace diferente. Para mudar, tem de desconectar primeiro.

3. **Documentos não editáveis** — o Markdown importado é read-only. Edição requer re-importação do Notion via sync.

4. **Sync manual** — a sincronização requer acção do utilizador (botão "Sincronizar"). Não há webhooks nem polling automático.

5. **Markdown sanitizado** — tags proprietárias do Notion (`<callout>`, `<unknown>`, embeds) são convertidas para blockquotes/links ou removidas. Alguma formatação avançada pode perder-se.

6. **Bases de dados Notion não suportadas** — a UI filtra databases e mostra apenas páginas. Importação de databases como tabela Markdown foi removida por simplificação.

## Consequências

- Documentos Notion integram-se transparentemente no tab Documents existente (mesmo bucket S3, mesma estrutura de pastas)
- Tokens OAuth encriptados com KMS garantem segurança at-rest com rotação automática
- SDK v5 com `retrieveMarkdown()` elimina dependência de `notion-to-md` e melhora qualidade do Markdown
- Retry automático do SDK v5.10+ simplifica o código das Lambdas
- Update mode no import permite re-importar sem duplicar ficheiros no S3
- Sync modal permite manter documentos atualizados com alterações no Notion
- Tabela de documentos com ícones por tipo, colunas de Criador/Acesso dá visão profissional
- i18n completo em 3 idiomas (pt-PT, en-US, fr-FR) com pluralização
