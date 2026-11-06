# ADR-027: Bulk Import de Fornecedores — Dual-Write Supplier + EventSupplier

## Status
**Accepted** | Data: 2026-04-16

## Contexto

O import existente (`importNormalizedSuppliers` via `ImportSuppliersModal` em `/app/suppliers`) cria apenas registos `Supplier` globais, sem ligação a nenhum evento. O fluxo correcto do produto é:

1. Criar **Supplier** (entidade reutilizável — Hotel Perola, Cv Telecom)
2. Associar ao **Event** via **EventSupplier** (quoteAmount, status, approval workflow)

Uma cliente real (Human Leaders ICCV 2026) fez upload dum ficheiro que é, na verdade, o **mapa de orçamento do evento** — cada linha tem `ID` (ALO-001), `Descrição do Serviço` (Quartos oradores — 20 quartos x 3 noites), `Status` (Reservado / Em negociação), `Quote` (CVE + EUR). O import existente:

- Grava `Supplier` sem link ao evento → fornecedores órfãos no perfil global da cliente
- **Perde** a descrição do serviço (sem campo equivalente no Supplier)
- **Perde** o status operacional (sem campo equivalente)
- **Perde** o ID interno (ALO-001)
- Grava `quoteAmount` no `Supplier.estimateMinAmount` → valor "cola" ao fornecedor, contaminando outros eventos que o reutilizem

O Excel não é um catálogo genérico de fornecedores — é um mapa per-evento. A solução deve reflectir isso sem obrigar o utilizador a fazer o workflow manual (criar 40 suppliers + associar 40 ao evento um a um).

Ver análise completa em [docs/plans/2026-04-16-event-supplier-import-design.md](../plans/2026-04-16-event-supplier-import-design.md) (este plano).

## Decisão

Introduzir um novo fluxo de import com **dual-write**: cada linha do Excel cria (ou reutiliza) um `Supplier` **e** cria um `EventSupplier` a ligá-lo ao evento corrente, numa única chamada.

### Fluxo de alto nível

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVENT SUPPLIER BULK IMPORT FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

  BafatorioApp (event page)                api-bafatorio (Fastify)
  ┌────────────────────────────┐           ┌──────────────────────────────────┐
  │  EventSupplierList         │           │  POST /api/v1/normalize/          │
  │  └─ "Add Supplier ▾"       │           │         event-suppliers           │
  │     └─ "Import from file"  │           │  - auth: JWT                      │
  │                            │           │  - parseExcel                     │
  │  ImportEventSuppliersModal │──multipart►  - LLM (Gemini 3.1 Pro)           │
  │  - eventId (required)      │   file    │    schema-mapper:                 │
  │  - preview table           │           │      'event-supplier'             │
  └────────────┬───────────────┘           │  - transformer coercion           │
               │ normalized rows            │  - Zod validation                │
               │                            │  - response: { data, errors,     │
               │                            │    summary, columnMapping }      │
               │                            └──────────────────────────────────┘
               │
               ▼ AppSync GraphQL
  ┌────────────────────────────────────────────────────────────────────────┐
  │  importNormalizedEventSuppliers(eventId, rows) mutation                │
  │                                                                         │
  │  Lambda: import-normalized-event-suppliers                             │
  │   1. Auth: eventOwner check (ADR-013) + collaborator role (ADR-015)    │
  │      - OWNER/CO_MANAGER → approvalStatus=DIRECT                        │
  │      - STAFF_LOGISTICS  → approvalStatus=PENDING_APPROVAL              │
  │      - STAFF_CHECKIN    → reject                                       │
  │   2. Load existing data for dedup:                                      │
  │      - fetchSuppliersByOwnerWithIds (name+email+phone → supplierId)    │
  │      - fetchExistingEventSupplierLinks (supplierIds already linked)    │
  │   3. For each row:                                                      │
  │      a. Supplier: reuse existing else queue PutItem                     │
  │      b. EventSupplier: skip if (eventId, supplierId) already linked     │
  │   4. batchWriteItems (both tables, 25-item chunks with retry)           │
  │   5. Return counts: suppliersCreated, suppliersReused,                  │
  │                    suppliersDeduplicatedInBatch,                       │
  │                    eventSuppliersCreated,                              │
  │                    rowsAlreadyLinkedOnEvent, rowsDuplicatedInBatch,    │
  │                    validationErrorCount                                 │
  └────────────────────────────────────────────────────────────────────────┘
