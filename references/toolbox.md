# Toolbox

Everything this workflow uses, and when to reach for it. Everything a video needs is inside this skill: its own references and scripts, a Remotion reference (`references/remotion/`) and HeyGen's HyperFrames guides (`hyperframes/`). No other video skill is needed, and a separate copy of one competes for the same requests (`scripts/doctor.mjs` warns). On Windows, `wsl -l -v` shows whether WSL exists.

## Contents
- Remotion
- HyperFrames (a second engine and file tools)
- media-use (logos, icons, images, voice, grades)
- Voice: Kokoro, Edge TTS, Sorani Kurdish (F5), HeyGen, ElevenLabs, their own recording
- Music and sound effects
- Editing tools: noise removal, transcription, pause cutting, cut-outs, auto-editor
- Animation resources: animated emoji, Remotion's effect packages, Lottie, icons
- Screenshots, screen recordings, images and brand assets
- Verification tools
- This skill's own scripts and template
- Claude Code helpers

## Remotion

The default engine. This skill decides what to make; `references/remotion/` covers Remotion itself: its index (`INDEX.md`) says which file to open, and where Remotion's general advice and this pipeline differ, the pipeline wins. Written for this skill from Remotion's public guidance as of 4.0.547, in its own words.

| Need | File |
| --- | --- |
| A project by hand, Studio flags, upgrading, current docs, the licence | `remotion/setup-and-upkeep.md` |
| Moving values, eases, springs, timing props, sequences, transitions, motion blur | `remotion/animation-*.md` |
| Effects, light leaks, colour grading, 3D | `remotion/look-effects.md`, `look-color.md`, `3d.md` |
| Kurdish and Arabic text by hand, highlights, fitting text, fonts | `remotion/text-rtl.md`, `text-layout.md`, `fonts.md` |
| Images, GIFs, Lottie; sound; clips; captions; media durations | `remotion/images-gifs-lottie.md`, `audio.md`, `video-clips.md`, `captions.md`, `media-info.md` |
| Formats, props forms, Studio-editable compositions | `remotion/project-compositions.md`, `interactivity.md` |
| Unusual renders, transparent video, an editor timeline (OpenTimelineIO) | `remotion/render.md` |
| Maps, 3D flights | `remotion/maps.md`, `maps-3d.md` |
| Ready-made Elements, a video inside an app | `remotion/elements.md`, `apps.md` |

Remotion packages this skill's template uses: `@remotion/transitions` (fades and slides in a `TransitionSeries`), `@remotion/google-fonts`, `@remotion/media` (the `Audio` component), `@remotion/captions`, `@remotion/animated-emoji` (`<Emoji>`). Sound effects come from remotion.media as `.wav` files (`whoosh`, `mouse-click`, `record-scratch`, `vine-boom`, `windows-xp-error`, `ding`); the full list is in `remotion/audio.md`.

Preview first: run `npx remotion studio` (add `--no-open` if the agent client has an in-app browser, then open the printed URL and confirm the composition loads). Visit one composition at `/<composition-id>`.

## HyperFrames (a second engine and file tools)

HeyGen's guides ship in this skill's `hyperframes/` folder (Apache-2.0, copyright HeyGen; changes listed in `hyperframes/NOTICE.md`). Full notes in hyperframes.md. In short:

