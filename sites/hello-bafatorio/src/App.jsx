import { lazy, Suspense, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { track } from './analytics.js';
import BackToTop from './BackToTop.jsx';
import Features from './Features.jsx';
import FinalCta from './FinalCta.jsx';
import Pricing from './Pricing.jsx';
import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';
import SocialProof from './SocialProof.jsx';
import VideoShowcase from './VideoShowcase.jsx';
import { getLegalPageId } from './legalRoutes.js';
import { SIGNUP_URL } from './signup.js';

const LegalPage = lazy(() => import('./LegalPage.jsx'));

// Same-origin responsive variants (public/hero) — a separate S3 origin cost an
// extra DNS+TLS handshake on the LCP element; keep index.html preload in sync.
const PRODUCT_SHOT = '/hero/summit-inovacao-detalhe-1440.webp';
const PRODUCT_SHOT_SRCSET = [640, 960, 1440, 2048]
  .map((w) => `/hero/summit-inovacao-detalhe-${w}.webp ${w}w`)
  .join(', ');
const PRODUCT_SHOT_SIZES = '(min-width: 1280px) 1110px, 90vw';

const PRESS_ARTICLE_URL = 'https://www.bantumen.com/en/artigo/bafatorio-app-ney-carvalho-daniela-reis/';

export default function App() {
  const { t } = useTranslation();

  // Cross-document anchors (/#pricing from a legal page) never land: the browser
  // resolves the fragment while parsing, and nothing is rendered until React
  // mounts. Restore it here — before paint, so the first frame is already in
  // place — and explicitly instant, since html's scroll-behavior: smooth would
  // otherwise animate the whole page down. Must sit above the legal early
  // return to keep the hook order stable across routes.
  useLayoutEffect(() => {
    const { hash } = window.location;
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, []);

  if (getLegalPageId(window.location.pathname)) {
    return (
      <Suspense fallback={<div className="legal-loading" role="status">{t('legal.loading')}</div>}>
        <LegalPage />
      </Suspense>
    );
  }

  return (
    <div className="site-shell">
      <div className="stage-light" aria-hidden="true">
        <span className="stage-light__beam stage-light__beam--left" />
        <span className="stage-light__beam stage-light__beam--right" />
      </div>

      <SiteHeader />

      <main id="top">
        <section className="hero-foundation" aria-labelledby="hero-title">
          <div className="hero-foundation__copy">
            <h1 id="hero-title">{t('headline')}</h1>
            <p className="hero-foundation__description">{t('description')}</p>
            <a className="cta" href={SIGNUP_URL} onClick={() => track('cta_click', { placement: 'hero' })}>
              {t('cta')}
              <span className="cta__arrow" aria-hidden="true">→</span>
            </a>
            <p className="hero-note">{t('heroNote')}</p>
            <a
              className="hero-press"
              href={PRESS_ARTICLE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('press')}
              <span className="hero-press__arrow" aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="product-stage" aria-label={t('productShotAlt')}>
            <div className="product-window">
              <img
                className="hero-product-shot"
                src={PRODUCT_SHOT}
                srcSet={PRODUCT_SHOT_SRCSET}
                sizes={PRODUCT_SHOT_SIZES}
                width="3158"
                height="1624"
                loading="eager"
                // eslint-disable-next-line react/no-unknown-property -- React 18 only forwards the lowercase form; camelCase lands in React 19
                fetchpriority="high"
                decoding="async"
                alt={t('productShotAlt')}
              />
            </div>
          </div>
        </section>

        <Features />
        <SocialProof />
        <VideoShowcase />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}
