import neostandard from 'neostandard';
import unicorn from 'eslint-plugin-unicorn';
import js from '@eslint/js';
import json from 'eslint-plugin-jsonc';
import jsdoc from 'eslint-plugin-jsdoc';
import security from 'eslint-plugin-security';

export default [
  ...json.configs['flat/recommended-with-json'],
  js.configs['recommended'],
  unicorn.configs['flat/recommended'],
  ...neostandard({ semi: true }),
  jsdoc.configs['flat/recommended-typescript-flavor'],
  security.configs['recommended'],
  {
    rules: {
      'array-callback-return': 'warn',
      'no-await-in-loop': 'warn',
      'no-constructor-return': 'warn',
      'no-duplicate-imports': 'error',
      'no-inner-declarations': 'error',
      'no-promise-executor-return': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'error',
      'no-use-before-define': 'error',
      'no-useless-assignment': 'error',
      'require-atomic-updates': 'warn',
      'jsdoc/informative-docs': 'warn',
      'jsdoc/sort-tags': 'warn',
      'jsdoc/require-hyphen-before-param-description': 'warn',
      'jsdoc/require-throws': 'warn',
      'jsdoc/require-file-overview': 'off',
      'jsdoc/require-description': 'warn',
      'jsdoc/check-syntax': 'warn',
      'unicorn/no-unused-properties': 'warn',
      'unicorn/consistent-destructuring': 'error',
      'jsonc/auto': 'warn',
      "@stylistic/space-before-function-paren": ["error", "never"],
      "prefer-arrow-callback": "error",
      "func-style": ["error", "expression"],
    },
  },
];
