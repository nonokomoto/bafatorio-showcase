/**
 * readCheckoutReturn — leitura do regresso da Stripe a partir da query string
 * marcada pelo startCheckout (checkout=success&plan=...&tier=...&cycle=...).
 *
 * Regra central: `checkout=success` significa que o pagamento aconteceu — o
 * regresso nunca se descarta por o plano vir corrompido; os campos inválidos
 * normalizam para null e a UI degrada para a mensagem genérica.
 */
import {
  readCheckoutReturn,
  withCheckoutMarker,
  CHECKOUT_MARKER_PARAMS,
} from '../checkoutReturn';

const params = (qs) => new URLSearchParams(qs);

describe('readCheckoutReturn', () => {
  it('devolve null sem o marcador checkout=success', () => {
    expect(readCheckoutReturn(params(''))).toBeNull();
    expect(readCheckoutReturn(params('plan=PRO'))).toBeNull();
    expect(readCheckoutReturn(params('checkout=cancel&plan=PRO'))).toBeNull();
  });

  it('lê uma compra Por Evento com escalão', () => {
    expect(
      readCheckoutReturn(params('checkout=success&plan=PAY_PER_EVENT&tier=PPE_100'))
    ).toEqual({ planKey: 'PAY_PER_EVENT', tierKey: 'PPE_100', billingCycle: null, isTierUpgrade: false });
  });

  it('lê uma subscrição Pro com ciclo', () => {
    expect(
      readCheckoutReturn(params('checkout=success&plan=PRO&cycle=monthly'))
    ).toEqual({ planKey: 'PRO', tierKey: null, billingCycle: 'monthly', isTierUpgrade: false });
  });

  it('assinala o upgrade de escalão — o evento já existe, o Layout não convida a criar outro', () => {
    expect(
      readCheckoutReturn(params('checkout=success&plan=PAY_PER_EVENT&tier=PPE_200&intent=TIER_UPGRADE'))
    ).toEqual({ planKey: 'PAY_PER_EVENT', tierKey: 'PPE_200', billingCycle: null, isTierUpgrade: true });
  });

  it('normaliza plano desconhecido ou grátis para null sem descartar o regresso', () => {
    expect(readCheckoutReturn(params('checkout=success&plan=HACK'))).toEqual({
      planKey: null,
      tierKey: null,
      billingCycle: null,
      isTierUpgrade: false,
    });
    // STARTER nunca passa pela Stripe — plano grátis no marcador é lixo.
    expect(readCheckoutReturn(params('checkout=success&plan=STARTER'))).toEqual({
      planKey: null,
      tierKey: null,
      billingCycle: null,
      isTierUpgrade: false,
    });
  });

  it('ida-e-volta: o que withCheckoutMarker escreve, readCheckoutReturn lê e a limpeza cobre', () => {
    const url = new URL(
      withCheckoutMarker('https://app.local/app/events', {
        planKey: 'PAY_PER_EVENT',
        tierKey: 'PPE_200',
        intent: 'TIER_UPGRADE',
      })
    );

    expect(readCheckoutReturn(url.searchParams)).toEqual({
      planKey: 'PAY_PER_EVENT',
      tierKey: 'PPE_200',
      billingCycle: null,
      isTierUpgrade: true,
    });
    // Nenhum param escrito escapa à lista de limpeza — é o contrato DRY.
    expect(CHECKOUT_MARKER_PARAMS).toEqual(expect.arrayContaining([...url.searchParams.keys()]));
  });

  it('normaliza escalão e ciclo inválidos para null mantendo o plano', () => {
    expect(
      readCheckoutReturn(params('checkout=success&plan=PAY_PER_EVENT&tier=PPE_9000'))
    ).toEqual({ planKey: 'PAY_PER_EVENT', tierKey: null, billingCycle: null, isTierUpgrade: false });
    expect(
      readCheckoutReturn(params('checkout=success&plan=PRO&cycle=weekly'))
    ).toEqual({ planKey: 'PRO', tierKey: null, billingCycle: null, isTierUpgrade: false });
  });
});
