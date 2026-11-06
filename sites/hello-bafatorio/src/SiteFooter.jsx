import { useTranslation } from 'react-i18next';

import BrandMark from './BrandMark.jsx';
import { track } from './analytics.js';
import {
  COOKIES_URL,
  PRIVACY_URL,
  SIGNIN_URL,
  SIGNUP_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from './signup.js';

const PLATFORM_LINKS = [
  { id: 'features', href: '/#features' },
  { id: 'events', href: '/#social-proof' },
  { id: 'demo', href: '/#video' },
  { id: 'pricing', href: '/#pricing' },
];

const LEGAL_LINKS = [
  { id: 'terms', href: TERMS_URL },
  { id: 'privacy', href: PRIVACY_URL },
  { id: 'cookies', href: COOKIES_URL },
];

export default function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <span className="site-footer__glow" aria-hidden="true" />

      <div className="site-footer__main">
        <div className="site-footer__brand-block">
          <a className="footer-brand" href="/#top" aria-label={t('nav.home')}>
            <BrandMark className="footer-brand__mark" />
          </a>
          <h2>{t('footer.title')}</h2>
          <p className="footer-description">{t('footer.description')}</p>
          <a className="footer-support" href={`mailto:${SUPPORT_EMAIL}`}>
            <span>{t('footer.supportIntro')}</span>
            <strong>{SUPPORT_EMAIL}</strong>
            <i aria-hidden="true">↗</i>
          </a>
        </div>

        <nav className="footer-navigation" aria-label={t('footer.navigationLabel')}>
          <div className="footer-column">
            <h3>{t('footer.platform')}</h3>
            {PLATFORM_LINKS.map(({ id, href }) => (
              <a key={id} href={href}>{t(`footer.links.${id}`)}</a>
            ))}
          </div>

          <div className="footer-column">
            <h3>{t('footer.account')}</h3>
            <a
              className="footer-account-cta"
              href={SIGNUP_URL}
              onClick={() => track('cta_click', { placement: 'footer' })}
            >
              {t('footer.links.createAccount')}
              <span aria-hidden="true">→</span>
            </a>
            <a href={SIGNIN_URL}>{t('footer.links.signIn')}</a>
          </div>

          <div className="footer-column">
            <h3>{t('footer.legal')}</h3>
            {LEGAL_LINKS.map(({ id, href }) => (
              <a key={id} href={href}>{t(`footer.links.${id}`)}</a>
            ))}
          </div>
        </nav>
      </div>

      <div className="footer-highlights" aria-label={t('footer.highlightsLabel')}>
        <div><span>01</span><strong>{t('footer.highlights.free')}</strong></div>
        <div><span>02</span><strong>{t('footer.highlights.languages')}</strong></div>
        <div><span>03</span><strong>{t('footer.highlights.team')}</strong></div>
      </div>

      <div className="site-footer__bottom">
        <div>
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
        <p>{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
