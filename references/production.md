# Production

## Contents
- Project setup
- Files and what they do
- Components cheat sheet
- Formats and preview
- Screenshots and app images
- Verifying (stills and audio)
- Pitfalls we already hit

## Project setup

One command, run with the skill's own copy of the script, into a new
subfolder of the person's projects folder:

```bash
node <skill>/scripts/setup-project.mjs <projects>/<video-name> --format 9:16 --platform reels
#   --format 9:16 | 16:9 | 1:1 | 4:5        the composition size (styles.md, "Formats")
#   --platform reels | whatsapp | landscape | feed   the safe zones every component follows
#   --script sorani | arabic               a font with the Arabic-script letters, right-to-left story
#   --brand <brands>/<brand>/brand.json    the brand's colours, fonts and logo (updates.md)
#   --no-kokoro                            skip the Kokoro package (an Edge, Sorani or no-voice video)
```

It scaffolds a blank Remotion project around the plan files already in the
folder (`brief.md`, `design.md`, `STORYBOARD.md`), adds the packages, copies
the template and the scripts, writes `Root.tsx` for the size and platform,
writes `theme.ts` from `design.md`'s "Palette:" and "Fonts:" lines (then the
brand kit, then the template's own look, with a note), patches
`tsconfig.json`, makes the `public/` folders, downloads the sound effects,
turns `STORYBOARD.md` into `story.json` with every scene a placeholder, and
writes draft timings, so `npx remotion studio` plays the storyboard as an
animatic straight away. `--local-fonts` downloads the fonts' files from
Google's font repository into `public/fonts/` and loads them with
`@remotion/fonts`, so renders never need the internet; setup does this by itself when it can't reach Google Fonts (`--google-fonts` keeps them online anyway). `node scripts/doctor.mjs` then checks the machine and the
project. On an older project, `--update` replaces the shared components and
scripts (with a backup) and leaves the per-video files alone.

By hand, if the script isn't there: scaffold as in `remotion/setup-and-upkeep.md`
(blank, no Tailwind), then:

```bash
npx remotion add @remotion/transitions @remotion/google-fonts @remotion/media @remotion/captions
npm i -D kokoro-js@1.2.1   # Kokoro voices; an Edge voice needs `python -m pip install edge-tts` instead
npm i -D sherpa-onnx-node@2.0.1   # Supertonic and Pocket TTS voices
mkdir -p public/photos public/shots public/sfx public/bgm public/brand scripts
```

Copy from this skill:
- `assets/template/src/*` → `src/`. You get `Root.tsx`, `theme.ts`,
  `layout.ts`, `ChapterLabel.tsx`, and `story/` with the components,
  `StoryVideo.tsx`, `scenes.tsx`, `voice.ts` and a sample `story.json`.
  Delete create-video's `src/Composition.tsx`.
- `scripts/*` (the `.mjs` scripts and `edge-voice.py`) → the project's
  `scripts/`. They have to live inside the project: Node resolves `kokoro-js`
  from the script's own folder, so running them from the skill folder fails
  with `ERR_MODULE_NOT_FOUND`.

Add `"resolveJsonModule": true` to tsconfig `compilerOptions` (and `"lib":
["es2022"]`). Set the size and platform in `src/Root.tsx`:

```tsx
<Composition id="StoryVideo" component={StoryVideo}
  durationInFrames={STORY_VOICE.totalFrames} fps={STORY_VOICE.fps} width={1080} height={1920}
  defaultProps={{ platform: "reels" as const }} />
```

Then `node scripts/make-voice.mjs --draft` for timings before the voice.

Download the sound effects you'll use into `public/sfx/` (`curl -sfo
public/sfx/<name>.wav https://remotion.media/<name>.wav`). Good ones are
`whoosh`, `mouse-click`, `record-scratch`, `vine-boom`, `windows-xp-error` and
`ding`. The full list is in `remotion/audio.md`.

