# Music

## Contents
- Where music comes from
- HeyGen setup (incl. Windows/WSL sign-in)
- Searching and picking a track
- Mixing it in: level, ducking, comedic silence
- Sound design
- Cutting to music
- If HeyGen isn't an option
- Making an original track (ACE-Step)

"Sound design", "Cutting to music" and the loudness targets come from HeyGen's HyperFrames `sound.md` and `film.md` (Apache-2.0, adopted 2026-11-17).

## Where music comes from

Synthesized music (writing a score in code) sounds cheap next to a real track.
People notice and say "the music is not nice". Use real music:

1. **The free library** (`scripts/free-music.mjs`): 44 public-domain tracks
   (FreePD.com) tagged by mood (upbeat, promo, happy, funny, chill, lo-fi,
   calm, sincere, hopeful, cinematic, epic, tense, mystery, electronic, tech,
   news, sport, graduation, celebration, desert and world...), downloaded from
   this skill's GitHub release, so it
   works with no account and in the Claude app. Public domain: client work is
   fine and no credit is needed. `preview calm,sincere` makes one numbered file
   of 15 s from each match for the person to pick by ear; `get <id>` saves it as
   `public/bgm/track.mp3` and prints the `music` settings (gain for a bed about
   -24 dBFS between lines, and an offset past any silence at the start). The
   moods come from the titles and a tempo and loudness measurement, not from
   listening, so always preview.
2. **HeyGen's catalog** through the `media-use` skill
   (`npx skills add heygen-com/hyperframes@media-use -g -y`). It has thousands of
   royalty-free tracks searchable by mood, free with a HeyGen sign-in.
3. ElevenLabs Music (`elevenlabs/skills@music`): composed to a prompt, but needs
   a paid API key.
4. A track the person supplies. This is fine for WhatsApp, but copyrighted songs
   get muted or blocked on Instagram, TikTok and YouTube. Say so.
5. An original track made on the person's own PC with ACE-Step ("Making an
   original track" below): free and theirs, but it needs a graphics card for
   reasonable speed and a listen before it goes in.

For a business, a client or a paid post, check the chosen track's licence
covers commercial use on that platform before delivering (and the voice's:
toolbox.md, "Voice"), and say in the delivery message what you checked rather
than assuming it.

Avoid `*/superpowers@ai-video-generation`-style skills and `prime-skills/*`: they
show huge install counts from repos with a handful of stars.

## HeyGen setup (incl. Windows/WSL sign-in)

The CLI is Linux/macOS only. On Windows, install it in WSL. Check with
`wsl -l -v` that Ubuntu exists. Download the install script, read it, then run
it. Don't pipe it straight into bash.

```bash
wsl -e bash -lc "curl -fsSL https://static.heygen.ai/cli/install.sh -o ~/heygen-install.sh"
wsl -e bash -lc "cat ~/heygen-install.sh"                                # read it first
wsl -e bash -lc "bash ~/heygen-install.sh && rm ~/heygen-install.sh"     # -> ~/.local/bin/heygen
```

Sign-in has to happen in the person's browser, but from WSL no browser opens,
and `--device` refuses to run without a real terminal. What works is to run the
OAuth login in the background with `BROWSER=echo`, read the printed URL, and
open it on Windows:

1. Background task (PowerShell):
   `wsl -e bash -lc "BROWSER=echo ~/.local/bin/heygen auth login --oauth 2>&1"`
2. Read the task output for `https://app.heygen.com/oauth/authorize?...`, save it
   to a file, then `Start-Process (Get-Content -Raw <file>).Trim()`.
3. The person signs in and approves. The callback reaches WSL through localhost
   forwarding, and the background task finishes with "Logged in as ...".
4. Verify: `wsl -e bash -lc "~/.local/bin/heygen auth status"`. The session lasts
   about 10 days and refreshes.

To clean up a stuck login, use `pgrep -f '[h]eygen auth login' | xargs -r kill`.
The bracket keeps the pattern from matching (and killing) its own shell.
`pkill -f 'heygen auth login'` kills itself.

On macOS/Linux, `heygen auth login --oauth` opens the browser directly.

## Searching and picking a track

Copy `scripts/heygen-music.mjs` into the project, then:

