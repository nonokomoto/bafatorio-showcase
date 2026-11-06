export const DEFAULT_LOCALE = 'pt-PT';
export const LANGUAGE_STORAGE_KEY = 'hello-bafatorio-language';
export const SUPPORTED_LOCALES = ['pt-PT', 'en-US', 'fr-FR'];

const LOCALE_BY_LANGUAGE = {
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-PT',
};

export function canonicalizeLocale(locale) {
  if (typeof locale !== 'string') return null;

  const language = locale.trim().split(/[-_]/)[0].toLowerCase();
  return LOCALE_BY_LANGUAGE[language] ?? null;
}

export function resolveInitialLocale({ browserLocales = [], storedLocale = null } = {}) {
  const persistedLocale = canonicalizeLocale(storedLocale);
  if (persistedLocale) return persistedLocale;

  for (const browserLocale of browserLocales) {
    const supportedLocale = canonicalizeLocale(browserLocale);
    if (supportedLocale) return supportedLocale;
  }

  return DEFAULT_LOCALE;
}
