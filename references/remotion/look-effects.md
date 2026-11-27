# Visual effects in Remotion

Pixel effects from `@remotion/effects` (blur, glow, vignette, grain, halftone, distortion, light leaks and about 80 more), which components take them, turning on WebGL for renders, post-processing any HTML with `<HtmlInCanvas>`, and writing your own effect with `createEffect()`. Read it before adding a glow, a texture, a vignette, a light leak or any other look to a layer. Grading footage (exposure, white balance, Levels, Curves, LUTs) is in look-color.md. When to use an effect at all is a design question for styles.md and design.md; toolbox.md's rule stands: don't fake a supported effect with CSS or SVG overlays.

## Contents
- The effects prop
- Which components take effects
- The list of built-in effects
- Turning on WebGL for renders
- Light leaks
- HtmlInCanvas: post-processing any HTML
- Your own effect with createEffect()

## The effects prop

```bash
npx remotion add @remotion/effects
```

An effect is a function call placed in a component's `effects` array. They run in array order, each on the result of the one before. Effects don't animate by themselves: anything that should change over time is driven from `useCurrentFrame()` and `interpolate()` inside the call.

```tsx
import { Video } from "@remotion/media";
import { vignette } from "@remotion/effects/vignette";
import { blur } from "@remotion/effects/blur";
import { interpolate, staticFile, useCurrentFrame } from "remotion";

export const DreamyClip = () => {
  const frame = useCurrentFrame();
  return (
    <Video
      src={staticFile("clips/beach.mp4")}
      effects={[
        blur({ radius: interpolate(frame, [0, 20], [12, 0], { extrapolateRight: "clamp" }) }),
        vignette({}),
      ]}
    />
  );
};
```

Imports: most effects live at `@remotion/effects/<effect-name>` in kebab case (`@remotion/effects/light-leak`, `@remotion/effects/color-correction`). The exceptions: `uvTranslate()` and `xyTranslate()` both come from `@remotion/effects/translate`. Look up each effect's exact parameters in Remotion's docs (remotion.dev/docs/effects) before using it; they are not all listed here.

Pick the target first. If the vignette belongs to the clip, put it on the `<Video>`; if it belongs to the whole frame, put it on a wrapper (below).

## Which components take effects

| Import from | Components |
| --- | --- |
| `remotion` | `<Img>`, `<CanvasImage>`, `<AnimatedImage>`, `<Solid>`, `<HtmlInCanvas>` |
| `@remotion/media` | `<Video>` |
| `@remotion/gif` | `<Gif>` |
| `@remotion/rive` | `<RemotionRiveCanvas>` |
| `@remotion/shapes` | `<Arrow>`, `<Callout>`, `<Circle>`, `<Ellipse>`, `<Heart>`, `<Pie>`, `<Polygon>`, `<Rect>`, `<Spark>`, `<Star>`, `<Triangle>` |

Plain HTML elements, `<Interactive.*>` wrappers, `<AbsoluteFill>` and `<Sequence>` don't take `effects`. To put an effect on them, or on a group of layers, wrap them in `<HtmlInCanvas>` and give the wrapper the `effects`. For a single element that plain CSS handles well (a border radius, a box shadow on a card), plain CSS is still fine.

## The list of built-in effects

- **Colour and tone:** `brightness()`, `colorCorrection()`, `colorKey()`, `contrast()`, `curves()`, `duotone()`, `exposure()`, `grayscale()`, `hue()`, `invert()`, `levels()`, `linearGradient()`, `linearGradientTint()`, `lut()`, `saturation()`, `shadowsHighlights()`, `thermalVision()`, `tint()`, `vibrance()`, `whiteBalance()`
- **Blur and trails:** `blur()`, `lightTrail()`, `linearProgressiveBlur()`, `radialProgressiveBlur()`, `regionBlur()`, `zoomBlur()`
- **Light:** `dropShadow()`, `longShadows()`, `glow()`, `lightLeak()`, `shine()`, `starburst()`, `vignette()`
- **Distortion and transforms:** `barrelDistortion()`, `chromaticAberration()`, `cornerPin()`, `fisheye()`, `mirror()`, `noiseDisplacement()`, `scale()`, `skew()`, `tile()`, `uvTranslate()`, `wave()`, `xyTranslate()`
- **Textures and patterns:** `burlap()`, `checkerboard()`, `contourLines()`, `dotGrid()`, `emboss()`, `flannel()`, `gridlines()`, `halftone()`, `halftoneLinearGradient()`, `lines()`, `liquidContours()`, `noise()`, `paper()`, `pattern()`, `rings()`, `scanlines()`, `speckle()`, `tvSignalOff()`, `waves()`, `whiteNoise()`, `zigzag()`
- **Edges:** `outline()`, `roughenEdges()`, `shrinkwrap()`, `tear()`
- **Pixelation and reveals:** `evolve()`, `linearProgressivePixelate()`, `pixelate()`, `pixelDissolve()`, `radialProgressivePixelate()`, `venetianBlinds()`

