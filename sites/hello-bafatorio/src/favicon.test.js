import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('favicon metadata', () => {
  it('publishes browser, SVG and Apple icon metadata', async () => {
    const html = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/favicon-32x32.png"');
    expect(html).toContain('href="/favicon-16x16.png"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/site.webmanifest"');
  });

  it.each([
    'favicon.ico',
    'favicon.svg',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'site.webmanifest',
  ])('includes %s in the public directory', async (filename) => {
    const asset = await readFile(resolve(process.cwd(), 'public', filename));
    expect(asset.byteLength).toBeGreaterThan(0);
  });
});
