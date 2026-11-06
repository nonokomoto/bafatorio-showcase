import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { setLanguage } from './i18n/index.js';

const LANGUAGES = [
  { locale: 'pt-PT', code: 'PT', flag: '/flags/pt.svg', nameKey: 'pt' },
  { locale: 'en-US', code: 'EN', flag: '/flags/gb.svg', nameKey: 'en' },
  { locale: 'fr-FR', code: 'FR', flag: '/flags/fr.svg', nameKey: 'fr' },
];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const activeLanguage = LANGUAGES.find(({ locale }) => locale === i18n.resolvedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  const chooseLanguage = async (locale) => {
    await setLanguage(locale);
    setOpen(false);
  };

  return (
    <div className="language-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="language-control"
        aria-label={t('languageCurrent', { language: t(`languages.${activeLanguage.nameKey}`) })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img className="language-control__flag" src={activeLanguage.flag} alt="" aria-hidden="true" />
        <span className="language-control__code" aria-hidden="true">{activeLanguage.code}</span>
        <svg
          className="language-control__caret"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div className="language-menu" role="menu" aria-label={t('languageLabel')}>
          {LANGUAGES.map((language) => {
            const selected = language.locale === activeLanguage.locale;
            return (
              <button
                key={language.locale}
                type="button"
                className={`language-menu__option${selected ? ' language-menu__option--selected' : ''}`}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => chooseLanguage(language.locale)}
              >
                <img src={language.flag} alt="" aria-hidden="true" />
                <span>
                  <strong>{t(`languages.${language.nameKey}`)}</strong>
                  <small>{language.code}</small>
                </span>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m3.5 8.2 2.8 2.8 6.2-6.2" />
                </svg>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
