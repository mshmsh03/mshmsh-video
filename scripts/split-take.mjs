// Cuts one long narration take (gemini-take.mjs) into a file per scene. It
// finds the pauses, then picks the scene boundaries so that each boundary is a
// long pause AND every scene's length fits its number of letters. Writes
// out/voice-raw/<id>.wav for make-voice ("voice": "recorded") and prints a
// table to check: a scene that is far faster or slower than the rest was cut
// in the wrong place. A take of one scene (gemini-take --only <id>) is trimmed
// to its speech and saved as that scene's file.
//
//   node scripts/split-take.mjs out/voice-takes/<name>.wav [--out out/voice-raw]
//
// Reads the scenes from <name>.json, which gemini-take saves beside the take.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWav, writeWav } from "./voice-engines.mjs";

const stop = (message) => {
  console.error(message);
  process.exit(1);
};
const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const outDir = outAt < 0 ? "out/voice-raw" : args[outAt + 1];
const take = args.find((a, i) => !a.startsWith("--") && (outAt < 0 || i !== outAt + 1));
if (!take || !outDir) stop("Usage: node scripts/split-take.mjs out/voice-takes/<name>.wav [--out out/voice-raw]");
if (!existsSync(take)) stop(`${take} isn't there`);
const listPath = `${take.replace(/\.wav$/i, "")}.json`;
if (!existsSync(listPath)) stop(`${listPath} isn't there: split-take needs the list of scenes that gemini-take.mjs saves beside each take`);
const scenes = JSON.parse(readFileSync(listPath, "utf8")).scenes ?? [];
if (!scenes.length) stop(`${listPath} lists no scenes`);
const odd = scenes.filter((s) => !/^[\w-]+$/.test(s.id ?? "")).map((s) => JSON.stringify(s.id));
if (odd.length) stop(`${listPath}: ${odd.join(", ")} can't be a file name (letters, digits, - and _ only)`);
const { samples, sampleRate: sr } = parseWav(readFileSync(take));

// Loudness in 10 ms steps; quiet is under 4% of the loudest step.
const step = Math.floor(sr * 0.01);
const steps = Math.floor(samples.length / step);
const level = new Float64Array(steps);
let loudest = 0;
for (let i = 0; i < steps; i++) {
  let sum = 0;
  for (let j = i * step; j < (i + 1) * step; j++) sum += samples[j] * samples[j];
  level[i] = Math.sqrt(sum / step);
  loudest = Math.max(loudest, level[i]);
}
if (loudest === 0) stop(`${take} is silent`);
const quiet = (i) => level[i] < loudest * 0.04;
const at = (i) => (i * step) / sr;

// Pauses of 0.12 s or more, as [start, end] in seconds. The silence before the
// first word and after the last isn't a pause.
const pauses = [];
let since = -1;
for (let i = 0; i < steps; i++) {
  if (quiet(i)) {
    if (since < 0) since = i;
    continue;
  }
  if (since > 0 && i - since >= 12) pauses.push([at(since), at(i)]);
  since = -1;
}
let first = 0;
while (first < steps - 1 && quiet(first)) first++;
let last = steps - 1;
while (last > first && quiet(last)) last--;
const t0 = at(first);
const t1 = at(last + 1);

// How long each scene should take, from its letters and its stops.
const weight = (text) => Math.max(1, (text.match(/\p{L}/gu) ?? []).length + 4 * (text.match(/[.،؛:؟!]/g) ?? []).length);
const weights = scenes.map((s) => weight(s.text ?? ""));
const k = scenes.length - 1;
if (pauses.length < k) {
  stop(`${take}: only ${pauses.length} pauses for ${k} boundaries, so the take has no clear gap between each of its ${scenes.length} scenes. Speak it again: gemini-take asks for a full second of silence between paragraphs, and a style that says otherwise undoes that.`);
}
const mid = pauses.map(([a, b]) => (a + b) / 2);
const length = pauses.map(([a, b]) => b - a);

