import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUS from './locales/en-US.js';
import frFR from './locales/fr-FR.js';
import ptPT from './locales/pt-PT.js';
import {
  canonicalizeLocale,
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  resolveInitialLocale,
  SUPPORTED_LOCALES,
} from './locale.js';

export const i18n = i18next.createInstance();

let currentStorage;
let languageListenerRegistered = false;

function readStoredLocale(storage) {
  try {
    return storage?.getItem(LANGUAGE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function persistLocale(storage, locale) {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable in private browsing; language still works in-memory.
  }
}

function syncDocumentLanguage(locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export async function initializeI18n({
  browserLocales = globalThis.window?.navigator?.languages ?? [],
  storage = globalThis.window?.localStorage,
} = {}) {
  currentStorage = storage;
  const locale = resolveInitialLocale({
    browserLocales,
    storedLocale: readStoredLocale(storage),
  });

  syncDocumentLanguage(locale);

  if (!languageListenerRegistered) {
    i18n.on('languageChanged', (nextLocale) => {
      const canonicalLocale = canonicalizeLocale(nextLocale) ?? DEFAULT_LOCALE;
      syncDocumentLanguage(canonicalLocale);
      persistLocale(currentStorage, canonicalLocale);
    });
    languageListenerRegistered = true;
  }

  await i18n
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LOCALE,
      interpolation: { escapeValue: false },
      lng: locale,
      resources: {
        'en-US': enUS,
        'fr-FR': frFR,
        'pt-PT': ptPT,
      },
      supportedLngs: SUPPORTED_LOCALES,
    });

  return i18n;
}

export async function setLanguage(locale, { storage = currentStorage } = {}) {
  const canonicalLocale = canonicalizeLocale(locale) ?? DEFAULT_LOCALE;
  currentStorage = storage;
  await i18n.changeLanguage(canonicalLocale);
}
