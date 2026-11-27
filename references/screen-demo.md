# Screen demo recordings

Adapted from the `ui-demo` skill by affaan-m (github.com/affaan-m/ecc, MIT).

How to record a clean screen recording of a real website or web app (clicks, typing, a menu opening, a form sent) with Playwright, and turn it into a clip that plays inside the `Laptop` or `Phone` mockup of a mshmsh-video project. It covers the three passes (discover, rehearse, record), a visible cursor that glides instead of jumping, pacing, the recording script, and the conversion into `public/rec/`. Read it when a promo, tutorial or pull-request video should show the product moving rather than still screenshots. For still screenshots and whole-site captures, see production.md, "Screenshots and app images"; a plain scroll down a page is sharper as a tall screenshot panned in Remotion than as a recording.

## Contents
- Setup on this PC
- Three passes: discover, rehearse, record
- Pass 1: discover
- Pass 2: rehearse
- Pass 3: record
- The recording script
- From recording to clip
- Checklist
- Pitfalls

## Setup on this PC

Windows 11 with Chrome installed; everything here is free.

```bash
npm i -D playwright
npx playwright install chromium   # Playwright's own browser, about 150 MB
```

Playwright can also drive the installed Chrome with `chromium.launch({ channel: "chrome" })` and skip the download (not tested here). Either way it uses its own fresh profile, never the person's.

Sizes, chosen to match this skill's device frames exactly:

| Shown in | `viewport` and `recordVideo.size` |
| --- | --- |
| `<Laptop>` (screen 16:10) | `1440 x 900` |
| `<Phone>` (screen 390:844) | `390 x 844`, plus `isMobile: true`, `hasTouch: true`, `deviceScaleFactor: 3` |

Always set `recordVideo.size` as well as `viewport`: without it Playwright scales the video down to fit inside 800x800.

Use a demo account and sample data. Nothing private (real customers, emails, phone numbers, balances) goes on screen; check the frames afterwards anyway.

## Three passes: discover, rehearse, record

Every recording goes through the three, in order. Going straight to recording is how demos break: a selector silently misses, the cursor clicks nothing, and the take is wasted.

## Pass 1: discover

Open each page of the flow and list what can actually be clicked or typed into, before writing a single step. A field you assume is an `<input>` may be a `<textarea>`; a dropdown may be a custom component instead of a `<select>`; a comment box may react to `@` or `#`.

```js
// Run on each page of the flow, before writing the demo steps.
const controls = await page.evaluate(() =>
  [...document.querySelectorAll("input, select, textarea, button, a, [contenteditable], [role]")]
    .filter((el) => el.offsetParent !== null)
    .map((el) => ({
      tag: el.tagName,
      type: el.type || "",
      name: el.name || "",
      role: el.getAttribute("role") || "",
      placeholder: el.placeholder || "",
      text: (el.textContent || "").trim().slice(0, 40),
      editable: el.isContentEditable,
    })),
);
console.log(JSON.stringify(controls, null, 2));
```

Look for:
- **Field kinds:** `<select>`, `<input>`, a custom dropdown or a combobox.
- **Select options:** list both value and text (`[...el.options].map((o) => ({ value: o.value, text: o.text }))`). A placeholder option often has `value="0"` or `value=""` and text like "Select...", which looks like a real choice; skip it.
- **Rich text:** mentions, tags, Markdown or emoji in comment boxes (the placeholder usually says).
- **Required fields:** `required`, a `*` in the label, or the errors shown when the form is sent empty.
- **Fields that appear later,** once another field is filled.
- **Exact button text:** "Send" is not "Submit" is not "Submit request".
- **Tables of inputs:** map each numeric input to its column header instead of treating them all alike.

Write the result down as a short map per page, for example:

```text
/orders/new
  Branch: <select>, first on the page, 4 options (first is "Select branch", value 0)
  Pickup time: <input type="time">
  Note: <textarea>
  Add item: <button> "Add item"; rows appear as inline-editable cells
  Send: <button> "Place order", disabled until an item exists
```

The site is in Kurdish or Arabic? Button text and placeholders are in that language and the layout is right-to-left: copy the exact strings from the dump rather than typing them from memory, and prefer `getByRole` with the exact name or a stable `data-` attribute over positions.

## Pass 2: rehearse

Walk the whole flow without recording and confirm that every target is there and visible. When one isn't, fail loudly and print what is visible instead.

```js
async function mustSee(page, target, label) {
  const el = typeof target === "string" ? page.locator(target).first() : target;
  if (await el.isVisible().catch(() => false)) {
    console.log(`ok   ${label}`);
    return true;
  }
  const seen = await page.evaluate(() =>
    [...document.querySelectorAll("button, input, select, textarea, a")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => `${e.tagName}[${e.type || ""}] "${(e.textContent || "").trim().slice(0, 30)}"`)
      .join("\n  "),
  );
  console.error(`MISS ${label} (${typeof target === "string" ? target : "locator"})\n  visible:\n  ${seen}`);
  return false;
}
```