Voice: run `node scripts/voice-samples.mjs "<a line from their story>" --voices
kokoro,supertonic,pocket` (setup-project installs `sherpa-onnx-node` for
them; an older project needs `npm i -D sherpa-onnx-node@2.0.1`), send `out/voice-samples/all.mp3`, and let the
person choose by number. Don't pick a voice from its name. Put the choice in
`story.json`, then `node scripts/make-voice.mjs`. Each engine downloads its
model once (Kokoro about 330 MB, Supertonic and Pocket about 100 MB each). For
Arabic, sample `supertonic` and `edge-ar`; for Sorani Kurdish, `gemini` and the
F5 voices (toolbox.md, "Voice" and "Sorani voices").

## Files and what they do

| File | Role |
| --- | --- |
| `src/story/story.json` | the script: scenes (`text`/`say`, `lead`/`hold`, `enter`, `silence`, `board`), voice, speed, `music`, `direction`; for some voices `lang` (Supertonic), `voiceStyle` and `voiceModel` (Gemini) |
| `scripts/make-voice.mjs` | TTS per scene (Kokoro; `supertonic:F2`, `pocket:alba` or `pocket:me.wav`, `gemini:Charon` through `voice-engines.mjs`; Edge for a voice like `ar-IQ-RanaNeural`; for `f5:studio-male`, the Sorani files from `tts/speak_story.py`; `--draft` for silent estimated timings) → `public/voice/<id>.wav` + `src/story/voice.json` (durations, word timings, each scene's overlap). Re-speaks only the scenes whose words, voice or speed changed; `--fresh` re-speaks all. |
| `src/story/voice.ts` | `sceneVoice`, `wordAt`, `voiceEnd`, `overlapOf`, `IS_DRAFT_VOICE` |
| `src/story/scenes.tsx` | **the file you write per video:** one component per scene id. A missing id plays as a placeholder. |
| `scripts/sync-story.mjs` | `STORYBOARD.md` → `story.json` scenes (keeps `say`, `hold`, `enter`, `silence`); `--seconds` writes the real scene lengths back into the storyboard |
| `scripts/pronounce.mjs` | each scene's names and odd words as the Kokoro voice will pronounce them (phonemes); compare spellings for `say` |
| `src/story/StoryVideo.tsx` | the timeline, built from `story.json` and `voice.json`: scenes in a `TransitionSeries` with each scene's `enter`, the music bed with ducking, silences and the fade-out, whooshes on slides and wipes, a "draft timing" label while the voice is a draft. Not edited per video. |
| `src/layout.ts` | `useLayout()`: margins, chapter, visual band, caption position and size, title size and the smallest readable text for the composition's size and platform |
| `src/story/Narration.tsx` | plays a scene's voice and shows the captions (phrase pages, current word in accent, right to left for Arabic script, optional scrim) |
| `src/story/Placeholder.tsx` | a scene not built yet: its number, id and `board` line, with the narration |
| `src/story/scenes/*` | `FreezeScene` (cold open), `BeatScene` (chapter + visuals + narration) |

## Components cheat sheet

- **Every scene with a line plays its narration.** `BeatScene`, `FreezeScene`
  and `Placeholder` include `<Narration>`; a scene built without them must
  render `<Narration id="…" />` itself (with `showCaptions={false}` if
  captions don't fit), or its line is silent.
- `const layout = useLayout()`: place visuals between `layout.visualTop` and
  `layout.visualBottom`, inside `layout.left`/`layout.right`, text at least
  `layout.minText`. Typed-in pixel positions don't follow a second format.
- `<Title text="Fresh every morning" at={wordAt(id, "fresh")} entrance="words" accent="fresh" outAt={…} />`:
  entrances `words` (per-word blur-in), `line`, `grey` (grey to ink), `rise`;
  lands, then holds dead still; right to left and never per letter for
  Kurdish and Arabic. Without `top` it flows in its parent.
- `<EndCard name="…" cta="@handle" at={…} />`: the logo from
  `public/brand/logo.svg|png|webp` carried in once, then the name, then the
  call to action. Give its scene 2 s or more of `hold`. `ctaMono` sets an
  install command, URL or handle in the mono font. Without a logo file the
  name becomes the hero (1.7 times the title size).
- `<Terminal lines={[{ at: -2, kind: "typed", text: "$ npm run build" }, …]} />`:
  a typed line with `at` below zero is already typed on the scene's first
  frame, so a terminal scene doesn't open on an empty window.
- `<PhotoFill base="shop" from={1} to={1.08} scrim />`: a full-frame photo or
  clip with a slow push; `slamAt={wordAt(id, "reaction") + 0.25}` is the
  reaction zoom (hit, shake), with a boom and `"silence"` on that word.
- `<Cursor path={[{ at: 0, x: 1200, y: 1500 }, { at: wordAt(id, "open"), x: 520, y: 700, click: true }]} />`:
  a cursor about 5% of the frame that enters from off screen and clicks with a
  sound; make the click cause the next thing on the same frame.
- `<Stamp at={…} text="STRESS LEVEL: 99%" shake />`, `note` for a second line:
  the deadpan and stress stamps.
- `<Sfx src="sfx/whoosh.wav" at={frame} />` or `src={["sfx/whoosh.wav", "sfx/whoosh-2.wav"]} take={n}`:
  a sound effect that is skipped when its file is missing, peaking one frame
  after `at`. Use it instead of `staticFile` for every sound.
- `<Narration id hideWords={[[5, 8]]} showCaptions scrim />`: hide the words the scene
  shows itself (a quote); turn captions off where on-screen text says the same;
  `scrim` backs the words over a bright picture.
- **Arabic and Kurdish captions.** `Narration` reads each caption page right to
  left when most of its words are Arabic script, and also breaks pages at `،` `؛`
  `؟`; `ChapterLabel`, `Title` and `Stamp` drop letter-spacing and uppercase on
  right-to-left text. The template's fonts have no Arabic letters:
  `setup-project.mjs --script sorani` (IBM Plex Sans Arabic) or `--script arabic`
  (Noto Kufi Arabic) writes this into `theme.ts`; by hand, load one and put it
  after the heading font:

  ```ts
  import { loadFont as loadArabic } from "@remotion/google-fonts/NotoKufiArabic";
  const { fontFamily: latinHeading } = loadHeading("normal", { weights: ["500", "700"], subsets: ["latin"] });
  const { fontFamily: arabicFont } = loadArabic("normal", { weights: ["500", "700"], subsets: ["arabic"] });
  // Latin letters from the heading font, Arabic letters from the Arabic one.
  export const headingFont = `${latinHeading}, ${arabicFont}`;
  ```

  Arabic fonts run wider, so a page can wrap to a second line; pass a lower
  `maxChars` to `Narration` if that crowds the frame.

  For Kurdish, the font needs the Sorani letters ڕ ڵ ە ۆ ێ, and Google's
  `arabic` subset doesn't promise them. Checked against the font files on
  2026-10-22, these Google fonts have every Sorani letter: Noto Kufi Arabic,
  Noto Sans Arabic, Noto Naskh Arabic, IBM Plex Sans Arabic, Vazirmatn, Mada,
  Beiruti, Fustat, Estedad, Zain (check its joins by eye), Kufam, Reem Kufi,
  Amiri, Scheherazade New, Lateef, Harmattan, Parastoo, Playpen Sans Arabic,
  Aref Ruqaa, Jomhuria and Katibeh. Cairo, Tajawal, Almarai, Alexandria,
  Changa, El Messiri, Lalezar, Lemonada, Markazi Text, Rakkas, Rubik, Baloo
  Bhaijaan 2, Alyamama and Readex Pro don't: the missing letters fall back to
  another font in the middle of a word.
- `<PhotoCard base="friend1" name initial size mediaAspect={640/360} focusY={0.78} />`:
  a polaroid that finds `public/photos/<base>.(jpg|png|webp|gif|mp4|mov|webm)`
  through `getStaticFiles()`, which works in Studio and in renders. It falls
  back to a big initial. Video is muted and looped. `mediaAspect` (height/width)
  plus `focusY` (0 top, 1 bottom) crop a portrait clip to the square.
- `<Laptop width>`, `<Phone width>`, `<Shot src="shots/x.png" />`, and
  `<ShotVideo src="rec/demo.mp4" trimBefore={…} />` for a screen recording: device mockups.
  Animate a 3D tilt on the wrapper with
  `transform: perspective(2200px) rotateY(...)`. Slide in a new `Shot` with
  `translate: "100% 0%" → "0% 0%"` on a narration word.
- `<Terminal title lines={[{ at, kind: "typed"|"output"|"error"|"success", text, sound }]} />`:
  types at 26 chars/s, plays `sound` when a typed line finishes or an error
  appears.
- `<Counter at value suffix label finalText="∞" />`: counts up over 0.9 s, then
  can swap to a joke value.
- `motion.ts`: `ease.arrive` / `ease.camera` / `ease.exit` (eases by job),
  `blurIn`, `blurOut`, `springBy(frame, start, fps, bounce)` (a spring named by
  its bounce ratio), `kenBurns`, `moveBlur`, `beatFrame(i, bpm, fps)`, and the
  older `fadeUp`, `popIn` (sticker slap with overshoot), `appear`.
- Layout comes from `useLayout()`. For 1080×1920 on WhatsApp: chapter label at
  y 180, visuals between 300 and 1400, captions from 1470, 100 px side margins;
  on Reels the captions move up to 1300 and the right margin widens to 160.
  Headlines are at least 84 px; supporting text at least 44 px.
- Caption pages: `Narration` breaks pages at punctuation, splits a phrase
  longer than `maxChars` (26 by default) into pages of even length, and
  doesn't end a page on a word of one or two letters ("of", «لە»). Set
  `maxChars` to what fits on one line at the caption size. For 1920×1080 this
  worked (Sorani, IBM Plex Sans Arabic), passed from `BeatScene`:
  `<Narration id={id} top={892} left={160} right={160} fontSize={56}
  maxChars={46} align="center" />`, with the chapter label at y 70, 120 px
  side margins and the visuals between y 160 and 840. `useLayout()` gives
  these numbers by default in landscape (with 120 px margins).
- **Platform safe zones.** Instagram Reels, TikTok and Shorts lay their own
  username, caption and buttons over roughly the bottom 400 px and the right
  140 px. With `platform: "reels"` in `Root.tsx` (`--platform reels`),
  `Narration`, `ChapterLabel`, `FreezeScene` and the rest move up and in by
  themselves; keep your own stickers off the right edge and words above y 1330
  (review-check flags a `top` below that). WhatsApp Status covers far less.
  Tell the person to turn off the app's auto-captions and not to add the app's
  music on top.

## Formats and preview

The composition size sets the format (styles.md, "Formats and safe zones"): `setup-project.mjs --format` writes it, or set `width={1920} height={1080}` for landscape, `1080 x 1080` for square, `1080 x 1350` for portrait feed. The shared components follow `useLayout()`; anything you positioned by hand in a scene has to be repositioned for a new size, not reused from the 1080 x 1920 numbers.

Start `npx remotion studio` as soon as the project runs and keep the preview open while building; with draft timings and placeholders it plays as an animatic from the start. `node scripts/render.mjs --draft` makes a half-size file in about a third of the time, for a person who can't open the Studio. Render the full MP4 when the person asks for the file or when delivering a video to post.

## No narration: the music is the clock

With no voice, `make-voice.mjs` is skipped and nothing else sets the scene lengths, so the track does:

1. **Pick the music right after the script gate**, before building, not after (music.md).
2. **Get its grid:** `hf beats public/bgm/track.mp3 --json` for the tempo and beat times, `hf audio ... --only sections` for where it is strongest (hyperframes.md). On calm music, cut on phrase changes instead.
3. **Give every scene a whole number of beats** (a bar is 4) in `story.json`, with the track's `"bpm"`, and each scene's on-screen words in `text`. Land the payoff and the end card on strong beats. Trim the music so one of its beats falls on frame 0 (start the `<Audio>` at a beat time from `hf beats`).
4. **Run `node scripts/make-timing.mjs`.** It writes `src/story/timing.json` in `voice.json`'s shape, with every scene starting exactly on its beat (computed from the beat's index, so nothing drifts), and flags any scene too short to read its `text` (0.5 s + 0.3 s a word). Import it where the template imports `voice.json`. Then `stills.mjs <id> review --voice src/story/timing.json` works as usual; `check-audio.mjs` without a voice file still reports the peak, clipped samples and any `--at` windows, and `hf audio out/<file>.mp4 --only loudness --json` gives the loudness (about -14 LUFS for music alone). Re-run it when the real track's tempo is known.
5. **Large titles carry the words**, each held long enough to read, with the screen never depending on sound (story-and-comedy.md, "Words on screen and in the voice").

## Text someone else will edit later

When the person (or their staff) will change words, prices or the monthly offer themselves after delivery:

- **Remotion:** a Zod `schema` on the `<Composition>` with `defaultProps` turns every field into a form in Remotion Studio's props panel, and saving there writes the values back to the code (`remotion/interactivity.md`, `remotion/project-compositions.md`). It needs Node and the Studio running on their PC; a double-click `.bat` that starts the Studio and another that renders to a new file name help a non-coder.
- **HyperFrames:** the same fields as composition variables, edited in its Studio or desktop app, which also lets them move and trim clips on a timeline (hyperframes.md, "Remotion or HyperFrames").
- **Either way, timing doesn't follow their edits.** Cap each field's length, hold every line long enough for its longest allowed text, let text shrink between its design size and a floor (never under 28 px at 1080 wide), and give a field that can be empty (no offer this month) a fixed fallback. Don't narrate editable text: a recorded line can't change when the text does. Test the longest allowed text and the empty case in the review sheets before delivery.

## Screenshots and app images

- **Live sites:** headless Chrome, with a separate profile so it doesn't touch
  the person's own.

  ```bash
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars \
    --user-data-dir="<scratch>/chrome-profile" --virtual-time-budget=8000 \
    --window-size=1440,900 --screenshot="<abs>/public/shots/site.png" "https://example.com/en/"
  ```

  Use `--window-size=390,844` for phone shots. Take a phone shot of every site
  that appears on the laptop, so the phone matches.
- **A whole site as material** (a promo built on their website):
  `hf capture <url> -o <scratch>/capture/<site> --skip-vision --json`
  (hyperframes.md) gets, in about a minute, a full-page screenshot at 1920 wide
  plus scroll shots, the logos and images, the font files, the colours and the
  site's own words. Capture to a scratch folder, never the project root (it
  writes its own `CLAUDE.md` and `AGENTS.md`), and copy what you use into
  `public/`. To show the site as it is, use its screenshots: rebuilding the
  page in code drifts from the real layout, so rebuild only the part that
  moves. Pushing in past 1:1 needs its own 2× screenshot of that region
  (`--force-device-scale-factor=2` with headless Chrome).
