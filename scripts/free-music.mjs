// The free music library: 44 public-domain tracks (FreePD.com) listed in
// free-assets.json and downloaded from this repo's GitHub release, so it works
// without a HeyGen account and where other sites are blocked. Upbeat and promo,
// happy and funny, chill and lo-fi, sincere, cinematic and epic, mystery,
// tech, news, sport, graduation, desert and world. Public domain: free for any
// use, client work included, no credit needed.
//
//   node scripts/free-music.mjs                         every track, its length and moods
//   node scripts/free-music.mjs calm                    only tracks whose moods match
//   node scripts/free-music.mjs preview calm,sincere    one numbered file of 15 s from each match
//   node scripts/free-music.mjs get journey-of-hope     saves public/bgm/track.mp3, prints the settings
//
// The moods come from the titles and a tempo and loudness measurement, not from
// listening: make a preview and let the person pick by ear.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { decode, fetchAsset, FREE, MODELS, npx, writeWav } from "./voice-engines.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const words = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const CACHE = join(MODELS, "music");
const TRACKS = FREE.files
  .filter((f) => f.kind === "music")
  .map((f) => ({ ...f, id: f.name.replace(/^music-/, "").replace(/\.mp3$/, "") }));

const matching = (query) => {
  if (!query) return TRACKS;
  const wanted = query.toLowerCase().split(",").map((w) => w.trim()).filter(Boolean);
  return TRACKS.filter((t) => wanted.some((w) => t.id.includes(w) || t.mood.some((m) => m.includes(w))));
};
const line = (t, n) => `${n ? `${n}. ` : ""}${t.id} (${t.seconds}s): ${t.mood.join(", ")}`;

const RATE = 44100;
const rmsDb = (samples) => {
  let sum = 0;
  for (const v of samples) sum += v * v;
  return 10 * Math.log10(sum / samples.length || 1e-12);
};

const [command] = words;

if (command === "get") {
  const track = TRACKS.find((t) => t.id === words[1]);
  if (!track) throw new Error(`No track "${words[1]}". The tracks: ${TRACKS.map((t) => t.id).join(", ")}`);
  const out = option("out", "public/bgm/track.mp3");
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(fetchAsset(track.name, CACHE), out);
  // The bed sits about -24 dBFS between lines (music.md), measured on the first
  // minute; the offset skips silence at the start of the file.
  const samples = decode(out, RATE);
  const minute = samples.subarray(0, 60 * RATE);
  let peak = 0;
  for (const v of minute) peak = Math.max(peak, Math.abs(v));
  let first = 0;
  while (first < minute.length && Math.abs(minute[first]) < peak * 0.02) first++;
  const gain = Math.min(1, Math.pow(10, (-24 - rmsDb(minute.subarray(first))) / 20));
  const offset = Math.round((first / RATE) * 10) / 10;
  console.log(`${out}: "${track.title}", ${track.licence}.`);
  console.log(`In story.json: "music": { "start": "<first scene id>", "gain": ${gain.toFixed(2)}, "duck": 0.6${offset > 0 ? `, "offset": ${offset}` : ""} }`);
} else if (command === "preview") {
  // 15 s from a third of the way in (past any intro), every track at the same
  // loudness, two beeps before each, in the order of list.txt.
  const tracks = matching(words[1]);
  if (tracks.length === 0) throw new Error(`No track matches "${words[1]}"`);
  const dir = "out/music-samples";
  mkdirSync(dir, { recursive: true });
  const beep = new Float32Array(Math.round(0.75 * RATE));
  for (const [from, hz] of [[0, 660], [0.2, 880]]) {
    for (let i = 0; i < 0.12 * RATE; i++) {
      beep[Math.round(from * RATE) + i] = Math.sin((2 * Math.PI * hz * i) / RATE) * 0.12 * Math.min(1, i / 400, (0.12 * RATE - i) / 400);
    }
  }
  const parts = [];
  const list = [];
  for (const [i, track] of tracks.entries()) {
    const samples = decode(fetchAsset(track.name, CACHE), RATE);
    const start = Math.round(Math.min(samples.length / 3, Math.max(0, samples.length - 15 * RATE)));
    const clip = samples.slice(start, start + 15 * RATE);
    const gain = Math.pow(10, (-20 - rmsDb(clip)) / 20);
    const fade = RATE / 2;
    for (let j = 0; j < clip.length; j++) clip[j] *= gain * Math.min(1, j / fade, (clip.length - j) / fade);
    parts.push(beep, clip, new Float32Array(RATE / 2));
    list.push(line(track, i + 1));
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
  console.log(`\n${file}: ${tracks.length} tracks, numbered by two beeps each, in the order of ${dir}/list.txt`);
} else {
  const tracks = matching(command);
  if (tracks.length === 0) throw new Error(`No track matches "${command}". Moods: ${[...new Set(TRACKS.flatMap((t) => t.mood))].join(", ")}`);
  for (const track of tracks) console.log(line(track));
  console.log(`\nAll public domain (FreePD.com): free for any use, no credit needed. Preview: node scripts/free-music.mjs preview ${command ?? "calm"}`);
}
