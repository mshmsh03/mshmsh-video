# Images, cropping, GIFs and Lottie in Remotion

Still images (`<Img>`, `<CanvasImage>`), image paths built in code and image sequences, reading an image's size, cropping with the `crop*` props, animated GIF, APNG, WebP and AVIF that stay in step with the timeline (`<AnimatedImage>`, `<Gif>`), and After Effects animations through `@remotion/lottie`. Read it when you place a picture, a sticker, a meme GIF or a Lottie icon. The template's `PhotoCard`, `PhotoFill` and `Shot` already handle the person's photos and screenshots (production.md, "Components cheat sheet"); where to find free Lottie files and their licences is in toolbox.md ("Animation resources").

## Contents
- Still images
- Paths built in code
- An image's width and height
- Cropping
- Animated images and GIFs
- Lottie

## Still images

Files go in `public/` and are referenced with `staticFile()`; a remote URL can be passed as it is. Both `<Img>` and `<CanvasImage>` from `remotion` wait for the image to load before the frame is captured, so no frame shows a blank box (a plain `<img>` doesn't promise that). Remotion's current guidance names `<CanvasImage>` as the default for images; it also takes `effects` and the `crop*` props, as `<Img>` does. The template's components use `<Img>`, which works.

Size and place an image with `style`, like any element:

```tsx
<CanvasImage
  src={staticFile("photos/shop-front.jpg")}
  style={{ position: "absolute", left: 100, top: 320, width: 880, height: 1100, objectFit: "cover" }}
/>
```

For a pan or zoom, move a wrapper around the image, not the image itself (motion.md, "The right mechanism").

## Paths built in code

`staticFile()` takes any string, so the path can come from a template literal:

```tsx
const frame = useCurrentFrame();

<Img src={staticFile(`flipbook/${String(frame).padStart(4, "0")}.png`)} />  // an image sequence, one file per frame
<Img src={staticFile(`avatars/${guest.id}.jpg`)} />                         // chosen by props
<Img src={staticFile(`icons/${done ? "check" : "dot"}.svg`)} />             // chosen by state
```

An image sequence like this needs one file for every frame it covers; a missing number fails the render.

## An image's width and height

`getImageDimensions()` from `@remotion/media-utils` resolves to `{ width, height }`:

```tsx
import { getImageDimensions } from "@remotion/media-utils";

const { width, height } = await getImageDimensions(staticFile("photos/poster.png"));
```

Use it to keep an aspect ratio, or inside a composition's `calculateMetadata` to make a still the exact size of the picture:

```tsx
import type { CalculateMetadataFunction } from "remotion";

export const fitToPoster: CalculateMetadataFunction = async () => {
  const { width, height } = await getImageDimensions(staticFile("photos/poster.png"));
  return { width, height };
};
```

## Cropping

Cut edges off a layer with `cropLeft`, `cropRight`, `cropTop` and `cropBottom`. Each is a fraction from `0` (no crop on that edge) to `1` (the whole thing). Studio then shows the outline at the crop and lets the person drag it, and the values can be keyframed with `interpolate`:

```tsx
// a wipe-on reveal from the right edge
<CanvasImage
  src={staticFile("shots/dashboard.png")}
  cropRight={interpolate(frame, [0, 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
  cropTop={0.08}
/>
```

Components with `crop*` props: `<Sequence>` (only with `layout="absolute-fill"`), the `<Interactive.*>` HTML and SVG elements, components made with `Interactive.create()` that use a managed `layout: 'absolute-fill'` root or pass `style` on to their own visible root, `<CanvasImage>`, `<Img>`, `<AnimatedImage>`, `<HtmlInCanvas>` and `<Solid>` from `remotion`, `<Video>` from `@remotion/media`, `<Gif>` from `@remotion/gif`, and `<RemotionRiveCanvas>` from `@remotion/rive`.

**Never combine `clipPath` with the `crop*` props** on the same element. motion.md's mask and iris reveals use `clipPath`; put them on a wrapper around a cropped layer, not on the layer itself.

## Animated images and GIFs

A GIF dropped in as `<img>` plays at its own speed and ignores the frame, so it differs between preview and render. `<AnimatedImage>` from `remotion` follows the timeline instead. It plays GIF, APNG, AVIF and WebP, from `public/` or from a URL (the server must allow CORS):

```tsx
import { AnimatedImage, staticFile } from "remotion";

<AnimatedImage
  src={staticFile("memes/thumbs-up.gif")}
  width={420}
  height={420}
  fit="contain"
  playbackRate={1}
  loopBehavior="pause-after-finish"
  style={{ position: "absolute", right: 80, bottom: 520, borderRadius: 24 }}
/>
```

- Size it with the `width` and `height` props; use `style` for everything else (position, radius).
- `fit`: `"fill"` stretches (the default), `"contain"` fits inside keeping the shape, `"cover"` fills and crops.
- `playbackRate`: `2` twice as fast, `0.5` half speed.
- `loopBehavior`: `"loop"` (default) repeats; `"pause-after-finish"` plays once and holds the last frame; `"clear-after-finish"` plays once and then shows nothing.

`<AnimatedImage>` works only in Chrome and Firefox. If it fails, use `<Gif>` from `@remotion/gif` (`npx remotion add @remotion/gif`): the same props, GIF files only.

**Length of a GIF:** `getGifDurationInSeconds()` from `@remotion/gif` returns its length in seconds. To make a composition exactly one loop long, return `durationInFrames: Math.ceil(seconds * fps)` from `calculateMetadata`, with the composition's real fps.

## Lottie

```bash
npx remotion add @remotion/lottie
```

`<Lottie>` from `@remotion/lottie` plays an After Effects animation exported as JSON, frame by frame with the timeline. The JSON has to be loaded before the frame is drawn: fetch it inside `delayRender()`, keep it in state, release the frame with `continueRender()`, and fail the render with `cancelRender()` if the fetch fails.

```tsx
import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

export const LottieIcon = ({ file, size }: { file: string; size: number }) => {
  const [handle] = useState(() => delayRender(`lottie ${file}`));
  const [data, setData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(staticFile(file))
      .then((res) => res.json())
      .then((json: LottieAnimationData) => {
        setData(json);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [file, handle]);

  return data ? <Lottie animationData={data} style={{ width: size, height: size }} /> : null;
};
```

Download the JSON into `public/` rather than fetching from a website at render time: a render that depends on someone else's server can fail. `<Lottie>` takes `style` for size, position and any animation you drive from the frame.
