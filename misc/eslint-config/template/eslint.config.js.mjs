import globals from 'globals';
import datagrokConfig from '@datagrok-misc/eslint-config/javascript';

export default [
  {
    ignores: ['dist/', 'webpack.config.js'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
  },
  { languageOptions: { globals: globals.browser } },
  ...datagrokConfig,
];