- **Brand colours and fonts from a site:** link blue (`#0000EE`) and status
  reds and greens are never the accent; the accent is the colour that recurs
  in the most roles. Icon fonts (Font Awesome, icomoon) are never the headline
  or body font. Use only the weights the brand font ships, or 600 and 700
  render as fake bold. A dark brand swaps background and text in a light
  template.
- **Apps:** look in the projects for `docs/screenshots/` or golden test images
  (`test/**/goldens/*.png`) before taking new screenshots.
- Read each image before using it: check for private data, empty areas, and
  whether it's the right page.

## Verifying (stills and audio)

You can't hear the video, so measure it and look at frames:

1. **Stills.** Run
   `node scripts/stills.mjs StoryVideo end:open "reaction@advice+0.6" "pressure@websites+0.4"`.
   It bundles once and renders each spec (`end:<scene>`, `word@scene+sec`, or a
   frame number) to `out/stills/`. Read every PNG. Check that:
   - each punchline visual is visible on its word
   - nothing overlaps or wraps awkwardly ("Mr." alone at a line end: use
     `&nbsp;`)
   - nothing peeks out from behind a zoom
   - each scene's last gag lands before its fade starts (`end:<scene>`)

   `start:<scene>` (just after its transition) and `mid:<scene>` work as specs
   too. `node scripts/stills.mjs StoryVideo review` renders every scene's
   start and middle and every seam, and tiles them into
   `out/stills/review/scenes.png`, `seams.png` and `phone.png` (360 px wide);
   that is the input to the review pass (review.md). It bundles once and renders
   every frame in one browser, three at a time (32 frames in 19 s in a 2-core
   sandbox, 2026-11-18; one browser per frame took 2 min 20 s for a 7-scene
   reel on the laptop). Review frames are half size; `--full` for full size.
   When Remotion can't download its own browser (the Claude app's cloud
   workspace), stills.mjs and render.mjs use a Chrome or Edge already installed
   (`find-browser.mjs`); `--browser-executable <path>` (or
   `REMOTION_BROWSER_EXECUTABLE`) picks one by hand.
