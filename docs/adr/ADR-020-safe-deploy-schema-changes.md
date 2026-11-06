# ADR-020: Deploy seguro de alterações ao schema DynamoDB

**Status:** Aceite
**Data:** 2026-02-17
**Autor:** Ney Carvalho
**Contexto:** Perda de dados no sandbox MacBook durante deploy das branches `data_table_update` e `role-bux-fix`

---

## Incidente

Durante o desenvolvimento das features ADR-018 (roleId) e ADR-019 (eventId nos Roles), a tabela **Participant** do sandbox MacBook foi **recriada pelo CloudFormation**, resultando na perda de **497 participantes** e **607 registos totais**.

### Cronologia

| Data | Evento |
|------|--------|
| 11 Fev | Commit `1bb80a9`: adicionou `roleId`, `belongsTo('Role')`, 35+ campos ao Participant |
| 13 Fev 18:43 | Sandbox deploy: primeira atualização da tabela (campos + GSI `gsi-Role.participants`) |
| 15 Fev 14:26 | Commit `2a1173c`: adicionou `photoUrl` ao Participant |
| **16 Fev 00:29** | **Sandbox deploy: `Custom::AmplifyDynamoDBTable` recriou a tabela Participant** |

### Evidências

```
# Tabela Event (dados preservados — criada em Nov 2025)
Created: 2025-11-28  |  Items: 1  |  participantCount: 497

# Tabela Participant (RECRIADA — dados perdidos)
Created: 2026-02-16  |  Items: 0

# Tabela Dependent (dados preservados — criada em Nov 2025)
Created: 2025-11-28  |  Items: 110
```

### Causa raiz

O Amplify Gen 2 usa `Custom::AmplifyDynamoDBTable` (um CloudFormation custom resource) em vez do nativo `AWS::DynamoDB::Table`. Este handler, ao receber um UPDATE com alterações acumuladas no schema (novo GSI via `belongsTo`, remoção de campo, adição de 35+ campos), decidiu fazer **replacement** em vez de **update-in-place**, destruindo a tabela e criando uma nova.

Este comportamento é **diferente** do DynamoDB nativo, que suporta:
- Adição de GSIs in-place
- Campos novos sem qualquer alteração à tabela (schemaless)

---

## Risco para Production/Development

As branches `data_table_update` e `role-bux-fix` introduzem as seguintes alterações ao schema que podem causar replacement:

### Alterações ao modelo Participant (ADR-018)
- `participantRole` removido
- `roleId` adicionado
- `role: a.belongsTo('Role', 'roleId')` — **cria GSI `gsi-Role.participants`**
- `photoUrl` adicionado
- 35+ campos de logística adicionados

### Alterações ao modelo Role (ADR-019)
- `eventId` adicionado (required)
- `event: a.belongsTo('Event', 'eventId')` — **cria GSI `gsi-Event.roles`**
- `.secondaryIndexes` — **cria GSI `byEventId`**

### Alterações ao modelo DocumentFolder (ADR-021)
- `isDefault` adicionado (boolean, opcional)
- 3 custom mutations Lambda-backed: `createEventFolder`, `updateEventFolder`, `deleteEventFolder`

---

## Procedimento de deploy seguro

### 1. ANTES do merge — Backup completo

```bash
# Definir sufixo do ambiente
SUFFIX="xxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production
# SUFFIX="xxxxxxxxxxxxxxxxxxxxxxxxxx"  # Development

# Backup das tabelas que podem ser recriadas
for TABLE in Participant Dependent Role Event DocumentFolder; do
  echo "Backing up $TABLE..."
  aws dynamodb scan \
    --table-name "${TABLE}-${SUFFIX}-NONE" \
    --region eu-west-1 \
    --output json > "backup-${TABLE}-$(date +%Y%m%d).json"
  echo "  Items: $(python3 -c "import json; print(json.load(open('backup-${TABLE}-$(date +%Y%m%d).json'))['Count'])")"
done
```

### 2. Fazer merge e monitorizar o deploy

