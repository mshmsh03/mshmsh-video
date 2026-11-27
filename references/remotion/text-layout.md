# Text annotations and measuring in Remotion

Hand-drawn marks on text (highlighter, circle, underline, strike-through, box, bracket) with `@remotion/rough-notation`, and measuring: the size of a string before it is drawn, the largest font size that fits a width, whether words overflow a box (`@remotion/layout-utils`), and the real size of a DOM node despite Studio's zoom. Read it when a word needs to be marked on screen, or when text of unknown length must fit a fixed space (a name, a product title, a translated line). The sizes text should be are in motion.md ("Titles") and production.md (`useLayout()`'s `minText`).

## Contents
- Highlights and hand-drawn marks
- Measuring a string
- Fitting text to a width
- Does it overflow the box?
- Measuring rules
- Measuring a DOM node

## Highlights and hand-drawn marks

```bash
npx remotion add @remotion/rough-notation
```

`npx remotion add` installs it at the project's Remotion version. Choose the component by the mark: `<Highlight>`, `<Circle>`, `<Underline>`, `<StrikeThrough>`, `<CrossedOff>`, `<Box>` or `<Bracket>`. The component decides both the look and whether the mark sits behind the text (a highlight) or over it (a strike-through). Drive its `progress` from 0 to 1 with the frame so it draws itself in step with the video:

```tsx
import { StrikeThrough, Underline } from "@remotion/rough-notation";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const PriceDrop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontSize: 96, fontWeight: 700 }}>
      <StrikeThrough
        color="#e5484d"
        progress={interpolate(frame, [0.4 * fps, 0.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      >
        $49
      </StrikeThrough>{" "}
      <Underline
        color="#f2c14e"
        progress={interpolate(frame, [1.1 * fps, 1.5 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      >
        $19
      </Underline>
    </div>
  );
};
```

Keep the `progress` interpolation inline on the prop, with fixed keyframes rather than values computed elsewhere, so Studio can edit it. To land the mark on a spoken word, use the template's `wordAt(id, "word")` as the start frame. motion.md's rule applies: one highlighted word, and it carries meaning.

## Measuring a string

```bash
npx remotion add @remotion/layout-utils
```

`measureText()` returns the `width` and `height` a string will take:

```tsx
import { measureText } from "@remotion/layout-utils";

const { width, height } = measureText({
  text: "Erbil Coffee Week",
  fontFamily: headingFont,
  fontSize: 120,
  fontWeight: "700",
});
```

Results are cached, so measuring the same thing twice costs nothing.

## Fitting text to a width

`fitText()` returns the `fontSize` at which a string fills `withinWidth`. Cap it, or a two-letter word becomes enormous:

```tsx
import { fitText } from "@remotion/layout-utils";

const { fontSize } = fitText({ text: name, withinWidth: 880, fontFamily: headingFont, fontWeight: "700" });

<div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: Math.min(fontSize, 160) }}>{name}</div>
```

For text meant to be read, the floor matters as much as the cap: if the fitted size falls below `layout.minText`, cut words rather than shrink (motion.md).

## Does it overflow the box?

`fillTextBox({ maxBoxWidth, maxLines })` gives you a box to add words to one at a time. Each `add({ text, fontFamily, fontSize, ... })` returns `exceedsBox`, true when that word no longer fits in the allowed lines:

```tsx
import { fillTextBox } from "@remotion/layout-utils";

const box = fillTextBox({ maxBoxWidth: 900, maxLines: 2 });
const shown: string[] = [];
for (const word of line.split(" ")) {
  if (box.add({ text: word + " ", fontFamily: bodyFont, fontSize: 56 }).exceedsBox) break;
  shown.push(word);
}
```

Use it to find where to break a page of words, or to warn that a line is too long for its card.

## Measuring rules

- **Measure after the font has loaded.** Measuring with the fallback font gives the wrong width. With `@remotion/google-fonts`, `loadFont()` returns `waitUntilDone()`; measure once it resolves. Pass `validateFontIsLoaded: true` to `measureText()` to make it throw if the font isn't ready, instead of quietly measuring the wrong one.
- **Measure with exactly the styles you render with**: the same family, size, weight and `letterSpacing`. Keep them in one object and spread it into both the measuring call and the `style`.
- **Padding and borders change the box but not the measurement.** For a visible frame around measured text, use `outline`, which takes no space, instead of `border`.
- For Arabic-script text, measure the words as they will be drawn (whole words, not split letters), and remember that Arabic fonts run wider than Latin ones (production.md).

## Measuring a DOM node

Studio and the Player show the video scaled to fit the window, by putting a `scale()` transform on the container. `getBoundingClientRect()` therefore returns scaled numbers. Divide by `useCurrentScale()` from `remotion` to get the size in video pixels:

```tsx
import { useCurrentScale } from "remotion";
import { useLayoutEffect, useRef, useState } from "react";

export const useMeasured = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const scale = useCurrentScale();
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setSize({ width: r.width / scale, height: r.height / scale });
  }, [scale]);
  return { ref, size };
};
```

Re-measure when the scale changes, which is why `scale` is in the dependency list. When a measurement only decides sizes (not what text to show), `measureText()` is simpler and works before anything is on screen.
