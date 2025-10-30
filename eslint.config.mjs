import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import { globalIgnores } from 'eslint/config';
import eslintPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const simpleImportSortConfig = {
  plugins: {
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    'max-len': [
      'warn',
      {
        code: 120,
        tabWidth: 2,
        ignoreUrls: true,
        ignorePattern: '^(import .*|.*tooltip=.*)',
      },
    ],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['src/*'],
            message: 'please use relative imports.',
          },
        ],
      },
    ],
  },
};

const vitestConfig = {
  files: ['**/*.test.ts', '**/*.test.tsx'],
  plugins: {
    vitest: vitest,
  },
  rules: {
    ...vitest.configs.recommended.rules,
    'vitest/max-nested-describe': ['error', { max: 3 }],
    'vitest/require-top-level-describe': 'error',
    'vitest/padding-around-all': 'error',
    'vitest/prefer-called-exactly-once-with': 'off',
  },
};

export default tseslint.config(
  globalIgnores(['**/node_modules/', '.git/', 'dist/', 'release/', '**/gen/**']),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  simpleImportSortConfig,
  vitestConfig,
  eslint.configs.recommended,
  eslintPrettierRecommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      'newline-before-return': 'error',
      curly: ['error', 'all'],
    },
  }
);
