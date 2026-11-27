# Studio-editable markup

How to write Remotion markup that a person can change in Remotion Studio
(select a layer, drag it, retime it, restyle it, set keyframes) and have the
change saved back into the code. Covers `Interactive` elements, schemas for
your own components, the inline-value rules, editable SVG paths, effects,
tracks and timing groups, with one complete example. Read it before writing a
composition someone will edit in Studio, or before restructuring one. This
skill's template builds its timeline from `story.json` in code, so those
scenes are edited through the story file, not Studio's timeline; these rules
apply to compositions written by hand and to anything handed over for editing
(production.md, "Text someone else will edit later").

## Contents
- The default: editable
- `Interactive` elements
- Inline everything
- Editable SVG paths
- Schemas for your own components
- Units, tracks and timing groups
- A complete example

## The default: editable

Studio edits the JSX nodes that create timeline items. So shape the code
around what the person should be able to select, move, trim or restyle on its
own, and keep each instance's values inline on its node.

Make markup editable unless there is a reason not to. A part may stay
programmatic only when it is generated from outside data (a spreadsheet, an
API) or computed per frame (particles, chart bars); tell the person that part
won't be editable in Studio. Copy you wrote yourself is not outside data.

## `Interactive` elements

Any HTML or SVG element becomes a Studio layer through `Interactive`:
`<Interactive.Div>`, `<Interactive.Span>`, `<Interactive.Svg>`,
`<Interactive.Path>`, and so on. `<Img>` is interactive already.

```tsx
<Interactive.Div name="Price tag" style={{ fontSize: 96, color: "#fff7e6" }}>
  5,000 IQD
</Interactive.Div>
```

- Use them for text or graphics that need their own controls. Layout boxes and
  decoration inside a component stay plain HTML; an interactive component
  already has controls for its root.
- **Name every layer** with a fixed, descriptive string (`name="Hero title"`),
  never a computed one.
- **Fixed text goes inline** between the tags. Use a prop or variable only for
  text that is dynamic or used more than once.

## Inline everything

Studio reads and writes values it can find in the JSX. The rules:

**Styles** are a plain object literal on `style`. No constants (`color: RED`),
no spreads (`...baseStyle`), no `useMemo`, no arithmetic (`scale: frame * 10`).

**Transforms** use the separate CSS properties `translate`, `scale` and
`rotate`, not `transform`: only those are editable.

**Animation** is an `interpolate()` call written inline on the property it
drives, with `useCurrentFrame()`'s `frame` as its first argument. Studio then
shows its keyframes and lets the person move them.
- Output range, `easing`, `extrapolateLeft` / `extrapolateRight` and `output`
  are literal values.
- The input range may use `durationInFrames`, `fps`, `width` and `height`
  destructured straight from `useVideoConfig()`, alone (`fps`), multiplied by
  a number (`2 * fps`, `fps * 2`) or minus a number (`durationInFrames - 1`).
  Other variables, constants and maths are not understood.
- Ease with `Easing.bezier(...)` or `Easing.spring({ damping: 200 })`. For
  `scale`, add `output: "perceptual-scale"`.
- Computing a value first (`const y = interpolate(...)`) and passing `y` loses
  the keyframes.
- CSS `transition`, CSS `animation` and Tailwind animation classes don't
  render in Remotion at all. Rewrite them as `interpolate()`.

```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();

<Interactive.Div
  name="Badge"
  style={{
    fontSize: 72,
    color: "#1b1b1b",
    backgroundColor: "#ffd166",
    scale: interpolate(frame, [0, 0.6 * fps], [0.4, 1], {
      easing: Easing.spring({ damping: 200 }),
      output: "perceptual-scale",
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    translate: interpolate(frame, [durationInFrames - 20, durationInFrames], ["0px 0px", "0px -160px"], {
      easing: Easing.bezier(0.7, 0, 0.84, 0),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  }}
>
  New
</Interactive.Div>
```

**Effects** follow the same rules. The `effects` array is written out in
place, with every parameter literal or an inline `interpolate()`. A
conditional array (`effects={on ? [...] : []}`) or parameters held in
variables can't be keyframed. If one version should have an effect and another
not, render two separate elements.

```tsx
<CanvasImage
  name="Shop front"
  src={staticFile("photos/shop.jpg")}
  width={1080}
  height={1920}
  effects={[
    radialProgressiveBlur({
      center: [0.5, 0.45],
      width: 1.1,
      height: 0.7,
      start: 0.25,
      rotation: interpolate(frame, [0, 90], [0, 30]),
    }),
  ]}
/>
```

**Composition registrations** are inline too: literal `id`, size, `fps`,
length and `defaultProps` on the node, no type assertions, and
`calculateMetadata` only for what is really computed (project-compositions.md).

## Editable SVG paths

