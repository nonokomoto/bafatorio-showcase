# ADR-016: Análise de Discrepâncias — Supplier API vs Event/Participant API

**Data:** 2026-02-10
**Status:** Superseded — migração concluída (4 fases implementadas)
**Contexto:** Análise comparativa dos padrões de obtenção de dados entre as APIs de Supplier, Event e Participant

> **Este ADR é histórico.** As 4 fases de migração foram implementadas. O estado actual está reflectido em [ADR-005](ADR-005-frontend-api-architecture.md) (supplierApi) e [ADR-012](ADR-012-graphql-relational-queries-architecture.md) (selection sets + cache).

---

## 1. Resumo Executivo

A `supplierApi.js` apresenta **5 discrepâncias críticas** em relação aos padrões já implementados em `eventApi.js` e `participantApi.js`. O supplier é a única entidade principal que não foi migrada para o padrão híbrido Data Client introduzido nas Fases 2 e 3 da arquitetura frontend.

---

## 2. Matriz de Discrepâncias

### 2.1 Padrão de Fetching

| Aspecto | Supplier (`supplierApi.js`) | Event (`eventApi.js`) | Participant (`participantApi.js`) |
|---------|----------------------------|----------------------|----------------------------------|
| **Client** | `generateClient()` de `@aws-amplify/api` (clássico) | Híbrido: clássico + `getClient()` de `amplifyClient.js` | Híbrido: clássico + `getClient()` de `amplifyClient.js` |
| **Queries** | Apenas GraphQL string (`queries.ts`) | GraphQL clássico + Data Client com `selectionSet` | GraphQL clássico + Data Client com `selectionSet` + Lambda |
| **Selection Sets** | Nenhum | `EVENT_MINIMAL`, `EVENT_WITH_PARTICIPANTS` | `PARTICIPANT_WITH_DEPENDENTS` |
| **queryFn** | Não usa | Usa em `listEventsMinimal`, `listEventsEnhanced`, `getSingleEventEnhanced` | Usa em `listParticipantsByEventEnhanced`, `getParticipantEnhanced` |
| **Paginação automática** | Não tem (depende de `nextToken` manual) | Data Client gerencia | Loop `do/while` em `queryFn` com `limit: 1000` |

### 2.2 Subscriptions (Real-time)

| Entidade | Tem Subscriptions? | Tipo | Operações |
|----------|-------------------|------|-----------|
| **Supplier** | **NÃO** | — | — |
| **Event** | SIM | `onCacheEntryAdded` com `client.graphql()` | `onCreate`, `onUpdate`, `onDelete` |
| **Participant** | SIM | `onCacheEntryAdded` + Data Client `.onCreate()/.onUpdate()/.onDelete()` | CRUD completo + versão Enhanced |

**Impacto**: Se outro utilizador editar/criar/apagar um supplier, a UI de outros utilizadores **não atualiza** até refresh manual.

### 2.3 Cache e Invalidação

**Supplier** — invalidação simples:
```javascript
// supplierApi.js:68
invalidatesTags: [{ type: 'Supplier', id: 'LIST' }]

// supplierApi.js:78
invalidatesTags: (result, error, { id }) => [{ type: 'Supplier', id }]

// supplierApi.js:88-92 — deleteSupplier
invalidatesTags: (result, error, id) => [
  { type: 'Supplier', id },
  { type: 'Supplier', id: 'LIST' },
  // Comentário: "Potentially invalidate EventSupplier LISTs if needed" (nunca implementado)
]
```

**Participant** — invalidação cruzada multi-tabela:
```javascript
// participantApi.js:153-158 — createParticipant
invalidatesTags: (result, error, participant) => [
  { type: 'Participant', id: 'LIST' },
  { type: 'Participant', id: `LIST_${participant.eventId}` },
  { type: 'Event', id: participant.eventId },     // ← Atualiza o evento
  { type: 'Event', id: 'LIST' }                   // ← Atualiza a lista de eventos
]

// participantApi.js:264-279 — deleteParticipants
// Invalida: Participant, Dependent (LIST_ALL, LIST_BY_PARTICIPANTS, individual), Event
```

**Discrepância**: Quando um supplier é criado/atualizado/apagado:
- O cache de `EventSupplier` **NÃO é invalidado** (há um TODO no código, linha 91)
- O cache de `Event` **NÃO é atualizado** (budget/committedExpenses podem ficar stale)
- Comparar com participant que invalida 4-6 tags diferentes

### 2.4 Acesso para Colaboradores (Lambda-backed)

| Entidade | Mutations Lambda? | Queries Lambda? | Motivo |
|----------|-------------------|-----------------|--------|
| **Supplier** | NÃO | Apenas `getSupplierForEvent` (leitura) | — |
| **Event** | NÃO (usa regras AppSync) | NÃO | Owner-based |
| **Participant** | SIM: `createParticipantAsCollaborator`, `updateParticipantAsCollaborator`, `confirmParticipant` | SIM: `listEventParticipantsQuery` | Colaboradores precisam CRUD sem ser owner |
| **EventSupplier** | SIM: `selectEventSupplier`, `approveSupplierSelection` | SIM: `listEventSuppliersQuery` | Workflow de aprovação + acesso colaborador |

