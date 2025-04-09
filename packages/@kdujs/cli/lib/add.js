const chalk = require('chalk')
const invoke = require('./invoke')
const { loadOptions } = require('./options')
const { installPackage } = require('./util/installDeps')
const {
  log,
  error,
  hasProjectYarn,
  resolvePluginId,
  resolveModule,
  loadModule
} = require('@kdujs/cli-shared-utils')

async function add (pluginName, options = {}, context = process.cwd()) {
  // special internal "plugins"
  if (/^(@kdujs\/)?router$/.test(pluginName)) {
    return addRouter(context)
  }
  if (/^(@kdujs\/)?kdux$/.test(pluginName)) {
    return addKdux(context)
  }

  const packageName = resolvePluginId(pluginName)

  log()
  log(`📦  Installing ${chalk.cyan(packageName)}...`)
  log()

  const packageManager = loadOptions().packageManager || (hasProjectYarn(context) ? 'yarn' : 'npm')
  await installPackage(context, packageManager, options.registry, packageName)

  log(`${chalk.green('✔')}  Successfully installed plugin: ${chalk.cyan(packageName)}`)
  log()

  const generatorPath = resolveModule(`${packageName}/generator`, context)
  if (generatorPath) {
    invoke(pluginName, options, context)
  } else {
    log(`Plugin ${packageName} does not have a generator to invoke`)
  }
}

async function addRouter (context) {
  const inquirer = require('inquirer')
  const options = await inquirer.prompt([{
    name: 'routerHistoryMode',
    type: 'confirm',
    message: `Use history mode for router? ${chalk.yellow(`(Requires proper server setup for index fallback in production)`)}`
  }])
  invoke.runGenerator(context, {
    id: 'core:router',
    apply: loadModule('@kdujs/cli-service/generator/router', context),
    options
  })
}

async function addKdux (context) {
  invoke.runGenerator(context, {
    id: 'core:kdux',
    apply: loadModule('@kdujs/cli-service/generator/kdux', context)
  })
}

module.exports = (...args) => {
  return add(...args).catch(err => {
    error(err)
    if (!process.env.KDU_CLI_TEST) {
      process.exit(1)
    }
  })
}
