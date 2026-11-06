# ADR-012: GraphQL Relational Queries & Cache Architecture

**Status:** Implemented  
**Data:** 2026-01-24 · **Atualizado:** 2026-06-15 (adenda §3.1 — optimistic updates)  
**Autor:** Bafatorio Development Team  
**Substitui:** ADR-012 (Cache Optimization - Proposto), ADR-013 (API Refactoring Plan - Executado)

---

## Contexto

A aplicação Bafatorio evoluiu de uma arquitetura de queries GraphQL separadas para uma arquitetura otimizada que aproveita relações GraphQL nativas do Amplify Gen 2 Data Client.

### Problema Anterior

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA ANTERIOR (Ineficiente)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Lista de Eventos                                                   │
│  └── Query 1: listEvents                                            │
│                                                                     │
│  Detalhes do Evento                                                 │
│  └── Query 2: getEvent                                              │
│      └── Query 3: listParticipants (filter: eventId)                │
│          └── Query 4: listDependents (filter: participantIds)       │
│                                                                     │
│  Total: 4+ queries para carregar dados de um evento                 │
│  Problema: forceRefetch: true ignorava cache válido                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Decisão

### Arquitetura de Queries Relacionais

Implementar queries que aproveitam as relações hasMany/belongsTo definidas no schema Amplify, reduzindo múltiplas queries para uma única query com nested data.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA ATUAL (Otimizada)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DATA CLIENT QUERIES                       │   │
│  │                                                              │   │
│  │  Event.list({ selectionSet: EVENT_WITH_PARTICIPANTS })       │   │
│  │  └── Retorna eventos COM participantes (1 query!)            │   │
│  │                                                              │   │
│  │  Event.get({ selectionSet: [                                 │   │
│  │      'participants.dependents.*'                             │   │
│  │  ]})                                                         │   │
│  │  └── Retorna evento + participantes + dependentes (1 query!) │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Total: 1 query para carregar dados completos                       │
│  Benefício: Cache gerido pelo RTK Query com invalidateTags          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementação

### 1. Amplify Client Centralizado

**Ficheiro:** `src/Api/amplifyClient.js`

```javascript
import { generateClient } from 'aws-amplify/data';

// Cliente singleton para evitar múltiplas instâncias
let client = null;

export const getClient = () => {
  if (!client) {
    client = generateClient();
  }
  return client;
};

// Selection sets para queries com relações
export const SELECTION_SETS = {
  EVENT_WITH_PARTICIPANTS: [
    'id', 'eventTitle', 'eventStatus', 'eventDate', 'participantCount',
    'participants.id', 'participants.participantName', 
    'participants.participantEmail', 'participants.participantStatus',
    'participants.dependentsCount'
  ],
  
  PARTICIPANT_WITH_DEPENDENTS: [
    'id', 'participantName', 'participantEmail', 'dependentsCount',
    'dependents.id', 'dependents.name', 'dependents.age', 'dependents.status'
  ],
  
  EVENT_MINIMAL: [
    'id', 'eventTitle', 'eventStatus', 'eventDate', 'participantCount'
  ]
};
```

### 2. Queries Enhanced nas APIs

#### EventApi - Queries Relacionais

```javascript
// src/Api/services/eventApi.js

// Lista eventos COM participantes em 1 query
listEventsEnhanced: builder.query({
  async queryFn() {
    const dataClient = getClient();
    const { data: events } = await dataClient.models.Event.list({
      selectionSet: SELECTION_SETS.EVENT_WITH_PARTICIPANTS
    });
    return { data: { items: events } };
  },
  providesTags: (result) => [
    { type: 'Event', id: 'LIST' },
    ...(result?.items?.map(e => ({ type: 'Event', id: e.id })) || [])
  ],
}),

// Evento individual COM participantes
getSingleEventEnhanced: builder.query({
  async queryFn({ id }) {
    const dataClient = getClient();
    const { data: event } = await dataClient.models.Event.get(
      { id },
      { selectionSet: SELECTION_SETS.EVENT_WITH_PARTICIPANTS }
    );
    return { data: event };
  },
  providesTags: (result, error, { id }) => [
    { type: 'Event', id },
    { type: 'Participant', id: `LIST_${id}` },
  ],
}),
```

#### ParticipantApi - Queries via Relações

