/**
 * Teste de sincronização do catálogo público com a landing.
 *
 * `sites/hello-bafatorio/src/pricing.js` é um espelho de display do catálogo
 * canónico (`src/Utils/plans.js`). A landing é um bundle isolado — o
 * verify-boundaries.mjs impede-a de importar módulos da aplicação — por isso a
 * cópia é deliberada e este teste é a única coisa que a impede de derivar.
 *
 * Mesmo contrato do plans.sync.test.ts: quem mexer nos preços de um lado vê o
 * vermelho, em vez de a landing continuar a anunciar valores que o checkout já
 * não cobra.
 */
import { PAY_PER_EVENT_TIERS, PRO_PRICES } from '../../../sites/hello-bafatorio/src/pricing.js';
import { getDiscountedAmount, PLANS } from '../plans.js';

// A landing usa `null` para o escalão sem teto; o catálogo usa `Infinity`.
const asCatalogueLimit = (participantLimit) =>
  participantLimit === null ? Infinity : participantLimit;

describe('landing (hello-bafatorio/src/pricing.js) ≡ catálogo (src/Utils/plans.js)', () => {
  const catalogueTiers = PLANS.PAY_PER_EVENT.tiers;

  test('escalões do Por Evento: mesmas chaves, pela mesma ordem', () => {
    expect(PAY_PER_EVENT_TIERS.map(({ key }) => key))
      .toEqual(catalogueTiers.map(({ key }) => key));
  });

  test('escalões do Por Evento: mesmos preços', () => {
    expect(PAY_PER_EVENT_TIERS.map(({ amount }) => amount))
      .toEqual(catalogueTiers.map(({ amount }) => amount));
    // Fixa também os valores, para o teste não passar com dois lados vazios.
    expect(PAY_PER_EVENT_TIERS.map(({ amount }) => amount)).toEqual([999, 1999, 3499]);
  });

  test('escalões do Por Evento: mesmos tetos de participantes', () => {
    // As labels i18n da landing ("Até 100") são texto livre: se o teto mudasse
    // no catálogo, nada mais avisaria que a label passou a mentir.
    expect(PAY_PER_EVENT_TIERS.map((tier) => asCatalogueLimit(tier.participantLimit)))
      .toEqual(catalogueTiers.map(({ maxParticipants }) => maxParticipants));
    expect(PAY_PER_EVENT_TIERS.map((tier) => asCatalogueLimit(tier.participantLimit)))
      .toEqual([100, 200, Infinity]);
  });

  test('Pro: preço de tabela igual ao mensal do catálogo', () => {
    expect(PRO_PRICES.listMonthly).toBe(PLANS.PRO.prices.monthly.amount);
    expect(PRO_PRICES.listMonthly).toBe(2999);
  });

  test('Pro: preços anunciados derivam do cupão em vigor, não de constantes', () => {
    // O ponto do teste: quando LAUNCH_50 terminar, getDiscountedAmount deixa de
    // descontar e estas asserções falham — obrigando a atualizar a landing em
    // vez de a deixar a anunciar 14,99 enquanto a Stripe cobra 29,99.
    expect(PRO_PRICES.currentMonthly)
      .toBe(getDiscountedAmount('PRO', PLANS.PRO.prices.monthly.amount));
    expect(PRO_PRICES.currentAnnual)
      .toBe(getDiscountedAmount('PRO', PLANS.PRO.prices.annual.amount));
  });
});
