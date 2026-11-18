// Checks the machine and the video project before a build, so a missing tool
// or a stale file shows up now instead of halfway through a render. Run from
// the project root (or anywhere, for the machine checks only):
//
//   node scripts/doctor.mjs
//
// ✔ ready, ⚠ optional or worth a look, ✘ will break the build. Exits with 1
// when anything is ✘.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, platform as osPlatform } from "node:os";
import { join, relative } from "node:path";
import { engineOf, KURDISH_LETTERS, licenceOf, MODELS, POCKET_MODEL, SUPERTONIC_MODEL } from "./voice-engines.mjs";

const results = [];
const ok = (what, detail = "") => results.push(["✔", what, detail]);
const warn = (what, detail = "") => results.push(["⚠", what, detail]);
const fail = (what, detail = "") => results.push(["✘", what, detail]);
const WIN = osPlatform() === "win32";

const run = (cmd, args, options = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: WIN && cmd === "npx", timeout: 60000, ...options });
  if (r.error) return null;
  return { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

// --- The machine ----------------------------------------------------------------
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 22 || (major === 22 && minor >= 13) || (major === 20 && minor >= 19)) ok("Node.js", process.versions.node);
else if (major >= 18) warn("Node.js", `${process.versions.node}: current Remotion wants 20.19+ or 22.13+`);
else fail("Node.js", `${process.versions.node}: install Node.js 22`);

const ffmpeg = run("ffmpeg", ["-hide_banner", "-filters"]);
if (!ffmpeg) warn("ffmpeg", "not on PATH: contact sheets, phone-clip conversion, review-check's file checks and master-audio need the full build (winget install Gyan.FFmpeg)");
else {
  const missing = ["tile", "fps", "loudnorm", "ebur128", "freezedetect", "zscale"].filter((f) => !new RegExp(`\\s${f}\\s`).test(ffmpeg.out));
  if (missing.length === 0) ok("ffmpeg", "full build");
  else warn("ffmpeg", `lacks ${missing.join(", ")}${missing.includes("zscale") ? " (zscale is only for HDR phone clips)" : ""}`);
}
if (!run("ffprobe", ["-version"])) warn("ffprobe", "not on PATH (comes with ffmpeg)");

const story = readJson("src/story/story.json");
const voiceName = story?.voice ?? "";
const isEdge = /^[a-z]{2,3}-.+Neural$/.test(voiceName);
const isRaw = /^(f5|mms):/.test(voiceName);
const PYTHON = process.env.PYTHON ?? (WIN ? "python" : "python3");
if (isEdge) {
  const edge = run(PYTHON, ["-c", "import edge_tts"]);
  if (edge?.status === 0) ok("Edge TTS", `for ${voiceName}`);
  else fail("Edge TTS", `${voiceName} needs it: ${PYTHON} -m pip install edge-tts`);
}
if (isRaw) {
  const venv = WIN ? "tts/.venv/Scripts/python.exe" : "tts/.venv/bin/python";
  const spoken = (story?.scenes ?? []).filter((s) => existsSync(`out/voice-raw/${s.id}.flac`)).length;
  const all = spoken === (story?.scenes?.length ?? 0) && spoken > 0;
  if (existsSync(venv)) ok("Sorani voice", `tts/.venv; ${spoken}/${story?.scenes?.length ?? 0} scenes spoken in out/voice-raw`);
  else if (all) ok("Sorani voice", "every scene already spoken in out/voice-raw (re-speaking needs tts/.venv)");
  else fail("Sorani voice", `no ${venv} and ${spoken}/${story?.scenes?.length ?? 0} scenes spoken (toolbox.md, "Sorani voices")`);
  const voice = voiceName.split(":")[1];
  if (voiceName.startsWith("f5:") && !existsSync(`tts/f5-repo/${voice}-ema.pt`)) warn("Sorani F5 weights", `tts/f5-repo/${voice}-ema.pt missing (fetch_ema.py)`);
}
const engine = engineOf(voiceName);
if (engine === "pocket" || engine === "supertonic") {
  if (existsSync(join("node_modules", "sherpa-onnx-node"))) ok("sherpa-onnx", `runs ${voiceName}`);
  else fail("sherpa-onnx", `${voiceName} needs it: npm i -D sherpa-onnx-node@2.0.1`);
  const [model, check] = engine === "pocket" ? [POCKET_MODEL, "lm_main.int8.onnx"] : [SUPERTONIC_MODEL, "vocoder.int8.onnx"];
  if (existsSync(join(MODELS, model, check))) ok(`${engine} model`, join(MODELS, model));
  else if (run("curl", ["--version"]) && run("tar", ["--version"])) ok(`${engine} model`, "downloads on first use (about 100 MB, once for every project)");
  else fail(`${engine} model`, "not downloaded, and curl or tar is missing to fetch it");
  const reference = voiceName.slice("pocket:".length);
  if (engine === "pocket" && /\.\w{2,4}$/.test(reference)) {
    if (existsSync(reference)) warn("Copied voice", `${reference}: only the person's own voice, or one they have permission to use`);
    else fail("Copied voice", `${reference} not found`);
  }
  if (engine === "pocket" && (story?.speed ?? 1) !== 1) warn("Speed", "Pocket speaks at its own pace and ignores \"speed\"");
  const kurdish = (story?.scenes ?? []).filter((s) => KURDISH_LETTERS.test(s.say ?? s.text ?? ""));
  if (engine === "supertonic" && kurdish.length) fail("Supertonic", `can't speak Kurdish (${kurdish.map((s) => s.id).join(", ")}): use a gemini: or f5: voice`);
}
if (engine === "gemini") {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ok("Gemini key", "set in this terminal");
  else fail("Gemini key", `${voiceName} needs GEMINI_API_KEY: a free key from https://aistudio.google.com/apikey, set in the terminal, never in a project file`);
}
if (voiceName) (engine === "kokoro" ? ok : warn)("Voice licence", licenceOf(voiceName));

