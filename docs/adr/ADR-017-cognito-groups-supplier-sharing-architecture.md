# ADR-017: Cognito Groups Simplification & Supplier Sharing

**Status:** Superseded — migração concluída e absorvida pelo ADR-006
**Date:** 2026-02-11
**Supersedes:** Secao 1.2 do ADR-006 (User Groups Hierarchy)
**Relacionado:** ADR-006, ADR-008, ADR-015

> **Este ADR é histórico.** A migração de Cognito groups (REGISTERED/TEST/ACTIVE/MANAGER → USER/ADMIN) e a adição de supplier sharing estão concluídas. O estado actual está documentado em [ADR-006](ADR-006-authentication-authorization.md) (auth) e [ADR-015](ADR-015-event-collaboration-access-control.md) (collaboration).

---

## Problema

1. **Cognito Groups desnecessarios:** 4 grupos (`REGISTERED`, `TEST`, `ACTIVE`, `MANAGER`) quando so precisamos de 2. O grupo `ACTIVE` era redundante (subscricao ja verificada via `UserSubscription`), `TEST` nao era usado, e o webhook que geria o `ACTIVE` nem tinha permissoes IAM para o fazer.

2. **Sem supplier sharing:** O sistema de colaboracao ja partilhava folders (`sharedFolderIds`) mas nao suppliers. Colaboradores nao conseguiam ver suppliers do owner.

---

## Decisao

### Parte A: Cognito Groups — de 4 para 2

| Antes | Depois | Notas |
|-------|--------|-------|
| `REGISTERED` | `USER` | Grupo base para todos os utilizadores |
| `MANAGER` | `ADMIN` | Administradores da plataforma |
| `ACTIVE` | _(removido)_ | Redundante com `UserSubscription` |
| `TEST` | _(removido)_ | Nao usado em producao |

**O que mudou:**
- `amplify/auth/resource.ts` — `groups: ['USER', 'ADMIN']`
- `amplify/data/resource.ts` — `rules.group('USER')` em vez de `rules.group('REGISTERED')`
- `amplify/storage/resource.ts` — `allow.groups(['USER', 'ADMIN'])` nos 3 paths
- `amplify/auth/post-confirmation/handler.ts` — adiciona user ao grupo `USER` no signup
- `amplify/function/handle-stripe-webhook/handler.ts` — removidas operacoes Cognito (codigo morto)
- `src/Utils/rolesConfig.js` — `USER_GROUPS = { ADMIN: 'ADMIN', USER: 'USER' }`

**Migracao feita em 5 deploys sequenciais** para evitar downtime:
1. Dual-mode (aceitar ambos os grupos)
2. Script de migracao (mover users para novos grupos)
3. Codigo final (usar apenas novos grupos)
4. Script de limpeza (esvaziar grupos antigos)
5. Limpeza final (remover grupos antigos do CloudFormation)

### Parte B: Supplier Sharing

Mesmo padrao do folder sharing — campo `sharedSupplierIds: string[]` no `EventCollaborator`.

**Regras:**
- So o **OWNER** pode partilhar suppliers
- **CO_MANAGER** e **STAFF_LOGISTICS** podem receber suppliers partilhados
- **STAFF_CHECKIN** nunca recebe sharing
- Downgrade para STAFF_CHECKIN limpa tanto `sharedFolderIds` como `sharedSupplierIds`

**Visibilidade de suppliers:**

| Role | Ve no catalogo |
|------|---------------|
| OWNER | Todos os seus |
| CO_MANAGER | Proprios + partilhados |
| STAFF_LOGISTICS | Proprios + partilhados |
| STAFF_CHECKIN | Nenhum |

**Lambdas alteradas/criadas:**

| Lambda | Alteracao |
|--------|-----------|
| `invite-collaborator` | Aceita `sharedSupplierIds` no input |
| `update-collaborator-suppliers` | **Nova** — OWNER atualiza suppliers partilhados |
| `get-event-as-collaborator` | Retorna `sharedSupplierIds` no response |
| `update-collaborator-role` | Limpa `sharedSupplierIds` em downgrade para STAFF_CHECKIN |

**Frontend:**
- `collaboratorApi.js` — nova mutation `updateCollaboratorSuppliers`, `sharedSupplierIds` em todos os GraphQL docs
- `useEventRole.js` — expoe `sharedSupplierIds` e `canAccessSupplier()`
- `InviteCollaboratorModal.jsx` — secao de selecao de suppliers
- `EditCollaboratorModal.jsx` — edicao de suppliers partilhados
- `CollaboratorCard.jsx` — mostra contagem de suppliers partilhados
- Traducoes em pt-PT, en-US, fr-FR (`team.json`)

---

## Modelo de Acesso (3 Camadas)

| Camada | Responsabilidade | Onde |
|--------|-----------------|------|
| **1. Cognito Groups** | Gate de acesso a plataforma (`USER`, `ADMIN`) | `resource.ts` auth rules, AppSync |
| **2. Subscricao** | Features e limites por plano (Organizador/Flex) | `useSubscriptionAccess`, `accessControl.js` |
| **3. Event Roles** | Acesso granular dentro de cada evento (OWNER > CO_MANAGER > STAFF_LOGISTICS > STAFF_CHECKIN) + sharing explicito (`sharedFolderIds`, `sharedSupplierIds`) | Lambdas, `useEventRole` |

---

## Deployment Runbook

