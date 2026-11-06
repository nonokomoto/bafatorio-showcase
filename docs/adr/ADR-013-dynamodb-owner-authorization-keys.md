# ADR-013: DynamoDB Owner Authorization & Composite Keys

**Status:** Implemented  
**Date:** 2026-01-24  
**Authors:** Bafatorio Development Team  
**Related:** ADR-006 (Authentication & Authorization), ADR-004 (Backend Architecture)

> **Update 2026-07-10 (sunset launch v1.0):** the Notes and Akili-chat models
> (`Note`, `ConversationMessage`) were removed from the schema. See
> `docs/plans/2026-07-02-feature-sunset-design.md` and PR #154. The
> owner-authorized model list below reflects the removal.

---

## Context

O Bafatorio utiliza Amplify Gen 2 com autorização `rules.owner()` nos modelos GraphQL, o que tem impacto direto na estrutura das tabelas DynamoDB. Descobrimos que Lambda functions que acessam DynamoDB diretamente estavam falhando com erro "Resource not found" devido ao uso incorreto de chaves de busca.

### Problema Identificado

```typescript
// ❌ ERRO: Lambda tentava buscar apenas pelo ID
const getItemCmd = new GetItemCommand({
    TableName: EVENT_SUPPLIER_TABLE_NAME,
    Key: marshall({ id: eventSupplierId }),
});
// Resultado: ResourceNotFoundException - "Requested resource not found"
```

**Root Cause:** Quando um modelo Amplify usa `.authorization(rules.owner())`, o DynamoDB automaticamente cria uma **chave composta**:
- **Partition Key**: `owner` (formato: `userId::userId`)
- **Sort Key**: `id` (UUID do recurso)

---

## Decision

### Arquitetura de Chaves DynamoDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DYNAMODB TABLE KEY STRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Modelos com rules.owner() → Chave Composta                                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         DynamoDB Table                                 │ │
│  ├──────────────────────────┬──────────────────┬─────────────────────────┤ │
│  │  owner (Partition Key)   │  id (Sort Key)   │  Outros Atributos       │ │
│  ├──────────────────────────┼──────────────────┼─────────────────────────┤ │
│  │  user123::user123        │  event-abc-123   │  eventTitle: "..."      │ │
│  │  user123::user123        │  event-def-456   │  eventTitle: "..."      │ │
│  │  user456::user456        │  event-xyz-789   │  eventTitle: "..."      │ │
│  └──────────────────────────┴──────────────────┴─────────────────────────┘ │
│                                                                             │
│  • Partition Key organiza dados por usuário                                 │
│  • Sort Key permite busca eficiente dentro da partição                      │
│  • Queries DEVEM incluir AMBAS as chaves                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### 1. Modelos Afetados

Todos os modelos com `rules.owner()` no schema usam chave composta:

```typescript
// amplify/data/resource.ts

// ✅ Modelos com chave composta (owner + id):
Event              // rules.owner()
Supplier           // rules.owner()
EventSupplier      // rules.owner()
Participant        // rules.owner()
Dependent          // rules.owner()
UserSubscription   // rules.owner() + rules.group('USER')
PaymentMethodData  // rules.owner() + rules.group('USER')
Invoice            // rules.owner() + rules.group('USER')

// ❌ Modelos SEM owner (chave simples - apenas id):
PricingPlan        // rules.publicApiKey()
StripeEvent        // rules.allow.all()
```

### 2. Lambda Function Pattern

**Padrão Correto para Lambdas que Acessam Modelos com Owner:**

```typescript
// amplify/function/*/handler.ts

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AppSyncResolverEvent } from 'aws-lambda';

export const handler = async (
    event: AppSyncResolverEvent<HandlerArguments>
): Promise<HandlerReturn> => {
    // 🔑 PASSO 1: Extrair owner do contexto AppSync (Cognito identity)
    const identity = event.identity as { sub?: string };
    const sub = identity?.sub;
    if (!sub) {
        console.error("Identity error: owner not found in request context");
        throw new Error("User identity not found");
    }
    // 🔑 PASSO 2: Formatar owner para o padrão Amplify Gen 2 (userId::userId)
    const owner = `${sub}::${sub}`;

    const { resourceId } = event.arguments;
    console.log(`Processing request for resource: ${resourceId} (owner: ${owner})`);

    try {
        // ✅ PASSO 2: Incluir owner na chave do DynamoDB
        const getItemCmd = new GetItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ 
                owner: owner,    // Partition Key
                id: resourceId   // Sort Key
            }),
            ConsistentRead: true,  // Opcional: strong consistency
        });

        const result = await client.send(getItemCmd);
        const item = result.Item ? unmarshall(result.Item) : null;

        if (!item) {
            throw new Error(`Resource ${resourceId} not found`);
        }

        return item;
    } catch (error) {
        console.error(`Error accessing resource:`, error);
        throw error;
    }
};
```