```javascript
// src/Api/services/participantApi.js

// Busca participantes através da relação Event → Participants
listParticipantsByEventEnhanced: builder.query({
  async queryFn({ eventId }) {
    const dataClient = getClient();
    const { data: event } = await dataClient.models.Event.get(
      { id: eventId },
      { selectionSet: SELECTION_SETS.EVENT_WITH_PARTICIPANTS }
    );
    return { 
      data: { 
        items: event?.participants || [],
        totalCount: event?.participants?.length || 0
      } 
    };
  },
  providesTags: (result, error, { eventId }) => [
    { type: 'Participant', id: `LIST_${eventId}` }
  ],
}),
```

#### DependentsApi - Queries Nested (3 níveis)

```javascript
// src/Api/services/dependentsApi.js

// Busca TODOS dependentes de um evento numa só query (Event → Participants → Dependents)
listDependentsByEventEnhanced: builder.query({
  async queryFn({ eventId }) {
    const dataClient = getClient();
    const { data: event } = await dataClient.models.Event.get(
      { id: eventId },
      { 
        selectionSet: [
          'id',
          'participants.id', 'participants.participantName',
          'participants.dependents.id', 'participants.dependents.name',
          'participants.dependents.age', 'participants.dependents.status'
        ] 
      }
    );
    
    // Flatten dependentes de todos os participantes
    const allDependents = [];
    event?.participants?.forEach(p => {
      p.dependents?.forEach(d => allDependents.push(d));
    });
    
    return { data: { items: allDependents } };
  },
  providesTags: (result, error, { eventId }) => [
    { type: 'Dependent', id: `LIST_EVENT_${eventId}` }
  ],
}),
```

---

### 3. Cache Management com invalidateTags

#### Padrão Anterior (Problemático)

```javascript
// ❌ EVITAR - forceRefetch ignora cache válido
async onQueryStarted(data, { dispatch, queryFulfilled }) {
  await queryFulfilled;
  dispatch(
    api.endpoints.listData.initiate({}, { forceRefetch: true })
  );
}
```

#### Padrão Base (invalidateTags)

```javascript
// ✅ invalidateTags permite ao RTK Query decidir quando refazer a query.
// Usar quando a resposta da mutation traz dados que NÃO consegues prever
// (IDs gerados, campos calculados no servidor).
async onQueryStarted(data, { dispatch, queryFulfilled }) {
  await queryFulfilled;
  dispatch(
    api.util.invalidateTags([
      { type: 'Participant', id: `LIST_${data.eventId}` }
    ])
  );
}
```

---

### 3.1 Optimistic Updates (onQueryStarted + updateQueryData)

**Adenda 2026-06-15.** Para fluxos sensíveis à latência percebida (check-in, toggles)
onde o estado final é conhecido no cliente, a mutation patcha o cache **diretamente** em
vez de esperar pelo refetch. O cache RTK Query é a **fonte única de verdade** — os
componentes leem `data?.items`, **sem** cópias locais em `useState`.

```javascript
onQueryStarted({ eventId, participantId, dependentUpdates }, { dispatch, queryFulfilled }) {
  // 1. Patch otimista — a UI muda já (Immer: muta-se o draft à vontade)
  const patch = dispatch(
    participantApi.util.updateQueryData('listParticipantsByEventLambda', { eventId }, (draft) => {
      if (!draft?.items) return;
      const p = draft.items.find(i => i.id === participantId);
      if (p) p.participantStatus = 'ATTENDED';
      // dependentes aninhados: percorrer items e patchar por id
    })
  );

  // 2. Reconciliar com o servidor
  queryFulfilled
    .then(({ data }) => {
      if (!data?.success) { patch.undo(); return; }            // falha "soft" (sem throw)
      if (requested > 0 && data.updatedCount !== requested)    // sucesso parcial em lote
        dispatch(participantApi.util.invalidateTags([{ type: 'Participant', id: `LIST_${eventId}` }]));
    })
    .catch(() => patch.undo());                                // rejeição "hard"
}
```

#### Regras (todas custaram bugs reais)

1. **Não invalidar a lista que patchas.** Com patch otimista, invalidar `LIST_${eventId}` força
   um refetch que pode chegar eventualmente-consistente (DynamoDB/AppSync) e reverter o otimismo
   → flicker. Invalida só tags de **outras** queries (detalhe individual, contador do evento).
2. **Rollback em falha "soft".** Se o handler/Lambda devolve `{ success: false }` sem `throw`,
   `queryFulfilled` **resolve** — o `.catch` não corre. Verifica `data.success` no `.then` e faz `undo()`.
