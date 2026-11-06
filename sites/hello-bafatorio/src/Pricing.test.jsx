import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import Pricing from './Pricing.jsx';
import { initializeI18n } from './i18n/index.js';

describe('Pricing', () => {
  beforeEach(async () => {
    await initializeI18n({ browserLocales: ['pt-PT'], storage: null });
  });

  it('shows the three public plans and their current prices', () => {
    render(<Pricing />);

    const section = screen.getByRole('region', { name: /um plano para cada ritmo de evento/i });
    expect(within(section).getByText('Starter')).toBeInTheDocument();
    expect(within(section).getByText('Por evento')).toBeInTheDocument();
    expect(within(section).getByText('Pro')).toBeInTheDocument();
    expect(within(section).getByText('Grátis')).toBeInTheDocument();
    expect(within(section).getByText(/^9,99/)).toBeInTheDocument();
    expect(within(section).getByText(/^14,99/)).toBeInTheDocument();
    expect(within(section).getByText(/^29,99/).tagName).toBe('DEL');
    expect(within(section).getByText(/179,94/)).toBeInTheDocument();
  });

  it('updates the one-time price when the event capacity changes', () => {
    render(<Pricing />);

    const tier200 = screen.getByRole('button', { name: 'Até 200' });
    expect(screen.getByRole('button', { name: 'Até 100' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(tier200);
    expect(tier200).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/19,99/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sem limite' }));
    expect(screen.getByText(/34,99/)).toBeInTheDocument();
  });

  it('links every plan action directly to account creation', () => {
    render(<Pricing />);

    const actions = [
      screen.getByRole('link', { name: /começar com starter/i }),
      screen.getByRole('link', { name: /escolher plano por evento/i }),
      screen.getByRole('link', { name: /escolher plano pro/i }),
    ];

    for (const action of actions) {
      expect(action).toHaveAttribute('href', 'https://bafatorio.com/signup?utm_source=hello');
    }
  });
});