### 3. Lambda Functions Corrigidas

As seguintes Lambda functions foram atualizadas para usar o padrão correto:

#### 3.1 EventSupplier Operations

```
amplify/function/supplier/handler.ts
  └── processSupplierApproval
      • GetItemCommand: owner + id
      • Update EventSupplier: owner + id
      • Update Event: owner + id

amplify/function/process-supplier-payment/handler.ts
  └── processSupplierPayment
      • GetItemCommand: owner + id
      • Update EventSupplier: owner + id
      • Update Event: owner + id

amplify/function/remove-eventSupplier/handler.ts
  └── removeEventSupplier
      • GetItemCommand: owner + id
      • Delete EventSupplier: owner + id
      • Update Event: owner + id

amplify/function/rever-event-supplier-aproval/handler.ts
  └── revertEventSupplierApproval
      • GetItemCommand: owner + id
      • Update EventSupplier: owner + id
      • Update Event: owner + id

amplify/function/adjust-approved-event-supplier-quote/handler.ts
  └── adjustApprovedEventSupplierQuote
      • GetItemCommand: owner + id
      • Update EventSupplier: owner + id
      • Update Event: owner + id
```

#### 3.2 Collaboration Operations (ADR-015)

```
amplify/function/get-event-as-collaborator/handler.ts
  └── getEventAsCollaborator
      • GetItem Event: owner + id
      • Query EventCollaborator GSI: byEventId
      • Uses normalizeUserId() for owner comparison

amplify/function/invite-collaborator/handler.ts
  └── inviteCollaborator
      • GetItem Event: owner + id (verify inviter)
      • PutItem EventCollaborator

amplify/function/revoke-collaborator/handler.ts
  └── revokeCollaborator
      • GetItem EventCollaborator (verify permissions)
      • DeleteItem EventCollaborator
      • Uses normalizeUserId()

amplify/function/list-event-collaborators/handler.ts
  └── listEventCollaborators
      • Query EventCollaborator GSI: byEventId
      • Uses normalizeUserId()

amplify/function/list-event-folders/handler.ts
  └── listEventFolders
      • Query DocumentFolder GSI: byEventId
      • Uses normalizeUserId()

amplify/function/list-event-suppliers/handler.ts
  └── listEventSuppliers
      • Query EventSupplier por eventId
      • Uses normalizeUserId()

amplify/function/update-collaborator-folders/handler.ts
  └── updateCollaboratorFolders
      • GetItem EventCollaborator
      • UpdateItem EventCollaborator
      • Uses normalizeUserId()

amplify/function/select-event-supplier/handler.ts
  └── selectEventSupplier
      • GetItem Event: owner + id
      • PutItem/UpdateItem EventSupplier

amplify/function/approve-supplier-selection/handler.ts
  └── approveSupplierSelection
      • GetItem EventSupplier: owner + id
      • UpdateItem EventSupplier
```

### 4. normalizeUserId Pattern

As Lambdas de colaboração (ADR-015) precisam comparar o owner de um item DynamoDB (formato `userId::userId`) com o `sub` do AppSync identity (formato `userId`). Para isso, usam `normalizeUserId()`:

```typescript
/**
 * Normalize user ID to handle both Amplify formats:
 * - "userId::userId" (Amplify Gen 2 owner format in DynamoDB)
 * - "userId" (plain Cognito sub from AppSync identity)
 */
const normalizeUserId = (id: string): string => {
  if (!id) return id;
  return id.split('::')[0];
};

// Uso: comparação resiliente de owner
const isOwner = normalizeUserId(eventItem.owner) === normalizeUserId(userId);
```

**Distinção importante:**
- **Key Construction** (para GetItem/PutItem): Usa `owner: \`${sub}::${sub}\`` — formato duplicado obrigatório
- **Owner Comparison** (para verificar se é o dono): Usa `normalizeUserId()` — compara apenas a parte base

