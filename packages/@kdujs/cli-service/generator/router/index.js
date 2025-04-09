module.exports = (api, options = {}) => {
  api.injectImports(api.entryFile, `import router from './router'`)
  api.injectRootOptions(api.entryFile, `router`)
  api.extendPackage({
    dependencies: {
      'kdu-router': '^3.0.1'
    }
  })
  api.render('./template', {
    historyMode: options.routerHistoryMode,
    doesCompile: api.hasPlugin('babel') || api.hasPlugin('typescript')
  })

  if (api.invoking) {
    api.postProcessFiles(files => {
      const appFile = files[`src/App.kdu`]
      if (appFile) {
        files[`src/App.kdu`] = appFile.replace(/^<template>[^]+<\/script>/, `
<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div>
    <router-view/>
  </div>
</template>
        `.trim())
      }
    })

    if (api.hasPlugin('typescript')) {
      /* eslint-disable-next-line node/no-extraneous-require */
      const convertFiles = require('@kdujs/cli-plugin-typescript/generator/convert')
      convertFiles(api)
    }
  }
}
