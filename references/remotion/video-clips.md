# Video clips in Remotion

How to put footage into a composition with `<Video>`, how to arrange a
timeline of clips so it stays editable, how to cut a person out of the
background with `@remotion/video-matting`, and when to reach for FFmpeg. Read
it when the video uses the person's own clips, screen recordings or B-roll.
For phone clips (HEVC, HDR) read production.md's "Pitfalls" first; for cutting
the pauses out of talking footage use `<CutClip>` (toolbox.md, "Editing
tools").

## Contents
- The `<Video>` component
- A timeline made of clips
- Cutting out the subject (matting)
- FFmpeg

## The `<Video>` component

`<Video>` comes from `@remotion/media`, like `<Audio>`. Add the package with
the project's package manager:

```bash
npx remotion add @remotion/media        # npm
bunx remotion add @remotion/media       # bun
yarn remotion add @remotion/media       # yarn
pnpm exec remotion add @remotion/media  # pnpm
```

```tsx
import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

export const Demo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Video
      name="Shop walk-through"
      src={staticFile("rec/shop.mp4")}   // or a remote URL string
      from={1 * fps}                     // appears 1 s in
      trimBefore={6 * fps}               // starts 6 s into the file
      durationInFrames={4 * fps}         // shows 4 s of it
      objectFit="cover"
      style={{ position: "absolute", left: 80, top: 300, width: 920, height: 1200 }}
    />
  );
};
```

- Size and place it with `style`; `objectFit` decides how the picture fills
  that box.
- All timing props are in frames; write seconds as `n * fps` on the prop.
- The sound props are the same as `<Audio>` (audio.md): `volume` (a number or
  an inline `interpolate()`, shown as a curve in Studio), `muted`,
  `playbackRate` (no reverse), `loop`, and `toneFrequency` from `0.01` to `2`,
  which is heard only in a server-side render, not in Studio or `<Player>`.
- `<Video>` takes an `effects` array (for example a vignette on just that
  clip), which beats a CSS imitation when a built-in effect matches.

## A timeline made of clips

Before writing a clip-heavy composition, decide what the person will want to
change together: one captioned shot, a run of cutaways, one music segment.
Each of those is a unit with its own JSX node, a literal `name` and its props
inline. interactivity.md has the general rules; these are the ones specific
to footage.

**Pick how cuts behave.**
- Clips that start independently and never overlap: a named `<Track>`, with
  `from`, `trimBefore`, `durationInFrames` and `playbackRate` on each clip.
  Moving or stretching one leaves the others where they are.
- Clips that must stay back to back: a `<TransitionSeries>`, with
  `durationInFrames` on each `<TransitionSeries.Sequence>`. The series works
  out start times, shifts later clips when one changes length, and handles
  overlapping transitions. Don't flatten these into plain sequences when
  refactoring.

**One clock per shot.** A shot's video, its captions and any overlay that
follows the footage go inside one timing wrapper (`<Sequence>` or the
`<TransitionSeries.Sequence>` already there). Put `trimBefore`,
`durationInFrames` and `playbackRate` on the wrapper once, plus `from` when the
group is placed on its own. Then trimming, speeding up, moving or deleting the
shot carries every layer with it. A trim set only on the `<Video>` does not
reach its sibling captions.

```tsx
<TransitionSeries name="Interview">
  <TransitionSeries.Sequence name="Answer 1" trimBefore={12 * fps} durationInFrames={5 * fps}>
    <Video name="Answer 1 footage" src={staticFile("rec/interview.mp4")} />
    <BasicCaptions
      name="Answer 1 captions"
      width={900}
      style={{ position: "absolute", bottom: 140, translate: "90px 0px" }}
      captions={[
        { text: "We", startMs: 12300, endMs: 12500, timestampMs: 12400, confidence: null },
        { text: " opened", startMs: 12500, endMs: 13000, timestampMs: 12750, confidence: null },
      ]}
    />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

The caption times are measured from the start of the original file, not from
the trimmed shot (captions.md).

**Speed.** On a wrapper with `playbackRate`, `durationInFrames` counts source
frames; the group takes `durationInFrames / playbackRate` frames of the parent
timeline. Update the composition length if the total changes.

**Overlays live at the level they span.** A readout that tracks the footage
stays inside its shot. A sticker that runs across several cuts goes in the
scene around them, timed in the scene's frames, so the first cut ending doesn't
unmount it. Successive cutaways within a shot or scene share a named
`Cutaways` track; visuals that are on screen at the same time need separate
tracks.

**Cutaways over someone talking.** Hiding the speaker's video under a cutaway
must not delete their voice. Keep the speaking clip playing underneath, or
split its audio out on purpose.

**Restructuring keeps the edit.** Leave source trims, cut lengths, speeds,
caption arrays, volume curves and stacking order as they were unless the
person asked for a change. Moving content under a new wrapper changes what
`useCurrentFrame()` returns inside it, so keep the original clock or adjust
the local offsets deliberately.

**Checking.** Rendered stills show where cuts and overlays begin and end
across the whole composition (production.md, "Verifying"). For sound, check
each clip's duration, trim and volume curve.

## Cutting out the subject (matting)

`@remotion/video-matting` splits a clip into an opaque **base** and a
**foreground** WebM with transparency. Run it once, save both files, and use
them like any other clip. Never run the model inside a frame render. If a
foreground already exists for the same source with the same timing and size,
reuse it.

For a still photo, this skill has `scripts/cutout.mjs` (rembg); for a clip on
a machine without a suitable GPU, `hf remove-background` (toolbox.md).

**In Studio:** select a video and choose **Remove background**. The layer's
source is replaced by a transparent WebM, so duplicate the layer first if the
original is still needed underneath. An agent with Studio WebMCP access can
call `remove_video_background` instead.

**In Node.js, for a local file:**

1. Add `@remotion/video-matting`, `@huggingface/transformers`, `mediabunny`
   and `@mediabunny/server` with `remotion add`.
2. Call `registerMediabunnyServer()` (from `@mediabunny/server`) before
   processing.
3. Pick a model: `modnet` for people; `ben2-base` (experimental) for other
   subjects, which needs more GPU memory and fp16 support.
4. Check `canUseVideoMatting({ model })`. A compatible GPU is required; if it
   says no, tell the person its `detailedReason` rather than promising a
   result.
5. `downloadVideoMattingModel({ model })`, then
   `separateVideoLayers({ src, model, audio: "base" })`; `src` can be a local
   path.
6. Save `base.getBlob()` and `foreground.getBlob()` as `.webm` files in
   `public/`, dispose the outputs, and call `disposeVideoMattingModel({ model })`
   when done.

Output streams, progress and disposal are in Remotion's docs
(remotion.dev/docs/video-matting/node and
remotion.dev/docs/video-matting/separate-video-layers). A custom output stream
must write each chunk at its `position`: writes don't always arrive in order.

**Composing the layers.** Both are `<Video>` elements; the later one in JSX
sits on top.

| Look | Order, back to front |
| --- | --- |
| Words behind the person | base (or original), the text in an `Interactive.Div`, foreground |
| Blurred background | base (or original) with `blur()` from `@remotion/effects/blur`, sharp foreground |
| New background | the new background, foreground (no original) |
| Effect on the person only | original if the background stays, foreground with `glow()`, `dropShadow()` or `colorCorrection()` |

Rules for a clean result:
- Keep both layers identical in position, size, `objectFit`, crop, `from`,
  `trimBefore`, `durationInFrames` and `playbackRate`, or the edges slip.
- The original sound plays once: mute the foreground when the base carries
  audio. For a new background, separate with `audio: "foreground"` or add the
  original audio as its own `<Audio>`.
- Keep the foreground as WebM; other formats drop the alpha.
- The base still shows the person. Matting doesn't fill in what was behind
  them, so a strong background blur can leave a halo.
- Look at hair and fast movement in stills or by scrubbing Studio before
  trusting it.

## FFmpeg

Remotion bundles FFmpeg, so nothing needs installing:

```bash
npx remotion ffprobe public/rec/shop.mp4
npx remotion ffmpeg -i public/rec/shop.mp4 public/rec/shop.mp3
```

The bundled build lacks some filters (`fps`, `tile`); this skill uses a full
`ffmpeg` where installed (production.md, "Pitfalls"; toolbox.md,
"Verification tools").

**Trimming.** Prefer the props: `trimBefore` and `durationInFrames` on
`<Video>` change nothing on disk, need no encoding and can be changed any
time. Cut a new file with FFmpeg only when a standalone clip is needed (to
upload or hand to someone). Then re-encode it; copying the streams leaves
frozen frames at the start:

```bash
# 5 s of the file, starting at 0:05, re-encoded so the first frame is exact
npx remotion ffmpeg -ss 5 -i public/rec/shop.mp4 -t 5 -c:v libx264 -c:a aac public/rec/shop-5s.mp4
```

Finding silence with `loudnorm` and `silencedetect` is in audio.md.
