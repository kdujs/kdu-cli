const { semver } = require('@kdujs/cli-shared-utils')

/** @param {import('@kdujs/cli/lib/MigratorAPI')} api MigratorAPI */
module.exports = async (api) => {
  const pkg = require(api.resolve('package.json'))

  let localESLintRange = pkg.devDependencies.eslint

  // if project is scaffolded by Kdu CLI 3.0.x or earlier,
  // the ESLint dependency (ESLint v4) is inside @kdujs/cli-plugin-eslint;
  // in Kdu CLI v4 it should be extracted to the project dependency list.
  if (api.fromVersion('^3') && !localESLintRange) {
    localESLintRange = '^4.19.1'
    api.extendPackage({
      devDependencies: {
        eslint: localESLintRange,
        '@babel/eslint-parser': '^7.12.16',
        'eslint-plugin-kdu': '^4.5.1'
      }
    })
  }

  const localESLintMajor = semver.major(
    semver.maxSatisfying(['4.99.0', '5.99.0', '6.99.0', '7.99.0'], localESLintRange) ||
      // in case the user does not specify a typical caret range;
      // it is used as **fallback** because the user may have not previously
      // installed eslint yet, such as in the case that they are from v3.0.x
      // eslint-disable-next-line node/no-extraneous-require
      require('eslint/package.json').version
  )

  if (localESLintMajor > 6) {
    return
  }

  const { getDeps } = require('../eslintDeps')

  const newDeps = getDeps(api)
  if (pkg.devDependencies['@kdujs/eslint-config-airbnb']) {
    Object.assign(newDeps, getDeps(api, 'airbnb'))
  }
  if (pkg.devDependencies['@kdujs/eslint-config-standard']) {
    Object.assign(newDeps, getDeps(api, 'standard'))
  }
  if (pkg.devDependencies['@kdujs/eslint-config-prettier']) {
    Object.assign(newDeps, getDeps(api, 'prettier'))
  }

  const fields = { devDependencies: newDeps }

  if (newDeps['@babel/core'] && newDeps['@babel/eslint-parser']) {
    Reflect.deleteProperty(api.generator.pkg.devDependencies, 'babel-eslint')

    const minSupportedBabelCoreVersion = '>=7.2.0'
    const localBabelCoreVersion = pkg.devDependencies['@babel/core']

    if (localBabelCoreVersion &&
      semver.satisfies(
        localBabelCoreVersion,
        minSupportedBabelCoreVersion
      )) {
      Reflect.deleteProperty(newDeps, '@babel/core')
    }

    fields.eslintConfig = {
      parserOptions: {
        parser: '@babel/eslint-parser'
      }
    }
  }

  api.extendPackage(fields, { warnIncompatibleVersions: false })

  // in case anyone's upgrading from the legacy `typescript-eslint-parser`
  if (api.hasPlugin('typescript')) {
    api.extendPackage({
      eslintConfig: {
        parserOptions: {
          parser: '@typescript-eslint/parser'
        }
      }
    })
  }

  api.exitLog(`ESLint upgraded from v${localESLintMajor}. to v7\n`)

  // TODO:
  // transform `@kdujs/prettier` to `eslint:recommended` + `plugin:prettier/recommended`
  // remove `@kdujs/prettier/@typescript-eslint`
  // transform `@kdujs/typescript` to `@kdujs/typescript/recommended` and also fix prettier compatibility for it
}