- **As an engine:** HTML and GSAP rendered to video, with a Studio and a desktop app where the person can keep editing without code. Remotion stays the default; build in HyperFrames when the person asks, wants to edit the video themselves afterwards, or the video is mostly a captured website or a ready-made block (`hyperframes/hyperframes-registry/`, about 450).
- **As file tools inside a Remotion video:** `hf beats` (tempo and beat times), `hf audio` (a track's sections, loudness and true peak; a sound effect's peak; a render's loudness), `hf capture` (a website's screenshots, colours, fonts, logos and words), `hf transcribe` (word timings for the person's own recording) and `hf remove-background` (a cut-out of the person). `hf` means the bundled launcher, `node "<this skill>/hyperframes/hyperframes/scripts/plugin-cli.mjs"`, run with `HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1` (hyperframes.md, "Setup and telemetry").
- **More from HeyGen:** rebuild any video as an editable project (`reverse-any-video/`), an episode in a proven explainer style (`style-sampling/`), and a Remotion video turned into an editable HyperFrames one (`remotion-to-hyperframes/`).
- **Telemetry** stays off: this skill never sends usage events or feedback reports.
- **Their craft rules** (storylines, numbers instead of adjectives, the banned defaults, motion, sound, captions, review) are folded into this skill's references: story-and-comedy.md, storyboard-and-gates.md, motion.md, music.md, styles.md and review.md.

## media-use (logos, icons, images, voice, grades)

HeyGen's media guide, bundled at `hyperframes/media-use/` (read its `GUIDE.md`). One main verb, `resolve`, finds or generates a media file and records it in a ledger so it can be reused. Run it through the launcher from the project folder:

```bash
hf media-use resolve --type <type> --intent "<description>" --project <dir>
```

| Type | What it gives |
| --- | --- |
| `bgm` | Background music from the HeyGen catalog (10k+ tracks), through the `heygen` CLI |
| `sfx` | Sound effects: a bundled library of 19 files, plus the catalog through the `heygen` CLI |
| `image` | Photos and backgrounds (HeyGen asset search) |
| `icon` | Icons and symbols, transparent |
| `logo` | Official brand marks (theSVG, then the GitHub avatar, then a favicon). Never redraw a brand's logo. |
| `voice` | TTS voiceover (HeyGen free-usage path; optional local Kokoro) |
| `grade` | A measured colour-correction candidate for footage |
| `lut` | A user-provided or explicitly chosen `.cube` file |

Also in it: `--candidates` to list reusable assets before resolving fresh, `--doctor` to check setup, an audio engine (voiceover, transcription, captions, background removal), operations on media (cut, reframe, transform), media treatments for footage that looks dark, flat or boring or should look retro, camcorder or print-like, and a rule for being proactive: scan once for signals (on-screen text with no voiceover, emoji used as icons, placeholder images, hard cuts with no sound, a piece over 10 s with no music, footage that is under- or over-exposed), then ask once and propose specific fixes instead of silently adding things. Read only the reference file the task needs (`hyperframes/media-use/references/resolve.md`, `grading.md`, `audio.md`, `operations.md`, `media-treatments.md`, `setup-providers.md`, `memory.md`).

Rules that matter here:
- If the environment variable `HEYGEN_API_BASE` is set, a host app pays for HeyGen. Don't ask the person to install or sign in to the `heygen` CLI; HeyGen calls go through the host. If a call is refused, tell the person the host's message as written and stop.
- Otherwise, to use HeyGen media (catalog search, TTS, avatar video), install and sign in to the `heygen` CLI, then check with `hf media-use resolve --doctor`.
- Before generating a voiceover or an avatar video, tell the person that signing in with `heygen auth login --oauth` gives a free allowance for TTS and avatar videos, while an API key bills API credits.
- If the host app has its own music or sound-effect tools, use those first. `resolve --type bgm|sfx` needs the `heygen` CLI.
- Colour grading: don't generate a `.cube` LUT just to encode exposure or warmth, and don't fake supported effects with CSS or SVG overlays.
- Its transcription, transcript-cut and ducking scripts report usage to PostHog unless telemetry is off; keep `HYPERFRAMES_NO_TELEMETRY=1` set.

Avoid skills like `*/superpowers@ai-video-generation` and `prime-skills/*`: they show huge install counts from repos with a handful of stars.

## Voice

What to put in the samples (checked 2026-11-18). The person always picks by ear from `voice-samples.mjs`'s numbered file; this only decides which voices go in it:
- **English:** `kokoro`, `supertonic` and `pocket`, plus `gemini` when they have a key. Kokoro's best voices are female (`af_heart` is graded A, `af_bella` A-); its male voices grade C+ at best, so for a male narrator the other engines often sound better.
- **Arabic:** `supertonic` (offline) and `edge-ar` (personal videos), plus `gemini`.
- **Sorani Kurdish:** `gemini` (online), the F5 voices (offline, non-commercial) and the person's own recording.
- **Client or paid work:** only the voices whose line in `list.txt` allows it.

| Source | Cost and licence | Notes |
| --- | --- | --- |
| Kokoro (`kokoro-js` 1.2.1) | Free, offline after a ~330 MB download; Apache-2.0, fine for client work | Where kokoro-js can't download its model from Hugging Face (the Claude app's cloud workspace), the voice scripts run the same model through Python by themselves (`kokoro-voice.py`, model from GitHub; needs `python -m pip install kokoro-onnx soundfile`). `--voices kokoro` samples `af_heart`, `af_bella`, `bf_emma`, `am_michael` and `am_fenrir`. make-voice writes one WAV per scene plus `voice.json` (scene lengths in frames, word timings); every scene is normalized to -20 dBFS RMS with the silence trimmed. `pronounce.mjs` shows how it will say names. |
| Supertonic 3 (`supertonic:F1` to `F5`, `M1` to `M5`) | Free, offline; weights under OpenRAIL-M: client work allowed, but no imitating real people, and say it's an AI voice | Ten voices, 31 languages including Arabic (no Kurdish), 44.1 kHz, and the fastest here: eight scenes in 12 s on a 2-core machine. `speed` works. The language comes from `"lang"` in `story.json` (`en`, `ar`, `fr`...) or from the script of the line. Runs through `sherpa-onnx-node`; the 139 MB model downloads once. Its maker, Supertone, closed in 2026 and archived the project, so the model won't change. |
| Pocket TTS (`pocket:<voice>`) | Free, offline; model CC BY 4.0 (credit Kyutai); presets `bill_boerst`, `caro_davy`, `peter_yearsley`, `stuart_bell` CC0, `alba` CC BY 4.0 | English. Copies a voice from a clean 10 to 20 s recording: `pocket:voice/me.wav`. Only the person's own voice, or one they have permission to use: Kyutai's terms forbid copying a voice without consent. It ignores `speed`, and each run is a slightly different take (make-voice keeps the scenes it already spoke). Runs through `sherpa-onnx-node`; the 98 MB model downloads once, a preset voice on first use. |
| Gemini TTS (`gemini:<Voice>`) | Free tier with a Google AI Studio key. Google doesn't claim the audio, but on the free tier it may use and have people review the text, so no confidential scripts | 30 voices (`Kore` firm, `Charon` informative, `Puck` upbeat, `Sulafat` warm...), over 100 languages detected automatically, including Arabic and Central Kurdish. `"voiceStyle"` in `story.json` sets the delivery ("warm and unhurried"); there is no speed setting, so `speed` becomes a pace hint. Default model `gemini-3.1-flash-tts-preview` (free of charge on Google's pricing page, 2026-11-18); `"voiceModel"` picks another. **Written from Google's docs and tested against a mock of the API, not against Google itself** (the sandbox it was built in can't reach it): sample it before promising it. Free-tier rate limits are low; make-voice waits and retries. |
| Edge TTS (`edge-tts`, Python) | Free, online, no key; personal videos only | Microsoft's neural voices in many languages, including Iraqi Arabic (`ar-IQ-RanaNeural`, `ar-IQ-BasselNeural`), Saudi, Egyptian and Persian. No Kurdish voice. The same two scripts handle it, with measured word timings (below). Browser-based clients stopped working in December 2025 when Microsoft added a header check; the Python package kept being updated, so if it fails, update it first (`python -m pip install -U edge-tts`). It is the Edge browser's read-aloud service, not a licensed API: for client or paid work use the same voices through Azure AI Speech, or Supertonic or Gemini. |
| F5-TTS Central Kurdish (`aranemini/central-kurdish-tts`) | Free, offline; **CC BY-NC-ND 4.0, non-commercial only** | Sorani Kurdish: three single-speaker voices (studio male, audiobook male, audiobook female), 24 kHz, the best free Sorani voice found (2026-10-25). Slow on a CPU, about 40 times real time. Steps under "Sorani voices" below. |
| MMS Sorani (`razhan/mms-tts-ckb`) | Free, offline; Meta's MMS base is non-commercial | Flat and robotic, but it speaks a scene in seconds: a stand-in voice for building and timing while F5 runs. |
| kurdishtts.com | Paid (about $12/month for public use; the free plan is evaluation only) | Many Sorani and Kurmanji voices with word timings. Needs the person's own account and API key. Not tested here. |
| The person's own recording | Free, any use | Best for tributes, and the free route for client work in Sorani. One take per scene, saved as `out/voice-raw/<scene id>.wav` (or .m4a, .mp3: a phone recording is fine), with `"voice": "recorded"` in `story.json`. make-voice takes the background noise out first (`clean-voice.mjs`, kept in `out/voice-clean/`; `"clean": false` skips it), trims and levels it, and times English lines word by word from a transcript (`transcribe.mjs`, Parakeet; `"transcribe": false` skips it). Other languages, and a take that strays from the script, are timed from the pauses. The same path takes audio downloaded from ElevenLabs or HeyGen. For English, Pocket TTS can copy their voice from one short recording instead (above). |
| HeyGen TTS | Free allowance with OAuth sign-in | Through `media-use resolve --type voice`. |
| ElevenLabs | Free plan: 10,000 credits a month (about 10 minutes), non-commercial and credit required; commercial use from the paid Starter plan | Download one file per scene and use `"recorded"`. Offer it, don't assume it. |