3. **Reconciliar em sucesso parcial.** Se o backend atualiza N itens num loop e ignora falhas
   individuais (devolve `success: true` com `count` menor), o patch over-marcou — refaz a lista
   só quando `count !== pedido`.
4. **Subscriptions: cuidado com o shape.** O payload de uma subscription gerada traz relações
   como connection objects (`{ nextToken, __typename }`), não o array da query. Faz `delete` dos
   campos relacionais antes de fundir no cache (`Object.assign`/spread corrompem em silêncio).

#### Quando usar cada padrão

| | invalidateTags (base) | updateQueryData (otimista) |
|---|---|---|
| Feedback | após resposta do servidor | instantâneo |
| Usar quando | resposta traz dados imprevisíveis | estado final conhecido no cliente |
| Exemplos | create com ID gerado | check-in, toggle de estado |
| Mutations no código | maioria | `createParticipant`, `confirmPresence`, bulk status |

---

### 4. Hooks Customizados

#### useEventData

```javascript
// src/Components/Event/useEventData.js
export const useEventData = (options = { eventId: null, skipList: false }) => {
  const dispatch = useDispatch();

  const { data: eventsData, isLoading, error } = useListEventsEnhancedQuery(
    undefined,
    { skip: options.skipList, refetchOnMountOrArgChange: true }
  );

  const { data: singleEventData } = useGetSingleEventEnhancedQuery(
    { id: options.eventId }, 
    { skip: !options.eventId }
  );

  const refetch = useCallback(() => {
    dispatch(eventApi.util.invalidateTags([
      { type: 'Event', id: 'LIST' },
      ...(options.eventId ? [{ type: 'Event', id: options.eventId }] : [])
    ]));
  }, [dispatch, options.eventId]);

  return {
    allEvents: eventsData?.items || [],
    eventDetails: singleEventData,
    isLoading,
    error,
    refetch
  };
};
```

#### useParticipantData

```javascript
// src/Components/Participant/ParticipantTable/hooks/useParticipantData.js
export const useParticipantData = () => {
  const dispatch = useDispatch();
  const selectedEventId = useSelector(selectSelectedEventId);

  const { data, isLoading, error } = useListParticipantsByEventEnhancedQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  const refetch = useCallback(() => {
    if (selectedEventId) {
      dispatch(participantApi.util.invalidateTags([
        { type: 'Participant', id: `LIST_${selectedEventId}` }
      ]));
    }
  }, [dispatch, selectedEventId]);

  return {
    participantsByEvent: data?.items || [],
    participantsByEventCount: data?.items?.length || 0,
    isLoading,
    error,
    refetch
  };
};
```

#### useDependentData

```javascript
// src/Components/Participant/ParticipantTable/hooks/useDependentData.js
export const useDependentData = () => {
  const selectedEventId = useSelector(state => state.event.selectedEventId);

  // Uma única query busca Event → Participants → Dependents
  const { data, isLoading, error } = useListDependentsByEventEnhancedQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  return {
    dependents: data?.items || [],
    isLoading,
    error,
  };
};
```

---

## Benefícios

### Performance

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Queries para listar eventos | 1 + N | **1** | ⬇️ N queries |
| Queries para detalhes de evento | 1 + 1 + 1 | **1** | ⬇️ 67% |
| Queries para dependentes | 2 + filter | **1** | ⬇️ 50%+ |
| forceRefetch occurrences | 15+ | **0** (nas APIs) | ✅ Cache respeitado |

### Developer Experience

- **Código mais simples**: Hooks retornam dados já estruturados
- **Cache inteligente**: RTK Query gere invalidação automaticamente
- **Debugging facilitado**: Logs com performance timing
- **Type safety**: SelectionSets garantem campos consistentes

### Custos AWS

- **Menos operações DynamoDB**: Queries relacionais são resolvidas pelo AppSync
- **Menos invocações Lambda**: Menos resolvers executados
- **Menor latência**: Menos round-trips network

---

## Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW ARCHITECTURE                              │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
│  │  Component   │───►│  Custom Hook │───►│  RTK Query   │                     │
│  │  (UI Layer)  │    │ (useEventData│    │   Hook       │                     │
│  └──────────────┘    │  etc.)       │    │ (generated)  │                     │
│                      └──────────────┘    └──────┬───────┘                     │
│                                                  │                             │
│                                                  ▼                             │
│                      ┌─────────────────────────────────────────┐              │
│                      │           RTK Query Cache               │              │
│                      │  ┌─────────────────────────────────┐   │              │
│                      │  │  Tags: Event, Participant, etc. │   │              │
│                      │  │  keepUnusedDataFor: varies      │   │              │
│                      │  └─────────────────────────────────┘   │              │
│                      └──────────────────┬──────────────────────┘              │
│                                         │                                      │
│                           Cache Miss    │   Cache Hit                          │
│                              │          │      │                               │
│                              ▼          │      │                               │
│                      ┌──────────────┐   │      │                               │
│                      │  Data Client │   │      │                               │
│                      │  (Amplify)   │◄──┘      │                               │
│                      └──────┬───────┘          │                               │
│                             │                  │                               │
│                             ▼                  │                               │
│                      ┌──────────────┐          │                               │
│                      │   AppSync    │          │                               │
│                      │   GraphQL    │          │                               │
│                      └──────┬───────┘          │                               │
│                             │                  │                               │
│                             ▼                  │                               │
│                      ┌──────────────┐          │                               │
│                      │   DynamoDB   │          │                               │
│                      └──────────────┘          │                               │
│                                                │                               │
│                              ┌─────────────────┘                               │
│                              ▼                                                 │
│                      ┌──────────────┐                                          │
│                      │  Component   │                                          │
│                      │  Re-render   │                                          │
│                      └──────────────┘                                          │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tag Strategy

### Tags por Entidade

| Entidade | Tag Pattern | Invalidado por |
|----------|-------------|----------------|
| Event List | `{ type: 'Event', id: 'LIST' }` | Create, Delete event |
| Single Event | `{ type: 'Event', id: eventId }` | Update event |
| Participants | `{ type: 'Participant', id: 'LIST_eventId' }` | CRUD participants |
| Dependents | `{ type: 'Dependent', id: 'LIST_EVENT_eventId' }` | CRUD dependents |

### Mutation → Invalidation Mapping

```javascript
// Criar participante invalida lista de participantes E contador do evento
invalidatesTags: (result, error, { eventId }) => [
  { type: 'Participant', id: `LIST_${eventId}` },
  { type: 'Event', id: eventId },
  { type: 'Event', id: 'LIST' }
]
```

---

## Ficheiros Principais

| Ficheiro | Responsabilidade |
|----------|------------------|
| `src/Api/amplifyClient.js` | Cliente singleton + Selection Sets |
| `src/Api/services/eventApi.js` | Queries/Mutations de eventos |
| `src/Api/services/participantApi.js` | Queries/Mutations de participantes |
| `src/Api/services/dependentsApi.js` | Queries/Mutations de dependentes |
| `src/Components/Event/useEventData.js` | Hook de dados de eventos |
| `src/Components/Participant/.../useParticipantData.js` | Hook de dados de participantes |
| `src/Components/Participant/.../useDependentData.js` | Hook de dados de dependentes |

---

## Considerações Futuras

1. **AppSync Caching**: Configurar TTL no resolver level
2. **DynamoDB DAX**: Para workloads de leitura intensiva
3. **Subscription Optimization**: Implementar subscriptions para updates real-time
4. **Prefetching**: Prefetch de dados ao hover sobre links

---

## Adenda — Optimistic Updates (2026-06-15)

A §3 original apresentava `invalidateTags` como único padrão de `onQueryStarted`. Desde então o
codebase adotou **optimistic updates** via `updateQueryData` para fluxos de latência sensível
(`createParticipant`, `confirmPresence`, bulk status). A §3.1 documenta o padrão, as regras de
rollback/reconciliação e a interação com subscriptions.

**Motivação concreta:** o Confirmar Presença mantinha uma cópia local (`localParticipants`) das
props congelada no mount — duas fontes de verdade que divergiam (contagem ≠ lista, presenças que
não apareciam). O fix eliminou o mirror e tornou o cache a fonte única, com `confirmPresence` a
patchar otimisticamente o cache de `listParticipantsByEventLambda` (commit `c444005f`).

**Princípio durável:** componentes leem do cache RTK Query, nunca de cópias em `useState`. Updates
otimistas vivem na mutation (`onQueryStarted`), não nos componentes. Isto também alinha os hooks
com o padrão de §4 (`return data?.items || []`).

---

## Referências

- [AWS Amplify Gen 2 Data Client](https://docs.amplify.aws/gen2/build-a-backend/data/)
- [RTK Query Cache Management](https://redux-toolkit.js.org/rtk-query/usage/cache-behavior)
- [GraphQL Relations in Amplify](https://docs.amplify.aws/gen2/build-a-backend/data/data-modeling/relationships/)