const heygen = WIN ? run("wsl", ["-e", "bash", "-lc", "~/.local/bin/heygen auth status 2>&1"]) : run("heygen", ["auth", "status"]);
if (process.env.HEYGEN_API_BASE) ok("HeyGen", "the host app provides it (HEYGEN_API_BASE)");
else if (!heygen || /not found|No such file/i.test(heygen.out)) warn("HeyGen CLI", "not installed: real music needs it, or a track the person supplies (music.md)");
else if (/logged in|authenticated/i.test(heygen.out) && heygen.status === 0) ok("HeyGen CLI", "signed in");
else warn("HeyGen CLI", "installed but not signed in (music.md, \"HeyGen setup\")");

const skillDirs = [join(homedir(), ".claude", "skills"), join(homedir(), ".agents", "skills")];
const hasSkill = (name) => skillDirs.some((d) => existsSync(join(d, name, "SKILL.md")));
if (hasSkill("hyperframes")) ok("HyperFrames skill", "beats, audio sections, capture, transcribe");
else warn("HyperFrames skill", "optional: beat and section detection, website capture (hyperframes.md)");
if (hasSkill("remotion-best-practices")) ok("Remotion skills");
else warn("Remotion skills", "optional: npx skills add remotion-dev/skills");

const chromes = WIN
  ? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"]
  : ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const chrome = chromes.find((p) => existsSync(p));
if (chrome) ok("Chrome", `for website screenshots: ${chrome}`);
else warn("Chrome", "not found: headless screenshots of live sites need it");

