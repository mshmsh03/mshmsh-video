# Coming back to a video, and brand kits

Most videos come back: a price was wrong, the client wants a 15-second cut for Stories, the same video in landscape for the website, the Kurdish version, next month's offer. Done from scratch, each of these is a whole new video; done from the files this skill leaves behind, it is usually one small change and a check.

## Contents
- First, read what's there
- Which file each request changes
- A second cut in the same project
- Versions and what never gets overwritten
- Brand kits

## First, read what's there

Before changing anything, read `brief.md`, `design.md`, `STORYBOARD.md`, `REVIEW.md` and `story.json`, and look at what changed since the last session (`git status` or `git diff` if it's a repo, file times otherwise). The person may have edited code or text in the Studio: assume their edits were on purpose and build on them, or ask. `REVIEW.md` says what was weak last time and which warnings were kept on purpose, so don't "fix" those.

Run `node scripts/doctor.mjs` once: an older project may predate the current scripts. `node <skill>/scripts/setup-project.mjs . --update` brings its shared components and scripts up to date, backs up anything it replaces in `.mshmsh-video-backup/`, and never touches `story.json`, `scenes.tsx`, `theme.ts`, `Root.tsx` or `voice.json`. If the person changed a shared component themselves, tell them before updating and point at the backup.

The interview shrinks to what is new. Don't re-ask anything `brief.md` already answers; confirm it in one line ("Same voice, music and captions as the March video?").

## Which file each request changes

Change the earliest file the request touches, then everything after it (storyboard-and-gates.md, "The files and the order they are made in").

| Request | Change first | Then |
| --- | --- | --- |
| A word, a name, a price, a date | `story.json` (and `brief.md` when it's a fact) | `make-voice.mjs` re-speaks only that scene; `review-check.mjs`; stills of that scene and its seams |
| A wrong fact in the narration after delivery | the same, plus the source | for a Sorani F5 voice, re-speak only the changed scenes into a new raw folder (toolbox.md, "Correcting a few lines later") |
| A shorter cut (15 s from 60 s) | a new cut (below) with its own `story.json` | keep the hook, the one thing, the payoff and the end card; drop the middle beats, never squeeze them; one idea a scene still holds |
| Another format (9:16 to 16:9, or 4:5) | a new composition in `Root.tsx` with its size and platform | shared components reposition themselves (`useLayout()`); positions typed into a scene don't, so check every scene in both review sheets; landscape layouts are rebuilt, not stretched (styles.md, "Formats and safe zones") |
| Another language | a new cut with its own `story.json`, voice and `"direction": "rtl"` for Kurdish or Arabic | a script font (`setup-project.mjs --script sorani` writes one; production.md lists fonts with ڕ ڵ ە ۆ ێ); the voice by ear (toolbox.md); a native speaker reads the final text |
| Next month's offer, edited by their staff | the editable fields (production.md, "Text someone else will edit later") | test the longest and the empty text in the review sheets |
| Different music | `public/bgm/track.*` and `story.json`'s `music.gain` and `music.offset` | measure the new track (music.md), `check-audio.mjs` |
| A different look | `design.md`, then `theme.ts` | review sheets for every scene: a palette change shows where a colour was hard-coded |
| "Make it better" with nothing specific | `REVIEW.md`'s weakest shot | sharpen timing and wording before adding anything (SKILL.md, "Principles") |

## A second cut in the same project

A second cut (a short version, a landscape version, a language) gets its own copy of the story folder and its own composition, so the two never share timings:

1. Copy `src/story/` to `src/<cut>/` (for example `src/short/`). Everything in it imports relatively, and `../layout` and `../theme` stay shared. Delete the copies of components the cut won't change if you like, and import those from `../story/` instead.
2. Rewrite `src/<cut>/story.json` and `src/<cut>/scenes.tsx` for the cut.
3. Speak it into its own files: `node scripts/make-voice.mjs --story src/<cut>/story.json --out src/<cut>/voice.json --audio public/voice-<cut>` (add `--draft` until the words are approved; for Sorani, `speak_story.py --story src/<cut>/story.json --out out/voice-raw-<cut>`, then `--raw out/voice-raw-<cut>`).
4. Register it in `Root.tsx` next to the first one, with its own size and platform:

   ```tsx
   import { StoryVideo as ShortVideo } from "./short/StoryVideo";
   import { STORY_VOICE as SHORT_VOICE } from "./short/voice";
   // ...
   <Composition id="Short" component={ShortVideo} durationInFrames={SHORT_VOICE.totalFrames}
     fps={SHORT_VOICE.fps} width={1080} height={1920} defaultProps={{ platform: "reels" as const }} />
   ```

5. Check it with its own files: `stills.mjs Short review --voice src/<cut>/voice.json`, `review-check.mjs --story src/<cut>/story.json --voice src/<cut>/voice.json`, `check-audio.mjs out/<file> --voice src/<cut>/voice.json`. Without `--voice`, the checks measure the first cut's timing and report nonsense (check-audio once reported the music louder than the speech that way).
6. Render it under its own name: `node scripts/render.mjs Short --name reel-short`.

## Versions and what never gets overwritten

- `render.mjs` always writes the next free version, so an approved render is never replaced. Deliver the new file by name and say what changed.
- Keep the old raw voice folder when re-speaking, so the old version can be rebuilt and compared.
- Add a dated line to `REVIEW.md` under "Changes" for each round: what was asked, what changed, what was checked. The next session reads it first.
- When a change undoes something the person approved earlier, say so before doing it.

## Brand kits

A brand kit is one small folder per brand the person makes videos for, kept outside any single project so every video for that brand starts from it: `<their projects folder>/brands/<brand>/`. Ask once where their projects live; don't put it inside a video project.

```
brands/shirin-sweets/
├── brand.json     colours, fonts, logo, handle, call to action, voice, music, tone, never
├── logo.svg       the real logo, as they gave it (never redrawn)
├── fonts/         font files that aren't on Google Fonts, if any
└── notes.md       anything else the person said about the brand, in their words
```

```json
{
  "name": "Shirin Sweets",
  "colors": { "background": "#FFF6EC", "panel": "#F3E4D2", "border": "#E2CBB0", "text": "#2B1A12", "muted": "#8A6F5E", "accent": "#C2410C" },
  "fonts": { "heading": "Poppins", "mono": "IBM Plex Mono", "script": "Vazirmatn" },
  "logo": "logo.svg",
  "handle": "@shirin_sweets",
  "cta": "Order on Instagram: @shirin_sweets",
  "voice": "ar-IQ-RanaNeural",
  "music": "warm acoustic, light percussion, 100 bpm",
  "tone": "warm and local, never corporate",
  "never": ["prices on screen", "the old logo", "staff faces"]
}
```

- **Using it:** `setup-project.mjs <dir> --brand <path>/brand.json` writes the colours and fonts into `theme.ts` and copies the logo to `public/brand/`, where `EndCard` finds it. In the interview, the kit answers the colours question, and its voice, music, call to action and `never` list go into the recap as defaults to confirm, not to ask again. Its `never` list goes into `design.md`'s Never line and the brief's "Never show".
- **Making one:** after the first video for a brand, offer once to save its kit from what was decided: the brand's real files, the colours and fonts from `design.md`, and only what the person said. A website gives the colours, fonts and logo in a minute (`hf capture`, hyperframes.md; production.md has the rules for reading brand colours off a site). Fonts named in the kit must be Google Fonts names for `setup-project.mjs` to load them; otherwise put the files in `fonts/` and load them with `@remotion/fonts`.
- **What stays out:** a kit is shared material, so no prices they charge, no client-internal names, no unreleased work, nothing from the "never" list itself beyond its label.
- **When the brand changes:** update the kit first, then the projects that use it. Old projects keep their own `theme.ts`, so an old video re-renders the way it was approved.
