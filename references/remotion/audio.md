# Audio in Remotion

The Remotion side of sound: the `<Audio>` component and its props, sound
effects from remotion.media, finding and trimming silence with FFmpeg, and
drawing audio as bars, waves or a bass pulse. Read it when you place, trim,
time or visualize a sound by hand. For choosing music, levels and ducking read
music.md; for the voice, production.md and toolbox.md ("Voice"). This file adds
the API underneath those.

## Contents
- The `<Audio>` component
- Volume, mute, speed, loop, pitch
- Sounds on the timeline
- Sound effects
- Finding silence with FFmpeg
- Visualizing audio

## The `<Audio>` component

`<Audio>` comes from `@remotion/media`. If the project doesn't have it yet:

```bash
npx remotion add @remotion/media
```

Use `npx remotion add` (not plain `npm i`) for every `@remotion/*` package, and
also for `mediabunny`, `@mediabunny/*`, `zod` and `@huggingface/transformers`:
it picks the version that matches the installed Remotion.

The source is either a file in `public/`, wrapped in `staticFile()`, or a
remote URL passed as a plain string. With no other props the file plays from
the composition's first frame, at full volume, to its end. Several `<Audio>`
elements play at the same time and mix.

```tsx
import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

export const Bed: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio name="Music" src={staticFile("bgm/track.mp3")} />
      <Audio
        name="Door knock"
        src={staticFile("sfx/knock.wav")}
        from={3 * fps}              // starts 3 s in
        trimBefore={0.5 * fps}      // skips the file's first half second
        durationInFrames={2 * fps}  // then plays 2 s of it
      />
    </>
  );
};
```

- `from`, `trimBefore` and `durationInFrames` are all in frames. Get `fps`
  from `useVideoConfig()` and write the seconds on the prop itself
  (`trimBefore={4 * fps}`): Studio can then edit the value, and it stays right
  if the frame rate changes. A bare frame count is fine when the edit was
  given in frames.
- `trimBefore` cuts the start of the file, not the start of the timeline: the
  trimmed sound still begins at frame 0 (or at `from`).
- When scene lengths follow the audio (a voice file sets the length), measure
  it with Mediabunny (media-info.md) and set the composition length in
  `calculateMetadata` (project-compositions.md). Subtract transition overlaps
  from the total. In this skill, `make-voice.mjs` already does this through
  `voice.json`.

## Volume, mute, speed, loop, pitch

| Prop | What it does | Notes |
| --- | --- | --- |
| `volume` | Loudness from 0 to 1 | A number, or an inline `interpolate()` on the frame for a fade |
| `muted` | Silences it | Can change per frame (`muted={frame > 2 * fps}`) |
| `playbackRate` | Speed: `2` is double, `0.5` half | Reverse (negative) playback isn't supported |
| `loop` | Repeats the file until the element ends | |
| `toneFrequency` | Pitch without changing speed, `0.01` to `2` | Heard only in a server-side render, not in Studio or `<Player>` |

A fade written inline shows up as a volume curve in Studio's timeline, where
its keyframes can be dragged (with Studio interactivity on):

```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();

<Audio
  name="Outro music"
  src={staticFile("bgm/track.mp3")}
  loop
  volume={interpolate(frame, [durationInFrames - 2 * fps, durationInFrames], [0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })}
/>
```

Keep `name`, `from`, `loop` and `volume` directly on the `<Audio>` element
rather than on a wrapper.

A volume that changes every frame needs `useCurrentFrame()`. Put that in a
small component that holds only the sound, not in the scene: any component
that reads the frame re-renders on every frame, together with everything
inside it.

`volume` also takes a function of the element's own frame
(`volume={(f) => ...}`). This skill's `<CutClip>` uses it for its one-frame
fades at each cut.

## Sounds on the timeline

- **Music segments** that don't overlap (a gap between them, or one ending
  exactly where the next starts) can share one named `<Track name="Music">`.
  Each stays its own clip with its own trim and volume curve.
- **Tails overlap.** Check the real length of each sound, not only the
  `durationInFrames` you gave it. If one sound is still ringing when the next
  starts, they need separate tracks. Don't shorten a sound to make it fit.
- **A sound that belongs to a visual** (a sticker and its pop) goes in the
  same group as the visual, with its offset inside the group, so moving or
  deleting one moves or deletes both. Give each its own length: the visual
  shouldn't stay on screen just to cover the sound's tail, and the tail
  shouldn't be cut off when the visual ends.

Tracks and groups are explained in interactivity.md.

## Sound effects

Remotion hosts a set of free sound effects at
`https://remotion.media/<name>.wav`:

`whoosh`, `whip`, `page-turn`, `switch`, `mouse-click`, `shutter-modern`,
`shutter-old`, `ding`, `bruh`, `vine-boom`, `windows-xp-error`, `fah`,
`spongebob-fail`, `omg-hell-nah`, `price-is-right-fail`, `romance-meme`,
`bone-crack`, `anime-wow`, `yippee`, `loading-lag`, `wilhelm-scream`,
`mac-quack`, `skedaddle`, `snapchat-notification`, `nelly-ahh`,
`sanctuary-guardian-what`, `minecraft-hurt`, `oh-my-god-vine`,
`illuminati-confirmed`, `dramatic-boomer`, `triggered`, `record-scratch`.

