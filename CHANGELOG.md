# Changelog

## 2026-11-19, ready for friends

So that anyone can install it from this repo and it works in the Claude app as well as in Claude Code:

- **Works in the Claude app's cloud workspace.** That workspace blocks some downloads, and three of them used to stop a video there. Now each falls back by itself: Kokoro voices run through Python with the model from GitHub (`kokoro-voice.py`) when kokoro-js can't download from Hugging Face; `stills.mjs` and `render.mjs` use an installed Chrome when Remotion can't download its browser (`find-browser.mjs`); `setup-project.mjs` saves the fonts into the project when Google Fonts can't be reached. All three were tested in that workspace.
- **A download link for the Claude app.** Every change to `main` rebuilds `video-xoshaka.zip` on the release called "latest" (`.github/workflows/release.yml`).
- **A check on every push and pull request** (`.github/workflows/check.yml`): every script parses, every JSON file is valid, and every script and reference file the docs name exists (`.github/check-skill.mjs`).
- README: installing in Claude Code or the Claude app, what works where, updating, and maintaining.
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
