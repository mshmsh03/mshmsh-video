# Motion

How things move, enter, leave and cut. Read it before building scenes, and again when the person says "it feels like slides", "too fast" or "the titles move". The numbers come from HeyGen's HyperFrames skills (Apache-2.0, measured frame by frame on their launch films; adopted 2026-11-17), translated from GSAP to Remotion. They are defaults: a reference the person gave, or a beat that breaks a rule on purpose, wins for that beat.

## Contents
- Eases and springs in Remotion
- Moves, exits, overlap and stagger
- Titles: entrances, holds, sizes
- Rhythm and the beat grid
- Transitions with a cause
- The right mechanism
- Moves that look generated
- When the person says...
- Common faults

## Eases and springs in Remotion

Pick the ease by the job it does. The same ease and duration on everything is the flat default that makes a video feel generated.

| Job | GSAP name | Remotion |
| --- | --- | --- |
| An arrival: lands on a long tail | `expo.out`, `power4.out` | `Easing.bezier(0.16, 1, 0.3, 1)` (the template's `easeOut` in `motion.ts`), or `Easing.out(Easing.exp)`, `Easing.out(Easing.poly(5))` |
| A camera move or a colour flood: eases both ways | `power2.inOut` | `Easing.inOut(Easing.cubic)` |
| A zoom through, or an exit: accelerates | `power3.in` | `Easing.in(Easing.poly(4))` |
| Rotation, progress, constant speed that is the point | `none` | no easing (linear) |

GSAP's `power1` to `power4` are `quad`, `cubic`, `poly(4)` and `poly(5)`.

**Springs are named by how much they bounce** (the damping ratio): 1.0 never bounces, 0.7 to 0.85 reads premium, 0.4 to 0.6 playful, under 0.3 a cartoon. In Remotion's `spring({ frame, fps, config })` the ratio is `damping / (2 × √(stiffness × mass))`. With the defaults (stiffness 100, mass 1) that is `damping / 20`, so:

| Feel | Ratio | `config` |
| --- | --- | --- |
| No bounce | 1.0 | `{ damping: 20 }`, or `overshootClamping: true` |
| Premium | 0.7 to 0.85 | `{ damping: 14 }` to `{ damping: 17 }` |
| Playful | 0.4 to 0.6 | `{ damping: 8 }` to `{ damping: 12 }` (Remotion's default 10 is 0.5) |
| Cartoon | under 0.3 | `{ damping: 5 }` or less |

Position and size may bounce. Opacity and colour never do: interpolate them without a spring. The template's `popIn` (damping 9) is the playful sticker slap; use it for stickers, not for UI or titles.

## Moves, exits, overlap and stagger

- **One hero move per shot.** Secondary moves travel 50 to 70% as far, start 100 to 200 ms after it, and everything else holds still.
- **A fast move** takes 0.3 to 0.6 s. Give it motion blur that peaks at its fastest frame: about 6 to 12 px on text-sized elements, 15 to 20 px on a full-frame move. Interpolate a CSS `filter: blur()` up and back down across the move. For a horizontal-only smear, use an SVG filter with `<feGaussianBlur stdDeviation="12 0" />` and `filter: url(#smear)`. `@remotion/motion-blur` (`<CameraMotionBlur>`, `<Trail>`) gives a truer blur but renders several samples per frame; on a weak PC keep it to one or two shots.
- **Arrive slow, leave clean.** Arrivals ease out on a long tail and take longer than exits. An exit is one smooth motion, never slide, stop, then leave. Entrances that are too snappy read as glitches; slowing the whole video by about a second often fixes that.
- **Exits are 40 to 50% shorter than their entrances.**
- **Overlap.** The next element starts when the previous one is 30 to 50% done. Fully one-after-another looks robotic; everything at once looks cheap.
- **Stagger.** Letters a frame apart, words 60 to 120 ms apart, list items 40 to 80 ms apart.
- **Cut at the fastest frame of a move**, with the same direction and speed on both sides. A click into a new screen is a match cut on the click; the new screen comes in slightly large (about 104%) and settles.

## Titles: entrances, holds, sizes

- **A landed title is dead still.** The motion moves on to the next element, the camera or the world behind it. A title that keeps drifting, scaling or "breathing" after it lands is a tell.
- **Vary the entrance within a video.** The template's `fadeUp` is one entrance among several; don't give every element a fade and slide up. Options:
  - per word: blur 6 px → 0 and opacity 0 → 1 over 0.13 s, words 0.067 s apart, no movement;
  - per word from light grey to the ink colour, 0.07 to 0.1 s apart, no movement;
  - the whole line blurring in, 8 px → 0 over 0.13 to 0.2 s;
  - per letter, for a name: 0.1 s apart, opacity 0.3 → 1 with a slight blur;
  - behind the subject: the title sits between the photo or clip and a cut-out of the person (hyperframes.md, "File tools");
  - one word rolling through options like a slot machine, about 0.1 s a roll.
- **Arabic and Kurdish:** per-letter reveals break the joined letters. Use the per-word or whole-line entrances.
- **Holds.** A line the viewer must read stays on screen about 0.5 s plus 0.3 s a word; the video's last line at least 2 s. A one- or two-word chapter line may hold 0.4 s. Then it leaves with a blur-out and fade of 0.13 to 0.25 s, word by word, or with the scene's move.
- **Size.** A title is 4 to 9% of the frame height (77 to 173 px at 1920 tall), one or two lines. Quiet lines 2.5 to 4%, against hero words that fill 60 to 90% of the width. One highlighted word in the accent colour, and it carries meaning.
- **Text meant to be read** is at least 2.6% of the frame's short side (28 px at 1080 wide). Too many words: cut words, never shrink the type.

## Rhythm and the beat grid

- **Contrast speeds.** Montages cut every 0.13 to 0.8 s; a demo holds one framing for 7 to 10 s while the screen acts; shots average 1.8 to 3 s with motion inside them. Hold 0.3 to 0.75 s before the payoff, then play the payoff at normal speed.
- **Something new every 2 to 4 s** across the video; a new layout every bar when there is music.
- **Motion that works when it keeps going:** the product's UI working, footage playing, a character acting, a 3D scene turning, a slow orbit of a background (3 to 5° a second).
- **The beat grid.** Frames per beat = `fps × 60 / BPM`. Compute each beat from its index, `Math.round(offset + i × fps × 60 / bpm)`, never by adding a rounded beat again and again: at 128 BPM and 30 fps that drifts 2 frames in 32 beats. Get the BPM and beat times from `hyperframes beats` (hyperframes.md). Cut on the beat, change the layout on the bar (4 beats).
- **Landing on a hit.** A move that must land on a music hit starts 40 to 190 ms early; a reaction starts 0 to 45 ms after. The hit itself is an instant change with no easing: an eased hit has no punch.

## Transitions with a cause

Use 3 to 5 kinds in a video, each caused by something on screen. Hard cuts belong inside a scene (punch-ins); at most a third of the seams between scenes are hard cuts. The template fades between scenes that share one look and slides with a whoosh at chapter changes, which suits a narrated story. When a scene moves to a different world (a new background, light or scale), enter it through an object on screen instead of crossfading. These are the options:

| Transition | How to build it |
| --- | --- |
| Zoom through a button | the camera tracks to the button with blur (0.6 s), then the button scales from about 8% to about 250% of the frame in 0.35 s on a strong ease-in; its fill becomes the next frame |
| Object becomes the world | a pill or card grows past the frame in 0.65 s (ease in-out), its corner radius shrinking; what was around it blurs about 15 px and fades in 0.3 s; the new content fades in while it still grows |
| Morph | one container widens into the next (an icon card into a prompt box, about 110 → 880 px in 0.2 s, `Easing.out(Easing.poly(4))`) with a horizontal blur 12 → 0 |
| Carry across | the result shrinks 1 → 0.6 with blur peaking at 6 px mid-move and lands inside the next app as it builds around it |
| Colour flood | the hero object stays while the whole background changes colour in about 0.4 s, `Easing.inOut(Easing.cubic)` |
| Whip | a horizontal or vertical smear of 0.13 to 0.3 s; the arriving element lands blurred and sharpens in about 0.13 s |
| Iris from the click | `clipPath: circle(<r>px at <x>px <y>px)` opens from the clicked point onto the next world in 0.15 s |
| Dip cut | the outgoing frame darkens about 40% for 3 frames before a hard cut, so the cut reads as meant |
| Blur swap on one stage | out: opacity → 0 with about 8 px blur in 0.13 to 0.2 s; in: blur → 0 in 0.13 s; the background never cuts |

Build these inside the scenes (the outgoing scene ends on the move, the incoming one starts from its end state) or as a custom presentation in `@remotion/transitions`. Then check the seam with stills just before and after it (review.md).

## The right mechanism

| Request | In Remotion |
| --- | --- |
| Punch-in, zoom, pan, Ken Burns, reframe | `scale` and `translate` on a wrapper `<div>` around the media, never on the `<Video>` or `<Img>` itself; chain the states with `interpolate` over several keyframes |
| Crop or mask reveal | `clipPath` or a CSS mask on an inner wrapper |
| Constant speed change | `playbackRate` on `<Video>` / `<OffthreadVideo>` |
| Speed ramp | prepare the clip with ffmpeg (`setpts`) or split it into pieces at different rates; Remotion has no ramp built in |
| Hold or freeze | the template's `FreezeScene`, or a still exported with ffmpeg and placed as its own clip |
| Randomness (shake, confetti, jitter) | `random(seed)` from `remotion`, never `Math.random()`: every render must give the same frame |
| Hand-drawn wobble | redraw the outline about 12 times a second with a jitter seeded by `Math.floor(t × 12)`, so the line boils while the shape holds still |
| An animated emoji or icon | `<Emoji>` (Google's animated emoji, `free-emoji.mjs get <name>`), or a Lottie file through `@remotion/lottie`; both follow the frame, unlike a GIF from the web (toolbox.md, "Animation resources") |
| Remove pauses from a talking clip | `cut-silence.mjs`, then `<CutClip>` plays the kept parts (toolbox.md, "Editing tools") |

CSS `transition`, CSS `animation` and Tailwind animation classes do not render in Remotion (remotion-markup); drive everything from `useCurrentFrame()`.

## Moves that look generated

Breathing, floating or pulsing loops standing in for motion on titles and UI; titles that keep sliding or scaling after they land; a slow creeping zoom on a title or late in a scene; bounce on UI; click rings; every scene entering the same way; every element fading and sliding up. A character's idle breath and overshoot are acting, not these (styles.md, "Character or mascot short").

## When the person says...

| They say | Change |
| --- | --- |
| "too fast" | slow every zoom and pan to 0.7× its speed, nothing else |
| "speed this up" | speed the content and shorten the scene by the same amount; later scenes move up (shorten `hold` and the lines, then re-run `make-voice.mjs`) |
| "the titles move" | land them, then hold them dead still until they leave |
| "it feels like slides" | enter the next scene through an object on screen; cut a move mid-flight |
| "it's too busy" | remove a third of the motion and keep the moves that lead the eye |

## Common faults

| Symptom | Usual cause |
| --- | --- |
| A jump at a cut | the outgoing and incoming states differ at the seam: render stills just before and after it |
| The ease looks off at a handoff | the speeds don't match across the seam: mirror the ease (accelerate out, decelerate in) |
| Flicker or a different frame each render | `Math.random()`, `Date.now()` or a CSS animation; use `random(seed)` and frame-driven values |
| A gag lands during the fade | the transition overlaps the last frames of the scene; raise its `hold` (production.md, "Pitfalls") |
