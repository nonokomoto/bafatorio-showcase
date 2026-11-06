# ADR-002: Gestão de Ficheiros GraphQL no Amplify Gen 2

**Status:** Aceite  
**Data:** 2026-01-23  
**Autor:** Ney Carvalho  
**Decisores:** Ney Carvalho

---

## Contexto

Durante o desenvolvimento inicial do Bafatorio, os ficheiros GraphQL na pasta `Graphql/` foram editados manualmente para:
1. Adicionar campos que pareciam estar em falta (ex: `status`, `attendedDate`, `language`)
2. Remover campos de relacionamento para reduzir payload (ex: `event { ... }`, `supplier { ... }`)
3. Reordenar campos por ordem lógica em vez de alfabética

Esta prática criou um problema: **cada alteração no schema (`amplify/data/resource.ts`) exigia edição manual dos 4 ficheiros GraphQL**, sob risco de perder as personalizações quando o Amplify regenerasse os ficheiros.

### Ficheiros Afetados

| Ficheiro | Linhas | Propósito |
|----------|--------|-----------|
| `Graphql/API.ts` | ~11,400 | Tipos TypeScript |
| `Graphql/mutations.ts` | ~4,000 | Mutations GraphQL |
| `Graphql/queries.ts` | ~2,250 | Queries GraphQL |
| `Graphql/subscriptions.ts` | ~2,400 | Subscriptions GraphQL |

---

## Decisão

### Usar Ficheiros Gerados Automaticamente (Sem Edição Manual)

Após análise em 2026-01-23, verificou-se que:

1. **Todos os campos necessários já existem nos ficheiros gerados** - O schema `resource.ts` está correto
2. **A ordem alfabética não afeta funcionalidade** - Apenas estética
3. **Os campos nested adicionais melhoram o cache** - Mais dados disponíveis após mutations

**Decisão:** Aceitar os ficheiros gerados automaticamente e nunca editar manualmente.

---

## Workflow Adoptado

### Após Alterações no Schema

```bash
# 1. Editar o schema
vim amplify/data/resource.ts

# 2. Aplicar alterações (sandbox deve estar a correr)
# O sandbox detecta automaticamente e faz deploy

# 3. Regenerar código cliente GraphQL
npx ampx generate graphql-client-code \
  --stack amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2 \
  --out Graphql/ \
  --format graphql-codegen \
  --statement-target typescript \
  --type-target typescript

# 4. Commit dos ficheiros regenerados
git add Graphql/
git commit -m "chore: sync GraphQL with schema changes"
```

### Verificar Stack Atual

```bash
# Para sandbox MacBook (Ney)
--stack amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2

# Para sandbox DevAlex
--stack amplify-bafatorioapp-devsandbox-sandbox-40cf9a2805

# Para produção (branch main)
--stack amplify-dEXAMPLEAPPID-main-branch-80b14afd35
```

---

## Estrutura dos Ficheiros GraphQL

### API.ts (Tipos)

```typescript
// Tipos de modelos
export type Event = { ... }
export type Participant = { ... }
export type Dependent = { ... }

// Enums
export enum DependentStatus { REGISTERED, ATTENDED, NOT_ATTENDED }
export enum EmailLogLanguage { pt, en, fr }

// Input types para mutations
export type CreateEventInput = { ... }
export type UpdateEventInput = { ... }

// Filter types para queries
export type ModelEventFilterInput = { ... }
```

### queries.ts (Queries)

```typescript
// Get single item
export const getEvent = /* GraphQL */ `query GetEvent($id: ID!) { ... }`
export const getParticipant = /* GraphQL */ `query GetParticipant($id: ID!) { ... }`

// List items
export const listEvents = /* GraphQL */ `query ListEvents($filter: ...) { ... }`
export const listParticipants = /* GraphQL */ `query ListParticipants($filter: ...) { ... }`

// Secondary indexes
export const listUserSubscriptionByStripeCustomerId = /* GraphQL */ `...`
```

### mutations.ts (Mutations)

```typescript
// CRUD operations (geradas automaticamente)
export const createEvent = /* GraphQL */ `mutation CreateEvent(...) { ... }`
export const updateEvent = /* GraphQL */ `mutation UpdateEvent(...) { ... }`
export const deleteEvent = /* GraphQL */ `mutation DeleteEvent(...) { ... }`

// Custom mutations (definidas em resource.ts com Lambda handlers)
export const InvokeChatbot = /* GraphQL */ `mutation InvokeChatbot(...) { ... }`
export const sendEmail = /* GraphQL */ `mutation sendEmail(...) { ... }`
export const uploadParticipants = /* GraphQL */ `mutation uploadParticipants(...) { ... }`
```

