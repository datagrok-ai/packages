import globals from 'globals';
import datagrokConfig from '@datagrok-misc/eslint-config/typescript';

export default [
  {
    ignores: ['dist/', 'webpack.config.js'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts}'],
  },
  { languageOptions: { globals: globals.browser } },
  ...datagrokConfig,
];
