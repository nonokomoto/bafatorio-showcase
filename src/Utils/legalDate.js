export const LEGAL_LAST_UPDATED_ISO = '2026-05-01';

export const formatLegalDate = (locale) =>
  new Date(LEGAL_LAST_UPDATED_ISO).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  });