Edge voices (end-to-end tested 2026-10-21 with Iraqi Arabic, including a render):
1. Install once: `python -m pip install edge-tts` (set `PYTHON` if the command isn't `python` on Windows or `python3` elsewhere). `kokoro-js` isn't needed for Edge.
2. Samples to pick by ear: `node scripts/voice-samples.mjs "<a line in the video's language>" --voices ar-IQ-RanaNeural,ar-IQ-BasselNeural,ar-SA-ZariyahNeural,ar-SA-HamedNeural,ar-EG-SalmaNeural,ar-EG-ShakirNeural`. They land in `out/voice-samples/` as MP3s. `python -m edge_tts --list-voices` lists the rest.
3. Put the chosen name in `story.json`'s `voice` and run `node scripts/make-voice.mjs` as usual. It sees an Edge name (`xx-XX-…Neural`) and calls `scripts/edge-voice.py`; `speed` 1.1 becomes Edge's rate `+10%`. It writes the same WAVs and `voice.json` as the Kokoro path, keeps Edge's own MP3s in `out/voice-edge/`, and decodes them with `ffmpeg` (or `npx remotion ffmpeg`).

Each scene's line reads "x/y words timed by Edge". Edge leaves punctuation out of its words, so they are matched back to the script's own words, and a word after a pause starts where the sound comes back: Edge puts it 120 to 160 ms early, inside the silence. If the line reads "breaks" instead, `say` and `text` differ in word count and the times were estimated the Kokoro way; keep `say` to the same word count (`"say": "… كلود …"` for a shown "Claude" works) to keep measured times.

Pocket and Supertonic (tested 2026-11-18 on Linux: samples, make-voice on an eight-scene story, the model download, and a Whisper transcript of every sample to check it's intelligible):
1. `setup-project.mjs` installs `sherpa-onnx-node` in every project (it also runs the recording cleaner and the transcriber; `--no-sherpa` skips it). In an older project: `npm i -D sherpa-onnx-node@2.0.1`.
2. Samples: `node scripts/voice-samples.mjs "<line>" --voices supertonic,pocket`. The first run downloads each model from sherpa-onnx's GitHub releases (with curl and tar, both built into Windows 10 and later) into `~/.cache/mshmsh-video/models`, shared by every project (a cache from the skill's old name, `~/.cache/video-xoshaka/models`, is still used); `MSHMSH_VIDEO_MODELS` moves it.
3. Put the chosen name in `story.json`'s `voice` and run make-voice as usual. `doctor.mjs` checks the package, the model, a copied voice's file, and Kurdish text sent to Supertonic.

Gemini:
1. The person makes a free key at https://aistudio.google.com/apikey (a Google account, 18 or older).
2. They set it in the terminal that runs the scripts: `$env:GEMINI_API_KEY="..."` in PowerShell, `export GEMINI_API_KEY=...` in Git Bash. Never write it into a project file.
3. `voice-samples.mjs "<line>" --voices gemini`, then `"voice": "gemini:Charon"` (and, if wanted, `"voiceStyle"`).

Not wired in (checked 2026-11-18); each can still be used by saving one file per scene and setting `"recorded"`:
- **Chatterbox** (Resemble AI, MIT): expressive English (Turbo, with tags like `[laugh]`) and a 23-language model that includes Arabic. PyTorch, slow on a CPU, and it adds an inaudible watermark.
- **Habibi** (Arabic dialects, built on F5): its Iraqi, MSA, Egyptian, Algerian and Moroccan models are Apache-2.0 (client work allowed); the unified, Saudi and Emirati ones are CC BY-NC-SA. It copies a voice from a reference clip and its transcript, slowly on a CPU, like F5.
- **Vekol** (Sorani, by Revge): one voice, fast on a CPU, but CC BY-NC 4.0 (non-commercial), so it isn't included: the skill only ships resources free for any use.
- **KittenTTS**: a tiny English model; sherpa-onnx 2.0 needs an outside phonemizer for it, and Kokoro sounds better.

### Sorani voices

End-to-end tested on 2026-10-25 with a 90 s Sorani explainer, including a render, on Windows with an Intel laptop CPU (no GPU) and 16 GB of RAM. Offer these alongside the person's own recording. For Kurmanji, no free voice has been tested; check HeyGen's and ElevenLabs' current language lists before offering either.

**Try Gemini first** when the person has a key: it lists Central Kurdish, speaks a scene in seconds, and its audio isn't limited to non-commercial use. It hasn't been tested on Sorani here, so make the samples and let the person judge the pronunciation; the F5 steps below remain the offline choice.

1. **Samples to pick by ear, without the big download.** The model repo has a demo per voice: `curl -sSLo out/voice-samples/f5-<voice>.wav https://huggingface.co/aranemini/central-kurdish-tts/resolve/main/output-<voice>.wav` for `studio-male`, `audiobook-male` and `audiobook-female`. Its demo Spaces on Hugging Face were paused when tested, so don't count on them.
2. **Install once**, in the project's `tts/` folder (on macOS and Linux the venv's Python is `tts/.venv/bin/python`):
   ```bash
   python -m venv tts/.venv
   tts/.venv/Scripts/python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
   tts/.venv/Scripts/python -m pip install f5-tts asosoft soundfile transformers
   ```
   Install the CPU build of torch first, or `f5-tts` pulls a CUDA build of several GB.
