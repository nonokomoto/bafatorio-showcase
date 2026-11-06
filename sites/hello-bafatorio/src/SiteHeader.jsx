import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BrandMark from './BrandMark.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { track } from './analytics.js';
import { SIGNIN_URL, SIGNUP_URL } from './signup.js';

const NAV_ITEMS = [
  { id: 'features', href: '/#features' },
  { id: 'proof', href: '/#social-proof' },
  { id: 'demo', href: '/#video' },
  { id: 'pricing', href: '/#pricing' },
];

export default function SiteHeader() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 16);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <a className="brand" href="/#top" aria-label={t('nav.home')} onClick={closeMenu}>
        <BrandMark className="brand__mark" />
      </a>

      <nav className="site-nav site-nav--desktop" aria-label={t('nav.primaryLabel')}>
        {NAV_ITEMS.map(({ id, href }) => (
          <a key={id} href={href}>{t(`nav.${id}`)}</a>
        ))}
      </nav>

      <div className="site-header__meta">
        <LanguageSelector />

        <a className="header-login" href={SIGNIN_URL}>{t('nav.signIn')}</a>
        <a
          className="header-signup"
          href={SIGNUP_URL}
          onClick={() => track('cta_click', { placement: 'header' })}
        >
          {t('nav.signUp')}
        </a>

        <button
          type="button"
          className="menu-toggle"
          aria-label={t(menuOpen ? 'nav.closeMenu' : 'nav.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <nav
        id="mobile-navigation"
        className={`mobile-navigation${menuOpen ? ' mobile-navigation--open' : ''}`}
        aria-label={t('nav.mobileLabel')}
        aria-hidden={!menuOpen}
      >
        {NAV_ITEMS.map(({ id, href }) => (
          <a key={id} href={href} tabIndex={menuOpen ? 0 : -1} onClick={closeMenu}>
            {t(`nav.${id}`)}
          </a>
        ))}
        <div className="mobile-navigation__actions">
          <a href={SIGNIN_URL} tabIndex={menuOpen ? 0 : -1}>{t('nav.signIn')}</a>
          <a
            className="header-signup"
            href={SIGNUP_URL}
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => {
              closeMenu();
              track('cta_click', { placement: 'mobile-navigation' });
            }}
          >
            {t('nav.signUp')}
          </a>
        </div>
      </nav>
    </header>
  );
}
