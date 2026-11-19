// The measurable half of the review pass (review.md, "Measure, then look"),
// run as one command. Run from the Remotion project root:
//
//   node scripts/review-check.mjs [out/video-v2.mp4] [--platform reels]
//     [--story src/story/story.json] [--voice src/story/voice.json]
//
// Without a video it checks the script, the timings and the code; with one it
// also checks the rendered file: an empty first frame, black or frozen
// stretches, silence, loudness and true peak, and that the length and size
// match. It prints notes in the review format, P0 first
// (`t=4.2s · where · problem → change`), writes out/review-check.md, and exits
// with 1 when a P0 is open. A note is a question, not a rule: fix it, or keep
// it on purpose and say why in REVIEW.md.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  argv.splice(i, 2);
  return value;
};
const storyPath = flag("story", "src/story/story.json");
const voicePath = flag("voice", "src/story/voice.json");
let platform = flag("platform", null);
const video = argv.find((a) => !a.startsWith("--"));

const notes = [];
const note = (level, where, problem, change, t) =>
  notes.push({ level, line: `${t === undefined ? "" : `t=${t.toFixed(1)}s · `}${where} · ${problem}${change ? ` → ${change}` : ""}` });
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

// --- The composition: size and platform, from Root.tsx -------------------
let width = 1080;
let height = 1920;
try {
  const root = readFileSync("src/Root.tsx", "utf8");
  width = Number(root.match(/width=\{(\d+)\}/)?.[1] ?? width);
  height = Number(root.match(/height=\{(\d+)\}/)?.[1] ?? height);
  platform ??= root.match(/platform:\s*"(\w+)"/)?.[1] ?? null;
} catch {}
const k = Math.min(width, height) / 1080;
const minText = Math.ceil(28 * k);
const vertical = height / width > 1.5;

// --- Script and timings ---------------------------------------------------
const story = readJson(storyPath);
const voice = readJson(voicePath);
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const BANNED = /\b(unlock|seamless(ly)?|supercharge[sd]?|game[- ]changer|revolutioni[sz]e[sd]?|effortless(ly)?|in seconds)\b/i;
const words = (text) => (text ?? "").trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
const hasRtl = story?.scenes?.some((s) => RTL.test(s.text ?? "")) ?? false;

if (!story) note("P0", storyPath, "missing or not valid JSON", "write the script first");
if (story && !voice) note("P0", voicePath, "missing", "run node scripts/make-voice.mjs (--draft for timings without a voice)");

if (story && voice) {
  const fps = voice.fps;
  const ids = story.scenes.map((s) => s.id).join(",");
  if (ids !== voice.scenes.map((s) => s.id).join(",")) {
    note("P0", "voice.json", "its scenes don't match story.json (added, removed or reordered)", "run node scripts/make-voice.mjs");
  }
  for (const s of story.scenes) {
    const v = voice.scenes.find((x) => x.id === s.id);
    if (!v) continue;
    const shown = (v.captions ?? []).map((c) => c.text.trim()).join(" ");
    if (v.captions?.length && shown !== words(s.text).join(" ") && shown !== (s.text ?? "").trim().split(/\s+/).join(" ")) {
      note("P0", `scene ${s.id}`, "the captions don't match story.json's text: the voice is out of date", "run node scripts/make-voice.mjs");
    }
  }
  if (voice.draft) {
    note(video ? "P0" : "P2", "voice.json", "draft timings with a silent voice", "pick the voice by ear, then run make-voice.mjs without --draft");
  }

  let longScenes = 0;
  let total = 0;
  for (const s of story.scenes) {
    const spoken = words(s.say ?? s.text);
    total += spoken.length;
    const v = voice.scenes.find((x) => x.id === s.id);
    const t = v ? v.startSeconds : undefined;
    if (spoken.length > 26) note("P1", `scene ${s.id}`, `${spoken.length} spoken words (about ${(spoken.length / 2.2).toFixed(0)} s)`, "split it, or cut to about 19", t);
    else if (spoken.length > 19) longScenes++;
    if (BANNED.test(s.text ?? "")) note("P1", `scene ${s.id}`, `"${(s.text.match(BANNED) ?? [""])[0]}" is a generated-video word`, "say the specific thing instead", t);
    if (/\b(Mr|Mrs|Dr|St)\./.test(s.say ?? s.text ?? "")) note("P2", `scene ${s.id}`, "an abbreviation the voice may misread", 'write it out in "say" ("Mister")', t);
    if (!s.say && /\d/.test(s.text ?? "") && !voice.draft && !/^(f5|mms):/.test(story.voice ?? "")) {
      note("P2", `scene ${s.id}`, "digits in a line with no \"say\"", "check how the voice reads them; spell them in \"say\"", t);
    }
    if (v) {
      const seconds = v.durationInFrames / fps;
      if (seconds > 12.5) note("P2", `scene ${s.id}`, `${seconds.toFixed(1)} s long`, "make sure something new arrives every 2 to 4 s", t);
      for (const c of v.captions ?? []) {
        const span = (c.endMs - c.startMs) / 1000;
        const letters = c.text.replace(/[^\p{L}]/gu, "").length;
        if (span > 1 && !voice.draft) {
          note(letters >= 12 ? "P2" : "P1", `scene ${s.id}, "${c.text.trim()}"`, `one word spans ${span.toFixed(2)} s: a pause was matched to the wrong break`, 'check make-voice\'s "breaks" line and rephrase', v.startSeconds + v.voiceFrom / fps + c.startMs / 1000);
        }
      }
    }
  }
  if (longScenes > 2) note("P1", "script", `${longScenes} scenes over 19 spoken words (at most two should reach 26)`, "trim the longest");
  if (total > 400) note("P1", "script", `${total} spoken words in all`, "a whole video is about 400 at most; cut a scene");
  const first = story.scenes[0];
  if (/^\s*(introducing|meet)\b/i.test(first?.text ?? "")) note("P1", `scene ${first.id}`, 'the first line opens with "Introducing"/"Meet"', "open on the problem, the result or a moment");
  const last = voice.scenes.at(-1);
  const lastStory = story.scenes.at(-1);
  if (last && lastStory) {
    const after = (last.durationInFrames - last.voiceFrom) / fps - last.voiceSeconds;
    if (after < 2) note("P1", `scene ${last.id}`, `the ending holds ${after.toFixed(1)} s after the last word`, 'raise its "hold" so the last line or end card stays 2 s or more');
  }
  const firstVoice = voice.scenes[0];
  if (firstVoice && firstVoice.voiceFrom / fps > 3) note("P2", `scene ${firstVoice.id}`, `the voice starts at ${(firstVoice.voiceFrom / fps).toFixed(1)} s`, "make sure the picture hooks before it");
}

