module.exports = (api, options) => {
  api.render('./template', {
    doesCompile: api.hasPlugin('babel') || api.hasPlugin('typescript')
  })

  api.extendPackage({
    scripts: {
      'serve': 'kdu-cli-service serve',
      'build': 'kdu-cli-service build'
    },
    dependencies: {
      'kdu': '^2.6.14'
    },
    devDependencies: {
      'kdu-template-compiler': '^2.6.14'
    },
    'postcss': {
      'plugins': {
        'autoprefixer': {}
      }
    },
    browserslist: [
      '> 1%',
      'last 2 versions'
    ]
  })

  if (options.cssPreprocessor) {
    const deps = {
      sass: {
        sass: '^1.19.0',
        'sass-loader': '^8.0.0'
      },
      'node-sass': {
        'node-sass': '^4.12.0',
        'sass-loader': '^8.0.0'
      },
      'dart-sass': {
        sass: '^1.19.0',
        'sass-loader': '^8.0.0'
      },
      less: {
        'less': '^3.0.4',
        'less-loader': '^5.0.0'
      },
      stylus: {
        'stylus': '^0.54.5',
        'stylus-loader': '^3.0.2'
      }
    }

    api.extendPackage({
      devDependencies: deps[options.cssPreprocessor]
    })
  }

  // additional tooling configurations
  if (options.configs) {
    api.extendPackage(options.configs)
  }
}
