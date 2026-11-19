// Writes a sample of each candidate narrator so the person picks by ear (never
// pick a voice for them from its name, or from a guess about what they'd like).
// Run with:
//   node scripts/voice-samples.mjs ["a line from their story"] [--voices kokoro,supertonic]
//
// --voices takes voice names and these groups:
//   kokoro       af_heart, af_bella, bf_emma, am_michael, am_fenrir (the default)
//   supertonic   supertonic:F1 ... supertonic:M5 (10 voices; English, Arabic and 29 more)
//   pocket       pocket:alba, bill_boerst, caro_davy, peter_yearsley, stuart_bell
//   pocket-demo  pocket:bria, pocket:loona (come with the model, no extra download)
//   gemini       8 of Gemini's 30 voices (needs GEMINI_API_KEY)
//   edge-ar      Iraqi, Saudi and Egyptian Arabic Edge voices (needs edge-tts)
//   sorani       vekol (offline, personal videos only) and four Gemini voices (need a key)
// To hear the person's own voice copied, add pocket:<their recording>.wav.
//
// Each voice says "Voice 1.", "Voice 2." ... before the line (or two beeps when
// the line isn't in Latin letters), all at the same loudness. Out:
//   out/voice-samples/all.mp3 (or all.wav)   every voice, numbered, in one file
//   out/voice-samples/NN-<voice>.wav         each voice on its own
//   out/voice-samples/list.txt               number, voice and what it may be used for
// A voice that fails (no key, no network) is skipped and reported; the others go on.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decode, engineOf, kokoroSpeaker, licenceOf, makeSpeaker, normalize, npx, trim, writeWav } from "./voice-engines.mjs";

const GROUPS = {
  kokoro: ["af_heart", "af_bella", "bf_emma", "am_michael", "am_fenrir"],
  supertonic: ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"].map((v) => `supertonic:${v}`),
  pocket: ["alba", "bill_boerst", "caro_davy", "peter_yearsley", "stuart_bell"].map((v) => `pocket:${v}`),
  "pocket-demo": ["pocket:bria", "pocket:loona"],
  gemini: ["Kore", "Charon", "Puck", "Aoede", "Sulafat", "Achird", "Gacrux", "Iapetus"].map((v) => `gemini:${v}`),
  "edge-ar": ["ar-IQ-RanaNeural", "ar-IQ-BasselNeural", "ar-SA-ZariyahNeural", "ar-SA-HamedNeural", "ar-EG-SalmaNeural", "ar-EG-ShakirNeural"],
  sorani: ["vekol", "gemini:Kore", "gemini:Charon", "gemini:Puck", "gemini:Sulafat"],
};

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const optionValues = new Set(["voices", "speed", "lang", "style"].map(option).filter(Boolean));
const VOICES = (option("voices") ?? "kokoro").split(",").flatMap((v) => GROUPS[v.trim()] ?? [v.trim()]);
const SPEED = Number(option("speed") ?? 1);
const TEXT =
  args.find((a) => !a.startsWith("--") && !optionValues.has(a)) ??
  "A few months ago, I had no idea what I was doing. Then a friend told me one thing, and everything changed.";
const options = { lang: option("lang"), style: option("style") };
const latin = (TEXT.match(/[A-Za-z]/g) ?? []).length > (TEXT.match(/[؀-ۿ]/g) ?? []).length;

const OUT = "out/voice-samples";
mkdirSync(OUT, { recursive: true });
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const EDGE_SCRIPT = fileURLToPath(new URL("edge-voice.py", import.meta.url));

const kokoro = kokoroSpeaker();
const speakers = {};
const speak = async (voice, text) => {
  const engine = engineOf(voice);
  if (engine === "kokoro") return kokoro.speak(text, voice, SPEED);
  if (engine === "edge") {
    const mp3 = `${OUT}/edge-${voice}.mp3`;
    const percent = Math.round((SPEED - 1) * 100);
    execFileSync(PYTHON, [EDGE_SCRIPT], {
      input: JSON.stringify({ text, voice, rate: `${percent >= 0 ? "+" : ""}${percent}%`, out: mp3 }),
      stdio: ["pipe", "pipe", "inherit"],
    });
    const samples = decode(mp3, 24000);
    rmSync(mp3, { force: true });
    return { samples, sampleRate: 24000 };
  }
  if (engine === "raw") throw new Error(`${voice} can't be sampled here: see toolbox.md (Sorani voices) for its demo files`);
  speakers[voice] ??= await makeSpeaker(voice, options);
  return speakers[voice].speak(text, SPEED);
};

// Two soft beeps that mark the next voice when the line isn't English.
const RATE = 44100;
const beeps = () => {
  const out = new Float32Array(Math.round(0.75 * RATE));
  for (const [from, hz] of [[0, 660], [0.2, 880]]) {
    for (let i = 0; i < 0.12 * RATE; i++) {
      const fade = Math.min(1, i / 400, (0.12 * RATE - i) / 400);
      out[Math.round(from * RATE) + i] = Math.sin((2 * Math.PI * hz * i) / RATE) * 0.12 * fade;
    }
  }
  return out;
};

const takes = [];
const list = [];
for (const voice of VOICES) {
  const n = takes.length + 1;
  const started = Date.now();
  try {
    const audio = await speak(voice, latin ? `Voice ${n}. ${TEXT}` : TEXT);
    const file = `${OUT}/${String(n).padStart(2, "0")}-${voice.replace(/[^\w.-]+/g, "_")}.wav`;
    writeWav(file, normalize(trim(audio.samples, audio.sampleRate)), audio.sampleRate);
    // Everything at one rate for the combined file (Supertonic speaks at 44.1 kHz).
    takes.push(decode(file, RATE));
    list.push(`${n}. ${voice}: ${licenceOf(voice)}`);
    console.log(`${n}. ${voice} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (error) {
    console.log(`skipped ${voice}: ${error.message.split("\n")[0]}`);
  }
}
if (takes.length === 0) throw new Error("No voice could be sampled: see the messages above.");

// One file, every voice in turn with a second of silence between.
const gap = new Float32Array(RATE);
const parts = takes.flatMap((take) => (latin ? [take, gap] : [beeps(), take, gap]));
const all = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0));
let at = 0;
for (const part of parts) {
  all.set(part, at);
  at += part.length;
}
writeWav(`${OUT}/all.wav`, all, RATE);
let combined = `${OUT}/all.wav`;
const mp3Args = ["-v", "error", "-y", "-i", `${OUT}/all.wav`, "-c:a", "libmp3lame", "-b:a", "160k", `${OUT}/all.mp3`];
try {
  try {
    execFileSync("ffmpeg", mp3Args, { stdio: "ignore" });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    npx(["remotion", "ffmpeg", ...mp3Args], { stdio: "ignore" });
  }
  rmSync(`${OUT}/all.wav`, { force: true });
  combined = `${OUT}/all.mp3`;
} catch {}
writeFileSync(`${OUT}/list.txt`, `${list.join("\n")}\n`);
console.log(`\n${combined}: ${takes.length} voice${takes.length === 1 ? "" : "s"}, ${(all.length / RATE).toFixed(0)}s. The list with what each may be used for: ${OUT}/list.txt`);