```

### Schema changes (EventSupplier)

Adicionados 3 campos opcionais à `amplify/data/resource.ts` — **aditivos**, não-breaking (ADR-020, campos opcionais não requerem migração):

| Campo | Tipo | Para que serve |
|-------|------|----------------|
| `description` | `string` | Descrição do serviço contratado para *este* evento (ex: "Quartos oradores - 20 quartos x 3 noites") |
| `externalRef` | `string` | Código de referência do sistema de origem (ex: "ALO-001") |
| `currency` | `string` | ISO code emparelhado com `quoteAmount` (EUR, CVE, USD…) |

### Auth (reutiliza ADR-013 + ADR-015)

Padrão idêntico ao `select-event-supplier`:
1. GetItem(Event) por `id` para obter `owner` real
2. Se `normalizeUserId(owner) === userId` → role = OWNER
3. Senão, QueryByGSI(EventCollaborator.byEventId) filtrando por `userId` + `status=ACCEPTED`
4. Valida role ∈ {OWNER, CO_MANAGER, STAFF_LOGISTICS}
5. Owner dos registos criados = `eventOwner` (não o utilizador que fez upload) — garante visibilidade para o dono

### Dedup

| Entidade | Chave | Comportamento |
|----------|-------|---------------|
| Supplier | `buildSupplierDuplicateKey(name, email, phone)` — `name+email` se houver email, senão `name+phone` se houver phone, senão `name` só | **Reuse** se existir — não sobrescreve campos |
| EventSupplier | `(eventId, supplierId)` | **Skip** se já ligado — não actualiza |

Decisão explícita: **skip** em vez de update para EventSupplier, para o utilizador ver no preview "N já ligadas a este evento" antes de re-importar. Evita sobrescritas acidentais.

O `buildSupplierDuplicateKey` é o mesmo usado pelo `import-normalized-suppliers` legacy (ver `amplify/function/shared/importUtils.ts`). A chave é prefix-based (não concatena todos os três campos), o que significa que um supplier só com email e outro com o mesmo nome mas só com phone **não** colapsam — trade-off explícito para privilegiar matches positivos em vez de falsos positivos.

### LLM (api-bafatorio)

- Novo `SchemaType = 'event-supplier'` em `schema-mapper.service.ts`
- Novo `EVENT_SUPPLIER_SCHEMA_DESCRIPTION` em `normalize.validator.ts` com:
  - Lista real de categorias (13) do form, com nota isCreatable
  - Lista real de moedas (14) com preferência EUR em multi-currency rows
  - Mapeamento de status free-text (Reservado → APPROVED, Em negociação → PENDING)
- Novo coercer `coerceEventSupplierStatus` com fallback para `PENDING` (enum é required no DynamoDB)
- Novo campo `quoteAmount` registado em `NUMBER_FIELDS` (apanha parseNumber que já trata "2.700" → 2700)

### Frontend

- **Split button** em `EventSupplierList`: o botão "Add Supplier" mantém o fluxo manual; o chevron abre um dropdown com "Import from file".
- Novo `ImportEventSuppliersModal` (300 linhas, self-contained): 4 steps (idle → normalizing → preview → success/error).
- Preview mostra **tabela real** com colunas Supplier + EventSupplier: name, category, quote+currency, status chip, description, ref.
- **Zero fallback**: se normalize API falhar, utilizador vê erro e retry. Nunca escreve dados parciais (diferente do `ImportSuppliersModal` actual que faz fallback para Lambda legacy).
- RTK Query mutation em `eventSupplierApi.js` invalida caches de `EventSupplier` e `Supplier` apenas em `success === true`.

## Alternativas consideradas

### A. Workflow manual (sem código)
Cliente apaga os 41 fornecedores e cria-os um a um via UI existente, depois associa cada um ao evento. **Rejeitado**: fornece zero valor de produto e falha no caso de uso real (import em lote).

### B. Reutilizar modal existente com eventId opcional
Mesmo modal, se tiver eventId → dual-write; senão comportamento actual. **Rejeitado**: o fallback legacy (Lambda `upload-supplier`) faz validações diferentes (valida headers por string match), criando flaky UX. Um modal novo dedicado é mais limpo.

### C. Campos flexíveis free-text (sem enums)
Remover os enums (`category`, `currency`, `status`) do schema e aceitar qualquer string. **Rejeitado**: a UI depende de enums canónicos para filtros, cores e agregações de dashboard. Perder-se-ia todo o agrupamento.

### D. LLM devolve valueMaps (dictionary de traduções) em vez de coerção hardcoded
LLM deveria, na mesma chamada, produzir um mapa `{ "Alojamento": "VENUE", ... }` e o transformer aplicaria. **Rejeitado para v1**: mais complexo, maior consumo de tokens, e o coerção hardcoded cobre 90% dos casos PT/FR/EN. Aberto para v2 se a cobertura se revelar insuficiente.

## Consequências

### Positivas

- **Resolve o caso de uso real** da cliente sem hacks manuais
- **Preserva os 3 campos perdidos** (description, externalRef, status operacional)
- **Faz o link Event→Supplier automaticamente** — cliente já não tem de associar um a um
- **Dedup inteligente** evita criar suppliers duplicados quando o mesmo fornecedor aparece em múltiplos eventos
- Arquitectura consistente com `select-event-supplier` (mesmo padrão de auth, mesma owner strategy)

### Negativas / Trade-offs

- **Duas rotas de import para fornecedores** (global `/app/suppliers` e event-context): algum utilizador pode ficar confuso. Mitigação: na UI global, mostrar banner "Estás a importar fornecedores globais — para importar directamente a um evento, vai à página do evento".
- **Dedup por skip (não update)**: se o utilizador quiser actualizar um EventSupplier existente, tem de fazer pela UI de edição manual, não pelo import. Aceitável — ainda não há caso de uso para bulk-update.
- **Migração dos 41 fornecedores actualmente órfãos**: cliente precisa apagar e re-importar pela nova via. Sem script automático.

### Tecnologia / Performance

- Cost: +1 round-trip LLM + 1 extra GSI query por import. Para 50 linhas é negligível (~15-20s total, dominado pelo LLM).
- AppSync 30s timeout: cobre até ~500 linhas facilmente. Para mais, o Lambda já aborta com `BATCH_LIMIT_EXCEEDED`.

### Fora de scope (follow-up)

- Participants: mesmo problema arquitectural (ficheiro é per-event, schema actual grava numa tabela global). Cliente pediu explicitamente para NÃO tocar em participants neste épico.
- Supplier table revamp (multi-select, bulk delete, side panel à la Participant): planeado em separado, ver notas do episódio.
- Remover o fluxo legacy `upload-supplier` Lambda + `uploadSupplier` mutation: cleanup depois da nova UI estabilizar.
- Fuzzy matching no LLM prompt (ex: "Transporte 50 part" → TRANSPORTATION): cobrir via valueMaps se o coerção actual se revelar insuficiente.

## Implementação

### Commits (feature branches, ainda não pushed)

- **api-bafatorio** `feature/event-supplier-normalize`: `a8f8af7` — new normalize path
- **BafatorioApp** `feature/event-supplier-import`:
  - `ac3b84f` — Amplify Lambda + schema
  - `7f398d7` — Frontend split button + modal

### Ficheiros principais

- `api-bafatorio/src/models/validators/normalize.validator.ts` — Zod schema + LLM prompt description
- `api-bafatorio/src/services/normalize/transformer.service.ts:coerceEventSupplierStatus`
- `api-bafatorio/src/services/normalize/schema-mapper.service.ts` — `SchemaType` extendido
- `api-bafatorio/src/routes/normalize.routes.ts` — `POST /event-suppliers`
- `BafatorioApp/amplify/data/resource.ts` — EventSupplier campos + `EventSupplierImportResult` + mutation
- `BafatorioApp/amplify/function/import-normalized-event-suppliers/` — Lambda
- `BafatorioApp/amplify/backend.ts` — registos env + IAM
- `BafatorioApp/src/Api/services/eventSupplierApi.js` — RTK mutation
- `BafatorioApp/src/Hook/useNormalizeFile.js` — endpoint dispatch
- `BafatorioApp/src/Components/Supplier/ImportEventSuppliersModal.jsx` — novo modal
- `BafatorioApp/src/Components/Supplier/EventSupplierList.jsx` — split button

### Verificação end-to-end

1. `ampx sandbox` local → deploy do schema estendido + nova Lambda
2. Abrir BafatorioApp em dev, entrar num evento
3. Clicar ▾ ao lado de "Add Supplier" → "Import from file"
4. Upload do `Fornecedores.xlsx` da Human Leaders
5. Preview deve mostrar 54 linhas com quote / status / description / ref populados
6. Clicar "Import 54 suppliers"
7. Esperar resumo: criados novos, reutilizados, ligados ao evento
8. Verificar na `EventSupplierList` que aparecem imediatamente

### Rollout

- Sem feature flag: endpoint e UI disponíveis para toda a gente após deploy de Amplify + api-bafatorio.
- Legacy `ImportSuppliersModal` em `/app/suppliers` **fica a funcionar** — não é removido neste épico.
