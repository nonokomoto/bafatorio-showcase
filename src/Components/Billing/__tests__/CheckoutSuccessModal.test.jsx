/**
 * CheckoutSuccessModal — confirmação pós-checkout (regresso da Stripe).
 *
 * O recibo deriva de src/Utils/plans.js (fonte única): escalão do Por Evento
 * pelo tierKey, Pro pelo ciclo COM o cupão de lançamento aplicado — o valor
 * mostrado tem de ser o cobrado, não o de tabela. Campos desconhecidos
 * degradam para a mensagem genérica sem recibo.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import ptBilling from '../../../i18n/locales/pt-PT/billing.json';
import { PLANS, PLAN_KEYS, getDiscountedAmount } from '../../../Utils/plans';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => {
      const value = key
        .split('.')
        .reduce((acc, part) => (acc == null ? acc : acc[part]),
          jest.requireActual('../../../i18n/locales/pt-PT/billing.json'));
      if (typeof value !== 'string') return key;
      return Object.entries(vars || {}).reduce(
        (out, [k, v]) => out.replace(`{{${k}}}`, String(v)), value);
    },
    i18n: { language: 'pt-PT' },
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../UI', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
  Modal: ({ children, isOpen }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

// framer-motion: render sem animação real.
jest.mock('framer-motion', () => {
  const React = require('react');
  const strip = (props) => {
    const clean = { ...props };
    ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap'].forEach((k) => delete clean[k]);
    return clean;
  };
  const make = (tag) => {
    const Comp = ({ children, ...props }) => React.createElement(tag, strip(props), children);
    Comp.displayName = `motion.${tag}`;
    return Comp;
  };
  return {
    motion: new Proxy({}, { get: (cache, tag) => (cache[tag] ??= make(tag)) }),
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => true,
  };
});

import CheckoutSuccessModal from '../CheckoutSuccessModal';

const { checkoutSuccess, plans } = ptBilling;
const TIER_100 = PLANS[PLAN_KEYS.PAY_PER_EVENT].tiers[0];

const eur = (cents) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
    .replace(/\u00a0|\u202f/g, ' ');

const norm = (s) => s.replace(/\u00a0|\u202f/g, ' ');

const renderModal = (props = {}) =>
  render(
    <CheckoutSuccessModal
      isOpen
      planKey={PLAN_KEYS.PAY_PER_EVENT}
      tierKey="PPE_100"
      billingCycle={null}
      onClose={jest.fn()}
      {...props}
    />
  );

beforeEach(() => mockNavigate.mockReset());

describe('CheckoutSuccessModal', () => {
  it('mostra o recibo do Por Evento: nome, escalão e valor do tier', () => {
    renderModal();

    expect(screen.getByText(checkoutSuccess.title)).toBeInTheDocument();
    expect(screen.getByText(plans.grid.names.payPerEvent)).toBeInTheDocument();
    expect(
      screen.getByText(`Até ${TIER_100.maxParticipants} participantes`)
    ).toBeInTheDocument();
    expect(
      screen.getByText((text) => norm(text) === eur(TIER_100.amount))
    ).toBeInTheDocument();
  });

  it('mostra o Pro mensal com o valor COBRADO (cupão de lançamento aplicado)', () => {
    renderModal({ planKey: PLAN_KEYS.PRO, tierKey: null, billingCycle: 'monthly' });

    const charged = getDiscountedAmount(PLAN_KEYS.PRO, PLANS[PLAN_KEYS.PRO].prices.monthly.amount);
    expect(screen.getByText(plans.grid.names.pro)).toBeInTheDocument();
    expect(
      screen.getByText((text) => norm(text) === eur(charged))
    ).toBeInTheDocument();
  });

  it('sem plano reconhecido degrada para a mensagem genérica sem recibo', () => {
    renderModal({ planKey: null, tierKey: null });

    expect(screen.getByText(checkoutSuccess.title)).toBeInTheDocument();
    expect(screen.getByText(checkoutSuccess.subtitle.generic)).toBeInTheDocument();
    expect(screen.queryByText(checkoutSuccess.paid)).not.toBeInTheDocument();
  });

  it('o CTA primário navega para criar evento e fecha o modal', () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: checkoutSuccess.cta.payPerEvent }));

    expect(mockNavigate).toHaveBeenCalledWith('/app/register-event');
    expect(onClose).toHaveBeenCalled();
  });

  it('o botão secundário apenas fecha', () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: checkoutSuccess.secondary }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