Run it for each step, in the order the flow reaches them (navigate and fill as you go, since later fields appear only after earlier ones):

```js
const steps = [
  { label: "email field", target: "#email" },
  { label: "sign-in button", target: 'button[type="submit"]' },
  { label: "new order button", target: 'button:has-text("New order")' },
  { label: "branch select", target: "select" },
  { label: "note box", target: "textarea:visible" },
  { label: "place order button", target: 'button:has-text("Place order")' },
];
```

If any step misses: read the visible list, fix the selector, rehearse again. Record only when every step says ok.

## Pass 3: record

### The story

Follow the order the storyboard asks for. Without one, this order works:
1. **Entry:** sign in or open the starting page.
2. **Context:** let the eye find its bearings; glide the cursor over the main parts.
3. **Action:** the main workflow, step by step.
4. **Variation:** one secondary feature (a setting, dark mode, switching to Kurdish).
5. **Result:** the outcome, a confirmation, the new state.

### Pacing

Record slower than the final video needs; Remotion can trim the start (`trimBefore`) and speed it up (`playbackRate`), but it can't add a pause that wasn't recorded.

| Moment | Pause |
| --- | --- |
| After signing in | 4 s |
| After opening a page | 3 s |
| After clicking a button | 2 s |
| Between major steps | 1.5 to 2 s |
| After the last action | 3 s |
| Typing | 25 to 40 ms per character |

A modal or confirmation gets a reading pause before it is accepted. For a select, show the cursor moving to it before the option is picked.

### A visible cursor

Headless recordings have no cursor. Add an arrow that follows the mouse, drawn large enough to survive being shrunk into a mockup: a 1440-wide recording inside a laptop 900 px wide is scaled to about 60%, so draw it at 36 px rather than 24.

```js
async function addCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById("demo-cursor")) return;
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    c.style.cssText = "position:fixed;left:0;top:0;width:36px;height:36px;z-index:2147483647;pointer-events:none;transition:left .1s,top .1s;filter:drop-shadow(1px 2px 2px rgba(0,0,0,.35))";
    document.body.append(c);
    document.addEventListener("mousemove", (e) => {
      c.style.left = `${e.clientX}px`;
      c.style.top = `${e.clientY}px`;
    });
  });
}
```

The overlay disappears whenever the page navigates: call `addCursor(page)` again after every navigation. (The CSS transition is fine here: this is a live browser being filmed, not a Remotion frame.) In the phone size, a cursor looks wrong; leave it out and let taps speak, or add a touch dot in Remotion with `Cursor.tsx`.

### Moving, clicking, typing, scrolling

Never let the cursor jump to a target. Move to it in steps, pause, then click.

```js
async function glideAndClick(page, target, label, { after = 800, ...clickOptions } = {}) {
  const el = typeof target === "string" ? page.locator(target).first() : target;
  if (!(await el.isVisible().catch(() => false))) {
    console.error(`skip click: "${label}" not visible`);
    return false;
  }
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await page.waitForTimeout(400);
    }
    await el.click(clickOptions);
  } catch (err) {
    console.error(`click failed on "${label}": ${err.message}`);
    return false;
  }
  await page.waitForTimeout(after);
  return true;
}

async function typeVisibly(page, target, text, label, perChar = 35) {
  const el = typeof target === "string" ? page.locator(target).first() : target;
  if (!(await glideAndClick(page, el, label))) return false;
  await el.fill("");
  await el.pressSequentially(text, { delay: perChar });
  await page.waitForTimeout(500);
  return true;
}

// Scroll smoothly, never jump.
async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
  await page.waitForTimeout(1500);
}

// On a dashboard, glide over the key cards so the eye follows.
async function tour(page, selector, max = 6) {
  const items = await page.locator(selector).all();
  for (const item of items.slice(0, max)) {
    const box = await item.boundingBox().catch(() => null);
    if (!box || box.y > 800) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await page.waitForTimeout(600);
  }
}
```

Give every call a clear `label`: it is the only clue when a step fails. No silent `catch` blocks; every helper above prints what went wrong.

### Words on screen

The original skill burns a subtitle bar into the page. Don't: in a mshmsh-video project the narration and `Narration.tsx` captions carry the words, styled and timed with the rest of the video, and burned-in text can't be changed or translated later.

## The recording script

Keep it in the Remotion project as `scripts/demo-<name>.mjs`; the raw recording goes to `rec-raw/` (outside `public/`, so it never ends up in the bundle).

