import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import commonRules from './common-rules.mjs';

export default [pluginJs.configs.recommended, ...tseslint.configs.recommended, ...commonRules];
