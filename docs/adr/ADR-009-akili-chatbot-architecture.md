# ADR-009: AI Chatbot (Akili) Architecture

## Status
**Superseded by [ADR-026](ADR-026-event-tools-migration.md)** | Data: 2025-01-23

> **Este ADR é histórico.** O chatbot Akili foi migrado de AppSync + Lambda (`chatbot-resolver`) para o **api-bafatorio** (Fastify REST API) com tool calling. A Lambda `chatbot-resolver` e a mutation `InvokeChatbot` já não existem. O chatbot foi **posteriormente descontinuado** no sunset para o launch v1.0 (ver [ADR-026](ADR-026-event-tools-migration.md), `docs/plans/2026-07-02-feature-sunset-design.md` §1 e issue #142).
>
> **Atualização 2026-07-13.** O assistente conversacional está **inativo** — não há link no Sidebar/Header nem feature exposta. O único uso vivo do LLM da api-bafatorio é a **normalização de ficheiros de import** (participantes e suppliers): `useNormalizeFile` nos modais de importação, com fallback local quando a normalização LLM não está disponível. Nada neste ADR descreve funcionalidade ativa exceto esse caminho de normalização.

## Contexto

O Bafatorio necessita de um assistente de IA para ajudar os utilizadores a navegar na plataforma e gerir os seus eventos. Os requisitos incluem:

- Assistente conversacional com contexto persistente
- Suporte multilíngue (Português, Inglês, Francês)
- Conhecimento sobre a plataforma Bafatorio
- Capacidade de consultar dados específicos do utilizador (eventos, participantes)
- Respostas rápidas e relevantes
- Otimização de custos via prompt caching

## Decisão

Implementámos o assistente **Akili** utilizando Amazon Bedrock com o modelo Claude 3.5 Haiku, integrado via AppSync GraphQL e com histórico de conversação armazenado em DynamoDB.

### Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          AKILI CHATBOT FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   InvokeChatbot  │────▶│  chatbot-       │
│  (React)    │     │   Mutation       │     │  resolver       │
│  AkiliChat  │     │   (AppSync)      │     │  Lambda         │
└─────────────┘     └──────────────────┘     └─────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────┐
                    │                                 │                         │
                    ▼                                 ▼                         ▼
             ┌─────────────┐                   ┌─────────────┐          ┌─────────────┐
             │  DynamoDB   │                   │   Amazon    │          │  DynamoDB   │
             │ Conversation│                   │   Bedrock   │          │   Event     │
             │   History   │                   │  (Claude)   │          │   Table     │
             └─────────────┘                   └─────────────┘          └─────────────┘
                    │                                 │
                    │   ┌─────────────────────────────┤
                    │   │  (Future: RAG)              │
                    │   ▼                             │
                    │ ┌─────────────────┐             │
                    │ │  Knowledge Base │             │
                    │ │   (Disabled)    │             │
                    │ └─────────────────┘             │
                    │                                 │
                    └─────────────────────────────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │  Response   │
                             │  to User    │
                             └─────────────┘
```

## Componentes Principais

### 1. Estrutura de Ficheiros

```
amplify/function/chatbot-resolver/
├── handler.ts                    # Entry point (208 linhas)
├── resource.ts                   # Lambda definition
│
└── lib/                          # Service modules
    ├── bedrockService.ts         # Bedrock integration (409 linhas)
    ├── config.ts                 # Configuration constants
    ├── conversationService.ts    # History optimization
    ├── dynamoService.ts          # DynamoDB operations (671 linhas)
    ├── metricsService.ts         # Cache performance tracking
    ├── templates.ts              # Domain-specific templates
    └── types.ts                  # TypeScript interfaces
```

### 2. Modelo de Dados

#### ConversationMessage (DynamoDB)
```typescript
ConversationMessage: a.model({
  conversationId: a.string().required(),  // Partition Key
  timestamp: a.datetime().required(),      // Sort Key
  role: a.enum(['user', 'assistant']),    // Quem enviou
  content: a.string().required(),          // Conteúdo da mensagem
  // owner field adicionado automaticamente pela auth rule
})
.identifier(['conversationId', 'timestamp'])
.authorization((rules) => [
  rules.owner(),  // Apenas o dono pode ver as suas conversas
])
```

#### Estrutura da Mensagem Interna
```typescript
interface ConversationMessageItem {
  conversationId: string;
  timestamp: string;       // ISO 8601
  role: 'user' | 'assistant';
  content: string;
  owner: string;           // Cognito User Sub
  ttl: number;             // TTL para auto-delete (30 dias)
}
```

### 3. GraphQL Mutation

```typescript
InvokeChatbot: a.mutation()
  .arguments({
    message: a.string().required(),    // Mensagem do utilizador
    conversationId: a.string()          // Optional: para continuar conversa
  })
  .returns({
    responseMessage: a.string().required(),
    conversationId: a.string().required()
  })
  .authorization((rules) => [
    rules.authenticated()
  ])
  .handler(a.handler.function(chatbotResolverLambda))
```

### 4. Configuração

```typescript
// lib/config.ts
export const BEDROCK_DEFAULT_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
export const BEDROCK_MAX_TOKENS = 1000;
export const HISTORY_MAX_MESSAGES = 20;     // Mensagens máximas no histórico
export const MESSAGE_TTL_DAYS = 30;         // Auto-delete após 30 dias
export const CONVERSATION_ID_PREFIX = 'conv';

// Knowledge Base (Currently Disabled)
export const KNOWLEDGE_BASE_ID = '';        // [DISABLED]
export const ENABLE_RAG = false;            // [DISABLED]
```

### 5. System Prompt

```typescript
export const SYSTEM_PROMPT = `
**HIGHEST PRIORITY: YOUR RESPONSE MUST BE IN THE SAME LANGUAGE AS THE USER'S LAST MESSAGE.**

You are Akili, a helpful AI assistant for Bafatorio, an event management platform.

**LANGUAGE RULE (ABSOLUTE):**
- If the user writes in English, respond in English.
- If the user writes in Portuguese, respond in European Portuguese (PT-PT).
- If the user writes in French, respond in French.

**RESPONSE STYLE:**
- Answer directly and concisely.
- Maintain a helpful and professional tone.
- Use formatting (lists, bolding) only when it clarifies the answer.
`;
```

### 6. Domain-Based Routing

O Akili identifica o domínio da pergunta para otimizar a resposta:

```typescript
// lib/templates.ts
export const domainTemplates = {
  EVENTS: 'Instructions for event-related queries...',
  PARTICIPANTS: 'Instructions for participant management...',
  DASHBOARD: 'Instructions for dashboard and reporting...',
  SUPPLIERS: 'Instructions for supplier management...',
  GENERAL: 'General platform instructions...',
  AUTHENTICATION: 'Instructions for auth queries...',
  ACCOUNT: 'Instructions for account settings...',
  ASSISTANT: 'Instructions about Akili capabilities...'
};

export function identifyQueryDomain(query: string): string {
  const normalizedQuery = query.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Keywords multilíngue (PT, EN, FR)
  if (/event|evento|evenement|agenda|schedule/i.test(normalizedQuery)) 
    return "EVENTS";
  if (/participant|participante|inscri|registr/i.test(normalizedQuery)) 
    return "PARTICIPANTS";
  if (/dashboard|painel|statistic|relatorio|report/i.test(normalizedQuery)) 
    return "DASHBOARD";
  if (/supplier|fornecedor|fournisseur/i.test(normalizedQuery)) 
    return "SUPPLIERS";
  // ... mais domínios
  return "GENERAL";
}
```

### 7. Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HANDLER PROCESSING FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. Recebe InvokeChatbot mutation
         │
         ▼
2. Valida configuração e identidade do utilizador
         │
         ▼
3. Gera/usa conversationId (domain-aware)
   └── createDomainAwareConversationId()
         │
         ▼
4. Guarda mensagem do utilizador no DynamoDB
   └── saveMessage({ role: 'user', content: message })
         │
         ▼
5. Carrega histórico da conversa
   └── getHistory(conversationId) → até 20 mensagens
         │
         ▼
6. Seleciona mensagens relevantes (otimização)
   └── getRelevantHistory() → máximo 6 mensagens
         │
         ▼
7. Identifica domínio da pergunta
   └── identifyQueryDomain(message)
         │
         ▼
8. Invoca Bedrock (Converse API)
   └── getAssistantResponse(messages, systemPrompt)
         │
         ├── [Se RAG enabled] → RetrieveAndGenerate (KB)
         │
         └── [Default] → Converse API com domain templates
         │
         ▼
9. Guarda resposta do assistente
   └── saveMessage({ role: 'assistant', content: response })
         │
         ▼
10. Retorna resposta ao cliente
    └── { responseMessage, conversationId }
```

### 8. Bedrock Service

#### Converse API (Default)
```typescript
const converseInput = {
  modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
  messages: [
    // System prompt (cacheable)
    { role: 'user', content: [{ text: systemPrompt, promptCacheCheckpoint: true }] },
    { role: 'assistant', content: [{ text: "I understand." }] },
    
    // Domain instructions (cacheable)
    { role: 'user', content: [{ text: domainTemplate, promptCacheCheckpoint: true }] },
    { role: 'assistant', content: [{ text: `I'll help with ${domain} query.` }] },
    
    // Conversation history (dynamic)
    ...historyMessages,
    
    // Current user message
    { role: 'user', content: [{ text: userMessage }] }
  ],
  inferenceConfig: { 
    maxTokens: 1000,
    temperature: 0.3 
  },
  promptCachingConfig: {
    promptCachingEnabled: true,
    cacheExpiryInSeconds: 7200  // 2 horas
  }
};
```

#### RAG (Disabled - Future)
```typescript
// Quando reativado, usará Knowledge Base
const ragInput = {
  input: { text: message },
  retrieveAndGenerateConfiguration: {
    type: 'KNOWLEDGE_BASE',
    knowledgeBaseConfiguration: {
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      modelArn: 'arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-3-haiku',
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: 5 }
      },
      generationConfiguration: {
        promptTemplate: { textPromptTemplate: domainAwareTemplate }
      }
    }
  }
};
```

### 9. Prompt Caching

O sistema implementa prompt caching para reduzir custos e latência:

```typescript
// Models que suportam caching
const cacheSupportedModels = [
  'anthropic.claude-3-haiku',
  'anthropic.claude-3-7-sonnet',
  'amazon.nova-micro',
  'amazon.nova-lite',
  'amazon.nova-pro'
];

