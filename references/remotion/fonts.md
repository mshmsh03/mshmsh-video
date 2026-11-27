# Fonts in Remotion

Loading fonts so every frame renders with the right face: Google Fonts through `@remotion/google-fonts`, font files through `@remotion/fonts`, and a font whose URL comes from props. Read it when you add or change a font outside what `setup-project.mjs` already wrote into `theme.ts`. This skill's setup, the `--local-fonts` switch for offline renders, combining a Latin and an Arabic font, and the list of Google fonts with every Sorani letter are in production.md ("Project setup", "Arabic and Kurdish captions", "Pitfalls"); this file is the API underneath.

## Contents
- Google Fonts
- Font files from public/
- A font URL from props
- loadFont options for files
- Things that go wrong

## Google Fonts

Remotion's recommended route. Each family is its own typed import, and loading it holds the render until the font is ready, so no frame is drawn in a fallback face.

```bash
npx remotion add @remotion/google-fonts
```

```tsx
import { loadFont } from "@remotion/google-fonts/IBMPlexSansArabic";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["arabic", "latin"],
});

export const Headline = ({ text }: { text: string }) => (
  <h1 dir="rtl" lang="ckb" style={{ fontFamily, fontSize: 110, fontWeight: 700 }}>
    {text}
  </h1>
);
```

- The import path is the family name without spaces: `@remotion/google-fonts/NotoKufiArabic`, `@remotion/google-fonts/Montserrat`.
- `loadFont()` with no arguments loads every weight and subset. Name only the `weights` and `subsets` you use; the download is much smaller.
- Call `loadFont()` at the top level of a module (the component's file, or a `theme.ts` imported early), not inside a component body.
- It returns `fontFamily` (use this string in styles, don't type the name by hand) and `waitUntilDone()`, a promise for when the files are in. Measuring text needs that (text-layout.md).
- Google's `arabic` subset doesn't promise the Sorani letters ڕ ڵ ە ۆ ێ. Pick a family from production.md's checked list.

## Font files from public/

```bash
npx remotion add @remotion/fonts
```

Put the file in `public/` and register it with `loadFont()` from `@remotion/fonts`. It returns a promise; load all weights of one family under the same `family` name, one call each:

```tsx
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const family = "Rabar";

await Promise.all([
  loadFont({ family, url: staticFile("fonts/Rabar-Regular.woff2"), weight: "400" }),
  loadFont({ family, url: staticFile("fonts/Rabar-Bold.woff2"), weight: "700" }),
]);

export const Sign = () => <div style={{ fontFamily: family, fontWeight: 700 }}>...</div>;
```

A variable font can be registered once with a weight range, for example `weight: "200 800"` (production.md uses this for the downloaded Google files).

This is also the way to use a font that isn't on Google Fonts, such as a Kurdish typeface the person or the brand supplies. Check its licence allows embedding in video.

## A font URL from props

When the URL only arrives in input props, load it inside the component and hold the render until it's done. `useDelayRender()` from `remotion` gives `delayRender`, `continueRender` and `cancelRender`:

```tsx
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { useDelayRender } from "remotion";

export const BrandLine = ({ fontUrl, text }: { fontUrl: string; text: string }) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`font ${fontUrl}`));

  useEffect(() => {
    loadFont({ family: "BrandFont", url: fontUrl })
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [fontUrl, handle, continueRender, cancelRender]);

  return <div style={{ fontFamily: "BrandFont" }}>{text}</div>;
};
```

Create the handle once, when the component mounts (the `useState` initialiser does that). If the font fails, `cancelRender` fails the render on purpose: better than a video in the wrong font.

## loadFont options for files

| Option | Required | Notes |
| --- | --- | --- |
| `family` | yes | the name you then use in `fontFamily` |
| `url` | yes | `staticFile(...)` or a full URL |
| `format` | no | worked out from the file extension; pass it (`"woff2"`, `"truetype"`...) when the URL has none, such as an API endpoint |
| `weight` | no | `"400"`, `"700"`, or a range for a variable font |
| `style` | no | `"normal"` or `"italic"` |
| `display` | no | the CSS `font-display` value |

## Things that go wrong

- **Render stops after 30 s with "Timeout ... Fetching <font> font":** Google Fonts can't be reached from the render machine. Use local files (production.md, "Pitfalls").
- **A Kurdish word changes typeface halfway:** the font lacks a Sorani letter and the browser filled it from another font. Change the family.
- **Bold looks smeared or too thin:** the weight wasn't loaded, so the browser faked it. Add it to `weights` or load that file.
- **Arabic text in some unexpected face:** no Arabic-script font is loaded, so the render machine's own fallback draws it, and a different machine gives a different face. Load one and put it in the stack after the Latin font (production.md shows how).
