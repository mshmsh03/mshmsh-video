// Sets up a video project in one step: scaffolds Remotion if the folder is
// new, adds the packages, copies this skill's template and scripts, sizes the
// composition for the format, loads a font for Kurdish or Arabic, applies a
// saved brand, downloads the sound effects and writes draft timings, so the
// Studio preview opens straight away. Run it from anywhere with the skill's
// own copy (not a copy inside a project):
//
//   node <skill>/scripts/setup-project.mjs <project-dir>
//     [--format 9:16|16:9|1:1|4:5] [--platform reels|whatsapp|landscape|feed]
//     [--script latin|arabic|sorani] [--script-font IBMPlexSansArabic]
//     [--brand <brands>/<client>/brand.json] [--local-fonts] [--no-kokoro]
//     [--no-sherpa] [--google-fonts] [--no-install] [--update]
//
// The look comes from the project's design.md when it is already written
// (its "Palette:" and "Fonts:" lines), else from the brand kit, else the
// template's. --local-fonts downloads the font files into public/fonts, so a
// render never needs the internet; it is turned on by itself when Google Fonts
// can't be reached from this machine (--google-fonts keeps Google Fonts anyway).
//
// --update brings an existing project's shared components and scripts up to
// this skill's version. It never touches the per-video files (story.json,
// scenes.tsx, theme.ts, Root.tsx, voice.json) and backs up every file it
// replaces in .video-xoshaka-backup/<time>/.

import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeSfx } from "./make-sfx.mjs";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(SKILL, "assets", "template", "src");
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);
const target = argv.find((a, i) => !a.startsWith("--") && !(argv[i - 1]?.startsWith("--") && !["--update", "--no-kokoro", "--no-sherpa", "--no-install", "--local-fonts", "--google-fonts"].includes(argv[i - 1])));
if (!target) throw new Error("Usage: setup-project.mjs <project-dir> [--format 9:16] [--platform reels] [--script sorani] [--brand brand.json] [--update]");
const DIR = resolve(target);
const FORMAT = flag("format", "9:16");
const SIZES = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
if (!SIZES[FORMAT]) throw new Error(`--format must be one of ${Object.keys(SIZES).join(", ")}`);
const [WIDTH, HEIGHT] = SIZES[FORMAT];
const PLATFORM = flag("platform", FORMAT === "9:16" ? "reels" : FORMAT === "16:9" ? "landscape" : "feed");
const SCRIPT = flag("script", "latin");
const SCRIPT_FONT = flag("script-font", SCRIPT === "sorani" ? "IBMPlexSansArabic" : SCRIPT === "arabic" ? "NotoKufiArabic" : null);
const BRAND_PATH = flag("brand", null);
const UPDATE = has("update");
const INSTALL = !has("no-install");
let LOCAL_FONTS = has("local-fonts");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const log = (line) => console.log(line);
const notes = [];

const npx = (args, cwd) =>
  process.platform === "win32"
    ? execSync(`npx ${args.map((a) => (/[\s"]/.test(a) ? `"${a}"` : a)).join(" ")}`, { cwd, stdio: "inherit" })
    : execFileSync("npx", args, { cwd, stdio: "inherit" });
const npm = (args, cwd) =>
  process.platform === "win32"
    ? execSync(`npm ${args.join(" ")}`, { cwd, stdio: "inherit" })
    : execFileSync("npm", args, { cwd, stdio: "inherit" });
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