// --- Code -------------------------------------------------------------------
const files = [];
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(path);
  }
};
walk("src");
const publicFiles = new Set();
const walkPublic = (dir) => {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkPublic(path);
    else publicFiles.add(relative("public", path).split("\\").join("/"));
  }
};
walkPublic("public");
const photoBases = new Set([...publicFiles].filter((f) => f.startsWith("photos/")).map((f) => f.slice(7).replace(/\.\w+$/, "").toLowerCase()));

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((text, i) => {
    const where = `${file.split("\\").join("/")}:${i + 1}`;
    if (/^\s*\/\//.test(text)) return;
    for (const m of text.matchAll(/fontSize(?::\s*|=\{)(\d+(?:\.\d+)?)\b(?!\s*\*)/g)) {
      if (Number(m[1]) < minText) note("P1", where, `fontSize ${m[1]} is under ${minText} px, too small to read on a phone`, "cut words instead of shrinking the type");
    }
    if (/Math\.random\(|Date\.now\(|new Date\(/.test(text)) note("P0", where, "Math.random(), Date.now() or new Date() gives a different frame each render", "use random(seed) from remotion and frame-driven values");
    if (/\b(transition|animation)\s*:\s*["'`]/.test(text)) note("P1", where, "a CSS transition or animation doesn't render in Remotion", "drive it from useCurrentFrame()");
    for (const m of text.matchAll(/staticFile\(\s*["'`]([^"'`$]+)["'`]\s*\)/g)) {
      if (!publicFiles.has(m[1].replace(/^\/+/, ""))) note("P0", where, `public/${m[1]} doesn't exist: the render will fail`, "add the file, or use <Sfx>/findStatic so a missing file is skipped");
    }
    for (const m of text.matchAll(/(?:base|clip)=["']([\w.-]+)["']/g)) {
      if (!photoBases.has(m[1].toLowerCase())) note("P2", where, `public/photos/${m[1]}.* isn't there yet`, "it shows its fallback until the file is added");
    }
    if (hasRtl && /\.split\(\s*["']{2}\s*\)/.test(text)) note("P1", where, "text split into letters: per-letter animation breaks joined Arabic and Kurdish letters", "animate whole words or lines");
    if (hasRtl && /letterSpacing:\s*["'`](?!normal)/.test(text) && !/letterSpacingFor|isRtl|rtl/.test(text)) note("P2", where, "letter-spacing on text that may be Kurdish or Arabic", "use letterSpacingFor(text, ...) from story/text.ts");
    if (vertical && platform === "reels") {
      for (const m of text.matchAll(/\btop(?::\s*|=\{)(\d{4})\b/g)) {
        if (Number(m[1]) > 1330 * k) note("P2", where, `top ${m[1]} is under the app's caption and buttons on Reels, TikTok and Shorts`, "keep words above y 1330");
      }
    }
  });
}
// Scenes still playing as placeholders: reported once, not frame by frame.
const unbuilt = new Set();
const registryPath = join(dirname(storyPath), "scenes.tsx");
if (story && existsSync(registryPath)) {
  const registry = readFileSync(registryPath, "utf8");
  const missing = story.scenes.filter((s) => !new RegExp(`(^|[\\s{,])["']?${s.id.replace(/[-]/g, "\\-")}["']?\\s*:`, "m").test(registry));
  for (const m of missing) unbuilt.add(m.id);
  if (missing.length) note(video ? "P0" : "P2", "scenes.tsx", `not built yet (playing as placeholders): ${missing.map((s) => s.id).join(", ")}`, "write their scenes");
}

// --- The rendered file --------------------------------------------------------
// Runs a tool and returns everything it printed (ffmpeg prints filter results
// on stderr, even when it succeeds), or null when it isn't installed.
const capture = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error?.code === "ENOENT") return null;
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
};
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error?.code === "ENOENT") return null;
  return r.stdout ?? "";
};
const ff = (args) => capture("ffmpeg", ["-hide_banner", "-nostats", ...args]) ?? "";

const measured = {};
if (video) {
  if (!existsSync(video)) {
    note("P0", video, "not found");
  } else {
    const probe = run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", video]);
    if (probe === null) {
      note("P2", video, "ffprobe and ffmpeg aren't on PATH: the file checks were skipped", "install the full ffmpeg (toolbox.md, \"Verification tools\")");
    } else {
      const info = JSON.parse(probe);
      const duration = Number(info.format?.duration ?? 0);
      const v = info.streams?.find((s) => s.codec_type === "video");
      const hasAudio = info.streams?.some((s) => s.codec_type === "audio");
      measured.duration = duration;
      measured.size = v ? `${v.width}x${v.height}` : "?";
      if (v && (v.width !== width || v.height !== height) && !/-draft/.test(video)) note("P2", video, `${v.width}x${v.height}, but Root.tsx says ${width}x${height}`, "a draft render (--scale) is fine; a final one should match");
      if (voice && Math.abs(duration - voice.totalFrames / voice.fps) > 0.25) {
        note("P1", video, `${duration.toFixed(2)} s, but voice.json says ${(voice.totalFrames / voice.fps).toFixed(2)} s`, "render again after make-voice");
      }

      // The first frame is the thumbnail.
      const stats = ff(["-i", video, "-vf", "signalstats,metadata=print:file=-", "-frames:v", "1", "-f", "null", "-"]);
      const yavg = Number(stats.match(/YAVG=([\d.]+)/)?.[1] ?? NaN);
      const ylow = Number(stats.match(/YLOW=([\d.]+)/)?.[1] ?? NaN);
      const yhigh = Number(stats.match(/YHIGH=([\d.]+)/)?.[1] ?? NaN);
      if (!Number.isNaN(yavg)) {
        measured.frame0 = { yavg, spread: yhigh - ylow };
        if (yavg < 12 || yhigh - ylow < 20) note("P0", "frame 0", "black or nearly empty; it is the thumbnail on social players", "open on a face, the result or one bold line", 0);
      }

      const black = ff(["-i", video, "-vf", "blackdetect=d=0.4:pix_th=0.03", "-an", "-f", "null", "-"]);
      for (const m of black.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)) {
        const [start, , length] = [Number(m[1]), Number(m[2]), Number(m[3])];
        if (start > 0.05 && start < duration - 0.6) note("P1", "picture", `black for ${length.toFixed(1)} s`, "fill it, or make the dip deliberate and short", start);
      }

      const frozen = ff(["-i", video, "-vf", "freezedetect=n=-60dB:d=3", "-an", "-f", "null", "-"]);
      for (const m of frozen.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)) {
        note("P1", "picture", `nothing changes on screen for ${Number(m[2]).toFixed(1)} s`, "bring in the next element on a word, or cut the hold", Number(m[1]));
      }

      // Empty frames: at each scene's start and middle, how much of the band
      // above the captions holds anything but the background (the banned
      // "small things floating in a void"). Measured on a 160 px wide copy.
      if (voice) {
        const W = 160;
        const H = Math.round((W * height) / width / 2) * 2;
        const bandBottom = Math.floor(H * ((vertical ? (platform === "reels" ? 1300 : 1470) : height / width < 0.75 ? 892 : height - 290) * k - 10 * k) / height);
        const coverageAt = (t) => {
          const r = spawnSync("ffmpeg", ["-v", "error", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 16 * 1024 * 1024 });
          const px = r.stdout;
          if (!px || px.length < W * H * 3) return null;
          const bins = new Map();
          for (let i = 0; i < W * bandBottom * 3; i += 3) {
            const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
            bins.set(key, (bins.get(key) ?? 0) + 1);
          }
          const top = [...bins.entries()].sort((a, b) => b[1] - a[1])[0][0];
          const bg = [((top >> 8) & 15) * 16 + 8, ((top >> 4) & 15) * 16 + 8, (top & 15) * 16 + 8];
          let x0 = W, y0 = H, x1 = -1, y1 = -1, count = 0;
          for (let y = 0; y < bandBottom; y++) {
            for (let x = 0; x < W; x++) {
              const i = (y * W + x) * 3;
              if (Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) > 60) {
                count++;
                x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
              }
            }
          }
          const area = W * bandBottom;
          return { filled: count / area, box: x1 < 0 ? 0 : ((x1 - x0 + 1) * (y1 - y0 + 1)) / area };
        };
        for (const s of voice.scenes) {
          if (unbuilt.has(s.id)) continue;
          const first = voice.scenes[0] === s;
          const overlap = first ? 0 : (s.overlap ?? voice.transitionFrames);
          for (const [label, t] of [["start", s.startSeconds + overlap / voice.fps + 0.3], ["middle", s.startSeconds + s.durationInFrames / voice.fps / 2]]) {
            if (t >= duration) continue;
            const c = coverageAt(t);
            if (!c) break;
            if (c.filled < 0.004) note("P1", `scene ${s.id}, ${label}`, "the picture above the captions is empty", "bring the scene's first element in earlier, or start it on screen", t);
            else if (c.box < 0.3) {
              // The last scene is usually the end card, which is compact by design.
              const last = voice.scenes.at(-1) === s;
              note(last ? "P2" : "P1", `scene ${s.id}, ${label}`, `everything sits in ${Math.round(c.box * 100)}% of the frame${last ? " (fine for an end card)" : ": small things floating in empty space"}`, last ? "" : "make the hero fill 40% or more: push in, crop, or give it a world", t);
            }
          }
        }
      }

      if (!hasAudio) {
        if (duration > 15) note("P0", "sound", "the video has no audio track", "add the music bed and the voice, unless silence was asked for");
      } else {
        const loud = ff(["-i", video, "-af", "ebur128=peak=true:framelog=quiet", "-vn", "-f", "null", "-"]);
        const summary = loud.slice(loud.lastIndexOf("Summary:"));
        const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1] ?? NaN);
        const peak = Number(summary.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/)?.[1] ?? NaN);
        measured.lufs = lufs;
        measured.truePeak = peak;
        if (!Number.isNaN(lufs)) {
          if (lufs < -40 && duration > 15) note("P0", "sound", `${lufs} LUFS: the video is silent`, "check the music and voice files are wired in");
          else if (lufs < -16.5 || lufs > -12.5) note("P2", "sound", `${lufs} LUFS (social apps play about -14)`, `node scripts/master-audio.mjs ${video}`);
        }
        if (!Number.isNaN(peak) && peak > -1) note("P1", "sound", `true peak ${peak} dBTP clips on some phones`, `node scripts/master-audio.mjs ${video}`);
        const quiet = ff(["-i", video, "-af", "silencedetect=n=-45dB:d=2.5", "-vn", "-f", "null", "-"]);
        for (const m of quiet.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_duration: ([\d.]+)/g)) {
          note("P2", "sound", `silent for ${Number(m[2]).toFixed(1)} s`, "fine if it's a planned silence; otherwise bring the bed back", Number(m[1]));
        }
      }
    }
  }
}

// --- Report -----------------------------------------------------------------
const order = { P0: 0, P1: 1, P2: 2 };
notes.sort((a, b) => order[a.level] - order[b.level]);
const counts = ["P0", "P1", "P2"].map((l) => `${notes.filter((n) => n.level === l).length} ${l}`).join(", ");
const header = `Review check${video ? ` of ${video}` : ""} (${width}x${height}${platform ? `, ${platform}` : ""}): ${counts}`;
const facts = Object.keys(measured).length
  ? `Measured: ${[
      measured.duration !== undefined ? `${measured.duration.toFixed(2)} s` : null,
      measured.size,
      measured.lufs !== undefined && !Number.isNaN(measured.lufs) ? `${measured.lufs} LUFS` : null,
      measured.truePeak !== undefined && !Number.isNaN(measured.truePeak) ? `true peak ${measured.truePeak} dBTP` : null,
    ]
      .filter(Boolean)
      .join(", ")}`
  : null;
const body = notes.length ? notes.map((n) => `- ${n.level} ${n.line}`).join("\n") : "- nothing measurable to fix; now look at the review sheets (review.md)";
const report = [header, facts, "", body, ""].filter((l) => l !== null).join("\n");
mkdirSync("out", { recursive: true });
writeFileSync("out/review-check.md", report);
console.log(report);
process.exitCode = notes.some((n) => n.level === "P0") ? 1 : 0;
