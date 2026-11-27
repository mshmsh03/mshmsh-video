# Rendering with Remotion

The Remotion CLI behind this skill's render scripts: rendering a video, a
still or a set of frames, passing props, the license key, transparent output
(ProRes 4444 and WebM), and exporting an editable OpenTimelineIO timeline for
DaVinci Resolve or Premiere. Read it when a render needs a flag the scripts
don't set, when the person wants a transparent overlay, or when they want to
finish the edit in another editor. For everyday renders use
`node scripts/render.mjs` and `node scripts/stills.mjs` (production.md,
"Verifying"); they wrap the commands below and add versioned file names and
the review checks.

## Contents
- Videos, stills and frames
- Props and the license key
- Transparent video
- Exporting to OpenTimelineIO

## Videos, stills and frames

```bash
npx remotion compositions                                   # list the composition ids
npx remotion render StoryVideo out/story.mp4                # a video
npx remotion still Cover out/cover.png                      # one image
npx remotion render StoryVideo out/frames --frames=0,45,120 --image-format=png
```

- **Always name the composition.** Without an id, `render` opens an
  interactive picker, which fails in a terminal with no input.
- **Use Remotion's own browser.** Remotion downloads and updates a headless
  browser with the APIs and fixes it needs (including for `<HtmlInCanvas>`).
  Don't point it at another browser with `--browser-executable`,
  `browserExecutable` or `chromeMode` unless the person asks. This skill's
  scripts fall back to an installed Chrome or Edge only when Remotion can't
  download its browser at all (`find-browser.mjs`).
- **Frame files.** `--frames` with a list writes `element-<frame>.<ext>`, with
  the number zero-padded to the digits of the highest frame:
  `--frames=4,30` gives `element-04.png` and `element-30.png`. List the
  folder rather than guessing names, or set `--image-sequence-pattern`.
  `--frames=S-E` is a range and includes both ends (`E - S + 1` frames).
- In this skill's projects `render --frames` has failed with `EINVAL ... write`
  once scenes have audio; `stills.mjs` renders single frames with
  `remotion still` instead (production.md, "Pitfalls").
- All flags: remotion.dev/docs/cli/render and remotion.dev/docs/cli/still.

## Props and the license key

Props go in as inline JSON or as a path to a JSON file:

```bash
npx remotion render Offer out/offer.mp4 --props='{"headline":"Two for one"}'
npx remotion render Offer out/offer.mp4 --props=./offer-props.json
```

They are merged over the composition's `defaultProps` one level deep: a nested
object in `--props` replaces the default object whole (project-compositions.md).
On Windows PowerShell, the file form avoids quoting trouble.

**License.** Remotion is free for individuals and small companies; larger
companies need a company license (remotion.dev/license). A company with a key
passes it on every render; one that qualifies for the free license passes
`free-license`:

```bash
npx remotion render Promo out/promo.mp4 --license-key=<their key>
npx remotion render Promo out/test.mp4 --license-key=<their key> --is-production=false
```

Add `--license-key` only when there is a key: an empty value is invalid.
`--is-production=false` marks a test render so it isn't billed
(remotion.dev/docs/telemetry).

## Transparent video

Two formats keep the alpha channel. Both need `--image-format=png` and a pixel
format with alpha.

| Format | For | Command |
| --- | --- | --- |
| ProRes 4444 `.mov` | importing into an editor (Resolve, Premiere, Final Cut) | `npx remotion render Badge out/badge.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png` |
| VP9 WebM `.webm` | playing in a browser, or as a layer in another Remotion video | `npx remotion render Badge out/badge.webm --codec=vp9 --pixel-format=yuva420p --image-format=png` |

The background of the composition has to be transparent too: no full-frame
background colour on the root.

To make these the default for every render in the project, set them in
`remotion.config.ts` and restart the Studio:

```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setPixelFormat("yuva444p10le"); // WebM: "yuva420p"
Config.setCodec("prores");             // WebM: "vp9"
Config.setProResProfile("4444");       // ProRes only
```

Or make them the default for one composition only, from `calculateMetadata`:

```tsx
const transparentDefaults: CalculateMetadataFunction<Props> = async () => ({
  defaultCodec: "prores",
  defaultVideoImageFormat: "png",
  defaultPixelFormat: "yuva444p10le",
  defaultProResProfile: "4444",
});
// WebM: defaultCodec "vp8" (Remotion's own example) or "vp9", defaultPixelFormat "yuva420p",
// no ProRes profile.
```

