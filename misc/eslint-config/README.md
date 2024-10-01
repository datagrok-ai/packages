# Eslint configuration

These are settings for ESLint used by Datagrok.

## Installation

Install the package

```shell
npm install @datagrok-tools/eslint-config --save-dev
```

Then, there are two options to set up the rule-set: automatic and manual set-up

### Automatic: Run the setup script
Automatic set-up script - copies `eslint.config.js` and `.prettierrc` files in the current directory.
Having a separate config for prettier helps with code editors automatic configuration

```shell
npx @datagrok-misc/eslint-config --language=typescript
```

### Manual setup

Rule set can be included in the existing eslint configuration.

```javascript
import globals from 'globals';
import datagrokConfig from '@datagrok-misc/eslint-config/typescript'; // for typescript configuration
//import datagrokConfig from '@datagrok-misc/eslint-config/javascript'; // for javascript configuration

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

```

Datagrok config contains prettier plugin, so it should be included last in the list of configurations to avoid conflicts.


### Running eslint

```shell
npx eslint --fix
```