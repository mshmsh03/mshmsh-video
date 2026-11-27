# Compositions, metadata and props

How a Remotion project registers what it can render: `<Composition>` and
`<Still>` in `Root.tsx`, folders, default props, sizes and lengths worked out
at load time with `calculateMetadata`, props forms from a Zod schema, and
connected compositions that give one scene its own Studio timeline. Read it
when you add a second format or cut, a thumbnail, a video whose length comes
from a file, or fields someone will edit later. This skill's `setup-project.mjs`
writes the first `Root.tsx` (production.md, "Project setup"); this file is for
changing it.

## Contents
- Registering compositions and stills
- Default props
- Lengths and sizes worked out at load time
- Props forms with Zod
- Connected compositions
- Nesting one composition in another

## Registering compositions and stills

A `<Composition>` names a renderable video: its `id`, the `component`, and
`width`, `height`, `fps` and `durationInFrames`. A `<Still>` is a one-frame
image (a thumbnail, a poster) and takes no `fps` or `durationInFrames`.

```tsx
import { Composition, Folder, Still } from "remotion";
import { Promo } from "./Promo";
import { Cover } from "./Cover";

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Reels">
      <Composition
        id="Promo-vertical"
        component={Promo}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={450}
        defaultProps={{ headline: "Open late on Fridays" }}
      />
      <Composition
        id="Promo-square"
        component={Promo}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={450}
        defaultProps={{ headline: "Open late on Fridays" }}
      />
    </Folder>
    <Still id="Cover" component={Cover} width={1280} height={720} />
  </>
);
```

- **One JSX node per registration** when each should be editable on its own in
  Studio (reordered, duplicated, deleted, its values changed). The same
  component can sit behind several registrations, as above.
- **`id` is a string literal** in the JSX, and the metadata sits on the node
  as plain values. Don't add type assertions (`as Props`); type the component
  correctly instead.
- **Generating registrations in a loop** is fine when they are meant to be one
  template that is never edited one by one in Studio.
- **`<Folder>`** groups compositions in Studio's sidebar and can nest. Folder
  names allow only letters, numbers and hyphens.
- Put static values (a fixed size, a fixed length) on the node. Use
  `calculateMetadata` only for the part that really has to be computed.

## Default props

`defaultProps` are the composition's starting values, shown and editable in
Studio before anything renders.

- They must be JSON-serializable. `Date`, `Map`, `Set` and `staticFile()` are
  allowed too.
- For Studio to save edits back into the code, write them as an **object
  literal right on the node**. Not a variable, an import, a spread, a helper's
  return value, or an object wrapped in `satisfies`; and not values taken
  from a loop variable. Studio can't write back to any of those.
- Declare the component's props with `type`, not `interface`, so
  `defaultProps` is type-checked.
- Data that a child editor owns stays on the child. Captions edited in
  Studio's Caption editor are an inline array on `<BasicCaptions>`
  (captions.md), not a field of `defaultProps`.
- Input props from the command line (`--props`) are merged over
  `defaultProps` **shallowly**: a nested object in the input replaces the
  whole default object, it isn't merged key by key (render.md).

## Lengths and sizes worked out at load time

`calculateMetadata` on a `<Composition>` runs before the composition renders
and can override its length, size, frame rate and props. Use it when they
depend on the props, on fetched data or on a media file. Each returned field
is optional and wins over the value on the node:

| Field | Meaning |
| --- | --- |
| `durationInFrames` | length in frames |
| `width`, `height` | size in pixels |
| `fps` | frame rate |
| `props` | the props the component receives (after your changes) |
| `defaultOutName` | output file name; `.mp4` is added for you |
| `defaultCodec` | codec used unless the render command says otherwise |
| `defaultVideoImageFormat`, `defaultPixelFormat`, `defaultProResProfile` | render defaults, used for transparent video (render.md) |

The function receives `props` and an `abortSignal`. Pass the signal to
`fetch`: when someone edits the props in Studio, the earlier request is
cancelled instead of overwriting the newer result.

```tsx
import { type CalculateMetadataFunction } from "remotion";
import { getVideoDuration, getVideoDimensions } from "./media-info"; // media-info.md

const FPS = 30;

type Props = {
  clips: string[];
  sheetUrl: string;
  rows?: { name: string; price: string }[];
};

export const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props, abortSignal }) => {
  // Length: all the clips back to back.
  const seconds = await Promise.all(props.clips.map((src) => getVideoDuration(src)));
  const total = seconds.reduce((a, b) => a + b, 0);

  // Size: the first clip's own size.
  const { width, height } = await getVideoDimensions(props.clips[0]);

  // Data: fetched once here, handed to the component as a prop.
  const res = await fetch(props.sheetUrl, { signal: abortSignal });
  const rows = await res.json();

  return {
    durationInFrames: Math.ceil(total * FPS),
    fps: FPS,
    width,
    height,
    props: { ...props, rows },
    defaultOutName: `menu-${rows.length}-items`,
  };
};

// <Composition id="Menu" component={Menu} width={1080} height={1920} fps={30}
//   durationInFrames={300} defaultProps={{ clips: [...], sheetUrl: "..." }}
//   calculateMetadata={calculateMetadata} />
```

