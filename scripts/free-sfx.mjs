// Free sound effects: 25 recorded interface sounds by Kenney (CC0: free for any
// use, client work included, no credit needed), listed in free-assets.json and
// downloaded from this repo's GitHub release. Clicks, ticks, pops, dings, errors,
// a glass clink, a glitch: the small sounds of screens and UI. Whooshes, risers,
// booms and record scratches come from remotion.media, or make-sfx.mjs where
// that's blocked.
//
//   node scripts/free-sfx.mjs                     every sound with what it's for
//   node scripts/free-sfx.mjs click,success       only sounds whose name or tags match
//   node scripts/free-sfx.mjs preview [tags]      one file, each sound twice with a gap
//   node scripts/free-sfx.mjs get confirm,pop     saves public/sfx/confirm.wav, public/sfx/pop.wav
//   node scripts/free-sfx.mjs get confirm --as ding    under another name (what <Sfx> plays)
//
// Saved files are 48 kHz mono, peaking at -3 dBFS, so <Sfx>'s default volume
// of 0.5 sits under the voice. The names come from Kenney's own; judge them by ear.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decode, fetchAsset, FREE, MODELS, npx, writeWav } from "./voice-engines.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const words = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const CACHE = join(MODELS, "sfx");
const RATE = 48000;
const SOUNDS = FREE.files.filter((f) => f.kind === "sfx").map((f) => ({ ...f, id: f.name.replace(/^sfx-/, "").replace(/\.wav$/, "") }));
const matching = (query) => {
  if (!query) return SOUNDS;
  const wanted = query.toLowerCase().split(",").map((w) => w.trim()).filter(Boolean);
  return SOUNDS.filter((s) => wanted.some((w) => s.id.includes(w) || s.tags.some((t) => t.includes(w))));
};
const line = (s, n) => `${n ? `${n}. ` : ""}${s.id}: ${s.use} (${s.tags.join(", ")})`;

// Peak at -3 dBFS.
const level = (samples) => {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.708 / peak : 1;
  return samples.map((v) => v * gain);
};

const [command] = words;

if (command === "get") {
  const ids = (words[1] ?? "").split(",").map((w) => w.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error(`Which sounds? ${SOUNDS.map((s) => s.id).join(", ")}`);
  const as = option("as");
  if (as && ids.length > 1) throw new Error("--as names one sound at a time");
  mkdirSync(join("public", "sfx"), { recursive: true });
  for (const id of ids) {
    const sound = SOUNDS.find((s) => s.id === id);
    if (!sound) throw new Error(`No sound "${id}". The sounds: ${SOUNDS.map((s) => s.id).join(", ")}`);
    const out = join("public", "sfx", `${as ?? id}.wav`);
    writeWav(out, level(decode(fetchAsset(sound.name, CACHE), RATE)), RATE);
    console.log(`${out}: ${sound.use}. <Sfx src="sfx/${as ?? id}.wav" at={frame} />`);
  }
  console.log("Kenney.nl, CC0: no credit needed.");
} else if (command === "preview") {
  const sounds = matching(words[1]);
  if (sounds.length === 0) throw new Error(`No sound matches "${words[1]}"`);
  const dir = "out/sfx-samples";
  mkdirSync(dir, { recursive: true });
  const parts = [new Float32Array(RATE / 2)];
  const list = [];
  for (const [i, sound] of sounds.entries()) {
    const samples = level(decode(fetchAsset(sound.name, CACHE), RATE)).map((v) => v * 0.7);
    parts.push(samples, new Float32Array(Math.round(0.35 * RATE)), samples, new Float32Array(Math.round(1.2 * RATE)));
    list.push(line(sound, i + 1));
    console.log(list.at(-1));
  }
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  writeWav(`${dir}/all.wav`, all, RATE);
  let file = `${dir}/all.wav`;
  const mp3 = ["-v", "error", "-y", "-i", `${dir}/all.wav`, "-c:a", "libmp3lame", "-b:a", "160k", `${dir}/all.mp3`];
  try {
    try {
      execFileSync("ffmpeg", mp3, { stdio: "ignore" });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      npx(["remotion", "ffmpeg", ...mp3], { stdio: "ignore" });
    }
    rmSync(`${dir}/all.wav`, { force: true });
    file = `${dir}/all.mp3`;
  } catch {}
  writeFileSync(`${dir}/list.txt`, `${list.join("\n")}\n`);
  console.log(`\n${file}: ${sounds.length} sounds, each played twice, in the order of ${dir}/list.txt`);
} else {
  const sounds = matching(command);
  if (sounds.length === 0) throw new Error(`No sound matches "${command}". Tags: ${[...new Set(SOUNDS.flatMap((s) => s.tags))].join(", ")}`);
  for (const sound of sounds) console.log(line(sound));
  console.log(`\nAll CC0 by Kenney.nl: free for any use, no credit needed. Preview: node scripts/free-sfx.mjs preview ${command ?? ""}`.trimEnd());
}
