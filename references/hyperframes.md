# HyperFrames: a second engine, and file tools for any video

HyperFrames is HeyGen's open-source video engine (Apache-2.0): it renders HTML, CSS and GSAP to video frame by frame, with its own CLI, a Studio preview and a desktop app where people edit the video themselves. HeyGen's own guides for it ship inside this skill, in `hyperframes/` (Apache-2.0, copyright HeyGen; what was changed is in `hyperframes/NOTICE.md`): `hyperframes` (the engine), `hyperframes-cli` (the commands), `hyperframes-registry` (about 450 ready-made blocks), `media-use` (logos, icons, images, voice, grades), `reverse-any-video`, `style-sampling` and `remotion-to-hyperframes`. Each folder's `GUIDE.md` is its entry point. No separate HyperFrames skill is needed or wanted. This file covers when to build a video in it instead of Remotion, how this skill's pipeline maps onto it, and the CLI commands that help a Remotion video too. Its craft rules (storylines, numbers instead of adjectives, motion, sound, review) are already folded into this skill's other references.

## Contents
- Remotion or HyperFrames
- Setup and telemetry
- The bundled guides
- Building a video in HyperFrames
- File tools for any engine (tested on Windows)

## Remotion or HyperFrames

**Remotion stays the default.** This skill's template, the voice scripts (Kokoro, Edge, Sorani F5) with word timings, the right-to-left captions, `stills.mjs` and `check-audio.mjs` are all built and tested on it.

Build in HyperFrames when:
- the person asks for it, or wants to keep editing the video themselves afterwards (move clips on a timeline, change text and colours, all without code) in the HyperFrames Studio or desktop app. For someone who doesn't code, this is the better fit. Remotion can also give them a form for words, prices and colours in its Studio (production.md, "Text someone else will edit later"), but that means running a Node project on their PC; it suits a person comfortable with that, or a change made once or twice;
- a website is the subject and the video is mostly its real screens and brand (`capture` turns the site into material in about a minute);
- a ready-made HyperFrames block fits the job: code diff and typing scenes for a pull-request video, charts, caption styles, transitions (`hf catalog --json`);
- they want HeyGen's cloud render (a paid HeyGen plan) because the PC is too slow.

Say which engine and why in one line of the brief recap, and record it as `Engine:` in `brief.md`. Everything else in this skill stays the same in either engine: the interview, `brief.md`, `design.md`, the storylines, `story.json`, `STORYBOARD.md`, the gates, voice samples and `make-voice.mjs`, music, the review and the delivery. Only the build, preview, checks and render change.

This skill always runs the workflow; HyperFrames is only the engine. If a separate HyperFrames skill is still installed, `scripts/doctor.mjs` warns: remove it, since everything it did is here.

## Setup and telemetry

- **Install:** nothing to install beyond this skill. Needs Node.js 22+ and ffmpeg. The first command downloads the CLI through npx (about a minute). Never run `npx skills add` for a HyperFrames skill, `hf skills` or `hf skills update`: they would install the separate copies this skill replaces.
- **Running the CLI.** Their docs write `npx hyperframes <command>`; run it through the bundled launcher, from the project folder (never from the skill folder):
  - Bash: `HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1 node "<this skill>/hyperframes/hyperframes/scripts/plugin-cli.mjs" <command>`
  - PowerShell: `$env:HYPERFRAMES_NO_TELEMETRY='1'; $env:HYPERFRAMES_SKIP_SKILLS='1'; node "$HOME\.claude\skills\mshmsh-video\hyperframes\hyperframes\scripts\plugin-cli.mjs" <command>`

  `<this skill>` is this skill's folder (`~/.claude/skills/mshmsh-video` for a Claude Code global install). Below, the launcher is written `hf`. It starts npm from the home folder, so a project's own `package.json` or `.npmrc` can't swap the CLI, then runs the newest `hyperframes` from npm (0.9.102 on 2026-11-27) inside the project. `HYPERFRAMES_SKIP_SKILLS=1` stops the CLI installing HeyGen's separate skills. Helper scripts from the guides run as `hf --script "<this skill>/hyperframes/<guide>/scripts/<file>.mjs" ...`. `hf init` always gets `--skip-skills`. Don't add a `plugin.json` to this skill's root: the launcher reads it and refuses to start unless its name is `hyperframes`.