## Exporting to OpenTimelineIO

Only when the person asks for something they can keep editing elsewhere ("open
this in DaVinci Resolve", "an OTIO", "a timeline for my editor"). Plain renders
don't need it.

**The format.** OpenTimelineIO (`.otio`) is documented JSON. DaVinci Resolve
18.5+ and Adobe Premiere 25.6+ import it directly; other editors through
converters. Produce EDL, FCPXML or Premiere XML only when asked for those.

**The one rule.** A composition is React code, not a timeline. Everything the
render shows or plays must end up in the export as exactly one of:
a **native clip** (the original media, still editable), a **processed copy**
(the media with one property baked in), or a **rendered fallback** (Remotion's
own render of that part). If something can't be covered, stop and say the
export is incomplete. Never drop it quietly, and never leave a fallback and
the media it replaces both active.

**What maps to what.**
- Usually native: `<Video>` and `<Audio>` from `@remotion/media`;
  `<OffthreadVideo>`, `<Video>`, `<Audio>` and `<Img>` from `remotion` (still
  images are included by default).
- Usually needs a fallback: text, shapes, `<AbsoluteFill>`s, anything animated
  with `interpolate()` or `spring()`, `@remotion/effects`,
  `@remotion/transitions`, `playbackRate`, any volume other than a constant 1,
  volume curves, `style` transforms, and anything drawn on a `<canvas>` or by
  `@remotion/three`, `@remotion/lottie` or `@remotion/skia`.

**Fallbacks, cheapest faithful one first:**
1. Bake just the unsupported property into a media file (a retimed clip, a
   gain-adjusted sound, a video-only copy of muted B-roll).
2. Render the visual component alone over transparency for exactly the frames
   it is on screen, as muted ProRes 4444, on a track above the native clips.
3. If rendering it alone changes masks, blending, clipping or layout that
   depends on its neighbours, render the smallest opaque ancestor or stretch
   of time that is complete, and split or remove the native video under it.
4. Sound effects that no single file can hold (a mix, a filter across clips):
   export that stretch as one WAV and drop the native audio clips it replaces.
5. Only when nothing smaller works, bake a full scene or chapter into one clip.
   Baking the entire video is the very last resort.

### 1. Work out what plays when, from the code

- From the `<Composition>`: `fps`, `durationInFrames`, `width`, `height`. With
  `calculateMetadata`, use what it returns for the props actually in use.
- Find each video, audio and image element that has an actual `src`.
- Its **absolute start** is its own `from` plus every ancestor's offset
  (`<Sequence>` and other timing components). `<Series>` and
  `<TransitionSeries>` play children back to back, so add up their
  `durationInFrames`.
- Its **active interval** is its own `durationInFrames`, cut down by its
  ancestors' and the composition's limits and by the source's real length.
- `trimBefore` and `trimAfter` (frames) say which part of the source is used.
- Then note what the viewer sees or hears that no native clip carries, and cut
  it into the shortest stretches you can render apart while it still looks and
  sounds the same.

Never guess a position. When it depends on props, a condition or data loaded
during the render, ask the person which version to export, or export the one
the default props give and tell them that.

### 2. Frames to OTIO time

Every time is a `RationalTime` whose `rate` is the composition fps and whose
`value` is a frame count, for example
`{"OTIO_SCHEMA": "RationalTime.1", "value": 45, "rate": 30}`.

- A clip's `source_range.start_time` is its in-point inside the source file:
  `trimBefore`, or 0.
- `source_range.duration` is how many frames it occupies on the timeline.
- A clip has no timeline position of its own. A track's children play end to
  end, so put a `Gap.1` before any clip that doesn't start where the previous
  one ended.
- A source with a different frame rate still lines up, since frames at the
  composition rate describe the same moments; Resolve conforms it on import.

### 3. Keep the sound and picture faithful

Don't rely on a generic OTIO `Effect` or app-specific metadata for gain,
envelopes, retiming, transforms or Remotion effects: OTIO doesn't define what
an editor does with them. Metadata may record the original values for an
audit, but it never counts as carrying them.

For every element that makes sound (`<Audio>`, `<Video>`, `<OffthreadVideo>`)
work out its effective `muted`, `volume`, trim, `playbackRate`, looping,
`toneFrequency`, audio stream, channel mapping and active interval. Remotion's
`volume` is linear amplitude, not decibels; if a tool wants dB, use
`20 * log10(volume)`, with 0 meaning silence.

- **Always muted:** no audio clip. If a fallback picture file carries an
  unwanted sound, make a video-only copy. A `muted` that changes over time
  must be baked or rendered.
- **Untouched** (volume always 1, never muted, rate and tone 1, no loop, a
  faithfully represented stream and channel layout): reference the localized
  original directly.
- **Constant volume other than 1:** bake it into an audio-only copy and use
  that at unity gain, keeping the original's video leg. Deduplicate copies by
  source plus processing values, not by URL alone.
- **Volume or mute as a function, curve, fade or state-dependent value:**
  render that element, or the smallest faithful mix, as a WAV stem.
- **Speed, loop, pitch, stream choice, channel mapping, panning:** bake them.
  If how they combine is unclear, render one combined stem and remove every
  clip it contains.
- **Processed audio overlapping plain audio:** either keep separately baked
  clips (OTIO adds overlapping audio together) or render one combined stem and
  remove what it contains. Never let a sound play twice.

Keep unprocessed audio at unity gain in its original format.

**Audio file format.** For processed copies and stems, prefer 48 kHz 32-bit
float WAV (`pcm_f32le`) when the encoder path and the target editor both
support it, keep the source's channel layout, and process constant-gain copies
straight from the original with no integer step in between: no normalizing,
limiting, clipping or dithering. Float keeps headroom; it doesn't undo
clipping or codec damage already in the source.

Remotion's `--codec=wav` currently writes 16-bit PCM. Don't convert that to
float or 24-bit and claim the precision came back. Use a verified float
processor when one exists; otherwise keep the 16-bit stem and say so. If float
isn't possible for a copy you process directly, write 24-bit PCM and report
the fallback.

**Check every processed file.** Probe it and set its `available_range` from
the processed file, not the compressed original. The clip's
`source_range.duration` stays the intended interval; fail if the file is
shorter. For an unlooped whole-source copy, shorten the interval to the
decoded length, or render trailing silence if that silence is meant to be
there. For constant-gain copies, compare decoded samples with a unity-gain
decode or a Remotion reference render on samples that aren't silent, allowing
for resampling and clipping.

**Rendering fallbacks.** Use the composition's real props, size, fps and frame
range. `--frames=S-E` includes both ends, so the file is `E - S + 1` frames:

```bash
# Opaque stretch that replaces the native video under it
npx remotion render <entry> <composition> out/otio/scene3.mov --frames=S-E \
  --codec=prores --prores-profile=light --pixel-format=yuv422p10le --image-format=png --muted

# Transparent overlay, from a composition that really contains only that layer
npx remotion render <entry> <overlay-composition> out/otio/title.mov --frames=S-E \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png --muted

# Audio stem that replaces every sound it contains
npx remotion render <entry> <composition> out/otio/mix.wav --frames=S-E --codec=wav
```

Probe each one and confirm its frame or sample count before adding it. Video
tracks stack bottom to top, so overlays go on a track above the media they sit
on. Inside an isolated fallback, keep the original frame numbers, or remap
them on purpose if its composition starts at 0. A file rendered for just that
interval gets a `source_range` starting at 0; one full render reused for
several intervals uses the matching offsets.

### 4. Put every media file beside the `.otio`

Pick an output folder first. Every file an included clip references must be a
regular local file in the same folder as the `.otio`; the export isn't done
until that's true.

- **Remote sources** (HTTP, HTTPS): download them there, following redirects
  and failing on an error response. Never leave a web URL in `target_url`.
- **`staticFile("x.mp4")`** is `public/x.mp4`: copy it there. Copy other
  local and `file://` sources too, unless they already resolve to the
  destination. In Node or Bun, turn `file://` URLs into paths with
  `fileURLToPath()`.
- **Names:** keep a meaningful base name and the extension. If two different
  sources share a name, add a stable suffix from the source (a short hash). A
  processed copy's or rendered interval's name must also reflect every
  processing value and the interval. Never overwrite a different existing
  file; reuse one only after confirming its source and processing match.
- **One copy per source**, however many clips use it.
- **Verify:** reject empty files, probe every audio and video file, and check
  that every still image opens. A source that can't be downloaded, copied,
  verified or saved as a standalone file (a `blob:` URL, a URL known only at
  runtime, a partial streaming manifest) fails the export: report it as
  incomplete instead of writing an `.otio` that points at it.
- **`target_url`** is `pathToFileURL(absolutePath).href` (Node or Bun). Don't
  build `file://` strings by hand: `pathToFileURL()` encodes spaces, `#`, `%`
  and non-Latin letters correctly.
- **`available_range`** is the full length of the local file, read with
  `npx remotion ffprobe <file>`. Stop if a needed file can't be probed, check
  each clip's `source_range` fits inside it, and never make up a length.

A finished folder: `out/Promo/Promo.otio` next to `out/Promo/interview.mp4`
and `out/Promo/music.mp3`.

### 5. Write the `.otio`

One video track and one audio track, unless clips overlap in time or a
transparent fallback sits over native media: a track is a sequence, not a
layer, so overlapping clips need their own tracks. Don't add tracks without
such a reason.

For this composition at 30 fps:

```tsx
<Video src={staticFile("interview.mp4")} from={45} trimBefore={90} durationInFrames={120} />
```

the video track holds a 45-frame gap, then a clip that starts 90 frames into
the file and lasts 120 (`T` is shorthand for the `RationalTime` object):

```json
{
  "OTIO_SCHEMA": "Timeline.1",
  "name": "Promo",
  "global_start_time": {"OTIO_SCHEMA": "RationalTime.1", "value": 0, "rate": 30},
  "tracks": {
    "OTIO_SCHEMA": "Stack.1",
    "name": "tracks",
    "children": [
      {
        "OTIO_SCHEMA": "Track.1",
        "name": "V1",
        "kind": "Video",
        "children": [
          {
            "OTIO_SCHEMA": "Gap.1",
            "name": "Title animation (rendered on V2)",
            "source_range": {"OTIO_SCHEMA": "TimeRange.1", "start_time": T(0), "duration": T(45)}
          },
          {
            "OTIO_SCHEMA": "Clip.1",
            "name": "interview.mp4",
            "source_range": {"OTIO_SCHEMA": "TimeRange.1", "start_time": T(90), "duration": T(120)},
            "media_reference": {
              "OTIO_SCHEMA": "ExternalReference.1",
              "target_url": "file:///C:/Users/me/videos/promo/out/Promo/interview.mp4",
              "available_range": {"OTIO_SCHEMA": "TimeRange.1", "start_time": T(0), "duration": T(600)}
            }
          }
        ]
      },
      {"OTIO_SCHEMA": "Track.1", "name": "A1", "kind": "Audio", "children": ["...the same for audio clips"]}
    ]
  }
}
```

In the real file, write each `T(n)` out as
`{"OTIO_SCHEMA": "RationalTime.1", "value": n, "rate": 30}`.

**Before calling it done:**
- Write the `.otio` only after all media is in place, and check it parses as
  JSON (and reads back with OpenTimelineIO if installed).
- Every `ExternalReference.target_url` uses `file:`, points at an existing,
  non-empty regular file, and sits in the same folder as the `.otio`. Every
  audio and video file still probes.
- Compare against the list from step 1: everything seen or heard maps to a
  native clip, a processed copy or a fallback. Opaque fallbacks and stems
  don't overlap the clips they replace, transparent fallbacks really have
  alpha, muted fallbacks have no sound. A missing part or a doubled one is a
  failed export.
- Every sound has exactly one owner, and every non-unity or changing gain,
  mute, retime, loop, pitch, stream choice, channel mapping, pan and mix is
  baked into a referenced file. Metadata alone never counts.
- Don't claim frame accuracy for a composition whose timing depends on data
  fetched at runtime.

### 6. Tell the person

1. Where the `.otio` is.
2. Which parts are native, editable clips.
3. Which became processed copies, transparent overlays, opaque replacements or
   audio stems, and why.
4. Which files were downloaded, copied, processed or rendered into the folder;
   for processed audio, its sample rate and format, and any fallback from
   32-bit float.
5. Anything they chose to leave out. Anything else that couldn't be
   represented makes the export incomplete, and you say so.

Then how to open it:
- **DaVinci Resolve 18.5 or later:** File > Import > Timeline, and pick the
  `.otio` (or in the Media Pool, right-click > Timelines > Import > AAF, EDL,
  XML). The media beside it links by itself; if the folder moved, relink to
  that folder.
- **Adobe Premiere 25.6 or later** imports `.otio` directly. Older versions need
  FCP7 XML:

  ```bash
  pip install OpenTimelineIO otio-fcp-adapter
  otioconvert -i Promo.otio -o Promo.xml -O fcp_xml
  ```