**Discrepância**: O `supplierApi.js` não tem mutations Lambda para colaboradores. Se um `STAFF_LOGISTICS` tentar criar/editar um supplier global, vai funcionar (pois suppliers são globais). Mas se o modelo mudar para suppliers per-event, isto torna-se um bloqueio.

### 2.5 Estado Redux

| Entidade | Padrão | Ficheiro |
|----------|--------|---------|
| **Supplier** | Estado normalizado manual: `suppliersById` + `allSupplierIds` + `loading` + `error` + `extraReducers` com matchers | `supplierSlice.js` (127 linhas) |
| **Event** | Estado mínimo: `selectedEventId`, `selectedParticipantIds`, `participantFilters`, `notes` — dados no cache RTK Query | `eventSlice.js` (237 linhas) |
| **Participant** | Zero estado próprio — tudo no cache RTK Query | Sem slice dedicado |

**Discrepância**: O `supplierSlice.js` duplica funcionalidade que o RTK Query já fornece:
- `loading` → RTK Query fornece `isLoading`
- `error` → RTK Query fornece `isError`, `error`
- `suppliersById` / `allSupplierIds` → RTK Query cache já armazena os dados
- Os `extraReducers` sincronizam manualmente o que o cache já faz

---

## 3. Análise de Código Detalhada

### 3.1 Base Query Duplicada

O `supplierApi.js` define o seu próprio `amplifyBaseQuery` (linhas 11-26) com tratamento de erros ligeiramente diferente das outras APIs:

```javascript
// supplierApi.js — Mais verboso, com log de erros
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await client.graphql({ query: document, variables });
    if (response.errors) {                    // ← Verifica erros GraphQL no data
      console.error('GraphQL Errors:', response.errors);
      return { error: { status: 'GRAPHQL_ERROR', data: response.errors } };
    }
    return { data: response.data };
  } catch (error) {
    console.error('Network/Amplify Error:', error);
    return { error: { status: error.statusCode || 'FETCH_ERROR', data: error } };
  }
};

// eventApi.js & participantApi.js — Mais simples
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await client.graphql({ query: document, variables });
    return { data: response.data };           // ← NÃO verifica erros GraphQL
  } catch (error) {
    return { error: { status: error.statusCode, data: error } };
  }
};
```

**Nota**: O `eventSupplierApi.js` tem o tratamento de erros mais completo (linhas 14-40), com extração de `errorType`, `path`, `locations`.

### 3.2 Ausência de Selection Sets para Supplier

O `amplifyClient.js` (linhas 21-142) define selection sets para:
- `EVENT_WITH_PARTICIPANTS` ✅
- `EVENT_MINIMAL` ✅
- `PARTICIPANT_WITH_DEPENDENTS` ✅
- `DEPENDENT_BASIC` ✅
- `EVENT_SUPPLIER_WITH_RELATIONS` ✅
- `EVENT_SUPPLIER_BASIC` ✅
- **`SUPPLIER_*` — INEXISTENTE** ❌

### 3.3 Client Import Inconsistente

```javascript
// supplierApi.js — Usa APENAS o client clássico
import { generateClient } from '@aws-amplify/api';
const client = generateClient();

// eventApi.js — Usa AMBOS (híbrido)
import { generateClient } from '@aws-amplify/api';
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
const client = generateClient();

// participantApi.js — Usa AMBOS (híbrido)
import { generateClient } from '@aws-amplify/api';
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
```

---

## 4. Plano de Migração Proposto

### Fase 1: Selection Sets e Data Client (Prioridade Alta)

**Objetivo**: Alinhar `supplierApi.js` com o padrão híbrido Data Client.

#### 4.1.1 Adicionar Selection Sets ao `amplifyClient.js`

```javascript
// Novo selection set a adicionar
SUPPLIER_BASIC: [
  'id', 'name', 'category', 'contactName', 'contactEmail',
  'contactPhone', 'country', 'currency', 'address', 'vatNumber',
  'website', 'paymentDetails', 'estimateMinAmount', 'estimateMaxAmount',
  'estimateUnit', 'tags', 'notes', 'createdAt', 'updatedAt', 'owner'
],

SUPPLIER_MINIMAL: [
  'id', 'name', 'category', 'contactEmail', 'contactPhone',
  'currency', 'tags'
],
```

#### 4.1.2 Adicionar endpoints Data Client ao `supplierApi.js`

Novos endpoints a criar:
- `listSuppliersEnhanced` — Data Client com paginação automática (padrão do `listParticipantsByEventEnhanced`)
- `getSupplierEnhanced` — Data Client com `SUPPLIER_BASIC` selection set

#### 4.1.3 Importar Data Client

```javascript
// Adicionar ao supplierApi.js
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
```

---

