# HyperFrames: a second engine, and file tools for any video

HyperFrames is HeyGen's open-source video engine (Apache-2.0): it renders HTML, CSS and GSAP to video frame by frame, with its own CLI, a Studio preview and a desktop app where people edit the video themselves. Its two skills, `hyperframes` and `hyperframes-cli`, were installed and read on 2026-11-17. This file covers when to build a video in it instead of Remotion, how this skill's pipeline maps onto it, and the CLI commands that help a Remotion video too. Its craft rules (storylines, numbers instead of adjectives, motion, sound, review) are already folded into this skill's other references.

## Contents
- Remotion or HyperFrames
- Setup and telemetry
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

If the `hyperframes` skill loads alongside this one for a video request, this skill still runs the workflow; HyperFrames is only the engine.

## Setup and telemetry

- **Install:** `npx skills add https://github.com/heygen-com/hyperframes --skill hyperframes -g` and the same with `--skill hyperframes-cli`. `hyperframes-cli` alone doesn't work: it runs everything through the main skill's launcher. Needs Node.js 22+ and ffmpeg.
- **Running the CLI.** Their docs write `npx hyperframes <command>`; run it as `node "<skills>/hyperframes/scripts/plugin-cli.mjs" <command>` from the project folder, where `<skills>` is the folder the skill is installed in (`~/.claude/skills` for a Claude Code global install). Below it is written `hf`. The launcher starts npm from the home folder, so a project's own `package.json` or `.npmrc` can't swap the CLI, then runs the newest `hyperframes` from npm (0.9.58 on 2026-11-17) inside the project.
- **Telemetry.** HyperFrames sends usage counts to HeyGen, linked to the person's HeyGen account once they sign in, and its skills tell the agent to send a usage event when a skill starts and feedback reports after renders. Tell the person and offer to turn it off: `hf telemetry disable` plus the user environment variable `HYPERFRAMES_NO_TELEMETRY=1` (or `DO_NOT_TRACK=1`). With it off, skip the usage event and the `feedback` reports. On the author's PC it has been off since 2026-11-17.
- **Things that leave the PC or read private data.** `hf audio --quality best` and `hf transcribe --engine heygen` upload to HeyGen and can bill the account; the defaults run locally. `hf usage` reads the Claude Code login on the PC to report plan usage; run it only when the person asks how much of their plan is left.

## Building a video in HyperFrames

1. **Read their skills first:** the `hyperframes` SKILL.md (the render contract and the work loop) and the reference its table names for the video's type, plus `hyperframes-cli` for the commands. They are the source of truth and the CLI updates itself, so build from them, not from this summary.
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
| Word timings for the person's own recording | `hf transcribe <file> --model small --language <code> --json` | The default model, `small.en`, **translates** other languages into English: always pass `--model` and `--language` for non-English speech, `--model medium.en` for English over music. It invents "Thank you." over silence; more than 20% `♪` or `�` tokens means it failed. Convert the words to Remotion's `Caption` type (`startMs`, `endMs`). Not tested here, and not tested on Kurdish. |
| A cut-out of the person (text behind the speaker) | `hf remove-background clip.mp4 -o public/photos/me-cutout.webm` | Transparent WebM. Downloads a 168 MB model on first run and runs at about 2 fps at 1080p on a CPU, so trim the clip first. In Remotion stack the clip, then the text, then the cut-out (`<OffthreadVideo transparent>`). Not tested here. |
| A flight to a real place on satellite imagery | `node "<skills>/hyperframes/scripts/bake-basemap.mjs"` with `NAME`, `CENTER="lng,lat"`, `ZSTART`, `ZEND`, `DUR` (and `PROJECTION=globe FROM=...` for space to street) | Records MapLibre over Esri satellite or Carto tiles to an MP4 plus `<NAME>-coords.json` (border points in screen pixels), which a Remotion scene plays as a clip with live pins and labels on top. Needs `puppeteer-core`, `npx puppeteer browsers install chrome-headless-shell` and network; one bake at a time. Credit the imagery on screen ("Esri, Maxar, Earthstar Geographics" or "© CARTO, © OpenStreetMap"). `--help` lists the rest. Not tested here; `remotion-maps` is the in-Remotion alternative. |

The other media commands (`media-treatment`, `normalize-audio`, `grade-compare`) work on HyperFrames projects only.
