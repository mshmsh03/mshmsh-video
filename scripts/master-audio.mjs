// Brings a rendered video to the loudness social apps play at (about -14
// LUFS) with the true peak under -1 dBTP, in two passes of ffmpeg's loudnorm,
// without re-encoding the picture. Renders here come out near -18 LUFS, quiet
// on a phone or a classroom projector. Run from the project root:
//
//   node scripts/master-audio.mjs out/video-v3.mp4 [--lufs -14] [--tp -1]
//
// Writes out/video-v3-master.mp4 next to it and prints the loudness before and
// after. Needs the full ffmpeg (the copy bundled with Remotion lacks loudnorm).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? fallback : Number(argv[i + 1]);
};
const input = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!input || !existsSync(input)) throw new Error("Usage: master-audio.mjs <video.mp4> [--lufs -14] [--tp -1]");
const LUFS = flag("lufs", -14);
const TP = flag("tp", -1);
const output = input.replace(/(\.\w+)$/, "-master$1");

const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error?.code === "ENOENT") throw new Error("ffmpeg isn't on PATH. Install the full build (toolbox.md, \"Verification tools\").");
  return { ok: r.status === 0, log: `${r.stdout}${r.stderr}` };
};

const target = `I=${LUFS}:TP=${TP}:LRA=11`;
const first = ffmpeg(["-i", input, "-af", `loudnorm=${target}:print_format=json`, "-vn", "-f", "null", "-"]);
const json = first.log.slice(first.log.lastIndexOf("{"), first.log.lastIndexOf("}") + 1);
if (!json) throw new Error(`loudnorm gave no measurement:\n${first.log.slice(-800)}`);
const m = JSON.parse(json);
console.log(`before: ${m.input_i} LUFS, true peak ${m.input_tp} dBTP`);

// Linear gain keeps the voice's natural dynamics. When that gain would push the
// peaks over the limit, loudnorm falls back to its "dynamic" mode, which
// compresses speech audibly; a peak limiter after the gain avoids that, so
// only the loudest instants are touched. The limiter runs at 4x the sample rate
// to catch the peaks between samples, and the result is measured: AAC adds its
// own overshoot (a bright music bed went from a -2 dBFS ceiling to +0.7 dBTP),
// so while the true peak is still over the target, the ceiling comes down by
// the overshoot and the audio is encoded again.
const gain = LUFS - Number(m.input_i);
const linear = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
let mode = Number(m.input_tp) + gain <= TP ? "linear" : "limiter";
let ceiling = TP - 1;
let outI;
let outTP;
for (let attempt = 1; ; attempt++) {
  const limiter = `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=${Math.pow(10, ceiling / 20).toFixed(4)}:attack=5:release=60:level=disabled,aresample=48000`;
  const second = ffmpeg([
    "-y", "-i", input, "-c:v", "copy", "-af", mode === "linear" ? linear : limiter,
    "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", output,
  ]);
  if (!second.ok) throw new Error(second.log.slice(-800));
  const check = ffmpeg(["-i", output, "-af", "ebur128=peak=true:framelog=quiet", "-vn", "-f", "null", "-"]).log;
  const summary = check.slice(check.lastIndexOf("Summary:"));
  outI = summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];
  outTP = summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1];
  if (Number(outTP) <= TP || attempt === 4) break;
  ceiling -= Number(outTP) - TP + 0.3;
  mode = "limiter";
  console.log(`  true peak ${outTP} dBTP is over ${TP}: limiting again with the ceiling at ${ceiling.toFixed(1)} dBFS`);
}
const how = mode === "linear" ? "linear gain" : `gain ${gain.toFixed(1)} dB with a peak limiter at ${ceiling.toFixed(1)} dBFS`;
console.log(`after:  ${outI} LUFS, true peak ${outTP} dBTP (${how})`);
if (Number(outTP) > TP) console.log(`The true peak is still over ${TP} dBTP: lower the music's "gain" in story.json and render again.`);
console.log(output);
