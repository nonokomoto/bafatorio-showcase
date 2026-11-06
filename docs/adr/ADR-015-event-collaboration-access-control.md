# ADR-015: Event Collaboration & Access Control

**Status:** Accepted
**Date:** 2026-02-05
**Authors:** Bafatorio Development Team
**Related:** ADR-006 (Authentication & Authorization), ADR-003 (Data Resource Structure), ADR-004 (Backend Architecture), ADR-005 (Frontend API Architecture), ADR-013 (DynamoDB Owner Keys)

---

## Context

O Bafatorio é uma plataforma de gestão de eventos onde o utilizador criador (Owner) pode convidar colaboradores para ajudar a gerir os seus eventos. Isto requer um sistema de controle de acesso a dois níveis:

1. **Subscription-based (Cognito Groups)**: Controla o que o utilizador pode fazer na plataforma com base no grupo (USER, ADMIN) — documentado no ADR-006 e migração no ADR-017.
2. **Event-level (Event Roles)**: Controla o que o utilizador pode fazer num evento específico com base no seu papel (OWNER, CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS) — **documentado neste ADR**.

### Problema

Antes desta implementação, apenas o Owner (via `rules.owner()` do DynamoDB) podia aceder aos dados de um evento. Não existia forma de:
- Convidar outra pessoa para colaborar num evento
- Definir diferentes níveis de acesso por evento
- Restringir visualização de dados financeiros a certos colaboradores
- Implementar workflows de aprovação (ex: fornecedor selecionado por Staff → aprovado por Owner)

### Referência de Design

O design está documentado em `docs/ACCESS_LEVELS_STRATEGY.md` e implementado no código conforme descrito abaixo.

---

## Decision

### Arquitectura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     EVENT COLLABORATION ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         TWO-LAYER ACCESS CONTROL                        │   │
│  │                                                                         │   │
│  │   Layer 1: Subscription-based (ADR-006, ADR-017)                      │   │
│  │   ┌──────┐ ┌───────┐                                                 │   │
│  │   │ USER │ │ ADMIN │  ← Cognito Groups                               │   │
│  │   └──────┘ └───────┘                                                 │   │
│  │                                                                         │   │
│  │   Layer 2: Event-level (this ADR)                                      │   │
│  │   ┌───────┐ ┌────────────┐ ┌──────────────┐ ┌────────────────┐       │   │
│  │   │ OWNER │ │ CO_MANAGER │ │ STAFF_CHECKIN│ │STAFF_LOGISTICS │       │   │
│  │   └───────┘ └────────────┘ └──────────────┘ └────────────────┘       │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        IMPLEMENTATION LAYERS                            │   │
│  │                                                                         │   │
│  │  Frontend:                                                              │   │
│  │  ┌──────────────────┐ ┌───────────────────┐ ┌────────────────────┐    │   │
│  │  │ eventRolesConfig │ │   useEventRole    │ │ EventRoleGuard     │    │   │
│  │  │ (permissions)    │ │   (hook)          │ │ EventRouteGuard    │    │   │
│  │  └──────────────────┘ └───────────────────┘ └────────────────────┘    │   │
│  │                                                                         │   │
│  │  Backend:                                                               │   │
│  │  ┌──────────────────┐ ┌───────────────────┐ ┌────────────────────┐    │   │
│  │  │ EventCollaborator│ │ 14 Lambda Fns     │ │ normalizeUserId()  │    │   │
│  │  │ (DynamoDB model) │ │ (access checks)   │ │ redactEventByRole()│    │   │
│  │  └──────────────────┘ └───────────────────┘ └────────────────────┘    │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Event Roles Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT ROLES HIERARCHY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                    OWNER                             │     │
│    │  • Controlo total do evento                        │     │
│    │  • Pode convidar qualquer role                     │     │
│    │  • Aprova seleções de fornecedores                 │     │
│    │  • Único que pode eliminar o evento                │     │
│    └─────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                  CO_MANAGER                          │     │
│    │  • Quase todas as permissões do Owner               │     │
│    │  • Pode convidar Staff (não Co-Managers)            │     │
│    │  • Não pode eliminar o evento                       │     │
│    │  • Não pode aprovar fornecedores                    │     │
│    │  • Acesso a pastas: próprias + partilhadas          │     │
│    └─────────────────────────────────────────────────────┘     │
│                           │                                     │
│              ┌────────────┴────────────┐                       │
│              ▼                         ▼                       │
│  ┌───────────────────┐   ┌───────────────────────┐            │
│  │   STAFF_CHECKIN   │   │  STAFF_LOGISTICS      │            │
│  │  • Apenas check-in │   │  • Gestão participantes│            │
│  │  • Sem acesso a    │   │  • Selecionar fornec.  │            │
│  │    Event Details   │   │    (requer aprovação)  │            │
│  └───────────────────┘   │  • Pastas partilhadas   │            │
│                           └───────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Role Constants