```js
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.DEMO_URL || "http://localhost:3000";
const NAME = "order-flow";
const SIZE = { width: 1440, height: 900 }; // phone: { width: 390, height: 844 }
const rehearse = process.argv.includes("--rehearse");

// Paste mustSee, addCursor, glideAndClick, typeVisibly, scrollTo and tour here.

const browser = await chromium.launch({ headless: true }); // or { headless: true, channel: "chrome" }
mkdirSync("rec-raw", { recursive: true });
const context = await browser.newContext(
  rehearse ? { viewport: SIZE } : { viewport: SIZE, recordVideo: { dir: "rec-raw", size: SIZE } },
);
const page = await context.newPage();
let failed = false;

try {
  await page.goto(`${BASE}/login`);
  if (rehearse) {
    // Walk the flow and call mustSee for every step; set failed = true on any miss.
  } else {
    await addCursor(page);
    await page.waitForTimeout(1000);
    // 1 entry: sign in, then wait 4 s
    // 2 context: tour(page, ".card"), 3 s
    // 3 action: glideAndClick / typeVisibly, 1.5 to 2 s between steps
    // 4 variation, 5 result, then 3 s on the final state
    // After every page.goto or a click that navigates: await addCursor(page);
  }
} catch (err) {
  failed = true;
  console.error("demo stopped:", err.message);
} finally {
  await context.close(); // the video file is finished only when its context closes
  if (!rehearse) {
    await page.video()?.saveAs(`rec-raw/${NAME}.webm`); // a fixed name instead of Playwright's random one
    console.log(`saved rec-raw/${NAME}.webm`);
  }
  await browser.close();
}
process.exit(failed ? 1 : 0);
```

```bash
node scripts/demo-order-flow.mjs --rehearse   # pass 2: every step must print ok
node scripts/demo-order-flow.mjs              # pass 3: the take
```

Popups and new tabs are separate pages with separate videos: catch them with `context.waitForEvent("page")` and record or skip them on purpose.

## From recording to clip

1. **Convert** Playwright's WebM (variable frame rate) to a constant-rate MP4 the renderer can seek precisely:

   ```bash
   ffmpeg -i rec-raw/order-flow.webm -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart public/rec/order-flow.mp4
   ```

   Use the project's frame rate after `-r`.
2. **Look at one frame at full size** (`ffmpeg -ss 5 -i public/rec/order-flow.mp4 -frames:v 1 out/check.png`). If the text is soft, show those moments as screenshots instead (production.md, "Screenshots and app images"). Check frames for private data too.
3. **Find the start.** The first second or so is usually a blank page loading. Note the frame where the flow starts and the frames of the moments the narration points at (the click on "Place order", the confirmation).
4. **Play it in the mockup** (production.md, "Components cheat sheet"):

   ```tsx
   import { Laptop, ShotVideo } from "./Devices"; // in src/story/scenes.tsx

   <Laptop width={900}>
     <ShotVideo src="rec/order-flow.mp4" trimBefore={36} playbackRate={1.25} />
   </Laptop>
   ```

   `trimBefore` skips frames at the start of the file; `playbackRate` speeds the whole take. `ShotVideo` is muted and fills the screen, pinned to the top. A phone recording goes in `<Phone width={...}>` the same way.
5. **Time it to the voice.** Line the clip's key moments up with the narration words in `voice.json`: the click lands on the word that names it. If one stretch is too slow, cut the clip into two `ShotVideo`s with different `trimBefore` values rather than speeding everything up.
6. **Zoom in on the detail** by scaling the mockup or the clip's wrapper toward the button or field the voice mentions, then back out; a full desktop screen in a 1080-wide reel is unreadable otherwise (production.md, "Pitfalls").

## Checklist

- [ ] Discovery done; a field map exists for every page
- [ ] Rehearsal prints ok for every step
- [ ] Headless, with `viewport` and `recordVideo.size` both set to the device size
- [ ] Cursor re-added after every navigation (laptop size only)
- [ ] Every click through `glideAndClick`, every text through `typeVisibly`, each with a label
- [ ] No silent catches
- [ ] Smooth scrolling; pauses long enough for a viewer to read
- [ ] The flow follows the storyboard
- [ ] Demo account and sample data only
- [ ] Converted to a constant-rate MP4 in `public/rec/`, a full-size frame checked

## Pitfalls

1. The cursor vanishes after a page change: add it again.
2. The take feels rushed: record longer pauses; trimming is easy, adding time isn't.
3. The cursor is a dot or invisible: use the SVG arrow overlay, large enough for the mockup.
4. The cursor jumps: always move before clicking.
5. A select looks odd: show the cursor reaching it, then pick the option.
6. A modal flashes past: pause to read before confirming.
7. The video has a random file name: save it under a fixed name with `saveAs`.
8. A step failed without a word: no silent catches.
9. Field kinds or features were assumed: discover them first.
10. A placeholder option was picked as a real value: watch for `"0"`, `""` and "Select...".
11. A popup is missing from the video: it recorded as its own page.
12. The clip stutters or drifts in the render: it is still the variable-rate WebM; convert it.
13. Everything is tiny in a reel: a 1440-wide screen in a phone-format video needs a zoom on the detail, or a phone-size recording.
