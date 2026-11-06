# ADR-036 — Plano ADMIN: bypass de billing para contas de administração

**Estado:** Accepted (validado em dev, 2026-07-14)
**Data:** 2026-07-14
**Relacionados:** ADR-008 (billing/Stripe), ADR-019 (roles/access), modelo canónico de billing (docs/plans/2026-07-11)

## Contexto

O grupo Cognito `ADMIN` existe mas só alimenta o badge "Admin" no Header
(`Header.jsx`). Nenhum gate de billing o conhece: um administrador de
plataforma é tratado como conta Starter — 1 evento, 50 participantes, sem
relatório, janela de edição de 30 dias. Na prática, o admin não consegue
operar a plataforma sem comprar um plano.

Decisão do produto (2026-07-14): o admin tem nível Pro na **própria conta e
nos eventos que possui**. Eventos de terceiros continuam governados pelo
plano do dono — o admin não contorna o billing de outros utilizadores.

## Opções consideradas

1. **Ler `cognito:groups` do caller em cada Lambda gated** — exige alterar os
   ~33 handlers que chamam o gate e só funciona quando o caller é o dono;
   para o gate por evento (que resolve o plano do DONO, não do requester)
   seria preciso um lookup Cognito por invocação (latência + IAM em todas as
   funções).
2. **Registo UserSubscription manual com planName PRO** — zero código, mas
   indistinguível de um cliente pagante real (polui métricas e webhooks
   Stripe não têm subscrição correspondente) e invisível: ninguém sabe
   porque é que a conta funciona.
3. **Plano ADMIN como cidadão de primeira classe no domínio** (escolhida).

## Decisão

Introduzir `planName: 'ADMIN'` no registo `UserSubscription` das contas de
administração, reconhecido pelos dois núcleos de decisão como Pro-equivalente
e sempre writable:

- `deriveAccountEntitlements`: `planName === 'ADMIN'` → `canCreateEvent: true`,
  reason `ADMIN`, planKey PRO (entitlements ilimitados). O check vem ANTES da
  precedência de compras por consumir — senão um admin com uma PlanPurchase
  pendente consumi-la-ia ao criar um evento (o create-event consome quando o
  reason é PURCHASE_AVAILABLE).
- `deriveEventEntitlements`: dono com `planName === 'ADMIN'` →
  `writable: true`, reason `ADMIN`, entitlements PRO — sem janela de edição,
  independente de status Stripe (o registo ADMIN não tem ciclo Stripe).

O reconhecimento vive em `shared/plans.ts` (fonte única), espelhado em
`src/Utils/plans.js` para o gate cosmético da UI. `resolvePlanKey` continua a
devolver `null` para 'ADMIN' (não é um plano vendável); a verificação é
explícita e separada.

### Como se concede/revoga

Via `scripts/grant-admin.mjs`, que faz os dois passos (grupo Cognito + registo
DynamoDB) como uma decisão única, com dry-run por defeito, idempotência e
confirmação interativa em produção:

```bash
node scripts/grant-admin.mjs --env dev --email x@y.com --execute
node scripts/grant-admin.mjs --env dev --email x@y.com --revoke --execute
```

O script recusa o grant se a conta tiver uma UserSubscription não-ADMIN (a
restrição de conta dedicada, abaixo) e no revoke nunca apaga uma subscrição
real. O grupo Cognito `ADMIN` continua a ser a fonte do badge na UI; o
registo ADMIN é a fonte do bypass de billing. A concessão continua manual e
deliberada — corre-se o script, não é efeito colateral de mexer no grupo.

### Restrição dura: contas admin são dedicadas, sem ciclo Stripe

O webhook (`handle-stripe-webhook`) faz `PutItem` de substituição total do
UserSubscription em cada evento `customer.subscription.*` — incluindo
renovações mensais. Um registo ADMIN numa conta com subscrição Stripe ativa
seria reescrito para PRO na renovação seguinte, perdendo o bypass em
silêncio. Por isso:

1. **ADMIN só se concede a contas sem subscrição Stripe** (a
   `condition-expression` acima recusa se já existir registo).
2. **`create-checkout-session` recusa checkout quando `planName === 'ADMIN'`**
   — fecha a porta de um admin iniciar uma subscrição que destruiria o
   próprio registo. Testes de checkout Stripe fazem-se com contas de teste
   normais, não com contas admin.

## Consequências

- Nenhuma alteração aos 33 handlers gated nem chamadas Cognito no hot path —
  o bypass entra pelos dois núcleos puros já testados.
- Defesa em profundidade no webhook: `upsertSubscription` lê o registo
  existente antes do Put e salta (com log de warning) se `planName` for ADMIN
  — cobre subscrições criadas fora da app (dashboard Stripe, customer
  pré-existente), que o guard do checkout não alcança. O guard no
  create-checkout-session continua a fechar a porta do lado da app.
- O espelho frontend/backend dos planos é validado por `plans.sync.test.ts`
  — a constante ADMIN entra nos dois lados ou explicitamente só no backend,
  com o teste de sync ajustado em conformidade.
- Reason `ADMIN` novo nos contratos `AccountEntitlementReason` /
  `EntitlementReason` — o frontend não precisa de copy própria (nunca há
  recusa a explicar), mas o valor aparece em `access.reason`.
- Eventos criados por admin ficam com snapshot `planKey: 'PRO'` na criação
  (comportamento atual do create-event para contas Pro-equivalentes) — se o
  registo ADMIN for revogado, esses eventos caem em `PRO_LAPSED` (read-only),
  coerente com o modelo.

## Riscos

- Duas fontes (grupo Cognito vs registo DynamoDB) podem divergir — mitigado
  por ser deliberado (ver acima) e pelo badge/bypass terem donos diferentes.
- Um registo ADMIN criado por engano dá acesso ilimitado — a criação exige
  acesso de escrita ao DynamoDB de produção, que já é o perímetro de confiança.