```javascript
// src/Utils/eventRolesConfig.js
export const EVENT_ROLES = {
  OWNER: 'OWNER',
  CO_MANAGER: 'CO_MANAGER',
  STAFF_CHECKIN: 'STAFF_CHECKIN',
  STAFF_LOGISTICS: 'STAFF_LOGISTICS',
};
```

---

## 2. Permissions Matrix

### 2.1 Granular Permissions

```javascript
// src/Utils/eventRolesConfig.js
export const EVENT_PERMISSIONS = {
  // Event
  EVENT_VIEW_BASIC: 'event:view:basic',
  EVENT_VIEW_DETAILS: 'event:view:details',
  EVENT_EDIT: 'event:edit',
  EVENT_DELETE: 'event:delete',

  // Participant
  PARTICIPANT_VIEW: 'participant:view',
  PARTICIPANT_CREATE: 'participant:create',
  PARTICIPANT_EDIT: 'participant:edit',
  PARTICIPANT_DELETE: 'participant:delete',
  PARTICIPANT_CHECKIN: 'participant:checkin',

  // Supplier
  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_EDIT: 'supplier:edit',
  SUPPLIER_DELETE: 'supplier:delete',
  SUPPLIER_SELECT: 'supplier:select',
  SUPPLIER_APPROVE: 'supplier:approve',

  // Document/Financial
  DOCUMENT_VIEW_OWN: 'document:view:own',
  DOCUMENT_VIEW_SHARED: 'document:view:shared',
  DOCUMENT_VIEW_ALL: 'document:view:all',
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_EDIT: 'document:edit',
  DOCUMENT_DELETE: 'document:delete',
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_EDIT: 'financial:edit',

  // Communication & AI
  EMAIL_SEND: 'email:send',
  AI_USE: 'ai:use',

  // Team Management
  TEAM_INVITE_STAFF: 'team:invite:staff',
  TEAM_INVITE_COMANAGER: 'team:invite:comanager',
  TEAM_REMOVE: 'team:remove',
  TEAM_SHARE_FOLDER: 'team:share:folder',

  // Schedule (see ADR-029 for ownership-aware edit/delete rules)
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_EDIT: 'schedule:edit',
  SCHEDULE_DELETE: 'schedule:delete',
};
```

### 2.2 ROLE_PERMISSIONS Matrix

