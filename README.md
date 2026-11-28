# mshmsh-video

[![Check](https://github.com/mshmsh03/mshmsh-video/actions/workflows/check.yml/badge.svg)](https://github.com/mshmsh03/mshmsh-video/actions/workflows/check.yml)

A Claude skill that makes a whole video with you, from "make me a video" to a finished MP4. It was called video-xoshaka until 2026-11-19. It works in [Remotion](https://www.remotion.dev) (videos written as React code), so every video is a real project you can change and re-render.

It asks you questions first, writes a short brief, pitches three different storylines when the story is still open, then writes a design file, a script and a storyboard. Nothing is built until you approve the words. Then the whole video plays straight away as an animatic (placeholders with the real captions) while it adds a narrator, music and sound effects and builds the scenes one by one, reviews them frame by frame (contact sheets of every scene, every cut and the phone view, plus an automatic check of the script, the code and the rendered file) and hands you the file, loudness-matched for social apps.

It also handles coming back: a fix, a 15-second cut, a landscape version, a Kurdish version, next month's offer, and brand kits so a repeat client never answers the same questions twice.

It can make funny stories, sincere tributes, product promos and launches, explainers, tutorials, recaps, announcements, music videos, number and data stories, pull-request videos, talking heads with cards, 3D and character shorts, vertical (Reels, TikTok, Shorts, WhatsApp Status) or landscape.

If you want to keep editing the video yourself afterwards without code, it can build in [HyperFrames](https://github.com/heygen-com/hyperframes) instead of Remotion.

## Install

**Claude Code** (on your own computer: everything works there)

```bash
npx skills add mshmsh03/mshmsh-video
```

Restart Claude Code, then type `/mshmsh-video`, or just ask it for a video. By hand instead: download this repo and put the folder at `C:\Users\<you>\.claude\skills\mshmsh-video` (Windows) or `~/.claude/skills/mshmsh-video` (macOS, Linux).

**Claude app** (claude.ai or the desktop app)

1. Download [mshmsh-video.zip](https://github.com/mshmsh03/mshmsh-video/releases/download/latest/mshmsh-video.zip). It is rebuilt every time this repo changes.
2. Upload it in the app's skill settings.
3. Ask Claude for a video.

The app builds the video in its cloud workspace. That workspace blocks some downloads, so a few things differ there (below).

### Where it works

| | Claude Code on your computer | Claude app (cloud workspace) |
| --- | --- | --- |
| Interview, script, storyboard, build, review, render | yes | yes; when Remotion can't download its browser, the workspace's Chrome is used |
| Fonts | from Google Fonts | saved into the project from Google's font repository on GitHub, automatically |
| Kokoro voices | yes | yes, through Python with the model from GitHub, automatically |
| Supertonic and Pocket TTS voices | yes | yes |
| Gemini and Edge voices | yes (Gemini needs your free key) | blocked in the tests (2026-11-18) |
| Free music library (44 public-domain tracks) | yes | yes |
| HeyGen music search | with the HeyGen CLI | not tested; use the free library |
| Sound effects | recorded ones from remotion.media, plus 25 free Kenney recordings | the Kenney recordings and ones made in code where remotion.media is blocked, automatically |
| Animated emoji (Google's, 411) | yes | yes |
| Cleaning your own recordings, captions from your own clips, cutting pauses | yes | yes (tested in a cloud sandbox like it) |
| Photo cut-outs | yes, with Python and `rembg` | yes, with Python and `rembg` |

### Free resources, included

Everything free the skill uses, apart from the code itself, is on this repo's [free-assets release](https://github.com/mshmsh03/mshmsh-video/releases/tag/free-assets) or already on GitHub: the voice models (Kokoro, Supertonic, Pocket TTS and its free preset voices), 44 public-domain music tracks, 25 recorded sound effects by Kenney (CC0) and the noise-removal model for your own recordings, each with its licence and credit in the release notes. The two speech-to-text models (Parakeet for English, Whisper for other languages) come from sherpa-onnx's GitHub releases, and Google's animated emoji from Remotion's GitHub repository. The skill downloads what a video needs from there by itself, because GitHub stays reachable where other sites are blocked; nothing has to be downloaded by hand. To hear them first, the release has `samples-english.mp3`, `music-preview.mp3` and `sfx-preview.mp3`. Only resources that are free to use, client work included, are in it; each file's conditions (a credit, or Supertonic's rules on use) are listed with it.

The one thing that can't be included is a personal key (Gemini, HeyGen): each person makes their own, free, and keeps it out of any file in the repo.

## What you need

- Node.js 18 or newer. The skill sets up Remotion itself.
- Remotion is free for individuals and small teams (up to 3 people). Bigger companies need a paid licence: see [remotion.dev/license](https://www.remotion.dev/license).
- Music: the free library is included (44 public-domain tracks, client work allowed). Optional: the HeyGen CLI for thousands more royalty-free tracks (Linux and macOS; on Windows it runs inside WSL). For an original track on a PC with an NVIDIA graphics card, ACE-Step 1.5 (MIT); setup steps are in `references/music.md`.
- The free narrator voices download their model once: Kokoro about 330 MB (English); Supertonic (31 languages including Arabic) and Pocket TTS (English, and it can copy your own voice from a short recording) about 100 MB each, after `npm i -D sherpa-onnx-node@2.0.1` in the project.
- Optional: a free Gemini API key (aistudio.google.com/apikey) for Google's Gemini voices, over 100 languages including Arabic and Central Kurdish. Set it as `GEMINI_API_KEY` in the terminal. On the free tier Google may use what you send to improve its products, so don't send a client's confidential script. The free tier allows about ten speech requests a day, so for more than a few scenes the skill speaks the whole script in one request and cuts it per scene.
- Optional, for Arabic and other languages: Python 3 with `python -m pip install edge-tts` for free Microsoft Edge voices (Iraqi, Saudi, Egyptian Arabic and many more), with right-to-left captions.
- For Sorani Kurdish: no fully free voice exists yet (checked again 2026-11-19), so none is included. Options: your own recording (the skill takes the background noise out by itself), Gemini with your own free key, or the F5-TTS Central Kurdish voices (Python, PyTorch on the CPU, a 1.35 GB download per voice, about an hour of CPU time for a 90-second video; non-commercial only, downloaded from their authors when used). Kurmanji has no tested free voice yet.
- Optional, for cutting the subject out of a photo: Python 3 with `python -m pip install "rembg[cpu,cli]"`.
- Recommended: the full ffmpeg for converting phone clips, the review contact sheets, the automatic checks on a render and loudness mastering. Remotion's bundled copy covers the basics. `node scripts/doctor.mjs` says what is missing.
- Rendering needs the internet for Google Fonts, or the font files saved in the project (setup does that by itself when Google Fonts can't be reached).
- Optional: Node.js 22+ for the HyperFrames engine and its file tools, which come with this skill (no separate install): beat and section detection for music, loudness checks, website capture (screenshots, colours, fonts, logos), transcription and background removal. The first use downloads the HyperFrames CLI through npx. This skill keeps HeyGen's usage data off (`HYPERFRAMES_NO_TELEMETRY=1`) and never sends usage events or feedback reports.

## One skill, nothing else to install

Everything a video needs is inside this skill, so you don't need any other video skill (and a second one would compete with it for the same requests):

- **Remotion:** `references/remotion/` covers Remotion itself (timing, transitions, effects, colour, Kurdish and Arabic text, fonts, sound, clips, captions, Studio editing, renders, editor timelines, maps and 3D flights, apps). It was written for this skill in its own words, so you don't need Remotion's separate skills.
- **HyperFrames:** HeyGen's guides and tools ship in `hyperframes/`: the engine, its CLI, about 450 ready-made blocks, media-use (real logos, icons, images, voice, colour grades), rebuilding any video as an editable project, proven explainer styles, and turning a Remotion video into an editable one.
- **Screen recordings:** `references/screen-demo.md` records a real site or app with Playwright.

If you installed any of those separately before (`hyperframes`, `hyperframes-cli`, `media-use`, `ui-demo`, `remotion-*`), you can remove them: `npx skills remove <name> -g`. `node scripts/doctor.mjs` lists any that are still there.

## How a video is made

1. **Interview.** Short multiple-choice rounds (style, where it will be posted, length, voice, look, music, names, captions, ending), then a few free-text questions only you can answer. Say "just make it" for the quick version.
2. **Brief.** Your answers are saved as `brief.md`. It is the contract for every later step.
3. **Storyline, design file, script and storyboard.** When the story is open, you pick one of three storylines. The design file turns words like "premium" into numbers (colours, sizes, eases, frames) and bans the generated-video defaults by name. You approve the words before anything is built.
4. **Voice.** You pick the narrator by ear from short samples.
5. **Preview.** One command sets up the project (`setup-project.mjs`) and a live Remotion Studio preview opens right after the script is approved, playing the whole video as an animatic before any scene is built.
6. **Build.** One component per scene, each visual landing on its spoken word, with motion rules for eases, titles and transitions. Layouts follow the format and the app's safe zones by themselves; Kurdish and Arabic read right to left with joined letters.
7. **Music and sound.** Real royalty-free music, started at its strongest section and ducked under the voice; sound effects only on what happens on screen.
8. **Review.** An automatic check (`review-check.mjs`), contact sheets of every scene, every cut and the phone view, ranked notes (P0, P1, P2) and fixes, loudness fixed to about -14 LUFS (`master-audio.mjs`), frames from the final file. You approve before the final render.
9. **Deliver.** The file, the creative calls, what was checked, and what could not be (the audio is never heard by Claude).

## What is in this repo

| Path | What it is |
| --- | --- |
| `SKILL.md` | The skill: the workflow and principles |
| `references/` | The interview, styles and safe zones, storylines and scripting and comedy, the design file and gates, motion, production notes, music and sound design, the review pass, coming back to a video and brand kits, HyperFrames, screen recordings, toolbox |
| `references/remotion/` | Remotion itself, one file per topic, with an index |
| `hyperframes/` | HeyGen's HyperFrames guides, scripts and assets (Apache-2.0, see `hyperframes/NOTICE.md`) |
| `scripts/` | Project setup (look from the design file, fonts saved locally), a doctor check, storyboard-to-script sync, a pronunciation check, one numbered voice-samples file with what each voice may be used for, narration with word timings (Kokoro, Supertonic, Pocket TTS including a copy of your own voice, Gemini, Edge TTS, Sorani F5, your own recording cleaned and timed from a transcript, or draft timings with no voice), a whole script in one Gemini request cut per scene, noise removal, speech-to-text captions, pause cutting and photo cut-outs, the free music, sound-effect and animated-emoji libraries, beat-grid timing for videos without a narrator, HeyGen music search, stills and review contact sheets, the automatic review check, versioned renders, audio check and loudness mastering |
| `assets/template/` | Starter project: a timeline built from the script, layouts per format and platform, captions, placeholders, titles, end card, photo fill, photo card, device mockups with screenshots and screen recordings, cursor, stamp, terminal, counter, animated emoji, talking clips with the pauses cut, sound effects |
| `evals/` | Test cases for the skill (`claude plugin eval .` runs them) |
| `CHANGELOG.md` | What changed, by date |
| `.github/` | The checks and tests that run on every push, and the job that builds the release zip |

The author's own example video (with real people in it) is not published. Use `assets/template/` as the starting point.

## Update

- Claude Code: run the install command again, `npx skills add mshmsh03/mshmsh-video`; it replaces the old version. (`npx skills update` on its own only updates skills installed inside one project; for a skill installed for the whole computer it's `npx skills update -g`.)
- Claude app: download [mshmsh-video.zip](https://github.com/mshmsh03/mshmsh-video/releases/download/latest/mshmsh-video.zip) again and upload it in place of the old one. The app takes at most 200 files, so the zip is a lighter copy: it plans every kind of video, but the HyperFrames scripts, sounds and fonts and the test cases are left out (they only run in Claude Code).
- **Had it as video-xoshaka?** That's this skill's old name. Install it under the new name as above, then remove the old copy so the two don't compete: in Claude Code, `npx skills remove video-xoshaka -g` (or delete the `video-xoshaka` folder in `.claude/skills`); in the Claude app, delete the video-xoshaka skill after uploading mshmsh-video.zip. The voice models it already downloaded are reused.

What changed is in [CHANGELOG.md](CHANGELOG.md).

## Maintaining it

- Every push and pull request runs a check (GitHub's Actions tab): every script parses, every JSON file is valid, and every script and reference file the docs name exists.
- Every change to `main` rebuilds `mshmsh-video.zip` on the release called "latest", so the download link above always gives the newest version.
- Add a line to `CHANGELOG.md` with each change, so friends know what they get when they update.

## Credits

- The storyline, design-spec, motion, sound, caption and review rules are adapted from HeyGen's [HyperFrames](https://github.com/heygen-com/hyperframes) skills (Apache-2.0), rewritten for this Remotion pipeline.
- `hyperframes/` holds seven of HeyGen's HyperFrames skills (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `reverse-any-video`, `style-sampling`, `remotion-to-hyperframes`), copyright HeyGen, Apache-2.0, from commit 4c92e37 (2026-11-27). They were changed to work inside this skill and to never send usage data; every changed file is listed in `hyperframes/NOTICE.md`.
- `references/remotion/` was written for this skill in its own words from what [Remotion](https://www.remotion.dev)'s public agent skills teach (4.0.547). Remotion's API names belong to Remotion; Remotion itself has its own licence (see "What you need").
- `references/screen-demo.md` is adapted from the `ui-demo` skill by affaan-m ([affaan-m/ecc](https://github.com/affaan-m/ecc), MIT).

## License

MIT for this skill (see `LICENSE`), except `hyperframes/`, which stays Apache-2.0 (see `hyperframes/LICENSE` and `hyperframes/NOTICE.md`).
