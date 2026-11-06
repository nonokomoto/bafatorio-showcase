# ADR-034 — Refund & Downgrade Policy

## Status

Accepted — 2026-07-11

## Context

O modelo de billing canonico (`docs/plans/2026-07-11-billing-subscription-model.md`) define tres
planos mutuamente exclusivos — **Starter** (gratis, sem cartao), **Pay-per-event** (pagamento unico
por evento) e **Pro** (subscricao recorrente) — e ja cobre proration/upgrade em §6. Nao ha trial em
nenhum plano: **o Starter e o trial**. Faltavam duas decisoes explicitas que o ADR-008 nao regista:

1. **Refund policy.** Nao existia. Havia so implicacoes dispersas — nada consolidado, nem nas ToS,
   nem na UI.
2. **Downgrade policy.** So o caso Anual→Mensal estava em §6. Faltava declarar que Pro→Pay-per-event
   **nao e downgrade** (e cancelamento + compra separada, pois sao modos mutuamente exclusivos) e
   definir o caminho de **reverter** um downgrade agendado.

Sem isto, o redo do backend nao tem contrato claro sobre quando emitir (ou nao) `stripe.refunds.create`.

### Padrao de industria (digital goods / SaaS)

- **Subscricao mensal/anual parcialmente usada**: sem reembolso de periodo parcial (Notion, Slack, Figma).
- **Compra digital consumida**: nao reembolsavel (servico totalmente prestado com consentimento).
- **Compra digital nao consumida**: alguns reembolsam em 14 dias; o Bafatorio opta por **nao reembolsar** —
  a compra Pay-per-event nao expira ate ser usada, consistente com §4 do modelo canonico.
- **Janela de decisao**: o Starter gratis (sem cartao) substitui o trial. Quem quer testar, testa sem pagar;
  qualquer cobranca e uma decisao informada.
- **Downgrade**: diferir para `period_end` (`proration_behavior: 'none'`), sem proration negativo, sem reembolso.
- **B2C UE — direito de retratacao (14 dias)**: aplicavel a consumidores, **mas** servicos digitais totalmente
  prestados com consentimento previo estao **excluidos** (DL 24/2014 art. 9.º/18.º). Usar o produto = renuncia.
- **Chargeback**: roteado pelo Stripe Dashboard; revisao manual. Nao e via regular de reembolso.

## Decision

Adotar a politica **nunca reembolsar apos cobranca** como contrato do backend e das ToS.
Racional por plano: Starter = gratis; Pay-per-event = servico prestado; Pro = acesso ate `period_end`.

### Refund policy

| Caso | Politica |
|---|---|
| Starter | N/A — gratis, sem cartao, nada a reembolsar. E a janela de decisao. |
| Pay-per-event | **Nao reembolsavel** — nem antes nem depois de criar o evento. A compra nao expira ate ser usada. |
| Upgrade de escalão Pay-per-event (ADR-038) | **Não reembolsável.** É compra nova, cobrando só a diferença, consumida no instante em que o teto do evento sobe. |
| Redução da lista após comprar escalão | **Sem devolução.** O escalão é o preço da compra, não uma quota que se acerta a posteriori. |
| Pro apos cobranca (mensal/anual, parcial) | **Nao reembolsavel**, total ou parcial. Cancelar = acesso ate `current_period_end`. |
| Downgrade Anual → Mensal | **Sem reembolso.** Diferido para `period_end`, sem proration negativo. |
| Disputa / chargeback | Roteado pelo Stripe Dashboard; revisao manual pelo operador. |

**Autoridade do gate:** o backend e a unica autoridade. Nao existe endpoint de reembolso automatico.
Qualquer reembolso e **manual** (operador no Stripe Dashboard) e so apos confirmar que nao viola esta
politica. Regra especifica: nunca reembolsar uma compra Pay-per-event cujo evento ja foi criado —
o registo compra→evento e a prova de consumo.

### Downgrade policy

