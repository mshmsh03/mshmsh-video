// Cuts the pauses out of a talking clip (a talking head, a voice note, a screen
// recording with narration): "so... [3 s] ...um, anyway" becomes a tight cut.
// Nothing is re-encoded: it writes the parts to keep into <clip>.cuts.json, and
// <CutClip> (story/CutClip.tsx) plays them straight from the original, so a cut
// can be loosened in the Studio by editing the numbers. --render also writes
// the cut as an MP4, with a 10 ms fade at every cut so nothing clicks.
//
//   node scripts/cut-silence.mjs public/photos/me.mp4
//     [--pause 0.5]    shortest silence that gets cut, in seconds
//     [--margin 0.15]  air kept before and after each part, in seconds
//     [--level -40]    what counts as silence, in dBFS (default: 25 dB under the
//                      clip's speech, measured)
//     [--captions public/captions/me.json]  also moves these captions (from
//                      transcribe.mjs on the original) onto the cut: <name>-cut.json
//     [--render]       public/photos/me-cut.mp4 as well
//
// A first pass for speech only: it can't tell a dramatic pause from a dead one,
// so watch the result, and keep a pause on purpose by raising --pause. For
// motion- or editor-based cutting (DaVinci Resolve, Premiere, Final Cut
// timelines), auto-editor (public domain) does more: toolbox.md, "Editing tools".

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { decode, npx } from "./voice-engines.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const VALUED = /^--(pause|margin|level|captions)$/;
const input = args.find((a, i) => !a.startsWith("--") && !VALUED.test(args[i - 1] ?? ""));
if (!input || !existsSync(input)) {
  console.log("Usage: node scripts/cut-silence.mjs <clip> [--pause 0.5] [--margin 0.15] [--level -40] [--captions file.json] [--render]");
  process.exit(1);
}
const PAUSE = Number(option("pause", 0.5));
const MARGIN = Number(option("margin", 0.15));
const RATE = 16000;
const STEP = 0.01;

// Loudness every 10 ms, in dBFS.
const samples = decode(input, RATE);
const win = Math.round(STEP * RATE);
const levels = [];
for (let i = 0; i + win <= samples.length; i += win) {
  let sum = 0;
  for (let j = i; j < i + win; j++) sum += samples[j] * samples[j];
  levels.push(10 * Math.log10(sum / win + 1e-12));
}
const duration = samples.length / RATE;
if (levels.length === 0) throw new Error(`${input} has no sound to cut by.`);
// Speech level: the loud tenth of the clip. Silence sits 25 dB under it.
const sorted = [...levels].sort((a, b) => a - b);
const speech = sorted[Math.floor(sorted.length * 0.9)];
const level = option("level") !== undefined ? Number(option("level")) : Math.min(-30, Math.max(-55, speech - 25));

// Silent runs at least PAUSE long, then the parts between them with a margin.
const silences = [];
let start = -1;
levels.forEach((db, k) => {
  if (db < level) {
    if (start < 0) start = k;
  } else if (start >= 0) {
    if ((k - start) * STEP >= PAUSE) silences.push([start * STEP, k * STEP]);
    start = -1;
  }
});
if (start >= 0 && (levels.length - start) * STEP >= PAUSE) silences.push([start * STEP, duration]);
const parts = [];
let from = 0;
for (const [s, e] of silences) {
  if (s > from) parts.push({ from, to: s });
  from = e;
}
if (from < duration) parts.push({ from, to: duration });
const kept = [];
for (const p of parts) {
  const part = { from: Math.max(0, p.from - MARGIN), to: Math.min(duration, p.to + MARGIN) };
  if (part.to - part.from < 0.12) continue;
  const last = kept[kept.length - 1];
  if (last && part.from <= last.to) last.to = part.to;
  else kept.push(part);
}
if (kept.length === 0) throw new Error(`Everything in ${input} is under ${level.toFixed(0)} dBFS: pass a lower --level.`);
const round = (v) => Math.round(v * 1000) / 1000;
const total = kept.reduce((n, p) => n + p.to - p.from, 0);