| Permission | OWNER | CO_MANAGER | STAFF_CHECKIN | STAFF_LOGISTICS |
|---|:---:|:---:|:---:|:---:|
| **Event** | | | | |
| event:view:basic | ✅ | ✅ | ✅ | ✅ |
| event:view:details | ✅ | ✅ | ❌ | ✅ |
| event:edit | ✅ | ✅ | ❌ | ❌ |
| event:delete | ✅ | ❌ | ❌ | ❌ |
| **Participant** | | | | |
| participant:view | ✅ | ✅ | ✅ | ✅ |
| participant:create | ✅ | ✅ | ❌ | ✅ |
| participant:edit | ✅ | ✅ | ❌ | ✅ |
| participant:delete | ✅ | ✅ | ❌ | ✅ |
| participant:checkin | ✅ | ✅ | ✅ | ✅ |
| **Supplier** | | | | |
| supplier:view | ✅ | ✅ | ❌ | ✅ |
| supplier:create | ✅ | ✅ | ❌ | ✅\* |
| supplier:edit | ✅ | ✅ | ❌ | ❌ |
| supplier:delete | ✅ | ✅ | ❌ | ❌ |
| supplier:select | ✅ | ✅ | ❌ | ✅\* |
| supplier:approve | ✅ | ❌ | ❌ | ❌ |
| **Document/Financial** | | | | |
| document:view:own | ✅ | ✅ | ❌ | ❌ |
| document:view:shared | ✅ | ✅ | ❌ | ✅ |
| document:view:all | ✅ | ❌ | ❌ | ❌ |
| document:create | ✅ | ✅ | ❌ | ✅ |
| document:edit | ✅ | ✅ | ❌ | ✅ |
| document:delete | ✅ | ✅ | ❌ | ✅ |
| financial:view | ✅ | ✅ | ❌ | ❌ |
| financial:edit | ✅ | ✅ | ❌ | ❌ |
| **Communication & AI** | | | | |
| email:send | ✅ | ✅ | ❌ | ✅ |
| ai:use | ✅ | ✅ | ❌ | ✅ |
| **Team Management** | | | | |
| team:invite:staff | ✅ | ✅ | ❌ | ❌ |
| team:invite:comanager | ✅ | ❌ | ❌ | ❌ |
| team:remove | ✅ | ✅ | ❌ | ❌ |
| team:share:folder | ✅ | ❌ | ❌ | ❌ |
| **Schedule** | | | | |
| schedule:view | ✅ | ✅ | ❌ | ✅ |
| schedule:create | ✅ | ✅ | ❌ | ✅ |
| schedule:edit | ✅ | ✅ | ❌ | ✅\*\* |
| schedule:delete | ✅ | ✅\*\* | ❌ | ✅\*\* |

\* STAFF_LOGISTICS supplier interactions always flow through `PENDING_APPROVAL`, regardless of how the supplier was added:
  - **`supplier:create`**: STAFF_LOGISTICS may create a new `Supplier` record in their own catalog (ownership follows `rules.owner()` on the Supplier model). The Supplier itself is persisted directly — what needs approval is the `EventSupplier` association below.
  - **`supplier:select`**: when associating any supplier (one they created, or one shared with them via `collaboratorRecord.sharedSupplierIds`) to an event, `select-event-supplier` writes the `EventSupplier` with `approvalStatus = PENDING_APPROVAL` and requires an Owner to run `process-supplier-approval` before the row counts toward `Event.committedExpenses`.
  - **Import (`importNormalizedEventSuppliers`)**: same rule applied on the backend — STAFF_LOGISTICS's imported rows are force-set to `status = PENDING` regardless of the spreadsheet column, because the LLM-normalized status would otherwise be a trivial bypass of the approval workflow. OWNER/CO_MANAGER imports keep the spreadsheet-as-source-of-truth behaviour since they hold `supplier:approve`.

\*\* Schedule edit/delete permissions are ownership-aware. ADR-029 is the canonical schedule reference:
  - `CO_MANAGER` can edit any entry and delete non-OWNER-authored entries.
  - `STAFF_LOGISTICS` can create entries and edit/delete only entries they authored.

---

## 3. Data Model

### 3.1 EventCollaborator (DynamoDB)

