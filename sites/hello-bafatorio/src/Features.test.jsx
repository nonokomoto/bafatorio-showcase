import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Features from './Features.jsx';
import { initializeI18n } from './i18n/index.js';

describe('Features', () => {
  it('renders the section heading and the four feature cards', async () => {
    await initializeI18n({ browserLocales: ['pt-PT'], storage: null });
    render(<Features />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Tudo o que precisas para gerir melhor' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 3, name: 'Participantes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Fornecedores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
  });
});
