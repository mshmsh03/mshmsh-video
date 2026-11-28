# Changelog

## 2026-11-28, three fixes from the first video made with the all-in-one skill

- **Setup keeps a `public/` folder that is already there.** The interview has the person's photos put in `public/photos` before the project exists, and `setup-project.mjs` then refused the folder ("already has public but no package.json"). The blank project now moves in around it, and a file of the person's is never replaced.
- **A whole script in one Gemini request.** Gemini's free tier allowed ten speech requests a day for each model (2026-11-19), and make-voice spends one a scene. New: `scripts/gemini-take.mjs` speaks every scene in a single request (it checks what could fail before spending it, and never writes over a take), and `scripts/split-take.mjs` cuts the take at its pauses into `out/voice-raw/<id>.wav` for `"voice": "recorded"`. A one-scene take (`--only <id>`, for a line that changed) is saved as that scene's file; the splitter two videos had borrowed crashed on those. Both run on Node alone, no Python.
- **A body or heading font with Arabic letters loads them.** `design.md`'s "body IBM Plex Sans Arabic" was loaded with its Latin letters only, so Kurdish in `bodyFont` quietly came from the script font. In a Kurdish video this goes for the fonts checked to have every Sorani letter; for any other, setup keeps Kurdish in the script font and says so in a note. A project set up before today keeps its `theme.ts`: add `"arabic"` to that font's `subsets` by hand.
- Setup with `--script sorani` no longer stops when Python has left a `__pycache__` folder beside the Sorani voice tools (found while checking the fixes above).
- Gemini's voices are no longer "tested against a mock only": two Sorani videos used them against Google itself (`references/toolbox.md`, "Voice").
- The repo now has tests (`.github/tests/`, run on every push): setup's offline steps, and the one-take route against a stand-in for Google's API, with no key and no internet.

## 2026-11-27, Claude app zip under 200 files

- The Claude app refused the new zip ("Zip contains too many files (maximum 200)"): the full skill has about 490. `mshmsh-video.zip` is now a lighter app copy (about 190 files, built by `.github/app-zip.sh`): it keeps every reference and every HyperFrames guide that plans a video, and leaves out `evals/`, the HyperFrames scripts, sounds, fonts and test files, and the `reverse-any-video` and `remotion-to-hyperframes` guides, which only run with the CLI on a PC. Claude Code still installs the full skill.
- Every push now checks that the app copy stays under 200 files.

## 2026-11-27, one skill for everything

mshmsh-video no longer needs any other video skill. Remove the separate ones if you have them (`npx skills remove <name> -g`); `node scripts/doctor.mjs` lists any still installed.

