import { describe, expect, it } from 'vitest';

import {
  canonicalizeLocale,
  resolveInitialLocale,
} from './locale.js';

describe('canonicalizeLocale', () => {
  it.each([
    ['pt', 'pt-PT'],
    ['pt-BR', 'pt-PT'],
    ['en', 'en-US'],
    ['en-GB', 'en-US'],
    ['fr', 'fr-FR'],
    ['fr-BE', 'fr-FR'],
  ])('maps %s to %s', (input, expected) => {
    expect(canonicalizeLocale(input)).toBe(expected);
  });

  it('returns null for an unsupported locale', () => {
    expect(canonicalizeLocale('de-DE')).toBeNull();
  });
});

describe('resolveInitialLocale', () => {
  it('prefers a supported persisted locale', () => {
    expect(resolveInitialLocale({
      browserLocales: ['fr-BE'],
      storedLocale: 'en-US',
    })).toBe('en-US');
  });

  it('ignores an invalid persisted locale and uses the browser language', () => {
    expect(resolveInitialLocale({
      browserLocales: ['fr-BE'],
      storedLocale: 'invalid',
    })).toBe('fr-FR');
  });

  it('falls back to pt-PT when no supported locale exists', () => {
    expect(resolveInitialLocale({
      browserLocales: ['de-DE'],
      storedLocale: null,
    })).toBe('pt-PT');
  });
});
