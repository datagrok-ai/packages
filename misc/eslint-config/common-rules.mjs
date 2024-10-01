import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 0, //TODO: remove once we have global.d.ts
      '@typescript-eslint/explicit-function-return-type': 'off',
      curly: ['error', 'multi-or-nest'],
      'brace-style': [
        'error',
        '1tbs',
        {
          allowSingleLine: true,
        },
      ],
      'max-len': ['error', 140],
    },
  },
  eslintPluginPrettier,
];
