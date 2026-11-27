# Storyboard, design file and approval gates

Ideas borrowed from HeyGen's HyperFrames skills (`product-launch-video`, `faceless-explainer`, `general-video`, reviewed 2026-10-15; then `hyperframes` and `hyperframes-cli`, installed and read 2026-11-17: the spec, the banned defaults, captions and the worker split), adapted to this Remotion pipeline. HyperFrames as an engine is in hyperframes.md.

## Contents
- The files and the order they are made in
- design.md template
- Numbers instead of adjectives
- Banned by default
- STORYBOARD.md template
- Approval gates
- Parallel scene workers
- Captions that earn their place
- Freshness and usage checks

## The files and the order they are made in

| File | Made at | Holds |
| --- | --- | --- |
| `brief.md` | Interview | What the person wants (brief.md in this folder) |
| `STORYLINES.md` | After the brief, when the story is open | Three different films in words, the pick first (story-and-comedy.md, "Three storylines") |
| `design.md` | After the brief (and the storyline), before the script | The look and motion as numbers, and what the video must never become |
| `story.json` | Script | The words, per scene |
| `STORYBOARD.md` | After the script | Per scene: the line, the visuals, the sound, the word each visual lands on |
| the Remotion project | Build | The scenes, from the storyboard |
| `REVIEW.md` | After the review pass | The creative calls, what was measured, the weakest shot (review.md) |

Each file feeds the next and nothing is built from memory. If something changes, change the earliest file it touches, then everything after it.

## design.md template

Write it from the brief's look-and-feel answers, the picked storyline and the person's real brand assets. Keep it to one screen. Every line is a number or a name, never an adjective (next section). `setup-project.mjs` writes `theme.ts` from two of its lines, so keep their shape: "Palette:" names each colour before its hex (`background #12332F, text #F4EFE6, accent #E8643C`, plus any others such as `paper #F4EFE6`), and "Fonts:" names each font after its role (`headline Bricolage Grotesque 800, ...; body ...; terminal IBM Plex Mono 500`), with a script font in brackets after "script support" if one is wanted.

```
# Design
- Goal: what the viewer feels or does at the end, one sentence
- Output: <W x H>, 30 fps, <seconds> s = <frames> frames; music <BPM> = <frames per beat> frames a beat
- Palette: background #..., text #..., accent #... (where it may appear: one word, the payoff, the end card), plus one alert/pop colour
- Fonts: headline <font> <weight> <px> <tracking>, body <font> <weight> <px>; script support: <Latin | Arabic | Kurdish Sorani>
- Medium: what the look is made of (photos on paper, the product's real UI, risograph print, clay...) and its numbers: grain %, shadow offset/blur/opacity, vignette %
- Objects: everything the viewer must recognise, drawn with what makes it read without a label (a mirror is silvered glass with a bright edge and a mount, not a bar)
- Logo: <file>, safe area <px>, where it lands (once, with weight, usually the end card)
- Motion: eases by job (arrival, camera, exit; motion.md), springs as a bounce ratio, durations and staggers in frames
- Text: headline >= <px>, supporting >= <px> (28 px minimum at 1080 wide), caption position y=<px>, safe zones <platform>
- References: <what they showed>, and the grammar taken from it (shot lengths, how titles enter and leave, transitions), marked measured or guessed
- Never: the banned defaults below that apply, plus <things this video must not become, e.g. letter-by-letter reveals for Arabic/Kurdish, text over busy areas without a backing>
- QA: the frames to check, and what each must show
```

Use `@remotion/google-fonts` for fonts, and check by eye that Arabic or Kurdish text renders joined and in the right direction. If the project already has a design spec (`design.md`, `DESIGN.md` or `frame.md` with colours and fonts in its frontmatter), its hex values, fonts and weights are exact; its sizes and spacing are yours to scale for video, since a 1 px border from a web page vanishes on screen.

**The template's look** (`theme.ts`: near-black background, Space Grotesk and JetBrains Mono, a terracotta accent) was made for the "My life with Claude" story. Keep it for that kind of video; for anything else, take the look from the brief, the brand or the subject. `theme.ts` is where `design.md`'s palette and fonts become code (`setup-project.mjs --brand` writes it from a brand kit); keep the two in step.