- **Downgrade so existe dentro do Pro: Anual → Mensal.** Diferido para `current_period_end`
  (`proration_behavior: 'none'`). Sem reembolso.
- **Save offer no cancelamento = Pause** (ate 3 meses, Stripe `pause_collection`): sem cobranca,
  sem escrita, subscricao e cupao 50% intactos, retoma automatica. Nao e downgrade nem cancelamento.
  (Substituiu o plano "Manutencao" edit-only — morto: eventos sao temporais, ninguem paga para
  editar eventos concluidos; consulta + relatorio cobrem a necessidade pos-evento.)
- **Pro → Pay-per-event nao e downgrade** — e cancelamento da subscricao + compra separada
  (modos mutuamente exclusivos, §4 do modelo canonico). **Pro → Starter** = cancelamento simples;
  no fim do periodo pago a conta cai para o nivel Starter e os eventos Pro ficam read-only.
- **Janela de edicao Pay-per-event/Starter** (§4 do modelo canonico): escrita ate
  `min(fim do evento + 30 dias, criacao + 14 meses)`; depois read-only (consulta + relatorio PDF
  se o nivel o tinha). A compra por usar continua a nao expirar.
- **Reverter downgrade agendado**: permitido ate `current_period_end`. Implementar via **Stripe
  Subscription Schedules** (em vez de `subscriptions.update` com `none`) para dar ao cliente um
  `phases[1].start_date` visivel e anulavel, e uma alavanca clara no UX de preview (§6).

### Upgrade de escalão do Pay-per-event (2026-08-02, ADR-038)

O Pay-per-event passou a escalonar por participantes, o que cria um caso que esta política não
respondia: comprou "até 100", a lista cresceu para 180. Sem caminho definido, o cliente fica entre
pagar duas vezes o evento e pedir suporte manual, e a regra de não reembolsar torna isso pior.

**Decisão: o upgrade é uma compra nova, não uma alteração da compra anterior.** Cobra apenas a
diferença entre os dois escalões, gera o seu próprio registo de compra e a sua própria fatura. A
compra original mantém-se consumida pelo evento e intocada; nada se estorna nem se reemite.

Consequências que isto fixa:

- **Cada upgrade é ele próprio não reembolsável**, pela mesma razão da compra original: o serviço
  presta-se no instante em que o teto sobe.
- **Não existe downgrade de escalão.** Reduzir a lista depois de comprar não devolve dinheiro. O
  escalão é o preço pago pela compra, não uma quota que se acerta no fim.
- **Cada evento pode acumular várias compras** (a original mais os upgrades). O registo
  compra→evento, que já é a prova de consumo desta política, passa a ser uma relação de um para
  muitos.

**Os valores das diferenças não vão para o catálogo Stripe.** Com três escalões há três diferenças
possíveis, e cada alteração do preço de um escalão obrigaria a recalcular e reemitir todas elas: o
número de preços a manter cresce com o quadrado dos escalões. A diferença calcula-se no servidor a
partir da fonte única (`shared/plans.ts`) e cobra-se por `price_data` inline, contra um produto
dedicado "Pay-per-event — upgrade de escalão" para o relatório da Stripe não ficar cheio de linhas
avulsas. Vale a mesma regra do checkout normal: o cliente envia a intenção, o servidor resolve o
valor, e o `tax_behavior` continua `inclusive`.

### Interface e comunicacao

- A janela de decisao e o **Starter gratis**, nao uma garantia pos-cobranca. UI e ToS declaram-no sem
  ambiguidade — o checkout (Pay-per-event e Pro) mostra "compra final, sem reembolso" antes de confirmar.
- O cancelamento do Pro e self-service via Stripe Billing Portal; o botao \"cancelar\" mostra \"mantem o
  acesso ate {{current_period_end}}\" antes de confirmar.
- As ToS (pt-PT, en-US, fr-FR) declaram a exclusao do direito de retratacao UE para servicos digitais prestados.

### Implementacao (backend redo — checklist)

