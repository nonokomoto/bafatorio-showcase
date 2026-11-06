import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from './App.jsx';
import { initializeI18n } from './i18n/index.js';

describe('Hello legal pages', () => {
  beforeEach(async () => {
    window.history.replaceState({}, '', '/terms');
    await initializeI18n({ browserLocales: ['pt-PT'], storage: null });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    document.title = '';
  });

  it('serves the complete terms document inside the Hello layout', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Termos de Utilização' })).toBeInTheDocument();
    const legalDocument = screen.getByRole('article');
    expect(within(legalDocument).getAllByRole('heading', { level: 2 })).toHaveLength(6);
    expect(within(legalDocument).getByText(/modificar, melhorar ou descontinuar qualquer aspeto/i)).toBeInTheDocument();
    expect(within(legalDocument).getByRole('link', { name: 'support@bafatorio.com' })).toHaveAttribute(
      'href',
      'mailto:support@bafatorio.com'
    );
    expect(screen.queryByRole('heading', { level: 1, name: /toda a organização/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe('Termos de Utilização | Bafatório');
    });
  });

  it('provides internal navigation between every legal document', async () => {
    render(<App />);

    const navigation = await screen.findByRole('navigation', { name: 'Documentos legais' });
    expect(within(navigation).getByRole('link', { name: 'Termos de Utilização' })).toHaveAttribute('href', '/terms');
    expect(within(navigation).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy');
    expect(within(navigation).getByRole('link', { name: 'Política de Cookies' })).toHaveAttribute('href', '/cookies');
    expect(within(navigation).getByRole('link', { name: 'Termos de Utilização' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('uses the same primary menu and account actions as the homepage', async () => {
    render(<App />);

    const primaryNavigation = await screen.findByRole('navigation', { name: /navegação principal/i });
    expect(within(primaryNavigation).getByRole('link', { name: 'Funcionalidades' })).toHaveAttribute(
      'href',
      '/#features'
    );
    expect(within(primaryNavigation).getByRole('link', { name: 'Preços' })).toHaveAttribute(
      'href',
      '/#pricing'
    );
    expect(screen.getAllByRole('link', { name: /^entrar$/i })[0]).toHaveAttribute(
      'href',
      'https://bafatorio.com/signin?utm_source=hello'
    );
    expect(screen.getAllByRole('link', { name: /^começar grátis$/i })[0]).toHaveAttribute(
      'href',
      'https://bafatorio.com/signup?utm_source=hello'
    );
  });

  it('offers an index linking to every section in the document', async () => {
    render(<App />);

    const sectionNavigation = await screen.findByRole('navigation', { name: 'Secções deste documento' });
    const sectionLinks = within(sectionNavigation).getAllByRole('link');
    expect(sectionLinks).toHaveLength(6);
    expect(sectionLinks[0]).toHaveAttribute('href', '#terms-introduction');
    expect(document.getElementById('terms-introduction')).toHaveAttribute(
      'aria-labelledby',
      'terms-introduction-title'
    );
  });

  it('renders privacy directly and translates the complete page to French', async () => {
    window.history.replaceState({}, '', '/privacy');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /idioma atual: português/i }));
    const languageMenu = screen.getByRole('menu', { name: 'Idioma' });
    fireEvent.click(within(languageMenu).getByRole('menuitemradio', { name: /français/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeInTheDocument();
    });
    expect(within(screen.getByRole('article')).getAllByRole('heading', { level: 2 })).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'privacy@bafatorio.com' })).toHaveAttribute(
      'href',
      'mailto:privacy@bafatorio.com'
    );
  });

  it('accepts the cookie route with a trailing slash', async () => {
    window.history.replaceState({}, '', '/cookies/');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Política de Cookies' })).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getAllByRole('heading', { level: 2 })).toHaveLength(7);
    expect(screen.getByText(/utilizamos exclusivamente cookies essenciais/i)).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Termos de Utilização' });
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