**Ready-made looks.** This skill's `hyperframes/hyperframes/assets/frame-presets/` has 13 slide-deck looks, each a `FRAME.md` spec (palette, fonts, rules) with a contact sheet: `biennale-yellow` (museum catalogue), `blockframe` and `creative-mode` (neobrutalist), `blue-professional` (consulting), `bold-poster` (vintage poster), `broadside` (protest poster), `capsule` (friendly pills), `cartesian` (quiet catalogue), `cobalt-grid` (two-colour risograph), `code-editorial` (developer brand book), `coral` (bold magazine), `daisy-days` (picture book), `editorial-forest` (literary). Use one when the person names it or wants that feel, never as the fallback for a video without a brand. Read its `FRAME.md` into `design.md`; fonts it names that aren't on Google Fonts need their files.

## Numbers instead of adjectives

Adjectives are where the default look lives. Given "premium, modern, clean", every gap gets filled with the same defaults run after run: a dark void, a glow, small type floating in the middle, everything fading in. Every adjective turned into a number is a decision taken back from those defaults. The look serves the story; a look that turns the story's things into abstract shapes has failed, however striking the frame.

| The word | Becomes |
| --- | --- |
| premium | a material with numbers: satin paper with 2% grain, a product on a seamless sweep with a 0.55 contact shadow |
| modern | a camera and a type system: a 30-frame push on one ease, a headline at 9% of the frame height with -2% tracking |
| clean | a grid and a ration: 12 columns, 96 px margins, the accent on one word per shot |
| dynamic | cuts on the beat, a layout change on the bar (every 4 beats), one hero move per shot |
| playful | springs at a 0.45 to 0.6 bounce ratio on position and scale (never on opacity or colour), poses exaggerated 10 to 30% |
| cinematic | a lens and a light: a 35 mm framing, a key light from the upper left, a rim from behind, 6% vignette |
| warm (a tribute) | the person's real photos on paper with a 2 to 3% grain, a soft 8 px shadow, slow pushes of 1.0 to 1.08 over a whole scene |

**Composition numbers:**
- The hero of a shot fills at least 40% of the frame's height or width. A small object in the middle of an empty frame is never a shot: push in, crop, or give it a world.
- One hero move per shot (motion.md).
- In a story, every shot moves the story: something happens that causes the next shot. Lines read as cause and effect ("so...", "which means..."), not slogans.
- An information card (a data beat, a card over a talking head, a vertical explainer card) is different: its information is on screen within about 2.5 s, then it holds, so any paused frame reads as a finished poster.
- Something new every 2 to 4 s.
- Text meant to be read: at least 28 px at 1080 wide, held 0.5 s + 0.3 s a word. Too many words: cut words, never shrink the type.

**A look built from a medium** holds together when it is the rules of one medium, not a palette. A risograph look is five parts and nothing else: paper (one flat colour with a fibre noise, no gradients); ink A (every word that must be read); ink B (one fluorescent accent, one focus per frame); overprint (where inks overlap, a third colour, the B plate 3 px off register); halftone (every gradient is dots). Motion comes from the same medium: paper is cut and lifted, ink is printed plate by plate, glass refracts, clay is pressed.

**Video facts:**
- Full-screen linear gradients on dark backgrounds band (visible stripes) after H.264 compression: use a radial gradient, a solid fill, or a solid with a local glow.
- An accent at 5% opacity disappears in compression: 15 to 25% for atmosphere, full strength for the focal element.
- Inter, Space Grotesk, Instrument Serif, Geist and JetBrains Mono are where generated design lands. Use them when the brand does, not by default.

## Banned by default

Where a generated video lands when nothing else is decided. Each is banned unless the brand's own material or the person's reference uses it, and then only as they use it. Copy the ones that apply into the Never line of `design.md`:

- a black or dark navy void as the background, with small elements floating in its middle;
- glow, bloom, neon, lens flares, glowing orbs and rings; floating particles as decoration;
- purple or blue gradients, mesh gradients, glass cards;
- a cream or off-white paper background with a serif headline, italic accent words, numbered "01 / 02" labels, small monospace caps labels, pill-shaped chips and buttons;
- everything centred; everything fading in at once; every element fading and sliding up;
- text that moves while it is read; titles that keep drifting after they land;
- corner labels, frame borders, corner brackets, HUD readouts as decoration;
- three cards in a row, KPI grids, a title over a dimmed screenshot;
- the logo docked in a corner.

The funny story keeps its own grammar (stickers, stamps, meme zooms, the dark terminal): those are the style, chosen on purpose, not defaults. After the first stills, name every default the video used anyway, from this list or not, add it to the Never line and fix it. The list grows with every video.

## STORYBOARD.md template

One row per scene, written before any scene component:

