/**
 * PlanCard — o escalão é atributo da COMPRA, não um plano (ADR-038): um único
 * cartão "Por evento" com o seletor lá dentro. Três cartões fariam parecer que
 * há cinco planos.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import ptBilling from '../../../../i18n/locales/pt-PT/billing.json';
import { PLANS, PLAN_KEYS } from '../../../../Utils/plans';

// As chaves resolvem contra o namespace real, para o teste falhar se a copy
// desaparecer; a interpolação de {{max}} é feita à mão.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => {
      const value = key
        .split('.')
        .reduce((acc, part) => (acc == null ? acc : acc[part]),
          jest.requireActual('../../../../i18n/locales/pt-PT/billing.json'));
      if (typeof value !== 'string') return key;
      return Object.entries(vars || {}).reduce(
        (out, [k, v]) => out.replace(`{{${k}}}`, String(v)), value);
    },
    i18n: { language: 'pt-PT' },
  }),
}));

jest.mock('../../../UI', () => ({
  Text: ({ children }) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

import PlanCard from '../PlanCard';

const { tiers } = ptBilling.plans.grid;
const [TIER_100, TIER_200, TIER_UNLIMITED] = PLANS.PAY_PER_EVENT.tiers;

const eur = (cents) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
    .replace(/\u00a0|\u202f/g, ' ');

const renderPPE = (onSelect = jest.fn()) => {
  render(
    <PlanCard
      planKey={PLAN_KEYS.PAY_PER_EVENT}
      billingCycle="monthly"
      onSelect={onSelect}
    />
  );
  return onSelect;
};

const optionLabel = (tier) =>
  Number.isFinite(tier.maxParticipants)
    ? tiers.capped.replace('{{max}}', String(tier.maxParticipants))
    : tiers.uncapped;

// Âncora no início: "19,99 €" contém "9,99 €", e um toContain deixaria passar
// o escalão errado.
const startsWithPrice = (cents) =>
  new RegExp(`^${eur(cents).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

// O nome acessível da opção é o label inteiro, dimensão E preço — é isso que um
// leitor de ecrã anuncia. O matcher só ancora a parte da dimensão.
const labelMatcher = (tier) =>
  new RegExp(`^${optionLabel(tier).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

describe('PlanCard — Por evento com seletor de escalão', () => {
  it('mostra uma opção por escalão da fonte única', () => {
    renderPPE();
    for (const tier of PLANS.PAY_PER_EVENT.tiers) {
      expect(screen.getByRole('radio', { name: labelMatcher(tier) })).toBeInTheDocument();
    }
  });

  // "Ilimitados" aparece em mais do que uma linha da matriz, e o mock global dos
  // ícones injeta texto ("FiUsers Icon") dentro do label — daí ancorar no <li>
  // dos participantes, a única linha que o escalão manda.
  const participantsRow = () =>
    screen
      .getAllByRole('listitem')
      .find((li) => li.textContent.includes(ptBilling.plans.grid.rows.participants))
      .textContent;

  // Cada opção mostra o seu preço; o em destaque é o do escalão escolhido.
  // textContent não passa pela normalização do DOM: o NBSP do Intl fica cru.
  const headlinePrice = () =>
    screen.getByTestId('plan-price').textContent.replace(/\u00a0|\u202f/g, ' ');

  it('arranca no escalão de entrada, o mais barato', () => {
    renderPPE();
    expect(screen.getByRole('radio', { name: labelMatcher(TIER_100) })).toBeChecked();
    expect(headlinePrice()).toMatch(startsWithPrice(TIER_100.amount));
  });

  it('mudar de escalão atualiza o preço e o teto exibido', () => {
    renderPPE();
    fireEvent.click(screen.getByRole('radio', { name: labelMatcher(TIER_200) }));

    expect(headlinePrice()).toMatch(startsWithPrice(TIER_200.amount));
    // A linha de participantes mostra o teto comprado, não o do catálogo.
    expect(participantsRow()).toContain(String(TIER_200.maxParticipants));
  });

  it('o escalão sem teto mostra "ilimitados" na linha de participantes', () => {
    renderPPE();
    fireEvent.click(screen.getByRole('radio', { name: labelMatcher(TIER_UNLIMITED) }));
    expect(headlinePrice()).toMatch(startsWithPrice(TIER_UNLIMITED.amount));
    expect(participantsRow()).toContain(ptBilling.plans.grid.values.unlimited);
  });

  it('a compra leva o escalão escolhido — o servidor resolve o preço a partir dele', () => {
    const onSelect = renderPPE();
    fireEvent.click(screen.getByRole('radio', { name: labelMatcher(TIER_200) }));
    fireEvent.click(screen.getByRole('button', { name: ptBilling.plans.grid.cta.payPerEvent }));

    expect(onSelect).toHaveBeenCalledWith(PLAN_KEYS.PAY_PER_EVENT, TIER_200.key);
  });

  it('o Pro não tem seletor de escalão', () => {
    render(<PlanCard planKey={PLAN_KEYS.PRO} billingCycle="monthly" onSelect={jest.fn()} />);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