// 1. Remotion itself. The folder may already hold the plan (brief.md,
// design.md, STORYBOARD.md...): create-video wants an empty folder, so it
// scaffolds next door and the project is moved in around those files.
if (!existsSync(join(DIR, "package.json"))) {
  const existing = existsSync(DIR) ? readdirSync(DIR) : [];
  const SCAFFOLD = new Set(["package.json", "package-lock.json", "node_modules", "src", "public", "tsconfig.json", "remotion.config.ts", ".gitignore", ".prettierrc", "eslint.config.mjs", "README.md"]);
  const clash = existing.filter((name) => SCAFFOLD.has(name));
  if (clash.length) throw new Error(`${DIR} already has ${clash.join(", ")} but no package.json: move those out or pick a new folder`);
  mkdirSync(dirname(DIR), { recursive: true });
  const temp = `${basename(DIR)}-scaffold-${STAMP}`;
  log(`Scaffolding a blank Remotion project in ${DIR}${existing.length ? ` (keeping ${existing.join(", ")})` : ""}`);
  npx(["create-video@latest", "--yes", "--blank", "--no-tailwind", temp], dirname(DIR));
  mkdirSync(DIR, { recursive: true });
  for (const name of readdirSync(join(dirname(DIR), temp))) {
    renameSync(join(dirname(DIR), temp, name), join(DIR, name));
  }
  rmSync(join(dirname(DIR), temp), { recursive: true, force: true });
  // create-video names the package after its folder.
  const scaffolded = readJson(join(DIR, "package.json"));
  writeFileSync(join(DIR, "package.json"), `${JSON.stringify({ ...scaffolded, name: basename(DIR).toLowerCase().replace(/[^a-z0-9-]+/g, "-") }, null, 2)}\n`);
}
const pkg = readJson(join(DIR, "package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
// Renders load Google Fonts over the internet. Where fonts.googleapis.com can't
// be reached (offline, or a sandbox such as the Claude app's that blocks it),
// save the font files in the project instead, as --local-fonts does.
if (!LOCAL_FONTS && !has("google-fonts")) {
  try {
    const r = await fetch("https://fonts.googleapis.com/css2?family=Inter&display=swap", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(String(r.status));
  } catch {
    LOCAL_FONTS = true;
    notes.push("Google Fonts can't be reached from here, so the font files are saved in public/fonts (as with --local-fonts).");
  }
}
if (INSTALL) {
  const wanted = ["@remotion/transitions", "@remotion/google-fonts", "@remotion/media", "@remotion/captions", ...(LOCAL_FONTS ? ["@remotion/fonts"] : [])].filter((p) => !deps[p]);
  if (wanted.length) npx(["remotion", "add", ...wanted], DIR);
  if (SCRIPT === "latin" && !has("no-kokoro") && !deps["kokoro-js"]) npm(["i", "-D", "kokoro-js@1.2.1", "--onnxruntime-node-install-cuda=skip"], DIR);
  // Supertonic (English, Arabic and more) and Pocket TTS (English) run on
  // sherpa-onnx; neither speaks Kurdish, so a Sorani project skips it.
  if (SCRIPT !== "sorani" && !has("no-sherpa") && !deps["sherpa-onnx-node"]) npm(["i", "-D", "sherpa-onnx-node@2.0.1"], DIR);
  // Vekol, the offline Sorani voice, runs on onnxruntime.
  if (SCRIPT === "sorani" && !deps["onnxruntime-node"]) npm(["i", "-D", "onnxruntime-node@1.21.0", "--onnxruntime-node-install-cuda=skip"], DIR);
}

// 2. The template. Per-video files are written once; shared components are
// copied when missing, or replaced (with a backup) under --update.
const PER_VIDEO = new Set(["Root.tsx", "theme.ts", "story/story.json", "story/scenes.tsx", "story/voice.json"]);
const backup = (rel) => {
  const from = join(DIR, rel);
  const to = join(DIR, ".video-xoshaka-backup", STAMP, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
const copied = [];
const kept = [];
for (const from of files(TEMPLATE)) {
  const rel = relative(TEMPLATE, from).split("\\").join("/");
  const to = join(DIR, "src", rel);
  const exists = existsSync(to);
  const isDefaultRoot = rel === "Root.tsx" && exists && readFileSync(to, "utf8").includes("MyComposition");
  if (PER_VIDEO.has(rel)) {
    if (exists && !isDefaultRoot) {
      kept.push(rel);
      continue;
    }
  } else if (exists) {
    if (!UPDATE) {
      kept.push(rel);
      continue;
    }
    if (readFileSync(to, "utf8") === readFileSync(from, "utf8")) continue;
    backup(join("src", rel));
  }
  mkdirSync(dirname(to), { recursive: true });
  if (rel === "Root.tsx") {
    const root = readFileSync(from, "utf8")
      .replace(/width=\{\d+\}/, `width={${WIDTH}}`)
      .replace(/height=\{\d+\}/, `height={${HEIGHT}}`)
      .replace(/platform: "\w+"/, `platform: "${PLATFORM}"`);
    writeFileSync(to, root);
  } else if (rel === "story/story.json" && SCRIPT !== "latin") {
    const story = readJson(from);
    writeFileSync(to, `${JSON.stringify({ ...story, direction: "rtl" }, null, 2)}\n`);
  } else if (rel === "theme.ts") {
    continue; // written below
  } else {
    copyFileSync(from, to);
  }
  copied.push(rel);
}
const defaultComposition = join(DIR, "src", "Composition.tsx");
if (existsSync(defaultComposition) && readFileSync(defaultComposition, "utf8").includes("MyComposition")) {
  backup("src/Composition.tsx");
  execSync(process.platform === "win32" ? `del "${defaultComposition}"` : `rm "${defaultComposition}"`);
}

// 3. The theme. design.md is written before setup (SKILL.md, step 3), so its
// palette and fonts win; then the brand kit; then the template's own look,
// which is the funny story's (and on the banned list for anything else).
const brand = BRAND_PATH ? readJson(BRAND_PATH) : null;
const require = createRequire(join(DIR, "package.json"));
const googleFont = (name) => {
  const id = String(name).replace(/[^A-Za-z0-9]/g, "");
  try {
    return { id, info: require(`@remotion/google-fonts/${id}`).getInfo() };
  } catch {
    return null;
  }
};
const pickWeights = (info, wanted) => {
  const available = Object.keys(info?.fonts?.normal ?? {});
  const picked = wanted.filter((w) => available.includes(w));
  return picked.length ? picked : available.slice(0, 2);
};

// design.md's "Palette:" and "Fonts:" lines (storyboard-and-gates.md, template).
const parseDesign = (path) => {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  const line = (label) => text.match(new RegExp(`^\\s*-\\s*${label}\\s*:(.*)$`, "im"))?.[1] ?? "";
  const named = {};
  for (const m of line("Palette").matchAll(/([A-Za-z][\w-]*)\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/g)) {
    const key = m[1].toLowerCase();
    // "text #F4EFE6 on green and #1B1A17 on paper": "and" names nothing.
    if (["and", "or", "on", "with", "plus", "then", "for", "the", "a", "an", "to", "of"].includes(key)) continue;
    if (!(key in named)) named[key] = m[2].toUpperCase();
  }
  const fontsLine = line("Fonts");
  const NAME = "([A-Z][A-Za-z0-9]*(?: [A-Z][A-Za-z0-9]*)*)";
  const after = (words) => fontsLine.match(new RegExp(`(?:${words})s?\\s+${NAME}`))?.[1];
  const scriptPart = fontsLine.match(/script[^;]*/i)?.[0] ?? "";
  const fonts = {
    heading: after("[Hh]eadline|[Hh]eading|[Tt]itle|[Dd]isplay"),
    body: after("[Bb]ody|[Tt]ext"),
    mono: fontsLine.match(new RegExp(`${NAME.slice(0, -1)} (?:Mono|Code))\\b`))?.[1],
    script:
      scriptPart.match(/\(([A-Z][\w ]+)\)/)?.[1] ??
      (/sorani|kurdish/i.test(scriptPart) ? "IBM Plex Sans Arabic" : /arabic/i.test(scriptPart) ? "Noto Kufi Arabic" : undefined),
  };
  for (const k of Object.keys(fonts)) if (!fonts[k]) delete fonts[k];
  return { named, fonts };
};
const mix = (a, b, t) => {
  const rgb = (h) => (h.length === 4 ? [...h.slice(1)].map((c) => parseInt(c + c, 16)) : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

// A Google font's files from Google's own repository on GitHub, for renders
// that work offline. Each family's METADATA.pb lists its files and weights.
const fontFiles = async (name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const license of ["ofl", "apache", "ufl"]) {
    const base = `https://raw.githubusercontent.com/google/fonts/main/${license}/${slug}`;
    let meta;
    try {
      const r = await fetch(`${base}/METADATA.pb`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) continue;
      meta = await r.text();
    } catch {
      continue;
    }
    const entries = [...meta.matchAll(/fonts\s*\{([\s\S]*?)\n\}/g)]
      .map((m) => ({ style: m[1].match(/style:\s*"(\w+)"/)?.[1], weight: Number(m[1].match(/weight:\s*(\d+)/)?.[1]), file: m[1].match(/filename:\s*"([^"]+)"/)?.[1] }))
      .filter((e) => e.style === "normal" && e.file);
    const variable = entries.find((e) => e.file.includes("["));
    const wght = meta.match(/axes\s*\{\s*tag:\s*"wght"\s*min_value:\s*([\d.]+)\s*max_value:\s*([\d.]+)/);
    const chosen = variable
      ? [{ file: variable.file, weight: wght ? `${Math.round(wght[1])} ${Math.round(wght[2])}` : "100 900" }]
      : entries.filter((e) => [400, 500, 600, 700, 800].includes(e.weight)).map((e) => ({ file: e.file, weight: String(e.weight) }));
    const out = [];
    mkdirSync(join(DIR, "public", "fonts"), { recursive: true });
    for (const e of chosen) {
      const local = `${name.replace(/[^A-Za-z0-9]/g, "")}${variable ? "" : `-${e.weight}`}.ttf`;
      try {
        const r = await fetch(`${base}/${encodeURIComponent(e.file)}`, { signal: AbortSignal.timeout(60000) });
        if (!r.ok) throw new Error(String(r.status));
        writeFileSync(join(DIR, "public", "fonts", local), Buffer.from(await r.arrayBuffer()));
        out.push({ file: `fonts/${local}`, weight: e.weight });
      } catch {}
    }
    if (out.length) return out;
  }
  return null;
};

let chosenScriptFont = SCRIPT_FONT;
const themePath = join(DIR, "src", "theme.ts");
if (!existsSync(themePath)) {
  const design = parseDesign(join(DIR, "design.md"));
  const fonts = { heading: "Space Grotesk", mono: "JetBrains Mono", ...(brand?.fonts ?? {}), ...(design?.fonts ?? {}) };
  if (!design?.fonts?.heading && !brand?.fonts?.heading) notes.push("No design.md fonts: theme.ts has the template's look (Space Grotesk, near-black), which is on the banned list for anything but the funny story. Write design.md first, or edit theme.ts.");
  const scriptName = design?.fonts?.script ?? brand?.fonts?.script ?? SCRIPT_FONT;
  chosenScriptFont = scriptName;
  const n = design?.named ?? {};
  const background = n.background ?? n.bg ?? brand?.colors?.background ?? "#141413";
  const text = n.text ?? n.ink ?? brand?.colors?.text ?? "#F5F1E8";
  const colors = {
    background,
    panel: n.panel ?? n.surface ?? n.card ?? brand?.colors?.panel ?? (design ? mix(background, text, 0.07) : "#1F1E1C"),
    border: n.border ?? n.line ?? brand?.colors?.border ?? (design ? mix(background, text, 0.2) : "#3A3833"),
    text,
    muted: n.muted ?? brand?.colors?.muted ?? (design ? mix(text, background, 0.45) : "#A8A296"),
    accent: n.accent ?? brand?.colors?.accent ?? "#D97757",
  };
  // The palette's other named colours (paper, pop, alert...) for the scenes.
  const extra = Object.fromEntries(Object.entries(n).filter(([k]) => !["background", "bg", "text", "ink", "panel", "surface", "card", "border", "line", "muted", "accent"].includes(k)));

  const roles = [
    { key: "heading", name: fonts.heading, weights: ["500", "700", "800"], subset: "latin", fallback: "Space Grotesk" },
    { key: "mono", name: fonts.mono, weights: ["400", "500"], subset: "latin", fallback: "JetBrains Mono" },
    ...(fonts.body && fonts.body !== fonts.heading ? [{ key: "body", name: fonts.body, weights: ["400", "500"], subset: "latin" }] : []),
    ...(scriptName ? [{ key: "script", name: scriptName, weights: ["500", "700"], subset: "arabic" }] : []),
  ];
  const imports = new Set();
  const loads = [];
  const family = {};
  for (const role of roles) {
    let done = false;
    if (LOCAL_FONTS) {
      const files = await fontFiles(role.name);
      if (files) {
        imports.add('import { loadFont } from "@remotion/fonts";');
        imports.add('import { staticFile } from "remotion";');
        for (const f of files) loads.push(`loadFont({ family: "${role.name}", url: staticFile("${f.file}"), weight: "${f.weight}" });`);
        family[role.key] = `'${role.name}'`;
        done = true;
      } else notes.push(`Couldn't download "${role.name}" from Google's font repository: loading it from Google Fonts instead.`);
    }
    if (!done) {
      let g = googleFont(role.name);
      if (!g && role.fallback) {
        notes.push(`Font "${role.name}" isn't on Google Fonts: using ${role.fallback}. Load its files with @remotion/fonts in theme.ts.`);
        g = googleFont(role.fallback);
      }
      if (!g) {
        notes.push(`Font "${role.name}" isn't on Google Fonts${role.key === "script" ? ": add one with ڕ ڵ ە ۆ ێ for Kurdish (production.md)" : ""}.`);
        continue;
      }
      const cap = role.key[0].toUpperCase() + role.key.slice(1);
      imports.add(`import { loadFont as load${cap} } from "@remotion/google-fonts/${g.id}";`);
      const subset = g.info?.subsets?.includes(role.subset) ? `, subsets: ["${role.subset}"]` : "";
      loads.push(`const { fontFamily: ${role.key}Family } = load${cap}("normal", { weights: [${pickWeights(g.info, role.weights).map((w) => `"${w}"`).join(", ")}]${subset} });`);
      family[role.key] = `\${${role.key}Family}`;
    }
  }
  const stack = (main, generic) => "`" + [family[main], family.script, generic].filter(Boolean).join(", ") + "`";
  const source = design ? "design.md" : brand ? (brand.name ?? "brand.json") : "the template";
  const lines = [
    `// The look for this video, from ${source}${LOCAL_FONTS ? ", with the font files in public/fonts so renders work offline" : ""}.`,
    "// design.md holds the numbers; keep the two in step.",
    ...imports,
    "",
    ...loads,
    "",
    family.script ? "// Latin letters from the Latin fonts, Arabic-script letters (Kurdish, Arabic) from the script font." : null,
    `export const headingFont = ${stack("heading", "sans-serif")};`,
    `export const monoFont = ${stack("mono", "monospace")};`,
    family.body ? `export const bodyFont = ${stack("body", "sans-serif")};` : null,
    "",
    `export const colors = ${JSON.stringify(colors, null, 2).replace(/"(\w+)":/g, "$1:")};`,
    Object.keys(extra).length ? `\n// The palette's other colours from design.md.\nexport const palette = ${JSON.stringify(extra, null, 2).replace(/"(\w+)":/g, "$1:")};` : null,
    "",
  ];
  writeFileSync(themePath, lines.filter((l) => l !== null).join("\n"));
  copied.push("theme.ts");
}

// 4. The scripts (and the Sorani voice tools).
mkdirSync(join(DIR, "scripts"), { recursive: true });
for (const name of readdirSync(join(SKILL, "scripts"))) {
  // Scripts, and free-assets.json: the voice and music scripts read it.
  if (!/\.(mjs|py)$/.test(name) && name !== "free-assets.json") continue;
  if (name === "setup-project.mjs") continue;
  const to = join(DIR, "scripts", name);
  if (existsSync(to)) {
    if (!UPDATE || readFileSync(to, "utf8") === readFileSync(join(SKILL, "scripts", name), "utf8")) continue;
    backup(join("scripts", name));
  }
  copyFileSync(join(SKILL, "scripts", name), to);
  copied.push(`scripts/${name}`);
}
if (SCRIPT === "sorani") {
  mkdirSync(join(DIR, "tts"), { recursive: true });
  for (const name of readdirSync(join(SKILL, "scripts", "sorani"))) {
    const to = join(DIR, "tts", name);
    if (!existsSync(to)) {
      copyFileSync(join(SKILL, "scripts", "sorani", name), to);
      copied.push(`tts/${name}`);
    }
  }
}

// 5. tsconfig, folders, .gitignore.
const tsPath = join(DIR, "tsconfig.json");
if (existsSync(tsPath)) {
  const ts = readJson(tsPath);
  ts.compilerOptions = { ...ts.compilerOptions, resolveJsonModule: true };
  if (!ts.compilerOptions.lib || ts.compilerOptions.lib.every((l) => /^es(5|2015|2016)$/i.test(l))) ts.compilerOptions.lib = ["es2022"];
  writeFileSync(tsPath, `${JSON.stringify(ts, null, 2)}\n`);
}
for (const folder of ["photos", "shots", "sfx", "bgm", "brand", "voice"]) mkdirSync(join(DIR, "public", folder), { recursive: true });
const gitignore = join(DIR, ".gitignore");
const ignoreText = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
const ignoreAdd = ["out/", ".video-xoshaka-backup/", "tts/.venv/", "tts/f5-repo/"].filter((l) => !ignoreText.split(/\r?\n/).includes(l));
if (ignoreAdd.length) writeFileSync(gitignore, `${ignoreText}${ignoreText && !ignoreText.endsWith("\n") ? "\n" : ""}${ignoreAdd.join("\n")}\n`);

// 6. The brand's logo.
if (brand?.logo) {
  const logo = resolve(dirname(BRAND_PATH), brand.logo);
  if (existsSync(logo)) {
    copyFileSync(logo, join(DIR, "public", "brand", `logo${extname(logo).toLowerCase()}`));
    copied.push(`public/brand/logo${extname(logo).toLowerCase()}`);
  } else notes.push(`brand.json's logo ${logo} isn't there.`);
}

// 7. Sound effects from remotion.media, or made in code where it's blocked.
const SFX = (flag("sfx", "whoosh,mouse-click,ding,record-scratch,vine-boom,windows-xp-error")).split(",").filter(Boolean);
const failed = [];
for (const name of SFX) {
  const to = join(DIR, "public", "sfx", `${name}.wav`);
  if (existsSync(to)) continue;
  try {
    const response = await fetch(`https://remotion.media/${name}.wav`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(String(response.status));
    writeFileSync(to, Buffer.from(await response.arrayBuffer()));
  } catch {
    failed.push(name);
  }
}
// Where remotion.media is blocked (the Claude app's cloud workspace), make the
// effects in code instead (make-sfx.mjs); windows-xp-error becomes "error".
if (failed.length) {
  const made = writeSfx(failed.map((name) => (name === "windows-xp-error" ? "error" : name)), join(DIR, "public", "sfx"));
  const missing = failed.filter((name) => !made.includes(name === "windows-xp-error" ? "error" : name));
  notes.push(`remotion.media couldn't be reached, so these sound effects were made in code (plainer than recorded ones): ${made.join(", ")}.${missing.length ? ` Missing: ${missing.join(", ")}; <Sfx> skips missing files.` : ""}`);
}

// 7b. The approved storyboard is the story: its rows replace the template's
// sample scenes, and every scene starts as a placeholder.
if (copied.includes("story/story.json") && existsSync(join(DIR, "STORYBOARD.md"))) {
  execFileSync(process.execPath, ["scripts/sync-story.mjs", "--fresh", "--quiet"], { cwd: DIR, stdio: "inherit" });
  if (copied.includes("story/scenes.tsx")) {
    writeFileSync(
      join(DIR, "src", "story", "scenes.tsx"),
      [
        'import type React from "react";',
        "",
        "// One entry per scene id in story.json (see the template's sample for the",
        "// shape). A scene without an entry plays as a placeholder with its storyboard",
        "// line and the real narration, so the video previews as an animatic now.",
        "export const SCENES: Record<string, React.FC> = {};",
        "",
      ].join("\n"),
    );
  }
}

// 8. Draft timings, so the Studio opens before a voice is chosen.
if (!existsSync(join(DIR, "src", "story", "voice.json"))) {
  execFileSync(process.execPath, ["scripts/make-voice.mjs", "--draft"], { cwd: DIR, stdio: "inherit" });
}

log(`\nProject ready: ${DIR}`);
log(`Format ${FORMAT} (${WIDTH}x${HEIGHT}), platform ${PLATFORM}, script ${SCRIPT}${chosenScriptFont ? ` (font: ${chosenScriptFont})` : ""}${brand ? `, brand ${brand.name ?? BRAND_PATH}` : ""}`);
if (copied.length) log(`Wrote: ${copied.join(", ")}`);
if (kept.length) log(`Kept as they were: ${kept.join(", ")}${UPDATE ? "" : " (--update replaces shared components, with a backup)"}`);
for (const n of notes) log(`Note: ${n}`);
const fromBoard = copied.includes("story/story.json") && existsSync(join(DIR, "STORYBOARD.md"));
log(
  fromBoard
    ? "\nNext: npx remotion studio (the storyboard plays as an animatic), pick the voice by ear, then fill in src/story/scenes.tsx scene by scene."
    : "\nNext: write src/story/story.json (or STORYBOARD.md, then node scripts/sync-story.mjs), node scripts/make-voice.mjs --draft, npx remotion studio, then fill in src/story/scenes.tsx.",
);