Notes:
- Round the length up (`Math.ceil`) so the last frame of the media isn't lost.
- With transitions between scenes, subtract each overlap from the total.
- Don't use it to return fixed numbers that could sit on the node: that hides
  them from Studio for nothing.
- An async `calculateMetadata` can't be translated to HyperFrames
  (`hyperframes/remotion-to-hyperframes/references/escape-hatch.md`); keep that
  in mind for a video the person may want to edit there later.
- In this skill the story's length comes from `voice.json` (make-voice.mjs), not
  from `calculateMetadata`.

## Props forms with Zod

A Zod schema on a composition turns its props into a form in Studio's
sidebar, and Studio can save the edited values back into the code. This is
the route for text a client edits later (production.md, "Text someone else
will edit later").

Add Zod in the version that matches Remotion (`npx remotion add zod`, or the
`bunx` / `yarn` / `pnpm exec` form), and `@remotion/zod-types` for colour
pickers.

```tsx
// src/Offer.tsx
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const offerSchema = z.object({
  headline: z.string().max(32),
  price: z.string(),
  accent: zColor(),
});

export const Offer: React.FC<z.infer<typeof offerSchema>> = ({ headline, price, accent }) => (
  <div style={{ color: accent }}>{headline} {price}</div>
);

// src/Root.tsx
<Composition
  id="Offer"
  component={Offer}
  schema={offerSchema}
  width={1080}
  height={1920}
  fps={30}
  durationInFrames={300}
  defaultProps={{ headline: "Two for one", price: "5,000 IQD", accent: "#e4572e" }}
/>
```

- The top level must be `z.object()`, since a component's props are always an
  object. Inside it, any Zod type works.
- At render time the props are checked against the schema. Remotion 4 logs a
  warning naming each invalid field and renders anyway; Remotion 5 stops the
  render.
- The props form for Studio's per-element controls is a different thing
  (`InteractivitySchema`, interactivity.md).

## Connected compositions

A connected composition lets a scene or a reusable element open in its own
Studio timeline, while edits there change the same code the full video uses.
Use it for a substantial scene, a card used more than once, or a group that
moves as one (a sticker with its sound, a summary graphic). Layout boxes and
decoration inside it stay plain HTML.

**Connect it in three steps:**
1. Export the component made with `Interactive.create()`: `layout:
   "absolute-fill"` for a scene, `layout: "none"` for a bounded element
   (interactivity.md has the full example).
2. Use that export in the parent, with each instance's props inline. Its
   timing goes on it directly, or on the `<Sequence>` /
   `<TransitionSeries.Sequence>` that already times its layers.
3. Register **the same exported reference** as a `<Composition component>`,
   with a unique literal `id`, inline metadata and typical inline
   `defaultProps`. Registering an inner component, or a wrapper written inline,
   does not connect to what the person sees in the parent.

**Make it stand on its own.** When it opens alone, the parent isn't mounted.
- Load its fonts inside it (or in a module it imports), with the typography it
  needs.
- Give the registration's `defaultProps` a realistic text, background and
  alignment. Those defaults are for the standalone view only; they don't flow
  into the parent's instances, and the instances' props don't flow back.
- Match the parent's `fps` and size unless the difference is on purpose.
- If its captions or overlays read frames of the original media, keep the
  source offset as well as the length in the defaults. Where the instance sits
  in the parent's timeline usually doesn't belong there.
- Each instance the person edits separately is its own JSX node. Reuse the
  component; don't copy its code, and don't produce all instances from one
  `.map()`.

**Pre-composing an existing group** (Studio's pre-compose, or "make this its
own scene"): move the selected markup into a named component and register it.
If the selection already has a meaningful timing wrapper, leave the wrapper
and its props where they are and extract only what is inside. Keep trims,
speed, stacking order, inherited styles, and enough length for sound tails. A
new component file without its registration is not finished.

**Check both views.** Open the full composition and the standalone one. The
group should look and sound the same in both, its own timeline should have
useful units, and double-clicking the instance in the parent should open the
right composition. After a refactor, compare frames at cuts, caption changes,
entrances and audio tails.

A connection makes an editing boundary; it doesn't promise fewer rows in the
parent's timeline. Studio's compact view can still list connected children.
Look at the real parent timeline before saying an extraction tidied it, and
don't add wrappers or hide editable layers just to shrink the row count.

## Nesting one composition in another

To show another composition's component inside this one at its own size, wrap
it in a `<Sequence>` with `width` and `height`:

```tsx
<>
  <Video src={staticFile("rec/background.mp4")} />
  <Sequence name="Price card" from={2 * fps} width={1080} height={1080}>
    <PriceCard />
  </Sequence>
</>
```

When that nested scene should also open in its own editable timeline, make it
a connected composition instead.
