import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App.jsx';
import { initializeI18n } from './i18n/index.js';

describe('App shell', () => {
  beforeEach(async () => {
    await initializeI18n({ browserLocales: ['pt-PT'], storage: null });
  });

  it('renders one main heading inside the main landmark', () => {
    render(<App />);

    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.documentElement.lang).toBe('pt-PT');
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe.run(container, {
      rules: {
        // jsdom has no canvas/layout engine; contrast is verified in the browser pass.
        'color-contrast': { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it('links both the hero and final CTAs directly to signup', () => {
    render(<App />);
    const ctas = screen.getAllByRole('link', { name: /^criar conta grátis$/i });

    expect(ctas).toHaveLength(2);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', 'https://bafatorio.com/signup?utm_source=hello');
    }
  });

  it('provides product navigation and account actions in the header', () => {
    render(<App />);

    const primaryNavigation = screen.getByRole('navigation', { name: /navegação principal/i });
    expect(within(primaryNavigation).getByRole('link', { name: 'Funcionalidades' })).toHaveAttribute('href', '/#features');
    expect(within(primaryNavigation).getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/#social-proof');
    expect(within(primaryNavigation).getByRole('link', { name: 'Demonstração' })).toHaveAttribute('href', '/#video');
    expect(within(primaryNavigation).getByRole('link', { name: 'Preços' })).toHaveAttribute('href', '/#pricing');

    expect(screen.getAllByRole('link', { name: /^entrar$/i })[0]).toHaveAttribute(
      'href',
      'https://bafatorio.com/signin?utm_source=hello'
    );
  });

  it('changes language from the full flag selector control', async () => {
    render(<App />);
    const selector = screen.getByRole('button', { name: /idioma atual: português/i });

    expect(selector.querySelector('img')).toHaveAttribute('src', '/flags/pt.svg');
    fireEvent.click(selector);
    const languageMenu = screen.getByRole('menu', { name: 'Idioma' });
    const frenchOption = within(languageMenu).getByRole('menuitemradio', { name: /français/i });
    expect(frenchOption.querySelector('img')).toHaveAttribute('src', '/flags/fr.svg');
    fireEvent.click(frenchOption);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fr-FR');
      expect(screen.getByRole('button', { name: /langue actuelle : français/i }).querySelector('img'))
        .toHaveAttribute('src', '/flags/fr.svg');
      expect(screen.getAllByRole('link', { name: /^se connecter$/i }).length).toBeGreaterThan(0);
    });
  });

  it('adds the solid navbar treatment only after the page starts scrolling', () => {
    const { container } = render(<App />);
    const header = container.querySelector('.site-header');

    expect(header).not.toHaveClass('site-header--scrolled');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 80 });
    fireEvent.scroll(window);
    expect(header).toHaveClass('site-header--scrolled');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    fireEvent.scroll(window);
    expect(header).not.toHaveClass('site-header--scrolled');
  });

  it('opens and closes the mobile navigation', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: /abrir menu/i });
    const mobileNavigation = document.getElementById('mobile-navigation');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(mobileNavigation).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('exposes support and legal information in the footer', () => {
    render(<App />);
    const footer = screen.getByRole('contentinfo');

    expect(footer).toContainElement(screen.getByRole('link', { name: /termos e condições/i }));
    expect(screen.getByRole('link', { name: /termos e condições/i })).toHaveAttribute(
      'href',
      '/terms'
    );
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute(
      'href',
      '/privacy'
    );
    expect(screen.getByRole('link', { name: /política de cookies/i })).toHaveAttribute(
      'href',
      '/cookies'
    );
    expect(screen.getByRole('link', { name: /precisas de ajuda.*support@bafatorio.com/i })).toHaveAttribute(
      'href',
      'mailto:support@bafatorio.com'
    );
    expect(within(footer).getByText(/plano gratuito/i)).toBeInTheDocument();
  });

  it('shows a floating back-to-top button only after meaningful scroll', () => {
    render(<App />);
    expect(screen.queryByRole('link', { name: /voltar ao topo/i })).not.toBeInTheDocument();

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 });
    fireEvent.scroll(window);
    expect(screen.getByRole('link', { name: /voltar ao topo/i })).toHaveAttribute('href', '#top');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    fireEvent.scroll(window);
    expect(screen.queryByRole('link', { name: /voltar ao topo/i })).not.toBeInTheDocument();
  });

  it('links the press mention to the article in a new tab', () => {
    render(<App />);

    const mencao = screen.getByRole('link', { name: /bantumen/i });
    expect(mencao).toHaveAttribute(
      'href',
      'https://www.bantumen.com/en/artigo/bafatorio-app-ney-carvalho-daniela-reis/'
    );
    expect(mencao).toHaveAttribute('target', '_blank');
    expect(mencao).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('keeps the hero focused without an event tag or category eyebrow', () => {
    render(<App />);

    expect(screen.queryByText(/apresentado no human leaders/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sistema de gestão de eventos/i)).not.toBeInTheDocument();
  });

  it('distinguishes which CTA was clicked', () => {
    window.umami = { track: vi.fn() };
    render(<App />);
    const ctas = screen.getAllByRole('link', { name: /^criar conta grátis$/i });
    // jsdom cannot navigate; stop the anchors' default so clicks only exercise tracking.
    for (const cta of ctas) cta.addEventListener('click', (e) => e.preventDefault());

    fireEvent.click(ctas[0]);
    expect(window.umami.track).toHaveBeenCalledWith('cta_click', { placement: 'hero' });

    fireEvent.click(ctas[1]);
    expect(window.umami.track).toHaveBeenCalledWith('cta_click', { placement: 'final' });

    delete window.umami;
  });

  // Arriving from a legal page (/#pricing) is a fresh document: the browser
  // resolves the fragment while parsing, before React has rendered any section.
  it('scrolls to the section named by the fragment on a cold load', () => {
    window.history.replaceState({}, '', '/#pricing');
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

    render(<App />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(document.getElementById('pricing'));
    // html has scroll-behavior: smooth, which an argument-less call inherits.
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant' });

    scrollIntoView.mockRestore();
    window.history.replaceState({}, '', '/');
  });

  it('leaves the scroll position alone when there is no fragment', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

    render(<App />);

    expect(scrollIntoView).not.toHaveBeenCalled();
    scrollIntoView.mockRestore();
  });
});