Inside an `<Interactive.Svg>`, draw with `<Interactive.Path>` (from
`remotion`) instead of `<path>`, and Studio can edit the shape.

- A still shape: the path string goes straight in `d`, not in a constant.
- A morph: install `@remotion/paths` (`npx remotion add @remotion/paths`) and
  put `interpolatePaths()` inline in `d`. It takes the frame, an input range, a
  list of path strings of the same length, and options (easing, extrapolation,
  posterization). The ranges follow the `interpolate()` rules above. Don't use
  `interpolatePath()` or a variable for this, or the keyframes stop being
  editable.

```tsx
<Interactive.Svg width={400} height={400} viewBox="0 0 400 400">
  <Interactive.Path
    name="Speech bubble"
    d={interpolatePaths(
      frame,
      [0, 20],
      ["M 200 200 L 200 200 L 200 200 Z", "M 60 80 L 340 80 L 200 320 Z"],
      { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    )}
    fill="#ef476f"
  />
</Interactive.Svg>
```

Studio can then change the path at the current frame, add or move keyframes
and adjust their easing. To draw a line on over time, animate
`strokeDasharray` and `strokeDashoffset`.

## Schemas for your own components

`Interactive.create({ Component, layout, schema })` turns your own component
into a Studio layer. Each key in `schema` is a prop Studio can read and change
where the component is used. Props left out of the schema still work but get
no control. Keys can use dot paths such as `style.color`.

| Field `type` | For | Keyframes |
| --- | --- | --- |
| `string` | text: a title, a prompt, a code snippet | no |
| `number` | numbers; optional `min`, `max`, `step`, `integer` | yes |
| `boolean` | on/off | yes (held) |
| `color` | CSS colours | yes |
| `enum` | a choice of `variants`, each with its own nested schema | opt-in (held) |
| `array` | lists of numbers, colours, enums and more | no |
| `asset` | a media source; optional `assetType` | no |
| `font-family` | a CSS font family | no |
| `font-weight` | a font weight | yes |
| `translate`, `scale`, `rotation-css`, `rotation-degrees`, `transform-origin` | transforms | yes |
| `uv-coordinate` | a point on the element as normalized `[x, y]` | yes |
| `svg-path` | SVG path data | yes |
| `remotion-captions` | a `Caption[]` | no |
| `hidden` | a value kept out of the controls | n/a |

- Every field needs a `default`, and should have a `description` (Studio shows
  it as the label). `keyframable: false` gives a field a plain, unanimated
  control.
- Don't declare `style.translate`, `style.scale`, `style.rotate`,
  `style.transformOrigin` or `style.opacity`: `Interactive.create()` adds them
  to every component.
- `text-content` is an old name for `string`.
- Expose what changes per instance (the words, an accent colour), not every
  internal detail.

**Ready-made fragments** to spread into a schema, for CSS on the component's
root:

```tsx
const cardSchema = {
  ...Interactive.textSchema,          // style.color, style.fontSize, style.fontWeight, ...
  ...Interactive.backgroundSchema,    // style.backgroundColor
  ...Interactive.borderRadiusSchema,  // style.borderRadius, ...
  ...Interactive.borderSchema,
  title: { type: "string", default: "", description: "Title" },
} as const satisfies InteractivitySchema;
```

- `Interactive.captionsSchema` is for components that take captions.
- `Interactive.childrenSchema` is for components that take `React.ReactNode`
  children: for now it is a string field labelled "Text" with default `''`.
  It isn't part of `baseSchema` and isn't added for you. Nested markup and
  computed children show as read-only.
- If the children must be a string, declare `children` yourself with
  `type: "string"`.
- `textSchema` styles the text; `childrenSchema` holds the content.
- All options: remotion.dev/docs/interactivity-schema. The longer guide:
  remotion.dev/docs/studio/make-component-interactive.

**The two layouts:**
- `layout: "absolute-fill"` for a scene. The component returns a fragment;
  background and alignment go in `style` on each instance, and the root
  Remotion manages applies them.
- `layout: "none"` for a bounded element (a card, a sticker). Pass `style` on
  to the component's own plain root element. That root needs no extra
  `Interactive.Div`: the component is already the layer.

An exported `Interactive.create()` component registered as a `<Composition>`
also opens in its own timeline (connected compositions, project-compositions.md).

## Units, tracks and timing groups

Decide what moves, trims, restyles, duplicates or gets deleted **together**
before writing any timeline items. A scene, a captioned shot, a summary card,
a sticker with its pop sound: each can be one unit. Inside a unit, layout and
decoration are plain HTML; add an `Interactive` element only where something
needs its own controls.

- **One JSX node per instance** the person might edit separately, with a
  literal `name` and inline timing and look. Reuse the component; don't
  generate all instances from one `.map()`. Loops are right for output meant to
  be one template (particles, chart bars).

