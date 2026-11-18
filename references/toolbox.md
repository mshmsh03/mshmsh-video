# Toolbox

Everything this workflow uses, and when to reach for it. Check what is installed before relying on a tool: `~/.claude/skills` and `~/.agents/skills` hold the skills, and `wsl -l -v` shows whether WSL exists on Windows.

## Contents
- The Remotion skills
- HyperFrames (a second engine and file tools)
- media-use (HyperFrames Agent Media OS)
- Voice: Kokoro, Edge TTS, Sorani Kurdish (F5), HeyGen, ElevenLabs, their own recording
- Music and sound effects
- Screenshots, screen recordings, images and brand assets
- Verification tools
- This skill's own scripts and template
- Claude Code helpers

## The Remotion skills

Installed as `remotion-*` skills (the router is `remotion-best-practices`; they are version-matched to the installed Remotion, 4.0.535 at the time of writing). This skill sits on top of them: it decides what to make; they cover Remotion itself.

| Skill | Use it for |
| --- | --- |
| `remotion-best-practices` | The router. Preserve the person's own edits. Open the Studio preview early; render only when asked. |
| `remotion-create` | Scaffolding a project (`npx create-video@latest --yes --blank --no-tailwind`, into a new subfolder if the folder isn't empty) and a first composition. |
| `remotion-markup` | Writing the React markup: drive animation with `useCurrentFrame()` and `interpolate()`, get `fps` from `useVideoConfig()` for every seconds-to-frames calculation, use `Easing.bezier()` and `Easing.spring()`. CSS `transition`, CSS `animation` and Tailwind animation classes do not render correctly. |
| `remotion-render` | `npx remotion render` for video, `npx remotion still` for one frame. |
| `remotion-captions` | Caption JSON (`@remotion/captions`, the `Caption` type with `text`, `startMs`, `endMs`), transcribing audio or video to captions, and displaying and animating them. |
| `remotion-multimedia` | Mediabunny in the browser: audio duration, video duration and dimensions, trimming, cropping. |
| `remotion-maps` | Static maps, animated routes and markers, geographic explainers (Mapbox, MapLibre, MapTiler, GeoJSON, 3D flyovers). |
| `remotion-studio` | Studio CLI flags, opening a composition's exact local URL. |
| `remotion-interactivity` | Structuring markup so the person can change values in Studio and write them back to code. |
| `remotion-saas` | Remotion inside an app: `<Player>`, rendering on Lambda, Vercel, Cloudflare or Express, client-side rendering. |
| `remotion-docs` | Looking up current Remotion API documentation. |
| `remotion-upgrade` | Upgrading Remotion, its packages and these skills. |

Remotion packages this skill's template uses: `@remotion/transitions` (fades and slides in a `TransitionSeries`), `@remotion/google-fonts`, `@remotion/media` (the `Audio` component), `@remotion/captions`. Sound effects come from remotion.media as `.wav` files (`whoosh`, `mouse-click`, `record-scratch`, `vine-boom`, `windows-xp-error`, `ding`); the full list is in the `remotion-markup` skill's `sfx.md`.

Preview first: run `npx remotion studio` (add `--no-open` if the agent client has an in-app browser, then open the printed URL and confirm the composition loads). Visit one composition at `/<composition-id>`.

## HyperFrames (a second engine and file tools)

The `hyperframes` and `hyperframes-cli` skills (`heygen-com/hyperframes`, Apache-2.0; installed and read 2026-11-17). Full notes in hyperframes.md. In short:

- **As an engine:** HTML and GSAP rendered to video, with a Studio and a desktop app where the person can keep editing without code. Remotion stays the default; build in HyperFrames when the person asks, wants to edit the video themselves afterwards, or the video is mostly a captured website or a ready-made HyperFrames block.
- **As file tools inside a Remotion video:** `hf beats` (tempo and beat times), `hf audio` (a track's sections, loudness and true peak; a sound effect's peak; a render's loudness), `hf capture` (a website's screenshots, colours, fonts, logos and words), `hf transcribe` (word timings for the person's own recording) and `hf remove-background` (a cut-out of the person). `hf` means `node "<skills>/hyperframes/scripts/plugin-cli.mjs"`.
- **Telemetry** goes to HeyGen unless turned off (`hf telemetry disable`, `HYPERFRAMES_NO_TELEMETRY=1`); tell the person.
- **Their craft rules** (storylines, numbers instead of adjectives, the banned defaults, motion, sound, captions, review) are folded into this skill's references: story-and-comedy.md, storyboard-and-gates.md, motion.md, music.md, styles.md and review.md.

## media-use (HyperFrames Agent Media OS)

A skill (`~/.agents/skills/media-use`) with one main verb, `resolve`, that finds or generates a media file and records it in a ledger so it can be reused:

```bash
npx hyperframes media-use resolve --type <type> --intent "<description>" --project <dir>
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

Also in it: `--candidates` to list reusable assets before resolving fresh, `--doctor` to check setup, an audio engine (voiceover, transcription, captions, background removal), operations on media (cut, reframe, transform), media treatments for footage that looks dark, flat or boring or should look retro, camcorder or print-like, and a rule for being proactive: scan once for signals (on-screen text with no voiceover, emoji used as icons, placeholder images, hard cuts with no sound, a piece over 10 s with no music, footage that is under- or over-exposed), then ask once and propose specific fixes instead of silently adding things. Read only the reference file the task needs (`references/resolve.md`, `grading.md`, `audio.md`, `operations.md`, `media-treatments.md`, `setup-providers.md`, `memory.md`).

Rules that matter here:
- If the environment variable `HEYGEN_API_BASE` is set, a host app pays for HeyGen. Don't ask the person to install or sign in to the `heygen` CLI; HeyGen calls go through the host. If a call is refused, tell the person the host's message as written and stop.
- Otherwise, to use HeyGen media (catalog search, TTS, avatar video), install and sign in to the `heygen` CLI, then check with `npx hyperframes media-use resolve --doctor`.
- Before generating a voiceover or an avatar video, tell the person that signing in with `heygen auth login --oauth` gives a free allowance for TTS and avatar videos, while an API key bills API credits.
- If the host app has its own music or sound-effect tools, use those first. `resolve --type bgm|sfx` needs the `heygen` CLI.
- Colour grading: don't generate a `.cube` LUT just to encode exposure or warmth, and don't fake supported effects with CSS or SVG overlays.

Install: `npx skills add heygen-com/hyperframes@media-use -g -y`. Avoid skills like `*/superpowers@ai-video-generation` and `prime-skills/*`: they show huge install counts from repos with a handful of stars.

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
| Pocket TTS (`pocket:<voice>`) | Free, offline; model CC BY 4.0 (credit Kyutai); presets `bill_boerst`, `caro_davy`, `peter_yearsley`, `stuart_bell` CC0, `alba` CC BY 4.0 | English. Copies a voice from a clean 10 to 20 s recording: `pocket:voice/me.wav`. Only the person's own voice, or one they have permission to use: Kyutai's terms forbid copying a voice without consent. `bria` and `loona` come with the model, for trying only. It ignores `speed`, and each run is a slightly different take (make-voice keeps the scenes it already spoke). Runs through `sherpa-onnx-node`; the 98 MB model downloads once, a preset voice on first use. |
| Gemini TTS (`gemini:<Voice>`) | Free tier with a Google AI Studio key. Google doesn't claim the audio, but on the free tier it may use and have people review the text, so no confidential scripts | 30 voices (`Kore` firm, `Charon` informative, `Puck` upbeat, `Sulafat` warm...), over 100 languages detected automatically, including Arabic and Central Kurdish. `"voiceStyle"` in `story.json` sets the delivery ("warm and unhurried"); there is no speed setting, so `speed` becomes a pace hint. Default model `gemini-3.1-flash-tts-preview` (free of charge on Google's pricing page, 2026-11-18); `"voiceModel"` picks another. **Written from Google's docs and tested against a mock of the API, not against Google itself** (the sandbox it was built in can't reach it): sample it before promising it. Free-tier rate limits are low; make-voice waits and retries. |
| Edge TTS (`edge-tts`, Python) | Free, online, no key; personal videos only | Microsoft's neural voices in many languages, including Iraqi Arabic (`ar-IQ-RanaNeural`, `ar-IQ-BasselNeural`), Saudi, Egyptian and Persian. No Kurdish voice. The same two scripts handle it, with measured word timings (below). Browser-based clients stopped working in December 2025 when Microsoft added a header check; the Python package kept being updated, so if it fails, update it first (`python -m pip install -U edge-tts`). It is the Edge browser's read-aloud service, not a licensed API: for client or paid work use the same voices through Azure AI Speech, or Supertonic or Gemini. |
| F5-TTS Central Kurdish (`aranemini/central-kurdish-tts`) | Free, offline; **CC BY-NC-ND 4.0, non-commercial only** | Sorani Kurdish: three single-speaker voices (studio male, audiobook male, audiobook female), 24 kHz, the best free Sorani voice found (2026-10-25). Slow on a CPU, about 40 times real time. Steps under "Sorani voices" below. |
| MMS Sorani (`razhan/mms-tts-ckb`) | Free, offline; Meta's MMS base is non-commercial | Flat and robotic, but it speaks a scene in seconds: a stand-in voice for building and timing while F5 runs. |
| kurdishtts.com | Paid (about $12/month for public use; the free plan is evaluation only) | Many Sorani and Kurmanji voices with word timings. Needs the person's own account and API key. Not tested here. |
| The person's own recording | Free | Best for tributes. One take per scene, saved as `out/voice-raw/<scene id>.wav` (or .m4a, .mp3: a phone recording is fine), with `"voice": "recorded"` in `story.json`: make-voice trims, levels and times the words from the pauses like any other voice. For exact word times, transcribe it instead (`remotion-captions`, `hf transcribe` with `--model` and `--language` set (hyperframes.md), or the `media-use` audio engine). The same path takes audio downloaded from ElevenLabs or HeyGen. For English, Pocket TTS can copy their voice from one short recording instead (above). |
| HeyGen TTS | Free allowance with OAuth sign-in | Through `media-use resolve --type voice`. |
| ElevenLabs | Free plan: 10,000 credits a month (about 10 minutes), non-commercial and credit required; commercial use from the paid Starter plan | Download one file per scene and use `"recorded"`. Offer it, don't assume it. |

Edge voices (end-to-end tested 2026-10-21 with Iraqi Arabic, including a render):
1. Install once: `python -m pip install edge-tts` (set `PYTHON` if the command isn't `python` on Windows or `python3` elsewhere). `kokoro-js` isn't needed for Edge.
2. Samples to pick by ear: `node scripts/voice-samples.mjs "<a line in the video's language>" --voices ar-IQ-RanaNeural,ar-IQ-BasselNeural,ar-SA-ZariyahNeural,ar-SA-HamedNeural,ar-EG-SalmaNeural,ar-EG-ShakirNeural`. They land in `out/voice-samples/` as MP3s. `python -m edge_tts --list-voices` lists the rest.
3. Put the chosen name in `story.json`'s `voice` and run `node scripts/make-voice.mjs` as usual. It sees an Edge name (`xx-XX-…Neural`) and calls `scripts/edge-voice.py`; `speed` 1.1 becomes Edge's rate `+10%`. It writes the same WAVs and `voice.json` as the Kokoro path, keeps Edge's own MP3s in `out/voice-edge/`, and decodes them with `ffmpeg` (or `npx remotion ffmpeg`).

Each scene's line reads "x/y words timed by Edge". Edge leaves punctuation out of its words, so they are matched back to the script's own words, and a word after a pause starts where the sound comes back: Edge puts it 120 to 160 ms early, inside the silence. If the line reads "breaks" instead, `say` and `text` differ in word count and the times were estimated the Kokoro way; keep `say` to the same word count (`"say": "… كلود …"` for a shown "Claude" works) to keep measured times.

Pocket and Supertonic (tested 2026-11-18 on Linux: samples, make-voice on an eight-scene story, the model download, and a Whisper transcript of every sample to check it's intelligible):
1. `setup-project.mjs` installs `sherpa-onnx-node` (except for a Sorani project; `--no-sherpa` skips it). In an older project: `npm i -D sherpa-onnx-node@2.0.1`.
2. Samples: `node scripts/voice-samples.mjs "<line>" --voices supertonic,pocket`. The first run downloads each model from sherpa-onnx's GitHub releases (with curl and tar, both built into Windows 10 and later) into `~/.cache/video-xoshaka/models`, shared by every project; `VIDEO_XOSHAKA_MODELS` moves it.
3. Put the chosen name in `story.json`'s `voice` and run make-voice as usual. `doctor.mjs` checks the package, the model, a copied voice's file, and Kurdish text sent to Supertonic.

Gemini:
1. The person makes a free key at https://aistudio.google.com/apikey (a Google account, 18 or older).
2. They set it in the terminal that runs the scripts: `$env:GEMINI_API_KEY="..."` in PowerShell, `export GEMINI_API_KEY=...` in Git Bash. Never write it into a project file.
3. `voice-samples.mjs "<line>" --voices gemini`, then `"voice": "gemini:Charon"` (and, if wanted, `"voiceStyle"`).

Not wired in (checked 2026-11-18); each can still be used by saving one file per scene and setting `"recorded"`:
- **Chatterbox** (Resemble AI, MIT): expressive English (Turbo, with tags like `[laugh]`) and a 23-language model that includes Arabic. PyTorch, slow on a CPU, and it adds an inaudible watermark.
- **Habibi** (Arabic dialects, built on F5): its Iraqi, MSA, Egyptian, Algerian and Moroccan models are Apache-2.0 (client work allowed); the unified, Saudi and Emirati ones are CC BY-NC-SA. It copies a voice from a reference clip and its transcript, slowly on a CPU, like F5.
- **Vekol** (Sorani, by Revge): one voice, fast on a CPU, but CC BY-NC 4.0 and explicitly not for commercial use.
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

Full setup is in music.md. The short version: use real royalty-free music from the HeyGen catalog (`media-use` or `scripts/heygen-music.mjs`), or ElevenLabs Music (`elevenlabs/skills@music`, paid), or a track the person supplies (fine for WhatsApp; copyrighted songs get muted or blocked on Instagram, TikTok and YouTube). Don't write music in code and call it done: it sounds cheap. Sound effects: remotion.media files, or `media-use resolve --type sfx`.

The HeyGen CLI is Linux and macOS only. On Windows, install it inside WSL and run it through `wsl`; the OAuth sign-in trick (run the login in the background with `BROWSER=echo`, read the printed URL, open it on Windows) is in music.md.

## Screenshots, screen recordings, images and brand assets

- **Live sites:** headless Chrome with its own profile (`--user-data-dir`), `--window-size=1440,900` for desktop and `390,844` for phone, `--virtual-time-budget=8000` so the page has loaded. Take a phone shot of every site shown on a laptop.
- **Screen recordings of a real flow** (clicks, typing, a menu opening): the `ui-demo` skill (`affaan-m/ecc@ui-demo`, installed 2026-10-21). It drives Playwright through discover, rehearse and record, with a visible cursor and natural pacing. Use it for the raw footage only and skip its injected subtitle bar, because this skill's captions carry the words. Set both `viewport` and `recordVideo.size` to `1440x900` for the laptop or `390x844` for the phone (without `size`, Playwright scales the video down to fit 800x800). Convert the WebM to a constant-rate MP4 before using it: `ffmpeg -i demo.webm -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart public/rec/demo.mp4`, then play it inside the device frame with `<Video>` from `@remotion/media` (`Devices.tsx`'s `Shot` takes images only, so add a video variant). Look at one frame at full size first: if the text is soft, use screenshots. For a plain scroll down a page, a tall screenshot (`--window-size=1440,4000`) panned in Remotion is sharper than a recording. Needs `npm i -D playwright` and `npx playwright install chromium` in the project.
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
- **Mediabunny** (`remotion-multimedia`): durations and dimensions of audio and video files.
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
| `scripts/voice-samples.mjs` | One numbered file of narrator samples (`out/voice-samples/all.mp3`) plus `list.txt` with what each voice may be used for. `--voices` takes names and the groups `kokoro` (the default), `supertonic`, `pocket`, `pocket-demo`, `gemini`, `edge-ar`; a voice that can't run is skipped |
| `scripts/make-voice.mjs` | Narration for every scene, normalized, with word timings (Kokoro; `supertonic:`, `pocket:` and `gemini:` voices; Edge for an Edge voice name; for an `f5:` voice it reads the Sorani files `speak_story.py` wrote). `--draft`: silent estimated timings, no voice needed. Unchanged scenes are reused; `--fresh` re-speaks all. |
| `scripts/voice-engines.mjs` | The Supertonic, Pocket TTS and Gemini engines (through `sherpa-onnx-node` and Google's API), their model downloads, the licence line for every voice, and the audio helpers the voice scripts share |
| `scripts/edge-voice.py` | Speaks one line with Edge TTS and returns each word's time; called by the voice scripts |
| `scripts/kokoro-voice.py` | Kokoro through Python (kokoro-onnx, model from GitHub), used by the voice scripts when kokoro-js can't download its model |
| `scripts/find-browser.mjs` | Lets stills.mjs and render.mjs use an installed Chrome or Edge when Remotion can't download its own browser |
| `scripts/sorani/speak_story.py` | Speaks every scene in Sorani with F5-TTS Central Kurdish (or the MMS stand-in) to `out/voice-raw/`; copy it into the project's `tts/` |
| `scripts/sorani/fetch_ema.py` | Downloads only the EMA weights from a remote PyTorch checkpoint (1.35 GB of 5.4 GB for an F5 voice) |
| `scripts/heygen-music.mjs` | Search the HeyGen music catalog and download picks (calls the CLI through `wsl` on Windows) |
| `scripts/stills.mjs` | Single-frame checks, and `review` for the contact sheets of every scene, seam and the phone view (review.md), in one browser |
| `scripts/make-timing.mjs` | Scene lengths from the music's beat grid for a video with no narration, in `voice.json`'s shape, with a read-time check (production.md, "No narration") |
| `scripts/check-audio.mjs` | Loudness and balance measurement |
| `assets/template/src/` | `Root.tsx`, `theme.ts`, `layout.ts` (positions and safe zones per format and platform), `ChapterLabel.tsx`, and `story/` with `StoryVideo.tsx` (the timeline built from `story.json`: transitions, music ducking, silences, whooshes), `scenes.tsx` (the per-video scenes), `Placeholder.tsx`, `Narration.tsx` (captions), `Title.tsx`, `EndCard.tsx`, `PhotoFill.tsx`, `PhotoCard.tsx`, `Devices.tsx` (laptop, phone, screenshot, screen recording), `Cursor.tsx`, `Stamp.tsx`, `Terminal.tsx`, `Counter.tsx`, `Sfx.tsx`, `media.ts`, `text.ts` (right-to-left helpers), `motion.ts`, `voice.ts`, `scenes/BeatScene.tsx`, `scenes/FreezeScene.tsx`, a sample `story.json` |
| `evals/` | Test cases for this skill, one folder each (`prompt.md`, `case.yaml`, `graders/`), in the layout `claude plugin eval` reads |

The scripts must be copied into the Remotion project's own `scripts/` folder: Node resolves `kokoro-js` from the script's folder, so running them from the skill folder fails with `ERR_MODULE_NOT_FOUND`. Copy `edge-voice.py` and `voice-engines.mjs` with them; the voice scripts look for both next to themselves.

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

Third pass (2026-11-18, the skills.sh leaderboard and web search; `npx skills find` still returns nothing from the cloud sandbox): nothing new to install. The HyperFrames repo added `hyperframes-animation`, `hyperframes-keyframes` and `hyperframes-audio`, which belong with that engine (hyperframes.md). Remotion video skills from other authors (`akillness/*@remotion-video-production`, `oakoss/agent-skills@remotion`, `ericmjl/skills@remotion-video`) have under 400 installs and cover less than this skill. `emilkowalski/skills@review-animations` and its siblings review web UI motion, not video (designa-xoshaka already draws on them). `remotion-dev/remotion@video-report` is for reporting Remotion bugs.

## Claude Code helpers

- **AskUserQuestion** for the brief and for each approval gate.
- **A research subagent** (Explore or similar) to read the person's notes or repo history and return a dated timeline, the arc and a list of private things. Ask for real dates only.
- **find-skills** to discover another skill when one is needed.
- **The in-app browser or Claude in Chrome** to open the Studio preview.
- **Opening the finished file:** `Invoke-Item` on Windows, `open` on macOS.
