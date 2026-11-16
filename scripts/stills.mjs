// Renders single frames to PNG for a visual check, by bundling once and then
// calling `remotion still` per frame. (Rendering an image sequence with
// `remotion render --frames` fails with "EINVAL ... write" once the
// composition has inline audio, so don't use that for checks.)
// Run from the Remotion project root:
//
//   node stills.mjs <CompositionId> <spec> [<spec> ...] [--voice src/story/voice.json]
//
// A spec is a frame number (412), a scene's start ("start:pos" = 0.3 s after
// its incoming transition), its middle ("mid:pos"), its end ("end:pos" = just
// before its transition), or a word in a scene's narration plus seconds
// ("pressure@websites+0.4" = 0.4 s after the narrator says "pressure").
// Frames land in out/stills/.
//
//   node stills.mjs <CompositionId> review
//
// renders the review set to out/stills/review/: every scene's start and
// middle, and every seam (2 frames before the transition, its middle, 2 frames
// after). With ffmpeg on PATH it also tiles them into scenes.png, seams.png
// and phone.png (the middles at 360 px wide, the size a phone shows them).

import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// npx is a .cmd on Windows, which Node only runs through a shell: pass one
// quoted command string there instead of an argument list.
const npx = (args, options) =>
  process.platform === "win32"
    ? execSync(`npx ${args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ")}`, options)
    : execFileSync("npx", args, options);

const [composition, ...rest] = process.argv.slice(2);
const flagIndex = rest.indexOf("--voice");
const voicePath = flagIndex >= 0 ? rest[flagIndex + 1] : "src/story/voice.json";
const specs = rest.filter((_, i) => flagIndex < 0 || (i !== flagIndex && i !== flagIndex + 1));
if (!composition || specs.length === 0) {
  throw new Error("Usage: stills.mjs <CompositionId> <frame|start:scene|mid:scene|end:scene|word@scene+sec|review> ...");
}

let voice = null;
try {
  voice = JSON.parse(readFileSync(voicePath, "utf8"));
} catch {}
const scene = (id) => {
  const s = voice?.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`No scene "${id}" in ${voicePath}`);
  return s;
};
const firstFrame = (s) => Math.round(s.startSeconds * voice.fps);

const toFrame = (spec) => {
  if (/^\d+$/.test(spec)) return Number(spec);
  if (spec.startsWith("start:")) {
    const s = scene(spec.slice(6));
    const lead = voice.scenes[0] === s ? 0 : voice.transitionFrames;
    return firstFrame(s) + lead + Math.round(0.3 * voice.fps);
  }
  if (spec.startsWith("mid:")) {
    const s = scene(spec.slice(4));
    return firstFrame(s) + Math.round(s.durationInFrames / 2);
  }
  if (spec.startsWith("end:")) {
    const s = scene(spec.slice(4));
    return Math.round(s.startSeconds * voice.fps + s.durationInFrames - voice.transitionFrames - 3);
  }
  const m = spec.match(/^(.+)@([^+-]+)([+-][\d.]+)?$/);
  if (!m) throw new Error(`Can't read "${spec}"`);
  const s = scene(m[2]);
  const word = s.captions.find((c) => c.text.trim().toLowerCase().startsWith(m[1].toLowerCase()));
  if (!word) throw new Error(`"${m[1]}" is not in the narration of ${m[2]}`);
  const seconds = s.startSeconds + s.voiceFrom / voice.fps + word.startMs / 1000 + Number(m[3] ?? 0);
  return Math.round(seconds * voice.fps);
};

const run = (args) => npx(["remotion", ...args], { stdio: ["ignore", "ignore", "inherit"] });

rmSync("out/stills-bundle", { recursive: true, force: true });
run(["bundle", "--out-dir=out/stills-bundle"]);

if (specs[0] !== "review") {
  for (const spec of specs) {
    const frame = toFrame(spec);
    const file = `out/stills/${spec.replace(/[^a-z0-9]+/gi, "_")}-f${frame}.png`;
    run(["still", "out/stills-bundle", composition, file, `--frame=${frame}`]);
    console.log(file);
  }
} else {
  if (!voice) throw new Error(`review needs the scene timings in ${voicePath}`);
  const dir = "out/stills/review";
  rmSync(dir, { recursive: true, force: true });

  // Each group is rendered as 000.png, 001.png ... so ffmpeg can tile it in order.
  const groups = { scenes: [], seams: [], phone: [] };
  voice.scenes.forEach((s, i) => {
    groups.scenes.push([`start:${s.id}`, toFrame(`start:${s.id}`)]);
    groups.scenes.push([`mid:${s.id}`, toFrame(`mid:${s.id}`)]);
    groups.phone.push([`mid:${s.id}`, toFrame(`mid:${s.id}`)]);
    if (i === 0) return;
    const cut = firstFrame(s);
    const t = voice.transitionFrames;
    const seam = `${voice.scenes[i - 1].id}>${s.id}`;
    groups.seams.push([`${seam} before`, cut - 2]);
    groups.seams.push([`${seam} middle`, cut + Math.floor(t / 2)]);
    groups.seams.push([`${seam} after`, cut + t + 2]);
  });

  const legend = [];
  for (const [name, list] of Object.entries(groups)) {
    if (name === "phone") continue; // the phone sheet reuses the scene middles
    mkdirSync(`${dir}/${name}`, { recursive: true });
    list.forEach(([label, frame], n) => {
      const file = `${dir}/${name}/${String(n).padStart(3, "0")}.png`;
      run(["still", "out/stills-bundle", composition, file, `--frame=${frame}`]);
      legend.push(`${file}  ${label}  (frame ${frame})`);
    });
  }
  writeFileSync(`${dir}/legend.txt`, `${legend.join("\n")}\n`);
  console.log(legend.join("\n"));

  // Contact sheets. Skipped with a hint when ffmpeg isn't installed.
  const tile = (input, count, cols, width, out, select) => {
    const rows = Math.ceil(count / cols);
    const filter = `${select ?? ""}scale=${width}:-2,tile=${cols}x${rows}:padding=8:margin=8:color=white`;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-start_number", "0", "-i", input, "-vf", filter, "-frames:v", "1", out]);
    console.log(out);
  };
  try {
    const { scenes, seams } = groups;
    tile(`${dir}/scenes/%03d.png`, scenes.length, 4, 480, `${dir}/scenes.png`);
    if (seams.length) tile(`${dir}/seams/%03d.png`, seams.length, 3, 480, `${dir}/seams.png`);
    // Every second scene still is a middle; show those at phone width.
    tile(`${dir}/scenes/%03d.png`, groups.phone.length, 4, 360, `${dir}/phone.png`, "select=mod(n\\,2),");
  } catch (error) {
    console.log(`No contact sheets (${error.code === "ENOENT" ? "ffmpeg is not on PATH" : error.message.split("\n")[0]}); read the PNGs one by one.`);
  }
}
