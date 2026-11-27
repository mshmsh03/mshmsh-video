# Remotion setup and upkeep

The Remotion housekeeping around a video: starting a project by hand when `setup-project.mjs` isn't the right tool, running the Studio preview and its flags, Tailwind, upgrading Remotion, looking up the current docs instead of trusting memory, and the licence rules. Read it when a project won't start, the Studio misbehaves, the Remotion version needs to change, an API detail is uncertain, or someone asks whether they may use Remotion for free. Written in our own words from Remotion's `remotion-create`, `remotion-studio`, `remotion-upgrade`, `remotion-docs` and `remotion-license` skills (4.0.547).

## Contents
- Starting a project
- Studio
- Layout minimums and Tailwind
- Upgrading
- Looking up the docs
- The licence

## Starting a project

For a mshmsh-video project, run `scripts/setup-project.mjs` (production.md, "Project setup"): it scaffolds Remotion, adds the packages, the template and the scripts in one go, and keeps any plan files already in the folder. The rest of this section is what it does underneath, for a bare Remotion project or when it fails.

- **Needs** Node.js and Git on the PC.
- **Look at the folder first, hidden files included.** `create-video` refuses a folder that isn't empty.
  - **Empty folder** (or only operating-system clutter such as `.DS_Store` or `Thumbs.db`, which you may delete first): scaffold in place with `npx create-video@latest --yes --blank --no-tailwind .`
  - **Folder with real content:** scaffold into a new subfolder with `npx create-video@latest --yes --blank --no-tailwind <name>`, then `cd <name>`. `.env`, `.git` and similar hidden files are real content, not clutter.
  - **A project already exists** (`package.json` with `remotion`): don't scaffold; work in it.
- `create-video` installs the dependencies itself. If it reports an error during that step, run `npm i` in the project.
- `--blank` gives an empty composition and `--no-tailwind` leaves Tailwind out; `--yes` skips the questions.
- Remotion's own order of work, which this skill already follows: open the Studio as soon as the project runs, before writing scenes; register compositions in the root; give each clip on a timeline its own JSX element so it can be edited on its own; make the markup editable in the Studio (production.md, "Text someone else will edit later").

## Studio

Start it once the project can run and keep it open while building, so the person watches the video take shape and can steer (production.md, "Formats and preview").

```bash
npx remotion studio            # starts the server and opens the browser
npx remotion studio --no-open  # starts the server only; open the printed URL yourself
```

- If a Studio is already running for this project, the command prints its URL and exits instead of starting a second one. Otherwise it keeps running and prints the URL.
- Use `--no-open` only when you will open that exact URL in a browser you control (for example the claude-in-chrome tools) and confirm the Studio loads and, once a composition exists, that its preview plays. If you can't open it yourself, let the Studio open the person's browser.
- Flags:

| Flag | Does |
| --- | --- |
| `--port=<number>` | Asks for a port; without it Remotion picks a free one. |
| `--log=<level>` | `error`, `warn`, `info` (the default) or `verbose`. |
| `--force-new` | Starts another Studio even though one already runs for the same project and port. |

## Layout minimums and Tailwind

Remotion's rough floor for a 1080 px wide video: headline at least 84 px, important supporting text at least 44 px, key text at least 80 px from the sides and 100 px from the top and bottom, scaled with the composition width. Build each scene around the one thing the viewer should see first and leave out anything redundant. This skill's own sizes and safe zones per platform are in styles.md, "Formats and safe zones", and take precedence (Reels and TikTok cover far more of the bottom than 100 px).

Tailwind works in Remotion only when the project has it installed and enabled (remotion.dev/docs/tailwind); `setup-project.mjs` scaffolds without it. Its `transition-*` and `animate-*` classes don't render frame by frame: animate with `useCurrentFrame()` (motion.md).

## Upgrading

Every `remotion` and `@remotion/*` package in a project must be on the same exact version. `scripts/doctor.mjs` reports mixed versions.

1. Read `package.json` and the lockfile to see the package manager and any workspaces. Don't touch unrelated changes.
2. **If `@remotion/cli` is installed in the project** (it is in every scaffolded project), run `npx remotion upgrade`. It moves all Remotion packages to the latest version. (It also updates Remotion's own skills if any were installed inside the project; mshmsh-video doesn't need them.) Then go to step 4.
3. **Without the CLI, by hand:**
   - `npm view remotion version` gives the latest stable version.
   - Set every `remotion` and `@remotion/*` dependency to that exact version, keeping each in its own section (dependencies or devDependencies) and keeping workspace or catalog conventions.
   - `npm view @remotion/studio@<version> dependencies --json` lists the versions Remotion expects for helper packages. Match any installed `zod`, `mediabunny` and `@huggingface/transformers` to it, and give `@mediabunny/*` packages the same version as `mediabunny`.
   - Run the package manager so the lockfile updates.
4. **Check:** read the diff of `package.json` and the lockfile; all Remotion packages on one version, helpers on their expected versions. With the CLI, `npx remotion versions` confirms it.

The changelog is on github.com/remotion-dev/remotion/releases; use it to tell the person what changed. After an upgrade, render a short draft (`node scripts/render.mjs --draft`) before trusting the project again, and re-run `setup-project.mjs --update` if the template's components need the new version.

## Looking up the docs

Remotion's API moves quickly (this skill's notes date from 4.0.535 to 4.0.547). When a prop, flag or function is uncertain, read the current page rather than guessing.

**Search** through the docs site's public Algolia index (a POST, form-encoded content type, JSON body):

```
POST https://plsduol1ca-dsn.algolia.net/1/indexes/*/queries?x-algolia-api-key=3e42dbd4f895fe93ff5cf40d860c4a85&x-algolia-application-id=PLSDUOL1CA
Content-Type: application/x-www-form-urlencoded

{"requests":[{"query":"<what you need>","indexName":"remotion","params":"attributesToRetrieve=[\"hierarchy.lvl0\",\"hierarchy.lvl1\",\"hierarchy.lvl2\",\"url\"]&hitsPerPage=10"}]}
```

Each hit has a `url`.

**Read** any docs page as Markdown by adding `.md` to its URL, which is much shorter than the HTML: `https://www.remotion.dev/docs/sequence.md`, `https://www.remotion.dev/docs/use-video-config.md`, `https://www.remotion.dev/docs/lambda/rendermediaonlambda.md`.

So: search, pick the best one or two URLs, fetch them with `.md`, and build from what they say now.

## The licence

Remotion is free for individuals and for companies of up to three people; a larger company needs a paid company licence (SKILL.md, "The engine", says when to tell the person). For anything beyond that, read the source rather than summarising from memory:

- Licence: https://www.remotion.dev/docs/license.md
- Licence FAQ: https://www.remotion.dev/docs/license/faq.md
- Terms and conditions: https://www.remotion.dev/docs/terms.md
- Buying a licence: https://www.remotion.dev/docs/license/pricing

Rendering from code takes a `licenseKey` option (apps.md, "Rendering from code").
