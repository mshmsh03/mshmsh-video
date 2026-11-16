# Review

You wrote the timeline, so you know what happens. The viewer sees it once, at full speed, often on a phone. Review is how you see the video the way they will: as a harsh motion director, not a proud author. The stills and audio checks in production.md catch what is broken; this pass catches what is weak. Run it on every new video, and on any edit that changes timing or layout, before showing the preview or rendering.

Adapted from HeyGen's HyperFrames `review.md` and its `check` warnings (Apache-2.0, adopted 2026-11-17). HyperFrames measures these with `hyperframes check` and `snapshot --review`; in Remotion you measure them from `voice.json` and the stills below.

## 1. Measure, then look

1. **The numbers.** Go through `voice.json`, `story.json` and the scene code once for each of these. A hit is a question, not a rule: fix it, or keep it on purpose and say why in `REVIEW.md`.

   | Check | Fails when |
   | --- | --- |
   | Line unread | a line meant to be read is on screen for less than 0.5 s + 0.3 s a word (the last line: under 2 s) |
   | Dead stretch | more than 3 s with nothing new on screen |
   | Text too small | text meant to be read under 2.6% of the frame's short side (28 px at 1080 wide) |
   | Empty first frame | frame 0 is black, empty or only a logo; it is the thumbnail on social players |
   | Silent film | a video over 15 s that tells something has no music or sound (unless the person asked for silence) |
   | Off the safe area | words outside the platform's safe band (styles.md, "Formats and safe zones") |

2. **The review sheets.** `node scripts/stills.mjs <CompositionId> review` renders every scene just after it starts and at its middle, every seam (just before the transition, its middle, just after), and tiles them into `out/stills/review/scenes.png`, `seams.png` and `phone.png` (the middles at 360 px wide, the size a phone shows them). Open all three. `legend.txt` says which file is which moment.
3. **Motion between the frames.** For the hero move and the payoff, render 6 to 8 stills across the move (`node scripts/stills.mjs <id> 412 416 420 ...`), or a word spec on each side of it.
4. **The rendered file.** `scripts/check-audio.mjs` for speech against music; `hyperframes audio out/<file>.mp4 --only loudness,silence --json` for integrated loudness, true peak and where the silences are (hyperframes.md). You can't hear it; say so.

Trust the numbers over your eye where they disagree: a clipped label or a 0.6 s line looks fine on a contact sheet.

## 2. What to look for

First describe each scene's middle frame in one sentence, as a stranger would, naming every object. An object you would have to explain ("those bars are mirrors") is a P0. Then read the frames in order: do they tell a story a stranger can follow, each one causing the next? Compare each with its row in `STORYBOARD.md`; what doesn't match is a note. Then name every default the frames show (storyboard-and-gates.md, "Banned by default", or one not on that list yet), add each to the Never line of `design.md`, and fix them before anything else.

Then go through the sheets once per question:

| Question | What it catches |
| --- | --- |
| Does it read as what it is? | a shape that reads as another object, a material that reads as plastic, a product screen that reads as a mockup, a face or mascot that reads wrong |
| Does the subject stand out? | subject and background too close in brightness, two focal points in one frame, the eye with nowhere to go |
| Framing and contact | crops, text at the edge or under the platform's buttons, collisions at a seam, things floating that should touch |
| Timing for a first-time viewer | a read shorter than its words, something that pops on with no move, a jump at a seam, everything moving at once on one curve |
| Tells | the items in story-and-comedy.md, "Tells of a generated video", and motion.md, "Moves that look generated" |
| The pictures alone | with the words covered, do the frames still tell the story? |
| The phone sheet | can every line meant to be read be read at 360 px wide? |

## 3. Notes and fixes

Write each problem as one line: `t=4.2s · where · problem → exact change · what stays`. Rank them:

- **P0** breaks the read or the brief: unreadable, wrong, broken, private data showing, a tell in the hero shot.
- **P1** weakens the video: a dead stretch, a soft payoff, a seam that jumps.
- **P2** polish.

Fix every P0 and the P1s worth their time: text first, then timing, then detail. Then render stills of only what you changed, once. Do a second pass only when a P0 is still open. Never score the video out of 10: a score finds nothing to fix. When a fix doesn't hold, render the frames on either side of the problem, list every difference, and change only the line that causes it. A video that feels busy: remove a third of the motion and keep the moves that lead the eye.

**A fresh pair of eyes:** when there is time, give a subagent only `STORYBOARD.md` and the three sheets and ask for P0 and P1 lines in the format above; keep the editing to yourself. Commit or copy the project before you fix, so a fix that makes things worse can be rolled back.

## 4. The delivery note

Write `REVIEW.md` in the project root and put its short form in the delivery message (SKILL.md, step 9):

- the creative calls you made, and the storylines you didn't build;
- what you measured and what you only looked at; what nobody checked (the sound was measured, not heard);
- the weakest shot, and what you would change with more time;
- warnings you kept on purpose, and why.

The next session reads it before changing anything.
