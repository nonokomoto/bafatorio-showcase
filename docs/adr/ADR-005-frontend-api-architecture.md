# ADR-005: Frontend API Architecture (RTK Query + Amplify)

**Status:** Accepted
**Date:** 2026-01-23
**Authors:** Bafatorio Development Team

## Context

O Bafatorio utiliza uma arquitetura frontend baseada em React com Redux Toolkit para gestão de estado. A camada de API integra RTK Query com AWS Amplify GraphQL para comunicação com o backend serverless.

## Decision

### Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND API ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         REACT COMPONENTS                                  │  │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           │  │
│  │   │   Event   │  │Participant│  │ Supplier  │  │  Billing  │           │  │
│  │   │   Views   │  │   Views   │  │   Views   │  │   Views   │           │  │
│  │   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │  │
│  │         │              │              │              │                   │  │
│  │         ▼              ▼              ▼              ▼                   │  │
│  │   ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │   │              RTK QUERY HOOKS (Auto-generated)                   │   │  │
│  │   │  useGetEventsQuery   useListParticipantsQuery   etc.            │   │  │
│  │   └─────────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    RTK QUERY API SLICES (12 services)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │
│  │  │ eventApi │ │particip. │ │dependent │ │ supplier │ │eventSupp.│      │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │
│  │  │ collab.  │ │ folderApi│ │ roleApi  │ │ notion   │ │fidelize  │      │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │  │
│  │  ┌──────────┐ ┌──────────┐                                              │  │
│  │  │ akiliApi │ │ noteApi* │  * API direta, não RTK Query                 │  │
│  │  └──────────┘ └──────────┘                                              │  │
│  │                    │                                                     │  │
│  │                    ▼                                                     │  │
│  │   ┌─────────────────────────────────────────┐                           │  │
│  │   │        amplifyBaseQuery()                │                           │  │
│  │   │    Custom base query for Amplify         │                           │  │
│  │   └─────────────────────────────────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                      AMPLIFY GRAPHQL CLIENT                               │  │
│  │           generateClient() → client.graphql({ query, variables })         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         AWS AppSync (Backend)                             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Redux Store Configuration

### 1.1 State Tree

```
Redux State
├── user (persisted)           ← Auth state from userSlice
├── event (persisted)          ← Selected event & selections from eventSlice
├── supplier (persisted)       ← Supplier state from supplierSlice
├── subscription               ← Billing data from subscriptionSlice
├── toast                      ← Toast notifications from toastSlice
├── eventControls              ← Event UI controls
├── eventSupplier              ← Event-Supplier relationships
├── supplierControls           ← Supplier UI controls
├── eventApi                   ← RTK Query cache
├── participantApi             ← RTK Query cache
├── dependentApi               ← RTK Query cache
├── noteApi                    ← RTK Query cache (conditional)
├── supplierApi                ← RTK Query cache
├── eventSupplierApi           ← RTK Query cache
├── collaboratorApi            ← RTK Query cache
├── folderApi                  ← RTK Query cache
├── roleApi                    ← RTK Query cache
├── notionApi                  ← RTK Query cache
├── fidelizeApi                ← RTK Query cache
└── akiliApi                   ← RTK Query cache
```

### 1.2 Persistence Configuration

```javascript
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'event', 'supplier'],  // Only these are persisted
};
```

**Persisted:** `user` (auth state), `event` (selected event ID), `supplier` (offline access)
**Not Persisted:** RTK Query caches (re-fetched on load), `subscription`, UI control states

---

## 2. RTK Query API Services

### 2.1 Custom Base Query

Todas as APIs usam um `amplifyBaseQuery` comum:

```javascript
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await client.graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    return { error: { status: error.statusCode, data: error } };
  }
};
```

### 2.2 API Services Matrix

| Service | File | Tag Types | Endpoints (Q/M) | Propósito |
|---------|------|-----------|------------------|-----------|
| **eventApi** | `eventApi.js` | Event, Participant, Dependent | 3Q / 3M | CRUD eventos |
| **participantApi** | `participantApi.js` | Participant, Event, Dependent | 5Q / 6M | CRUD participantes, import, confirm |
| **dependentApi** | `dependentsApi.js` | Dependent, Participant, Event | 3Q / 3M | CRUD dependentes |
| **supplierApi** | `supplierApi.js` | Supplier, EventSupplier | 5Q / 5M | CRUD fornecedores, import |
| **eventSupplierApi** | `eventSupplierApi.js` | EventSupplier, Event, Supplier | 4Q / 6M | Associações, approval workflow |
| **collaboratorApi** | `collaboratorApi.js` | Collaborator, Invitation | 4Q / 7M | Equipa, convites, permissões |
| **folderApi** | `folderApi.js` | DocumentFolder | 1Q / 3M | CRUD pastas de documentos |
| **roleApi** | `roleApi.js` | Role | 1Q / 2M | Roles por evento |
| **notionApi** | `notionApi.js` | NotionConnection, NotionPages | 2Q / 2M | Notion OAuth + import |
| **fidelizeApi** | `fidelizeApi.js` | FidelizeIntegration | 0Q / 2M | API key + sync |
| **akiliApi** | `akiliApi.js` | Conversation, ConversationMessage | 2Q / 2M | AI chatbot |
| **noteApi** | `noteApi.js` | - | API direta | CRUD notas + subscriptions real-time |

