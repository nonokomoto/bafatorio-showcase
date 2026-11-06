/**
 * TierUpgradeModal — subir o escalão de um evento já comprado (ADR-034/038).
 *
 * O escalão de origem deriva do TETO gravado no evento, não do histórico de
 * compras, e o preço mostrado é a DIFERENÇA. O servidor recalcula-a: o que o
 * cliente envia é só a intenção (evento + escalão destino).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ptBilling from '../../../i18n/locales/pt-PT/billing.json';
import { PLANS, PLAN_KEYS } from '../../../Utils/plans';

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

jest.mock('react-redux', () => ({
  useSelector: (fn) => fn({ user: { user: { email: 'dono@exemplo.pt' } } }),
}));

const mockStartCheckout = jest.fn();
jest.mock('../../../Api/billingCheckout', () => ({
  startCheckout: (...args) => mockStartCheckout(...args),
}));

jest.mock('../../UI', () => ({
  Button: ({ children, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Modal: Object.assign(
    ({ children, isOpen }) => (isOpen ? <div role="dialog">{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Text: ({ children }) => <span>{children}</span>,
}));

import TierUpgradeModal from '../TierUpgradeModal';

const [TIER_100, TIER_200, TIER_UNLIMITED] = PLANS.PAY_PER_EVENT.tiers;
const { tiers, upgrade } = ptBilling.plans.grid;

const eur = (cents) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
    .replace(/\u00a0|\u202f/g, ' ');

const norm = (s) => s.replace(/\u00a0|\u202f/g, ' ');

const renderModal = (props = {}) =>
  render(
    <TierUpgradeModal
      eventId="evt-1"
      currentLimit={100}
      isOpen
      onClose={jest.fn()}
      {...props}
    />
  );

beforeEach(() => {
  mockStartCheckout.mockReset();
  mockStartCheckout.mockResolvedValue('https://checkout.stripe/sess');
  delete window.location;
  window.location = { origin: 'https://app.local', pathname: '/app/participants', href: '' };
});

describe('TierUpgradeModal', () => {
  it('só oferece escalões acima do atual', () => {
    renderModal({ currentLimit: 100 });

    expect(screen.getByRole('radio', { name: new RegExp(`até ${TIER_200.maxParticipants}`) })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: new RegExp(tiers.uncapped) })).toBeInTheDocument();
    // O atual não é opção: não se compra o que já se tem.
    expect(screen.queryByRole('radio', { name: new RegExp(`até ${TIER_100.maxParticipants}`) })).not.toBeInTheDocument();
  });

  it('mostra a diferença, não o preço do escalão', () => {
    renderModal({ currentLimit: 100 });

    const opt200 = screen.getByRole('radio', { name: new RegExp(`até ${TIER_200.maxParticipants}`) });
    // 19,99 - 9,99 = 10,00 — nunca 19,99
    expect(norm(opt200.closest('label').textContent)).toContain(eur(TIER_200.amount - TIER_100.amount));
    expect(norm(opt200.closest('label').textContent)).not.toContain(eur(TIER_200.amount));

    const optUnl = screen.getByRole('radio', { name: new RegExp(tiers.uncapped) });
    expect(norm(optUnl.closest('label').textContent)).toContain(eur(TIER_UNLIMITED.amount - TIER_100.amount));
  });

  it('envia a intenção ao servidor: evento + escalão destino', async () => {
    renderModal({ currentLimit: 100 });

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tiers.uncapped) }));
    fireEvent.click(screen.getByRole('button', { name: upgrade.confirm }));

    await waitFor(() => expect(mockStartCheckout).toHaveBeenCalledTimes(1));
    expect(mockStartCheckout).toHaveBeenCalledWith(expect.objectContaining({
      planKey: PLAN_KEYS.PAY_PER_EVENT,
      intent: 'TIER_UPGRADE',
      eventId: 'evt-1',
      tierKey: TIER_UNLIMITED.key,
      customerEmail: 'dono@exemplo.pt',
    }));
  });

  it('evento já sem teto: não há para onde subir', () => {
    renderModal({ currentLimit: null });

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText(upgrade.alreadyMax)).toBeInTheDocument();
  });

  it('teto que não corresponde a escalão nenhum: fecha em vez de adivinhar', () => {
    renderModal({ currentLimit: 150 });

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText(upgrade.alreadyMax)).toBeInTheDocument();
  });

  it('sem escalão escolhido não deixa avançar', () => {
    renderModal({ currentLimit: 100 });
    expect(screen.getByRole('button', { name: upgrade.confirm })).toBeDisabled();
  });

  it('falha do checkout mostra erro e não deixa o botão preso', async () => {
    mockStartCheckout.mockRejectedValue(new Error('boom'));
    renderModal({ currentLimit: 100 });

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`até ${TIER_200.maxParticipants}`) }));
    fireEvent.click(screen.getByRole('button', { name: upgrade.confirm }));

    await waitFor(() => expect(screen.getByText(upgrade.error)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: upgrade.confirm })).not.toBeDisabled();
  });
});