```bash
node scripts/heygen-music.mjs search "playful quirky comedy, bouncy marimba and pizzicato strings" --limit 8
node scripts/heygen-music.mjs download 597cfa95 217e8589 19bcbb9a --out public/bgm/options
```

Search several moods: playful comedy, cheerful ukulele, upbeat cartoon. Track
names are generic ("Astral Generated Music: ..."), so judge by the
description and duration. For a comedic story, "playful quirky comedy, marimba
and pizzicato" beats "kids jingle" (too childish) and "corporate uplifting".

Pick a main track and download two alternatives so the person can swap one in
by number. Copy the main one to `public/bgm/track.mp3`.

Before wiring it in, measure it. Decode it with
`npx remotion ffmpeg -i track.mp3 -ac 1 -ar 16000 -c:a pcm_s16le m.wav` and
compute RMS per second:
- **Overall RMS** sets the gain: `MUSIC_GAIN = 10 ** ((-24 - rms) / 20)`,
  about -24 dBFS between lines.
- **Where it ends.** Most tracks end with a natural fade (quiet last 3 s). Plan
  for that rather than `loop`, because loop seams are audible. Let it end under
  the sincere beat and restart it for the ending credits.
- **Where it is strongest.** `hf audio public/bgm/track.mp3 --only bpm,sections,loudness --json`
  (hyperframes.md) labels the sections A, B, C... in about 5 s; a label that
  repeats (D, E, D, E) is the chorus-like part. Start the music at the track's
  strongest bar, not a quiet intro: a slow build drains a short video. End on a
  bar line, with a short fade under the end card.
- **Short tracks are loops.** A 15 to 30 s library track is made to loop: loop
  it with a 0.4 s fade-in and a 1.5 s fade-out, or pick a longer one.

## Mixing it in: level, ducking, comedic silence

`StoryVideo.tsx` computes the music volume per frame:
- **Ducking:** `DUCK = 0.6`, so the music sits about 8 dB lower while the
  narrator talks (narration about -20 dBFS, bed about -32 dBFS under it, about
  -24 between lines).
- **Intro:** the track plays under the hero clip, and the record scratch stops it
  (`durationInFrames={scratch}`). The main music starts with chapter 1.
- **Comedic silence:** cut to 0 on a big reaction (the boom carries it) for
  about 1.3 s, then fade back over 0.5 s. Put silences on the one or two biggest
  gags only.
- **Ending:** fade the last 3 s.

Verify with `scripts/check-audio.mjs` (production.md). If the speech level and
the between-lines level are within about 2 dB of each other and the
between-lines measurement covers mostly music, the music is too loud.

**Loudness targets** for a video posted to social apps: the whole mix around
-16 to -14 LUFS, and every file's true peak at -1 dBTP or lower (AI audio and
library tracks often hit 0 dB). `hf audio out/<file>.mp4 --only loudness --json`
reports both; the louder-copy command in toolbox.md fixes a quiet render.

## Sound design

The viewer notices a silent video before any frame, and no frame check catches
it, so plan sound on purpose.

- **The default.** A video over about 15 s that tells something gets a music
  bed and sounds on its visible actions, unless the person asked for silence or
  it is made to play muted (a looping background, a feed that autoplays without
  sound). Each storyline says its sound in one line: the bed's feel and tempo,
  the one moment the music changes, which actions get effects, or silence and
  why.
- **The clock.** Narrated, the voice is the clock: each beat starts on its
  word. Music only, the music is the clock: land the payoff and the logo on its
  strong beats (`hf beats`, "Cutting to music" below); cuts follow the motion,
  not the drums.
- **Let the sound act out the story:** the old way sits near silence, the music
  opens when the product appears, or the music holds back until the payoff. The
  funny style's comedic silence is the same idea.
- **Effects are few and exact.** Every effect has a cause on screen; too many
  read as a template:

  | Sound | Only on |
  | --- | --- |
  | click | a real cursor click on screen |
  | whoosh | a scene cut, or a large card moving fast |
  | soft key tick | text arriving letter by letter or line by line |
  | pop | a badge, sticker or number landing |
  | riser into an impact | the payoff or the logo, once in the video |

  The funny style's meme effects (record scratch, vine boom, XP error) follow
  their own rule: three or four a video (story-and-comedy.md).
