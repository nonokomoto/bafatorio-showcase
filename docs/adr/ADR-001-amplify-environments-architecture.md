# ADR-001: Arquitetura de Ambientes AWS Amplify

**Status:** Aceite  
**Data:** 2026-01-23  
**Autor:** Ney Carvalho  
**Decisores:** Ney Carvalho

---

## Contexto

O Bafatorio é uma plataforma de gestão de eventos que utiliza AWS Amplify Gen 2 como backend. Durante o desenvolvimento, foram criados múltiplos ambientes (sandboxes, development, produção) que resultaram em 5 User Pools do Cognito e múltiplas stacks CloudFormation.

É necessário documentar a arquitetura atual para:
1. Clarificar qual ambiente serve qual propósito
2. Evitar confusão entre ambientes de desenvolvimento e produção
3. Facilitar a gestão de recursos AWS
4. Permitir cleanup de recursos não utilizados

---

## Decisão

### Estrutura de Ambientes Adoptada

```
┌─────────────────────────────────────────────────────────────────┐
│                    AMPLIFY HOSTING                              │
│                    App ID: dEXAMPLEAPPID                       │
│                    Repo: github.com/nonokomoto/BafatorioApp     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  🟢 PRODUÇÃO        │    │  🟡 DEVELOPMENT     │            │
│  │  Branch: main       │    │  Branch: development│            │
│  │                     │    │                     │            │
│  │  Stack:             │    │  Stack:             │            │
│  │  amplify-d3md6mz..  │    │  amplify-d3md6mz..  │            │
│  │  ...-main-branch-   │    │  ...-development-   │            │
│  │  80b14afd35         │    │  branch-b62b964697  │            │
│  │                     │    │                     │            │
│  │  User Pool:         │    │  User Pool:         │            │
│  │  eu-west-1_XXXXXXXXX│    │  eu-west-1_XXXXXXXXX│            │
│  │                     │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SANDBOXES LOCAIS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  🔵 SANDBOX         │    │  🔵 SANDBOX         │            │
│  │  MacBook (atual)    │    │  devsandbox          │            │
│  │                     │    │                     │            │
│  │  Stack:             │    │  Stack:             │            │
│  │  amplify-bafatorio  │    │  amplify-bafatorio  │            │
│  │  app-macbook-       │    │  app-devsandbox-     │            │
│  │  sandbox-5ae7aff9f2 │    │  sandbox-40cf9a2805 │            │
│  │                     │    │                     │            │
│  │  User Pool:         │    │  User Pool:         │            │
│  │  eu-west-1_XXXXXXXXX│    │  eu-west-1_XXXXXXXXX│            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA AMPLIFY                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐                                        │
│  │  ⚙️ BACKEND MANAGER │                                        │
│  │                     │                                        │
│  │  User Pool:         │                                        │
│  │  eu-west-1_XXXXXXXXX│                                        │
│  │                     │                                        │
│  │  (Uso interno AWS)  │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Inventário de Recursos

### User Pools (Cognito)

| User Pool Name | ID | Ambiente | Criação | Estado |
|----------------|-----|----------|---------|--------|
| `amplifyAuthUserPool4BA7F805-XXXXXXXXXXXX` | eu-west-1_XXXXXXXXX | 🟢 Produção | 17 Jul 2024 | **ATIVO** |
| `amplifyAuthUserPool4BA7F805-XXXXXXXXXXXX` | eu-west-1_XXXXXXXXX | 🟡 Development | 24 Jan 2026 | **ATIVO** |
| `amplify_backend_manager_xxxxxxxxxx` | eu-west-1_XXXXXXXXX | ⚙️ Sistema | 15 Jul 2024 | **NÃO ELIMINAR** |
| `amplifyAuthUserPool4BA7F805-XXXXXXXXXXXX` | eu-west-1_XXXXXXXXX | 🔵 Sandbox MacBook | 28 Nov 2025 | **ATIVO** |
| `amplifyAuthUserPool4BA7F805-XXXXXXXXXXXX` | eu-west-1_XXXXXXXXX | 🔵 Sandbox devsandbox | 29 Jan 2026 | **ATIVO** |

### Stacks CloudFormation

| Stack | Ambiente | Último Update |
|-------|----------|---------------|
| `amplify-dEXAMPLEAPPID-main-branch-80b14afd35` | 🟢 Produção | 18 Mar 2026 |
| `amplify-dEXAMPLEAPPID-development-branch-b62b964697` | 🟡 Development | 18 Mar 2026 |
| `amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2` | 🔵 Sandbox MacBook | 20 Mar 2026 |
| `amplify-bafatorioapp-devsandbox-sandbox-40cf9a2805` | 🔵 Sandbox devsandbox | 17 Mar 2026 |

### AppSync GraphQL APIs

| API ID | URL | Ambiente |
|--------|-----|----------|
| `<api-id>` | `https://EXAMPLEAPIID.appsync-api.eu-west-1.amazonaws.com/graphql` | 🟢 Produção |
| `<api-id>` | `https://EXAMPLEAPIID.appsync-api.eu-west-1.amazonaws.com/graphql` | 🟡 Development |
| `<api-id>` | `https://EXAMPLEAPIID.appsync-api.eu-west-1.amazonaws.com/graphql` | 🔵 Sandbox MacBook |
| `<api-id>` | `https://EXAMPLEAPIID.appsync-api.eu-west-1.amazonaws.com/graphql` | 🔵 Sandbox devsandbox |