### subscriptions.ts (Real-time)

```typescript
export const onCreateEvent = /* GraphQL */ `subscription OnCreateEvent(...) { ... }`
export const onUpdateEvent = /* GraphQL */ `subscription OnUpdateEvent(...) { ... }`
export const onDeleteEvent = /* GraphQL */ `subscription OnDeleteEvent(...) { ... }`
```

---

## Diferenças: Manual vs. Gerado

### O Que Mudou na Regeneração

| Aspecto | Ficheiros Manuais | Ficheiros Gerados |
|---------|-------------------|-------------------|
| Ordem dos campos | Lógica/manual | Alfabética |
| Campos nested | Removidos (otimização) | Incluídos (completo) |
| Novas queries | Não existiam | Adicionadas automaticamente |
| Tipos | Alguns inline | Todos em API.ts |

### Campos Que Já Existiam (Não Eram "Adições")

| Campo | Model | Conclusão |
|-------|-------|-----------|
| `status` | Dependent | ✅ Já estava no schema, já era gerado |
| `attendedDate` | Dependent | ✅ Já estava no schema, já era gerado |
| `language` | EmailLog | ✅ Já estava no schema, já era gerado |

**Lição:** Os campos sempre estiveram nos ficheiros gerados. A edição manual foi desnecessária.

---

## Como Usar nos Services RTK Query

### Import Correto

```javascript
// src/Api/services/eventApi.js
import * as queries from '../../../Graphql/queries';
import * as mutations from '../../../Graphql/mutations';
import * as subscriptions from '../../../Graphql/subscriptions';

// Uso
const result = await client.graphql({
  query: queries.getEvent,
  variables: { id: eventId }
});
```

### Campos Nested (Vantagem dos Gerados)

```javascript
// Com ficheiros gerados, a mutation retorna dados completos
const { data } = await client.graphql({
  query: mutations.createEventSupplier,
  variables: { input: newEventSupplier }
});

// data.createEventSupplier agora inclui:
// - event { budget, eventTitle, ... } ← Disponível para cache!
// - supplier { name, category, ... } ← Disponível para cache!
```

---

## Consequências

### Positivas

1. **Zero manutenção** - Sem necessidade de editar ficheiros após alterações
2. **Type safety** - Tipos sempre sincronizados com backend
3. **Mais dados no cache** - Campos nested disponíveis automaticamente
4. **Novas features automáticas** - Secondary indexes geram queries automaticamente
5. **Menos bugs** - Sem risco de dessincronização manual

### Negativas

1. **Payload maior** - Mutations retornam mais dados (mitigado por cache)
2. **Ficheiros maiores** - Mais linhas de código gerado

### Riscos Mitigados

1. ~~Schema drift~~ - Eliminado com regeneração automática
2. ~~Campos em falta~~ - Todos os campos do schema são incluídos
3. ~~Edições perdidas~~ - Não há edições para perder

---

## Políticas

### NUNCA Fazer

```diff
- Editar ficheiros em Graphql/ manualmente
- Remover campos dos ficheiros gerados
- Adicionar queries/mutations custom directamente nos ficheiros
```

### SEMPRE Fazer

```diff
+ Definir custom mutations em amplify/data/resource.ts
+ Regenerar após alterações no schema
+ Commitar ficheiros Graphql/ após regeneração
```

### Se Precisar de Query Personalizada

Opção 1: **Definir inline no service** (preferido para casos simples)
```javascript
const customQuery = /* GraphQL */ `
  query GetEventBasic($id: ID!) {
    getEvent(id: $id) {
      id
      eventTitle
      eventDate
    }
  }
`;
```

Opção 2: **Criar ficheiro separado** (para queries complexas reutilizáveis)
```
src/graphql/custom/
  eventQueries.js
  participantQueries.js
```

---

## Referências

- [Amplify Gen 2 - Data Modeling](https://docs.amplify.aws/gen2/build-a-backend/data/data-modeling/)
- [Amplify Gen 2 - Generate Client Code](https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/)
- [docs/AMPLIFY_GRAPHQL_SYNC_REPORT.md](../AMPLIFY_GRAPHQL_SYNC_REPORT.md) - Relatório detalhado da análise

---

## Histórico

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-01-23 | Criação inicial - decisão de usar ficheiros gerados | Ney Carvalho |
| 2026-03-20 | Atualizado contagem de linhas (~10k → ~20k), removida sandbox neyca (eliminada) | Ney Carvalho |
