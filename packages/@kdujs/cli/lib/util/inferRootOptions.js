// Infer rootOptions for individual generators being invoked
// in an existing project.

module.exports = function inferRootOptions (pkg) {
  const rootOptions = {}
  const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies)

  // projectName
  rootOptions.projectName = pkg.name

  // router
  if ('kdu-router' in deps) {
    rootOptions.router = true
  }

  // kdux
  if ('kdux' in deps) {
    rootOptions.kdux = true
  }

  // cssPreprocessors
  if ('sass' in deps) {
    rootOptions.cssPreprocessor = 'dart-sass'
  } else if ('node-sass' in deps) {
    // TODO: change to 'node-sass' in v4
    rootOptions.cssPreprocessor = 'sass'
  } else if ('less-loader' in deps) {
    rootOptions.cssPreprocessor = 'less'
  } else if ('stylus-loader' in deps) {
    rootOptions.cssPreprocessor = 'stylus'
  }

  return rootOptions
}