### 2.3 Padrão noteApi (Excepção)

O `noteApi` usa API direta (não RTK Query) porque precisa de GraphQL Subscriptions para real-time:

```javascript
export const noteApi = {
  createNote: async (noteData) => { ... },
  listNotesByEventId: async (eventId, ownerId) => { ... },
  // Subscriptions (owner param para server-side filtering via rules.owner())
  subscribeToNoteCreation: (eventId, owner, callback) => { ... },
  subscribeToNoteUpdates: (eventId, owner, callback) => { ... },
  subscribeToNoteDeletions: (eventId, owner, callback) => { ... },
};
```

---

## 3. API Patterns

### 3.1 Contrato de Erros (Backend → Frontend)

O backend deve devolver **códigos machine-readable + metadata**, não mensagens textuais:

```json
// ✅ Recomendado
{
  "success": false,
  "reason": "ALL_DUPLICATES",
  "supplierCount": 0,
  "duplicateCount": 3,
  "validationErrorCount": 0
}

// ❌ Evitar
{
  "success": false,
  "message": "No valid suppliers found to import."
}
```

O frontend mapeia `reason` para texto traduzido via `i18next`. `message` pode existir como fallback para logging.

### 3.2 Bulk Import Pattern

1. Frontend envia ficheiro para endpoint de normalização (api-bafatorio)
2. API devolve dados normalizados + summary de preview
3. AppSync/Lambda recebe **JSON normalizado**, não o ficheiro bruto
4. Lambda aplica access check, deduplicação e escrita em DynamoDB
5. Frontend faz mapping de `reason` + metadata para UX/i18n

Quando normalização não estiver disponível, fallback para fluxo legado de ficheiro bruto.

### 3.3 Cache Invalidation Rules

- **Tag-based invalidation**: cada mutation declara `invalidatesTags`
- **Bulk imports**: invalidar tags apenas quando `success === true`
- **Cross-API invalidation**: criar participante invalida `Participant:LIST` e `Event:{eventId}`
- **Nunca usar** `refetchOnFocus: true` (causa cascading re-renders)

### 3.4 Pagination Pattern

```javascript
// Auto-pagination para listas completas (ex: participantes de evento)
listParticipantsByEvent: builder.query({
  async queryFn(args, api, extraOptions, baseQuery) {
    let allItems = [];
    let nextToken = null;
    do {
      const result = await baseQuery({
        document: queries.listParticipants,
        variables: { filter: { eventId: { eq: eventId } }, limit: 1000, nextToken },
      });
      allItems = [...allItems, ...result.data.listParticipants.items];
      nextToken = result.data.listParticipants.nextToken;
    } while (nextToken);
    return { data: { items: allItems, totalCount: allItems.length } };
  }
})
```

### 3.5 EventSupplier Workflow State Machine

```
          ┌──────────┐
          │ PENDING  │
          └────┬─────┘
               │ processSupplierApproval
               ▼
          ┌──────────┐
     ┌────│ APPROVED │────┐
     │    └──────────┘    │
     │ revertApproval     │ processSupplierPayment
     │                    │
     ▼                    ▼
┌──────────┐         ┌──────────┐
│ PENDING  │         │   PAID   │
└──────────┘         └──────────┘

          ┌──────────┐
          │ REJECTED │  (via revertApproval)
          └──────────┘
```

---

## 4. Redux Slices

### 4.1 User Slice (`userSlice.js`)

State: `{ user, groups, identityId, isSignedIn, loading, error }`
Thunks: `fetchCurrentUser`, `userSignIn`, `userSignUp`, `userSignOut`, `userResetPassword`, `userConfirmResetPassword`

### 4.2 Event Slice (`eventSlice.js`)

State: `{ selectedEventId, selectedParticipantIds, participantFilters, selectedDependentIds, initialDataLoaded, notes, notesByEvent }`
Persisted. Gere seleções de UI e filtros.

### 4.3 Subscription Slice (`subscriptionSlice.js`)

