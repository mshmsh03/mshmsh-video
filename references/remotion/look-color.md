# Colour correction and grading in Remotion

Fixing and grading the colour of footage and photos with `@remotion/effects`: `colorCorrection()` for exposure, white balance, contrast and saturation in one pass, `levels()` and `curves()` for tone, and `lut()` for a `.cube` grade. Read it when a clip is too dark, too blue or flat, when clips from different phones must match, or when the person wants a film look. The effects system itself (install, which components take `effects`, the WebGL setting for renders) is in look-effects.md.

## Contents
- One pass: colorCorrection()
- Levels
- Curves
- LUTs
- Order in the stack
- In Studio

## One pass: colorCorrection()

Prefer `colorCorrection()` from `@remotion/effects/color-correction` whenever you change more than one thing: it does all of them in a single WebGL pass and shows its controls in Studio. Leave out a control and it stays neutral.

| Control | Range | Neutral |
| --- | --- | --- |
| `exposure` | stops, `-5` to `5`; up is brighter | `0` |
| `temperature` | `-1` cooler to `1` warmer | `0` |
| `tint` | `-1` greener to `1` more magenta | `0` |
| `shadows`, `highlights` | `-1` to `1`; below 0 darkens that region, above lifts it | `0` |
| `blacks`, `whites` | `-1` to `1`; narrower regions near pure black and white | `0` |
| `contrast` | a multiplier of 0 or more, around `pivot` (`0` to `1`, default `0.5`) | `1` |
| `saturation` | a multiplier of 0 or more; `0` is black and white | `1` |
| `vibrance` | `-1` to `1`; above 0 boosts the muted colours more than the strong ones | `0` |

It always applies them in this order: exposure, white balance, the tonal regions, contrast, saturation, vibrance. If you need another order, or one more step in between, use the single effects instead: `exposure()`, `whiteBalance()`, `shadowsHighlights()`, `contrast()`, `saturation()`, `vibrance()`.

```tsx
import { colorCorrection } from "@remotion/effects/color-correction";
import { Video } from "@remotion/media";
import { staticFile } from "remotion";

// a phone clip shot indoors: a little dark and blue
export const KitchenClip = () => (
  <Video
    src={staticFile("clips/kitchen.mp4")}
    effects={[colorCorrection({ exposure: 0.4, temperature: 0.2, shadows: 0.1, vibrance: 0.1 })]}
  />
);
```

Keep the call and its numbers inline on the `effects` prop so Studio can edit them.

## Levels

`levels()` from `@remotion/effects/levels` sets where black and white sit and bends the midtones.

- `blackPoint`, `whitePoint`: input, `0` to `1`, defaults `0` and `1`. `blackPoint` must be smaller than `whitePoint`.
- `gamma`: `0.01` to `10`, default `1`. Above 1 brightens the midtones.
- `outputBlack`, `outputWhite`: `0` to `1`, defaults `0` and `1`. Swapping them inverts the image. Raising `outputBlack` a little gives faded, milky blacks.
- `channel`: `'rgb'` by default, or `'red'`, `'green'`, `'blue'` for one channel.

## Curves

`curves()` from `@remotion/effects/curves` takes control points, for an S-curve or any shape Levels can't make.

- `points`: `2` to `32` pairs of `[input, output]`, both `0` to `1`, inputs strictly increasing. Outputs can go up or down. The default `[[0, 0], [1, 1]]` changes nothing. Inputs before the first point or after the last take that end point's output.
- `interpolation`: `'smooth'` by default (passes through the points without overshooting them), or `'linear'` for straight segments.
- `amount`: `0` to `1`, how much of the result is blended over the original, default `1`.
- `channel`: as for Levels. For different shapes per channel, stack several `curves()` calls.

Levels and Curves both keep the alpha channel. `curves()`, the channel and output controls of `levels()`, and their graph editors in Studio arrived in Remotion **4.0.537**.

```tsx
import { curves } from "@remotion/effects/curves";
import { levels } from "@remotion/effects/levels";

effects={[
  levels({ blackPoint: 0.04, whitePoint: 0.96, outputBlack: 0.03 }),       // a touch of fade
  curves({ points: [[0, 0], [0.25, 0.2], [0.75, 0.82], [1, 1]] }),           // gentle S for contrast
  curves({ channel: "blue", points: [[0, 0.06], [1, 0.94]], amount: 0.7 }),  // blue into the shadows
]}
```

To animate the curve, compute `points` from `useCurrentFrame()` in code and make sure the inputs still rise on every frame. Studio cannot keyframe curve points, and shows computed points as read-only.

## LUTs

`lut()` from `@remotion/effects/lut` applies a 3D LUT (a lookup table from input colours to output colours). Its `content` is the **whole text of the `.cube` file** as a string; there is no `src` prop.

- Only 3D `.cube` files. `LUT_3D_SIZE` is a whole number from `2` to `256`, followed by exactly size³ lines of RGB values. 1D LUTs don't work.
- `TITLE`, `DOMAIN_MIN`, `DOMAIN_MAX`, blank lines and `#` comments are allowed. Other LUT formats must be converted to `.cube` first.
- There is no strength or amount. To compare with and without, set `disabled: true`.

One way to load a file from `public/` is to fetch its text under `delayRender()`, or import it as a string with your bundler; keep the file itself in `public/` so Studio's Assets panel shows it.

Don't write a LUT just to warm a clip or raise its exposure: `colorCorrection()` does that (toolbox.md).

## Order in the stack

Effects run in array order. Put the corrections (exposure, white balance, Levels) **before** `lut()`, so the LUT receives footage that is already balanced, which is what a LUT is designed for. A look on top of a LUT (grain, vignette) goes after it.

To make clips from different cameras match, correct each clip on its own `<Video>` first, then apply the same LUT to all of them.

## In Studio

Select the layer and open its effect in the inspector.

- Levels shows a histogram of the incoming pixels with handles for black, gamma and white, and the two output ends.
- Curves shows the histogram behind the graph; add, drag, type, delete points, or reset.
- The histogram shows the pixels as they arrive at that effect, so earlier effects in the stack are already in it.
- Levels' number controls and Curves' `amount` can be keyframed in Studio; curve points cannot.
- Drag a 3D `.cube` file from the computer or from the Assets panel onto a video in the canvas or the timeline, and Studio adds the `lut()` effect.
