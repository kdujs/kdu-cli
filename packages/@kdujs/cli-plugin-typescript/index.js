const path = require('path')

module.exports = (api, projectOptions) => {
  const useThreads = process.env.NODE_ENV === 'production' && !!projectOptions.parallel

  api.chainWebpack(config => {
    config.resolveLoader.modules.prepend(path.join(__dirname, 'node_modules'))

    if (!projectOptions.pages) {
      config.entry('app')
        .clear()
        .add('./src/main.ts')
    }

    config.resolve
      .extensions
        .prepend('.ts')
        .prepend('.tsx')

    const tsRule = config.module.rule('ts').test(/\.ts$/)
    const tsxRule = config.module.rule('tsx').test(/\.tsx$/)

    // add a loader to both *.ts & kdu<lang="ts">
    const addLoader = ({ name, loader, options }) => {
      tsRule.use(name).loader(loader).options(options)
      tsxRule.use(name).loader(loader).options(options)
    }

    try {
      const cacheLoaderPath = require.resolve('cache-loader')

      addLoader({
        name: 'cache-loader',
        loader: cacheLoaderPath,
        options: api.genCacheConfig('ts-loader', {
          'ts-loader': require('ts-loader/package.json').version,
          'typescript': require('typescript/package.json').version,
          modern: !!process.env.KDU_CLI_MODERN_BUILD
        }, 'tsconfig.json')
      })
    } catch (e) {}

    if (useThreads) {
      addLoader({
        name: 'thread-loader',
        loader: require.resolve('thread-loader'),
        options:
          typeof projectOptions.parallel === 'number'
            ? { workers: projectOptions.parallel }
            : {}
      })
    }

    if (api.hasPlugin('babel')) {
      addLoader({
        name: 'babel-loader',
        loader: require.resolve('babel-loader')
      })
    }
    addLoader({
      name: 'ts-loader',
      loader: require.resolve('ts-loader'),
      options: {
        transpileOnly: true,
        appendTsSuffixTo: ['\\.kdu$'],
        // https://github.com/TypeStrong/ts-loader#happypackmode-boolean-defaultfalse
        happyPackMode: useThreads
      }
    })
    // make sure to append TSX suffix
    tsxRule.use('ts-loader').loader(require.resolve('ts-loader')).tap(options => {
      options = Object.assign({}, options)
      delete options.appendTsSuffixTo
      options.appendTsxSuffixTo = ['\\.kdu$']
      return options
    })

    // this plugin does not play well with jest + cypress setup (tsPluginE2e.spec.js) somehow
    // so temporarily disabled for kdu-cli tests
    if (!process.env.KDU_CLI_TEST) {
      let kduCompilerPath
      try {
        // Kdu 2.7+
        kduCompilerPath = require.resolve('kdu/compiler-sfc')
      } catch (e) {
        // Kdu 2.6 and lower versions
        kduCompilerPath = require.resolve('kdu-template-compiler')
      }

      config
        .plugin('fork-ts-checker')
        .use(require('fork-ts-checker-webpack-plugin'), [{
          typescript: {
            extensions: {
              kdu: {
                enabled: true,
                compiler: kduCompilerPath
              }
            },
            diagnosticOptions: {
              semantic: true,
              // https://github.com/TypeStrong/ts-loader#happypackmode
              syntactic: useThreads
            }
          }
        }])
    }
  })
}
