// Renders single frames to PNG for a visual check. It bundles once, opens one
// browser and renders the frames three at a time through @remotion/renderer
// (falling back to one `remotion still` per frame if that fails). Rendering an
// image sequence with `remotion render --frames` fails with "EINVAL ... write"
// once the composition has inline audio, so don't use that for checks.
// Run from the Remotion project root:
//
//   node scripts/stills.mjs <CompositionId> <spec> [<spec> ...] [--voice src/story/voice.json]
//
// A spec is a frame number (412), a scene's start ("start:pos" = 0.3 s after
// its incoming transition), its middle ("mid:pos"), its end ("end:pos" = just
// before its transition), or a word in a scene's narration plus seconds
// ("pressure@websites+0.4" = 0.4 s after the narrator says "pressure").
// Frames land in out/stills/.
//
//   node scripts/stills.mjs <CompositionId> review [--full]
//
// renders the review set to out/stills/review/: every scene's start and
// middle, and every seam (2 frames before the transition, its middle, 2 frames
// after; a hard cut: the frames either side). With ffmpeg on PATH it also tiles
// them into scenes.png, seams.png and phone.png (the middles at 360 px wide,
// the size a phone shows them). Review frames render at half size, enough for
// the sheets; --full renders them at full size.
//
// --browser-executable <path> (or REMOTION_BROWSER_EXECUTABLE) uses a Chrome
// already on the machine; so does a machine where Remotion can't download its
// own (find-browser.mjs).

import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, resolve } from "node:path";
import { pickBrowser } from "./find-browser.mjs";

// npx is a .cmd on Windows, which Node only runs through a shell: pass one
// quoted command string there instead of an argument list.
const npx = (args, options) =>
  process.platform === "win32"
    ? execSync(`npx ${args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ")}`, options)
    : execFileSync("npx", args, options);

const argv = process.argv.slice(2);
const takeFlag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  argv.splice(i, 2);
  return value;
};
const voicePath = takeFlag("voice") ?? "src/story/voice.json";
const browserExecutable = pickBrowser(takeFlag("browser-executable"));
const full = argv.includes("--full");
const [composition, ...specs] = argv.filter((a) => a !== "--full");
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
// Frames a scene shares with the one before it (0 for the first and for cuts).
const overlapOf = (s) => (voice.scenes[0] === s ? 0 : (s.overlap ?? voice.transitionFrames));
const nextOf = (s) => voice.scenes[voice.scenes.indexOf(s) + 1];

const toFrame = (spec) => {
  if (/^\d+$/.test(spec)) return Number(spec);
  if (spec.startsWith("start:")) {
    const s = scene(spec.slice(6));
    return firstFrame(s) + overlapOf(s) + Math.round(0.3 * voice.fps);
  }
  if (spec.startsWith("mid:")) {
    const s = scene(spec.slice(4));
    return firstFrame(s) + Math.round(s.durationInFrames / 2);
  }
  if (spec.startsWith("end:")) {
    const s = scene(spec.slice(4));
    const next = nextOf(s);
    return firstFrame(s) + s.durationInFrames - (next ? overlapOf(next) : 0) - 3;
  }
  const m = spec.match(/^(.+)@([^+-]+)([+-][\d.]+)?$/);
  if (!m) throw new Error(`Can't read "${spec}"`);
  const s = scene(m[2]);
  const word = s.captions.find((c) => c.text.trim().toLowerCase().startsWith(m[1].toLowerCase()));
  if (!word) throw new Error(`"${m[1]}" is not in the narration of ${m[2]}`);
  const seconds = s.startSeconds + s.voiceFrom / voice.fps + word.startMs / 1000 + Number(m[3] ?? 0);
  return Math.round(seconds * voice.fps);
};

