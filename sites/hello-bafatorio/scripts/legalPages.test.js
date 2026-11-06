import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { LEGAL_ROUTES, renderLegalHtml } from './legalPages.mjs';

describe('legal route HTML', () => {
  let indexHtml;

  beforeAll(async () => {
    indexHtml = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');
  });

  it('gives each route its own canonical URL and title', () => {
    const terms = renderLegalHtml(indexHtml, LEGAL_ROUTES.terms);

    expect(terms).toContain('content="https://hello.bafatorio.com/terms"');
    expect(terms).toContain('<title>Termos de Utilização | Bafatório</title>');
    expect(terms).toContain('property="og:title" content="Termos de Utilização | Bafatório"');
    expect(terms).toContain('name="twitter:title" content="Termos de Utilização | Bafatório"');
    expect(terms).not.toContain('https://hello.bafatorio.com/"');
    expect(terms).not.toContain('Toda a organização do teu evento num só lugar');
  });

  it('drops the hero preload the legal routes never render', () => {
    expect(indexHtml).toContain('as="image"');

    for (const route of Object.values(LEGAL_ROUTES)) {
      expect(renderLegalHtml(indexHtml, route)).not.toContain('as="image"');
    }
  });

  it('keeps the shared head intact', () => {
    const privacy = renderLegalHtml(indexHtml, LEGAL_ROUTES.privacy);

    expect(privacy).toContain('href="/fonts/lexend-500-latin.woff2"');
    expect(privacy).toContain('href="/site.webmanifest"');
    expect(privacy).toContain('href="/favicon.svg"');
    expect(privacy).toContain('data-website-id="00000000-0000-0000-0000-000000000000"');
    expect(privacy).toContain('<div id="root"></div>');
    // og:image is the brand card, shared by every route.
    expect(privacy).toContain('content="https://hello.bafatorio.com/og.png"');
  });

  it('refuses to build when the per-page block is gone', () => {
    const withoutMarkers = indexHtml.replace('<!-- #head:page -->', '');

    expect(() => renderLegalHtml(withoutMarkers, LEGAL_ROUTES.cookies))
      .toThrow(/head:page/);
  });
});