```
| # | id | Line (text) | On screen | Sound | Lands on word | Seconds (from voice) |
|---|----|-------------|-----------|-------|----------------|----------------------|
| 1 | freeze | "Yep. That's me." | Their clip freezes, white flash, sticker | record scratch | "me" | 3.2 |
```

Fill "Seconds" only after the voice step, with `sync-story.mjs --seconds`; never guess it. `sync-story.mjs` turns the approved table into `story.json` (the "Line" column becomes the captions, "On screen" the placeholder's `board`), so the words live in one place: change them here, then sync. Mark scenes that need a file the person hasn't sent yet ("needs: logo.svg"). Use the storyboard to spot problems early: a scene with two ideas, a scene with no visual, two gags in a row, a hook that takes more than three seconds.

## Approval gates

Stop and get a clear yes from the person at these points. Do not continue on silence, and do not treat a gate as passed because the person said "go ahead" about something else.

1. **Brief** (end of the interview): "Anything to change?" Then save `brief.md`.
1b. **Storyline** (only when the story is open; story-and-comedy.md, "Three storylines"): show the three, recommended first, and wait for a pick. A mix ("A's opening with C's middle") is one storyline.
2. **Script and storyboard:** show the lines and the storyboard table. Changing words is cheap now and expensive later.
3. **Voice:** the person picks the narrator by ear from samples.
4. **Preview:** show the Studio preview or the key stills. Ask what to change before rendering.
5. **Final render and delivery:** render only after the preview is approved, or when the person explicitly asks for the file.

In an unattended session (the person is away), do the preparatory work, write down what you assumed, and stop at gates 2, 3 and 4 rather than guessing; those are where wrong guesses cost the most.

## Parallel scene workers

Up to about six short scenes, build them yourself in one context: HyperFrames measured about 9 minutes for five scenes in one context against about 21 minutes split across subagents. Beyond that (a recap with 10 scenes, a long explainer), build in parallel, giving each subagent two or three scenes and starting them all at once; a second wave nearly doubles the time. On a PC with little memory, keep it to three workers at a time. Give each one only `brief.md`, `design.md`, its storyboard rows, the shared components (`layout.ts`, `Title`, `EndCard`, `PhotoFill`, `PhotoCard`, `Devices`, `Cursor`, `Stamp`, `Counter`, `Sfx`, `Narration`, `motion.ts`), motion.md and the voice timings for its scenes. Each returns its scene components. The main session then adds them to `scenes.tsx`, sets each scene's `enter` and the music's silences in `story.json`, runs the review sheets, and fixes the seams (transitions, music ducking, repeated visuals).

## Captions that earn their place

The standard is clear word-by-word or phrase captions in the safe zone (`Narration`, production.md). What makes them read well, from HyperFrames' caption rules:

- **Group size by energy:** 2 to 3 words for high energy, 3 to 5 conversational, 4 to 6 calm. Break at a sentence end, at a pause of 150 ms or more, or at the word limit. One group on screen at a time.
- **Not at 0 s.** A caption that is there on the very first frame looks pre-existing; start it 0.1 to 0.3 s in.
- **Fade the group or its words, not both:** the opacities multiply and read as a pop.
- **Over footage:** pick by the brightness behind the text (0 to 255): under 60, light text needs nothing; plain captions over anything brighter get a scrim sized to the text at 30 to 40% opacity, never a full-width bar. Never over the speaker's face.
- **Burned-in subtitles.** Footage may already carry subtitles in only part of the clip: check a 1 frame-a-second contact sheet (toolbox.md, "Verification tools") before placing captions.
- **Don't caption what the screen already says:** hide those words with `hideWords`, and never let the narrator read a title on screen word for word.

A more cinematic option is to place one big word behind the speaker, between the footage and a cut-out of the person (`hf remove-background`, hyperframes.md, or media-use), at the single most emotional word. It reads best 30 to 55% covered: under about 15% it floats, over about 65% it is eaten, and heads move, so check it over the word's whole time on screen. The HyperFrames `embedded-captions` skill calls embedding every word the common mistake: keep it for one or two peaks, and offer it only when the style is cinematic and the footage is a single person talking to camera.

## Freshness and usage checks

- Before relying on a CLI (`heygen`, the `hf` launcher, Remotion), check it is installed and current; if an update fails, say so and don't continue from memory of how it used to work.
- If the HeyGen tools report usage limits, check them at the start and again before the final render, and tell the person what is left. If usage is unknown, say so rather than guessing.
- Run `hf media-use resolve --doctor` (hyperframes.md, "Setup and telemetry") before the first catalog search to confirm setup.
