# Auth_dev — Auditoria de Segurança: Registo/Login e Método de Pagamento

Data: 2026-07-28
Escopo: fluxo de registo/login (Cognito) e fluxo de seleção/validação do método de pagamento (Stripe/Billing).
Metodologia: leitura direta do estado atual do código (não diff), com verificação adversarial independente de cada finding antes de ser reportado aqui.

---

## Vulnerabilidade 1 — IDOR na mutation `updatePaymentMethod`

**Severidade:** HIGH

**Categoria:** IDOR / Broken Authorization

**Confiança:** 9/10 (confirmado com verificação adversarial independente)

**Estado:** ✅ Corrigido (2026-07-28, branch `fix/update-payment-method-idor`) — mutation eliminada por completo

### Ficheiros envolvidos

- `amplify/function/update-payment-method/handler.ts:81-113`
- `amplify/data/resource.ts:1274-1290` (definição da mutation GraphQL)
- `amplify/backend.ts:171-172, 545-546` (wiring — confirma que estava deployed e acessível)

### Descrição

A mutation `updatePaymentMethod` aceitava `userId` como argumento simples vindo do cliente:

```ts
// amplify/data/resource.ts:1274-1290 (removido)
updatePaymentMethod: a
  .mutation()
  .arguments({
    userId: a.string(),
    paymentMethodId: a.string(),
  })
  .authorization((rules) => [
    rules.authenticated(),
  ])
  .handler(a.handler.function(updatePaymentMethod)),
```

O handler usava esse `userId` diretamente, sem nunca comparar com a identidade real do chamador (`event.identity.sub`):

```ts
// amplify/function/update-payment-method/handler.ts:81-98 (removido)
export async function handler(event: { arguments: UpdatePaymentMethodInput }, context: Context) {
  const input: UpdatePaymentMethodInput = event.arguments;
  const userSubscription = await getUserSubscription(input.userId); // sem verificação de posse
  if (!userSubscription || !userSubscription.stripeCustomerId) {
    throw new Error('...');
  }
  const billingPortalUrl = await createBillingPortalSession(userSubscription.stripeCustomerId);
  return { success: true, billingPortalUrl };
}
```

`getUserSubscription(userId)` fazia um `GetItemCommand` simples, indexado pelo `userId` fornecido — sem qualquer verificação de que esse `userId` pertencia ao chamador autenticado.

As funções irmãs (`create-biling-portal-session/handler.ts`, `create-checkout-session/handler.ts`) resolvem o `userId` corretamente a partir de `event.identity.sub` (identidade validada pelo Cognito), e têm comentários explícitos no código a avisar contra exatamente este erro — este handler era a exceção que não seguia o padrão.

### Cenário de exploração (antes da correção)

1. Um utilizador autenticado (mesmo num plano gratuito) chamava a mutation `updatePaymentMethod` diretamente contra o endpoint AppSync (não precisava de passar pela UI — a app não usava esta mutation, mas o endpoint continuava deployed e acessível a qualquer principal autenticado).
2. Fornecia como `userId` o Cognito `sub` de outra vítima (potencialmente obtível através de listas de colaboradores partilhadas, membros de eventos, ou outros pontos onde `sub`s circulam).
3. O Lambda devolvia um URL real e funcional do Stripe Billing Portal **da vítima**.
4. O atacante usava esse URL para: ver faturas e dados pessoais da vítima, alterar ou remover o método de pagamento dela, e cancelar a subscrição dela.

Impacto: takeover completo da conta de faturação de outro utilizador, sem qualquer necessidade de credenciais da vítima.

### Correção aplicada

Foi escolhida a opção de **eliminar a mutation por completo**, já que o frontend atual não a usava (foi substituída por `createBillingPortalSession` em `src/Api/services/billingApi.js`):

1. Removida a definição `updatePaymentMethod` de `amplify/data/resource.ts` (mutation + import).
2. Removido o Lambda `amplify/function/update-payment-method/` (handler.ts + resource.ts).
3. Removido o wiring em `amplify/backend.ts` (import, entrada em `defineFunction`, env vars, políticas IAM `stripeSecretsPolicy`/`kmsDecryptPolicy`).
4. Validado com `tsc --noEmit -p amplify/tsconfig.json` (sem erros), suite de testes de billing (`create-checkout-session`, `create-biling-portal-session`, `handle-stripe-webhook` — 58/58 testes) e suite completa (830/830 testes).

Pendente: regenerar o cliente GraphQL (`Graphql/*.ts`) e fazer deploy do schema atualizado via sandbox — passo que cabe ao utilizador (`npm run amplify:sandbox`), conforme as regras do projeto.

### Impacto de corrigir

- **Fecha uma exposição real de contas de faturação de terceiros** — sem esta correção, qualquer conta autenticada (incluindo contas gratuitas) podia comprometer a faturação de qualquer outro utilizador da plataforma.
- **Sem efeitos colaterais no frontend** — a mutation não era chamada por nenhuma UI atual, pelo que a remoção não quebrou nenhum fluxo existente (confirmado por grep e pela suite de testes completa).
- **Sem migração de dados necessária** — foi uma correção isolada ao Lambda e ao schema; não tocou em registos do DynamoDB nem em subscrições Stripe existentes.
- **Requer novo deploy do backend Amplify e regeneração do `Graphql/*.ts`** após a alteração do schema (passo seguinte, feito pelo utilizador via sandbox).

---

## Áreas revistas sem findings concretos (para contexto)

### Registo / Login (Cognito)

- Convites (`accept-invitation`, `decline-invitation`): email do chamador resolvido server-side via Cognito, nunca do cliente — sem IDOR.
- Roles/permissões (`create/update/delete-event-role`, `invite-collaborator`): gate consistente via `resolveEventAccess`/`hasPermission`.
- Sem secrets reais no repo — `.env.example` contém apenas placeholders; `.env` nunca foi commitado.
- Sessão/JWT geridos exclusivamente via Amplify; `useAuthz` é corretamente cosmético no cliente (enforcement real no `entitlementGate.ts` do backend).
- Nota (não é vulnerabilidade real): `src/Components/Login/accessCodeUtils.js` valida códigos de acesso beta apenas no cliente, e `/signup` é acessível diretamente por URL. É um gate de marketing, não uma fronteira de autorização — a criação de conta continua a exigir verificação de email pelo Cognito.

### Pagamentos (Stripe) — restante superfície

- Verificação de assinatura do webhook (`handle-stripe-webhook`): correta — `constructEvent` sobre o raw body, antes de qualquer parsing JSON.
- `create-checkout-session` / `create-biling-portal-session`: derivam corretamente o `userId` de `event.identity.sub`.
- Sem tampering de preço possível — `priceId` resolvido apenas server-side a partir de env vars/plan config.
- Sem bypass de entitlements — `resolveAccountEntitlements`/`resolveEventEntitlements` derivam sempre do DynamoDB, nunca de claims ou inputs do cliente.
- Bypass ADMIN (ADR-036): só atribuível via script direto (`scripts/grant-admin.mjs`), sem caminho de auto-atribuição pelo utilizador.
- Sem secrets hardcoded em nenhum handler revisto.
