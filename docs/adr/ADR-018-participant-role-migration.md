# ADR-018: Migração participantRole → roleId (Role Table)

**Status:** Aceite
**Data:** 2026-02-13
**Autor:** Ney Carvalho
**Branch:** `data_table_update`

---

## Contexto

O modelo Participant usava um campo `participantRole` (string hardcoded: `'attendee'`, `'vip'`, `'media'`, `'team'`). Para suportar roles dinâmicos e customizáveis por evento, foi criado o modelo **Role** com uma relação FK (`roleId`) no Participant.

Esta migração abrangeu:
- Schema GraphQL (`amplify/data/resource.ts`)
- 3 Lambda handlers (list, create, update participant)
- 8+ componentes frontend
- 2 scripts backend (RAG sync)
- IAM policies (`amplify/backend.ts`)

---

## Decisão

### 1. Novo modelo Role

```
Role {
  id: ID
  name: String (ex: "Participante", "VIP", "Imprensa")
  owner: String
}
```

O Participant agora tem `roleId` (UUID FK) em vez de `participantRole` (string).

### 2. Backward compatibility nos Lambdas

Os Lambdas `list-event-participants` e `update-participant-collaborator` incluem uma função `loadRoleNameToIdMap()` que:
1. Faz **Scan** na tabela Role (tabela pequena)
2. Constrói um mapa `name → id` (case-insensitive)
3. No response mapping, resolve registos antigos:

```ts
roleId: (p.roleId as string) || roleNameToId[(p.participantRole as string || '').toLowerCase()] || undefined
```

Isto garante que registos antigos (com `participantRole` mas sem `roleId`) continuam a funcionar.

### 3. Frontend: useRoleLookup hook

Ficheiro: `src/Hook/useRoleLookup.js`

Hook reutilizável que resolve `roleId` → nome usando cache RTK Query partilhada:
```js
const { roleMap, getRoleName, isLoading } = useRoleLookup();
const name = getRoleName(participant.roleId, 'attendee');
```

### 4. Upload de participantes (resolveRoleId)

O Lambda `upload-participant` usa `resolveRoleId()` que:
1. Procura Role existente por nome + owner (Scan)
2. Se não existir, cria um novo Role (PutItem)
3. Retorna o `roleId` para associar ao participante

### 5. IAM Policies

As seguintes Lambdas precisam de `dynamodb:Scan` na tabela Role:
- `listEventParticipants`
- `updateParticipantCollaborator`
- `uploadParticipants` (também precisa de `PutItem` para criar roles)

Definido em `amplify/backend.ts`:
```ts
backend.listEventParticipants.resources.lambda.addToRolePolicy(
  tablePolicy(['Role'], [...DDB_READ, 'dynamodb:Scan'])
);
backend.uploadParticipants.resources.lambda.addToRolePolicy(
  tablePolicy(['Role'], [...DDB_READ, 'dynamodb:Scan', 'dynamodb:PutItem'])
);
```

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `amplify/backend.ts` | Env vars + IAM policies para Role table |
| `amplify/function/list-event-participants/handler.ts` | roleId + fallback + 40 novos campos |
| `amplify/function/create-participant-collaborator/handler.ts` | roleId + 40 novos campos |
| `amplify/function/update-participant-collaborator/handler.ts` | roleId + fallback + 40 novos campos |
| `amplify/function/rag-sync/handler.ts` | participantRole → roleId |
| `scripts/sync-events-to-rag.mjs` | participantRole → roleId |
| `src/Hook/useRoleLookup.js` | **Novo** — hook de resolução roleId → nome |
| `src/Components/ConfirmPresence/ParticipantDetails.jsx` | useRoleLookup |
| `src/Components/ConfirmPresence/ConfirmedParticipantsList.jsx` | useRoleLookup |
| `src/Components/ConfirmPresence/SearchParticipants.jsx` | roleId: null |
| `src/Components/Dashboard/DashboardChart.jsx` | useRoleLookup + roleMap |
| `src/Components/Dashboard/utils/chartOptions.js` | roleMap parameter |
| `src/Components/Reports/EventReportPdf/utils/processReportData.js` | roleMap parameter |
| `src/Components/Reports/EventReportPdf/hooks/useEventReport.js` | useRoleLookup |
| `src/Components/Participant/SendEmail/hooks/useTemplates.js` | roleId |
| `src/Components/Participant/ParticipantTable/components/TableContent/Index.jsx` | VISIBLE_COLUMNS |

---

## Migração de dados existentes

### Script: `scripts/migrate-participant-roles.mjs`

Para cada participante com `participantRole` mas sem `roleId`:
1. Cria um Role record com o nome correspondente
2. Atualiza o participante: `SET roleId = :id REMOVE participantRole`

```bash
# Dry-run (ver o que muda)
node scripts/migrate-participant-roles.mjs --suffix <SUFIXO_TABELA>

# Executar
node scripts/migrate-participant-roles.mjs --suffix <SUFIXO_TABELA> --execute
```

### Sufixos por ambiente

| Ambiente | Sufixo | Participantes |
|----------|--------|---------------|
| Sandbox MacBook | `<api-id>` | Dados frescos |
| Sandbox devsandbox | `<api-id>` | 1 (já migrado) |
| Development | `<api-id>` | ~500 |
| Production (main) | `<api-id>` | ~775 |

### Passos para deploy em production/development

1. Fazer merge da branch `data_table_update`
2. Esperar deploy automático do Amplify (Lambdas + IAM)
3. Correr migração:
```bash
# Development
node scripts/migrate-participant-roles.mjs --suffix xxxxxxxxxxxxxxxxxxxxxxxxxx --execute

# Production
node scripts/migrate-participant-roles.mjs --suffix xxxxxxxxxxxxxxxxxxxxxxxxxx --execute
```

**Nota:** A migração NÃO é bloqueante. O fallback nos Lambdas resolve registos antigos automaticamente. A migração é recomendada para limpeza de dados.

---

## Consequências

- Roles passam a ser dinâmicos e customizáveis por utilizador
- O campo `participantRole` deixa de existir após migração
- Componentes frontend resolvem `roleId → nome` via `useRoleLookup` (cache partilhada, sem network extra)
- Lambdas fazem Scan na tabela Role (tabela pequena, < 100 registos por utilizador)