### Fase 2: Corrigir Invalidação de Cache (Prioridade Alta)

**Objetivo**: Garantir que alterações em suppliers propagam para `EventSupplier` e `Event`.

#### 4.2.1 Atualizar `tagTypes`

```javascript
// De:
tagTypes: ['Supplier', 'EventSupplier'],

// Para:
tagTypes: ['Supplier', 'EventSupplier', 'Event'],
```

#### 4.2.2 Atualizar `invalidatesTags` em mutations

```javascript
// createSupplier
invalidatesTags: [
  { type: 'Supplier', id: 'LIST' },
  { type: 'EventSupplier', id: 'LIST' },  // NOVO
],

// updateSupplier
invalidatesTags: (result, error, { id }) => [
  { type: 'Supplier', id },
  { type: 'Supplier', id: 'LIST' },
  { type: 'EventSupplier', id: 'LIST' },  // NOVO
],

// deleteSupplier
invalidatesTags: (result, error, id) => [
  { type: 'Supplier', id },
  { type: 'Supplier', id: 'LIST' },
  { type: 'EventSupplier', id: 'LIST' },  // NOVO — implementar o TODO existente
  { type: 'Event', id: 'LIST' },          // NOVO — budgets podem ficar stale
],
```

---

### Fase 3: Simplificar Redux Slice (Prioridade Média)

**Objetivo**: Eliminar estado duplicado no `supplierSlice.js`, alinhando com o padrão de `eventSlice.js`.

#### 4.3.1 Reducer simplificado

```javascript
// De 127 linhas com normalização manual → ~30 linhas
const initialState = {
  selectedSupplierId: null,
};

const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    setSelectedSupplier: (state, action) => {
      state.selectedSupplierId = action.payload;
    },
  },
  // Sem extraReducers — dados vivem no cache RTK Query
});
```

#### 4.3.2 Migrar componentes

Componentes que usam:
- `selectAllSuppliers` → `useListSuppliersEnhancedQuery()` (dados do hook)
- `selectSuppliersLoading` → `isLoading` do hook RTK Query
- `selectSupplierError` → `isError` / `error` do hook RTK Query

---

### Fase 4: Adicionar Subscriptions (Prioridade Baixa)

**Objetivo**: Atualização real-time para suppliers, como event e participant já têm.

#### 4.4.1 Endpoint de subscription

```javascript
subscribeToSupplierChanges: builder.query({
  async queryFn() {
    return { data: { items: [] } };
  },
  async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
    const dataClient = getClient();
    await cacheDataLoaded;

    const createSub = dataClient.models.Supplier.onCreate().subscribe({
      next: ({ data }) => {
        updateCachedData(draft => {
          if (!draft?.items) draft.items = [];
          if (!draft.items.some(s => s.id === data.id)) {
            draft.items.unshift(data);
          }
        });
      }
    });

    const updateSub = dataClient.models.Supplier.onUpdate().subscribe({
      next: ({ data }) => {
        updateCachedData(draft => {
          if (!draft?.items) return;
          const idx = draft.items.findIndex(s => s.id === data.id);
          if (idx !== -1) draft.items[idx] = { ...draft.items[idx], ...data };
        });
      }
    });

    const deleteSub = dataClient.models.Supplier.onDelete().subscribe({
      next: ({ data }) => {
        updateCachedData(draft => {
          if (!draft?.items) return;
          draft.items = draft.items.filter(s => s.id !== data.id);
        });
      }
    });

    await cacheEntryRemoved;
    createSub.unsubscribe();
    updateSub.unsubscribe();
    deleteSub.unsubscribe();
  }
}),
```

**Nota**: Prioridade baixa porque suppliers são dados relativamente estáticos comparados com participants.

---

## 5. Impacto e Risco

| Mudança | Impacto | Risco | Componentes afetados |
|---------|---------|-------|---------------------|
| Selection Sets + Data Client | Médio | Baixo | `supplierApi.js`, `amplifyClient.js` |
| Corrigir Cache Invalidation | Alto | Baixo | `supplierApi.js` (apenas tags) |
| Simplificar Redux Slice | Alto | Médio | `supplierSlice.js`, todos os componentes que importam selectors |
| Adicionar Subscriptions | Baixo | Baixo | `supplierApi.js` (novo endpoint) |

---

## 6. Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/Api/amplifyClient.js` | Adicionar `SUPPLIER_BASIC`, `SUPPLIER_MINIMAL` |
| `src/Api/services/supplierApi.js` | Importar Data Client, adicionar endpoints enhanced, corrigir tags |
| `src/Redux/Suppliers/supplierSlice.js` | Simplificar: remover normalização manual |
| Componentes que usam `selectAllSuppliers` | Migrar para hooks RTK Query |

---

## 7. Referências

- `ADR-005-frontend-api-architecture.md` — Arquitetura geral das APIs frontend
- `ADR-012-graphql-relational-queries-architecture.md` — Padrão de queries relacionais
- `ADR-015-event-collaboration-access-control.md` — Sistema de colaboração e acesso