// Choose k pauses in order: near where each boundary should be, and long.
const chosen = [];
let gap = 0;
if (k > 0) {
  gap = [...length].sort((a, b) => b - a).slice(0, k).reduce((a, b) => a + b, 0) / k;
  const talk = t1 - t0 - k * gap;
  const total = weights.reduce((a, b) => a + b, 0);
  const expected = [];
  let before = 0;
  for (let i = 0; i < k; i++) {
    before += weights[i];
    expected.push(t0 + (talk * before) / total + (i + 0.5) * gap);
  }
  const P = pauses.length;
  const cost = (i, j) => ((mid[j] - expected[i]) / 1.5) ** 2 - 4 * length[j];
  const best = Array.from({ length: k }, () => new Array(P).fill(Infinity));
  const back = Array.from({ length: k }, () => new Array(P).fill(-1));
  for (let j = 0; j < P; j++) best[0][j] = cost(0, j);
  for (let i = 1; i < k; i++) {
    for (let j = i; j < P; j++) {
      let prev = i - 1;
      for (let p = i; p < j; p++) if (best[i - 1][p] < best[i - 1][prev]) prev = p;
      if (best[i - 1][prev] < Infinity) {
        best[i][j] = best[i - 1][prev] + cost(i, j);
        back[i][j] = prev;
      }
    }
  }
  let j = 0;
  for (let p = 1; p < P; p++) if (best[k - 1][p] < best[k - 1][j]) j = p;
  for (let i = k - 1; i >= 0; i--) {
    chosen.unshift(j);
    j = back[i][j];
  }
}

mkdirSync(outDir, { recursive: true });
const pad = (value, width) => String(value).padStart(width);
const rates = [];
console.log(`${take}: ${(t1 - t0).toFixed(1)} s of speech, ${pauses.length} pauses${k ? `, boundaries average ${gap.toFixed(2)} s` : ""}`);
scenes.forEach((scene, i) => {
  const a = i === 0 ? t0 : pauses[chosen[i - 1]][1];
  const b = i === k ? t1 : pauses[chosen[i]][0];
  // Keep a breath of silence at both ends, as a recording would have.
  const from = Math.max(0, a - 0.12);
  const to = Math.min(samples.length / sr, b + 0.18);
  writeWav(join(outDir, `${scene.id}.wav`), samples.slice(Math.floor(from * sr), Math.floor(to * sr)), sr);
  const rate = (b - a) / weights[i];
  rates.push(rate);
  const after = i === k ? "" : `   then a ${length[chosen[i]].toFixed(2)} s pause`;
  console.log(`  ${scene.id.padEnd(8)} ${pad(a.toFixed(2), 6)} to ${pad(b.toFixed(2), 6)}  ${pad((b - a).toFixed(2), 5)} s  ${pad(weights[i], 3)} letters  ${pad((rate * 1000).toFixed(0), 4)} ms a letter${after}`);
});
if (k > 0) {
  const sorted = [...rates].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const off = scenes.filter((_, i) => rates[i] > median * 1.45 || rates[i] < median * 0.6).map((s) => s.id);
  const inside = length.filter((_, j) => !chosen.includes(j));
  console.log(`  longest pause left inside a scene: ${inside.length ? Math.max(...inside).toFixed(2) : "0"} s; shortest boundary: ${Math.min(...chosen.map((j) => length[j])).toFixed(2)} s`);
  console.log(off.length ? `  check these scenes (pace far from the rest): ${off.join(", ")}` : "  every scene's pace is within range of the others");
} else {
  console.log(`  one scene, saved whole${pauses.length ? ` with the ${pauses.length === 1 ? "pause" : `${pauses.length} pauses`} inside it` : ""}`);
}
console.log(`Next: "voice": "recorded" and "clean": false in story.json, then node scripts/make-voice.mjs`);
