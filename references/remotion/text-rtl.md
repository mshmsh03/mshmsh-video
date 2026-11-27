# Kurdish, Arabic and other right-to-left text in Remotion

Getting Sorani Kurdish, Arabic, Persian, Urdu and Hebrew text to read in the right order and keep its letters joined when it animates: the base direction, word-by-word animation, a letter splitter that keeps the joins, and the font traps. Read it before you animate any Arabic-script line yourself, outside the template's `Title` and `Narration` (which already handle direction and never split letters; production.md, "Arabic and Kurdish captions", also lists the Google fonts that have every Sorani letter). motion.md's rule holds: per-word or whole-line entrances, not per-letter.

## Contents
- Set the direction on the container
- Deciding the direction from the words
- Animate words, not letters
- If you must animate letter by letter
- Fonts and styling
- The Safari Player trap

## Set the direction on the container

Put `dir="rtl"` and a `lang` (`"ckb"` for Sorani, `"ar"` for Arabic, `"fa"`, `"ur"`, `"he"`) on the element that holds the line.

The trap: as soon as each word is its own `display: inline-block` span (which `translate`, `scale` and `rotate` need), the browser's bidi algorithm treats those boxes as neutral. A line without a base direction then falls back to left to right, and lays the words out left to right. Every word looks correct, and the sentence reads backwards. This is the usual way word-by-word captions and karaoke highlights break in Arabic script. `dir="rtl"` on the parent fixes it.

## Deciding the direction from the words

When the text arrives in props, decide the direction from the words, by majority. Don't test only the first character: Kurdish and Arabic lines often open with a Latin brand or app name.

```tsx
// Hebrew, Arabic, Syriac, Thaana and the Arabic presentation forms
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

export const directionOf = (words: string[]): "rtl" | "ltr" => {
  const rtlWords = words.reduce((n, w) => n + (RTL_CHAR.test(w) ? 1 : 0), 0);
  return rtlWords * 2 > words.length ? "rtl" : "ltr";
};

<div dir={directionOf(words)} lang={lang}>{/* one span per word */}</div>
```

The template's `Narration` decides each caption page the same way.

## Animate words, not letters

An Arabic-script letter takes a different shape depending on whether it joins the letter before it, the letter after it, both or neither. Split a word with `text.split("")`, `[...text]` or `Array.from(text)` and put each letter in an `inline-block`, and each letter is shaped on its own: the word falls apart into isolated letters.

So split on spaces, set `dir="rtl"` on the container, and animate each word (or the whole line). The word entrances in motion.md (blur-in per word, grey to ink, whole-line blur) all work this way.

## If you must animate letter by letter

A name reveal sometimes really needs letters. Split into units the browser can still join:

- a vowel mark (harakat, and the other combining marks) stays in the unit of its letter;
- lam followed by alef (`لا`, `لأ`, `لإ`, `لآ`) stays one unit: it is a ligature;
- a run of digits or Latin letters stays one unit, or the right-to-left line reverses it;
- a zero-width joiner (U+200D) goes on each side of a unit that connects to its neighbour, so each unit is drawn in its joined form.

Whether a letter connects forward depends on the letter. Most join on both sides; a set join only the letter before them (alef forms, dal, thal, ra, zain, waw, teh marbuta, and in Kurdish and Persian also ڕ ژ ۆ ە and their relatives); hamza (ء) joins nothing. A zero-width non-joiner (U+200C), which Kurdish and Persian text uses, is not a letter, so it correctly breaks the join.

