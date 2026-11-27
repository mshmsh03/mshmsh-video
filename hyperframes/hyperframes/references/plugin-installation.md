<!-- Modified for mshmsh-video: see hyperframes/NOTICE.md -->

# Running the HyperFrames CLI

`<SKILLS>` is the `hyperframes/` folder of mshmsh-video: the folder that holds `hyperframes/GUIDE.md` and the
other six HeyGen guides. Every guide and reference writes
the CLI as `npx hyperframes` (or bare `hyperframes`). Run each of those commands as:

```bash
node "<SKILLS>/hyperframes/scripts/plugin-cli.mjs" <command> <args...>
```

Run it in the user's project directory, never in the skills directory. npm starts in the home
folder, so the project's `package.json`, `node_modules` and `.npmrc` cannot choose the CLI or the
registry; the CLI then moves into the project and works there. This holds for every command,
and for a project the person received from someone else. Do not run
`npx hyperframes` in the project directly, and do not run a project's own scripts or wrappers in
its place unless the person asks for that command by name.

For bundled Node helpers, use the same launcher with
`--script <absolute-script-path> <args...>`. Helpers that call the CLI then run it through the
launcher.

## Standalone skill installs

Without a plugin manifest, the launcher runs the newest compatible published CLI. To select a
release, put `--cli-version latest` or `--cli-version <exact-version>` before the command.
Take an exact version from the person, from the version an upgrade moves the pins to, or from
`--cli-version latest --version`. Never take it from the project's own files: a `package.json`
pin does not choose the CLI unless the person asks for that release. The launcher refuses a release older than its floor (currently 0.9.80), the oldest one with
the protections for received projects, and its error names the floor.
Use the launcher from the loaded skill installation for commands shown in CLI output, too.
For example, run `node "<SKILLS>/hyperframes/scripts/plugin-cli.mjs" --cli-version latest --version`
to read the current release. If the launcher lacks this option, mshmsh-video's copy of these files is out of date: tell the
person. Never run `npx hyperframes skills update` or `npx skills add`; they would install separate
HyperFrames skills next to mshmsh-video.

## Plugin installs

mshmsh-video is not a HyperFrames plugin, so the launcher always runs in standalone mode. It looks for
`plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`
or `gemini-extension.json` three folders above `plugin-cli.mjs`, which is the mshmsh-video folder,
finds none, and runs the newest compatible published CLI. HeyGen's plugin rules (a release pinned by
the manifest, updates through the plugin manager, `/hyperframes:hyperframes`) do not apply here.
If mshmsh-video is ever packaged as a plugin with one of those manifests at its root, the launcher
reads it and refuses to start unless its `name` is `hyperframes` with an exact version.
