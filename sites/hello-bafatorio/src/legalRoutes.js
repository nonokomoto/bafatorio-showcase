export const LEGAL_LAST_UPDATED_ISO = '2026-05-01';

export const LEGAL_PAGES = [
  { id: 'terms', href: '/terms', email: 'support@bafatorio.com' },
  { id: 'privacy', href: '/privacy', email: 'privacy@bafatorio.com' },
  { id: 'cookies', href: '/cookies', email: 'privacy@bafatorio.com' },
];

export function getLegalPageId(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return LEGAL_PAGES.find(({ href }) => href === normalizedPath)?.id ?? null;
}

export function formatLegalDate(locale) {
  return new Date(`${LEGAL_LAST_UPDATED_ISO}T12:00:00Z`).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  });
}
