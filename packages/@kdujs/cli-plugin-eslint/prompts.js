// these prompts are used if the plugin is late-installed into an existing
// project and invoked by `kdu invoke`.

const { chalk, hasGit } = require('@kdujs/cli-shared-utils')

module.exports = [
  {
    name: 'config',
    type: 'list',
    message: `Pick an ESLint config:`,
    choices: [
      {
        name: 'Error prevention only',
        value: 'base',
        short: 'Basic'
      },
      {
        name: 'Airbnb',
        value: 'airbnb',
        short: 'Airbnb'
      },
      {
        name: 'Standard',
        value: 'standard',
        short: 'Standard'
      },
      {
        name: 'Prettier',
        value: 'prettier',
        short: 'Prettier'
      }
    ]
  },
  {
    name: 'lintOn',
    type: 'checkbox',
    message: 'Pick additional lint features:',
    choices: [
      {
        name: 'Lint on save',
        value: 'save',
        checked: true
      },
      {
        name: 'Lint and fix on commit' + (hasGit() ? '' : chalk.red(' (requires Git)')),
        value: 'commit'
      }
    ]
  }
]