```bash
# Monitorizar o CloudFormation stack durante o deploy
STACK="amplify-bafatorioapp-main-branch-..."  # nome do stack de production

# Verificar se alguma tabela está a ser DELETED/REPLACED
aws cloudformation describe-stack-events \
  --stack-name "$STACK" \
  --region eu-west-1 \
  --query 'StackEvents[?ResourceStatus==`DELETE_IN_PROGRESS`].[Timestamp,LogicalResourceId]' \
  --output table
```

### 3. SE houver perda de dados — Restaurar

```bash
# Restaurar de backup (usa batch-write-item em lotes de 25)
python3 -c "
import json, boto3

dynamodb = boto3.client('dynamodb', region_name='eu-west-1')
TABLE = 'Participant-${SUFFIX}-NONE'

with open('backup-Participant-YYYYMMDD.json') as f:
    data = json.load(f)

items = data['Items']
batch = []
for item in items:
    batch.append({'PutRequest': {'Item': item}})
    if len(batch) == 25:
        dynamodb.batch_write_item(RequestItems={TABLE: batch})
        batch = []
if batch:
    dynamodb.batch_write_item(RequestItems={TABLE: batch})

print(f'Restored {len(items)} items')
"
```

### 4. DEPOIS do deploy — Correr migrações

As migrações devem ser corridas **por ordem** e apenas depois do deploy ter terminado com sucesso.

#### Migração 0: Cognito Groups — REGISTERED/MANAGER → USER/ADMIN (ADR-006)

Migra os grupos Cognito antigos (REGISTERED, MANAGER, ACTIVE, TEST) para os novos (USER, ADMIN). Necessária para que a autenticação funcione com as novas authorization rules do schema.

Fases:
1. **migrate** — REGISTERED → USER, MANAGER → ADMIN + USER, ACTIVE/TEST → USER (safety net)
2. **cleanup** — Remove utilizadores dos grupos antigos (correr apenas após validar que tudo funciona)

```bash
# Obter o User Pool ID do ambiente
# Development / Production — verificar no Amplify Console ou AWS Cognito

# Migração (dry-run primeiro)
USER_POOL_ID=<pool-id> npx tsx scripts/migrate-cognito-groups.ts --dry-run
USER_POOL_ID=<pool-id> npx tsx scripts/migrate-cognito-groups.ts

# Cleanup (só após validar que login e permissões funcionam)
USER_POOL_ID=<pool-id> npx tsx scripts/cleanup-cognito-groups.ts --dry-run
USER_POOL_ID=<pool-id> npx tsx scripts/cleanup-cognito-groups.ts
```

**Nota:** Ambos os scripts são idempotentes — seguros de re-executar. A migração cria os grupos USER/ADMIN se não existirem. O cleanup só remove utilizadores dos grupos antigos, não apaga os grupos.

#### Migração 1: participantRole → roleId (ADR-018)

Converte o campo legacy `participantRole` (string hardcoded: "attendee", "vip", etc.) para o novo campo `roleId` (FK para a tabela Role).

Para cada participante com `participantRole` mas sem `roleId`:
1. Cria um Role record com o nome correspondente (se não existir)
2. Atualiza o participante: `SET roleId = :id REMOVE participantRole`

```bash
# Dry-run (ver o que muda, sem alterar dados)
node scripts/migrate-participant-roles.mjs --suffix $SUFFIX

# Executar
node scripts/migrate-participant-roles.mjs --suffix $SUFFIX --execute
```

**Nota:** Esta migração NÃO é bloqueante. Os Lambdas `list-event-participants` e `update-participant-collaborator` têm fallback que resolve `participantRole` → `roleId` automaticamente. A migração é recomendada para limpeza de dados.

#### Migração 2: Adicionar eventId aos Roles (ADR-019)

Torna os Roles **event-scoped** adicionando `eventId` a cada Role existente, com base nos Participants que o utilizam.

Algoritmo para cada Role sem `eventId`:
1. Mapeia `roleId → Set<eventId>` via tabela Participant
2. **1 evento** → UPDATE role: `SET eventId = thatEventId`
3. **0 eventos** → DELETE role (órfão, nenhum participante o usa)
4. **N eventos** → Mantém original para 1.o evento, CLONE para restantes, UPDATE `participant.roleId` dos clones