3. **Model files.** Copy `scripts/sorani/fetch_ema.py` and `scripts/sorani/speak_story.py` into the project's `tts/`. From `https://huggingface.co/aranemini/central-kurdish-tts/resolve/main/`, download `F5TTS_v1_Base.yaml`, `vocab.txt`, `prompt-<voice>.wav` and `prompt-<voice>.txt` into `tts/f5-repo/`. Each voice's checkpoint (`model-<voice>.pt`) is 5.4 GB, mostly training state. `fetch_ema.py` downloads only the 1.35 GB of EMA weights that speaking needs, using HTTP range requests, six streams at once, resuming after dropped connections:
   ```bash
   tts/.venv/Scripts/python -I tts/fetch_ema.py https://huggingface.co/aranemini/central-kurdish-tts/resolve/main/model-studio-male.pt tts/f5-repo/studio-male-ema.pt
   ```
   It reads the checkpoint's layout with an allow-list unpickler (tensors and `OrderedDict` only), so a tampered file can't run code. `--list` prints the layout without downloading.
4. **Narrate.** Set `story.json`'s `voice` to `"f5:<voice>"` (for example `"f5:studio-male"`). Speak the first scene alone with `tts/.venv/Scripts/python -I tts/speak_story.py --only <first scene id>` and let the person hear it. Then run the rest as a detached process, not as a background shell: Claude Code stops its own background shells when memory runs low, which once killed a run before it started. On Windows: `Start-Process -FilePath tts\.venv\Scripts\python.exe -ArgumentList '-u','tts\speak_story.py','--out','out\voice-raw-f5' -WindowStyle Hidden -RedirectStandardOutput tts\run.log -RedirectStandardError tts\run.err -PassThru`, then wait with a light loop that only reads the log (`until grep -q "^<last scene id>: [0-9]" tts/run.log; do sleep 60; done`). If that loop is stopped too, the narration keeps going; check the log again later. It writes `out/voice-raw/<id>.flac`; `--out` writes somewhere else, so a long run doesn't overwrite the stand-in voice the preview is using. Text goes through AsoSoft's normalizer and Kurdish G2P first, as in the model's own `infer.py`.
5. **Time and normalize** with `node scripts/make-voice.mjs` as usual. For an `f5:` voice it reads `out/voice-raw/<id>.flac` instead of speaking, then trims, normalizes and estimates word times from the pauses, the way it does for Kokoro.
6. **Correcting a few lines later** (a fact turned out wrong after delivery): copy the raw folder to a new one (`out/voice-raw-v4/`), re-speak only the changed scenes into it with `speak_story.py --only hook,attacks,fix --out out/voice-raw-v4`, then run `make-voice.mjs --raw out/voice-raw-v4`. The other scenes are rebuilt from their old files unchanged, so three scenes take about 20 minutes instead of an hour, and the old version stays intact to compare.

**Writing `say` for F5.** The G2P reads only Kurdish letters. Write Latin names the way they sound, in Sorani letters (`PHP` becomes «پی ئێچ پی», `PHP2Shell` becomes «پی ئێچ پی تو شێڵ»), and write numbers as words (٢٢ becomes «بیست و دوو», 8.1 becomes «هەشت خاڵ یەک»). Keep `text` as written, for the captions. The word timer counts each caption word as what `say` speaks in its place, so these swaps don't make the visuals land early.

Keep the lines short and plain: one idea per sentence, few commas, and as few spelled-out Latin terms as the meaning allows (explain "use-after-free" in Kurdish rather than spelling it «یووز ئافتەر فری»). F5 gives a line its length from the letter count, not from how a person would phrase it, so long formal sentences full of transliterated English come out sounding read rather than spoken; the person heard exactly that. Scenes of 5 to 9 s worked best; split a longer one into two scenes.

**Time and stand-in.** At 32 sampling steps (`--nfe`), a 10 s scene took 6 to 7 minutes on the laptop CPU, so a 90 s video takes about an hour. While it runs, build and time the scenes with the MMS stand-in (`speak_story.py --engine mms`, seconds per scene; leave `voice` as `"f5:…"`, since make-voice only checks the prefix), then swap in the F5 files and run make-voice again. F5 sets a line's length from the reference prompt's pace, and `speed` in `story.json` scales it.

Those times were with the PC otherwise idle. With other apps open (several Claude Code windows, Discord, VS Code, a Remotion Studio) and about 1 GB of RAM free, a scene took 15 to 20 minutes, and rendering stills at the same time slowed it further. Before a long run, ask the person to close what they don't need, keep the Studio and still renders off until it finishes, and raise its priority (`(Get-Process -Id <pid>).PriorityClass = 'High'`; the venv launcher starts a second `python.exe`, so pick the one using gigabytes of memory).