```typescript
// amplify/data/resource.ts
EventCollaborator: a.model({
  id: a.string().required(),
  eventId: a.string().required(),
  userId: a.string(),                     // Filled after accepting (Cognito sub)
  userEmail: a.string().required(),       // Email of the invited person
  role: a.enum(['CO_MANAGER', 'STAFF_CHECKIN', 'STAFF_LOGISTICS']),

  // Customizable permissions (only for CO_MANAGER)
  sharedFolderIds: a.string().array(),    // IDs of DocumentFolders shared

  // Invitation status
  status: a.enum(['PENDING', 'ACCEPTED', 'DECLINED']),

  // Audit fields
  invitedBy: a.string().required(),       // userId of who invited
  invitedAt: a.datetime().required(),
  acceptedAt: a.datetime(),

  // Relation with Event
  event: a.belongsTo('Event', 'eventId'),
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('eventId').name('byEventId'),     // List collaborators of an event
  index('userId').name('byUserId'),       // List events of a user
  index('userEmail').name('byUserEmail'), // Find invitations by email
])
.authorization((rules) => [
  rules.owner(),                          // Owner of the invitation can read/update
  rules.authenticated().to(['read']),     // Authenticated users can read (to accept)
])
```

### 3.2 EventSupplier Approval Fields

Campos adicionados ao modelo `EventSupplier` para suportar o workflow de aprovação:

```typescript
// Campos de aprovação adicionados ao EventSupplier
requestedBy: a.string(),               // userId de quem solicitou
approvalStatus: a.enum([
  'DIRECT',              // Seleção direta por Owner/Co-Manager
  'PENDING_APPROVAL',    // Aguarda aprovação do Owner
  'APPROVED',            // Aprovado pelo Owner
  'REJECTED'             // Rejeitado pelo Owner
]),
approvedBy: a.string(),                // userId de quem aprovou
approvedAt: a.datetime(),
rejectionReason: a.string(),
```

### 3.3 DocumentFolder Model

```typescript
DocumentFolder: a.model({
  id: a.string().required(),
  eventId: a.string().required(),
  name: a.string().required(),
  description: a.string(),
  color: a.string(),
  icon: a.string(),
  order: a.integer(),
  parentFolderId: a.string(),
  event: a.belongsTo('Event', 'eventId'),
})
.identifier(['id'])
.secondaryIndexes((index) => [
  index('eventId').name('byEventId'),
])
.authorization((rules) => [rules.owner()])
```

---

## 4. Backend Implementation

### 4.1 Lambda Functions (14 collaboration-related)

#### Team Management Mutations

| Function | Propósito | Quem Pode Usar |
|----------|-----------|----------------|
| `invite-collaborator` | Convidar colaborador por email | OWNER (qualquer role), CO_MANAGER (apenas Staff) |
| `accept-invitation` | Aceitar convite pendente | Utilizador convidado |
| `decline-invitation` | Recusar convite pendente | Utilizador convidado |
| `revoke-collaborator` | Remover colaborador | OWNER (qualquer), CO_MANAGER (apenas Staff) |
| `update-collaborator-folders` | Partilhar pastas com colaborador | OWNER apenas |

#### Collaboration Queries

| Function | Propósito | Quem Pode Usar |
|----------|-----------|----------------|
| `get-event-as-collaborator` | Obter evento se Owner ou colaborador aceite | Qualquer utilizador autenticado |
| `list-event-collaborators` | Listar colaboradores de um evento | OWNER, CO_MANAGER |
| `list-event-folders` | Listar pastas de documentos | OWNER (todas), CO_MANAGER (próprias + partilhadas), STAFF_LOGISTICS (próprias + partilhadas) |
| `list-event-suppliers` | Listar fornecedores do evento | OWNER, CO_MANAGER, STAFF_LOGISTICS |
| `list-my-pending-invitations` | Listar convites pendentes do utilizador | Utilizador autenticado |
| `list-my-collaborated-events` | Listar eventos onde é colaborador | Utilizador autenticado |

#### Supplier Approval Mutations

