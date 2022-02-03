module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:jest-formatting/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  overrides: [
    {
      /**
       * @typescript-eslint does not support JSDoc type linting in js file
       * @see https://github.com/typescript-eslint/typescript-eslint/issues/906
       */
      files: ['!**/*.js'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:jest-formatting/recommended',
        'prettier',
        'plugin:prettier/recommended',
      ],
    },
  ],
}
