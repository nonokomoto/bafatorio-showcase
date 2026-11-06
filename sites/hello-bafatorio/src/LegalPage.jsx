import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import BackToTop from './BackToTop.jsx';
import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';
import { getLegalDocuments } from './legal.js';
import {
  formatLegalDate,
  getLegalPageId,
  LEGAL_PAGES,
} from './legalRoutes.js';

const withoutSectionNumber = (title) => title.replace(/^\d+\.\s*/, '');

export default function LegalPage() {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'pt-PT';
  const pageId = getLegalPageId(window.location.pathname) ?? 'terms';
  const documents = getLegalDocuments(locale);
  const page = documents[pageId];
  const pageConfig = LEGAL_PAGES.find(({ id }) => id === pageId) ?? LEGAL_PAGES[0];
  const sections = Object.entries(page.sections);

  useEffect(() => {
    document.title = `${page.title} | Bafatório`;
  }, [page.title]);

  return (
    <div className="legal-shell">
      <SiteHeader />

      <main className="legal-main">
        <div className="legal-container">
          <header className="legal-heading">
            <p className="legal-heading__eyebrow">{t('legal.eyebrow')}</p>
            <h1>{page.title}</h1>
            <p>{page.lastUpdated} {formatLegalDate(locale)}</p>
          </header>

          <nav className="legal-navigation" aria-label={t('legal.navigationLabel')}>
            {LEGAL_PAGES.map(({ id, href }) => (
              <a key={id} href={href} aria-current={id === pageId ? 'page' : undefined}>
                {documents[id].title}
              </a>
            ))}
          </nav>

          <div className="legal-content-layout">
            <aside className="legal-toc">
              <p>{t('legal.onThisPage')}</p>
              <nav aria-label={t('legal.sectionNavigationLabel')}>
                {sections.map(([sectionId, section], index) => (
                  <a key={sectionId} href={`#${pageId}-${sectionId}`}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    {withoutSectionNumber(section.title)}
                  </a>
                ))}
              </nav>
            </aside>

            <article className="legal-document">
              {sections.map(([sectionId, section]) => {
                const isContact = sectionId === 'contact';
                const sectionTitleId = `${pageId}-${sectionId}-title`;
                return (
                  <section
                    key={sectionId}
                    id={`${pageId}-${sectionId}`}
                    className={isContact ? 'legal-section legal-section--contact' : 'legal-section'}
                    aria-labelledby={sectionTitleId}
                  >
                    <h2 id={sectionTitleId}>{section.title}</h2>
                    <p>{section.content}</p>
                    {isContact && (
                      <a href={`mailto:${pageConfig.email}`}>{pageConfig.email}</a>
                    )}
                  </section>
                );
              })}
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
      <BackToTop />
    </div>
  );
}