2. **Render with `node scripts/render.mjs`** (`--name`, `--draft`). It writes
   the next free `out/<name>-vN.mp4`: on Windows, a video open in the player
   locks the file and Remotion's final rename fails with `EPERM`, so a render
   never reuses a name. If it still happens, the finished render is in
   `*.remotion-in-progress`; rename it. It then runs `review-check.mjs` on the
   file: the length against `voice.json`, an empty first frame, black and
   frozen stretches, silence, loudness and true peak, with the script and code
   checks.
3. **Audio.** Run `node scripts/check-audio.mjs out/<file>.mp4 --at 1.25-1.9`.
   Speech should be around -20 dBFS, with the music bed 8 to 12 dB under it, no
   clipped samples, and quiet spots where you planned silences. For anything
   posted, `node scripts/master-audio.mjs out/<file>.mp4` brings the mix to
   about -14 LUFS, true peak under -1 dBTP, in `<file>-master.mp4` (tested
   2026-11-18: -18.1 to -13.9 LUFS, the picture copied, not re-encoded).
4. **Frames from the final file** for anything time-sensitive:
   `ffmpeg -ss <sec> -i out/x.mp4 -frames:v 1 -vf scale=540:-1 out/check.png`,
   or the whole video on one contact sheet (toolbox.md, "Verification tools").
