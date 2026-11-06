# ADR-038 — Por Evento escalonado por participantes

**Estado:** Accepted (2026-08-02)
**Data:** 2026-08-02
**Relacionados:** ADR-008 (billing/Stripe), ADR-034 (reembolsos), ADR-036 (bypass ADMIN), modelo canónico (docs/plans/2026-07-11)

## Contexto

O Por Evento era preço único (79,99 €) com participantes ilimitados, e o Starter dava 25
participantes. A audiência alvo (batizado, casamento, aniversário, workshop) organiza sobretudo
eventos únicos, e isso quebra dois pressupostos.

**"Grátis o primeiro, pago o segundo" não monetiza eventos únicos.** Um casamento não tem segundo
evento: com 1 evento gratuito suficientemente generoso, os segmentos com orçamento nunca pagam.

**Um preço único não serve tamanhos tão diferentes.** Um aniversário de 30 pessoas e um workshop
de 300 têm orçamentos incomparáveis. O número de participantes é o proxy observável do tipo de
evento, logo da disposição para pagar.

### Mercado

| Produto | Grátis | Por evento |
|---|---|---|
| GuestlistOnline (EU) | 1 evento, 50 convidados | €19,99 ilimitado |
| RSVPify | 1 evento, 100 convidados | subscrição |
| InviteDrop | 5 convites | $15,99/25 · $29,99/50 · $44,99/100 · $74,99 ilim. |
| Greenvelope | 10 (trial) | $19 até 20, até $99 até 100 |
| Zola / Joy / Partiful / Evite | tudo gratuito | não vendem software |

Quando o produto é vendido, o plano gratuito da categoria fica entre 50 e 100 convidados. Os
concorrentes sem limite nenhum não vendem software: vivem de capital de risco, comissões de lista
de presentes ou publicidade. Sem nenhuma dessas receitas, não podemos competir no grátis ilimitado.
Escalonar o pagamento único por convidados já é padrão (InviteDrop, Greenvelope), a preços acima
dos aqui propostos.

## Decisão

### Grátis

1 evento, **50 participantes**, 10 fornecedores, documentos e pastas **sem limite**, sem relatório
e sem integrações. Os 50 alinham com o comparável europeu mais próximo. Documentos e pastas saem
do gate porque organizar o evento é a porta de entrada, não o que se vende.

### Escalões do Por Evento

| Chave | Teto | Preço |
|---|---|---|
| `PPE_100` | 100 participantes | 9,99 € |
| `PPE_200` | 200 participantes | 19,99 € |
| `PPE_UNLIMITED` | sem teto | 34,99 € |

O primeiro escalão começa em 100 e não em 50 para haver folga face ao Grátis: um escalão pago que
desse o mesmo que o gratuito não venderia, e a compra leria-se como despromoção.

### O escalão é atributo da compra, não um plano

Continuam a ser **3 planos**. O escalão está para o Por Evento como o ciclo mensal/anual está para
o Pro. Na tela isso é **um cartão "Por evento"** com um seletor lá dentro, nunca três cartões. Sem
nomes de marca: o cliente escolhe pelo número de convidados, que é a única coisa que sabe.

Fora da tela não há contexto, portanto Stripe, fatura e recibo levam o nome inteiro
("Por evento — até 100 participantes"). No checkout o escalão entra como argumento próprio, ao
lado do `planKey`, tal como o `billingCycle` já entra para o Pro.

### O limite gravado no evento é um número

Na compra grava-se no `Event` o **valor numérico** do teto, não a identidade do escalão: guardar
`PPE_100` faria com que mudar as fronteiras alterasse retroativamente o que foi vendido. É o mesmo
princípio do snapshot `planKey`.

Consequência: `deriveEventEntitlements` deixa de devolver `PLANS[planKey].entitlements` inteiro
para o Por Evento. Os participantes passam a vir do registo do evento; o resto continua a vir do
plano.

### O teto é enforced, com upgrade pela diferença

Aplica-se por `ensureWithinLimit`, como o teto do Grátis. Sem enforcement a escada não produz
receita: toda a gente compraria o escalão de entrada. O bloqueio dá-se a construir a lista,
semanas antes do evento, e oferece o escalão seguinte cobrando só a diferença (ADR-034).

### O cupão sai do Por Evento

`LAUNCH_DISCOUNT.appliesTo` passa a conter apenas o Pro. A 9,99 € o cupão punha a venda a 4,99 €,
cerca de 3,73 € líquidos. Num pagamento único o desconto não compra retenção, ao contrário do Pro,
onde ser vitalício é o que prende a receita.

### Preços contra o Pro: a entrada é regra, o topo é exceção

O cupão é permanente, portanto o Pro afixa 29,99 € mas cobra 14,99 €. Qualquer preço por evento
acima do preço real é dominado, porque se subscreve um mês, faz-se o evento e cancela-se.

| Escalão | vs. Pro afixado (29,99) | vs. Pro real (14,99) |
|---|---|---|
| 9,99 | abaixo | abaixo |
| 19,99 | abaixo | acima |
| 34,99 | **acima** | acima |

**Só a entrada é regra:** se 9,99 subir acima de 14,99, subscrever e cancelar bate a compra em toda
a escada e o Por Evento deixa de ter razão de existir. Está fixado em teste.

**O topo é exceção deliberada.** A 34,99 € o cliente vê logo na tabela uma alternativa mais barata
e ilimitada. A aposta é que a aversão a subscrever, e o esforço de ter de lembrar-se de cancelar,
sustentam a venda a quem quer resolver o assunto de uma vez. É aposta, não princípio, e é o
primeiro número a rever se a conversão do escalão de topo vier fraca.

## Consequências

- `plans.js` / `plans.ts`: `PAY_PER_EVENT` troca `price` por `tiers`, mais os helpers
  `resolveTierForCount`, `getTierByKey` e `getTierUpgradeAmount`. `plans.sync.test.ts` garante a
  paridade.
- Stripe: três price IDs em vez de um, em test e live, mais o produto do upgrade.
  `STRIPE_PRICE_PAY_PER_EVENT` dá lugar a uma variável por escalão.
- `create-checkout-session` resolve o preço pelo escalão; `handle-stripe-webhook` grava o teto;
  `create-event` escreve o snapshot; `resolveEventEntitlements` lê-o.
- ADR-034 absorve o upgrade de escalão.

## Riscos

- **Eventos já vendidos não têm teto gravado.** A ausência do campo resolve para ilimitado, que foi
  o que compraram; sem isso ficavam bloqueados retroativamente no escalão mais baixo.
- **A escada depende do preço afixado do Pro.** Exibir 14,99 na tabela colapsa-a. É dependência de
  apresentação, e nada no código a protege.
- **O desconto vitalício apresentado como lançamento tem exposição regulatória.** O DL 109-G/2021
  (Diretiva Omnibus) obriga a indicar o preço mais baixo praticado nos 30 dias anteriores. Mitiga-se
  apresentando 29,99 como preço de tabela e 14,99 como preço do plano, sem lhe chamar desconto
  temporário nem associar contagem decrescente.
- **Subdimensionar a compra gera atrito.** Mitigado pelo upgrade pela diferença, com a escolha a
  acontecer com a lista já construída.
