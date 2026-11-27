# Animation timing in Remotion

How a value changes over frames: `interpolate()`, clamping, `Easing.bezier()` and `Easing.spring()`, several keyframes in one call, scale that looks even, and a deliberately choppy frame rate. Read it when you write any moving property. Which ease suits which job (arrival, camera move, exit) and the spring damping table are in motion.md; this file is the API underneath. Facts checked against Remotion's own agent skills at v4.0.547.

## Contents
- The rules every animation follows
- interpolate() and clamping
- Easing
- Scale that looks even
- Several keyframes
- Posterize: a lower frame rate on purpose
- Writing it so Studio can edit it

## The rules every animation follows

- Everything moves from `useCurrentFrame()`. CSS `transition`, CSS `animation` and Tailwind's animation classes do not render frame by frame; rewrite them as `interpolate()` calls.
- Turn seconds into frames with the `fps` from `useVideoConfig()`, written where it is used (`2 * fps`), never a hard-coded 30. The timing then survives a frame-rate change, and Studio can edit it.
- Call `useCurrentFrame()` in the smallest component that needs it. A whole scene that reads the frame re-renders every child on every frame. Pull a moving title, overlay or volume curve into its own component instead. When you move code across a timing boundary (a `Sequence` with `from`), its frame numbers shift, so keep the same absolute timing.

## interpolate() and clamping

`interpolate(input, inputRange, outputRange, options)` maps the frame onto a value. With no options it is linear and **not clamped**: past the last keyframe it keeps going (an opacity of 1.4, a slide that overshoots off screen). Clamp both ends unless the overshoot is wanted:

```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const Badge = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        opacity: interpolate(frame, [0.5 * fps, 0.9 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      New
    </div>
  );
};
```

The output range may be strings with units, which `interpolate` blends: `["0px 40px", "0px 0px"]` for `translate`, `["-8deg", "0deg"]` for `rotate`.

## Easing

Pass `easing` in the options. Remotion's guidance names two to reach for:

- `Easing.bezier(x1, y1, x2, y2)`: the same four numbers as CSS `cubic-bezier()`. `Easing.bezier(0.16, 1, 0.3, 1)` is a soft arrival with a long tail (the template's `easeOut`).
- `Easing.spring({ damping })`: spring physics squeezed into the keyframe range. `Easing.spring({ damping: 200 })` pushes in with no bounce at all. Lower damping bounces (motion.md has the damping-to-bounce table; it is written for `spring()`, and the damping numbers mean the same here).

`Easing.linear` is constant speed. `Easing.in()`, `Easing.out()`, `Easing.inOut()` wrap the named curves (`Easing.cubic`, `Easing.exp`, `Easing.poly(n)`) as listed in motion.md.

The difference from the `spring({ frame, fps, config })` function the template's `motion.ts` uses: `Easing.spring()` finishes exactly at the last keyframe you set, so its length is yours to pick; `spring()` runs as long as the physics take unless you give it `durationInFrames`.

## Scale that looks even

A linear scale from 0 to 1 seems to slow down as it grows, because each step adds less to what the eye sees. For any `scale` animation add `output: "perceptual-scale"`:

```tsx
scale: interpolate(frame, [0, 0.4 * fps], [0.6, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  output: "perceptual-scale",
}),
```

## Several keyframes

Give as many input and output points as you like, the same number of each. For a different ease per segment, pass `easing` as an array one shorter than the keyframes (n keyframes, n - 1 easings):

```tsx
// pop in, hold, pop out: 4 keyframes, 3 segments
scale: interpolate(
  frame,
  [0, 0.5 * fps, 4 * fps, 4.4 * fps],
  [0, 1, 1, 0],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: [Easing.spring({ damping: 200 }), Easing.linear, Easing.in(Easing.cubic)],
    output: "perceptual-scale",
  },
),
```

## Posterize: a lower frame rate on purpose

`posterize: n` in the options samples the curve only every nth frame and holds it in between, so the move steps like stop-motion or hand-drawn animation while the video stays at its frame rate. Use it only when that look is the point. `posterize: 2` at 30 fps reads as animating "on twos".

## Writing it so Studio can edit it

Remotion Studio can show and drag keyframes, but only those it can find on the element:

- Keep the `interpolate()` call inline in the `style` prop. A value computed in a variable above the JSX shows as read-only.
- Use the separate CSS properties `scale`, `translate` and `rotate` instead of one `transform` string. Fall back to `transform` only for what those three cannot do: `skew()`, `perspective()`, or a chain where the order matters (the template's device tilt, `perspective(2200px) rotateY(...)`, is one).
- Elements from `Interactive` (`<Interactive.Div>` and the rest, from `remotion`) carry a `name` and appear as layers in Studio's timeline. `interactivity.md` covers schemas and editable components; this skill's template does not depend on them.
