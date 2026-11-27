# Sequencing, trimming and scenes in Remotion

When things start, how long they last, how fast they play and how scenes line up: the timing props (`from`, `trimBefore`, `durationInFrames`, `playbackRate`, `loop`), `<Sequence>`, `Track` and `TransitionSeries`. Read it when you place a clip, a title or a scene on the timeline, or trim a piece of footage. This skill's `StoryVideo.tsx` already builds the scene timeline from `story.json` (production.md, "Files and what they do"); this file is for what you add inside a scene and for projects built by hand.

## Contents
- The timing props
- The order Remotion applies them in
- When to use a Sequence, a Track or a TransitionSeries
- Videos with many scenes

## The timing props

Recent Remotion versions put these props straight on the built-in components: `<AbsoluteFill>`, `<Interactive.*>`, `<Img>`, `<AnimatedImage>`, `<CanvasImage>`, `<HtmlInCanvas>`, `<Solid>`, `<Sequence>` and `<Track>` from `remotion`, `<Video>` and `<Audio>` from `@remotion/media`, `<Gif>`, and components made with `Interactive.create()`. On anything else, wrap it in a `<Sequence>`, which has them all.

Write each one with `fps` from `useVideoConfig()` in the component that renders the item: `from={1.5 * fps}`, not `from={45}`.

| Prop | What it does |
| --- | --- |
| `from` | the frame of the parent's timeline where the item appears. Inside, `useCurrentFrame()` starts again at 0. |
| `trimBefore` | the first frame of the item's own timeline. On footage it cuts off the start; on a component the children's frame starts at that number. |
| `durationInFrames` | how many frames of the item's own timeline play, counted from `trimBefore`. Ends a clip early without editing the file. |
| `playbackRate` | speed. At 2, children advance two frames per parent frame, and the item takes `durationInFrames / playbackRate` frames of the parent. |
| `loop` | repeats the chosen range until the parent ends. |

```tsx
const { fps } = useVideoConfig();

// seconds 4 to 7 of the clip, starting 1 s into the scene, at 1.5x speed
<Video
  src={staticFile("rec/demo.mp4")}
  from={1 * fps}
  trimBefore={4 * fps}
  durationInFrames={3 * fps}
  playbackRate={1.5}
/>
```

Looping: `<Video>`, `<Audio>`, `<Gif>` and `<AnimatedImage>` can loop without `durationInFrames`; the media's own length after `trimBefore` is the loop. Anything else needs `durationInFrames` to know what to repeat. `<Img>`, `<CanvasImage>`, `<Solid>` and the shapes never change over time, so they take no `loop`.

Put timing and volume on the `<Audio>` element itself rather than on a wrapper.

## The order Remotion applies them in

1. `from` places the item in the parent.
2. `trimBefore` picks where the item's own timeline begins.
3. `durationInFrames` picks how much of it is used.
4. `playbackRate` stretches or squeezes that range.
5. `loop` repeats it until the parent ends.

So a child calling `useCurrentFrame()` sees `trimBefore + (frame - from) * playbackRate`. When a trimmed, sped-up clip shows the wrong moment, work it out with that line.

A constant speed is `playbackRate`; a speed ramp is not built in (motion.md, "The right mechanism").

## When to use a Sequence, a Track or a TransitionSeries

- **Props on the item itself** when it should be timed and edited on its own: one title, one clip.
- **A shared `<Sequence>`** when several layers must start, trim or change speed together, when the child doesn't accept timing props, or when you override the width and height for what's inside. Its `layout` decides the wrapper: `"absolute-fill"` makes it behave like `<AbsoluteFill>` and positions the content; `"none"` adds no element at all, for grouping only. (`<Series>` from `remotion` plays its children one after another; the template's `CutClip` uses it.)
- **`Track`** for items that don't overlap and each have their own start time.
- **`TransitionSeries`** for scenes that follow each other and should all move up or back when one of them gets longer or shorter. Keep each scene in its own `TransitionSeries.Sequence`, even when the child could take timing props itself. Transitions and overlays are in animation-transitions.md.

## Videos with many scenes

Give each real scene its own component, and keep each scene's name, timing and props written in the parent, where they can be read at a glance.

- Scenes with start times of their own: a named `Track`, every scene with an explicit `from` and `durationInFrames`, never overlapping.
- Scenes that stay back to back as lengths change: `TransitionSeries`, the duration and the source trim on each `TransitionSeries.Sequence`. Every transition overlaps two scenes, so subtract its length from the total (animation-transitions.md, "How long the video is"). This is what `StoryVideo.tsx` does.

A scene that needs its own editable timeline in Studio can become a connected composition; that is covered with compositions, not here.
