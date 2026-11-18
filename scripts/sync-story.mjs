// Writes src/story/story.json's scenes from STORYBOARD.md, so the approved
// storyboard is the one place the words live: each row's id, its line (the
// captions' `text`) and its "On screen" note (the placeholder's `board`).
// Settings already in story.json survive: the voice and speed, and each
// scene's `say`, `lead`, `hold`, `enter` and `silence`, matched by id. Run it
// after every storyboard change, then make-voice. From the project root:
//
//   node scripts/sync-story.mjs [--storyboard STORYBOARD.md] [--story src/story/story.json] [--fresh]
//
// --fresh drops the scenes already in story.json (setup-project uses it to
// replace the template's sample story). An optional "Enter" or "Transition"
// column sets `enter` (fade, slide, wipe, cut).
//
//   node scripts/sync-story.mjs --seconds
//
// goes the other way after make-voice: fills the storyboard's "Seconds" column
// with each scene's real length from voice.json, and changes nothing else.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BOARD = arg("storyboard", "STORYBOARD.md");
const STORY = arg("story", "src/story/story.json");
const FRESH = process.argv.includes("--fresh");

const SECONDS = process.argv.includes("--seconds");
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
const lines = readFileSync(BOARD, "utf8").split(/\r?\n/);
const headerAt = lines.findIndex((l) => /^\s*\|/.test(l) && /\bid\b/i.test(l) && /\bline\b|\btext\b/i.test(l));
if (headerAt < 0) throw new Error(`${BOARD} has no table with an "id" and a "Line" column`);
const header = cells(lines[headerAt]).map((h) => h.toLowerCase());
const col = (...names) => header.findIndex((h) => names.some((n) => h.startsWith(n)));
const ID = col("id");
const LINE = col("line", "text");
const ONSCREEN = col("on screen", "visual", "picture");
const ENTER = col("enter", "transition");

if (SECONDS) {
  const voice = JSON.parse(readFileSync(arg("voice", "src/story/voice.json"), "utf8"));
  const SEC = col("seconds");
  if (SEC < 0) throw new Error(`${BOARD} has no "Seconds" column`);
  const length = Object.fromEntries(voice.scenes.map((sc) => [sc.id, (sc.durationInFrames / voice.fps).toFixed(1)]));
  let filled = 0;
  for (let i = headerAt + 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) {
    const c = cells(lines[i]);
    const id = c[ID]?.replace(/[`"]/g, "");
    if (!(id in length)) continue;
    while (c.length <= SEC) c.push("");
    c[SEC] = length[id];
    lines[i] = `| ${c.join(" | ")} |`;
    filled++;
  }
  writeFileSync(BOARD, lines.join("\n"));
  console.log(`Filled ${filled} scene lengths in ${BOARD}${voice.draft ? " (draft timings: run again after the real voice)" : ""}.`);
  process.exit(0);
}

const unquote = (s) => s.replace(/^["“”'`]+|["“”'`]+$/g, "").replace(/\\\|/g, "|").trim();
const rows = [];
for (const line of lines.slice(headerAt + 1)) {
  if (!/^\s*\|/.test(line)) break;
  if (/^\s*\|[\s:|-]+\|?\s*$/.test(line)) continue; // the |---|---| row
  const c = cells(line);
  const id = unquote(c[ID] ?? "");
  const text = unquote(c[LINE] ?? "");
  if (!id || !text) continue;
  rows.push({ id, text, board: ONSCREEN >= 0 ? unquote(c[ONSCREEN] ?? "") : undefined, enter: ENTER >= 0 ? unquote(c[ENTER] ?? "").toLowerCase() : undefined });
}
if (!rows.length) throw new Error(`No rows with an id and a line in ${BOARD}`);
const dupes = rows.map((r) => r.id).filter((id, i, all) => all.indexOf(id) !== i);
if (dupes.length) throw new Error(`Scene ids must be unique: ${[...new Set(dupes)].join(", ")}`);

const story = existsSync(STORY)
  ? JSON.parse(readFileSync(STORY, "utf8"))
  : { voice: "af_heart", speed: 1.0, fps: 30, transitionFrames: 15, leadIn: 0.35, tail: 0.45, scenes: [] };
const before = FRESH ? [] : story.scenes ?? [];
const KEEP = ["say", "lead", "hold", "enter", "silence"];
story.scenes = rows.map((row, i) => {
  const old = before.find((s) => s.id === row.id) ?? {};
  const scene = { id: row.id, text: row.text };
  for (const key of KEEP) if (old[key] !== undefined) scene[key] = old[key];
  if (scene.hold === undefined) scene.hold = i === rows.length - 1 ? 2.2 : 0.6;
  if (row.enter && ["fade", "slide", "wipe", "cut"].includes(row.enter)) scene.enter = row.enter;
  if (row.board) scene.board = row.board;
  return scene;
});
const dropped = before.filter((s) => !rows.some((r) => r.id === s.id)).map((s) => s.id);
writeFileSync(STORY, `${JSON.stringify(story, null, 2)}\n`);

const words = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
let total = 0;
for (const s of story.scenes) {
  const n = words(s.say ?? s.text);
  total += n;
  console.log(`${s.id}: ${n} words${n > 26 ? "  (over 26: split it)" : n > 19 ? "  (over 19)" : ""}`);
}
console.log(`${story.scenes.length} scenes, ${total} words, about ${Math.round(total / 2.2)} s of voice${dropped.length ? `; removed: ${dropped.join(", ")}` : ""}`);
if (!process.argv.includes("--quiet")) console.log(`Wrote ${STORY}. Next: node scripts/make-voice.mjs${existsSync("src/story/voice.json") && JSON.parse(readFileSync("src/story/voice.json", "utf8")).draft ? " --draft" : ""}`);
