// local config, node global

import globals from 'globals';
import config from './template/eslint.config.js.mjs';

export default [...config, { languageOptions: { globals: globals.node } }];
