// Shows how a Kokoro voice will pronounce the script, as phonemes, so a name
// read wrong is caught before anyone listens ("xoshaka" comes out as
// "zəʃˈɑːkə", zuh-SHAH-kuh). Claude can't hear the voice; this is the next best
// thing. Uses the phonemizer kokoro-js itself uses. From the project root:
//
//   node scripts/pronounce.mjs                       every name, number, hyphenated or
//                                                    unusual word in story.json, per scene
//   node scripts/pronounce.mjs "xoshaka" "Khoe-shaka"  compare spellings for a "say"
//
// Then put the spelling that sounds right in that scene's "say". Kokoro only:
// Edge voices pronounce on Microsoft's side, Sorani voices have their own G2P.

import { readFileSync } from "node:fs";

const { phonemize } = await import("phonemizer").catch(() => {
  throw new Error("phonemizer isn't installed: it comes with kokoro-js (npm i -D kokoro-js@1.2.1)");
});
let story = null;
try {
  story = JSON.parse(readFileSync("src/story/story.json", "utf8"));
} catch {}
// British Kokoro voices start with b (bm_george), American ones with a.
const lang = (story?.voice ?? "af_heart").startsWith("b") ? "en" : "en-us";
const say = async (text) => (await phonemize(text, lang)).join(" ");

const words = process.argv.slice(2);
if (words.length) {
  for (const w of words) console.log(`${w.padEnd(24)} ${await say(w)}`);
} else {
  if (!story) throw new Error("No src/story/story.json here; pass words to compare instead.");
  // Words worth a look: capitals inside a sentence, digits, hyphens, symbols,
  // and letter clusters English rarely spells (x, q without u, kh, zh, gh...).
  const UNUSUAL = /[A-Z].*[A-Z]|\d|[-_@#&/]|x|q(?!u)|kh|zh|gh|[^\x00-\x7F]/;
  for (const scene of story.scenes) {
    const spoken = scene.say ?? scene.text;
    const raw = spoken.split(/\s+/).filter(Boolean);
    const tokens = raw.map((t) => t.replace(/^[("“'`]+|[)"”'`.,:;!?]+$/g, ""));
    // A capital that starts a sentence is just grammar.
    const startsSentence = (i) => i === 0 || /[.!?…]["”']?$/.test(raw[i - 1]);
    const picked = tokens.filter((t, i) => t && (UNUSUAL.test(t) || (!startsSentence(i) && /^[A-Z]/.test(t) && !/^I('|$)/.test(t))));
    if (!picked.length) continue;
    console.log(`${scene.id}${scene.say ? " (say)" : ""}:`);
    for (const t of [...new Set(picked)]) console.log(`  ${t.padEnd(22)} ${await say(t)}`);
  }
  console.log(`\nVoice ${story.voice} (${lang}). Compare spellings: node scripts/pronounce.mjs "word" "other spelling"`);
}
