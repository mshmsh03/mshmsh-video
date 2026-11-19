// Google's animated emoji (Noto Emoji Animation) as transparent videos, for
// <Emoji> in the template (story/Emoji.tsx), which plays them through
// @remotion/animated-emoji. 411 of them: faces, hands, hearts, party, fire,
// animals, food, weather. CC BY 4.0: free for any use, client work included,
// with the credit "Animated emoji by Google (CC BY 4.0)" in the video's
// description or end card. Downloaded from remotion-dev/animated-emoji on
// GitHub, so it works where Google's own site is blocked.
//
//   node scripts/free-emoji.mjs                      every emoji, by category
//   node scripts/free-emoji.mjs party,laugh,fire     names, tags and categories that match
//   node scripts/free-emoji.mjs get fire,party-popper [--scale 0.5|1|2]
//
// `get` saves public/emoji/<name>-<scale>x.webm (Chrome, renders) and .mp4
// (Safari) and adds the credit to public/emoji/CREDITS.txt. Scale 1 is
// 1024 px, enough for an emoji up to half the frame's height; 0.5 for small
// ones, 2 for one that fills a 4K frame.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MODELS } from "./voice-engines.mjs";

const REPO = "https://raw.githubusercontent.com/remotion-dev/animated-emoji/main";
const CREDIT = "Animated emoji by Google (Noto Emoji Animation), CC BY 4.0: https://googlefonts.github.io/noto-emoji-animation/";
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const words = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

const curl = (url, to) => {
  execFileSync("curl", ["-fsSL", "--retry", "2", "--max-time", "120", "-o", `${to}.part`, url]);
  renameSync(`${to}.part`, to);
};

// The list: from the repo (cached a week), else the copy inside
// @remotion/animated-emoji.
const list = () => {
  const cache = join(MODELS, "emoji", "emojis.json");
  const fresh = existsSync(cache) && Date.now() - statSync(cache).mtimeMs < 7 * 86400000;
  if (!fresh) {
    try {
      mkdirSync(join(MODELS, "emoji"), { recursive: true });
      curl(`${REPO}/emojis.json`, cache);
    } catch {}
  }
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const data = "node_modules/@remotion/animated-emoji/dist/cjs/emoji-data.js";
  if (existsSync(data)) {
    const source = readFileSync(data, "utf8");
    return JSON.parse(source.slice(source.indexOf("["), source.lastIndexOf("]") + 1));
  }
  throw new Error("Couldn't get the emoji list from GitHub, and @remotion/animated-emoji isn't installed here.");
};

const emojis = list();
const [command] = words;

