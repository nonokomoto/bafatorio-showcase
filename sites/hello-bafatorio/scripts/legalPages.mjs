// The landing is client-rendered from a single index.html. The legal routes are
// built by swapping the per-page head block for their own, so a shared crawler
// or a shared link preview never sees the homepage's metadata on /terms.
//
// Copy stays pt-PT like the homepage's: the static head serves scrapers and the
// QR/link audience, while the rendered page translates itself client-side.
const SITE_ORIGIN = 'https://hello.bafatorio.com';

const BLOCK_PATTERN = /^[ \t]*<!-- #head:page -->[\s\S]*?<!-- \/head:page -->/m;

export const LEGAL_ROUTES = {
  terms: {
    path: '/terms',
    title: 'Termos de Utilização',
    description: 'Termos de Utilização do Bafatório: condições e responsabilidades de uso da plataforma.',
  },
  privacy: {
    path: '/privacy',
    title: 'Política de Privacidade',
    description: 'Política de Privacidade do Bafatório: que dados tratamos, porquê, e os teus direitos.',
  },
  cookies: {
    path: '/cookies',
    title: 'Política de Cookies',
    description: 'Política de Cookies do Bafatório: que cookies usamos e para que servem.',
  },
};

function pageHead({ path, title, description }) {
  const fullTitle = `${title} | Bafatório`;

  return `    <meta name="description" content="${description}" />
    <title>${fullTitle}</title>
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Bafatório" />
    <meta property="og:url" content="${SITE_ORIGIN}${path}" />
    <meta property="og:title" content="${fullTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="pt_PT" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${fullTitle}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/og.png" />`;
}

/**
 * Swap the per-page head block of the built index.html for `route`'s own.
 * Throws rather than emitting a page that silently carries the homepage's
 * title, canonical URL and hero preload.
 */
export function renderLegalHtml(indexHtml, route) {
  if (!BLOCK_PATTERN.test(indexHtml)) {
    throw new Error(
      'index.html is missing the <!-- #head:page --> … <!-- /head:page --> block; '
      + `cannot build ${route.path} without leaking the homepage metadata.`
    );
  }

  return indexHtml.replace(BLOCK_PATTERN, pageHead(route));
}
