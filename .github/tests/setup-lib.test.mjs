// Tests for the offline steps of setup-project.mjs. Run from the repo root:
//   node --test .github/tests/*.test.mjs

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import * as setup from "../../scripts/setup-lib.mjs";

const { SORANI_FONTS, lacksSorani, moveScaffoldIn, scaffoldClash, subsetsFor } = setup;

const scratch = (t) => {
  const dir = mkdtempSync(join(tmpdir(), "mshmsh-video-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const put = (root, path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};
const read = (root, path) => readFileSync(join(root, path), "utf8");

// --- A folder that already has public/ -----------------------------------------------

test("a plan folder with the person's photos in public/ is not a clash", () => {
  // SKILL.md, step 1: "Create public/photos/ and tell them the file names".
  assert.deepEqual(scaffoldClash(["brief.md", "design.md", "STORYBOARD.md", "public"]), []);
});

test("another project's files are still a clash", () => {
  assert.deepEqual(scaffoldClash(["brief.md", "src", "public", "tsconfig.json"]), ["src", "tsconfig.json"]);
});

test("the blank project moves in around the person's files and replaces none of them", (t) => {
  const root = scratch(t);
  const project = join(root, "video");
  const blank = join(root, "video-scaffold");
  put(project, "brief.md", "the plan");
  put(project, "public/photos/me.jpg", "the person's photo");
  put(blank, "package.json", "{}");
  put(blank, "src/index.ts", "// entry");
  put(blank, "public/photos/me.jpg", "a sample from the blank project");
  put(blank, "public/photos/sample.png", "sample");
  put(blank, "public/favicon.ico", "icon");

  const stayed = moveScaffoldIn(blank, project);

  assert.equal(read(project, "public/photos/me.jpg"), "the person's photo");
  assert.equal(read(project, "brief.md"), "the plan");
  assert.equal(read(project, "package.json"), "{}");
  assert.equal(read(project, "src/index.ts"), "// entry");
  assert.equal(read(project, "public/photos/sample.png"), "sample");
  assert.equal(read(project, "public/favicon.ico"), "icon");
  assert.deepEqual(stayed, ["public/photos/me.jpg"]);
});

test("a folder with nothing in the way gets the whole blank project", (t) => {
  const root = scratch(t);
  const project = join(root, "video");
  const blank = join(root, "video-scaffold");
  put(project, "design.md", "the look");
  put(blank, "package.json", "{}");
  put(blank, "public/.gitkeep", "");

  assert.deepEqual(moveScaffoldIn(blank, project), []);
  assert.ok(existsSync(join(project, "public", ".gitkeep")));
  assert.equal(read(project, "design.md"), "the look");
});

// --- Which letters each font loads ----------------------------------------------------

// The subsets @remotion/google-fonts 4.0 reports for these fonts.
const FONT = {
  plexArabic: { id: "IBMPlexSansArabic", info: { subsets: ["arabic", "cyrillic-ext", "latin", "latin-ext"] } },
  naskh: { id: "NotoNaskhArabic", info: { subsets: ["arabic", "latin", "latin-ext", "math", "symbols"] } },
  marcellus: { id: "Marcellus", info: { subsets: ["latin", "latin-ext"] } },
  cairo: { id: "Cairo", info: { subsets: ["arabic", "latin", "latin-ext"] } },
};
const body = { key: "body", subset: "latin" };
const heading = { key: "heading", subset: "latin" };
const script = { key: "script", subset: "arabic" };

test("a Latin font loads Latin only, whatever the video's script", () => {
  assert.deepEqual(subsetsFor(heading, FONT.marcellus, "latin"), ["latin"]);
  assert.deepEqual(subsetsFor(heading, FONT.marcellus, "sorani"), ["latin"]);
});

test("a body font with Arabic letters loads them in a Kurdish video", () => {
  // design.md: "body IBM Plex Sans Arabic 500; script support: Kurdish Sorani (Noto Naskh Arabic)".
  // Loaded with Latin only, every Kurdish word in bodyFont fell back to Noto Naskh Arabic.
  assert.deepEqual(subsetsFor(body, FONT.plexArabic, "sorani"), ["latin", "arabic"]);
  assert.deepEqual(subsetsFor(heading, FONT.plexArabic, "arabic"), ["latin", "arabic"]);
});

test("the same font stays Latin only in a video with no Arabic script", () => {
  assert.deepEqual(subsetsFor(body, FONT.plexArabic, "latin"), ["latin"]);
});

test("a font without every Sorani letter keeps Kurdish in the script font", () => {
  // Cairo has no ڕ ڵ ێ: loading its Arabic letters would mix two fonts inside a word.
  assert.deepEqual(subsetsFor(body, FONT.cairo, "sorani"), ["latin"]);
  assert.equal(lacksSorani(FONT.cairo), true);
  // In an Arabic video Cairo has every letter it needs.
  assert.deepEqual(subsetsFor(body, FONT.cairo, "arabic"), ["latin", "arabic"]);
});

test("fonts that are fine for Kurdish are not flagged", () => {
  assert.equal(lacksSorani(FONT.plexArabic), false);
  assert.equal(lacksSorani(FONT.naskh), false);
  assert.equal(lacksSorani(FONT.marcellus), false);
});

test("the script font loads its Arabic letters, as before", () => {
  assert.deepEqual(subsetsFor(script, FONT.naskh, "sorani"), ["arabic"]);
  assert.deepEqual(subsetsFor(script, FONT.marcellus, "sorani"), []);
});

test("the checked Sorani fonts are the ones production.md lists", () => {
  const doc = readFileSync(new URL("../../references/production.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  const listed = doc.match(/these Google fonts have every Sorani letter: (.*?)\. Cairo/)?.[1];
  assert.ok(listed, "production.md no longer has the sentence that lists the fonts");
  const names = listed.replace(/\([^)]*\)/g, "").replace(/ and /g, ", ").split(",").map((name) => name.trim()).filter(Boolean);
  assert.deepEqual([...SORANI_FONTS].sort(), names.sort());
});