**Lambda Functions que usam normalizeUserId():**
- `get-event-as-collaborator`
- `invite-collaborator`
- `revoke-collaborator`
- `list-event-collaborators`
- `list-event-folders`
- `list-event-suppliers`
- `update-collaborator-folders`

### 5. Transaction Operations

Para transações DynamoDB, **todas** as operações devem incluir o owner:

```typescript
const transactItems = [
    {
        Update: {
            TableName: EVENT_SUPPLIER_TABLE_NAME,
            Key: marshall({ 
                owner: owner,           // ✅ Obrigatório
                id: eventSupplierId 
            }),
            UpdateExpression: "SET #status = :newStatus",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: marshall({ ":newStatus": "APPROVED" })
        }
    },
    {
        Update: {
            TableName: EVENT_TABLE_NAME,
            Key: marshall({ 
                owner: owner,           // ✅ Obrigatório
                id: eventId 
            }),
            UpdateExpression: "SET committedExpenses = committedExpenses + :amount",
            ExpressionAttributeValues: marshall({ ":amount": quoteAmount })
        }
    }
];

const transactCmd = new TransactWriteItemsCommand({ TransactItems: transactItems });
await client.send(transactCmd);
```

---

## Consequences

### Positive

1. **✅ Segurança Reforçada**
   - Owner é sempre verificado nas operações de DynamoDB
   - Impossível aceder dados de outros utilizadores mesmo com o ID

2. **✅ Queries Eficientes**
   - DynamoDB pode usar partition key para distribuição eficiente
   - Queries dentro de uma partição (owner) são rápidas

3. **✅ Consistência com Amplify**
   - Pattern alinhado com o modelo de autorização do Amplify
   - GraphQL API e Lambda functions usam mesma estrutura

4. **✅ Debugging Melhorado**
   - Logs incluem owner para rastreamento
   - Erros de autorização são mais claros

### Negative

1. **⚠️ Complexidade Adicional**
   - Lambdas precisam sempre extrair e incluir owner
   - Mais código boilerplate em cada função

2. **⚠️ Migration Challenges**
   - Lambdas existentes precisam ser atualizadas
   - Testes devem validar contexto AppSync

3. **⚠️ Erro Comum para Novos Desenvolvedores**
   - Fácil esquecer de incluir owner na chave
   - Erro "Resource not found" pode ser confuso

---

## Best Practices

### 1. Template para Novos Lambdas

```typescript
/**
 * Template for Lambda functions accessing owner-protected models
 */
export const handler = async (event: AppSyncResolverEvent<Args>): Promise<Result> => {
    // 1. Extract owner from AppSync context (type assertion for Cognito identity)
    const identity = event.identity as { sub?: string };
    const sub = identity?.sub;
    if (!sub) {
        throw new Error("User identity not found");
    }
    // 2. Format owner for Amplify Gen 2 storage pattern (userId::userId)
    const owner = `${sub}::${sub}`;

    // 3. Log with owner for debugging
    console.log(`Operation for ${args.resourceId} (owner: ${owner})`);

    // 3. Always include owner in DynamoDB operations
    const key = marshall({ owner, id: args.resourceId });
    
    // 4. Handle errors appropriately
    try {
        // Your logic here
    } catch (error) {
        console.error(`Error for owner ${owner}:`, error);
        throw error;
    }
};
```

