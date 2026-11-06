# ADR-040 — Registos financeiros na eliminação de conta

**Estado:** Accepted (2026-08-03)
**Data:** 2026-08-03
**Relacionados:** ADR-035 (cascade de eventos), ADR-034 (reembolsos e upgrades), ADR-008 (billing/Stripe)

## Contexto

O `delete-user-data` apaga tudo o que pertence ao utilizador: eventos (pelo cascade partilhado),
participantes, fornecedores, subscrições, métodos de pagamento, logs de email e faturas.

A 2026-08-03, ao testar a eliminação de conta em `development`, apareceu um registo que sobrevivia:
o **`PlanPurchase`**. A Lambda nem sequer conhecia a tabela — o modelo nasceu com o rewrite do
billing e ninguém o acrescentou à lista. Uma conta eliminada deixava para trás `userId`, `owner`,
`stripeCheckoutSessionId`, `stripePaymentIntentId` e montantes.

Isso obrigou a decidir uma questão que estava por responder: **o que fazer aos registos que provam
uma transação quando a pessoa pede para ser esquecida.**

O estado anterior era incoerente e revelava que ninguém tinha decidido. A `Invoice` era apagada,
mas o `PlanPurchase` ficava. Se houvesse uma política de retenção deliberada, a fatura seria a
primeira coisa a conservar, não a primeira a apagar: em Portugal os documentos de faturação têm
obrigação de conservação a vários anos.

## Decisão

**Os registos financeiros são anonimizados, não apagados.** Aplica-se ao `PlanPurchase` e à
`Invoice`, que passam a seguir a mesma regra.

Anonimizar é remover o que liga o registo a uma pessoa — `owner` e `userId` — e marcar
`anonymizedAt`. Fica tudo o resto: montante, moeda, identificadores da Stripe, datas e, no caso do
`PlanPurchase`, o `consumedByEventId`.

```
antes                              depois
  userId    user-123                 (removido)
  owner     user-123::user-123       (removido)
  amount    1000                     1000
  stripeCheckoutSessionId cs_…       cs_…
                                     anonymizedAt 2026-08-03T…
```

### Porquê nem apagar nem manter

**Manter com o titular** era reter dados pessoais depois de um pedido de eliminação, sem base legal
declarada para o fazer.

**Apagar** destruía o rasto financeiro. O `PlanPurchase` é a prova de consumo compra→evento que
sustenta a política de não-reembolso do ADR-034, e é o que permite reconciliar um pagamento da
Stripe com o que a aplicação registou. Um pagamento que existe do lado da Stripe e desapareceu do
nosso lado é um problema quando alguém contesta uma cobrança.

**Anonimizar** resolve os dois: sem `owner` nem `userId` o registo deixa de ser dado pessoal do
lado da aplicação, e continua a servir de registo contabilístico e de reconciliação.

A remoção do `owner` tem um efeito prático que reforça a decisão: os modelos usam
`rules.owner().to(['read'])`, portanto um registo sem `owner` deixa de ser legível por qualquer
cliente via AppSync.

## Consequências

**Uma tabela nova com dinheiro tem de escolher lado.** Quem acrescentar um modelo financeiro deve
adicioná-lo a `anonymizeUserOwnedItems` no `delete-user-data`, não a `deleteUserOwnedItems`. O
esquecimento do `PlanPurchase` mostrou que a lista não se mantém sozinha.

**A anonimização é condicionada a `attribute_exists(id)`.** Sem isso, uma corrida entre o
`delete-user-data` e outra via de eliminação faria o `UpdateItem` recriar o registo apagado,
contendo apenas o carimbo — um item fantasma sem dados.

**Os identificadores da Stripe permanecem.** São ponteiros para uma conta Stripe onde há dados
pessoais do cliente. A eliminação desses dados é uma operação do lado da Stripe, fora do âmbito
desta decisão; se um dia for pedida, é lá que se faz.

**Não há apagamento diferido nem período de retenção configurável.** Se aparecer obrigação de
conservar por N anos e apagar depois, isso é uma decisão nova — hoje o registo anonimizado fica
indefinidamente.

## Alternativas ponderadas

**Apagar tudo, incluindo o financeiro.** Mais simples e sem dúvidas de RGPD, mas deixa de haver
forma de responder a uma disputa de cobrança ou de reconciliar com a Stripe.

**Manter o `PlanPurchase` intacto por obrigação fiscal.** Teria de vir com base legal escrita e
período definido, e continuaria a reter identificadores de pessoas. Não foi possível sustentar que
o registo interno de compra — distinto da fatura — tenha obrigação própria de conservação.

**Anonimizar só o `PlanPurchase`, deixando a `Invoice` a ser apagada.** Era a correção mínima do
lapso, mas mantinha a incoerência que revelou o problema: apagar o documento com obrigação de
conservação e guardar o registo interno.

## Verificação

`amplify/function/__tests__/delete-user-data.test.ts` fixa que ambas as tabelas são anonimizadas e
nunca apagadas, que o `UPDATE` remove `owner` e `userId` sem tocar em montantes nem em campos da
Stripe, e que é condicionado à existência do item.
