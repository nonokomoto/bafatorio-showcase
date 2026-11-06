# ADR-041 — Analytics de produto com Umami

**Estado:** Accepted (2026-08-09)
**Data:** 2026-08-09
**Relacionados:** ADR-037 (hello landing), ADR-008/ADR-038 (billing/Stripe), design em `docs/plans/2026-08-09-analytics-umami-design.md`

## Contexto

O lançamento público de bafatorio.com é a 2026-08-10. O objetivo dos primeiros 3 meses
é concreto: **30 eventos registados com participantes**. Até aqui a app não tinha
analytics nenhum; só a landing hello.bafatorio.com media alguma coisa (Umami), e essa
landing passa a redirecionar para bafatorio.com no lançamento.

Precisávamos de responder a duas perguntas distintas:

1. **Quantos eventos ativados temos?** (o KPI em si)
2. **Onde se perdem as pessoas** entre visita, signup, criação de evento e primeiro
   participante? (o funil que conduz ao KPI)

Restrições: sem banner de cookies (a app não usa cookies de tracking e queremos manter
isso), sem PII a sair para serviços terceiros, e esforço mínimo de manutenção.

## Decisão

### O KPI mede-se no DynamoDB, não no analytics

Um evento ativado é `Event.participantCount > 0`. Esse contador é mantido por DynamoDB
Streams e é a fonte de verdade. O analytics nunca é usado para reportar o KPI; serve
para diagnosticar o funil. Fica prevista uma contagem semanal via script
(`scripts/count-activated-events.mjs`, por criar) sobre a tabela Event de produção.

### Umami Cloud para o funil

Um único website Umami para bafatorio.com (id `00000000-0000-0000-0000-000000000000`,
conta cloud.umami.is). Umami é cookieless e não guarda PII, portanto não exige banner
de consentimento. A landing e a app são o mesmo SPA no mesmo domínio, por isso um
website chega: o Umami liga UTM, sessão e eventos custom sozinho, sem código de
atribuição nosso.

## Como funciona

### Carregamento

O script está no `index.html`:

```html
<script defer src="https://cloud.umami.is/script.js"
  data-website-id="00000000-0000-0000-0000-000000000000"
  data-domains="bafatorio.com,www.bafatorio.com"></script>
```

`data-domains` prende o tracking à produção: em localhost, em previews e no deploy da
branch `development` o script carrega mas não envia nada. Page views das rotas do SPA
contam automaticamente (o tracker segue as navegações do react-router); os UTM da URL
são extraídos e guardados por sessão sem código nosso.

### Emissão de eventos

Todos os eventos custom passam por `src/Utils/analytics.js`:

```js
track('event_created', { category: 'CORPORATE' });
```

O `track` é best-effort: `window.umami?.track` dentro de try/catch. Se o script não
carregou (localhost, adblocker, offline), a chamada é um no-op silencioso. Analytics
nunca justifica partir a app.

### O que registamos

| Evento | Props | Disparado em |
|--------|-------|--------------|
| `cta_click` | `cta: hero\|header\|pricing\|final` | CTAs de signup na landing (`HeroAlt`, `LandingHeader`, `PricingAlt`, `CallToActionAlt`) |
| `signup_completed` | — | `SignUp.jsx`, quando a confirmação do código é aceite |
| `event_created` | `category` | `eventApi.createEvent`, no sucesso da mutation (cobre todos os callers) |
| `participant_added` | `method: manual\|import` | `participantApi`: criação manual e ambos os caminhos de import |
| `checkout_started` | `plan` | `billingCheckout.js` `startCheckout`, ponto único dos 3 fluxos de compra |
| `checkout_completed` | `plan` | `Layout.jsx`, no regresso da Stripe (ver abaixo) |

`participant_added` é o momento de ativação. O par `event_created` para
`participant_added` no dashboard é a leitura direta do progresso para os 30.

### O regresso da Stripe

O `checkout_completed` não pode disparar no clique (o pagamento ainda não aconteceu)
nem no webhook (é servidor, o Umami é client-side). A solução: o `startCheckout`
acrescenta `?checkout=success&plan=...` ao `successUrl` antes de criar a sessão
Stripe. Quando a Stripe devolve o utilizador à app, o `Layout` deteta o marcador,
regista o evento e limpa a query string com `replace`, para um refresh não contar a
compra duas vezes.

### Regras

1. **Sem PII nas props.** Nunca email, nome, `eventId`, `userId`. Os valores são
   sempre de um conjunto fechado (plano, categoria, método).
2. **Eventos disparam no sucesso da operação**, nunca na intenção; as exceções são
   `cta_click` e `checkout_started`, que medem intenção por definição.
3. **Instrumentação centralizada** quando há vários callers: no slice RTK Query
   (`onQueryStarted`) ou no módulo partilhado (`startCheckout`), nunca espalhada
   pelos componentes.
4. Nomes de eventos até 50 caracteres (limite do Umami); `snake_case`.

## Consequências

- O dashboard Umami mostra o funil completo por origem (UTM), sem custo de
  manutenção: eventos novos são uma chamada a `track` no ponto de sucesso.
- O deploy da branch `development` não polui os dados; testar eventos exige produção
  ou alterar temporariamente o `data-domains` (não commitar essa alteração).
- O redirect hello para bafatorio.com tem de preservar a query string, senão a
  atribuição dos QR impressos perde-se. Regra única no Amplify da app hello:
  `/<*>` para `https://bafatorio.com/<*>` com 301.
- Plano Umami Cloud Hobby: 100k eventos/mês e 3 websites; folga larga para a escala
  atual.

## Por fazer

- `feature_used` (prop `feature: agenda|documents|suppliers|team|notion|report|akili`)
  na primeira ação significativa de cada área, para medir retenção por funcionalidade.
- Revenue nativo do Umami no `checkout_completed` (`{ revenue, currency }`); exige
  levar `cycle`/`tier` no marcador do successUrl para resolver o valor via `plans.js`.
- `scripts/count-activated-events.mjs` com cadência semanal para o KPI.