| Function | Propósito | Quem Pode Usar |
|----------|-----------|----------------|
| `select-event-supplier` | Selecionar fornecedor para evento | OWNER/CO_MANAGER (direto), STAFF_LOGISTICS (pendente) |
| `approve-supplier-selection` | Aprovar/rejeitar seleção pendente | OWNER apenas (`supplier:approve`) |
| `update-event-supplier-for-role` | Editar campos do EventSupplier via matriz de permissões | `supplier:edit` (OWNER, CO_MANAGER) |
| `remove-event-supplier` | Remover EventSupplier e reverter orçamento | `supplier:delete` (OWNER, CO_MANAGER) |
| `process-supplier-approval` / `process-supplier-payment` / `revert-event-supplier-approval` | Fluxos de aprovação e pagamento | `supplier:approve` |
| `adjust-approved-event-supplier-quote` | Ajustar valor de orçamento aprovado | `supplier:edit` |

Todas estas mutações delegam autorização ao módulo partilhado `amplify/function/shared/eventPermissions.ts` + `resolveEventAccess.ts`: o handler carrega o `EventSupplier`, resolve o acesso do caller ao evento (owner ou colaborador aceite) e valida a permissão antes de qualquer escrita. Isto evita depender do `rules.owner()` do AppSync para colaboradores.

### 4.2 normalizeUserId Pattern

Todas as Lambdas de colaboração usam `normalizeUserId()` para comparar owner IDs de forma resiliente:

```typescript
/**
 * Normalize user ID to handle both Amplify formats:
 * - "userId::userId" (Amplify Gen 2 owner format)
 * - "userId" (plain Cognito sub)
 *
 * @param id - User ID that might be in format "userId::userId" or "userId"
 * @returns Normalized user ID (just the first part)
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};
```

**Uso:** Quando um Lambda precisa comparar o `owner` de um item DynamoDB (formato `userId::userId`) com o `sub` do AppSync identity (formato `userId`):

```typescript
const identity = event.identity as { sub?: string };
const userId = identity?.sub;

// Buscar item do DynamoDB
const eventItem = await getItem(EVENT_TABLE, { owner, id: eventId });

// Comparar de forma resiliente
if (normalizeUserId(eventItem.owner) === normalizeUserId(userId)) {
  // É o Owner
  userRole = 'OWNER';
}
```

### 4.3 redactEventByRole Pattern

Para proteger dados financeiros de roles que não têm permissão:

```typescript
// Dentro de get-event-as-collaborator Lambda
const redactEventByRole = (eventData, role) => {
  if (role === 'STAFF_CHECKIN' || role === 'STAFF_LOGISTICS') {
    // Redact financial fields
    delete eventData.budget;
    delete eventData.committedExpenses;
    delete eventData.effectiveExpenses;
  }
  return eventData;
};
```

### 4.4 Supplier Approval Workflow

