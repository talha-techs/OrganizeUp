import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        // Uppercase / underscore-prefixed vars are intentionally unused (e.g. Type-only
        // imports). Also ignore `motion` because ESLint 9 does not count JSX member
        // expressions (<motion.div>) as a reference to the `motion` namespace object.
        varsIgnorePattern: '^([A-Z_]|motion)',
        // Same exception for destructured callback/component params (e.g. `icon: Icon`).
        argsIgnorePattern: '^[A-Z_]',
        // Catch-block identifiers named `err`, `error`, or `e` are conventionally unused.
        caughtErrorsIgnorePattern: '^(err|error|e)$',
      }],
      // setState inside an effect body is flagged by react-hooks v7; these are intentional
      // initialisation / reset patterns, so downgrade to a warning rather than a build error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
