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
  if (name !== "video-xoshaka") problems.push(`SKILL.md: name is "${name}", expected "video-xoshaka"`);
  if (!description) problems.push("SKILL.md: no description");
  else if (description.length > 1024) problems.push(`SKILL.md: the description is ${description.length} characters (the limit is 1024)`);
}

// Paths inside `code` that this skill must ship: scripts/... and
// assets/template/... anywhere in the docs, references/... in SKILL.md and
// README.md. (The reference files also name paths in other skills and in a
// HyperFrames project, so their references/ and other assets/ paths aren't
// checked.) Paths with placeholders (<id>, *) are skipped.
const docs = ["SKILL.md", "README.md", ...readdirSync("references").map((f) => `references/${f}`)];
for (const doc of docs) {
  const top = doc === "SKILL.md" || doc === "README.md";
  const pattern = top ? /(?:^|[\s(])((?:scripts|references|assets\/template)\/[\w./-]*)/g : /(?:^|[\s(])((?:scripts|assets\/template)\/[\w./-]*)/g;
  for (const [, span] of read(doc).matchAll(/`([^`\n]+)`/g)) {
    for (const [, path] of span.matchAll(pattern)) {
      const clean = path.replace(/[.,:;]+$/, "");
      if (!existsSync(clean)) problems.push(`${doc}: names ${clean}, which doesn't exist`);
    }
  }
}

if (problems.length) {
  for (const problem of problems) console.log(`::error::${problem}`);
  process.exit(1);
}
console.log(`SKILL.md and ${docs.length} docs checked: every named file exists.`);
