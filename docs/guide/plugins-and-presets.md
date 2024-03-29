# Plugins and Presets

## Plugins

Kdu CLI uses a plugin-based architecture. If you inspect a newly created project's `package.json`, you will find dependencies that start with `@kdujs/cli-plugin-`. Plugins can modify the internal webpack configuration and inject commands to `kdu-cli-service`. Most of the features listed during the project creation process are implemented as plugins.

The plugin based architecture makes Kdu CLI flexible and extensible. If you are interested in developing a plugin, check out the [Plugin Development Guide](../dev-guide/plugin-dev.md).

::: tip
You can install and manage Plugins using the GUI with the `kdu ui` command.
:::

### Installing Plugins in an Existing Project

Each CLI plugin ships with a generator (which creates files) and a runtime plugin (which tweaks the core webpack config and injects commands). When you use `kdu create` to create a new project, some plugins will be pre-installed for you based on your feature selection. In case you want to install a plugin into an already created project, you can do so with the `kdu add` command:

```bash
kdu add eslint
```

::: tip
`kdu add` is specifically designed for installing and invoking Kdu CLI plugins. It is not meant as a replacement for normal npm packages. For normal npm packages, you should still use your package manager of choice.
:::

::: warning
It is recommended to commit your project's current state before running `kdu add`, since the command will invoke the plugin's file generator and potentially make changes to your existing files.
:::

The command resolves `@kdujs/eslint` to the full package name `@kdujs/cli-plugin-eslint`, installs it from npm, and invokes its generator.

```bash
# these are equivalent to the previous usage
kdu add cli-plugin-eslint
```

Without the `@kdujs` prefix, the command will resolve to an unscoped package instead. For example, to install the 3rd party plugin `kdu-cli-plugin-apollo`:

```bash
# installs and invokes kdu-cli-plugin-apollo
kdu add apollo
```

You can also use 3rd party plugins under a specific scope. For example, if a plugin is named `@foo/kdu-cli-plugin-bar`, you can add it with:

```bash
kdu add @foo/bar
```

You can pass generator options to the installed plugin (this will skip the prompts):

```bash
kdu add eslint --config airbnb --lintOn save
```

If a plugin is already installed, you can skip the installation and only invoke its generator with the `kdu invoke` command. The command takes the same arguments as `kdu add`.

::: tip
If for some reason your plugins are listed in a `package.json` file other than the one located in your project, you can set the `kduPlugins.resolveFrom` option in the project `package.json` with the path to the folder containing the other `package.json` file.

For example, if you have a `.config/package.json` file:

```json
{
  "kduPlugins": {
    "resolveFrom": ".config"
  }
}
```
:::

### Project local plugin

If you need access to the plugin API in your project and don't want to create a full plugin for it, you can use the `kduPlugins.service` option in your `package.json` file:

```json
{
  "kduPlugins": {
    "service": ["my-commands.js"]
  }
}
```

Each file will need to export a function taking the plugin API as the first argument. For more information about the plugin API, check out the [Plugin Development Guide](../dev-guide/plugin-dev.md).

## Presets

A Kdu CLI preset is a JSON object that contains pre-defined options and plugins for creating a new project so that the user doesn't have to go through the prompts to select them.

Presets saved during `kdu create` are stored in a configuration file in your user home directory (`~/.kdurc`). You can directly edit this file to tweak / add / delete the saved presets.

Here's an example preset:

``` json
{
  "useConfigFiles": true,
  "cssPreprocessor": "sass",
  "plugins": {
    "@kdujs/cli-plugin-babel": {},
    "@kdujs/cli-plugin-eslint": {
      "config": "airbnb",
      "lintOn": ["save", "commit"]
    },
    "@kdujs/cli-plugin-router": {},
    "@kdujs/cli-plugin-kdux": {}
  }
}
```

The preset data is used by plugin generators to generate corresponding project files. In addition to the above fields, you can also add additional configuration for integrated tools:

``` json
{
  "useConfigFiles": true,
  "plugins": {...},
  "configs": {
    "kdu": {...},
    "postcss": {...},
    "eslintConfig": {...},
    "jest": {...}
  }
}
```

These additional configurations will be merged into `package.json` or corresponding config files, depending on the value of `useConfigFiles`. For example, with `"useConfigFiles": true`, the value of `configs.kdu` will be merged into `kdu.config.js`.

### Preset Plugin Versioning

You can explicitly specify versions of the plugins being used:

``` json
{
  "plugins": {
    "@kdujs/cli-plugin-eslint": {
      "version": "^3.0.0",
      // ... other options for this plugin
    }
  }
}
```

Note this is not required for official plugins - when omitted, the CLI will automatically use the latest version available in the registry. However, **it is recommended to provide a explicit version range for any 3rd party plugins listed in a preset**.

### Allowing Plugin Prompts

Each plugin can inject its own prompts during the project creation process, however when you are using a preset, those prompts will be skipped because Kdu CLI assumes all the plugin options are already declared in the preset.

In some cases you may want the preset to only declare the desired plugins, while leaving some flexibility by letting the user go through the prompts injected by the plugins.

For such scenarios you can specify `"prompts": true` in a plugin's options to allow its prompts to be injected:

``` json
{
  "plugins": {
    "@kdujs/cli-plugin-eslint": {
      // let the users pick their own ESLint config
      "prompts": true
    }
  }
}
```

### Remote Presets

You can share a preset with other developers by publishing it in a git repo. The repo can contain the following files:

- `preset.json`: the main file containing the preset data (required).
- `generator.js`: a [Generator](../dev-guide/plugin-dev.md#generator) that can inject or modify files in the project.
- `prompts.js`: a [prompts file](../dev-guide/plugin-dev.md#prompts-for-3rd-party-plugins) that can collect options for the generator.

Once the repo is published, you can then use the `--preset` option to use the remote preset when creating a project:

```bash
# use preset from GitHub repo
kdu create --preset username/repo my-project
```

GitLab and BitBucket are also supported. Make sure to use the `--clone` option if fetching from private repos:

```bash
kdu create --preset gitlab:username/repo --clone my-project
kdu create --preset bitbucket:username/repo --clone my-project

# self-hosted repos
kdu create --preset gitlab:my-gitlab-server.com:group/projectname --clone my-project
kdu create --preset direct:ssh://git@my-gitlab-server.com/group/projectname.git --clone my-project
```

### Local Filesystem Preset

When developing a remote preset, it can be tedious to have to repeatedly push the preset to a remote repo to test it. To simplify the workflow, you can directly work with local presets. Kdu CLI will load local presets if the value for the `--preset` option is a relative or absolute file path, or ends with `.json`:

```bash
# ./my-preset should be a directory containing preset.json
kdu create --preset ./my-preset my-project

# or directly use a json file in cwd:
kdu create --preset my-preset.json my-project
```
