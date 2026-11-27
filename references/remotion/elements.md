# Remotion Elements

Elements are ready-made video components (titles, backgrounds, charts, caption styles and more) that Remotion's CLI copies into a project as source code. This covers finding one, installing it safely with a dry run first, and fitting it into a mshmsh-video scene. Read it when the person gives an Element page or library URL, or when a scene needs a component that a library already offers and building it would take longer. Written in our own words from Remotion's `remotion-elements` skill (4.0.547).

## Contents
- What an Element is
- Element libraries
- Adding an Element
- Fitting it into this skill's projects

## What an Element is

An Element is a React component written for video and published on its own web page (the Element page). Installing it copies the component's code into the project, so it belongs to the project from then on: edit it, restyle it and combine it with other components freely. It runs as code in the project, so install only from Element pages the person gave or libraries they trust.

The commands need Remotion 4.0.543 or later for `elements use` (and `--dry-run`) and 4.0.547 or later for `elements add-library`. A project from `setup-project.mjs` gets the latest. On an older one, upgrade first (setup-and-upkeep.md, "Upgrading") or ask.

## Element libraries

Any website can publish Elements; no library is the official one. The current list, with each library's URL and its Markdown index, is at https://www.remotion.dev/elements/libraries.md. For a library not on that list, find its Markdown index, usually `/llms.txt` on its domain, or add `.md` to one of its pages.

Installing a library adds it to Browse Elements in the Studio, where the person can preview its Elements and drag them into a composition:

```bash
npx remotion elements add-library <library-url>
```

- It adds a `Config.addElementLibrary()` call to `remotion.config.ts`, and does nothing if the library is already there.
- It takes the library's display name from its page; `--display-name <name>` sets another.
- `No Remotion config file found`: create `remotion.config.ts` containing `import {Config} from '@remotion/cli/config';` and run it again.
- Before 4.0.547, write `Config.addElementLibrary({url: '<library-url>'});` into `remotion.config.ts` by hand.

## Adding an Element

Four steps; don't skip the dry run.

**1. Find the Element page URL** (the installer needs the page, not a Markdown document).
- Given an Element page URL: use it.
- Given a library URL or just a name: read the library's Markdown index and pick the Element asked for.
- Given nothing: search the libraries' Markdown indexes for something that fits the scene.
- Indexes link to Markdown documents. Open the Element's document and take the page URL it names near the top (after `Element page:` or `URL:`); if it names none, drop the `.md` from the document's URL.
- If the Element comes from a known library, install the library first (above). With only an Element page URL, skip that.

**2. Dry run:**

```bash
npx remotion elements use <element-page-url> --composition <composition-id> --dry-run
```

Fix whatever it reports and repeat until it lists the Element, the files it would create or change, the packages and the assets:
- `No Element found`: look in the page's HTML for a `<link>` of type `application/vnd.remotion.element+json`. If one has an `href`, resolve it against the page URL and dry-run that JSON URL. With no such link, it isn't an Element: follow the install steps on its Markdown page (for example a `shadcn` command) and go to step 4.
- Several Elements on one page: add `--element <slug>`.
- A list of composition ids: pass the one being worked on (`StoryVideo` in this skill's template); ask if it is unclear.
- `elements use` or `--dry-run` not recognised: Remotion is older than 4.0.543.

**3. Install:** the same command with `--yes` in place of `--dry-run`. It installs missing packages, saves assets in `public/`, writes an `.element.tsx` file next to the composition's component and places the Element at frame 0. If that `.element.tsx` already exists with different content, the command stops; add `--overwrite` only with the person's agreement.

**4. Adapt and preview:** change its text, colours and props to the video, set its timing and place through the `<Sequence>` around it, and open the composition in the Studio to check it renders. Fix errors and check again.

Flags in full: https://www.remotion.dev/docs/cli/elements/use.md. To make and publish Elements: https://www.remotion.dev/docs/elements/creating.md and https://www.remotion.dev/docs/elements/libraries.md.

## Fitting it into this skill's projects

- The installer drops the Element into the root composition at frame 0. In this skill's template the timeline is `StoryVideo` built from `story.json`, so move the Element into the scene that uses it in `scenes.tsx` and remove the frame-0 copy.
- Restyle it from `design.md` and `theme.ts` (colours, fonts, sizes), and check it against the safe zones in `layout.ts`; an Element is designed for one size and doesn't know this skill's formats or platforms.
- Animation inside it must run from `useCurrentFrame()` like everything else (motion.md); look for CSS transitions in its code.
- An Element that shows text needs the Arabic-script font for Kurdish or Arabic text and a right-to-left check (production.md, the font list).
- Caption-style Elements: this skill's captions come from `Narration.tsx` with word timings from `voice.json`; use a caption Element only for its look, fed from those timings.
- Note each installed Element and its source URL in the project's notes, since its code now lives there.