### Cognito Groups — migrar num novo environment

Apos merge para **production** ou **development**, o Amplify cria automaticamente os grupos `USER` e `ADMIN` e faz deploy do post-confirmation Lambda. **Mas os utilizadores existentes nao sao migrados automaticamente.** E preciso correr o script manualmente.

#### Passos:

1. **Confirmar que o deploy Amplify completou** sem erros

2. **Obter o User Pool ID** do environment:
   - Consola AWS → Cognito → User Pools → copiar o ID
   - Ou: `amplify/output.ts` gerado pelo deploy

3. **Dry run** (ver o que vai acontecer, sem alterar nada):
   ```bash
   USER_POOL_ID=<user-pool-id> npx tsx scripts/migrate-cognito-groups.ts --dry-run
   ```

4. **Confirmar o output** — verificar contagens de utilizadores por grupo

5. **Executar a migracao**:
   ```bash
   USER_POOL_ID=<user-pool-id> npx tsx scripts/migrate-cognito-groups.ts
   ```

6. **Verificar na consola Cognito**:
   - Grupo `USER` tem todos os utilizadores
   - Grupo `ADMIN` tem os antigos `MANAGER`

#### IMPORTANTE: O script deve correr DEPOIS do deploy
- **NAO correr o script antes do deploy.** O CloudFormation precisa de criar os grupos `USER` e `ADMIN`. Se os grupos ja existirem (criados manualmente ou pelo script), o deploy falha com `AlreadyExists`.
- Se isso acontecer: remover os utilizadores dos grupos, apagar os grupos manualmente, e re-triggerar o deploy.

#### Notas:
- O script e **idempotente** — pode ser executado varias vezes sem risco
- Se o environment nunca teve os grupos antigos (REGISTERED, MANAGER), o script nao encontra utilizadores para migrar. Nesse caso, adicionar manualmente: `aws cognito-idp admin-add-user-to-group --user-pool-id <id> --group-name USER --username <username>`
- Inclui throttling (100ms entre calls) para respeitar rate limits do Cognito
- Novos utilizadores que se registem apos o deploy ja entram no grupo `USER` automaticamente via post-confirmation Lambda
- Tokens JWT antigos podem manter grupos anteriores ate **1 hora** (TTL do access token) — resolve-se sozinho no proximo refresh

### Go-Live Production — checklist completo

Quando fizer merge de `development` → `main`. Fazer em hora de pouco trafego.

#### 1. Backend (api-bafatorio no Fly.io)
- [ ] Confirmar DNS: `api.bafatorio.com` → `api-bafatorio.fly.dev` (CNAME)
- [ ] CORS: ja inclui `https://app.bafatorio.com`, `https://bafatorio.com`, `https://www.bafatorio.com`
- [ ] Cognito vars: ja configuradas para production (`eu-west-1_XXXXXXXXX`) — sem alteracoes

#### 2. Frontend (Amplify)
- [ ] Criar PR `development` → `main`
- [ ] Merge — Amplify faz deploy automatico (~15 min)
- [ ] CloudFormation cria grupos `USER` e `ADMIN` no Cognito de production
- [ ] `VITE_BAFATORIO_API_URL` ja esta app-level como `https://api.bafatorio.com/api/v1`

#### 3. Cognito Migration (IMEDIATAMENTE apos deploy)
```bash
USER_POOL_ID=eu-west-1_XXXXXXXXX npx tsx scripts/migrate-cognito-groups.ts --dry-run
USER_POOL_ID=eu-west-1_XXXXXXXXX npx tsx scripts/migrate-cognito-groups.ts
```
**DOWNTIME**: Entre o deploy completar e o script correr, utilizadores existentes perdem acesso (auth rules mudam para `USER` mas eles ainda estao no `REGISTERED`).

#### 4. Verificacao
- [ ] Consola Cognito: grupo `USER` tem todos os utilizadores
- [ ] Consola Cognito: grupo `ADMIN` tem os antigos `MANAGER`
- [ ] Testar login na app
- [ ] Testar Akili chat (depende do backend + Cognito)

#### Environments e User Pools

| Environment | User Pool ID | Backend API | Frontend |
|-------------|-------------|-------------|----------|
| Sandbox | `eu-west-1_XXXXXXXXX` | `localhost:3000` | `localhost:5173` |
| Development | `eu-west-1_XXXXXXXXX` | `api-bafatorio-dev.fly.dev` | `development.dEXAMPLEAPPID.amplifyapp.com` |
| Production | `eu-west-1_XXXXXXXXX` | `api.bafatorio.com` (Fly.io: `api-bafatorio`) | Amplify main |

---

## Consequencias

**Positivas:**
- Cognito simplificado de 4 para 2 grupos
- Supplier sharing consistente com folder sharing (mesmo padrao)
- Catalogo de suppliers do owner protegido — partilha e explicita
- Modelo de acesso documentado em 3 camadas claras

**Negativas:**
- Migracao manual necessaria em cada environment (script one-time)
- InviteCollaboratorModal mais complexo (folders + suppliers)

---

## ADRs Relacionados

- [ADR-006](ADR-006-authentication-authorization.md) — Authentication & Authorization (Secao 1.2 substituida)
- [ADR-008](ADR-008-stripe-billing-architecture.md) — Stripe Billing (webhook ACTIVE group removido)
- [ADR-015](ADR-015-event-collaboration-access-control.md) — Event Collaboration (base para supplier sharing)