- **Remotion, built in.** `references/remotion/` (23 topic files and an index) covers Remotion itself: timing and transitions, effects, light leaks and colour, Kurdish and Arabic text animated by hand, fonts, images, GIFs and Lottie, sound, clips and cut-outs, captions, compositions and props forms, Studio editing, renders and transparent video, OpenTimelineIO exports for Resolve and Premiere, 2D maps and 3D flights, Elements and apps. Written for this skill in its own words (Remotion's skills have no licence to copy), from Remotion 4.0.547. Where Remotion's general advice and this pipeline differ, the index says which wins and why.
- **HyperFrames, built in.** Seven of HeyGen's skills ship in `hyperframes/` (Apache-2.0, credited, changes listed in `hyperframes/NOTICE.md`): the engine, its CLI, the registry of about 450 ready-made blocks, media-use, reverse-any-video (rebuild any video as an editable project), style-sampling (five proven explainer styles) and remotion-to-hyperframes. The CLI runs through the bundled launcher; tested on Windows 11 (HyperFrames 0.9.102).
- **Telemetry stays off.** The bundled guides no longer send usage events or feedback reports, and the documented commands keep `HYPERFRAMES_NO_TELEMETRY=1` set.
- **Screen recordings.** `references/screen-demo.md`, adapted from the `ui-demo` skill (MIT), records a real site or app with Playwright and places it in a device frame.
- `doctor.mjs` checks the bundled tools and warns about separately installed video skills. The repo check now covers `references/remotion/` and `hyperframes/`.

## 2026-11-20, safer render script

- On Windows, `scripts/render.mjs` no longer builds a cmd.exe command line. It runs npm's npx script with Node, so a file name or path can't be read as a shell command.
- `--name` and the composition id must be plain file names, so a render can't land outside `out/`.

## 2026-11-20, safer HeyGen install

- `references/music.md` now downloads the HeyGen CLI's install script, shows it, then runs it. Before, it piped the script straight into bash, which skipped the "read it first" step its own text asks for.
- The README shows the check status.

## 2026-11-20, works on its own

- The skill no longer points to another skill for anything. The checked list of Google fonts that have every Kurdish (Sorani) letter is now written out in `references/production.md`.

## 2026-11-19, renamed to mshmsh-video

The skill is now called **mshmsh-video** (it was video-xoshaka), and the repo is mshmsh03/mshmsh-video. GitHub sends the old repo links to the new one.

- Install with `npx skills add mshmsh03/mshmsh-video`, or upload `mshmsh-video.zip` in the Claude app. Then remove the old copy: `npx skills remove video-xoshaka -g` in Claude Code, or delete the video-xoshaka skill in the Claude app.
- The shared model cache is now `~/.cache/mshmsh-video/models` and the settings are `MSHMSH_VIDEO_MODELS` and `MSHMSH_VIDEO_ASSETS`. A cache and settings under the old name are still used, so nothing downloads twice.
- `setup-project.mjs --update` backs up into `.mshmsh-video-backup/`.
- The funny style is still called the xoshaka story.

## 2026-11-19, free tools for editing, animation and sound

The best free resources found for animation, voiceovers, editing and music (skills.sh and the web, checked 2026-11-19), all free for client work, added to the skill:

- **Your own recordings sound clean.** `clean-voice.mjs` takes background noise out of a recording or a clip's sound with DPDFNet (Apache-2.0, 10 MB, offline, 48 kHz). make-voice runs it on every `"recorded"` scene (`"clean": false` skips it). On a noisy test, DNSMOS went from 2.98 to 3.44 (the clean original: 3.48). This matters most for Sorani, where your own voice is the free route for client work.
- **Captions from your own clips.** `transcribe.mjs` turns speech into Remotion caption JSON with word times, offline: Parakeet (CC BY 4.0) for English, Whisper (MIT) for Arabic and other languages; neither knows Kurdish. make-voice uses it to time a recorded English take word by word against the script.
- **Pauses cut out of talking footage.** `cut-silence.mjs` writes the parts to keep, and the new `<CutClip>` plays them straight from the original; it also moves a transcript onto the cut.
- **Photo cut-outs.** `cutout.mjs` puts a photo's subject on a transparent background (rembg with IS-Net, Apache-2.0). It never uses rembg's default model, which is non-commercial.
- **Animated emoji.** `free-emoji.mjs` finds and downloads Google's 411 animated emoji (CC BY 4.0, credit Google), and the new `<Emoji>` pops one in like a sticker.
- **More music:** the free library grows from 16 to 44 public-domain tracks (graduation, lo-fi, corporate and tech, cinematic, mystery, news, sport, desert and world).
- **Recorded sound effects:** `free-sfx.mjs` has 25 interface sounds by Kenney (CC0). Where remotion.media is blocked, setup now uses them for the click, ding and XP error instead of making those in code.
- setup installs `sherpa-onnx-node` in every project (it runs the cleaner and the transcriber too) and `@remotion/animated-emoji`; `doctor.mjs` checks a recorded voice's files.
- Docs: toolbox.md has new "Editing tools" and "Animation resources" sections (Remotion's effect packages, free Lottie and icon sources) and the fourth skills pass; music.md covers ACE-Step 1.5 (MIT) for making an original track on your own PC. README lists the skills that work well with this one.
- The free-assets workflow now also tests the sound effects, an emoji download, the noise removal and the transcription on GitHub's machines, and attaches `sfx-preview.mp3` to the release.

## 2026-11-19, the free package

Everything free the skill uses now comes with it, and only what's free to use, client work included (some files ask for a credit; Supertonic has rules on use):

- **A free-assets release** in this repo holds every free model, voice and music track (`scripts/free-assets.json` lists them with licences and credits). The scripts download from it first, because GitHub stays reachable where other sites are blocked, and fall back to each file's original source. The free-assets workflow builds it from the original sources, tests every free voice from the copies, and attaches the samples (`samples-english.mp3`, `music-preview.mp3`).
- **A free music library** (`scripts/free-music.mjs`): 16 public-domain tracks from FreePD.com by mood, a numbered preview file to pick by ear, and `get` saves the track and prints its gain and offset. No credit needed.
- **Sound effects made in code** (`scripts/make-sfx.mjs`): setup uses them where remotion.media is blocked, under the same file names.
- Pocket TTS no longer offers the two demo clips that come inside its package (`bria`, `loona`): their licence isn't stated, so the copy on the release leaves them out.
- Sorani: no fully free voice exists yet (Vekol and the F5 voices are non-commercial), so Sorani still needs Gemini, the person's own recording, or F5 for personal videos.
- Fixed: make-voice crashed when a line had a number of 1000 or more (a year like 2026) while timing the words.

## 2026-11-19, ready for friends

So that anyone can install it from this repo and it works in the Claude app as well as in Claude Code:

- **Works in the Claude app's cloud workspace.** That workspace blocks some downloads, and three of them used to stop a video there. Now each falls back by itself: Kokoro voices run through Python with the model from GitHub (`kokoro-voice.py`) when kokoro-js can't download from Hugging Face; `stills.mjs` and `render.mjs` use an installed Chrome when Remotion can't download its browser (`find-browser.mjs`); `setup-project.mjs` saves the fonts into the project when Google Fonts can't be reached. All three were tested in that workspace.
- **A download link for the Claude app.** Every change to `main` rebuilds `video-xoshaka.zip` on the release called "latest" (`.github/workflows/release.yml`).
- **A check on every push and pull request** (`.github/workflows/check.yml`): every script parses, every JSON file is valid, and every script and reference file the docs name exists (`.github/check-skill.mjs`).
- README: installing in Claude Code or the Claude app, what works where, updating, and maintaining. To update in Claude Code, run the install command again: `npx skills update` alone skips skills installed for the whole computer (they need `-g`).
- The promo made with the skill was redone with Kokoro `af_heart` at speed 1.0 and a public-domain music track.

## 2026-11-18, more free voices

The test promo's voice (Kokoro `bm_george` at speed 1.1) didn't sound good, so the free voice options were researched again and the best ones that run on a laptop were added:

- New engines in `make-voice.mjs`, through the new `voice-engines.mjs`: **Supertonic 3** (`supertonic:F1`-`M5`, offline, very fast, 31 languages including Arabic, client work allowed under OpenRAIL-M), **Pocket TTS** (`pocket:<preset>` or `pocket:<recording>` to copy the person's own voice, offline, English, CC BY 4.0) and **Gemini TTS** (`gemini:<Voice>`, online, free tier with a key, over 100 languages including Arabic and Central Kurdish, delivery set by `"voiceStyle"`). Supertonic and Pocket run through `sherpa-onnx-node`; their models download once into a shared cache. Gemini was written from Google's docs and tested against a mock, since the build sandbox can't reach Google.
- `voice-samples.mjs` makes one numbered file (each voice says its number, all at the same loudness) and `list.txt` with what each voice may be used for. Groups: `kokoro`, `supertonic`, `pocket`, `pocket-demo`, `gemini`, `edge-ar`. A voice that can't run is skipped instead of stopping the rest. The default Kokoro set is the best-graded voices; `bm_george` (graded C) is out.
- `doctor.mjs` checks the new engines (package, model, key, a copied voice's file, Kurdish text sent to Supertonic) and prints the chosen voice's licence line.
- The interview asks whether the video is for a client, which rules out the non-commercial voices, and offers the person's own voice copied from one recording. SKILL.md no longer suggests `bm_george` at speed 1.1: samples at speed 1.0, picked by ear.
- toolbox.md: which voices to sample for English, Arabic and Sorani, a licence column, setup steps, ElevenLabs' free plan (non-commercial), Edge's December 2025 change, and the options checked but not wired in (Chatterbox, Habibi, Vekol, KittenTTS).
- `master-audio.mjs`: when reaching -14 LUFS would push the true peak over -1 dBTP, it now uses plain gain and a peak limiter instead of loudnorm's dynamic mode, which had squashed the voice. The limiter runs at 4x the sample rate (a bright music bed had come out at +0.7 dBTP; now -1.8), and if the encoded result is still over the target, the ceiling comes down and it encodes again.

## 2026-11-18, after an end-to-end test

A real 33 s promo (16:9, Kokoro bm_george, captions, music bed, two review passes) was made with the skill, and every rough spot was fixed:

- `setup-project.mjs` works in the folder that already holds `brief.md`, `design.md` and `STORYBOARD.md` (it refused any non-empty folder, though the skill writes those first).
- `setup-project.mjs` writes `theme.ts` from `design.md`'s palette and fonts. It used to write the template's look into every project, and that look is on the skill's own banned list. `--local-fonts` downloads the font files from Google's repository on GitHub, so renders work offline.
- New `sync-story.mjs`: `STORYBOARD.md` becomes `story.json` (no more copying lines by hand); `--seconds` writes the real scene lengths back. Setup uses it, so the storyboard plays as an animatic right away.
- New `pronounce.mjs`: shows how the Kokoro voice will say each name. It caught "xoshaka" read as zuh-SHAH-kuh.
- `make-voice.mjs`: `"voice": "recorded"` for the person's own recording or a downloaded voice (offered in the interview, but there was no way to use it). Fixed: a `.wav` source overwrote itself while decoding.
- `review-check.mjs`: flags scenes that are empty or leave small things floating in empty space, at each scene's start and middle (caught every too-small scene in the test).
- Template: caption words never break at a hyphen; `EndCard` gets `ctaMono` for install commands and handles, and a bigger name when there's no logo; terminal lines can start already typed.
- `npm i kokoro-js` on Linux/WSL: skips onnxruntime's CUDA download, which fails.

## 2026-11-18

**New scripts**
- `setup-project.mjs`: the whole project in one command (Remotion, packages, template, scripts, size and safe zones, a font with the Sorani letters, a brand kit's colours, fonts and logo, sound effects, draft timings). `--update` upgrades an older project's components with a backup and never touches its per-video files.
- `doctor.mjs`: checks the machine and the project before a build (ffmpeg filters, voice engine, HeyGen, mixed Remotion versions, stale `voice.json`, missing files, HEVC/HDR phone clips).
- `review-check.mjs`: the measurable review checks in one pass, on the script, the code and the rendered file (empty first frame, black and frozen stretches, silence, loudness, true peak).
- `render.mjs`: versioned renders that never overwrite a file, `--draft` at half size, review-check on the result.
- `master-audio.mjs`: two-pass loudness to -14 LUFS, true peak under -1 dBTP, picture copied.

**Faster and safer**
- `make-voice.mjs --draft`: timings with no voice, so the preview runs while the voice is picked. Unchanged scenes are reused instead of spoken again; `--fresh` re-speaks all. Hard cuts (`"enter": "cut"`) get no overlap.
- `stills.mjs` renders every frame in one browser, three at a time (about 4 times faster), and handles hard cuts.

**Template**
- The timeline builds itself from `story.json`: order, transitions (`enter`), music bed, ducking, silences (`silence`), whooshes. Scenes go in `scenes.tsx`; a scene not built yet plays as a placeholder with its `board` line and real captions, so the video previews as an animatic from the script gate.
- `layout.ts`: positions and safe zones for 9:16, 16:9, 1:1 and 4:5, per platform (Reels, WhatsApp, landscape, feed).
- New components: `Title` (several entrances, safe for Kurdish), `EndCard`, `PhotoFill` (slow push or the reaction slam), `Cursor`, `Stamp`, `ShotVideo`, `Sfx` (skips a missing sound instead of failing the render), more moves in `motion.ts`.
- Kurdish and Arabic: chapter labels, stamps and titles drop letter-spacing and uppercase on right-to-left text (they broke the joined letters).

**References**
- New `updates.md`: coming back to a video (fixes, shorter cuts, other formats, other languages, monthly offers) and brand kits for repeat clients.
- Removed links to `assets/examples/`, which was never published; the gag table points at shipped components.
- New pitfalls: renders need Google Fonts online; a scene without `Narration` is silent.

**Tests**
- `evals/`: four test cases (a Sorani tribute, a "just make it" promo, a 15-second re-cut, a reused brand kit) in the layout `claude plugin eval` reads.
