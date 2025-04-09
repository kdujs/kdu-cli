module.exports = (api, options) => {
  api.chainWebpack(webpackConfig => {
    const isLegacyBundle = process.env.KDU_CLI_MODERN_MODE && !process.env.KDU_CLI_MODERN_BUILD
    const resolveLocal = require('../util/resolveLocal')
    const getAssetPath = require('../util/getAssetPath')
    const inlineLimit = 4096

    const genAssetSubPath = dir => {
      return getAssetPath(
        options,
        `${dir}/[name]${options.filenameHashing ? '.[hash:8]' : ''}.[ext]`
      )
    }

    const genUrlLoaderOptions = dir => {
      return {
        limit: inlineLimit,
        // use explicit fallback to avoid regression in url-loader>=1.1.0
        fallback: {
          loader: 'file-loader',
          options: {
            name: genAssetSubPath(dir)
          }
        }
      }
    }

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
        .set(
          'kdu$',
          options.runtimeCompiler
            ? 'kdu/dist/kdu.esm.js'
            : 'kdu/dist/kdu.runtime.esm.js'
        )

    webpackConfig.resolveLoader
      .modules
        .add('node_modules')
        .add(api.resolve('node_modules'))
        .add(resolveLocal('node_modules'))

    webpackConfig.module
      .noParse(/^(kdu|kdu-router|kdux|kdux-router-sync)$/)

    // js is handled by cli-plugin-babel ---------------------------------------

    // kdu-loader --------------------------------------------------------------
    const kduLoaderCacheConfig = api.genCacheConfig('kdu-loader', {
      'kdu-loader': require('kdu-loader/package.json').version,
      /* eslint-disable-next-line node/no-extraneous-require */
      '@kdujs/component-compiler-utils': require('@kdujs/component-compiler-utils/package.json').version,
      'kdu-template-compiler': require('kdu-template-compiler/package.json').version
    })

    webpackConfig.module
      .rule('kdu')
        .test(/\.kdu$/)
        .use('cache-loader')
          .loader('cache-loader')
          .options(kduLoaderCacheConfig)
          .end()
        .use('kdu-loader')
          .loader('kdu-loader')
          .options(Object.assign({
            compilerOptions: {
              preserveWhitespace: false
            }
          }, kduLoaderCacheConfig))

    webpackConfig
      .plugin('kdu-loader')
      .use(require('kdu-loader/lib/plugin'))

    // static assets -----------------------------------------------------------

    webpackConfig.module
      .rule('images')
        .test(/\.(png|jpe?g|gif|webp)(\?.*)?$/)
        .use('url-loader')
          .loader('url-loader')
          .options(genUrlLoaderOptions('img'))

    // do not base64-inline SVGs.
    // https://github.com/facebookincubator/create-react-app/pull/1180
    webpackConfig.module
      .rule('svg')
        .test(/\.(svg)(\?.*)?$/)
        .use('file-loader')
          .loader('file-loader')
          .options({
            name: genAssetSubPath('img')
          })

    webpackConfig.module
      .rule('media')
        .test(/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/)
        .use('url-loader')
          .loader('url-loader')
          .options(genUrlLoaderOptions('media'))

    webpackConfig.module
      .rule('fonts')
        .test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/i)
        .use('url-loader')
          .loader('url-loader')
          .options(genUrlLoaderOptions('fonts'))

    // Other common pre-processors ---------------------------------------------

    webpackConfig.module
      .rule('pug')
      .test(/\.pug$/)
      .use('pug-plain-loader')
        .loader('pug-plain-loader')
        .end()

    // shims

    webpackConfig.node
      .merge({
        // prevent webpack from injecting useless setImmediate polyfill because Kdu
        // source contains it (although only uses it if it's native).
        setImmediate: false,
        // process is injected via DefinePlugin, although some 3rd party
        // libraries may require a mock to work properly (#934)
        process: 'mock',
        // prevent webpack from injecting mocks to Node native modules
        // that does not make sense for the client
        dgram: 'empty',
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty'
      })

    const resolveClientEnv = require('../util/resolveClientEnv')
    webpackConfig
      .plugin('define')
        .use(require('webpack/lib/DefinePlugin'), [
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
  })
}