5. **Open it** for the person (`Invoke-Item` on Windows, `open` on macOS).
   Tell them plainly that you checked frames and measured the audio, but
   couldn't listen. Ask them to judge the music mood and pronunciation.

## Pitfalls we already hit

- **Captions stretched over a second.** The voice script matches pauses to
  punctuation with a small alignment. Abbreviations like "Mr." are excluded, and
  you should write "Mister" in `say` anyway. If a word still takes over a second,
  check `make-voice.mjs`'s "x/y breaks" line and rephrase. Long Sorani words
  («وردەکارییەکان», 13 letters) really do take a second or a little more; if
  every break matched, that is fine.
- **`remotion render --frames` fails** with `EINVAL ... write` from
  `inline-audio-mixing` once there is scene audio. `--muted` doesn't help.
  Use `stills.mjs`, which bundles and then runs `remotion still`.
- **`EPERM` on rename after a render:** see "Render to a new filename" above.
- **`stills.mjs` fails on its first frame** now and then, right after
  bundling (twice on 2026-10-25); the same frame renders fine by hand. Run it
  again.
- **Visuals land early on a word `say` spells out.** The word timer weighs
  each caption word by its letters, so «٢٠ی», `PHP` or `8.1` counted as
  almost nothing while the voice says «بیستی», «پی ئێچ پی». `make-voice.mjs`
  now lines `text` up with `say` and counts what is actually spoken, and reads
  Eastern Arabic digits as numbers. Keep the words both share spelled the
  same, so they can line up.
