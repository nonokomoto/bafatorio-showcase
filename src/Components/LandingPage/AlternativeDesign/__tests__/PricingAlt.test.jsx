import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ptLandingPageAlt from '../../../../i18n/locales/pt-PT/landingPageAlt.json';
import { PLANS } from '../../../../Utils/plans';

// Resolve translation keys against the real pt-PT namespace so the test
// stays in sync with the actual copy (plan names, feature rows, badges).
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => {
      const value = key
        .split('.')
        .reduce(
          (acc, part) => (acc == null ? acc : acc[part]),
          jest.requireActual('../../../../i18n/locales/pt-PT/landingPageAlt.json'),
        );
      if (typeof value !== 'string') return value;
      // Interpolar, senão uma chave com {{min}} passaria no teste em cru.
      return Object.entries(vars || {}).reduce(
        (out, [k, v]) => out.replace(`{{${k}}}`, String(v)), value);
    },
    i18n: { language: 'pt-PT' },
  }),
}));

// Keep the test focused on PricingAlt logic, not the design-system internals.
jest.mock('../../../UI', () => ({
  Text: ({ children }) => <span>{children}</span>,
  Button: ({ children, onClick }) => <button type="button" onClick={onClick}>{children}</button>,
  Container: ({ children }) => <div>{children}</div>,
  Card: ({ children }) => <div>{children}</div>,
}));

import PricingAlt from '../PricingAlt';

const { pricing } = ptLandingPageAlt;

// O Testing Library normaliza o texto do DOM (NBSP -> espaço) mas não o matcher;
// normalizamos aqui para os dois lados baterem.
const eur = (cents) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
    .replace(/\u00a0|\u202f/g, ' ');

const renderWithRouter = (ui, { initialEntries = ['/'] } = {}) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

describe('PricingAlt', () => {
  it('renders the 3 plans of the final model (Grátis, Pro, Por evento)', () => {
    renderWithRouter(<PricingAlt />);

    expect(screen.getByText(pricing.plans.starter.name)).toBeInTheDocument();
    expect(screen.getByText(pricing.plans.pro.name)).toBeInTheDocument();
    expect(screen.getByText(pricing.plans.perEvent.name)).toBeInTheDocument();
  });

  // Os preços grandes dividem inteiro/cêntimos em spans (protótipo) — compara-se o
  // textContent completo em vez do getByText (que só vê text nodes diretos).
  const priceIsShown = (container, str) =>
    [...container.querySelectorAll('span')].some(
      (el) => el.textContent.replace(/[\u00a0\u202f]/g, ' ') === str,
    );

  it('shows the launch price derived from the single source of truth (monthly default)', () => {
    const { container } = renderWithRouter(<PricingAlt />);

    // Pro launch: 14,99 € com o base 29,99 € riscado.
    expect(priceIsShown(container, eur(1499))).toBe(true);
    expect(priceIsShown(container, eur(2999))).toBe(true);
    // Por evento: afixa o escalão de entrada como "a partir de", sem riscado —
    // saiu do cupão (ADR-038), portanto não há preço base a abater.
    expect(priceIsShown(container, eur(999))).toBe(true);
    expect(priceIsShown(container, eur(7999))).toBe(false);
  });

  it('toggles to annual and shows 179,94 € (50% de 359,88 €)', () => {
    const { container } = renderWithRouter(<PricingAlt />);

    fireEvent.click(screen.getByRole('button', { name: pricing.billing.annual }));
    expect(priceIsShown(container, eur(17994))).toBe(true);
    expect(priceIsShown(container, eur(35988))).toBe(true);
  });

  it('gates PDF and integrations correctly per plan', () => {
    renderWithRouter(<PricingAlt />);

    // Relatório PDF e Integrações aparecem nos 3 cards (Grátis mostra "—").
    expect(screen.getAllByText(pricing.rows.report)).toHaveLength(3);
    expect(screen.getAllByText(pricing.rows.integrations)).toHaveLength(3);
    // Grátis: 2 direitos negados (PDF + integrações) → 2 traços.
    expect(screen.getAllByText('—')).toHaveLength(2);
    // Valores da matriz: 50 participantes e 10 fornecedores só no Grátis
    // (documentos e pastas saíram do gate — o Grátis mostra ilimitado neles).
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByText(pricing.values.unlimited).length).toBeGreaterThanOrEqual(4);
  });

  it('não promete participantes ilimitados no Por Evento (ADR-038)', () => {
    renderWithRouter(<PricingAlt />);

    // O cartão afixa "a partir de 9,99 €", e esse escalão dá 100 — anunciar
    // "Ilimitados" ao lado prometia o teto de topo pelo preço de entrada.
    const linhasParticipantes = screen
      .getAllByText(pricing.rows.participants)
      // A linha é o div que embrulha label e valor (PlanRow), não um <li>.
      .map((el) => el.parentElement.parentElement.textContent);

    // Uma linha por cartão: Grátis 50, Pro ilimitado, Por Evento a escada.
    expect(linhasParticipantes).toHaveLength(3);
    // O teto do escalão de entrada vem da fonte única, não de uma string fixa.
    const escadaEsperada = pricing.values.tierRange.replace(
      '{{min}}', String(PLANS.PAY_PER_EVENT.tiers[0].maxParticipants));
    expect(linhasParticipantes.filter((l) => l.includes(escadaEsperada))).toHaveLength(1);
    expect(linhasParticipantes.filter((l) => l.includes('50'))).toHaveLength(1);
  });

  it('does not render any trace of the old Flex/Organizador model', () => {
    renderWithRouter(<PricingAlt />);

    expect(screen.queryByText(/Plano Flex/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Organizador/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pax/i)).not.toBeInTheDocument();
  });

  it('shows the universal features strip', () => {
    renderWithRouter(<PricingAlt />);

    expect(screen.getByText(pricing.universal.lead)).toBeInTheDocument();
    expect(screen.getByText(pricing.universal.agenda)).toBeInTheDocument();
    expect(screen.getByText(pricing.universal.excel)).toBeInTheDocument();
  });
});

