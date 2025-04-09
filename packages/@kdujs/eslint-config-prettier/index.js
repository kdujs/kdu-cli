module.exports = {
  plugins: ['prettier'],
  extends: [
    'eslint:recommended',
    require.resolve('eslint-config-prettier'),
    require.resolve('eslint-config-prettier/kdu')
  ],
  rules: {
    'prettier/prettier': 'warn'
  }
}
