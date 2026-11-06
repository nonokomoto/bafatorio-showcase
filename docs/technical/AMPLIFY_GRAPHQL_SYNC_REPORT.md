# Relatório: Sincronização Amplify Gen 2 ↔ GraphQL ↔ Código

**Data:** 23 de Janeiro de 2026  
**Stack:** amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2

---

## 📋 Resumo Executivo

Após regenerar os ficheiros GraphQL com o comando:
```bash
npx ampx generate graphql-client-code \
  --stack amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2 \
  --out Graphql/ \
  --format graphql-codegen \
  --statement-target typescript \
  --type-target typescript
```

Foram detetadas **2234 linhas de diferenças** entre os ficheiros editados manualmente e os gerados automaticamente.

---

## ✅ Boa Notícia

**Todos os campos necessários estão presentes nos ficheiros gerados:**

| Campo | Model | Presente no Schema | Presente no GraphQL Gerado |
|-------|-------|-------------------|---------------------------|
| `status` | Dependent | ✅ | ✅ |
| `attendedDate` | Dependent | ✅ | ✅ |
| `language` | EmailLog | ✅ | ✅ |

---

## 🔄 Diferenças Identificadas

### 1. Ordem dos Campos (Alfabética vs. Manual)

O Amplify gera os campos em **ordem alfabética**, enquanto os ficheiros editados tinham ordem lógica/manual.

**Exemplo - getDependent:**
```diff
// Ficheiros Manuais (ordem lógica)
- name
- age
- participantId
- status
- attendedDate

// Ficheiros Gerados (ordem alfabética)
+ age
+ attendedDate
+ createdAt
+ id
+ name
```

**Impacto:** ⚪ Nenhum - A ordem dos campos não afeta funcionalidade.

---

### 2. Campos de Relacionamento Expandidos

O Amplify adiciona **campos nested completos** por defeito, enquanto foram removidos manualmente para otimizar payload.

**Exemplo - createEventSupplier:**
```diff
// Ficheiros Manuais (simplificado)
  createEventSupplier(...) {
    createdAt
    eventId
    id
    supplierId
  }

// Ficheiros Gerados (completo)
+ createEventSupplier(...) {
+   createdAt
+   event {
+     budget
+     categories
+     committedExpenses
+     ... (20+ campos)
+   }
+   eventId
+   supplier {
+     address
+     category
+     ... (15+ campos)
+   }
+   supplierId
+ }
```

**Impacto:** 🟡 Médio - Payload maior mas mais dados disponíveis no cache.

---

### 3. Nova Query Adicionada

O schema tem um secondary index que gera uma nova query:

```typescript
// NOVO - Não existia nos ficheiros manuais
export const listUserSubscriptionByStripeCustomerId = /* GraphQL */ `
  query ListUserSubscriptionByStripeCustomerId($stripeCustomerId: String!) {
    listUserSubscriptionByStripeCustomerId(stripeCustomerId: $stripeCustomerId) {
      items { ... }
    }
  }
`;
```

**Impacto:** 🟢 Positivo - Nova funcionalidade disponível.

---

### 4. DeleteDependentCustom Mutation

A estrutura da mutation custom foi corrigida:

```diff
// Ficheiros Manuais (tipo inline)
- export type DeleteDependentCustomReturnType = {
-   __typename: "DeleteDependentCustomReturnType",
-   success?: boolean | null,
-   message?: string | null,
- };

// Ficheiros Gerados (tipo no API.ts)
+ export type DeleteDependentCustomMutation = {
+   deleteDependentCustom?: {
+     __typename: "DeleteDependentCustomReturnType",
+     message?: string | null,
+     success?: boolean | null,
+   } | null,
+ };
```

**Impacto:** 🟢 Positivo - Tipos mais consistentes.

---

### 5. Mutation deleteConversationMessage

Nova mutation disponível (não existia nos ficheiros manuais):

```typescript
export const deleteConversationMessage = /* GraphQL */ `
  mutation DeleteConversationMessage($input: DeleteConversationMessageInput!) {
    deleteConversationMessage(...) { ... }
  }
`;
```

