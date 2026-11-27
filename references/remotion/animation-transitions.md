# Transitions and overlays in Remotion

The `@remotion/transitions` API: `TransitionSeries`, the built-in presentations (fade, slide, wipe, flip, clock wipe), linear and spring timing, overlays that sit on a cut without shortening the video, a custom presentation, and how to work out the total length. Read it when you join two scenes or add a new kind of seam. Which transition to choose, and why each needs a cause on screen, is in motion.md ("Transitions with a cause"); the template already fades and slides between scenes from `story.json`'s `enter`. Motion blur on a transition is in animation-motion-blur.md.

## Contents
- Setup
- Transitions and overlays: the difference
- Built-in presentations and timing
- An overlay on the cut
- Mixing the two
- A custom presentation
- How long the video is

## Setup

```bash
npx remotion add @remotion/transitions
```

Children of a `TransitionSeries` are positioned absolutely, filling the frame. In a multi-scene video keep the outer `TransitionSeries` itself visible in the timeline; Studio otherwise selects the active scene when both have the same full-frame outline.

## Transitions and overlays: the difference

Between two `TransitionSeries.Sequence` elements you can put one of two things:

- `<TransitionSeries.Transition>`: both scenes play at once while one gives way to the other (a crossfade, a slide). The overlap **shortens** the video.
- `<TransitionSeries.Overlay>`: something drawn over a plain cut, such as a light leak. It does **not** change the length.

## Built-in presentations and timing

A transition needs two props: `presentation` (what it looks like) and `timing` (how long and with what curve).

```tsx
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";

export const TwoBeats = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Problem" durationInFrames={90}>
      <ProblemScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={slide({ direction: "from-right" })}
      timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })}
    />
    <TransitionSeries.Sequence name="Fix" durationInFrames={90}>
      <FixScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
    <TransitionSeries.Sequence name="Result" durationInFrames={60}>
      <ResultScene />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
```

Each presentation has its own import path:

| Presentation | Import |
| --- | --- |
| `fade()` | `@remotion/transitions/fade` |
| `slide()` | `@remotion/transitions/slide`; `direction` is `"from-left"`, `"from-right"`, `"from-top"` or `"from-bottom"` |
| `wipe()` | `@remotion/transitions/wipe` |
| `flip()` | `@remotion/transitions/flip` |
| `clockWipe()` | `@remotion/transitions/clock-wipe` |

Timing comes from `@remotion/transitions`:

- `linearTiming({ durationInFrames })`: constant speed.
- `springTiming({ config, durationInFrames })`: spring physics. Leave out `durationInFrames` and the length becomes however long the spring takes to settle, which depends on the fps.

For a right-to-left video (Kurdish, Arabic), a slide that carries the story forward comes `"from-left"`, the direction the reader moves.

## An overlay on the cut

`<TransitionSeries.Overlay>` takes `durationInFrames` (a positive whole number) and an optional `offset`, which moves it off the centre of the cut: positive later, negative earlier, `0` by default. The overlay's frames are centred on the cut point. Its child should fill the frame and run its own animation over the overlay's length:

```tsx
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={75}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Overlay durationInFrames={24} offset={-4}>
    <WarmLeak />
  </TransitionSeries.Overlay>
  <TransitionSeries.Sequence durationInFrames={75}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

`WarmLeak` is a light leak drawn on a `<Solid>`; look-effects.md ("Light leaks") builds it. Inside the overlay, `useVideoConfig().durationInFrames` is the overlay's own length, so a progress of `interpolate(frame, [0, durationInFrames - 1], [0, 1])` covers it exactly.

## Mixing the two

A transition and an overlay can't touch each other: put a scene between them. Scene, overlay, scene, transition, scene works; overlay directly next to a transition does not.

## A custom presentation

A presentation is a component that receives the scene as `children`, plus `presentationDirection` (`"entering"` or `"exiting"`) and `presentationProgress` (0 to 1). Its props type is `TransitionPresentationComponentProps<YourProps>` from `@remotion/transitions`. A sketch of an iris that opens on the entering scene and leaves the exiting one untouched:

```tsx
import type { TransitionPresentationComponentProps } from "@remotion/transitions";
import { AbsoluteFill } from "remotion";

type IrisProps = { x: number; y: number };

const Iris = ({ children, presentationDirection, presentationProgress, passedProps }: TransitionPresentationComponentProps<IrisProps>) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const r = presentationProgress * 2400;
  return (
    <AbsoluteFill style={{ clipPath: `circle(${r}px at ${passedProps.x}px ${passedProps.y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

// use: presentation={{ component: Iris, props: { x: 540, y: 1200 } }}
```

Pass it as `presentation={{ component, props }}` in place of `fade()`. A custom presentation that should take motion blur needs the HTML-in-canvas form (animation-motion-blur.md).

## How long the video is

Every transition overlaps the scenes on either side, so the total is the sum of the scenes minus the sum of the transitions. Overlays add nothing. Two 90-frame scenes with a 24-frame slide make 156 frames, not 180.

Ask a timing object for its length with `getDurationInFrames({ fps })`. It matters for `springTiming` without a fixed duration, whose length is computed from the physics:

```tsx
const slideIn = springTiming({ config: { damping: 200 } });
const total = 90 + 90 + 60 - slideIn.getDurationInFrames({ fps: 30 }) - 12;
```

Set the composition's `durationInFrames` from that sum. The template's `StoryVideo.tsx` and `voice.json` (`overlapOf`) already do this for the story; if you add a transition by hand, add its overlap there too, or the last frames are cut or a gag lands during the fade (production.md, "Pitfalls").