```
┌────────────────────────────────────────────────────────────────────┐
│                SUPPLIER SELECTION APPROVAL FLOW                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  OWNER / CO_MANAGER selects supplier                              │
│         │                                                          │
│         ▼                                                          │
│  selectEventSupplier Lambda                                       │
│  approvalStatus = 'DIRECT'                                        │
│  → Immediate effect on committedExpenses                          │
│                                                                    │
│  STAFF_LOGISTICS selects supplier                                 │
│         │                                                          │
│         ▼                                                          │
│  selectEventSupplier Lambda                                       │
│  approvalStatus = 'PENDING_APPROVAL'                              │
│  requestedBy = staffUserId                                        │
│  → No effect on budget yet                                        │
│         │                                                          │
│         ▼                                                          │
│  OWNER reviews pending selections                                 │
│         │                                                          │
│    ┌────┴────┐                                                    │
│    ▼         ▼                                                    │
│  Approve   Reject                                                 │
│    │         │                                                    │
│    ▼         ▼                                                    │
│  approvalStatus    approvalStatus                                 │
│  = 'APPROVED'      = 'REJECTED'                                   │
│  approvedBy =      rejectionReason                                │
│   ownerUserId      = '...'                                        │
│  → Updates budget  → No budget effect                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. Frontend Implementation

### 5.1 Configuration (`eventRolesConfig.js`)

Ficheiro central que define roles, permissions e a matrix ROLE_PERMISSIONS. Inclui helpers:

```javascript
// src/Utils/eventRolesConfig.js
export const roleHasPermission = (role, permission) => { ... };
export const getRolePermissions = (role) => { ... };
export const canInviteRole = (inviterRole, inviteeRole) => { ... };
export const getInvitableRoles = (inviterRole) => { ... };
```

### 5.2 useEventRole Hook

Hook central que determina o role do utilizador para um evento específico e fornece permission helpers.

```javascript
// src/Hook/useEventRole.js
export const useEventRole = (eventId) => {
  // Calls getEventAsCollaborator Lambda via RTK Query
  const { data } = useGetEventAsCollaboratorQuery({ eventId });

  return {
    // Role information
    role,                    // EVENT_ROLES constant
    roleName,                // Display name ('Organizador', 'Co-Organizador', etc.)
    roleDescription,         // Description for UI
    eventData,               // Event data (redacted by role)

    // Role flags
    isOwner, isCoManager, isStaffCheckin, isStaffLogistics, isStaff,

    // Access state
    hasAccess, isLoading, error,

    // Permission helpers (20+ methods)
    hasPermission(permission),
    canViewEventBasic(), canViewEventDetails(), canEditEvent(), canDeleteEvent(),
    canViewParticipants(), canManageParticipants(), canCheckIn(),
    canViewSuppliers(), canManageSuppliers(), canSelectSupplier(), canApproveSuppliers(),
    canViewAllDocuments(), canViewOwnDocuments(), canViewSharedDocuments(), canManageDocuments(),
    canViewFinancial(), canEditFinancial(),
    canSendEmails(), canUseAI(),
    canInviteStaff(), canInviteCoManager(), canRemoveTeamMember(), canShareFolders(),
    canViewSchedule(), canCreateScheduleEntry(),
    canEditScheduleEntry(entryOwnerUserId), canDeleteScheduleEntry(entryOwnerUserId),

    // Folder access
    sharedFolderIds,
    canAccessFolder(folderId, folderCreatedBy),

    // Approval workflow
    supplierSelectionNeedsApproval(),
  };
};
```

### 5.3 EventRoleGuard (Component-level)

Controla rendering de componentes com base em permissões do evento:

```jsx
// src/Components/Common/EventRoleGuard.jsx

// Single permission
<EventRoleGuard permission={EVENT_PERMISSIONS.EVENT_EDIT}>
  <EditEventButton />
</EventRoleGuard>

// Multiple permissions (OR logic)
<EventRoleGuard permissions={[EVENT_PERMISSIONS.PARTICIPANT_CREATE, EVENT_PERMISSIONS.PARTICIPANT_EDIT]}>
  <ParticipantActions />
</EventRoleGuard>

// Multiple permissions (AND logic)
<EventRoleGuard permissions={[...]} requireAll>
  <SupplierSelectionPanel />
</EventRoleGuard>

// With fallback
<EventRoleGuard permission={EVENT_PERMISSIONS.FINANCIAL_EDIT} fallback={<ReadOnlyView />}>
  <EditableForm />
</EventRoleGuard>
```

Também disponível como HOC: `withEventRoleGuard(Component, permission)` e hook: `useEventRoleCheck(eventId)`.

### 5.4 EventRouteGuard (Route-level)

Protege rotas inteiras com base no acesso ao evento:

```jsx
// src/Components/Common/EventRouteGuard.jsx