- **Telemetry.** mshmsh-video never sends usage events or feedback reports; the bundled guides were edited to drop those steps, and the commands above keep telemetry off. Two things still report usage when telemetry is on: the CLI (to HeyGen, linked to the person's HeyGen account once they sign in) and media-use's `transcribe.mjs`, `transcript-cut.mjs` and `audio-duck.mjs` (to PostHog). Both go quiet with `HYPERFRAMES_NO_TELEMETRY=1` or `DO_NOT_TRACK=1`, or `telemetryEnabled: false` in `~/.hyperframes/config.json` (`hf telemetry disable` writes it). Tell the person once and set the user environment variable so it stays off. Never run `hf events` or `hf feedback`. On the author's PC it has been off since 2026-11-17.
- **Things that leave the PC or read private data.** `hf audio --quality best` and `hf transcribe --engine heygen` upload to HeyGen and can bill the account; the defaults run locally. `hf usage` reads the Claude Code login on the PC to report plan usage; run it only when the person asks how much of their plan is left.

## Building a video in HyperFrames

1. **Read the bundled guides first:** `hyperframes/hyperframes/GUIDE.md` (the render contract and the work loop) and the reference its table names for the video's type, plus `hyperframes/hyperframes-cli/GUIDE.md` for the commands. Before hand-building a named visual (a transition, kinetic type, a chart, a map overlay), search the registry (`hyperframes/hyperframes-registry/GUIDE.md`). They are the source of truth for the engine, so build from them, not from this summary. The CLI updates itself from npm while the guides are a copy from 2026-11-27: if a command or flag in a guide fails, trust `hf <command> --help`.
2. **Start the project:** `hf init <dir> --skip-skills` for a blank one, or `hf capture <url> -o <dir> --json` when a website is the subject. A new project is 1920×1080 at 30 fps; set the size from the format in `brief.md`.
3. **Carry this skill's files across:**
   - `design.md` → the root's composition variables (palette and fonts as `data-composition-variables`, used as `var(--color-accent)`), so the person can re-brand from Studio.
   - `story.json` scenes → one sub-composition per scene in `compositions/`, mounted in `index.html`.
   - **Voice:** keep this skill's voice path, since it handles Edge and Sorani and gives word timings. In the HyperFrames project run `npm init -y`, `npm i -D kokoro-js@1.2.1` (not needed for Edge or F5), copy `scripts/`, then `node scripts/make-voice.mjs --out assets/voice.json --audio assets/voice`. Each scene's length is its `durationInFrames / fps`; each WAV becomes an `<audio id="vo-<scene>">` clip at its scene's start.
   - **Captions:** the words and times in `voice.json` (`startMs`/`endMs` from the start of each voice file, plus the scene's start and `voiceFrom`) become caption groups in one captions sub-composition (their `captions.md`). For Arabic and Kurdish, set `dir="rtl"` and load an Arabic-script font that has the Sorani letters (production.md lists them) with `@font-face` from `assets/fonts/`.
   - **Music:** the same track as `<audio id="music" data-timeline-role="music">`; beats from `hf beats`.
4. **The loop:** `hf lint` while writing; `hf check --json` and fix every error; `hf snapshot --review` and this skill's review.md; `hf preview` and give the person the Studio link (the preview gate); then `hf render --quality draft` while iterating and `--quality delivery -o out/<name>-v1.mp4` for the final. Confirm the file isn't empty, its `ffprobe` length matches the root's `data-duration`, and check frames and `hf audio out/<file>.mp4 --json`.
5. **The person's own edits.** Studio rewrites the files. Before changing anything in a later turn, run `hf timeline --json` to see what plays when, and build on what they changed.

Tested on Windows 11 (2026-11-17): the launcher, telemetry off, `capture`, `beats` and `audio`. A full HyperFrames build and render has not been tested on this PC yet (Intel integrated graphics, 16 GB RAM: expect slow renders, and render one thing at a time).

## File tools for any engine (tested on Windows)

These work on plain files, so a Remotion video can use them too. Run them from the project folder.

| Need | Command | Notes |
| --- | --- | --- |
| A track's tempo and beat times | `hf beats public/bgm/track.mp3 --json` | Prints `bpm` and `beatTimes` in seconds; writes nothing. About 6 s for a 3-minute track (tested). On calm music the tracker can invent a beat at double tempo (a 160 BPM reading may feel like 80): trust it only on rhythmic stretches, and cut calm parts on phrase changes. Beat grid in frames: motion.md. |
| A track's sections, loudness and true peak | `hf audio public/bgm/track.mp3 --only bpm,sections,loudness --json` | Sections come labelled A, B, C...; a label that repeats (D, E, D, E) is the chorus-like part: enter the music at its strongest section, not a quiet intro. Also gives integrated LUFS and true peak. About 5 s (tested). |
| Check a rendered video's sound | `hf audio out/<file>.mp4 --only loudness,silence --json` | Integrated loudness, true peak, clipping and the silent stretches, next to `check-audio.mjs`. |
| Where a sound effect peaks | `hf audio public/sfx/whoosh.wav --only moments --json` | Most files peak after their start; place the peak one frame after its picture (music.md, "Sound design"). |
| A website's screenshots, colours, fonts, logos and words | `hf capture <url> -o <scratch>/capture/<site> --skip-vision --json` | About 70 s (tested). Writes `screenshots/full-page.png` (1920 wide) and scroll shots, logos and images in `assets/`, the font files in `assets/fonts/`, `extracted/tokens.json` (colours and CSS variables), `extracted/visible-text.txt` (their real copy). It also writes a HyperFrames scaffold with `CLAUDE.md`, `AGENTS.md` and `.cursorrules`, so never capture into a Remotion project's root: capture to a scratch folder and copy what you need into `public/`. Exit code not 0, `ok: false` or a `BLOCKED.md` means it failed: use nothing from it. Brand rules: production.md, "Screenshots and app images". |
| Word timings for the person's own recording (make-voice already times a recorded English take itself, and `transcribe.mjs` captions any clip offline: toolbox.md, "Editing tools") | `hf transcribe <file> --model small --language <code> --json` | The default model, `small.en`, **translates** other languages into English: always pass `--model` and `--language` for non-English speech, `--model medium.en` for English over music. It invents "Thank you." over silence; more than 20% `♪` or `�` tokens means it failed. Convert the words to Remotion's `Caption` type (`startMs`, `endMs`). Not tested here, and not tested on Kurdish. |
| A cut-out of the person (text behind the speaker) | `hf remove-background clip.mp4 -o public/photos/me-cutout.webm` | Transparent WebM. Downloads a 168 MB model on first run and runs at about 2 fps at 1080p on a CPU, so trim the clip first. In Remotion stack the clip, then the text, then the cut-out (`<OffthreadVideo transparent>`). Not tested here. |
| A flight to a real place on satellite imagery | `node "<this skill>/hyperframes/hyperframes/scripts/bake-basemap.mjs"` with `NAME`, `CENTER="lng,lat"`, `ZSTART`, `ZEND`, `DUR` (and `PROJECTION=globe FROM=...` for space to street) | Records MapLibre over Esri satellite or Carto tiles to an MP4 plus `<NAME>-coords.json` (border points in screen pixels), which a Remotion scene plays as a clip with live pins and labels on top. Needs `puppeteer-core`, `npx puppeteer browsers install chrome-headless-shell` and network; one bake at a time. Credit the imagery on screen ("Esri, Maxar, Earthstar Geographics" or "© CARTO, © OpenStreetMap"). `--help` lists the rest. Not tested here; `references/remotion/maps.md` is the in-Remotion alternative. |

The other media commands (`media-treatment`, `normalize-audio`, `grade-compare`) work on HyperFrames projects only.

## The bundled guides

All in `hyperframes/`, each with a `GUIDE.md` to read first. Inside them, `<SKILLS>` means this skill's `hyperframes/` folder, and a mention of another guide's `SKILL.md` means its `GUIDE.md`.

| Guide | Read it when |
| --- | --- |
| `hyperframes/` | building or editing any video in HyperFrames: the render contract, the work loop, references per video type, 13 ready-made frame looks in `assets/frame-presets/` |
| `hyperframes-cli/` | running any `hf` command: init, lint, check, preview, render, timeline, capture, beats, audio, transcribe, upkeep |
| `hyperframes-registry/` | a named visual is needed (transition, overlay, title, kinetic type, captions, chart, map overlay, 3D, camera move): about 450 blocks installed as editable source |
| `media-use/` | a real logo, icon, image, sound, voice, colour grade or LUT, background removal, transcript cuts, ducking music under speech (`resolve` and its ledger); also when footage looks dark, flat or boring |
| `reverse-any-video/` | the person wants a video rebuilt or recreated as an editable project, checked frame by frame against the original |
| `style-sampling/` | "an episode in the style of ...": five proven explainer styles (collage, finance, science, 3D brand, true crime) on the person's topic |
| `remotion-to-hyperframes/` | an existing Remotion video (often one made by this skill) should become editable in HyperFrames Studio, checked frame by frame |

Not included: HeyGen's `figma` and `slideshow` guides.
