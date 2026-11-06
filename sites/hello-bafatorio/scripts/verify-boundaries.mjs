import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from '@babel/parser';

const FORBIDDEN_DEPENDENCIES = new Set([
  '@aws-amplify/api-graphql',
  '@aws-amplify/auth',
  '@aws-amplify/backend',
  '@reduxjs/toolkit',
  'aws-amplify',
  'react-redux',
  'react-router-dom',
]);

export function findManifestViolations(manifest) {
  const dependencyNames = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ];

  return dependencyNames
    .filter((dependency) => FORBIDDEN_DEPENDENCIES.has(dependency))
    .sort()
    .map((dependency) => `Forbidden dependency in package.json: ${dependency}`);
}

function collectImportSpecifiers(source) {
  const ast = parse(source, {
    plugins: ['jsx'],
    sourceType: 'module',
  });
  const specifiers = [];

  function visit(node) {
    if (!node || typeof node !== 'object') return;

    if (
      node.type === 'ImportDeclaration'
      || node.type === 'ExportAllDeclaration'
      || node.type === 'ExportNamedDeclaration'
    ) {
      if (node.source?.value) specifiers.push(node.source.value);
    } else if (node.type === 'ImportExpression' && node.source?.type === 'StringLiteral') {
      specifiers.push(node.source.value);
    } else if (
      node.type === 'CallExpression'
      && node.callee?.type === 'Import'
      && node.arguments?.[0]?.type === 'StringLiteral'
    ) {
      specifiers.push(node.arguments[0].value);
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  }

  visit(ast.program);
  return specifiers;
}

export async function findImportViolations({ siteRoot, importerPath, source }) {
  const violations = [];

  for (const specifier of collectImportSpecifiers(source)) {
    if (!specifier.startsWith('.')) continue;

    const resolvedImport = path.resolve(path.dirname(importerPath), specifier);
    const relativeImport = path.relative(siteRoot, resolvedImport);
    const escapesSite = relativeImport.startsWith('..') || path.isAbsolute(relativeImport);

    if (escapesSite) {
      const importer = path.relative(siteRoot, importerPath).split(path.sep).join('/');
      violations.push(
        `${importer} imports outside hello-bafatorio: ${specifier}`
      );
    }
  }

  return violations;
}

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(entryPath));
    } else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function main() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const siteRoot = path.resolve(scriptDirectory, '..');
  const manifest = JSON.parse(
    await readFile(path.join(siteRoot, 'package.json'), 'utf8')
  );
  const sourceFiles = await listSourceFiles(siteRoot);
  const importViolations = await Promise.all(
    sourceFiles.map(async (sourceFile) => findImportViolations({
      siteRoot,
      importerPath: sourceFile,
      source: await readFile(sourceFile, 'utf8'),
    }))
  );
  const violations = [
    ...findManifestViolations(manifest),
    ...importViolations.flat(),
  ];

  if (violations.length > 0) {
    console.error(violations.join('\n'));
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
