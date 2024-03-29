const { chalk } = require('@kdujs/cli-shared-utils')

module.exports = cli => {
  cli.injectFeature({
    name: 'Router',
    value: 'router',
    description: 'Structure the app with dynamic pages',
    link: 'https://kdujs-router.web.app/'
  })

  cli.injectPrompt({
    name: 'historyMode',
    when: answers => answers.features.includes('router'),
    type: 'confirm',
    message: `Use history mode for router? ${chalk.yellow(`(Requires proper server setup for index fallback in production)`)}`,
    description: `By using the HTML5 History API, the URLs don't need the '#' character anymore.`,
    link: 'https://kdujs-router.web.app/guide/essentials/history-mode.html'
  })

  cli.onPromptComplete((answers, options) => {
    if (answers.features.includes('router')) {
      options.plugins['@kdujs/cli-plugin-router'] = {
        historyMode: answers.historyMode
      }
    }
  })
}
