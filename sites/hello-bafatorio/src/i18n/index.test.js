import { afterEach, describe, expect, it } from 'vitest';

import { initializeI18n, setLanguage } from './index.js';
import { LANGUAGE_STORAGE_KEY } from './locale.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('i18n document integration', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('sets the document language during initialization', async () => {
    const storage = createMemoryStorage();
    storage.setItem(LANGUAGE_STORAGE_KEY, 'fr-FR');

    await initializeI18n({ browserLocales: ['en-US'], storage });

    expect(document.documentElement.lang).toBe('fr-FR');
  });

  it('updates the document and persisted preference when language changes', async () => {
    const storage = createMemoryStorage();
    await initializeI18n({ browserLocales: ['pt-PT'], storage });

    await setLanguage('en-GB', { storage });

    expect(document.documentElement.lang).toBe('en-US');
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US');
  });
});
