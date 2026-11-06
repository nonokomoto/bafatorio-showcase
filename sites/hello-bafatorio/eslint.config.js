import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const forbiddenImports = [
  '@aws-amplify/api-graphql',
  '@aws-amplify/auth',
  '@aws-amplify/backend',
  '@reduxjs/toolkit',
  'aws-amplify',
  'react-redux',
  'react-router-dom',
];

export default [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      sourceType: 'module',
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', {
        paths: forbiddenImports.map((name) => ({
          name,
          message: 'The hello landing must remain independent from the main application.',
        })),
        patterns: [{
          group: ['@aws-amplify/*'],
          message: 'The hello landing must not depend on Amplify application clients.',
        }],
      }],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
    settings: {
      react: { version: '18.3' },
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}', '*.config.js'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