// The jobs: [label, frame, output file, scale].
const jobs = [];
const groups = { scenes: [], seams: [] };
const dir = "out/stills/review";
if (specs[0] !== "review") {
  for (const spec of specs) {
    const frame = toFrame(spec);
    jobs.push([spec, frame, `out/stills/${spec.replace(/[^a-z0-9]+/gi, "_")}-f${frame}.png`, 1]);
  }
} else {
  if (!voice) throw new Error(`review needs the scene timings in ${voicePath}`);
  rmSync(dir, { recursive: true, force: true });
  voice.scenes.forEach((s, i) => {
    groups.scenes.push([`start:${s.id}`, toFrame(`start:${s.id}`)]);
    groups.scenes.push([`mid:${s.id}`, toFrame(`mid:${s.id}`)]);
    if (i === 0) return;
    const cut = firstFrame(s);
    const t = overlapOf(s);
    const seam = `${voice.scenes[i - 1].id}>${s.id}`;
    if (t === 0) {
      groups.seams.push([`${seam} before cut`, cut - 1]);
      groups.seams.push([`${seam} after cut`, cut]);
      groups.seams.push([`${seam} after cut +2`, cut + 2]);
    } else {
      groups.seams.push([`${seam} before`, cut - 2]);
      groups.seams.push([`${seam} middle`, cut + Math.floor(t / 2)]);
      groups.seams.push([`${seam} after`, cut + t + 2]);
    }
  });
  for (const [name, list] of Object.entries(groups)) {
    list.forEach(([label, frame], n) => {
      jobs.push([label, frame, `${dir}/${name}/${String(n).padStart(3, "0")}.png`, full ? 1 : 0.5]);
    });
  }
}
for (const [, , file] of jobs) mkdirSync(dirname(file), { recursive: true });

const bundleDir = "out/stills-bundle";
rmSync(bundleDir, { recursive: true, force: true });
npx(["remotion", "bundle", `--out-dir=${bundleDir}`], { stdio: ["ignore", "ignore", "inherit"] });

const started = Date.now();
const renderAllInProcess = async () => {
  const { openBrowser, selectComposition, renderStill } = await import("@remotion/renderer");
  const serveUrl = resolve(bundleDir);
  const browser = await openBrowser("chrome", { browserExecutable, logLevel: "error" });
  try {
    const comp = await selectComposition({ serveUrl, id: composition, puppeteerInstance: browser, browserExecutable, logLevel: "error" });
    const queue = [...jobs];
    const worker = async () => {
      while (queue.length) {
        const [label, frame, output, scale] = queue.shift();
        if (frame < 0 || frame >= comp.durationInFrames) {
          console.log(`skipped ${label}: frame ${frame} is outside 0-${comp.durationInFrames - 1}`);
          continue;
        }
        await renderStill({ composition: comp, serveUrl, output, frame, scale, puppeteerInstance: browser, browserExecutable, overwrite: true, logLevel: "error" });
        console.log(`${output}  ${label}  (frame ${frame})`);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(3, Math.floor(cpus().length / 2))) }, worker));
  } finally {
    await browser.close({ silent: true });
  }
};

const renderAllWithCli = () => {
  for (const [label, frame, output, scale] of jobs) {
    const args = ["remotion", "still", bundleDir, composition, output, `--frame=${frame}`, `--scale=${scale}`];
    if (browserExecutable) args.push(`--browser-executable=${browserExecutable}`);
    npx(args, { stdio: ["ignore", "ignore", "inherit"] });
    console.log(`${output}  ${label}  (frame ${frame})`);
  }
};

try {
  await renderAllInProcess();
} catch (error) {
  console.log(`In-process render failed (${String(error.message ?? error).split("\n")[0]}); rendering one frame at a time.`);
  renderAllWithCli();
}
console.log(`${jobs.length} frames in ${((Date.now() - started) / 1000).toFixed(1)} s`);

if (specs[0] === "review") {
  const legend = [];
  for (const [name, list] of Object.entries(groups)) {
    list.forEach(([label, frame], n) => legend.push(`${dir}/${name}/${String(n).padStart(3, "0")}.png  ${label}  (frame ${frame})`));
  }
  writeFileSync(`${dir}/legend.txt`, `${legend.join("\n")}\n`);

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
    tile(`${dir}/scenes/%03d.png`, scenes.length / 2, 4, 360, `${dir}/phone.png`, "select=mod(n\\,2),");
  } catch (error) {
    console.log(`No contact sheets (${error.code === "ENOENT" ? "ffmpeg is not on PATH" : error.message.split("\n")[0]}); read the PNGs one by one.`);
  }
}
