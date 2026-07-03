// ESLint 9 flat config (ESM — package.json is "type":"module").
// Mirrors the old .eslintrc.cjs rules; scoped to app TS/TSX.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage', '**/*.config.js', 'scripts/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // react-hooks v5 flat preset (rules-of-hooks: error, exhaustive-deps: warn).
  reactHooks.configs['recommended-latest'],
  // react-refresh for Vite — sets only-export-components with allowConstantExport.
  reactRefresh.configs.vite(),
  // The two config files match **/*.{ts,tsx} and run in Node.
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
