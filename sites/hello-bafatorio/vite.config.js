import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { LEGAL_ROUTES, renderLegalHtml } from './scripts/legalPages.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('.', import.meta.url));

function legalEntrypoints() {
  return {
    name: 'hello-legal-entrypoints',
    apply: 'build',
    async closeBundle() {
      const distDirectory = fileURLToPath(new URL('./dist/', import.meta.url));
      const indexHtml = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8');

      await Promise.all(Object.values(LEGAL_ROUTES).map(async (route) => {
        // Derive the directory from the path so the folder and the canonical
        // URL can never drift apart.
        const routeDirectory = join(distDirectory, route.path.slice(1));

        await mkdir(routeDirectory, { recursive: true });
        await writeFile(
          join(routeDirectory, 'index.html'),
          renderLegalHtml(indexHtml, route),
          'utf8'
        );
      }));
    },
  };
}

export default defineConfig({
  root: PROJECT_ROOT,
  plugins: [react(), legalEntrypoints()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://hello.bafatorio.com/',
      },
    },
    globals: true,
    setupFiles: './src/test/setupTests.js',
  },
});