`cylinder()`, `sphere()` and `pageTurn()` also exist and use WebGPU.

Every built-in effect takes `disabled: true` to switch it off without removing it.

## Turning on WebGL for renders

Most effects run on WebGL2; `cylinder()`, `sphere()` and `pageTurn()` run on WebGPU. A render needs WebGL turned on in the Chrome that Remotion drives. Set it once in `remotion.config.ts`, which covers Studio and the CLI:

```ts
import { Config } from "@remotion/cli/config";

Config.setChromiumOpenGlRenderer("angle");
```

For a single render, `npx remotion render --gl=angle` does the same. This skill's template doesn't set it, so add it the first time a project uses an effect, `<HtmlInCanvas>` with WebGL, or a light leak.

## Light leaks

Available from Remotion 4.0.500. Check with `npx remotion versions`; `npx remotion upgrade` updates. (toolbox.md also names the older `@remotion/light-leaks` package; Remotion's current guidance uses this effect instead.)

`lightLeak()` from `@remotion/effects/light-leak` goes on a canvas-based component, usually a full-frame `<Solid>`. Its options:

| Option | Meaning | Default |
| --- | --- | --- |
| `progress` | 0 to 1: the leak grows over the first half and pulls back over the second | `0.5` |
| `seed` | the pattern's shape; each number gives a different leak | `0` |
| `hueShift` | rotates the colour in degrees, 0 to 360: `0` is yellow to orange, `120` green, `240` blue | `0` |
| `disabled` | skip the effect | `false` |

```tsx
import { lightLeak } from "@remotion/effects/light-leak";
import { interpolate, Solid, useCurrentFrame, useVideoConfig } from "remotion";

export const WarmLeak = ({ seed = 0, hueShift = 0 }: { seed?: number; hueShift?: number }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      effects={[
        lightLeak({
          seed,
          hueShift,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }),
      ]}
    />
  );
};
```

Keep the `progress` interpolation inline so Studio can edit it. Its natural home is a `<TransitionSeries.Overlay>` over a cut (animation-transitions.md), where it hides the cut without shortening the video. It also works as a plain top layer in a scene, for a warm flare across a photo.

## HtmlInCanvas: post-processing any HTML

`<HtmlInCanvas>` from `remotion` renders its children into a `<canvas>` so the pixels can be processed. Give it `width` and `height`. With nothing else it just draws the HTML as it is; with `effects` it applies the effects to the whole group; with `onPaint` you draw it yourself.

`onPaint` runs each time the content changes. It receives the `canvas` and an `elementImage` (the captured HTML); draw the capture with the 2D context's `drawElementImage(elementImage, 0, 0)`. Its type is `HtmlInCanvasOnPaint`:

```tsx
import { useCallback } from "react";
import { AbsoluteFill, HtmlInCanvas, type HtmlInCanvasOnPaint, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SoftFocusIn = ({ children }: { children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const onPaint: HtmlInCanvasOnPaint = useCallback(
    ({ canvas, elementImage }) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");
      const px = interpolate(frame, [0, 15], [10, 0], { extrapolateRight: "clamp" });
      ctx.reset();
      ctx.filter = `blur(${px}px) saturate(${1 + px / 20})`;
      ctx.drawElementImage(elementImage, 0, 0);
    },
    [frame],
  );

  return (
    <HtmlInCanvas width={width} height={height} onPaint={onPaint}>
      <AbsoluteFill>{children}</AbsoluteFill>
    </HtmlInCanvas>
  );
};
```

Put `frame` (and anything else the drawing reads) in the `useCallback` list, or the canvas keeps drawing the old frame.

**WebGL in `onPaint`:** create the context, shader program and texture in `onInit`, and return a cleanup function from it. When `elementImage` changes size, allocate the texture again with `gl.texImage2D(..., null)`. In `onPaint`, upload the capture with `gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, elementImage)` and draw. Older Chromium versions only have `gl.texElementImage2D()`; use it when the newer method is missing. Remotion's docs repo has a complete minimal example (`HtmlInCanvasDocsDemoWebGL.tsx`). Renders need the GL setting above.

**`onPaint` can be async.** Remotion holds the frame with `delayRender()` until the promise resolves, which allows multi-pass work with `createImageBitmap`.

Prefer a reusable effect (next section) over `onPaint` when the same treatment is used in several places, needs parameters, should be editable in Studio, or should stack with other effects.

## Your own effect with createEffect()

`createEffect()` from `remotion` makes an effect factory that sits in the same `effects` array as the built-in ones. For a project-only effect, keep it beside the composition, for example `src/effects/grain-tint.ts`.

What the definition needs:

| Field | What it is |
| --- | --- |
| `type` | a stable reverse-DNS id, such as `com.example.grainTint` |
| `label` | the name Studio shows, usually `grainTint()` |
| `documentationLink` | a URL or `null` |
| `backend` | `"2d"`, `"webgl2"` or `"webgpu"` |
| `calculateKey(params)` | a string that contains every resolved parameter that changes the output (it is the cache key) |
| `setup(target)` | create reusable state for the backend, or return `null` |
| `apply({ source, target, width, height, params, state, flipSourceY })` | draw the processed `source` into `target` |
| `cleanup(state)` | free whatever `setup()` created |
| `schema` | an `InteractivitySchema` for the Studio controls (`disabled` is added for you) |
| `validateParams(params)` | throw when a value is missing or out of range |

Choose `"2d"` for anything a 2D canvas can do (filters, `drawImage`, pixel data). Go to WebGL2 only for shader math or speed, and then turn on the GL setting above.

```ts
import { createEffect, type InteractivitySchema } from "remotion";

type WarmthParams = { readonly amount?: number };

const schema = {
  amount: { type: "number", min: 0, max: 1, step: 0.05, default: 0.4, description: "Warmth" },
} as const satisfies InteractivitySchema;

const withDefaults = (p: WarmthParams) => ({ amount: p.amount ?? 0.4 });

export const warmth = createEffect<WarmthParams, null>({
  type: "com.example.warmth",
  label: "warmth()",
  documentationLink: null,
  backend: "2d",
  calculateKey: (p) => `warmth-${withDefaults(p).amount}`,
  setup: () => null,
  apply: ({ source, target, width, height, params }) => {
    const ctx = target.getContext("2d");
    if (!ctx) throw new Error("warmth(): no 2D context");
    const { amount } = withDefaults(params);
    ctx.clearRect(0, 0, width, height);
    ctx.filter = `sepia(${amount * 0.5}) saturate(${1 + amount * 0.3})`;
    ctx.drawImage(source, 0, 0, width, height);
    ctx.filter = "none";
  },
  cleanup: () => undefined,
  schema,
  validateParams: ({ amount = 0.4 }) => {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > 1) {
      throw new TypeError("warmth(): amount must be between 0 and 1");
    }
  },
});

// use: <CanvasImage src={staticFile("photos/shop.jpg")} effects={[warmth({ amount: 0.6 })]} />
```

Rules for a custom effect:

- Don't put `disabled` in your params type or schema; the factory adds it.
- Check parameters in `validateParams`, so a bad value fails when the effect is created, not mid-render.
- Write each default twice, in `schema` and in the defaults helper, and keep them equal.
- Reset every piece of 2D state you change (`filter`, `globalAlpha`, transforms, compositing) after drawing.
- Keep the alpha channel unless changing transparency is the point of the effect.
- A WebGL2 effect compiles its shaders and makes its fullscreen quad, texture and uniform locations in `setup()`, keeps them in `state`, uploads `source` and draws in `apply()` (respecting `flipSourceY` with `UNPACK_FLIP_Y_WEBGL`), and deletes the texture, buffers, program and vertex array in `cleanup()`. Ask for the context with `premultipliedAlpha: true`, `alpha: true` and `preserveDrawingBuffer: true`.
