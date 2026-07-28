const path = require('path')

/** @type {import('@kdujs/cli-service').ServicePlugin} */
module.exports = (api, options) => {
  const cwd = api.getCwd()
  const webpack = require('webpack')
  const kduMajor = require('../util/getKduMajor')(cwd)

  api.chainWebpack(webpackConfig => {
    const isLegacyBundle = process.env.KDU_CLI_MODERN_MODE && !process.env.KDU_CLI_MODERN_BUILD
    const resolveLocal = require('../util/resolveLocal')

    // https://github.com/webpack/webpack/issues/14532#issuecomment-947525539
    webpackConfig.output.set('hashFunction', 'xxhash64')

    // https://github.com/webpack/webpack/issues/11467#issuecomment-691873586
    webpackConfig.module
      .rule('esm')
        .test(/\.m?jsx?$/)
        .resolve.set('fullySpecified', false)

    webpackConfig
      .mode('development')
      .context(api.service.context)
      .entry('app')
        .add('./src/main.js')
        .end()
      .output
        .path(api.resolve(options.outputDir))
        .filename(isLegacyBundle ? '[name]-legacy.js' : '[name].js')
        .publicPath(options.publicPath)

    webpackConfig.resolve
      .extensions
        .merge(['.mjs', '.js', '.jsx', '.kdu', '.json', '.wasm'])
        .end()
      .modules
        .add('node_modules')
        .add(api.resolve('node_modules'))
        .add(resolveLocal('node_modules'))
        .end()
      .alias
        .set('@', api.resolve('src'))

    webpackConfig.resolveLoader
      .modules
        .add('node_modules')
        .add(api.resolve('node_modules'))
        .add(resolveLocal('node_modules'))

    webpackConfig.module
      .noParse(/^(kdu|kdu-router|kdux|kdux-router-sync)$/)

    // js is handled by cli-plugin-babel ---------------------------------------

    // kdu-loader --------------------------------------------------------------
    let cacheLoaderPath
    try {
      cacheLoaderPath = require.resolve('cache-loader')
    } catch (e) {}

    if (kduMajor === 2) {
      // for Kdu 2 projects
      const partialIdentifier = {
        'kdu-loader': require('@kdujs/kdu-loader-v15/package.json').version,
        '@kdujs/component-compiler-utils': require('@kdujs/component-compiler-utils/package.json').version
      }

      try {
        partialIdentifier['kdu-template-compiler'] = require('kdu-template-compiler/package.json').version
      } catch (e) {
        // For Kdu 2.7 projects, `kdu-template-compiler` is not required
      }

      const kduLoaderCacheConfig = api.genCacheConfig('kdu-loader', partialIdentifier)

      webpackConfig.resolve
        .alias
          .set(
            'kdu$',
            options.runtimeCompiler
              ? 'kdu/dist/kdu.esm.js'
              : 'kdu/dist/kdu.runtime.esm.js'
          )

      if (cacheLoaderPath) {
        webpackConfig.module
          .rule('kdu')
            .test(/\.kdu$/)
            .use('cache-loader')
              .loader(cacheLoaderPath)
              .options(kduLoaderCacheConfig)
      }

      webpackConfig.module
        .rule('kdu')
          .test(/\.kdu$/)
          .use('kdu-loader')
            .loader(require.resolve('@kdujs/kdu-loader-v15'))
            .options(Object.assign({
              compilerOptions: {
                whitespace: 'condense'
              }
            }, cacheLoaderPath ? kduLoaderCacheConfig : {}))

      webpackConfig
        .plugin('kdu-loader')
          .use(require('@kdujs/kdu-loader-v15').KduLoaderPlugin)

      // some plugins may implicitly relies on the `kdu-loader` dependency path name
      // so we need a hotfix for that
      webpackConfig
        .resolveLoader
          .modules
            .prepend(path.resolve(__dirname, './kdu-loader-v15-resolve-compat'))
    } else if (kduMajor === 3) {
      // for Kdu 3 projects
      const kduLoaderCacheConfig = api.genCacheConfig('kdu-loader', {
        'kdu-loader': require('kdu-loader/package.json').version
      })

      webpackConfig.resolve
        .alias
          .set(
            'kdu$',
            options.runtimeCompiler
              ? 'kdu/dist/kdu.esm-bundler.js'
              : 'kdu/dist/kdu.runtime.esm-bundler.js'
          )

      if (cacheLoaderPath) {
        webpackConfig.module
          .rule('kdu')
            .test(/\.kdu$/)
            .use('cache-loader')
              .loader(cacheLoaderPath)
              .options(kduLoaderCacheConfig)
      }

      webpackConfig.module
        .rule('kdu')
          .test(/\.kdu$/)
          .use('kdu-loader')
            .loader(require.resolve('kdu-loader'))
            .options({
              ...kduLoaderCacheConfig,
              babelParserPlugins: ['jsx', 'classProperties', 'decorators-legacy']
            })

      webpackConfig
        .plugin('kdu-loader')
          .use(require('kdu-loader').KduLoaderPlugin)

      // feature flags
      webpackConfig
        .plugin('feature-flags')
          .use(webpack.DefinePlugin, [{
            __KDU_OPTIONS_API__: 'true',
            __KDU_PROD_DEVTOOLS__: 'false',
            __KDU_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
          }])
    }

    webpackConfig.module
      .rule('kdu-style')
        .test(/\.kdu$/)
          .resourceQuery(/type=style/)
            .sideEffects(true)

    // Other common pre-processors ---------------------------------------------
    const maybeResolve = name => {
      try {
        return require.resolve(name)
      } catch (error) {
        return name
      }
    }

    webpackConfig.module
      .rule('pug')
        .test(/\.pug$/)
          .oneOf('pug-kdu')
            .resourceQuery(/kdu/)
            .use('pug-plain-loader')
              .loader(maybeResolve('pug-plain-loader'))
              .end()
            .end()
          .oneOf('pug-template')
            .use('raw')
              .loader(maybeResolve('raw-loader'))
              .end()
            .use('pug-plain-loader')
              .loader(maybeResolve('pug-plain-loader'))
              .end()
            .end()

    const resolveClientEnv = require('../util/resolveClientEnv')
    webpackConfig
      .plugin('define')
        .use(webpack.DefinePlugin, [
          resolveClientEnv(options)
        ])

    webpackConfig
      .plugin('case-sensitive-paths')
        .use(require('case-sensitive-paths-webpack-plugin'))

    // friendly error plugin displays very confusing errors when webpack
    // fails to resolve a loader, so we provide custom handlers to improve it
    const { transformer, formatter } = require('../util/resolveLoaderError')
    webpackConfig
      .plugin('friendly-errors')
        .use(require('@soda/friendly-errors-webpack-plugin'), [{
          additionalTransformers: [transformer],
          additionalFormatters: [formatter]
        }])

    const TerserPlugin = require('terser-webpack-plugin')
    const terserOptions = require('./terserOptions')
    webpackConfig.optimization
      .minimizer('terser')
        .use(TerserPlugin, [terserOptions(options)])
  })
}