| Wanted behaviour | Structure |
| --- | --- |
| Items start independently and never overlap | a named `<Track>`, timing on each item |
| Clips stay back to back when one changes length | `<TransitionSeries>`, timing on each `<TransitionSeries.Sequence>` |
| Several layers move, trim or change speed together | one timed component or `<Sequence>` around them |

- **Tracks by role.** Scenes, music segments, cutaways, stickers, sound
  effects: non-overlapping items of one kind share a track rather than each
  taking a row.
- **On screen together means separate tracks** (or one component that lays
  them out). Staggered entrances don't change that: overlapping cards can't
  share a track.
- **Timing on the item.** Put `from` and `durationInFrames` straight on
  components that accept them. Don't wrap a single timing-capable child in a
  `<Sequence>` just to name or register it. Keep wrappers that give shared
  timing, a size or `TransitionSeries` behaviour.
- **`layout="none"`** on a `<Sequence>` stops it adding a layout element
  (an absolutely filled box) around its children.

Footage-specific rules (one clock per shot, overlays that span cuts, cutaways
over speech) are in video-clips.md.

## A complete example

A sticker element, a scene that uses it, a video with a scene track and a
music track, and the registrations that connect both to their own timelines.

```tsx
// Sticker.tsx: a bounded element
import { Interactive } from "remotion";

const StickerBase: React.FC<{ children: React.ReactNode; style: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ padding: "12px 28px", borderRadius: 999, ...style }}>{children}</div>
);

export const Sticker = Interactive.create({
  Component: StickerBase,
  layout: "none",
  schema: {
    ...Interactive.textSchema,
    ...Interactive.backgroundSchema,
    ...Interactive.childrenSchema,
  },
});
```

```tsx
// MenuScene.tsx: a full-frame scene
import { Interactive } from "remotion";
import { Sticker } from "./Sticker";

const MenuSceneBase: React.FC<{ dish: string }> = ({ dish }) => (
  <>
    <h2 style={{ fontFamily: "Georgia, serif", fontSize: 110, color: "#fff7e6", margin: 0 }}>{dish}</h2>
    <Sticker name="Offer sticker" style={{ fontSize: 48, color: "#1b1b1b", backgroundColor: "#ffd166" }}>
      Today only
    </Sticker>
  </>
);

export const MenuScene = Interactive.create({
  Component: MenuSceneBase,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
    dish: { type: "string", default: "", description: "Dish" },
  },
});
```

```tsx
// MenuVideo.tsx
import { Audio } from "@remotion/media";
import { staticFile, Track, useVideoConfig } from "remotion";
import { MenuScene } from "./MenuScene";

export const MenuVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Track name="Scenes">
        <MenuScene
          name="Kebab"
          durationInFrames={4 * fps}
          dish="Erbil kebab"
          style={{ backgroundColor: "#3d1f12", justifyContent: "center", alignItems: "center", gap: 40 }}
        />
        <MenuScene
          name="Dolma"
          from={4 * fps}
          durationInFrames={4 * fps}
          dish="Dolma"
          style={{ backgroundColor: "#1f3d2b", justifyContent: "center", alignItems: "center", gap: 40 }}
        />
      </Track>
      <Track name="Music">
        <Audio name="Intro sting" src={staticFile("bgm/track.mp3")} durationInFrames={3 * fps} />
        <Audio
          name="Main bed"
          src={staticFile("bgm/track.mp3")}
          from={3 * fps}
          trimBefore={20 * fps}
          durationInFrames={5 * fps}
        />
      </Track>
    </>
  );
};
```

```tsx
// Root.tsx
import { Composition, Folder } from "remotion";
import { MenuScene } from "./MenuScene";
import { MenuVideo } from "./MenuVideo";
import { Sticker } from "./Sticker";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="MenuVideo" component={MenuVideo} width={1080} height={1920} fps={30} durationInFrames={240} />
    <Folder name="Scenes">
      <Composition
        id="MenuScene"
        component={MenuScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={120}
        defaultProps={{
          dish: "Erbil kebab",
          style: { backgroundColor: "#3d1f12", justifyContent: "center", alignItems: "center", gap: 40 },
        }}
      />
    </Folder>
    <Folder name="Elements">
      <Composition
        id="Sticker"
        component={Sticker}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
        defaultProps={{
          children: "Today only",
          style: { fontSize: 48, color: "#1b1b1b", backgroundColor: "#ffd166" },
        }}
      />
    </Folder>
  </>
);
```

Things to notice: each scene instance is its own node with inline props; the
two music clips share a track because they don't overlap; the registrations
use the same exported `MenuScene` and `Sticker` the video uses, with inline
`defaultProps` good enough to preview alone. A connection gives drill-down and
one shared implementation, not necessarily fewer rows in the parent timeline:
check the real parent view rather than adding wrappers to shrink it.