- **Sorani voice on Windows** (`scripts/sorani/speak_story.py` handles all
  three): F5 prints its phonetic text and crashes with `UnicodeEncodeError`
  in a cp1252 console (`python -I` ignores `PYTHONIOENCODING`, so the script
  switches its output to UTF-8 itself); `torchaudio.load` fails because the
  `torchcodec` DLL doesn't load, so WAVs are read with `soundfile`; and the
  MMS stand-in's vocabulary has the Arabic kaf ك, not the Kurdish ک, so
  every ک is silently dropped unless it is mapped first.
- **The bundled ffmpeg** (`npx remotion ffmpeg`) lacks some filters (`fps`,
  `tile`). Use the full `ffmpeg` (installed 2026-10-21); without it, extract
  frames one `-ss` at a time.
- **Phone clips** are usually HEVC and often HDR (HLG), which can fail to play
  or look washed out. Check with
  `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,color_transfer -of csv=p=0 clip.MOV`
  and convert to H.264 before using it:
  `ffmpeg -i clip.MOV -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart public/photos/name.mp4`.
  If `color_transfer` is `arib-std-b67` or `smpte2084` (HDR), also tone-map:
  `-vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"`.
  It needs the colour tags real phone clips carry, and fails with "no path
  between colorspaces" on an untagged file. Compare a frame before and after.
