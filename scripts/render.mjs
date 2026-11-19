// Renders to a new versioned file every time (out/<name>-v1.mp4, -v2 ...), so
// a file open in a player is never overwritten (on Windows that fails with
// EPERM), then runs review-check.mjs on the result. Run from the project root:
//
//   node scripts/render.mjs [CompositionId] [--draft] [--name reel] [--no-check]
//     [-- <extra remotion render flags>]
//
// --draft renders at half size and lower quality, about 3 times faster: enough
// to watch on a phone and send for comments while the person is still
// steering. Final renders are full size. --browser-executable <path> (or
// REMOTION_BROWSER_EXECUTABLE) uses a Chrome already on the machine; so does a
// machine where Remotion can't download its own (find-browser.mjs).

import { execFileSync, execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { pickBrowser } from "./find-browser.mjs";

const npx = (args, options) =>
  process.platform === "win32"
    ? execSync(`npx ${args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ")}`, options)
    : execFileSync("npx", args, options);

const all = process.argv.slice(2);
const dash = all.indexOf("--");
const extra = dash >= 0 ? all.slice(dash + 1) : [];
const argv = dash >= 0 ? all.slice(0, dash) : all;
const takeFlag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  argv.splice(i, 2);
  return value;
};
const name = takeFlag("name");
const browserExecutable = pickBrowser(takeFlag("browser-executable"));
const draft = argv.includes("--draft");
const check = !argv.includes("--no-check");
const composition = argv.find((a) => !a.startsWith("--")) ?? "StoryVideo";
const base = `${name ?? composition}${draft ? "-draft" : ""}`;

mkdirSync("out", { recursive: true });
const taken = readdirSync("out")
  .map((f) => f.match(new RegExp(`^${base}-v(\\d+)\\.mp4$`))?.[1])
  .filter(Boolean)
  .map(Number);
const output = `out/${base}-v${Math.max(0, ...taken) + 1}.mp4`;

const args = ["remotion", "render", composition, output];
if (draft) args.push("--scale=0.5", "--crf=28");
if (browserExecutable) args.push(`--browser-executable=${browserExecutable}`);
args.push(...extra);
const started = Date.now();
npx(args, { stdio: "inherit" });
if (!existsSync(output)) {
  // Windows: the rename at the end can fail while a player holds a file open.
  const pending = readdirSync("out").find((f) => f.startsWith(`${base}-v`) && f.includes("remotion-in-progress"));
  throw new Error(`No ${output}.${pending ? ` The render is in out/${pending}; rename it.` : ""}`);
}

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", output], { encoding: "utf8" });
const seconds = Number(probe.stdout);
const mb = statSync(output).size / 1024 / 1024;
console.log(`\n${output}  ${Number.isFinite(seconds) && seconds > 0 ? `${seconds.toFixed(2)} s, ` : ""}${mb.toFixed(1)} MB, rendered in ${((Date.now() - started) / 1000).toFixed(0)} s${draft ? " (draft: half size)" : ""}`);

if (check) {
  console.log("");
  spawnSync(process.execPath, ["scripts/review-check.mjs", output], { stdio: "inherit" });
}