// Checkpoints para caching
{
  role: 'user',
  content: [{
    type: 'text',
    text: systemPrompt,
    promptCacheCheckpoint: true  // Marca para cache
  }]
}
```

**Métricas de Cache:**
```typescript
interface CacheMetrics {
  domainHits: Record<string, number>;     // Hits por domínio
  domainMisses: Record<string, number>;   // Misses por domínio
  tokensReadFromCache: number;            // Tokens lidos do cache
  tokensSavedEstimate: number;            // Estimativa de tokens poupados
}
```

### 10. Histórico Otimizado

```typescript
// lib/conversationService.ts
export function getRelevantHistory(
  allMessages: BedrockMessage[], 
  currentQuery: string
): BedrockMessage[] {
  const currentDomain = identifyQueryDomain(currentQuery);
  
  return allMessages
    .filter(msg => {
      // Sempre incluir últimas 2 trocas (4 mensagens)
      const isRecent = allMessages.indexOf(msg) >= allMessages.length - 4;
      
      // Incluir mensagens do mesmo domínio
      const msgDomain = identifyQueryDomain(msg.content[0]?.text || '');
      const isDomainRelevant = msgDomain === currentDomain;
      
      return isRecent || isDomainRelevant;
    })
    .slice(-6);  // Máximo 6 mensagens para manter contexto gerível
}