### 2. Testing Checklist
` com `{ sub: 'test-user-id' }` nos testes
- [ ] Validar type assertion `as { sub?: string }` compila sem erro
- [ ] Mock `event.identity.sub` nos testes
- [ ] Validar que todas as operações DynamoDB incluem owner
- [ ] Testar cenário de owner ausente (deve falhar)
- [ ] Testar acesso cross-owner (deve falhar)
- [ ] Validar logs incluem owner para debugging

### 3. Code Review Checklist

Ao revisar Lambdas que acedem DynamoDB:

- [ ] Verifica se modelo usa `rules.owner(` com type assertion `as { sub?: string }`
- [ ] Valida tratamento de owner ausente
- [ ] Verifica se `Key` inclui `owner` + `id`
- [ ] Confirma que transações incluem owner em todos os items
- [ ] Valida que TypeScript compila sem erros TS2339
- [ ] Confirma que transações incluem owner em todos os items

### 4. Error Handling

```typescript
// ✅ Bom: Error handling específico
try {
    const result = await client.send(command);
    if (!result.Item) {
        throw new Error(`Resource ${id} not found for owner ${owner}`);
    }
} catch (error) {
    if (error.name === 'ResourceNotFoundException') {
        // Owner incorreto ou recurso não existe
        console.error(`DynamoDB resource not found. Owner: ${owner}, ID: ${id}`);
    }
    throw error;
}
```

### 2. Reserved Keywords em Expressions DynamoDB

Quando `owner` é usado em `KeyConditionExpression`, `ProjectionExpression` ou outras expressions DynamoDB, deve ser referenciado com alias porque `owner` é uma reserved keyword.

```typescript
// ❌ Pode falhar com "Attribute name is a reserved keyword"
KeyConditionExpression: 'owner = :owner'

// ✅ Usar alias
KeyConditionExpression: '#owner = :owner',
ExpressionAttributeNames: {
  '#owner': 'owner',
}
```

Isto aplica-se mesmo quando o atributo `owner` existe corretamente no modelo e no índice.

---

## Troubleshooting

### Problema: "Resource not found" Error

**Sintomas:**
```
ResourceNotFoundException: Requested resource not found
```

**Diagnóstico:**
1. Verificar se Lambda inclui `owner` na chave:
   ```typescript
   // ❌ Errado
   Key: marshall({ id: resourceId })
   
   // ✅ Correto
   Key: marshall({ owner: owner, id: resourceId })
   ```

2. Verificar logs do CloudWatch:
   ```
   Look for: "owner: undefined" ou "owner not found"
   ```

3. Verit identity = event.identity as { sub?: string };
   console.log('Identity sub:', identity?.sub);
   // Deve conter: 'user-id-here'
   ```

### Problema: TypeScript Error TS2339

**Sintomas:**
```
Property 'sub' does not exist on type 'AppSyncIdentityIAM | AppSyncIdentityCognito...'
```

**Solução:**
```typescript
// ❌ Errado - TypeScript não sabe qual tipo de identity
const owner = event.identity?.sub;

// ✅ Correto - Type assertion para Cognito identity
const identity = event.identity as { sub?: string };
const owner = identity?.sub;
```

**Explicação:** AppSync suporta múltiplos tipos de autenticação (IAM, Cognito, OIDC, Lambda). O tipo `event.identity` é um union type. Como nossa aplicação usa exclusivamente Cognito, fazemos type assertion para `{ sub?: string }` que representa a estrutura da identidade Cognito.sole.log('Identity:', JSON.stringify(event.identity));
   // Deve conter: { sub: 'user-id-here', ... }
   ```

### Problema: Owner Format Incorreto

**Sintomas:**
```
Owner no DynamoDB: "00000000-0000-0000-0000-000000000000::00000000-0000-0000-0000-000000000000"
Owner no Lambda (errado): "00000000-0000-0000-0000-000000000000"
```

**Solução:**
O Amplify Gen 2 armazena o owner no formato duplicado `userId::userId`. Devemos formatar o `sub` antes de usar:

```typescript
// ❌ Errado - sub não formatado
const owner = identity?.sub;

// ✅ Correto - formatar para padrão Amplify Gen 2
const sub = identity?.sub;
const owner = `${sub}::${sub}`;
```

**Explicação:** O Amplify Gen 2 usa o formato `identityId::userId` para o campo owner. Em setups com Cognito User Pools (sem Identity Pool federado), ambos os valores são iguais, resultando em `userId::userId`.

---

## Related Documentation

- **ADR-006:** Authentication & Authorization Architecture
- **ADR-004:** Amplify Backend Complete Architecture
- **ADR-015:** Event Collaboration & Access Control — **normalizeUserId usage in collaboration Lambdas**
- **Amplify Docs:** [Owner-based Authorization](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/)
- **DynamoDB Docs:** [Partition Keys and Sort Keys](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)

---

## Revision History

| Date       | Version | Changes                                      | Author              |
|------------|---------|----------------------------------------------|---------------------|
| 2026-01-24 | 1.0     | Initial ADR documenting owner key pattern    | Bafatorio Dev Team  |
| 2026-02-05 | 1.1     | Adicionado normalizeUserId pattern, collaboration Lambdas | Bafatorio Dev Team  |

---

## Approval

- [x] Technical Lead
- [x] Backend Team
- [x] Security Review

**Approved by:** Bafatorio Development Team  
**Date:** 2026-01-24
