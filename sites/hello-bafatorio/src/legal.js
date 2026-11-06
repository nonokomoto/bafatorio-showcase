import enUS from './i18n/locales/legal/en-US.json';
import frFR from './i18n/locales/legal/fr-FR.json';
import ptPT from './i18n/locales/legal/pt-PT.json';

const LEGAL_BY_LOCALE = {
  'en-US': enUS,
  'fr-FR': frFR,
  'pt-PT': ptPT,
};

export function getLegalDocuments(locale) {
  return LEGAL_BY_LOCALE[locale] ?? LEGAL_BY_LOCALE['pt-PT'];
}
