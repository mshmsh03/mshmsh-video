# video-xoshaka

A Claude skill that makes a whole video with you, from "make me a video" to a finished MP4. It works in [Remotion](https://www.remotion.dev) (videos written as React code), so every video is a real project you can change and re-render.

It asks you questions first, writes a short brief, pitches three different storylines when the story is still open, then writes a design file, a script and a storyboard. Nothing is built until you approve the words. Then it adds a narrator, word-by-word captions, music and sound effects, builds the scenes, reviews them frame by frame (contact sheets of every scene, every cut and the phone view) and hands you the file.

It can make funny stories, sincere tributes, product promos and launches, explainers, tutorials, recaps, announcements, music videos, number and data stories, pull-request videos, talking heads with cards, 3D and character shorts, vertical (Reels, TikTok, Shorts, WhatsApp Status) or landscape.

If you want to keep editing the video yourself afterwards without code, it can build in [HyperFrames](https://github.com/heygen-com/hyperframes) instead of Remotion.

## Install

**Claude Code (recommended, full version with scripts and template)**

```bash
npx skills add mshmsh03/video-xoshaka
```

Or by hand: download this repo and put the folder at

- Windows: `C:\Users\<you>\.claude\skills\video-xoshaka`
- macOS / Linux: `~/.claude/skills/video-xoshaka`

Restart Claude Code, then type `/video-xoshaka`.

**Claude app:** only `SKILL.md` is needed for the interview, the script and the storyboard. Zip a folder with `SKILL.md` and upload it in the app's skills settings. The real video build needs Claude Code (or any computer with Node.js).

## What you need

- Node.js 18 or newer. The skill sets up Remotion itself.
- Remotion is free for individuals and small teams (up to 3 people). Bigger companies need a paid licence: see [remotion.dev/license](https://www.remotion.dev/license).
- Optional: the HeyGen CLI for real royalty-free music (Linux and macOS; on Windows it runs inside WSL). Without it, the skill asks you for a track or another source.
- The free narrator voice (Kokoro) downloads a model of about 330 MB the first time. It speaks English.
- Optional, for Arabic and other languages: Python 3 with `python -m pip install edge-tts` for free Microsoft Edge voices (Iraqi, Saudi, Egyptian Arabic and many more), with right-to-left captions.
- Optional, for Sorani Kurdish: free F5-TTS Central Kurdish voices (Python, PyTorch on the CPU, a 1.35 GB download per voice, about an hour of CPU time for a 90-second video). Their licence is non-commercial only, so for client or paid work record your own voice. Kurmanji has no tested free voice yet.
- Optional: ffmpeg for converting phone clips, checking renders and the review contact sheets. Remotion's bundled copy covers the basics.
- Optional: the HyperFrames skills (`npx skills add https://github.com/heygen-com/hyperframes --skill hyperframes`, plus `--skill hyperframes-cli`) and Node.js 22+, for the HyperFrames engine and its file tools: beat and section detection for music, loudness checks, website capture (screenshots, colours, fonts, logos), transcription and background removal. HyperFrames sends usage data to HeyGen unless you turn it off (`HYPERFRAMES_NO_TELEMETRY=1`).

## How a video is made

1. **Interview.** Short multiple-choice rounds (style, where it will be posted, length, voice, look, music, names, captions, ending), then a few free-text questions only you can answer. Say "just make it" for the quick version.
2. **Brief.** Your answers are saved as `brief.md`. It is the contract for every later step.
3. **Storyline, design file, script and storyboard.** When the story is open, you pick one of three storylines. The design file turns words like "premium" into numbers (colours, sizes, eases, frames) and bans the generated-video defaults by name. You approve the words before anything is built.
4. **Voice.** You pick the narrator by ear from short samples.
5. **Preview.** A live Remotion Studio preview opens early, so you can steer while it builds.
6. **Build.** One component per scene, each visual landing on its spoken word, with motion rules for eases, titles and transitions.
7. **Music and sound.** Real royalty-free music, started at its strongest section and ducked under the voice; sound effects only on what happens on screen.
8. **Review.** Contact sheets of every scene, every cut and the phone view, ranked notes (P0, P1, P2) and fixes, loudness measurement, frames from the final file. You approve before the final render.
9. **Deliver.** The file, the creative calls, what was checked, and what could not be (the audio is never heard by Claude).

## What is in this repo

| Path | What it is |
| --- | --- |
| `SKILL.md` | The skill: the workflow and principles |
| `references/` | The interview, styles and safe zones, storylines and scripting and comedy, the design file and gates, motion, production notes, music and sound design, the review pass, HyperFrames, toolbox |
| `scripts/` | Voice samples, narration with word timings (Kokoro, Edge TTS or Sorani F5), beat-grid timing for videos without a narrator, HeyGen music search, stills and review contact sheets, audio check |
| `assets/template/` | Starter components: timeline, captions, photo card, device mockups, terminal, counter |
| `evals/` | Test prompts and assertions for the skill |

The author's own example video (with real people in it) is not published. Use `assets/template/` as the starting point.

## Update

```bash
npx skills update
```

or pull this repo again.

## Credits

The storyline, design-spec, motion, sound, caption and review rules are adapted from HeyGen's [HyperFrames](https://github.com/heygen-com/hyperframes) skills (Apache-2.0), rewritten for this Remotion pipeline.

## License

MIT. See `LICENSE`.
