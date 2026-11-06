# Testes de Integração

Este diretório contém testes de integração para validar funcionalidades críticas da aplicação Bafatorio.

## Testes Disponíveis

### 1. Teste do Índice GSI `byCustomerId`

**Arquivo:** `test-gsi-index.ts`

**Propósito:** Valida que o índice secundário global (GSI) `byCustomerId` na tabela `UserSubscription` está funcionando corretamente. Este índice é crucial para o webhook do Stripe, que precisa encontrar usuários pelo `stripeCustomerId`.

**Issue relacionada:** #25 - "User ID not found in DynamoDB for the given Stripe Customer ID"

**O que o teste faz:**
1. ✅ Escaneia a tabela para encontrar um `stripeCustomerId` de teste
2. ✅ Faz uma query usando o índice GSI `byCustomerId`
3. ✅ Valida que a query retorna o usuário correto
4. ✅ Testa com um customer ID inexistente (deve retornar vazio)

**Como executar:**

```bash
# Opção 1: Usando npm script
npm run test:gsi

# Opção 2: Diretamente com tsx
npx tsx tests/test-gsi-index.ts
```

**Pré-requisitos:**
- Sandbox do Amplify em execução (ou pelo menos já foi feito deploy)
- Arquivo `amplify_outputs.json` atualizado
- AWS credentials configuradas
- Pelo menos um registro de `UserSubscription` com `stripeCustomerId` no DynamoDB

**Output esperado:**

```
🧪 Testing byCustomerId GSI Index
================================

📊 Table: UserSubscription-xxxxx-NONE
🌍 Region: eu-west-1

🔍 Test 1: Scanning table to find a test customer ID...
✅ Found 1 records

📋 Sample subscriptions:
  1. User ID: 1234567890abcdef...
     Customer ID: cus_ABC123XYZ
     Status: active

🔍 Test 2: Querying using byCustomerId GSI...
   Customer ID: cus_ABC123XYZ
✅ GSI Query successful! (45ms)
📋 Found subscription:
   User ID: 1234567890abcdef1234567890abcdef
   Customer ID: cus_ABC123XYZ
   Status: active
   Plan: Premium

🔍 Test 3: Testing with non-existent customer ID...
✅ Correctly returned empty result for non-existent customer

================================
✅ All tests passed!
✅ The byCustomerId GSI is working correctly
✅ Issue #25 is resolved
```

**Em caso de erro:**

Se o índice não existir, você verá:
```
❌ GSI Query failed: The table does not have the specified index: byCustomerId
💡 The byCustomerId index does not exist!
   Make sure you deployed the schema changes.
```

**Solução:** Certifique-se de que o deployment do Amplify foi concluído com sucesso e que a mudança no `amplify/data/resource.ts` foi aplicada.

---

## Estrutura dos Testes

```
tests/
├── README.md              # Esta documentação
└── test-gsi-index.ts      # Teste do índice GSI byCustomerId
```

## Adicionar Novos Testes

Para adicionar novos testes de integração:

1. Crie um novo arquivo `.ts` neste diretório
2. Use o padrão de nomenclatura `test-*.ts`
3. Adicione um script no `package.json`:
   ```json
   "test:nome": "tsx tests/test-nome.ts"
   ```
4. Documente o teste neste README

## Notas Importantes

- Estes testes **não são** testes unitários - eles interagem com recursos reais da AWS
- Sempre execute em ambiente de desenvolvimento/sandbox
- Tenha cuidado ao executar testes que modificam dados
- Use dados de teste, não dados de produção