// --- The project ------------------------------------------------------------------
const pkg = readJson("package.json");
if (!pkg) {
  warn("Project", "no package.json here: run this from the video project's root for the project checks");
} else {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const remotionVersions = Object.entries(deps).filter(([n]) => n === "remotion" || n.startsWith("@remotion/"));
  const versions = new Set(remotionVersions.map(([, v]) => String(v).replace(/^[\^~]/, "")));
  if (!deps.remotion) fail("Remotion", "not in package.json (setup-project.mjs)");
  else if (versions.size > 1) fail("Remotion packages", `mixed versions (${[...versions].join(", ")}): npx remotion upgrade`);
  else ok("Remotion", [...versions][0]);
  for (const need of ["@remotion/transitions", "@remotion/media", "@remotion/google-fonts"]) {
    if (!deps[need]) fail(need, "missing: npx remotion add " + need);
  }
  if (engine === "kokoro" && voiceName && !deps["kokoro-js"]) warn("kokoro-js", `${voiceName} is a Kokoro voice: npm i -D kokoro-js@1.2.1, or the Python route: ${PYTHON} -m pip install kokoro-onnx soundfile (or make-voice --draft for now)`);
  if (!existsSync(join("node_modules", "remotion"))) fail("node_modules", "not installed: npm install");

  const tsconfig = readJson("tsconfig.json");
  if (tsconfig && !tsconfig.compilerOptions?.resolveJsonModule) fail("tsconfig.json", "needs \"resolveJsonModule\": true");

  for (const script of ["make-voice.mjs", "stills.mjs", "review-check.mjs"]) {
    if (!existsSync(join("scripts", script))) warn(`scripts/${script}`, "missing: copy the skill's scripts into the project (setup-project.mjs --update)");
  }

  // story.json against voice.json
  const voice = readJson("src/story/voice.json");
  if (!story) fail("story.json", "missing or not valid JSON");
  else if (!voice) fail("voice.json", "missing: node scripts/make-voice.mjs --draft (estimated timings) or without --draft (the voice)");
  else {
    const same = story.scenes.map((s) => s.id).join(",") === voice.scenes.map((s) => s.id).join(",");
    const staleText = story.scenes.filter((s) => {
      const v = voice.scenes.find((x) => x.id === s.id);
      return v?.captions?.length && v.captions.map((c) => c.text.trim()).join(" ") !== (s.text ?? "").trim().split(/\s+/).join(" ");
    });
    if (!same) fail("voice.json", "scenes don't match story.json: node scripts/make-voice.mjs");
    else if (staleText.length) fail("voice.json", `older than the words of ${staleText.map((s) => s.id).join(", ")}: node scripts/make-voice.mjs`);
    else if (voice.draft) warn("voice.json", "draft timings, silent voice: fine for building; run make-voice without --draft before the preview gate");
    else ok("voice.json", `${voice.scenes.length} scenes, ${(voice.totalFrames / voice.fps).toFixed(1)} s`);
  }

  // Files the code points at
  const publicFiles = new Set();
  const walk = (dir, out, filter) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, out, filter);
      else if (!filter || filter.test(name)) out.push(path);
    }
  };
  const pub = [];
  walk("public", pub);
  for (const f of pub) publicFiles.add(relative("public", f).split("\\").join("/"));
  const src = [];
  walk("src", src, /\.(tsx?|jsx?)$/);
  const missing = new Set();
  for (const file of src) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/staticFile\(\s*["'`]([^"'`$]+)["'`]\s*\)/g)) {
      if (!publicFiles.has(m[1].replace(/^\/+/, ""))) missing.add(`public/${m[1]} (${file.split("\\").join("/")})`);
    }
  }
  if (missing.size) fail("Files the code needs", [...missing].join("; "));
  else ok("Files the code needs", "all there");

  const photos = [...publicFiles].filter((f) => f.startsWith("photos/"));
  if (photos.length) ok("public/photos", photos.map((f) => f.slice(7)).join(", "));
  else warn("public/photos", "empty: tell the person the file names (me, plus one per person)");
  for (const clip of photos.filter((f) => /\.(mov|mp4|m4v)$/i.test(f))) {
    const p = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,color_transfer", "-of", "csv=p=0", join("public", clip)]);
    if (!p) break;
    const [codec, transfer] = p.out.trim().split(",");
    if (codec === "hevc" || /arib-std-b67|smpte2084/.test(transfer ?? "")) warn(`public/${clip}`, `${codec}${transfer ? `, ${transfer}` : ""}: convert to H.264${/arib|smpte2084/.test(transfer ?? "") ? " with tone-mapping" : ""} first (production.md, "Pitfalls")`);
  }
  if (!pub.some((f) => /bgm[\\/]track\.(mp3|wav|m4a)$/i.test(f))) warn("Music", "no public/bgm/track.*: the video will play without a bed");
  const sfx = [...publicFiles].filter((f) => f.startsWith("sfx/"));
  if (!sfx.length) warn("Sound effects", "public/sfx/ is empty: <Sfx> sounds will be skipped");

  for (const doc of ["brief.md", "design.md", "STORYBOARD.md"]) {
    if (!existsSync(doc)) warn(doc, "not written yet (SKILL.md, steps 1 and 3)");
  }
}

const width = Math.max(...results.map(([, w]) => w.length));
for (const [mark, what, detail] of results) console.log(`${mark} ${what.padEnd(width)}  ${detail}`);
process.exitCode = results.some(([m]) => m === "✘") ? 1 : 0;