// Conversation ID com domínio para melhor caching
export function createDomainAwareConversationId(
  baseId: string,
  userId: string,
  query: string
): string {
  const domain = identifyQueryDomain(query);
  const timestamp = Date.now();
  return `${baseId}-${domain.toLowerCase()}-${userId}-${timestamp}`;
}
```

### 11. Tratamento de Erros

```typescript
// Códigos de erro padronizados
function formatErrorMessage(errorCode: string, message: string): string {
  return `[${errorCode}] ${message}`;
}

// Erros específicos do Bedrock
switch (bedrockError.name) {
  case 'ThrottlingException':
    return formatErrorMessage('ERROR_THROTTLING', 
      "I'm handling many requests. Please try again in a few seconds.");
    
  case 'ServiceUnavailableException':
    return formatErrorMessage('ERROR_UNAVAILABLE', 
      "I'm temporarily unavailable. Please try again later.");
    
  case 'ValidationException':
    return formatErrorMessage('ERROR_VALIDATION', 
      "I'm having trouble understanding. Could you rephrase?");
    
  case 'TimeoutError':
    return formatErrorMessage('ERROR_TIMEOUT', 
      "I took too long. Please try a simpler question.");
    
  default:
    return formatErrorMessage('ERROR_GENERAL', 
      "I encountered an error. Please try again.");
}
```

### 12. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `AWS_REGION` | Região AWS (default: eu-west-1) |
| `BEDROCK_MODEL_ID` | ID do modelo Bedrock |
| `BAFATORIO_APP_CONVERSATION_HISTORY_TABLE_NAME` | Tabela de histórico |
| `BAFATORIO_APP_EVENT_TABLE_NAME` | Tabela de eventos (para consultas) |
| `BAFATORIO_APP_NOTE_TABLE_NAME` | Tabela de notas (para consultas) |

### 13. Permissões IAM

```typescript
// chatbot-resolver Lambda
{
  Effect: 'Allow',
  Action: [
    'bedrock:InvokeModel',
    'bedrock:InvokeModelWithResponseStream',
    'bedrock:Converse'
  ],
  Resource: 'arn:aws:bedrock:*::foundation-model/*'
},
{
  Effect: 'Allow',
  Action: [
    'dynamodb:PutItem',
    'dynamodb:Query',
    'dynamodb:GetItem'
  ],
  Resource: [
    conversationHistoryTable.tableArn,
    eventTable.tableArn,
    `${eventTable.tableArn}/index/*`
  ]
}
```

### 14. Capacidades do Assistente

| Capacidade | Descrição |
|------------|-----------|
| **Perguntas Gerais** | Informações sobre funcionalidades do Bafatorio |
| **Consulta de Eventos** | Detalhes de eventos do utilizador |
| **Consulta de Participantes** | Informações sobre participantes registados |
| **Orientação da Plataforma** | Guias de navegação e uso |
| **Suporte Multilíngue** | Responde na língua do utilizador (PT/EN/FR) |
| **Contexto Persistente** | Mantém histórico de conversa por 30 dias |

## Frontend Integration

```javascript
// Componentes React
src/Components/AkiliChat/
├── AkiliChatPage.jsx           # Página principal
├── AkiliChatInterface.jsx      # Interface de chat
├── AkiliSidebar.jsx            # Lista de conversas
├── AkiliMessageList.jsx        # Lista de mensagens
├── AkiliMessageItem.jsx        # Mensagem individual
└── AkiliInputArea.jsx          # Área de input