> **Nota:** O API ID aparece como sufixo nos nomes das tabelas DynamoDB (ex: `EmailLog-xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE`). É a forma mais rápida de identificar a que ambiente pertence uma tabela.

### Buckets S3

| Bucket | Ambiente | Propósito |
|--------|----------|-----------|
| `amplify-dEXAMPLEAPPID-ma-userstoragebucket33351ca-yazpmetnsyuo` | 🟢 Produção | Ficheiros de utilizadores (documentos, uploads) |
| `amplify-dEXAMPLEAPPID-de-userstoragebucket33351ca-nuqjivvgaetp` | 🟡 Development | Ficheiros de utilizadores (documentos, uploads) |
| `bafatorio-template-storage` | 🌐 Partilhado | Templates HTML de email (path: `email-templates/{pt,en,fr}/`) |
| `bafatorio-knowledge-base-source` | 🌐 Partilhado | Ficheiros fonte para RAG / knowledge base do Akili |
| `amplify-bafatorioapp-macb-userstoragebucket33351ca-ilq65tq6hpx5` | 🔵 Sandbox MacBook | Ficheiros de utilizadores |
| `amplify-bafatorioapp-devv-userstoragebucket33351ca-gjsd7wm6qxpn` | 🔵 Sandbox devsandbox | Ficheiros de utilizadores |
| `bafatoriodevdatae4de9-staging` | 🟡 Staging | Dados de staging (dev) |

### Tabelas DynamoDB (Sufixos de API ID)

| Sufixo | Ambiente |
|--------|----------|
| `*-xxxxxxxxxxxxxxxxxxxxxxxxxx-*` (`*-iiq-*`) | 🟢 Produção |
| `*-xxxxxxxxxxxxxxxxxxxxxxxxxx-*` (`*-zt4-*`) | 🟡 Development |
| `*-xxxxxxxxxxxxxxxxxxxxxxxxxx-*` (`*-rnu-*`) | 🔵 Sandbox MacBook |
| `*-xxxxxxxxxxxxxxxxxxxxxxxxxx-*` (`*-joi-*`) | 🔵 Sandbox devsandbox |

---

## Workflow de Desenvolvimento

### 1. Desenvolvimento Local (Sandbox)

```bash
# Iniciar sandbox
npx ampx sandbox

# Regenerar código GraphQL após alterações no schema
npx ampx generate graphql-client-code \
  --stack amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2 \
  --out Graphql/ \
  --format graphql-codegen \
  --statement-target typescript \
  --type-target typescript
```

### 2. Deploy para Development

```bash
git checkout development
git merge feature-branch
git push origin development
# Amplify Hosting faz deploy automático
```

### 3. Deploy para Produção

