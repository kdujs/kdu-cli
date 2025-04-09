module.exports = {
  plugins: ['@typescript-eslint'],
  // Prerequisite `eslint-plugin-kdu`, being extended, sets
  // root property `parser` to `'kdu-eslint-parser'`, which, for code parsing,
  // in turn delegates to the parser, specified in `parserOptions.parser`:
  // https://github.com/kdujs/eslint-plugin-kdu#what-is-the-use-the-latest-kdu-eslint-parser-error
  parserOptions: {
    parser: require.resolve('@typescript-eslint/parser')
  },
  rules: {
    // https://typescript-eslint.io/parser
    'no-undef': 'off',
    'no-unused-vars': 'off',
    // https://github.com/typescript-eslint/typescript-eslint/issues/46
    // '@typescript-eslint/no-unused-vars': 'error',

    // temporary fix
    // very strange as somehow this rule gets different behaviors depending
    // on the presence of @typescript-eslint/parser...
    'strict': 'off'
  }
}