// Uso da mutation
const [invokeChatbot] = useMutation(INVOKE_CHATBOT);

const response = await invokeChatbot({
  variables: {
    message: userInput,
    conversationId: currentConversationId
  }
});
```

## Consequências

### Positivas
- ✅ **Custo-eficiente**: Claude 3.5 Haiku é rápido e económico
- ✅ **Prompt Caching**: Reduz custos em até 90% para prompts repetidos
- ✅ **Multilíngue**: Detecção automática de idioma
- ✅ **Domain-aware**: Respostas otimizadas por domínio
- ✅ **Histórico persistente**: Conversas mantidas por 30 dias com TTL
- ✅ **Seguro**: Cada utilizador só vê as suas conversas

### Negativas
- ⚠️ **RAG Desativado**: Knowledge Base não está em uso atualmente
- ⚠️ **Sem ações**: Akili apenas responde, não executa ações
- ⚠️ **Limites de contexto**: Máximo 6 mensagens de histórico
- ⚠️ **Latência**: Respostas podem demorar 1-3 segundos
- ⚠️ **Sem event-level access control**: A rota `/app/akili-chat` não usa `EventRouteGuard`. O `chatbot-resolver` Lambda não valida roles de evento (ADR-015). Actualmente o Akili é acessível a todos os utilizadores autenticados, independentemente do role no evento. Implementação futura deverá restringir consultas de dados de evento a utilizadores com `ai:use` permission.

## Roadmap Futuro

1. **Reativar RAG**: Integrar Knowledge Base para respostas mais precisas
2. **Ações**: Permitir criar eventos via linguagem natural
3. **Proactive**: Sugestões baseadas em padrões de uso
4. **Multi-modal**: Suporte para imagens e documentos

## Referências

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3.5 Haiku Model Card](https://www.anthropic.com/claude)
- [Prompt Caching Best Practices](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md) — Event-level permissions incluindo `ai:use`

---

**Autor**: Sistema de Documentação Bafatorio
**Última Atualização**: 2026-02-05

---

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2025-01-23 | Dev Team | Initial version documenting Akili chatbot architecture |
| 2026-02-05 | Dev Team | Adicionada nota sobre ausência de event-level access control (ADR-015) |
| 2026-03-20 | Ney Carvalho | Nota: chatbot migrado para api-bafatorio (ADR-026); Lambda chatbot-resolver e mutation InvokeChatbot removidos do AppSync |
