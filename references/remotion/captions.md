# Captions in Remotion

Remotion's caption format, its local Whisper transcriber, the Basic Captions
element with Studio's Caption editor, and importing `.srt` files. Read it when
the person's own clip needs captions, when captions should be editable in
Studio, or when they arrive as an `.srt`. Narrated scenes in this skill already
have word-synced captions through `<Narration>` and `voice.json`
(production.md), and the person's recordings are transcribed with
`scripts/transcribe.mjs` (toolbox.md, "Editing tools"). Start there; this file
covers what Remotion itself offers.

## Contents
- The `Caption` type
- Making captions
- Showing captions with Basic Captions
- Importing an `.srt`

## The `Caption` type

Captions are JSON: an array of `Caption` objects from `@remotion/captions`.

```ts
import type { Caption } from "@remotion/captions";

// type Caption = {
//   text: string;
//   startMs: number;
//   endMs: number;
//   timestampMs: number | null;
//   confidence: number | null;
//   pageBreakAfter?: boolean;
// };
```

- One entry per word (or token). Times are milliseconds.
- **Spaces matter.** Put the space in front of each word: `"Hello"`,
  `" world"`. Without it the words run together. (`transcribe.mjs` writes them
  this way.)
- `pageBreakAfter: true` ends the current caption page after that word; the
  next word starts a new page.
- **Times are measured from the start of the source file**, including any
  part that is trimmed out of the edit. Transcribe each original clip on its
  own. Don't add the clip's position in the composition, and don't merge
  several clips' captions into one composition-wide list.

## Making captions

**In this skill:** `node scripts/transcribe.mjs <file> [--lang en] [--srt]`
writes `Caption` JSON to `public/captions/<name>.json`. It runs on the CPU
(Parakeet for English, Whisper large-v3-turbo otherwise), so it works on any
machine. Read the text before using it: names come out as heard.

**Remotion's own route** is `transcribe()` from `@remotion/whisper-webgpu`,
which runs Whisper locally on the GPU, in Node.js or in the browser. It needs a
compatible GPU, and ONNX Runtime doesn't run on Linux arm64. Packages:

```bash
npx remotion add @remotion/whisper-webgpu @huggingface/transformers mediabunny @mediabunny/server
```

A Node.js script has three jobs: decode the audio to one 16 kHz mono
`Float32Array`, download and load a model, and transcribe.

```ts
// scripts/whisper-captions.ts
import { writeFile } from "node:fs/promises";
import { registerMediabunnyServer } from "@mediabunny/server";
import { ALL_FORMATS, Conversion, FilePathSource, Input, NullTarget, Output, WavOutputFormat } from "mediabunny";
import {
  WHISPER_WEBGPU_SAMPLE_RATE, canUseWhisperWebGpu, downloadWhisperModel,
  loadWhisperModel, toCaptions, transcribe,
} from "@remotion/whisper-webgpu";

registerMediabunnyServer();

// Decodes the file's main audio track to mono at Whisper's sample rate.
const decodeForWhisper = async (path: string): Promise<Float32Array> => {
  const pieces: { offset: number; data: Float32Array }[] = [];
  const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(path) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error(`${path} has no audio track`);
    const conversion = await Conversion.init({
      input,
      output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
      video: { discard: true },
      audio: (t) =>
        t.id !== track.id
          ? { discard: true }
          : {
              codec: "pcm-f32",
              forceTranscode: true,
              numberOfChannels: 1,
              sampleFormat: "f32",
              sampleRate: WHISPER_WEBGPU_SAMPLE_RATE,
              process: (sample) => {
                const data = new Float32Array(
                  sample.allocationSize({ format: "f32", planeIndex: 0 }) / Float32Array.BYTES_PER_ELEMENT,
                );
                sample.copyTo(data, { format: "f32", planeIndex: 0 });
                pieces.push({ offset: Math.round(sample.timestamp * WHISPER_WEBGPU_SAMPLE_RATE), data });
                return sample;
              },
            },
    });
    if (!conversion.isValid) throw new Error(`Can't decode the audio in ${path}`);
    await conversion.execute();
  } finally {
    input.dispose();
  }
  // Lay the decoded pieces into one buffer at their own positions.
  const length = pieces.reduce((n, p) => Math.max(n, p.offset + p.data.length), 0);
  const waveform = new Float32Array(length);
  for (const p of pieces) {
    const skip = Math.max(0, -p.offset);
    waveform.set(p.data.subarray(skip), Math.max(0, p.offset));
  }
  return waveform;
};

