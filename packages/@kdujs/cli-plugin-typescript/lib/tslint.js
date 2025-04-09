module.exports = function lint (args = {}, api, silent) {
  const cwd = api.resolve('.')
  const fs = require('fs')
  const path = require('path')
  const globby = require('globby')
  const tslint = require('tslint')
  const ts = require('typescript')
  /* eslint-disable-next-line node/no-extraneous-require */
  const kduCompiler = require('kdu-template-compiler')
  const isKduFile = file => /\.kdu(\.ts)?$/.test(file)

  const options = {
    fix: args['fix'] !== false,
    formatter: args.format || 'codeFrame',
    formattersDirectory: args['formatters-dir'],
    rulesDirectory: args['rules-dir']
  }

  // hack to make tslint --fix work for *.kdu files:
  // we save the non-script parts to a cache right before
  // linting the file, and patch fs.writeFileSync to combine the fixed script
  // back with the non-script parts.
  // this works because (luckily) tslint lints synchronously.
  const kduFileCache = new Map()
  const writeFileSync = fs.writeFileSync

  const patchWriteFile = () => {
    fs.writeFileSync = (file, content, options) => {
      if (isKduFile(file)) {
        const parts = kduFileCache.get(path.normalize(file))
        if (parts) {
          parts.content = content
          const { before, after } = parts
          content = `${before}\n${content.trim()}\n${after}`
        }
      }
      return writeFileSync(file, content, options)
    }
  }

  const restoreWriteFile = () => {
    fs.writeFileSync = writeFileSync
  }

  const parseTSFromKduFile = file => {
    // If the file has already been cached, don't read the file again. Use the cache instead.
    if (kduFileCache.has(file)) {
      return kduFileCache.get(file)
    }

    const content = fs.readFileSync(file, 'utf-8')
    const { script } = kduCompiler.parseComponent(content, { pad: 'line' })
    if (script && /^tsx?$/.test(script.lang)) {
      kduFileCache.set(file, {
        before: content.slice(0, script.start),
        after: content.slice(script.end),
        content: script.content
      })
      return script
    }
  }

  const program = tslint.Linter.createProgram(api.resolve('tsconfig.json'))

  // patch getSourceFile for *.kdu files
  // so that it returns the <script> block only
  const patchProgram = program => {
    const getSourceFile = program.getSourceFile
    program.getSourceFile = function (file, languageVersion, onError) {
      if (isKduFile(file)) {
        const { content, lang = 'js' } = parseTSFromKduFile(file) || { content: '', lang: 'js' }
        const contentLang = ts.ScriptKind[lang.toUpperCase()]
        return ts.createSourceFile(file, content, languageVersion, true, contentLang)
      } else {
        return getSourceFile.call(this, file, languageVersion, onError)
      }
    }
  }

  patchProgram(program)

  const linter = new tslint.Linter(options, program)

  // patch linter.updateProgram to ensure every program has correct getSourceFile
  const updateProgram = linter.updateProgram
  linter.updateProgram = function (...args) {
    updateProgram.call(this, ...args)
    patchProgram(this.program)
  }

  const tslintConfigPath = tslint.Configuration.CONFIG_FILENAMES
    .map(filename => api.resolve(filename))
    .find(file => fs.existsSync(file))

  const config = tslint.Configuration.findConfiguration(tslintConfigPath).results
  // create a patched config that disables the blank lines rule,
  // so that we get correct line numbers in error reports for *.kdu files.
  const kduConfig = Object.assign(config)
  const rules = kduConfig.rules = new Map(kduConfig.rules)
  const rule = rules.get('no-consecutive-blank-lines')
  rules.set('no-consecutive-blank-lines', Object.assign({}, rule, {
    ruleSeverity: 'off'
  }))

  const lint = file => {
    const filePath = api.resolve(file)
    const isKdu = isKduFile(file)
    patchWriteFile()
    linter.lint(
      // append .ts so that tslint apply TS rules
      filePath,
      '',
      // use Kdu config to ignore blank lines
      isKdu ? kduConfig : config
    )
    restoreWriteFile()
  }

  const files = args._ && args._.length
    ? args._
    : ['src/**/*.ts', 'src/**/*.kdu', 'src/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx']

  // respect linterOptions.exclude from tslint.json
  if (config.linterOptions && config.linterOptions.exclude) {
    // use the raw tslint.json data because config contains absolute paths
    const rawTslintConfig = tslint.Configuration.readConfigurationFile(tslintConfigPath)
    const excludedGlobs = rawTslintConfig.linterOptions.exclude
    excludedGlobs.forEach((g) => files.push('!' + g))
  }

  return globby(files, { cwd }).then(files => {
    files.forEach(lint)
    if (silent) return
    const result = linter.getResult()
    if (result.output.trim()) {
      process.stdout.write(result.output)
    } else if (result.fixes.length) {
      // some formatters do not report fixes.
      const f = new tslint.Formatters.ProseFormatter()
      process.stdout.write(f.format(result.failures, result.fixes))
    } else if (!result.failures.length) {
      console.log(`No lint errors found.\n`)
    }

    if (result.failures.length && !args.force) {
      process.exitCode = 1
    }
  })
}