- **One frame late.** Place an effect so its loudest point lands one frame
  after its picture: light arrives before sound, and a sound early feels wrong
  sooner than one late. Most files peak after their start;
  `hf audio public/sfx/<file>.wav --only moments --json` says where.
- **Rotate two or three takes** of a repeated sound: the same whoosh on every
  cut is the most common tell.
- **Levels:** each hit 3 to 6 dB over the bed. A bed with most of its energy
  under 150 Hz plays as nothing on a phone speaker.
- Over strong music, a typing-heavy video can drop the clicks and keys. No
  synthesised tones, chimes or dings.
- **Where the effects come from.** Setup downloads recorded effects from
  remotion.media. Where that's blocked (the Claude app's cloud workspace), the
  click, ding and XP error come from 25 recorded interface sounds by Kenney
  (CC0, on this skill's GitHub release) and the whoosh, record scratch and boom
  are made in code (`scripts/make-sfx.mjs`, same file names): use the made
  ones' noise-based sounds and skip their tonal ding and chime, per the line
  above. Swap in remotion.media's when the project moves to a machine that can
  reach it.
- **More recorded sounds:** `scripts/free-sfx.mjs` lists the Kenney set by tag
  (click, tick, pop, drop, open, close, rise, fall, confirm, success, error,
  buzz, question, clink, glitch, scratch, scroll, pluck, bong, back, hover),
  `preview` plays each twice in one file, and `get confirm,pop` saves them to
  `public/sfx/` at a level that sits under the voice with `<Sfx>`'s default
  volume. The names are Kenney's: judge them by ear.

## Cutting to music

- **Trust the beat only on rhythmic stretches.** On calm music the tracker
  invents a beat, often at double tempo (a 160 BPM reading may feel like 80).
  Cut calm parts on phrase and energy changes instead
  (`hf audio <track> --only sections,onsets,moments --json`).
- **The grid in frames** is in motion.md ("Rhythm and the beat grid"). Cut on
  the beat, change the layout on the bar.
- **Hits.** A move that must land on a hit starts 40 to 190 ms early; a reaction
  starts 0 to 45 ms after. The hit itself is an instant change, never eased.
  Scenes cover the track with no gaps.
- **Holds.** A word meant to be read holds at least one beat. Any single
  treatment goes stale after about 6 s: lengthen a section with a hold or a new
  treatment, never by slowing the motion. On rhythmic sections give footage one
  clip per strong beat; on calm ones, one slow push from 1.0 to 1.08.

## If HeyGen isn't an option

Use the free library first (`free-music.mjs`), or ask which of the other sources the person wants. Don't fall back to
synthesized music without telling them it will sound synthetic. If they have
none, deliver the video silent and say so in one line, with how to add music
later, rather than spending the session writing music in code that nobody can
hear.

## Making an original track (ACE-Step)

ACE-Step 1.5 (MIT, released 2026-01-31) writes full songs or instrumentals from
a text description (genre, instruments, tempo, mood) on the person's own
computer, and the result is theirs to use, client work included. Its makers say
it was trained only on licensed, royalty-free and synthetic music. It wants a
graphics card: an NVIDIA card with about 8 GB or more runs it in seconds to
minutes; it also runs on a CPU or a Mac, much more slowly. Not wired into the
scripts and not tested here (the cloud sandbox has no graphics card).

1. Install `uv`, then `git clone https://github.com/ACE-Step/ACE-Step-1.5.git`,
   `cd ACE-Step-1.5` and `uv sync` (Python 3.11 or 3.12; the models download on
   first launch).
2. `uv run acestep` opens its web page at http://localhost:7860. Describe an
   instrumental bed ("warm acoustic guitar and soft piano, 90 BPM, hopeful, no
   vocals") a little longer than the video, make three, and let the person pick
   by ear.
3. Save the pick as `public/bgm/track.mp3` (or .wav) and set `"music"` in
   `story.json` like any other track; measure it with `check-audio.mjs`.

Treat it like any found track: listen for artefacts and a stray vocal before it
goes in, and say in the delivery message that the music was AI-generated.
