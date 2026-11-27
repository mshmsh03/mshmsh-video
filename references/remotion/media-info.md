# Media info with Mediabunny

How to read a media file's length and picture size with Mediabunny, in the
browser (Studio, `calculateMetadata`) and in Node.js or Bun scripts. Read it
when a composition's length or size should follow a clip, a song or a voice
file. Mediabunny is a library for reading and writing audio and video; its
own short overview for agents is at https://mediabunny.dev/llms.txt. For a
quick look from the terminal, `npx remotion ffprobe <file>` does the same job
(video-clips.md, "FFmpeg").

Install it with the Remotion-matched version: `npx remotion add mediabunny`.

## Where the file comes from

Every read starts with an `Input`: the formats to accept (`ALL_FORMATS`) and a
source.

| The file is | Source |
| --- | --- |
| In `public/` (Studio, `calculateMetadata`) | `new UrlSource(staticFile("bgm/track.mp3"))` |
| On the web | `new UrlSource("https://...")` |
| On disk, in a Node.js or Bun script | `new FilePathSource("public/bgm/track.mp3")` |
| Picked by the user (file input, drag and drop) | `new BlobSource(file)` |

A path in `public/` must go through `staticFile()` before `UrlSource`; a bare
`"track.mp3"` won't resolve. With `FilePathSource`, call `input.dispose()`
when finished: it closes the file handle.

## Length and size

```ts
// src/media-info.ts
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

const open = (src: string) => new Input({ formats: ALL_FORMATS, source: new UrlSource(src) });

// Seconds, for audio or video.
export const getMediaDuration = (src: string) => open(src).computeDuration();
export const getVideoDuration = getMediaDuration;
export const getAudioDuration = getMediaDuration;

// The size the picture is shown at.
export const getVideoDimensions = async (src: string) => {
  const track = await open(src).getPrimaryVideoTrack();
  if (!track) throw new Error(`No video track in ${src}`);
  return { width: track.displayWidth, height: track.displayHeight };
};
```

- `computeDuration()` resolves to seconds (for example `12.48`). Turn it into
  frames with `Math.ceil(seconds * fps)`.
- Use `displayWidth` and `displayHeight`, the size after rotation. A phone
  clip filmed upright can be stored sideways with a rotation flag.
- `getPrimaryVideoTrack()` returns `null` for a file with no picture (an MP3,
  a voice note). An audio-only check is `getPrimaryAudioTrack()`.

In a Node.js script:

```ts
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";

const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource("public/rec/shop.mp4") });
const seconds = await input.computeDuration();
input.dispose();
```

These helpers are what `calculateMetadata` calls to set a composition's
length and size (project-compositions.md). In this skill, scene lengths from
the narration come from `voice.json`, which make-voice.mjs writes; use these
for the person's own clips and songs.