// The list's own tags are only the names, so a search for a feeling finds
// little. These words find the emoji people usually mean by them.
const ALSO = {
  laugh: ["joy", "rofl", "laughing", "grin-sweat", "joy-cat"],
  funny: ["joy", "rofl", "zany-face", "clown", "upside-down-face"],
  love: ["heart-eyes", "red-heart", "kissing-heart", "heart-face", "two-hearts", "sparkling-heart", "beating-heart"],
  sad: ["sad", "cry", "loudly-crying", "pensive", "broken-heart", "holding-back-tears", "crying-cat-face"],
  cry: ["cry", "loudly-crying", "happy-cry", "holding-back-tears"],
  angry: ["angry", "rage", "cursing", "triumph", "pouting-cat"],
  wow: ["mind-blown", "star-struck", "astonished", "gasp", "surprised", "scream-cat"],
  shock: ["screaming", "scared", "mind-blown", "astonished", "x-eyes"],
  think: ["thinking-face", "monocle", "raised-eyebrow", "light-bulb"],
  idea: ["light-bulb", "sparkles", "mind-blown"],
  cool: ["sunglasses-face", "cool", "fire", "100"],
  win: ["party-popper", "confetti-ball", "fireworks", "100", "muscle", "check-mark", "direct-hit"],
  celebrate: ["partying-face", "party-popper", "confetti-ball", "fireworks", "balloon", "bottle-with-popping-cork", "mirror-ball"],
  birthday: ["birthday-cake", "wrapped-gift", "balloon", "partying-face", "party-popper"],
  graduation: ["graduation-cap", "party-popper", "confetti-ball", "fireworks"],
  money: ["money-face", "money-with-wings", "gem-stone"],
  yes: ["thumbs-up", "check-mark", "clap", "100", "raising-hands"],
  no: ["thumbs-down", "cross-mark", "x-eyes", "unamused"],
  hello: ["wave", "salute", "hug-face"],
  tired: ["sleep", "sleepy", "yawn", "weary", "battery-low"],
  nervous: ["grimacing", "anxious-with-sweat", "sweat", "grin-sweat", "worried"],
  embarrassed: ["flushed", "see-no-evil-monkey", "hand-over-mouth", "melting", "blush"],
  awkward: ["grimacing", "melting", "dotted-line-face", "upside-down-face"],
  scary: ["ghost", "skull", "scared", "screaming", "jack-o-lantern"],
  late: ["alarm-clock", "bell", "sweat"],
  work: ["construction", "gear", "pencil", "light-bulb", "muscle"],
  launch: ["rocket", "electricity", "collision", "fire"],
  food: ["yum", "drool", "spaghetti", "steaming-bowl", "popcorn", "cooking"],
  coffee: ["hot-beverage"],
  music: ["musical-notes", "violin", "drum", "maracas", "dancer-woman", "mirror-ball"],
  sport: ["soccer-ball", "baseball", "tennis", "ping-pong", "bowling", "muscle"],
  travel: ["airplane-departure", "airplane-arrival", "rocket", "camping", "globe-showing-europe-africa"],
  weather: ["sun-with-face", "rain-cloud", "cloud-with-lightning", "snowflake", "rainbow", "tornado"],
  thanks: ["folded-hands", "pleading", "hug-face", "red-heart"],
  strong: ["muscle", "fire", "collision"],
};

if (command === "get") {
  const names = (words[1] ?? "").split(",").map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("Which emoji? node scripts/free-emoji.mjs get fire,party-popper");
  const scale = option("scale", "1");
  if (!["0.5", "1", "2"].includes(scale)) throw new Error("--scale is 0.5, 1 or 2");
  const dir = join("public", "emoji");
  mkdirSync(dir, { recursive: true });
  for (const name of names) {
    const emoji = emojis.find((e) => e.name === name);
    if (!emoji) {
      const near = emojis.filter((e) => e.name.includes(name) || e.tags.some((t) => t.includes(name))).map((e) => e.name);
      throw new Error(`No emoji "${name}".${near.length ? ` Close: ${near.slice(0, 12).join(", ")}` : ""}`);
    }
    for (const ext of ["webm", "mp4"]) {
      const file = `${name}-${scale}x.${ext}`;
      if (!existsSync(join(dir, file))) curl(`${REPO}/public/${file}`, join(dir, file));
    }
    console.log(`public/emoji/${name}-${scale}x.webm: ${emoji.durationInSeconds.toFixed(1)} s loop`);
  }
  const credits = join(dir, "CREDITS.txt");
  if (!existsSync(credits)) writeFileSync(credits, `${CREDIT}\n`);
  console.log(`\nIn a scene: <Emoji name="${names[0]}" at={1.2} size={240} />${scale === "1" ? "" : ` scale="${scale}"`}`);
  console.log(`Credit in the description or end card: ${CREDIT}`);
} else {
  const query = command?.toLowerCase().split(",").map((w) => w.trim()).filter(Boolean);
  const meant = new Set((query ?? []).flatMap((q) => Object.entries(ALSO).filter(([word]) => word.startsWith(q) || q.startsWith(word)).flatMap(([, names]) => names)));
  const shown = query
    ? emojis.filter(
        (e) =>
          meant.has(e.name) ||
          query.some((q) => e.name.includes(q) || e.tags.some((t) => t.includes(q)) || e.categories.some((c) => c.toLowerCase().includes(q))),
      )
    : emojis;
  const byCategory = new Map();
  for (const e of shown) {
    const category = e.categories[0] ?? "Other";
    byCategory.set(category, [...(byCategory.get(category) ?? []), e.name]);
  }
  for (const [category, names] of byCategory) console.log(`${category} (${names.length}): ${names.join(", ")}\n`);
  console.log(`${shown.length} of ${emojis.length}. Get some: node scripts/free-emoji.mjs get <name>,<name>. ${CREDIT}`);
}