- Nao criar `refund` mutation GraphQL. Reembolso e manual no Stripe Dashboard.
- Webhook `charge.refunded` (ou `refund.created`) nao deve re-abrir acesso revogado para compras
  Pay-per-event consumidas; mirror do estado apenas para fins de auditoria/Invoice.
- Downgrade Anual→Mensal via `stripe.subscriptionSchedules.create({ subscription, phases: [
    { items: [{ price: ANNUAL }] },
    { items: [{ price: MONTHLY }], start_date: current_period_end },
  ] })`. Reverter = `subscriptionSchedules.release(schedule_id)`.
- UI de cancelamento: preview `current_period_end` antes de confirmar (ja em §6 do modelo canonico).
- Upgrade de escalão: sessão de checkout própria com `price_data` inline (diferença calculada no
  servidor a partir de `shared/plans.ts`, `tax_behavior: 'inclusive'`), novo registo de compra
  ligado ao mesmo evento, e o teto de participantes do evento a subir só no webhook, depois do
  pagamento confirmado. Nunca subir o teto no retorno do checkout.
  > **Onde vive (2026-08-03):** a sessão é criada pela **mesma** `create-checkout-session`, com um
  > argumento `intent: 'TIER_UPGRADE'` + `eventId` a distinguir os dois caminhos. Uma Lambda própria
  > duplicaria a recolha de dados de faturação, a resolução do customer Stripe e a validação de
  > email, por um fluxo que partilha tudo isso com a compra normal.
  >
  > O escalão de origem deriva do **teto gravado no evento** (`participantLimit`), não do histórico
  > de compras: é o teto que o gate lê, é ele que o upgrade sobe, e um evento pode acumular várias
  > compras. Um teto que não corresponda a escalão nenhum não oferece upgrade, em vez de inferir o
  > mais próximo. O novo registo de compra nasce **já consumido** pelo evento — senão daria direito
  > a criar um segundo evento.

## Consequences

### Positivas
- Contrato simples e defensavel: o utilizador decide no Starter gratis; pos-cobranca, sem reembolsos.
- Alinhado com o padrao de industria para digital goods (Notion, Figma, Slack).
- Defensavel por lei (DL 24/2014 art. 18.º — exclusao do direito de retratacao para servicos digitais prestados).
- Backend sem logica de reembolso automatico — menos superficie de ataque e menos edge cases.
- Uma compra Pay-per-event nunca e \"perdida\": nao expira ate ser usada, o que preserva valor para o
  cliente e reduz friccao de suporte.

### Negativas
- Sem rede de seguranca pos-cobranca pode criar friccao em casos de arrependimento pos-compra.
  Mitigacao: o Starter gratis elimina a compra as cegas; o checkout declara \"sem reembolso\" antes de confirmar.
- Chargebacks continuam a chegar pelo Stripe Dashboard; exigem revisao manual. Aceitar como custo
  de operacao, nao como via de reembolso.

## Referencias

- [DL 24/2014 art. 18.º](https://data.dre.pt/eli/decreto-lei/24/2014/p1/pt/) — direito de retratacao, excluir servicos digitais prestados.
- [Stripe Refunds](https://stripe.com/docs/payments/refunds)
- [Stripe Subscription Schedules](https://stripe.com/docs/billing/subscriptions/subscription-schedules)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- Modelo canonico: `docs/plans/2026-07-11-billing-subscription-model.md` §6 (proration) e §7 (refund).

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2026-07-11 | Ney Carvalho | Initial version — refund & downgrade policy para o modelo canonico de billing. |
| 2026-07-11 | Ney Carvalho | Realinhado ao modelo final de 3 planos (Starter / Pay-per-event / Pro): sem trial, sem creditos Flex. |
| 2026-07-11 | Ney Carvalho | Ronda 3: Manutencao morta (eventos sao temporais); save offer = pause 3 meses; janela de edicao min(fim+30d, criacao+14m). |
| 2026-08-02 | Ney Carvalho | Upgrade de escalão do Pay-per-event (ADR-038): compra nova pela diferença, não reembolsável, sem downgrade de escalão. |
