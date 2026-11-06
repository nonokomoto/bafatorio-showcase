import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SocialProof from './SocialProof.jsx';
import { initializeI18n } from './i18n/index.js';

describe('SocialProof', () => {
  it('renders the section heading and the seven event nodes', async () => {
    await initializeI18n({ browserLocales: ['pt-PT'], storage: null });
    render(<SocialProof />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Eventos que já contaram connosco' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Eventos ligados ao Bafatório' })).toBeInTheDocument();

    expect(screen.getByText('Human Leaders')).toBeInTheDocument();
    expect(screen.getByText('Parceiro tecnológico · Cabo Verde')).toBeInTheDocument();
    expect(screen.getByText('Powerlist 100')).toBeInTheDocument();
    expect(screen.getByText('2 edições · 2024 e 2025')).toBeInTheDocument();
    expect(screen.getByText('Ntú Natural')).toBeInTheDocument();
    expect(screen.getByText('Acampamento de jovens')).toBeInTheDocument();
    expect(screen.getByText('Casamentos')).toBeInTheDocument();
    expect(screen.getByText('2 eventos · Grande Lisboa')).toBeInTheDocument();
    expect(screen.getByText('Fórum de Inovação')).toBeInTheDocument();
    expect(screen.getByText('Mafra · 2026')).toBeInTheDocument();
    expect(screen.getByText('Batizado')).toBeInTheDocument();
    expect(screen.getByText('Vila Franca do Rosário')).toBeInTheDocument();
  });

  it('renders the localized copy when the locale is en-US', async () => {
    await initializeI18n({ browserLocales: ['en-US'], storage: null });
    render(<SocialProof />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Events that already counted on us' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Technology partner · Cabo Verde')).toBeInTheDocument();
  });
});