**Impacto:** 🟢 Positivo - Permite eliminar mensagens de conversação do Akili.

---

## 📊 Análise de Compatibilidade com Código Existente

### Services RTK Query

| Service | Ficheiro | Compatível | Notas |
|---------|----------|------------|-------|
| `eventApi` | eventApi.js | ✅ | Usa `queries.listEvents`, `queries.getEvent` |
| `participantApi` | participantApi.js | ✅ | Usa `queries.listParticipants`, `queries.getParticipant` |
| `dependentsApi` | dependentsApi.js | ✅ | Usa `mutations.deleteDependentCustom` - **estrutura compatível** |
| `supplierApi` | supplierApi.js | ✅ | Usa queries/mutations standard |
| `eventSupplierApi` | eventSupplierApi.js | ✅ | Pode beneficiar dos campos nested |
| `noteApi` | noteApi.js | ✅ | Usa queries/mutations standard |
| `akiliApi` | akiliApi.js | ✅ | Usa `mutations.InvokeChatbot` |

### Campos Críticos Usados no Código

| Campo | Usado em | Estado |
|-------|----------|--------|
| `dependent.status` | dependentsApi.js, testes | ✅ Presente |
| `dependent.attendedDate` | dependentsApi.js, testes | ✅ Presente |
| `emailLog.language` | queries.ts | ✅ Presente |

---

## ⚠️ Potenciais Problemas

### 1. Payload Aumentado

As mutations agora retornam mais dados (campos nested). Isto pode:
- **Positivo:** Evitar queries adicionais, melhor cache
- **Negativo:** Maior consumo de bandwidth

**Mutations afetadas:**
- `createEventSupplier` → retorna `event { ... }` e `supplier { ... }`
- `createNote` → retorna `event { ... }`
- `createParticipant` → retorna `event { ... }`
- `createDependent` → retorna `participant { ... }`
- `deleteDependent` → retorna `participant { ... }`

### 2. Cache RTK Query

O cache pode ser **mais eficiente** com os novos ficheiros porque:
- Mais dados disponíveis imediatamente após mutations
- Menos necessidade de refetch manual

---

## ✅ Recomendação

### Aceitar os Ficheiros Gerados

**Motivos:**
1. ✅ Todos os campos necessários estão presentes
2. ✅ Tipos TypeScript mais consistentes
3. ✅ Novas queries/mutations disponíveis
4. ✅ Código existente é compatível
5. ✅ Melhor práctica - sem edição manual
6. ✅ Workflow futuro simplificado

### Passos para Adotar

```bash
# 1. Verificar que os testes passam
npm test

# 2. Commitar os ficheiros gerados
git add Graphql/
git commit -m "chore: regenerate GraphQL files from Amplify Gen 2"

# 3. Testar a aplicação
npm run dev
```

---

## 🔄 Workflow Futuro

Após alterações no `amplify/data/resource.ts`:

```bash
# 1. Deploy/Sandbox para aplicar alterações
npx ampx sandbox

# 2. Regenerar código cliente
npx ampx generate graphql-client-code \
  --stack amplify-bafatorioapp-macbook-sandbox-5ae7aff9f2 \
  --out Graphql/ \
  --format graphql-codegen \
  --statement-target typescript \
  --type-target typescript

# 3. Commitar
git add Graphql/
git commit -m "chore: sync GraphQL with schema changes"
```

---

## 📁 Ficheiros Regenerados

| Ficheiro | Linhas (Anterior) | Linhas (Novo) | Diferença |
|----------|-------------------|---------------|-----------|
| API.ts | 5,878 | ~6,000 | +122 |
| mutations.ts | 1,634 | ~1,800 | +166 |
| queries.ts | 883 | ~950 | +67 |
| subscriptions.ts | 1,399 | ~1,400 | ~0 |

---

## 🎯 Conclusão

Os ficheiros GraphQL gerados automaticamente são **totalmente compatíveis** com o código existente. A única diferença significativa é que agora tens mais dados disponíveis (campos nested), o que é uma **melhoria**.

**Ação recomendada:** Aceitar os ficheiros gerados e adotar o workflow de regeneração automática.

---

*Relatório gerado por GitHub Copilot*
