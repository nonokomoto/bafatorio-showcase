# ADR-026: Acesso a Dados de Eventos — Migração de RAG para Tool Calling

## Status
**Deprecated — 2026-07-10** (originalmente Accepted, 2026-03-18)

> **O chatbot Akili foi descontinuado no sunset para o launch v1.0** (issue [#142](https://github.com/nonokomoto/BafatorioApp/issues/142)): rota removida (#143), frontend eliminado (#147). A arquitetura de tool calling descrita abaixo **já não está em uso no produto**. O `api-bafatorio` mantém-se apenas para **normalização de imports** (`/normalize/*`), não `/chat`. O modelo `ConversationMessage` continua provisionado (não eliminado — ver Fase 2 do sunset em `docs/plans/2026-07-02-feature-sunset-design.md`). Este ADR fica histórico.

## Contexto

O Akili (assistente IA do Bafatorio) utilizava anteriormente RAG (Retrieval-Augmented Generation) com pgVector para responder a perguntas sobre dados de eventos — participantes, fornecedores e orçamentos.

**Pipeline RAG existente:**

```
DynamoDB (mutação) → webhook → api-bafatorio → Mistral Embed → pgVector (Supabase)
                                                                        ↓
                                              Akili query → embedding → similarity search → LLM
```

**Problemas identificados:**

| Problema | Impacto |
|----------|---------|
| Imprecisão em dados estruturados | Contagens, valores monetários e nomes podiam ser incorretos ou desatualizados |
| Lag de sincronização | Webhooks assíncronos introduziam desfasamento entre DynamoDB e pgVector |
| Pipeline complexo | ~2500 linhas de código para webhooks, sincronização e embeddings |
| Mismatch semântico | Busca por semelhança vectorial é inadequada para queries exactas (ex: "quantos participantes confirmados?") |
| Custo de embeddings | Cada mutação DynamoDB gerava chamadas à API Mistral (`mistral-embed`, 1024 dims) |

O RAG permanece adequado para documentação da plataforma (conteúdo semântico e estático), mas é fundamentalmente inadequado para dados estruturados e transacionais de eventos.

## Decisão

Substituímos o RAG de eventos por **tool calling via AppSync GraphQL**. O LLM (Kimi K2 via Groq) decide qual ferramenta invocar com base na pergunta do utilizador, e cada ferramenta consulta o AppSync diretamente, obtendo dados exactos e em tempo real.

### Arquitectura de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AKILI — EVENT TOOL CALLING FLOW                           │
└──────────────────────────────────────────────────────────────────────────────┘

  Frontend (BafatorioApp)              api-bafatorio (Fastify)
  ┌─────────────────────┐              ┌──────────────────────────────────────┐
  │  AkiliChat          │              │  POST /ai/chat                       │
  │  - accessToken      │─────────────►│  - auth: JWT (accessToken)           │
  │  - idToken ────────────────────────┼──► X-Id-Token forwarded to AppSync   │
  │  - eventId          │              │  - Kimi K2 (Groq) LLM                │
  └─────────────────────┘              │  - tool calling loop                 │
                                       └───────────────┬──────────────────────┘
                                                       │
                                          LLM selects tool
                                                       │
                              ┌────────────────────────▼──────────────────────┐
                              │               EVENT TOOLS (6)                  │
                              │                                                │
                              │  get_event_summary      list_participants      │
                              │  search_participant     list_suppliers         │
                              │  get_budget_summary     list_team              │
                              └────────────────────────┬──────────────────────┘
                                                       │ GraphQL query
                                                       ▼
                              ┌────────────────────────────────────────────────┐
                              │              AWS AppSync                        │
                              │  Authorization: Bearer {idToken}               │
                              │  Lambda resolvers → DynamoDB                   │
                              │  (owner check + collaborator role check)       │
                              └────────────────────────────────────────────────┘
```

### Ferramentas de Evento (6 tools)

| Tool | Dados retornados |
|------|-----------------|
| `get_event_summary` | Nome, datas, local, contagens de participantes por status, capacidade |
| `list_participants` | Lista paginada com nome, email, status, role, check-in |
| `search_participant` | Busca por nome ou email num participante específico |
| `list_suppliers` | Fornecedores com nome, categoria, contacto, estado do contrato |
| `get_budget_summary` | Total orçamentado, gasto, pendente, breakdown por categoria |
| `list_team` | Membros da equipa (co-managers, staff) com roles e permissões |

A ferramenta `search_platform_docs` (documentação da plataforma) **permanece RAG** — conteúdo semântico e estático, adequado para similarity search.

### Autenticação Dual

O Akili opera num contexto que requer dois tokens distintos:

| Token | Uso | Origem |
|-------|-----|--------|
| `accessToken` (Cognito) | Autenticar pedido ao `api-bafatorio` | Cookie/localStorage |
| `idToken` (Cognito) | Autenticar pedido ao AppSync dentro da tool | Header `X-Id-Token` |

O frontend envia o `idToken` via header `X-Id-Token` em todos os pedidos à API. O `api-bafatorio` reencaminha este token no header `Authorization: Bearer {idToken}` para o AppSync.

**CORS:** O `api-bafatorio` foi atualizado para permitir o header `X-Id-Token` nas políticas CORS.

### Autorização no AppSync

Os Lambda resolvers do AppSync executam a lógica de autorização estabelecida em ADR-019:

1. Extrair `userId` do `idToken` via Cognito identity
2. Verificar se o utilizador é OWNER do evento **ou** tem role de colaborador aceite (CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN)
3. Rejeitar com erro se não autorizado — antes de qualquer query ao DynamoDB

### Remoção do Pipeline RAG de Eventos

| Componente removido | Descrição |
|--------------------|-----------|
| `POST /webhooks/dynamodb` | Endpoint que recebia mutações DynamoDB via EventBridge |
| `POST /webhooks/s3` | Endpoint que recebia eventos S3 para embeddings de documentos de evento |
| Tabelas pgVector de eventos | `event_participants`, `event_suppliers`, `event_budgets` em Supabase |
| Serviço de embeddings de eventos | Chamadas à API `mistral-embed` por cada mutação |
| ~2500 linhas de código | Webhook handlers, sync services, embedding pipelines |

## Componentes

### 1. Tool Execution (api-bafatorio)

Cada tool recebe `eventId` e o `idToken` do utilizador. Executa uma query GraphQL ao AppSync com o `idToken` no header `Authorization`. O resultado é passado de volta ao LLM como contexto para gerar a resposta final.

O loop de tool calling segue o padrão Groq function calling:
1. LLM recebe pergunta + definições das tools
2. LLM emite `tool_calls` com argumentos
3. api-bafatorio executa cada tool → AppSync → DynamoDB
4. Resultados injetados como `tool` messages na conversa
5. LLM gera resposta final em linguagem natural

### 2. Variável de Ambiente

```bash
APPSYNC_ENDPOINT=https://<id>.appsync-api.<region>.amazonaws.com/graphql
```

Nova dependência de configuração no `api-bafatorio`. Deve ser definida em todos os ambientes (dev, staging, prod) e no `fly.io` secrets.

### 3. Frontend — Envio do X-Id-Token

O `AkiliChat` (e todos os pedidos ao `api-bafatorio`) inclui o `idToken` do Cognito no header `X-Id-Token`. O `amplifyBaseQuery` ou o fetch customizado do Akili injetam este header automaticamente após autenticação.

## Alternativas Consideradas

### 1. AWS SDK Direto (DynamoDB)

Acesso directo ao DynamoDB a partir do `api-bafatorio` via AWS SDK.

**Rejeitado porque:**
- Duplicaria a lógica de autorização já implementada em 50+ Lambda resolvers AppSync
- Exigiria IAM credentials no `api-bafatorio` (Fly.io) para aceder a recursos AWS
- Violaria o princípio de single source of truth para autorização

### 2. Lambda Invoke

Invocar Lambda functions diretamente (ex: `listParticipantsFunction`) a partir do `api-bafatorio`.

**Rejeitado porque:**
- Cold starts de 300–800ms por invocação degradariam a experiência do Akili
- Acoplamento fraco aos nomes internos das funções gerados pelo Amplify (instáveis entre deploys)
- Requereria IAM credentials e permissões `lambda:InvokeFunction` no `api-bafatorio`

### 3. Manter RAG

Melhorar o pipeline RAG existente (sync mais rápido, re-embedding incremental).

**Rejeitado porque:**
- Mismatch fundamental: busca vectorial por semelhança não resolve queries de dados estruturados
- Latência de sync sempre existirá (even se reduzida)
- Custo contínuo de embeddings para dados transacionais de alta frequência de mutação
- Complexidade de pipeline não justificada quando AppSync já oferece acesso directo e autorizado

## Consequências

### Positivas
- Dados de eventos exactos e em tempo real — sem lag de sincronização
- Dados numéricos (contagens, orçamentos) sempre precisos
- Remoção de ~2500 linhas de código de webhook/sync/embedding
- Reutilização da lógica de autorização existente nos Lambda resolvers (ADR-019)
- Elimina custo de embeddings Mistral para dados de eventos
- Pipeline de dados simplificado — mutações DynamoDB não requerem processamento adicional

### Negativas
- Nova dependência de configuração: `APPSYNC_ENDPOINT` obrigatória no `api-bafatorio`
- Frontend deve enviar `X-Id-Token` em todos os pedidos à API (header adicional)
- Tool calling introduz latência adicional por tool invocada (1 round-trip AppSync por tool)
- Se o AppSync estiver indisponível, o Akili perde acesso a dados de eventos

### Neutras
- `search_platform_docs` permanece RAG — sem alteração para documentação da plataforma
- A autorização de eventos não muda — reutiliza os Lambda resolvers existentes
- CORS atualizado para incluir `X-Id-Token` nos headers permitidos

## Implementações Relacionadas no Mesmo Ciclo

Durante a mesma fase de evolução arquitetural, os fluxos de importação de participantes e fornecedores foram alinhados com o princípio de separar:
- normalização/inteligência de parsing
- validação/autorização/escrita transacional

### Import Preview via Normalize API

Os modais de import passaram a usar uma API de normalização como caminho principal para preview de ficheiros `.xlsx`, `.xls` e `.csv`.

**Fluxo:**
1. frontend envia o ficheiro para endpoint de normalização
2. API devolve JSON normalizado + summary
3. AppSync/Lambda recebe apenas o JSON normalizado para persistência

Isto reduz a complexidade dos handlers de import e aproxima o fluxo do princípio adotado nesta ADR: usar a camada certa para cada responsabilidade, em vez de manter pipelines monolíticos e difíceis de evoluir.

### Remoção de Lógica Obsoleta

A remoção do `rag-sync` neste PR é consistente com a decisão desta ADR.
Da mesma forma, a lógica de parsing pesado em Lambdas de import deixa de ser o caminho principal e passa a existir apenas como fallback de compatibilidade quando a normalização não está disponível.

## ADRs Relacionados

- **ADR-009** — Akili chatbot architecture (contexto original do assistente)
- **ADR-004** — Backend architecture (padrões Lambda, IAM)
- **ADR-019** — Event-scoped roles e Lambda verification pattern (autorização reutilizada pelas tools)
