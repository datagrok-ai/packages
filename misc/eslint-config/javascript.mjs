import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['dist/', 'webpack.config.js'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 0, //remove.
      curly: ['error', 'multi-or-nest'],
      'max-len': ['error', 140],
    },
  },
  eslintPluginPrettier,
];