```bash
git checkout main
git merge development
git push origin main
# Amplify Hosting faz deploy automático
```

---

## Consequências

### Positivas

1. **Isolamento de dados** - Cada ambiente tem a sua própria User Pool e base de dados
2. **Segurança** - Dados de produção nunca são acedidos em desenvolvimento
3. **Flexibilidade** - Sandboxes permitem testar alterações de schema sem afetar outros
4. **CI/CD** - Deploy automático via Amplify Hosting

### Negativas

1. **Custo** - Múltiplas User Pools e recursos AWS
2. **Complexidade** - Necessário manter track de qual ambiente é qual
3. **Sincronização** - Schema deve ser mantido sincronizado entre ambientes

### Riscos

1. **Drift de schema** - Ambientes podem divergir se não houver disciplina
2. **Custos inesperados** - Sandboxes esquecidas podem acumular custos
3. **Confusão** - Desenvolvedores podem confundir ambientes

---

## Políticas

### Gestão de Sandboxes

1. **Eliminar sandboxes não utilizadas** após 30 dias de inatividade
2. **Nomear sandboxes** com identificador do computador/developer
3. **Documentar** qualquer nova sandbox neste ADR

### Gestão de Secrets (Amplify Sandbox)

> **IMPORTANTE:** O `npx ampx sandbox secret set` usa o sandbox identifier derivado do sistema atual. Se o identifier do sandbox mudou (ex: `macbook` → `neycarvalho`), os secrets serão guardados no SSM path errado e os Lambdas não os conseguirão resolver.

1. **Verificar identifier:** Confirmar que o `--identifier` passado corresponde ao stack deployado
2. **Usar `--identifier` explícito:** `npx ampx sandbox secret set SECRET_NAME --identifier macbook`
3. **Usar `printf`** (não `echo`) ao pipar valores para evitar newlines no secret:
   ```bash
   printf 'secret_value' | npx ampx sandbox secret set SECRET_NAME --identifier macbook
   ```
4. **Verificar no SSM** após set: `aws ssm get-parameter --name '/amplify/bafatorioapp/<sandbox-id>/SECRET_NAME' --with-decryption`

### Backups

1. **Produção** - Backup diário automático (Point-in-time recovery DynamoDB)
2. **Development** - Backup semanal manual
3. **Sandboxes** - Scripts locais (`scripts/backup-dev-tables.sh`)

### Acesso

| Ambiente | Quem pode aceder |
|----------|------------------|
| Produção | Deploy automático apenas |
| Development | Equipa de desenvolvimento |
| Sandboxes | Developer individual |

---

## Comandos Úteis

### Listar User Pools
```bash
aws cognito-idp list-user-pools --max-results 60 --output table
```

### Listar Stacks
```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --output json | jq -r '.StackSummaries[] | select(.StackName | startswith("amplify-bafatorio")) | select(.ParentId == null) | .StackName'
```

### Verificar Utilizadores em Produção
```bash
aws cognito-idp list-users --user-pool-id eu-west-1_XXXXXXXXX
```

### Eliminar Sandbox
```bash
npx ampx sandbox delete
```

---

## Referências

- [Amplify Gen 2 Documentation](https://docs.amplify.aws/gen2/)
- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [scripts/README.md](../scripts/README.md) - Documentação dos scripts de backup

---

## Histórico

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-01-23 | Criação inicial do ADR | Ney Carvalho |
| 2026-02-20 | Adicionado mapeamento completo de AppSync APIs, buckets S3 e sufixos DynamoDB por ambiente; adicionado sandbox devsandbox | Ney Carvalho |
| 2026-02-26 | Adicionada secção de Gestão de Secrets com lições aprendidas (mismatch de sandbox identifiers, newlines em secrets) | Ney Carvalho |
| 2026-03-20 | Atualizado inventário via AWS CLI: corrigido User Pool Development (→ pGSUNcXzC), removido Sandbox PC2 (eliminada), atualizado devsandbox (User Pool fbSIVQ47f, stack ID completo), datas das stacks, adicionado bucket staging | Ney Carvalho |