- **Gag lands during the fade:** the transition overlaps the last 15 frames.
  Raise the scene's `hold` instead of squeezing the gag.
- **Hand-held clips pan.** Something hidden in one frame shows up in the
  next. Check at least four frames across the clip before choosing `focusY`.
- **A second cut in the same project** (a longer class version next to the
  social one): copy `src/story/` to its own folder and register one
  composition per cut (updates.md, "A second cut in the same project"). Pass
  its `--voice` (and `--story`) to `stills.mjs`, `review-check.mjs` and
  `check-audio.mjs` as well: without it, check-audio measured with the first
  cut's timing and reported the music louder than the speech.
- **Renders need the internet for Google Fonts.** `loadFont` fetches the font
  files at render time; offline (or behind a filter) the render stops after
  30 s with "Timeout ... Fetching <font> font". `setup-project.mjs
  --local-fonts` saves the files in `public/fonts/` and loads them with
  `@remotion/fonts` instead (setup turns it on by itself when Google Fonts
  can't be reached); by hand, `loadFont({ family, url:
  staticFile("fonts/x.ttf"), weight: "200 800" })` from `@remotion/fonts`, with
  the files from `raw.githubusercontent.com/google/fonts/main/ofl/<name>/`
  (its `METADATA.pb` lists them). Seen 2026-11-18 in a sandbox without Google
  Fonts; the GitHub copy worked there.
- **`npm i kokoro-js` fails on Linux and WSL** with "Failed to download the
  binaries: 404" from `onnxruntime-node`'s CUDA step. Add
  `--onnxruntime-node-install-cuda=skip` (setup-project does); Windows and
  macOS don't download CUDA.
- **Pocket and Supertonic need `sherpa-onnx-node`** in the project (`npm i -D
  sherpa-onnx-node@2.0.1`); without it make-voice stops with that command.
  Their first run downloads the model with `curl` and `tar` into
  `~/.cache/mshmsh-video/models`. If the connection drops, run it again: the
  download starts over (a half-done file is left as `.part`).
- **Gemini's key lives in the terminal**, not in a file: `GEMINI_API_KEY` set in
  the shell that runs make-voice. A new terminal needs it again. The free tier
  allows few requests a minute, so a long video takes a few minutes while
  make-voice waits and retries; scenes already spoken are kept.
- **A product name broke across two lines at its hyphen** ("video-" /
  "xoshaka"). Caption words never break inside now; in a title or a card, wrap
  the name in `<span style={{ whiteSpace: "nowrap" }}>`.
- **A scene's line is silent** when the scene doesn't use `BeatScene`,
  `FreezeScene` or `Narration` (see "Components cheat sheet").
- **A sound effect file that isn't there** fails the whole render when it's
  played through `staticFile`; `<Sfx>` skips it instead. review-check and
  doctor list every `staticFile(...)` path that doesn't exist.
- **The length creeps up** as jokes are added. Tell the person the length and
  offer the easiest scene to cut.
- **`hf capture` drops a HyperFrames scaffold** (`CLAUDE.md`, `AGENTS.md`,
  `.cursorrules`) into its output folder. Captured into a
  Remotion project's root, those files would change how the next session
  behaves there. Always capture to a scratch folder (2026-11-17).
- **Screenshots shrink to nothing on a phone.** In a 1080-wide reel, a laptop
  mockup of a full desktop screen shows its text at a few pixels; the phone
  review sheet makes it obvious. Crop to the part that matters, or push in on
  it, so its text stays at least 26 px.