// The path <CutClip> passes to staticFile(): relative to public/ when the clip is in it.
const inPublic = relative("public", input).replace(/\\/g, "/");
const src = inPublic.startsWith("..") ? input.replace(/\\/g, "/") : inPublic;
const base = join(dirname(input), basename(input, extname(input)));
const cuts = { src, level: Math.round(level), pause: PAUSE, margin: MARGIN, seconds: round(total), parts: kept.map((p) => ({ from: round(p.from), to: round(p.to) })) };
writeFileSync(`${base}.cuts.json`, `${JSON.stringify(cuts, null, 1)}\n`);

// Captions from the original, moved onto the cut. Words in a removed part go.
const captionsFile = option("captions");
if (captionsFile) {
  const captions = JSON.parse(readFileSync(captionsFile, "utf8"));
  const offsets = [];
  let at = 0;
  for (const p of kept) {
    offsets.push(at);
    at += p.to - p.from;
  }
  const moved = [];
  for (const c of captions) {
    // The part the word overlaps most; a word wholly inside a cut goes.
    const [s, e] = [c.startMs / 1000, c.endMs / 1000];
    let k = -1;
    let best = 0;
    kept.forEach((p, q) => {
      const overlap = Math.min(e, p.to) - Math.max(s, p.from);
      if (overlap > best) [k, best] = [q, overlap];
    });
    if (k < 0) continue;
    const shift = offsets[k] - kept[k].from;
    const startMs = Math.round((Math.max(kept[k].from, c.startMs / 1000) + shift) * 1000);
    const endMs = Math.round((Math.min(kept[k].to, c.endMs / 1000) + shift) * 1000);
    moved.push({ ...c, text: moved.length === 0 ? c.text.trimStart() : c.text, startMs, endMs, timestampMs: Math.round((startMs + endMs) / 2) });
  }
  const out = captionsFile.replace(/\.json$/, "") + "-cut.json";
  writeFileSync(out, `${JSON.stringify(moved, null, 1)}\n`);
  console.log(`${out}: ${moved.length} of ${captions.length} words, on the cut's timeline`);
}

if (args.includes("--render")) {
  const out = `${base}-cut.mp4`;
  let video = false;
  try {
    video = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=codec_type", "-of", "csv=p=0", input]).toString().includes("video");
  } catch {}
  const graph = [];
  kept.forEach((p, k) => {
    const len = p.to - p.from;
    if (video) graph.push(`[0:v]trim=start=${p.from}:end=${p.to},setpts=PTS-STARTPTS[v${k}]`);
    graph.push(`[0:a]atrim=start=${p.from}:end=${p.to},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, len - 0.01)}:d=0.01[a${k}]`);
  });
  graph.push(`${kept.map((_, k) => (video ? `[v${k}][a${k}]` : `[a${k}]`)).join("")}concat=n=${kept.length}:v=${video ? 1 : 0}:a=1${video ? "[v][a]" : "[a]"}`);
  const script = `${base}.cuts.ffgraph`;
  writeFileSync(script, graph.join(";\n"));
  // The graph goes in a file (a long cut list is too long for a Windows
  // command line). ffmpeg 7 and later read it with -/filter_complex; older
  // ones only know -filter_complex_script, which newer ones may drop.
  const ffArgs = (option) => ["-v", "error", "-y", "-i", input, option, script, ...(video ? ["-map", "[v]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p"] : []), "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out];
  const ffmpeg = (args) => {
    try {
      execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      npx(["remotion", "ffmpeg", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    }
  };
  try {
    ffmpeg(ffArgs("-/filter_complex"));
  } catch (error) {
    if (!/Unrecognized option|Option not found/i.test(String(error.stderr))) throw error;
    ffmpeg(ffArgs("-filter_complex_script"));
  }
  rmSync(script, { force: true });
  console.log(`${out}: rendered`);
}

const removed = silences.filter(([s, e]) => e - s >= PAUSE).length;
console.log(`${base}.cuts.json: ${duration.toFixed(1)} s -> ${total.toFixed(1)} s, ${kept.length} parts (${removed} pauses of ${PAUSE} s or more cut; silence under ${level.toFixed(0)} dBFS, speech at ${speech.toFixed(0)}).`);
console.log(`In a scene: <CutClip cuts={cuts} /> with import cuts from "../../${base.replace(/\\/g, "/")}.cuts.json"; the scene lasts cutLength(cuts, fps) frames.`);