`<Audio src="https://remotion.media/ding.wav" />` plays one straight from the
URL. In this skill, download them into `public/sfx/` instead (setup-project
does it for the common ones; production.md, "Project setup") and play them
with `<Sfx>`, which skips a missing file instead of failing the render and
lands the peak one frame after the picture. More sounds: the CC0 Kenney set
(`scripts/free-sfx.mjs`), music.md's "Sound design", or the WAV files in the
`kapishdima/soundcn` repository on GitHub (`assets/` folder).

## Finding silence with FFmpeg

No separate FFmpeg install is needed: Remotion ships one as
`npx remotion ffmpeg` and `npx remotion ffprobe` (more in video-clips.md,
"FFmpeg").

For cutting the pauses inside talking footage, use this skill's
`scripts/cut-silence.mjs` and `<CutClip>` (toolbox.md, "Editing tools"). The
recipe below is for the simpler job of finding the dead air at a file's start
and end, so a clip can be trimmed with `trimBefore` and `durationInFrames`.

It adapts to the recording instead of using a fixed level:

1. **Measure the file's loudness.** `loudnorm` in JSON mode prints the EBU R128
   numbers:

   ```bash
   npx remotion ffmpeg -i public/clip.mov -map 0:a -af loudnorm=print_format=json -f null -
   ```

   Take two values from the JSON: `input_i` (integrated loudness, how loud the
   file feels overall) and `input_thresh` (the gating threshold: anything
   quieter doesn't count toward loudness). The threshold is your silence level.

2. **Find the silences** with that threshold as `noise` (here it measured
   -38.2), and `d` as the shortest gap worth reporting (0.5 s is a sensible
   start):

   ```bash
   npx remotion ffmpeg -i public/clip.mov -map 0:a -af "silencedetect=noise=-38.2dB:d=0.5" -f null -
   ```

   Each silence prints a `silence_start` line and a `silence_end` line (with
   `silence_duration`), in seconds.

3. **Read the edges.**
   - Leading silence: silences that begin at or very near 0. If the first
     `silence_start` is after 0.5 s, there is none.
   - Trailing silence: the last silence, if its end reaches (or nearly
     reaches) the file's duration (get it with `ffprobe` or media-info.md).
   - Silences separated by less than 0.2 s at either end count as one block.

4. **Trim in frames.** Round the start down and the end up, so no speech is
   lost:

   ```tsx
   const start = Math.floor(leadEnd * fps);   // leadEnd: where the leading silence stops
   const end = Math.ceil(tailStart * fps);    // tailStart: where the trailing silence starts
   <Video src={staticFile("clip.mov")} trimBefore={start} durationInFrames={end - start} />
   ```

The ffmpeg commands write to the `null` muxer with `-` as the output, which
works the same on Windows, macOS and Linux.

## Visualizing audio

Spectrum bars, an oscilloscope line or a pulse on the beat come from
`@remotion/media-utils`:

```bash
npx remotion add @remotion/media-utils
```

**Load the data** with `useWindowedAudioData()`. It loads the audio around the
current frame rather than the whole file. It returns `audioData` (null until
loaded; render nothing until then) and `dataOffsetInSeconds`, which every
visualizer call needs.

```tsx
import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const Bars: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src: staticFile("bgm/track.mp3"),
    frame,
    fps,
    windowInSeconds: 30,
  });
  if (!audioData) return null;

  const bins = visualizeAudio({
    fps,
    frame,
    audioData,
    dataOffsetInSeconds,
    numberOfSamples: 64,
    optimizeFor: "speed",
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 240 }}>
      {bins.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${v * 100}%`, background: "#f2c14e" }} />
      ))}
    </div>
  );
};
```

`visualizeAudio()` facts:
- `numberOfSamples` must be a power of two: 32, 64, 128, 256, 512 or 1024.
- Each value is 0 to 1. The first entries are the bass, the last the treble.
- `optimizeFor: "speed"` is the choice for Lambda renders and large sample
  counts.

**Pass the frame down.** If children draw parts of the visualization, give
them `audioData` and the parent's `frame` as props. A child that calls
`useCurrentFrame()` itself inside a `<Sequence>` with an offset gets a
shifted frame, and the picture jumps.

**Oscilloscope line.** `visualizeAudioWaveform()` takes the same arguments
plus its own `windowInSeconds` (how much audio the line shows, for example
`0.5`) and returns values around zero. Turn them into points across the width
and draw them with `createSmoothSvgPath({ points })`, which returns an SVG
path string:

```tsx
const wave = visualizeAudioWaveform({
  fps, frame, audioData, dataOffsetInSeconds,
  numberOfSamples: 128,
  windowInSeconds: 0.5,
});
const mid = 100; // half the SVG height
const d = createSmoothSvgPath({
  points: wave.map((y, i) => ({ x: (i / (wave.length - 1)) * width, y: mid + y * mid })),
});
// <svg width={width} height={200}><path d={d} fill="none" stroke="#fff" strokeWidth={3} /></svg>
```

**Bass pulse.** Average the lowest quarter of a `visualizeAudio()` result (the
first 32 of 128 bins) and drive scale, glow or opacity from it, capped so it
never blows out, for example `scale: 1 + bass * 0.4`.

**Simple loudness bars.** When you want volume over time rather than a
spectrum, `getWaveformPortion({ audioData, startTimeInSeconds,
durationInSeconds, numberOfSamples })` returns `{ index, amplitude }` items
with amplitude 0 to 1.

**Balance the spectrum.** Bass bins are naturally much taller than treble.
Map each value to decibels and rescale it to a range before drawing:

```ts
const toBar = (v: number, floorDb = -100, ceilDb = -30) =>
  Math.min(1, Math.max(0, (20 * Math.log10(v) - floorDb) / (ceilDb - floorDb)));
```