**Licence.** The F5 Central Kurdish models are CC BY-NC-ND 4.0. That is fine for a personal post, but not for client work, paid work or a monetised channel. Note it in `brief.md` and the delivery message.

The person picks the voice by ear from samples, never from their name or a guess about gender.

## Music and sound effects

Full setup is in music.md. The short version: start with the free library (`scripts/free-music.mjs`, 44 public-domain tracks, any use), then the HeyGen catalog (`media-use` or `scripts/heygen-music.mjs`) for more choice, ElevenLabs Music (`elevenlabs/skills@music`, paid), or a track the person supplies (fine for WhatsApp; copyrighted songs get muted or blocked on Instagram, TikTok and YouTube). Don't write music in code and call it done: it sounds cheap. Sound effects: remotion.media files, the 25 recorded Kenney sounds (`scripts/free-sfx.mjs`, CC0), or `media-use resolve --type sfx`. For an original track, ACE-Step 1.5 (MIT) makes one on the person's own PC (music.md, "Making an original track").

## Editing tools

All free for client work, offline after a one-time download, and hosted on GitHub so they also work in the Claude app's cloud workspace. Tested 2026-11-19 on Linux (the numbers below are from those tests); not yet on Windows or a Mac.

| Job | Command | Notes |
| --- | --- | --- |
| Take the noise out of a recording or a clip | `node scripts/clean-voice.mjs <file or folder> [--keep 18]` | DPDFNet (Ceva, Apache-2.0), 10 MB, through `sherpa-onnx-node` at 48 kHz. On a test with pink noise and mains hum under a voice, DNSMOS rated it 2.98 noisy, 3.44 cleaned, 3.48 for the clean original (ffmpeg's RNNoise filter: 3.21). About 4 s for 10 s of audio. A video keeps its picture and gets the cleaned sound (`<name>-clean.mp4`). `--keep <dB>` leaves some room tone. It can't fix a distant, clipped or talked-over voice: ask for a new take. make-voice runs it on every `"recorded"` scene. |
| Captions from the person's own clip or recording | `node scripts/transcribe.mjs <file> [--lang en] [--srt]` | English: NVIDIA Parakeet TDT 0.6B v2 (CC BY 4.0), 480 MB once, with a measured time for every word; 70 s of speech in 12 s. Other languages: Whisper large-v3-turbo (MIT), 560 MB once, phrase times spread over the words; it transcribed an Arabic test line exactly. Neither knows Kurdish. The speech is cut at pauses first (Silero VAD, MIT), which kept Parakeet from dropping a sentence after a long pause. Writes Remotion's `Caption` JSON to `public/captions/<name>.json`, the shape `@remotion/captions` takes (`remotion/captions.md` shows how to display it). Read it before using it: names come out as heard. |
| Cut the pauses out of talking footage | `node scripts/cut-silence.mjs <clip> [--pause 0.5] [--margin 0.15] [--captions public/captions/<name>.json] [--render]` | Measures the clip's speech level and cuts silences longer than `--pause`, keeping `--margin` of air. Writes `<clip>.cuts.json`; `<CutClip cuts={cuts} />` plays the parts straight from the original (a one-frame sound fade at each cut), and `cutLength(cuts, fps)` is the scene's length. `--captions` moves a transcript of the original onto the cut, so transcribe once, then cut as often as you like. `--render` writes `<clip>-cut.mp4` too. A 15.5 s test clip became 9.2 s and still transcribed word for word. It can't tell a dramatic pause from a dead one: watch it. |
| A cut-out of a photo's subject | `node scripts/cutout.mjs <photo or folder> [--crop] [--model u2net]` | rembg (MIT) with IS-Net (Apache-2.0, 180 MB once, about 2 GB of memory); needs `python -m pip install "rembg[cpu,cli]"`. Writes `<name>-cutout.png`. rembg's own default model (BRIA) is non-commercial, so the script always names a free one. The BiRefNet models have finer hair edges but ran out of memory on an 8 GB machine. For a moving person in a clip, `hf remove-background` (hyperframes.md). |
| Editor timelines, motion-based cuts, speed-ups | auto-editor (public domain, about 5k stars) | Cuts by loudness, motion or black frames, speeds up quiet parts, and exports to DaVinci Resolve, Premiere, Final Cut Pro, Shotcut and Kdenlive: the tool for a person who wants to keep editing in their own editor. One self-contained program from its GitHub releases (`auto-editor-windows-x86_64.exe`, `-macos-arm64`, `-linux-x86_64`). Its docs are on its GitHub page. Not wired in or tested here. |

A talking-head video with these: `clean-voice.mjs public/photos/me.mp4` → `transcribe.mjs public/photos/me-clean.mp4` → `cut-silence.mjs public/photos/me-clean.mp4 --captions public/captions/me-clean.json` → a scene with `<CutClip>` and the captions from `me-clean-cut.json`.

## Animation resources

Free for client work unless the line says otherwise. Check what the person's brand and `design.md` allow before adding any of them: one emoji that lands on its word beats ten.

- **Animated emoji:** Google's Noto Emoji Animation, 411 of them (faces, hands, hearts, party, fire, animals, food, weather), CC BY 4.0: credit "Animated emoji by Google" in the description or end card. `node scripts/free-emoji.mjs <words>` finds them (it knows feelings: "laugh", "love", "wow", "nervous", "graduation"), `get <names>` saves transparent videos to `public/emoji/` from `remotion-dev/animated-emoji` on GitHub, and `<Emoji name="fire" at={1.2} size={240} />` pops one in like a sticker, with `sfx/pop.wav` (setup gets it). Rendered and checked 2026-11-19: transparent over a busy background.
- **Remotion's own effect packages** (same licence as Remotion; add with `npx remotion add <package>`): film light leaks for a warm transition and starburst rays behind a reveal (`@remotion/light-leaks` and `@remotion/starburst`, now also as effects in `@remotion/effects`, which the docs describe), `@remotion/noise` (noise functions for organic drift), motion blur (now the transition `motionBlur` prop and `<HtmlInCanvasMotionBlur>`, `remotion/animation-motion-blur.md`; older projects use `@remotion/motion-blur`'s `<CameraMotionBlur>` and `<Trail>`), `@remotion/shapes` and `@remotion/paths` (drawn lines and shapes, `evolvePath` for a line that draws itself), `@remotion/lottie` (After Effects animations as JSON), `@remotion/three` (3D). Their APIs change between versions: check each in the current docs before using it (`remotion/setup-and-upkeep.md`, "Looking up the docs").
- **Lottie animations:** LottieFiles' free public animations are under the Lottie Simple License, which allows commercial use without credit (crediting the creator is encouraged); download the JSON and play it with `@remotion/lottie`. useAnimations (MIT) has 300 animated icons as Lottie JSON. Lordicon's free tier needs a credit link, and Icons8's free files need a link too: skip both unless the person accepts that.
- **Icons:** Lucide (ISC, `npm i lucide-react`), Tabler Icons and Phosphor (both MIT): SVG, so a stroke can draw on with `@remotion/paths`. Brand logos still come from the brand, never an icon set (toolbox above, `media-use resolve --type logo`).

