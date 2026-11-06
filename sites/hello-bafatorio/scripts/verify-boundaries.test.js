import { describe, expect, test } from 'vitest';
import {
  findImportViolations,
  findManifestViolations,
} from './verify-boundaries.mjs';

describe('hello-bafatorio package boundary', () => {
  test('rejects dependencies owned by the main application', () => {
    const violations = findManifestViolations({
      dependencies: {
        react: '^18.3.1',
        'react-redux': '^9.1.2',
      },
    });

    expect(violations).toEqual([
      'Forbidden dependency in package.json: react-redux',
    ]);
  });

  test('rejects relative imports that escape the site root', async () => {
    const violations = await findImportViolations({
      siteRoot: '/repo/sites/hello-bafatorio',
      importerPath: '/repo/sites/hello-bafatorio/src/App.jsx',
      source: "import Dashboard from '../../../src/Components/Dashboard.jsx';",
    });

    expect(violations).toEqual([
      'src/App.jsx imports outside hello-bafatorio: ../../../src/Components/Dashboard.jsx',
    ]);
  });

  test('analyses imports in JSX source files', async () => {
    const violations = await findImportViolations({
      siteRoot: '/repo/sites/hello-bafatorio',
      importerPath: '/repo/sites/hello-bafatorio/src/App.jsx',
      source: `
        import Dashboard from '../../../src/Components/Dashboard.jsx';
        export default function App() { return <main><Dashboard /></main>; }
      `,
    });

    expect(violations).toEqual([
      'src/App.jsx imports outside hello-bafatorio: ../../../src/Components/Dashboard.jsx',
    ]);
  });

  test('ignores import-like examples inside strings', async () => {
    const violations = await findImportViolations({
      siteRoot: '/repo/sites/hello-bafatorio',
      importerPath: '/repo/sites/hello-bafatorio/src/example.js',
      source: "const example = \"import Thing from '../../../src/Thing.js'\";",
    });

    expect(violations).toEqual([]);
  });
});
