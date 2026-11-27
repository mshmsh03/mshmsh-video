# Motion blur in Remotion

Real motion blur: Remotion renders a moment several times within one frame's exposure and averages them. Two ways to get it: the `motionBlur` prop on a transition, and `<HtmlInCanvasMotionBlur>` from `@remotion/motion-blur` around any moving content. Read it when a fast move strobes or a whip needs a smear. The cheap CSS blur that peaks mid-move, and how many pixels suit text or a full frame, are in motion.md ("Moves, exits, overlap and stagger"); reach for this file when that isn't enough.

## Contents
- Which one to use
- Blur on a transition
- Blur on any content
- Shutter angle and samples
- Cost

## Which one to use

If the move can be expressed as a `TransitionSeries` transition (a slide, a wipe, a flip), use the transition's `motionBlur` prop: it is the optimized path. Use `<HtmlInCanvasMotionBlur>` for everything else: an element flying across a scene, a camera move inside a scene, a video's own motion during a transition.

Both work by drawing the HTML into a canvas, the same mechanism as `<HtmlInCanvas>` (look-effects.md).

## Blur on a transition

```bash
npx remotion add @remotion/transitions
```

```tsx
<TransitionSeries.Transition
  presentation={slide({ direction: "from-right" })}
  timing={springTiming({ durationInFrames: 18 })}
  motionBlur={{ shutterAngle: 180, samples: 16 }}
/>
```

What to know:

- Every built-in presentation supports it. A custom presentation needs to be written as an HTML-in-canvas presentation (Remotion's docs: "Custom HTML-in-canvas presentation").
- Each scene is captured **once**, at the current frame, and only the presentation's movement is sampled between frames. Both scenes still advance during the transition, but a video or animation inside a scene is not blurred by this. To blur that too, wrap the content in `<HtmlInCanvasMotionBlur>`.
- A blurred transition needs a `TransitionSeries.Sequence` on both sides. For a scene in the middle, its entering and exiting transitions must both fit inside its duration without overlapping each other.
- Passing `enterStyle`, `exitStyle`, `innerEnterStyle`, `innerExitStyle`, `outerEnterStyle` or `outerExitStyle` together with `motionBlur` **throws an error**. Put that styling inside the scene, or build it into a custom HTML-in-canvas presentation.

## Blur on any content

```bash
npx remotion add @remotion/motion-blur
```

`<HtmlInCanvasMotionBlur>` must be given `width` and `height`. Its children are rendered at fractional frames: their `useCurrentFrame()` returns each sample's time, so the content must be driven by the frame (which it should be anyway).

```tsx
import { HtmlInCanvasMotionBlur } from "@remotion/motion-blur";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

const Puck = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 800,
        width: 160,
        height: 160,
        borderRadius: 80,
        background: "#f2c14e",
        left: interpolate(frame, [10, 22], [-200, 1100], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        }),
      }}
    />
  );
};

export const FastPass = () => {
  const { width, height } = useVideoConfig();
  return (
    <HtmlInCanvasMotionBlur width={width} height={height} shutterAngle={180} samples={10}>
      <Puck />
    </HtmlInCanvasMotionBlur>
  );
};
```

Wrap only the moving part, not the whole scene: every sample re-renders everything inside.

## Shutter angle and samples

`shutterAngle` is how long the virtual shutter stays open, from `0` to `360`, default `180`. `0` turns the blur off; `360` exposes a whole frame, `180` half, `90` a quarter. In seconds the exposure is `(shutterAngle / 360) / fps`, so `180` at 30 fps is 1/60 s, like a film camera.

`samples` is how many snapshots are averaged within that exposure. It must be a positive whole number. The default is `8` for `<HtmlInCanvasMotionBlur>` (which accepts `1` to `64`) and `16` for a transition's `motionBlur`. Too few samples show as separate ghost copies instead of a smear; raise them for a very fast move.

## Cost

More samples mean a smoother blur and a slower preview and render, roughly in proportion. On a weak PC (an integrated GPU), keep real motion blur to the one or two shots that need it and use the CSS blur from motion.md elsewhere.
