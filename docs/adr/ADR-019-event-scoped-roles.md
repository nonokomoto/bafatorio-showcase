# ADR-019: Roles com scope de evento (eventId)

**Status:** Aceite
**Data:** 2026-02-17
**Autor:** Ney Carvalho
**Branch:** `role-bux-fix`
**Depende de:** ADR-018 (Migração participantRole → roleId)

---

## Contexto

Após o ADR-018, os Roles passaram a ser registos dinâmicos na tabela `Role`, mas continuavam com `rules.owner()` — pertenciam ao **utilizador**, não ao **evento**. Quando um evento era partilhado com colaboradores, estes não conseguiam ver nem usar os roles porque o GraphQL bloqueava acesso a registos de outro owner.

Problema concreto: um CO_MANAGER ou STAFF que aceda a um evento partilhado não via os roles no dropdown de criação/edição de participantes.

---

## Decisão

### 1. Adicionar `eventId` ao modelo Role

O modelo Role passa a incluir `eventId` como campo obrigatório, com uma relação `belongsTo('Event')` e um GSI `byEventId`:

```
Role {
  id: ID
  name: String
  eventId: String (FK → Event)
  owner: String
}
GSI: byEventId (eventId → sort by createdAt)
```

Isto segue o mesmo padrão já usado por `DocumentFolder` e `EventSupplier`.

### 2. Custom queries via Lambda (bypass owner auth)

Como os Roles mantêm `rules.owner()` para proteger acesso direto, o acesso de colaboradores é feito via custom queries/mutations backed por Lambdas:

| Operação | Lambda | Acesso |
|----------|--------|--------|
| `getEventRoles(eventId)` | `list-event-roles` | OWNER, CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN |
| `createEventRole(eventId, name)` | `create-event-role` | OWNER, CO_MANAGER |
| `deleteRole(id)` | Direct GraphQL | Apenas owner (via `rules.owner()`) |

Os Lambdas seguem o padrão `list-event-folders` / `create-participant-collaborator`:
1. Extraem `userId` do identity token
2. Verificam se o user é owner do evento ou colaborador
3. Validam permissões por role do colaborador
4. Executam a operação com `owner = eventOwner` (para consistência DDB auth)

### 3. Lambdas existentes atualizados

Os Lambdas que faziam `Scan` na tabela Role passaram a usar o GSI `byEventId`:

| Lambda | Antes | Depois |
|--------|-------|--------|
| `list-event-participants` | Scan Role (name→id) | Query byEventId (name→id) |
| `update-participant-collaborator` | Scan Role (name→id) | Query byEventId (name→id) |
| `upload-participant` | Scan Role (name+owner) | Query byEventId (name+eventId) |

Isto melhora performance (Query vs Scan) e garante isolamento entre eventos.

### 4. Frontend: roleApi.js reescrito

O `roleApi.js` foi reescrito para usar as custom queries Lambda:

```js
// Antes (direct GraphQL, bloqueado por owner auth)
useListRolesQuery()
useCreateRoleMutation()

// Depois (Lambda-backed, collaborator-aware)
useListEventRolesQuery({ eventId })
useCreateEventRoleMutation()  // recebe { eventId, name }
useDeleteRoleMutation()       // mantém direct GraphQL (só owner)
```

### 5. useRoleLookup com eventId automático

O hook `useRoleLookup` aceita um `eventId` opcional. Quando omitido, usa automaticamente o `selectedEventId` do Redux store:

```js
// Sem argumento — usa evento selecionado globalmente
const { roleMap, getRoleName } = useRoleLookup();

// Com argumento explícito
const { roleMap, getRoleName } = useRoleLookup(specificEventId);
```

Isto permitiu que 7+ componentes consumidores não precisassem de alterações.

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `amplify/data/resource.ts` | eventId no Role + GSI byEventId + RoleData type + custom queries |
| `amplify/function/list-event-roles/` | **Novo** — Lambda para listar roles de um evento |
| `amplify/function/create-event-role/` | **Novo** — Lambda para criar role num evento |
| `amplify/backend.ts` | Registar Lambdas + env vars + IAM policies |
| `amplify/function/upload-participant/handler.ts` | resolveRoleId com eventId (Query GSI) |
| `amplify/function/list-event-participants/handler.ts` | loadRoleNameToIdMap com eventId (Query GSI) |
| `amplify/function/update-participant-collaborator/handler.ts` | loadRoleNameToIdMap com eventId (Query GSI) |
| `src/Api/services/roleApi.js` | Reescrito — Lambda-backed endpoints |
| `src/Hook/useRoleLookup.js` | Aceita eventId opcional, default do Redux |
| `src/Components/Participant/ParticipantForm/ParticipantFormModal.jsx` | Novos hooks com eventId |
| `src/Components/Participant/ParticipantForm.jsx` | Novos hooks com eventId |
| `src/Components/Participant/ParticipantTable/components/TableHeader/FilterDropdown.jsx` | Novo hook com eventId |

---

## Migração de dados existentes

### Script: `scripts/migrate-roles-add-eventId.mjs`

Para cada Role sem `eventId`:
1. Mapeia `roleId → Set<eventId>` via tabela Participant
2. **1 evento** → UPDATE role: `SET eventId = thatEventId`
3. **0 eventos** → DELETE role (órfão)
4. **N eventos** → Mantém original para 1.o evento, CLONE para restantes, UPDATE `participant.roleId`

```bash
# Dry-run
node scripts/migrate-roles-add-eventId.mjs --suffix <SUFIXO>

# Executar
node scripts/migrate-roles-add-eventId.mjs --suffix <SUFIXO> --execute
```

### Passos para deploy

1. Fazer merge da branch `role-bux-fix`
2. Esperar deploy automático do Amplify (schema + Lambdas + IAM)
3. Correr migração por ambiente:
```bash
# Development
node scripts/migrate-roles-add-eventId.mjs --suffix <DEV_SUFFIX> --execute

# Production
node scripts/migrate-roles-add-eventId.mjs --suffix <PROD_SUFFIX> --execute
```

**Nota:** A migração NÃO é bloqueante. Os novos Lambdas já criam roles com `eventId`. Roles antigos sem `eventId` simplesmente não aparecem nas queries Lambda (que filtram por eventId). A migração é recomendada para não perder roles existentes.

---

## Consequências

- Roles passam a ser **event-scoped** — cada evento tem os seus próprios roles
- Colaboradores (CO_MANAGER, STAFF) podem **ver e usar** roles de eventos partilhados
- OWNER, CO_MANAGER e STAFF_LOGISTICS podem **criar** novos roles — o role é a categoria de participante ("Palestrante", "VIP"), por isso acompanha quem gere participantes; STAFF_CHECKIN não pode
- Apenas o owner do evento pode **apagar** roles (via `rules.owner()`)
- Performance melhorada: Query por GSI em vez de Scan em todos os Lambdas
- Roles deixam de "vazar" entre eventos — isolamento total