State: `{ plan, payment, invoices, loadingStatus, lastFetchTime, cacheTimeout: 300000 }`
Thunk: `fetchSubscriptionData()` (fetches plan + payment + invoices via Amplify GraphQL direto, não RTK Query)

### 4.4 Supplier Slice (`supplierSlice.js`)

State normalizado: `{ suppliersById, allSupplierIds, selectedSupplierId, loading, error }`
Auto-sync com RTK Query via `extraReducers` (matchers para `listSuppliers`, `createSupplier`, `updateSupplier`, `deleteSupplier`).

---

## 5. Error Handling

### 5.1 Revoked Token Detection

```javascript
const REVOKED_TOKEN_ERRORS = [
  'Access Token has been revoked',
  'NotAuthorizedException',
  'Invalid access token',
  'Token expired'
];
```

Auto-cleanup: `signOut({ global: true })` → `localStorage.clear()` → `resetStoreAndPersistor()` → redirect `/signin`

### 5.2 Store Reset

```javascript
export const RESET_STORE = 'RESET_STORE';
// Root reducer handles: if action.type === RESET_STORE → state = undefined
```

---

## 6. Integration with Collaboration (ADR-015)

O `getEventAsCollaborator` é a query central consumida pelo hook `useEventRole`:

```javascript
// src/Hook/useEventRole.js
const { data } = useGetEventAsCollaboratorQuery({ eventId });
// Returns: { event, userRole, sharedFolderIds }
```

Consumido por `EventRoleGuard`, `EventRouteGuard`, e componentes para decisões de permissão.

---

## Consequences

### Positivas
1. **Automatic Caching**: RTK Query gere cache automaticamente
2. **12 API services** bem separados por domínio
3. **Normalized State**: Suppliers em formato normalizado
4. **Persistence**: Estado user/event/supplier sobrevive refresh
5. **Real-time**: noteApi com GraphQL Subscriptions

### Negativas
1. **Complexidade**: 12 APIs + 4 slices + Amplify client
2. **noteApi inconsistente**: API direta (necessária para subscriptions)
3. **Cross-API invalidation**: Pode ser complexo de rastrear
4. **Bundle Size**: RTK Query + Redux Persist

---

## Related ADRs

- [ADR-004: Amplify Backend Complete Architecture](ADR-004-amplify-backend-complete-architecture.md)
- [ADR-002: GraphQL File Management](ADR-002-graphql-file-management.md)
- [ADR-012: GraphQL Relational Queries & Cache Architecture](ADR-012-graphql-relational-queries-architecture.md)
- [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md)

---

## File References

| File | Purpose |
|------|---------|
| `src/Api/store.js` | Redux store configuration |
| `src/Api/services/eventApi.js` | Event API service |
| `src/Api/services/participantApi.js` | Participant API service |
| `src/Api/services/dependentsApi.js` | Dependent API service |
| `src/Api/services/supplierApi.js` | Supplier API service |
| `src/Api/services/eventSupplierApi.js` | Event-Supplier API service |
| `src/Api/services/collaboratorApi.js` | Collaboration API (RTK Query) |
| `src/Api/services/folderApi.js` | Document folder API |
| `src/Api/services/roleApi.js` | Event roles API |
| `src/Api/services/notionApi.js` | Notion integration API |
| `src/Api/services/fidelizeApi.js` | Fidelize integration API |
| `src/Api/services/akiliApi.js` | AI Chatbot API service |
| `src/Api/services/noteApi.js` | Notes API (direct, not RTK) |
| `src/Api/services/participantSelectors.js` | Participant RTK Query selectors |
| `src/Api/services/dependentSelector.js` | Dependent RTK Query selectors |
| `src/Hook/useEventRole.js` | Event-level role & permission hook |
| `src/Redux/Auth/userSlice.js` | Authentication slice |
| `src/Redux/Event/eventSlice.js` | Event state slice |
| `src/Redux/Subscription/subscriptionSlice.js` | Billing slice |
| `src/Redux/Suppliers/supplierSlice.js` | Supplier slice |
| `src/Redux/UI/toastSlice.js` | Toast notification slice |

---

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2026-01-23 | Dev Team | Initial version documenting frontend API architecture |
| 2026-01-24 | Dev Team | Added reference to ADR-012 (relational queries architecture) |
| 2026-02-05 | Dev Team | Adicionado collaboratorApi, useEventRole hook, EventRoleGuard, noteApi owner params |
| 2026-03-20 | Ney Carvalho | Refactor: simplificado para reduzir manutenção — removidos endpoints detalhados por API (fonte verdade é o código); adicionados folderApi, roleApi, notionApi, fidelizeApi; atualizada state tree (12 API caches + toast); corrigida numeração de secções; adicionados selector files e toastSlice às referências |