The HeyGen CLI is Linux and macOS only. On Windows, install it inside WSL and run it through `wsl`; the OAuth sign-in trick (run the login in the background with `BROWSER=echo`, read the printed URL, open it on Windows) is in music.md.

## Screenshots, screen recordings, images and brand assets

- **Live sites:** headless Chrome with its own profile (`--user-data-dir`), `--window-size=1440,900` for desktop and `390,844` for phone, `--virtual-time-budget=8000` so the page has loaded. Take a phone shot of every site shown on a laptop.
- **Screen recordings of a real flow** (clicks, typing, a menu opening): screen-demo.md (adapted from the `ui-demo` skill by affaan-m, MIT). It drives Playwright through discover, rehearse and record, with a visible cursor and natural pacing, and skips a burned-in subtitle bar because this skill's captions carry the words. Set both `viewport` and `recordVideo.size` to `1440x900` for the laptop or `390x844` for the phone (without `size`, Playwright scales the video down to fit 800x800). Convert the WebM to a constant-rate MP4 before using it: `ffmpeg -i demo.webm -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart public/rec/demo.mp4`, then play it inside the device frame with `ShotVideo` (`Devices.tsx`). Look at one frame at full size first: if the text is soft, use screenshots. For a plain scroll down a page, a tall screenshot (`--window-size=1440,4000`) panned in Remotion is sharper than a recording. Needs `npm i -D playwright` and `npx playwright install chromium` in the project.
- **Apps:** look for `docs/screenshots/` or golden test images (`test/**/goldens/*.png`) in the repos first.
- **Read every image before using it:** check for private data, empty areas and that it is the right page.
- **Logos, icons, stock images:** `media-use resolve --type logo|icon|image`.
- **Photos and clips:** the person's own, found by base name in `public/photos/`. Check several frames of each clip.

## Verification tools

- **Stills:** `scripts/stills.mjs` bundles once and renders frames by number, by scene end (`end:<scene>`) or by word (`<word>@<scene>+<seconds>`) to `out/stills/`. Don't use `remotion render --frames` for this: it fails with `EINVAL` once the composition has scene audio.
- **Audio:** `scripts/check-audio.mjs` measures speech against the music bed, clipping, and spot windows (`--at 1.2-1.9`). Aim for speech near -20 dBFS and the bed 8 to 12 dB under it.
- **ffmpeg:** the full build is installed (9.0.2, `winget install Gyan.FFmpeg`, 2026-10-21; open a new shell after installing so `ffmpeg` and `ffprobe` are on PATH). Tested commands:
  - one frame: `ffmpeg -ss <sec> -i out/x.mp4 -frames:v 1 -vf scale=540:-1 out/check.png`
  - a contact sheet, 18 frames in one image: `ffmpeg -i out/x.mp4 -vf "fps=1/2,scale=320:-1,tile=6x3" -frames:v 1 out/sheet.png` (a frame every 2 s covers 36 s; for longer videos use `fps=1/<seconds÷18>`)
  - loudness: `ffmpeg -nostats -i out/x.mp4 -af ebur128=framelog=quiet -f null -` prints the integrated LUFS (around -14 LUFS suits YouTube and social apps). Renders here come out near -18 LUFS, quiet for a classroom projector or laptop speakers; for a room, make a louder copy without re-encoding the video: `ffmpeg -i out/x.mp4 -c:v copy -af "volume=3dB,alimiter=limit=0.89:level=disabled" -c:a aac -b:a 320k out/x-loud.mp4` (about -15 LUFS, true peak under -0.9 dB)
  - phone clips: production.md, "Pitfalls"

  On a machine without it, `npx remotion ffmpeg` is bundled but lacks `fps` and `tile`, so extract frames one `-ss` at a time.
- **Mediabunny** (`remotion/media-info.md`): durations and dimensions of audio and video files.
- You can't hear the result. Say so in the delivery message and ask the person to judge the music and pronunciation.

## This skill's own scripts and template

