// Checks the skill before it reaches anyone: SKILL.md's front matter, and that
// every script, reference and asset path the docs name in `code` exists.
// Run from the repo root: node .github/check-skill.mjs

import { existsSync, readdirSync, readFileSync } from "node:fs";

const problems = [];
const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const skill = read("SKILL.md");
const front = skill.match(/^---\n([\s\S]*?)\n---\n/);
if (!front) problems.push("SKILL.md: no front matter");
else {
  const name = front[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = front[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (name !== "mshmsh-video") problems.push(`SKILL.md: name is "${name}", expected "mshmsh-video"`);
  if (!description) problems.push("SKILL.md: no description");
  else if (description.length > 1024) problems.push(`SKILL.md: the description is ${description.length} characters (the limit is 1024)`);
}

// Paths inside `code` that this skill must ship: scripts/... and
// assets/template/... anywhere in the docs, references/... in SKILL.md and
// README.md. (The reference files also name paths in other skills and in a
// HyperFrames project, so their references/ and other assets/ paths aren't
// checked.) Paths with placeholders (<id>, *) are skipped.
// Since 2026-11-27 the bundled HeyGen guides (hyperframes/...) are checked too,
// and the Remotion reference files name their siblings as remotion/<file>.md
// (relative to references/).
const mdIn = (dir) => readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => `${dir}/${f}`);
const docs = ["SKILL.md", "README.md", ...mdIn("references"), ...mdIn("references/remotion")];
for (const doc of docs) {
  const top = doc === "SKILL.md" || doc === "README.md";
  const pattern = top
    ? /(?:^|[\s(])((?:scripts|references|assets\/template|hyperframes)\/[\w./-]*)/g
    : /(?:^|[\s(])((?:scripts|assets\/template|hyperframes|remotion)\/[\w./-]*)/g;
  for (const [, span] of read(doc).matchAll(/`([^`\n]+)`/g)) {
    for (const [, path] of span.matchAll(pattern)) {
      const clean = path.replace(/[.,:;]+$/, "");
      if (span.includes(`${path}<`) || span.includes(`${path}*`)) continue; // a placeholder
      const onDisk = clean.startsWith("remotion/") ? `references/${clean}` : clean;
      if (!existsSync(onDisk)) problems.push(`${doc}: names ${clean}, which doesn't exist`);
    }
  }
}
// Each bundled guide keeps GUIDE.md, never SKILL.md: a SKILL.md would install as a separate skill.
for (const guide of readdirSync("hyperframes", { withFileTypes: true }).filter((d) => d.isDirectory())) {
  if (!existsSync(`hyperframes/${guide.name}/GUIDE.md`)) problems.push(`hyperframes/${guide.name}: no GUIDE.md`);
  if (existsSync(`hyperframes/${guide.name}/SKILL.md`)) problems.push(`hyperframes/${guide.name}: has a SKILL.md`);
}

if (problems.length) {
  for (const problem of problems) console.log(`::error::${problem}`);
  process.exit(1);
}
console.log(`SKILL.md and ${docs.length} docs checked: every named file exists.`);