const support = await canUseWhisperWebGpu();
if (!support.supported) throw new Error(support.detailedReason);

const channelWaveform = await decodeForWhisper("public/rec/interview.mp4");
const model = "small.en";
await downloadWhisperModel({ model });
await using loaded = await loadWhisperModel({ model });
const result = await transcribe({ channelWaveform, model });
const { captions } = toCaptions({ whisperWebGpuOutput: result });
await writeFile("public/captions/interview.json", JSON.stringify(captions, null, 2));
```

- **Model.** `small.en` is the default for English. For any other language use
  a multilingual model such as `small` and pass the `language` option to
  `transcribe()`: it does not detect the language by itself.
  `getAvailableModels()` lists them all. None of them knows Kurdish
  (toolbox.md, "Sorani voices").
- **In the browser**, skip Mediabunny: `resampleTo16Khz({ file })` turns a
  `File` into the waveform, then `downloadWhisperModel`, `transcribe` and
  `toCaptions` as above.

## Showing captions with Basic Captions

Remotion's Elements include caption components. Basic Captions is the
default; the others are listed at remotion.dev/elements/captions and are worth
a look only when the brief asks for a particular style. Add it to a
composition with the CLI:

```bash
npx remotion elements use https://www.remotion.dev/elements/captions/basic-captions/ --composition <composition-id> --yes
# bun: bunx remotion ...   yarn: yarn remotion ...   pnpm: pnpm exec remotion ...
```

This installs `@remotion/captions` if needed, writes
`basic-captions.element.tsx` beside the composition's component, and drops a
`<BasicCaptions>` with sample words at frame 0 at the top of the composition.
Don't edit `basic-captions.element.tsx`. Move the inserted `<BasicCaptions>`
into the clip it belongs to and replace the sample words.

**Rules for placing it:**
- **Same wrapper as its clip.** Each captioned clip's `<Video>` and
  `<BasicCaptions>` sit together in one `<Sequence>` or
  `<TransitionSeries.Sequence>`, and the clip's `trimBefore`,
  `durationInFrames` and `playbackRate` go on that wrapper (`from` too, if the
  clip is placed on its own). Captions don't inherit a trim or speed set only
  on the `<Video>`. Example in video-clips.md, "A timeline made of clips".
- **One caption list per clip.** Don't gather every clip's captions into one
  overlay above the timeline: moving or deleting a clip should carry its
  captions with it.
- **Write the array inline** in the `captions` prop. Studio's Caption editor
  saves its changes into that array literal; with `captions={captions}` or a
  prop passed down from a generic shot component there is nothing for it to
  write to. If the words came from a JSON file, paste its contents in.
- **Give it a width and a position.** To centre a 900 px caption box in a
  1080 px wide frame, shift it by `(1080 - 900) / 2 = 90` px:
  `width={900} style={{ position: "absolute", bottom: 300, translate: "90px 0px" }}`.
  On Reels, TikTok and Shorts keep it above the apps' own overlay
  (production.md, "Platform safe zones").
- **Speed changes length.** With `playbackRate` on the wrapper,
  `durationInFrames` counts source frames and the clip takes
  `durationInFrames / playbackRate` frames of the timeline. Update the
  composition length if the total changes.

After adding captions, open the Studio (unless the person said not to) so the
captions can be checked against the voice.

## Importing an `.srt`

`parseSrt({ input })` from `@remotion/captions` turns `.srt` text into
`{ captions }` in the `Caption` format. Fetch the file, and hold the render
until it has loaded with `useDelayRender()`:

```tsx
import { parseSrt, type Caption } from "@remotion/captions";
import { useEffect, useState } from "react";
import { staticFile, useDelayRender } from "remotion";

export const SrtCaptions: React.FC<{ file: string }> = ({ file }) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`Loading ${file}`));
  const [captions, setCaptions] = useState<Caption[] | null>(null);

  useEffect(() => {
    fetch(staticFile(file))       // a remote URL works too
      .then((res) => res.text())
      .then((text) => {
        setCaptions(parseSrt({ input: text }).captions);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [file, handle, continueRender, cancelRender]);

  if (!captions) return null;
  return <>{/* draw them, or pass them to a caption component */}</>;
};
```

Parsed captions work with every `@remotion/captions` helper. For Studio
editing, paste the parsed array inline into `<BasicCaptions>` instead of
loading it at render time.