| Path | What it is |
| --- | --- |
| `scripts/setup-project.mjs` | The whole project in one command (Remotion, packages, template, scripts, size and platform, script font, brand kit, sound effects, draft timings); `--update` for an older project. Run with the skill's own copy. |
| `scripts/doctor.mjs` | Machine and project check before a build: ffmpeg filters, voice engine, HeyGen, mixed Remotion versions, stale `voice.json`, missing files, HEVC/HDR phone clips |
| `scripts/review-check.mjs` | The measurable review checks in one pass, on the script and code, and on a rendered file, including empty frames and small things floating in empty space (review.md) |
| `scripts/sync-story.mjs` | `STORYBOARD.md` → `story.json`, keeping each scene's settings; `--seconds` fills the storyboard's Seconds column |
| `scripts/pronounce.mjs` | Phonemes of every name and odd word as the Kokoro voice will say them, to catch a misread name without hearing it |
| `scripts/render.mjs` | Versioned renders (`out/<name>-vN.mp4`), `--draft` at half size, then review-check |
| `scripts/master-audio.mjs` | Two-pass loudness to -14 LUFS, true peak under -1 dBTP, picture copied |
| `scripts/voice-samples.mjs` | One numbered file of narrator samples (`out/voice-samples/all.mp3`) plus `list.txt` with what each voice may be used for. `--voices` takes names and the groups `kokoro` (the default), `supertonic`, `pocket`, `gemini`, `edge-ar`; a voice that can't run is skipped |
| `scripts/make-voice.mjs` | Narration for every scene, normalized, with word timings (Kokoro; `supertonic:`, `pocket:` and `gemini:` voices; Edge for an Edge voice name; for an `f5:` voice it reads the Sorani files `speak_story.py` wrote). `--draft`: silent estimated timings, no voice needed. Unchanged scenes are reused; `--fresh` re-speaks all. |
| `scripts/voice-engines.mjs` | The Supertonic, Pocket TTS and Gemini engines (through `sherpa-onnx-node` and Google's API), their model downloads, the licence line for every voice, and the audio helpers the voice scripts share |
| `scripts/edge-voice.py` | Speaks one line with Edge TTS and returns each word's time; called by the voice scripts |
| `scripts/free-assets.json` | Every free model, voice and music track the scripts can download, with its licence and credit. The free-assets workflow copies them to this repo's free-assets release, which the scripts try first |
| `scripts/free-music.mjs` | The free music library: list by mood, a numbered preview, `get <id>` to `public/bgm/track.mp3` with the settings |
| `scripts/make-sfx.mjs` | Sound effects made in code, for where remotion.media is blocked |
| `scripts/free-sfx.mjs` | 25 recorded Kenney interface sounds (CC0): list by tag, a preview file, `get <id> [--as name]` to `public/sfx/` |
| `scripts/free-emoji.mjs` | Google's 411 animated emoji (CC BY 4.0): search by name or feeling, `get <names>` to `public/emoji/` for `<Emoji>` |
| `scripts/clean-voice.mjs` | Noise removal for a recording or a clip's sound (DPDFNet through sherpa-onnx); make-voice uses it on `"recorded"` scenes |
| `scripts/transcribe.mjs` | Speech to `Caption` JSON with word times (Parakeet for English, Whisper otherwise, Silero VAD); make-voice uses it to time a recorded English take |
| `scripts/cut-silence.mjs` | The pauses cut out of talking footage, as `<clip>.cuts.json` for `<CutClip>`, its captions moved onto the cut, `--render` for an MP4 |
| `scripts/cutout.mjs` | A photo's subject on a transparent background (rembg with a free model; needs Python and `rembg`) |
| `scripts/kokoro-voice.py` | Kokoro through Python (kokoro-onnx, model from GitHub), used by the voice scripts when kokoro-js can't download its model |
| `scripts/find-browser.mjs` | Lets stills.mjs and render.mjs use an installed Chrome or Edge when Remotion can't download its own browser |
| `scripts/sorani/speak_story.py` | Speaks every scene in Sorani with F5-TTS Central Kurdish (or the MMS stand-in) to `out/voice-raw/`; copy it into the project's `tts/` |
| `scripts/sorani/fetch_ema.py` | Downloads only the EMA weights from a remote PyTorch checkpoint (1.35 GB of 5.4 GB for an F5 voice) |
| `scripts/heygen-music.mjs` | Search the HeyGen music catalog and download picks (calls the CLI through `wsl` on Windows) |
| `scripts/stills.mjs` | Single-frame checks, and `review` for the contact sheets of every scene, seam and the phone view (review.md), in one browser |
| `scripts/make-timing.mjs` | Scene lengths from the music's beat grid for a video with no narration, in `voice.json`'s shape, with a read-time check (production.md, "No narration") |
| `scripts/check-audio.mjs` | Loudness and balance measurement |
| `assets/template/src/` | `Root.tsx`, `theme.ts`, `layout.ts` (positions and safe zones per format and platform), `ChapterLabel.tsx`, and `story/` with `StoryVideo.tsx` (the timeline built from `story.json`: transitions, music ducking, silences, whooshes), `scenes.tsx` (the per-video scenes), `Placeholder.tsx`, `Narration.tsx` (captions), `Title.tsx`, `EndCard.tsx`, `PhotoFill.tsx`, `PhotoCard.tsx`, `Devices.tsx` (laptop, phone, screenshot, screen recording), `Cursor.tsx`, `Stamp.tsx`, `Terminal.tsx`, `Counter.tsx`, `Emoji.tsx` (an animated emoji popping in), `CutClip.tsx` (a talking clip with its pauses cut), `Sfx.tsx`, `media.ts`, `text.ts` (right-to-left helpers), `motion.ts`, `voice.ts`, `scenes/BeatScene.tsx`, `scenes/FreezeScene.tsx`, a sample `story.json` |
| `evals/` | Test cases for this skill, one folder each (`prompt.md`, `case.yaml`, `graders/`), in the layout `claude plugin eval` reads |

The scripts must be copied into the Remotion project's own `scripts/` folder: Node resolves `kokoro-js` from the script's folder, so running them from the skill folder fails with `ERR_MODULE_NOT_FOUND`. Copy `edge-voice.py`, `kokoro-voice.py`, `voice-engines.mjs` and `free-assets.json` with them; the voice scripts look for them next to themselves.

The template started as the funny story style (freeze-frame opener, terminal gags); `Title`, `EndCard`, `PhotoFill`, `Cursor`, `ShotVideo` and `layout.ts` (2026-11-18) cover the other styles' common pieces. Reuse the timeline, narration, captions and components, and write scenes for the style's shape (styles.md) instead of copying the gags.

## Related skills reviewed (2026-10-15)

Searched skills.sh for video skills. The strong matches are all from `heygen-com/hyperframes` (HeyGen's own repo, about 62.7k stars, Apache-2.0, security audits pass or warn): `product-launch-video`, `faceless-explainer`, `general-video`, `motion-graphics`, `embedded-captions`, `talking-head-recut`, `slideshow`, `music-to-video`, `pr-to-video`, `hyperframes-audio`, `hyperframes-creative`, and `media-use` (already used here). They build **HTML compositions with the `hyperframes` CLI, not Remotion**, so they are not installed here: they would run a second pipeline next to this one. Their workflow ideas were adopted instead (storyboard-and-gates.md): a brief file as the contract, a design file, a storyboard before building, user approval gates, one worker per scene, freshness checks, and embedded captions kept for one or two peaks.

Update 2026-11-17: the main `hyperframes` skill and `hyperframes-cli` are now installed on the author's PC (telemetry off), and this skill uses HyperFrames as an optional second engine and for its file tools (hyperframes.md). Their craft rules were folded into this skill's references. The other skills in that repo are still not installed. Not recommended without checking: `*/superpowers@ai-video-generation` and `prime-skills/*` (huge install counts, repos with a handful of stars), and `remotion-to-hyperframes` (only for porting).

Second pass (2026-10-21, `npx skills find` with 29 queries on the PC; it returns nothing from the cloud sandbox, even for "remotion"):
- **Installed:** `affaan-m/ecc@ui-demo` (repo about 285k stars) for screen recordings. Also added: the full ffmpeg, and Edge TTS under "Voice".
- **Not installed, because they trigger on the same requests as this skill** ("make me a video", Remotion, explainer, product demo) and would compete with it: `coreyhaines31/marketingskills@video`, `iart-ai/motion-design-skills` (ships its own `remotion-video`), `affaan-m/ecc@video-editing`.
- **`browser-use/video-use`** (about 29k stars): strong for cutting long talking-head or vlog footage by its transcript, but it is a separate ffmpeg pipeline that needs an ElevenLabs key for transcription. Offer it only when the person brings long raw footage to cut.
- **Thinner than what is here:** `digitalsamba/claude-code-video-toolkit@ffmpeg` and `@playwright-recording`; `mengto/skills@browser-video-recording` is built for the Codex in-app browser and macOS; `aahl/skills@edge-tts` is a short wrapper that needs `uv`, so Edge TTS is documented directly.
- **Still avoid** `*/superpowers@ai-video-generation` and `@ai-avatar-video`: six copies with 300k to 800k installs each, from repos with 3 to 8 stars.

Third pass (2026-11-18, the skills.sh leaderboard and web search; `npx skills find` still returns nothing from the cloud sandbox): nothing new to install. The HyperFrames repo added `hyperframes-animation`, `hyperframes-keyframes` and `hyperframes-audio`, which belong with that engine (hyperframes.md). Remotion video skills from other authors (`akillness/*@remotion-video-production`, `oakoss/agent-skills@remotion`, `ericmjl/skills@remotion-video`) have under 400 installs and cover less than this skill. `emilkowalski/skills@review-animations` and its siblings review web UI motion, not video. `remotion-dev/remotion@video-report` is for reporting Remotion bugs.

Fourth pass (2026-11-19, the skills.sh leaderboard and web search, for free animation, voice, editing and music skills; `npx skills find` still returns nothing from the cloud sandbox):
- **Recommended alongside this skill (until 2026-11-27, see the fifth pass):** `remotion-dev/skills` (Remotion's official skills, which this skill leans on: `remotion-best-practices` has about 858k installs) and `WyattBlue/auto-editor` (the auto-editor author's five skills, public domain, 1.2k to 1.5k installs for the main four) for editing raw footage into an editor timeline.
- **Already used:** the `heygen-com/hyperframes` skills (hyperframes.md).
- **Not recommended:** `browser-use/video-use` still needs an ElevenLabs key; `gencraft-labs/skills@ai-music` (a repo with 3 stars) and `prime-skills/runcomfy-agent-skills@*` (`ai-music`, `ace-step`, `video-edit`) all run through RunComfy's cloud, billed per use (its ACE-Step costs per second of audio, no free tier), while ACE-Step itself is free to run locally (music.md); `*/superpowers@ai-video-generation` and `@ai-avatar-video` are still copies from repos with a handful of stars; `emilkowalski/skills` animation skills are for web UI.
- **No free skill found** for voiceover or music generation. The free resources went into the skill itself instead: the editing tools and animation resources above, 28 more tracks for the free library, the Kenney sounds, and ACE-Step for original music (music.md).
- **Sorani:** checked again; every Sorani TTS model found is non-commercial (F5 Central Kurdish CC BY-NC-ND, Vekol CC BY-NC, MMS non-commercial). The free routes for client work stay the person's own recording and Gemini.

Fifth pass (2026-11-27): everything is now inside this skill, so the author's PC runs it alone. HeyGen's `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `reverse-any-video`, `style-sampling` and `remotion-to-hyperframes` guides are bundled in `hyperframes/` (Apache-2.0, credited); `figma` and `slideshow` were left out (not video work). Remotion's skills have no licence, so their know-how was rewritten in this skill's own words in `references/remotion/`. `ui-demo` (MIT) became screen-demo.md. On the skills.sh leaderboard the same day, the only other video skill in the top 20 was `101-skills/superpowers@ai-video-generation` (paid cloud, account login, 35 stars): still avoid.

## Claude Code helpers

- **AskUserQuestion** for the brief and for each approval gate.
- **A research subagent** (Explore or similar) to read the person's notes or repo history and return a dated timeline, the arc and a list of private things. Ask for real dates only.
- **find-skills** to discover a skill for something outside video. For video, everything is in this skill: don't install another video skill next to it.
- **The in-app browser or Claude in Chrome** to open the Studio preview.
- **Opening the finished file:** `Invoke-Item` on Windows, `open` on macOS.
