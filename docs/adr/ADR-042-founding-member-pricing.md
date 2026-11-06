# ADR-042 — Founding Member: preço vitalício de 5,99 € via Price dedicado

**Estado:** Accepted (2026-08-09)
**Data:** 2026-08-09
**Relacionados:** ADR-008 (billing/Stripe), ADR-034 (reembolsos/upgrades), ADR-036 (bypass ADMIN), ADR-038 (escalões do Por Evento)

## Contexto

A campanha Founding Member promete aos beta users e à lista do hello.bafatorio.com o Pro a
**5,99 €/mês para sempre**. A promessa é um número absoluto, não uma percentagem: tem de se manter
mesmo que o preço público do Pro mude.

Estado atual do checkout: o `create-checkout-session` aplica o cupão `LAUNCH_50` a todas as
sessões de subscrição Pro, sem exceção. Nenhum beta user externo tem subscrição Pro ativa; o único
registo `UserSubscription` em produção (verificado a 2026-08-09) é o stub de mapeamento
`stripeCustomerId` de uma conta excluída da campanha, sem subscrição associada. Não há migração:
o mecanismo só precisa de funcionar para subscrições futuras.

Os elegíveis da lista hello ainda não têm conta Cognito nem Customer Stripe. A elegibilidade tem de
existir antes de qualquer objeto Stripe existir para essas pessoas.

## Opções consideradas

1. **Cupão percentual de 80%.** 80% de 29,99 € são 5,998 €: o valor final depende do arredondamento
   da Stripe e acompanha alterações futuras do preço público. Não garante 5,99 €.
2. **Cupão de valor fixo (24,00 € off, forever).** Exato hoje (2999 − 2400 = 599), mas a garantia é
   relativa: se o Pro subir para 34,99 €, o Founder passa silenciosamente a pagar 10,99 €. Falha em
   silêncio no dia em que o pricing mudar.
3. **Stripe Price dedicado de 5,99 €/mês** (escolhida). O número está no próprio objeto: nenhuma
   alteração ao preço público o afeta. Falha do lado seguro.

Para o armazenamento da elegibilidade, rejeitou-se:

- **Campo na `UserSubscription`:** o webhook faz `PutItem` de substituição total a cada evento
  `customer.subscription.*` (a mesma razão que obrigou o guard do ADMIN no ADR-036). O campo
  perder-se-ia no primeiro ciclo Stripe.
- **Código promocional partilhável:** deixa de ser pessoal; circula.
- **Lista de emails no frontend:** falsificável e pública.
- **Grupo Cognito:** billing decidido por claims de auth mistura domínios (lição do ADR-036, que
  separou badge e bypass).
- **Metadata no Stripe Customer:** a maioria dos elegíveis ainda nem Customer tem.

## Decisão

### Dois Prices dedicados no produto Pro

| Ciclo | Price Founder | Convenção |
|---|---|---|
| Mensal | 5,99 € | preço prometido |
| Anual | 71,88 € | 5,99 × 12, a mesma regra do público (359,88 = 29,99 × 12) |

O anual não dá incentivo sobre o mensal porque o público também não dá: o desconto real do público
vem do cupão, e o Founder não usa cupão.

### Elegibilidade em tabela dedicada

Novo modelo `FounderEligibility`, chave = Cognito sub (`userId`). Leitura restrita ao dono; escrita
apenas via IAM das Lambdas e script admin. Mutations de cliente desativadas com `disableOperations`
(sem isso a validação Lambda é decorativa). O registo sobrevive a cancelamentos e recompras: ao
voltar a subscrever, o backend volta a selecionar o Price Founder.

A concessão é manual e deliberada, via script admin no padrão do `grant-admin.mjs` (dry-run por
defeito, idempotente, confirmação em produção). A lista hello entra faseada: cada pessoa só é
elegível depois de criar conta Cognito verificada.

### Branch no checkout, e o cupão nunca entra

No `create-checkout-session`, sessão de subscrição Pro:

1. Utilizador com registo `FounderEligibility` → `line_items` com o Price Founder do ciclo pedido e
   **sem `discounts`**. Aplicar o `LAUNCH_50` sobre 5,99 € cobraria 2,99 €.
2. Sem registo → fluxo atual (Price público + `LAUNCH_50`), intacto.

O `planName` continua `PRO`: o Founder é Pro com outro preço, não um plano novo. O webhook não muda;
o `priceId` gravado na `UserSubscription` passa a distinguir naturalmente as subscrições Founder.
O guard do ADMIN (ADR-036) mantém-se antes do branch: uma conta ADMIN continua sem checkout.

### O Billing Portal não pode trocar preços

A app não tem Lambda de alteração de subscrição: mudanças de ciclo, pausa e cancelamento passam
pelo Billing Portal, que o `create-biling-portal-session` abre com a configuração default da conta
Stripe. Se essa configuração permitir troca de plano/preço, um Founder que mude de ciclo no portal
aterra num price público e perde o benefício em silêncio (o webhook grava o `priceId` novo sem
avisar ninguém).

A configuração do portal tem de restringir as alterações de subscrição a pausa e cancelamento, sem
troca de price. A mudança de ciclo faz-se pelo checkout da app, onde o branch Founder decide o
price. Isto verifica-se na configuração do portal em test e live antes do lançamento da campanha, e
fica fixado preferencialmente por uma `configuration` explícita passada na criação da sessão do
portal, para não depender do default do Dashboard.

### UI

Settings e modal de plano mostram o preço efetivo do utilizador: um Founder vê 5,99 € (e 71,88 €
no anual), não 29,99/14,99 €. A deteção na UI lê a elegibilidade (query ao registo próprio), nunca
uma lista embebida.

## Consequências

- Dois prices novos em test e live; nenhum cupão novo. `plans.js`/`plans.ts` ganham a constante do
  preço Founder na fonte única, com `plans.sync.test.ts` a garantir a paridade.
- **Para um Founder, o Por Evento fica dominado:** subscrever a 5,99 € e cancelar bate o escalão de
  entrada (9,99 €, ADR-038). Aceite: a campanha abrange poucas dezenas de contas e o objetivo é
  fidelizá-las ao Pro, não vender-lhes eventos avulsos.
- Quando o `LAUNCH_50` acabar, o público volta a 29,99 € e o Founder não mexe: é a propriedade que
  motivou a escolha do Price.
- O teste que fixa a escada do ADR-038 (entrada do Por Evento abaixo do Pro real) não é afetado:
  compara preços públicos.

## Riscos

- **Alguém aplica um cupão futuro sobre o Price Founder.** Mitigado pelo branch nunca preencher
  `discounts` e por teste que o fixa.
- **O portal Stripe volta a permitir troca de preços.** Uma alteração no Dashboard (ou um reset da
  configuração default) reabre a fuga silenciosa descrita na decisão. Mitigado pela `configuration`
  explícita no `create-biling-portal-session`; enquanto ela não existir, o default do Dashboard é um
  ponto único de falha fora do controlo de versões.
- **Elegibilidade concedida por engano dá 80% vitalício.** O perímetro é o mesmo do ADR-036: escrita
  no DynamoDB de produção, via script com confirmação.
- **Divergência entre o preço afixado na campanha e os Prices criados.** Os valores vivem na fonte
  única de planos e o checkout resolve a partir dela; a campanha deve citar a constante, não
  hardcodar noutro sítio.