```tsx
const ZWJ = "‍";
type Range = [number, number];
const inRanges = (ranges: Range[]) => (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return ranges.some(([a, b]) => c >= a && c <= b);
};

const isMark = inRanges([[0x064b, 0x065f], [0x0670, 0x0670], [0x06d6, 0x06ed]]);
const isLetter = inRanges([[0x0620, 0x064a], [0x066e, 0x06d3], [0x06d5, 0x06d5], [0x06fa, 0x06fc], [0x06ff, 0x06ff]]);
// letters that join only the letter before them
const joinsBackOnly = inRanges([
  [0x0622, 0x0625], [0x0627, 0x0627], [0x0629, 0x0629], [0x062f, 0x0632], [0x0648, 0x0648],
  [0x0671, 0x0673], [0x0675, 0x0677], [0x0688, 0x0699], [0x06c0, 0x06c0], [0x06c3, 0x06cb],
  [0x06cd, 0x06cd], [0x06cf, 0x06cf], [0x06d2, 0x06d3], [0x06d5, 0x06d5],
]);
const HAMZA = "ء";
const LAM = "ل";
const ALEFS = "آأإا";
const NEUTRAL_RUN = /^[0-9٠-٩۰-۹A-Za-z٫٬.,:%]+$/;

const bare = (unit: string) => [...unit].filter((ch) => !isMark(ch) && ch !== ZWJ);
const canJoinBefore = (unit: string) => {
  const ch = bare(unit)[0] ?? "";
  return isLetter(ch) && ch !== HAMZA;
};
const canJoinAfter = (unit: string) => {
  const ch = bare(unit).at(-1) ?? "";
  return isLetter(ch) && ch !== HAMZA && !joinsBackOnly(ch);
};

export const splitJoinedLetters = (text: string): string[] => {
  // 1. letters with their marks
  const clusters: string[] = [];
  for (const ch of text) {
    if (isMark(ch) && clusters.length > 0) clusters[clusters.length - 1] += ch;
    else clusters.push(ch);
  }
  // 2. merge lam-alef and runs of digits or Latin
  const units: string[] = [];
  for (const c of clusters) {
    const prev = units.at(-1);
    const prevIsLoneLam = prev !== undefined && bare(prev).join("") === LAM;
    if (prev !== undefined && NEUTRAL_RUN.test(prev) && NEUTRAL_RUN.test(c)) units[units.length - 1] = prev + c;
    else if (prevIsLoneLam && ALEFS.includes(bare(c)[0] ?? "")) units[units.length - 1] = prev + c;
    else units.push(c);
  }
  // 3. joiners where two neighbours connect
  return units.map((u, i) => {
    const before = i > 0 && canJoinAfter(units[i - 1]) && canJoinBefore(u) ? ZWJ : "";
    const after = i < units.length - 1 && canJoinAfter(u) && canJoinBefore(units[i + 1]) ? ZWJ : "";
    return before + u + after;
  });
};
```

Render the units as one `inline-block` span each inside a `dir="rtl"` container, and animate the spans as usual. In the Chrome that Remotion renders with, the letters join exactly as in the unsplit word. Check one still of a Kurdish word with ڵ, ێ and ۆ before building on it.

## Fonts and styling

- Load an Arabic-script font explicitly (fonts.md). A Latin-only font leaves the Arabic letters to whatever font the render machine happens to have.
- For Sorani, the font also needs ڕ ڵ ە ۆ ێ. Remotion's guidance suggests Noto Sans Arabic, IBM Plex Sans Arabic, Cairo or Tajawal for Arabic; of those, **Cairo and Tajawal lack Sorani letters** (production.md's checked list), so use them for Arabic only.
- No `letterSpacing` and no `textTransform` on Arabic-script text. Spacing pulls joined letters apart, and there are no capitals to transform. The template's components already drop both on right-to-left text.

## The Safari Player trap

The zero-width-joiner technique needs the font to contain a glyph for U+200D. Chrome copes either way, so **rendered videos are not affected**. Safari does not: when the font has no U+200D glyph, it draws the padded letter in a fallback font, so the same composition shown in Remotion's `<Player>` on an iPhone or Mac can mix two typefaces inside one word.

As served by Google Fonts, Alexandria, IBM Plex Sans Arabic, Cairo and Tajawal have no U+200D glyph; Noto Sans Arabic and Noto Naskh Arabic have one. If a per-letter reveal will be shown in a `<Player>` on the web, use one of the Noto fonts.