```bash
# Dry-run (ver o que muda, sem alterar dados)
node scripts/migrate-roles-add-eventId.mjs --suffix $SUFFIX

# Executar
node scripts/migrate-roles-add-eventId.mjs --suffix $SUFFIX --execute
```

**Nota:** Esta migração É importante. Sem ela, os Roles antigos (sem `eventId`) não aparecem nas queries Lambda `getEventRoles` que filtram por `eventId`. Roles novos criados após o deploy já incluem `eventId` automaticamente.

#### Migração 3: Mover documentos root para pasta "Geral" (ADR-021)

Move ficheiros S3 que estão na raiz do evento (`event-documents/{eventId}/{file}`) para dentro da pasta "Geral" (`event-documents/{eventId}/{defaultFolderId}/{file}`). Cria a pasta "Geral" se não existir.

```bash
# Definir variáveis de ambiente
export EVENT_TABLE="Event-${SUFFIX}-NONE"
export FOLDER_TABLE="DocumentFolder-${SUFFIX}-NONE"
export S3_BUCKET="amplify-bafatorioapp-mai-bafaboriofilestoragebuck-xxxxx"  # verificar no Amplify Console

# Dry-run (ver o que muda, sem alterar dados)
node scripts/migrate-root-docs-to-default-folder.mjs

# Executar
node scripts/migrate-root-docs-to-default-folder.mjs --execute
```

**Nota:** Esta migração é recomendada mas NÃO bloqueante. O frontend já redireciona uploads root para a pasta "Geral" automaticamente. A migração apenas move ficheiros antigos que foram uploaded antes desta feature.

#### Resultado esperado por ambiente

| Ambiente | Migração 0 (Cognito) | Migração 1 (roleId) | Migração 2 (eventId) | Migração 3 (root docs) |
|----------|----------------------|---------------------|----------------------|------------------------|
| Development | Migra grupos Cognito | Cria Roles + atualiza participantes | Atribui eventId aos Roles criados | Move docs root → pasta "Geral" |
| Production | Migra grupos Cognito | Cria Roles + atualiza participantes | Atribui eventId aos Roles criados | Move docs root → pasta "Geral" |

#### Ordem completa de operações

```
 1. Backup de todas as tabelas (Participant, Dependent, Role, Event, DocumentFolder)
 2. Merge da branch → Amplify deploy automático
 3. Monitorizar CloudFormation events (verificar se há table replacement)
 4. SE houve perda de dados → restaurar de backup
 5. Correr migração 0: migrate-cognito-groups.ts (Cognito groups)
 6. Correr migração 1: migrate-participant-roles.mjs --execute (roleId)
 7. Correr migração 2: migrate-roles-add-eventId.mjs --execute (eventId)
 8. Correr migração 3: migrate-root-docs-to-default-folder.mjs --execute (docs root → Geral)
 9. Verificar na app: login funciona, participantes visíveis, roles no dropdown, colaboradores veem roles, pasta Geral visível
10. Após validação estável: cleanup-cognito-groups.ts (remover grupos antigos)
```

---

## Sufixos por ambiente

| Ambiente | Sufixo | Participantes (estimativa) |
|----------|--------|---------------------------|
| Sandbox MacBook | `<api-id>` | 0 (perdidos) |
| Sandbox devsandbox | `<api-id>` | ~1 |
| Development | `<api-id>` | ~500 |
| **Production** | `<api-id>` | **~775** |

---

## Prevenção futura

1. **Backup SEMPRE antes de deploy com alterações ao schema** — mesmo para campos opcionais
2. **Nunca confiar em dados de sandbox** — manter scripts de seed para recriar dados
3. **Testar deploys num ambiente non-production primeiro** (Development antes de Production)
4. **Monitorizar CloudFormation events** durante o deploy para detetar table replacements
5. **Considerar DynamoDB Point-in-Time Recovery (PITR)** para tabelas críticas em production:
   ```bash
   aws dynamodb update-continuous-backups \
     --table-name "Participant-${SUFFIX}-NONE" \
     --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
     --region eu-west-1
   ```

---

## Consequências

- Deploy em production requer backup prévio obrigatório
- Ordem de operações: backup → merge → monitorizar → restaurar (se necessário) → migrar
- PITR deve ser ativado nas tabelas Participant, Dependent, Role e DocumentFolder em production