// Bloqueia STAFF_CHECKIN de aceder ao Event Details
<Route path="event/:id" element={
  <EventRouteGuard>
    <EventDetails />
  </EventRouteGuard>
} />
```

Comportamento:
- **OWNER, CO_MANAGER, STAFF_LOGISTICS**: Acesso permitido
- **STAFF_CHECKIN**: Bloqueado (mostra "Acesso Negado")
- **Sem acesso**: Bloqueado (mostra "Acesso Negado")

### 5.5 collaboratorApi (RTK Query)

```javascript
// src/Api/services/collaboratorApi.js
export const collaboratorApi = createApi({
  reducerPath: 'collaboratorApi',
  baseQuery: amplifyBaseQuery,
  endpoints: (builder) => ({
    getEventAsCollaborator: builder.query({ ... }),
    listEventCollaborators: builder.query({ ... }),
    inviteCollaborator: builder.mutation({ ... }),
    revokeCollaborator: builder.mutation({ ... }),
    acceptInvitation: builder.mutation({ ... }),
    declineInvitation: builder.mutation({ ... }),
    updateCollaboratorFolders: builder.mutation({ ... }),
    listMyPendingInvitations: builder.query({ ... }),
    listMyCollaboratedEvents: builder.query({ ... }),
    listEventFolders: builder.query({ ... }),
    listEventSuppliers: builder.query({ ... }),
    selectEventSupplier: builder.mutation({ ... }),
    approveSupplierSelection: builder.mutation({ ... }),
  }),
});
```

---

## 6. Invitation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INVITATION FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Owner/Co-Manager invoca inviteCollaborator                             │
│     └── { eventId, email, role }                                           │
│         │                                                                   │
│         ▼                                                                   │
│  2. Lambda valida:                                                          │
│     • Inviter tem permissão (canInviteRole hierarchy)                      │
│     • Email não é duplicado para o mesmo evento                            │
│     • Cria EventCollaborator com status = PENDING                          │
│         │                                                                   │
│         ▼                                                                   │
│  3. Utilizador convidado vê convite em "Meus Convites"                     │
│     └── listMyPendingInvitations (busca por userEmail)                     │
│         │                                                                   │
│    ┌────┴────┐                                                             │
│    ▼         ▼                                                             │
│  Accept    Decline                                                          │
│    │         │                                                             │
│    ▼         ▼                                                             │
│  status =  status =                                                        │
│  ACCEPTED  DECLINED                                                        │
│  userId =  (fim)                                                           │
│  cognitoSub                                                                │
│    │                                                                        │
│    ▼                                                                        │
│  4. Evento aparece na lista de eventos colaborados                          │
│     └── listMyCollaboratedEvents                                           │
│         │                                                                   │
│         ▼                                                                   │
│  5. Acesso ao evento via getEventAsCollaborator                            │
│     └── Retorna { event, userRole, sharedFolderIds }                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Invitation Hierarchy

| Inviter Role | Can Invite |
|---|---|
| OWNER | CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS |
| CO_MANAGER | STAFF_CHECKIN, STAFF_LOGISTICS |
| STAFF_CHECKIN | Ninguém |
| STAFF_LOGISTICS | Ninguém |

---

## 7. Folder Sharing

O Owner pode partilhar pastas (DocumentFolder) com colaboradores via `updateCollaboratorFolders`:

| Role | Folder Access |
|---|---|
| OWNER | Todas as pastas |
| CO_MANAGER | Pastas próprias + pastas partilhadas (sharedFolderIds) |
| STAFF_LOGISTICS | Pastas próprias + pastas partilhadas (sharedFolderIds) |
| STAFF_CHECKIN | Sem acesso a pastas |

```javascript
// useEventRole hook
canAccessFolder: (folderId, folderCreatedBy) => {
  if (role === EVENT_ROLES.OWNER) return true;
  if (role === EVENT_ROLES.CO_MANAGER) {
    return folderCreatedBy === userId || collaborator?.sharedFolderIds?.includes(folderId);
  }
  if (role === EVENT_ROLES.STAFF_LOGISTICS) {
    return folderCreatedBy === userId || collaborator?.sharedFolderIds?.includes(folderId);
  }
  return false;
};
```

Notas de clarificacao para documentos dentro de pastas:

- `STAFF_LOGISTICS` pode aceder a pastas proprias e partilhadas
- `STAFF_LOGISTICS` so pode editar/apagar documentos em pastas proprias
- Pastas partilhadas continuam `upload-only` para colaboradores que nao sao owners da pasta

---

## Consequences

### Positivas

1. **Granular Access Control**: 25 permissões permitem controle fino sobre cada feature
2. **Two-Layer Security**: Subscription + Event roles complementam-se mutuamente
3. **Approval Workflow**: Staff pode selecionar fornecedores, Owner valida
4. **Data Protection**: Dados financeiros redactados para Staff roles no backend
5. **DRY Configuration**: Matrix de permissões centralizada em `eventRolesConfig.js`
6. **Developer Experience**: `useEventRole` hook com 20+ helpers tipados

### Negativas

1. **Complexidade**: Sistema de dois níveis requer compreensão de ambos
2. **Backend Overhead**: Cada Lambda de colaboração precisa de checks de role adicionais
3. **normalizeUserId**: Padrão necessário para contornar diferença de formatos Amplify

### Trade-offs

| Decisão | Trade-off |
|---------|-----------|
| 25 permissões granulares | Flexibilidade vs. complexidade |
| Backend role checks em cada Lambda | Segurança vs. performance |
| Owner-only approval | Segurança vs. agilidade |
| STAFF_CHECKIN sem Event Details | Simplicidade vs. funcionalidade |

---

## File References

| File | Purpose |
|------|---------|
| `src/Utils/eventRolesConfig.js` | Roles, permissions, ROLE_PERMISSIONS matrix |
| `src/Hook/useEventRole.js` | Central hook for event-level permissions |
| `src/Components/Common/EventRoleGuard.jsx` | Component-level permission guard |
| `src/Components/Common/EventRouteGuard.jsx` | Route-level access guard |
| `src/Api/services/collaboratorApi.js` | RTK Query API for collaboration endpoints |
| `docs/ACCESS_LEVELS_STRATEGY.md` | Design document for access strategy |
| `amplify/data/resource.ts` | EventCollaborator, DocumentFolder models |
| `amplify/function/get-event-as-collaborator/` | Core Lambda for role resolution |
| `amplify/function/invite-collaborator/` | Invitation Lambda |
| `amplify/function/select-event-supplier/` | Supplier selection with approval flow |
| `amplify/function/approve-supplier-selection/` | Owner approval Lambda |

---

## Related ADRs

- [ADR-003: Amplify Data Resource Structure](ADR-003-amplify-data-resource-structure.md) — EventCollaborator, DocumentFolder models
- [ADR-004: Amplify Backend Complete Architecture](ADR-004-amplify-backend-complete-architecture.md) — Collaboration Lambda functions (ver ADR-004 para contagem total)
- [ADR-005: Frontend API Architecture](ADR-005-frontend-api-architecture.md) — collaboratorApi service
- [ADR-006: Authentication & Authorization](ADR-006-authentication-authorization.md) — Subscription-based layer (Cognito groups)
- [ADR-013: DynamoDB Owner Authorization Keys](ADR-013-dynamodb-owner-authorization-keys.md) — normalizeUserId pattern

---

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2026-02-05 | Bafatorio Dev Team | Initial ADR documenting event collaboration & access control |
| 2026-03-20 | Ney Carvalho | Atualizado referências a grupos Cognito (→ USER/ADMIN conforme ADR-017) |
| 2026-04-21 | Ney Carvalho | Clarificado acesso de STAFF_LOGISTICS a pastas proprias/partilhadas e limitacao de edicao de documentos a pastas proprias |
