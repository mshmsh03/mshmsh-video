// Builds the "free-assets" release from scripts/free-assets.json, for the
// free-assets workflow. Run from the repo root on GitHub Actions (it needs the
// gh CLI signed in through GH_TOKEN).
//
//   node .github/free-assets.mjs download <dir>   every file from its original source
//   node .github/free-assets.mjs publish <dir>    upload them (replacing old copies) and write the notes
//
// A file that fails to download is listed in <dir>/failed.txt; the rest are
// still published, and the workflow fails afterwards so the failure shows. An
// entry with "repack" is unpacked, cleaned and packed again before publishing.
// Entries with "mirror": false are already on GitHub (sherpa-onnx's releases)
// and are left there.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [command, dir = "dist"] = process.argv.slice(2);
const free = JSON.parse(readFileSync("scripts/free-assets.json", "utf8"));
const mirrored = free.files.filter((f) => f.mirror !== false);
const TAG = free.release.split("/").pop();
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

if (command === "download") {
  mkdirSync(dir, { recursive: true });
  const failed = [];
  for (const file of mirrored) {
    const to = join(dir, file.name);
    try {
      execFileSync("curl", ["-fsSL", "--retry", "3", "-o", to, file.from], { stdio: ["ignore", "inherit", "inherit"] });
      if (statSync(to).size < 200) throw new Error(`only ${statSync(to).size} bytes`);
      // Some archives carry extras that aren't clearly free (Pocket's demo
      // clips): take them out and say so in a NOTICE.txt.
      if (file.repack) {
        const work = join(dir, ".repack");
        rmSync(work, { recursive: true, force: true });
        mkdirSync(work, { recursive: true });
        execFileSync("tar", ["-xjf", resolve(to), "-C", work]);
        for (const path of file.repack.remove) rmSync(join(work, path), { recursive: true, force: true });
        const top = file.repack.remove[0].split("/")[0];
        writeFileSync(join(work, top, "NOTICE.txt"), `${file.repack.notice}\n`);
        rmSync(to);
        execFileSync("tar", ["-cjf", resolve(to), "-C", work, top]);
        rmSync(work, { recursive: true, force: true });
        console.log(`  without ${file.repack.remove.join(", ")}`);
      }
      console.log(`${file.name}: ${mb(statSync(to).size)}`);
    } catch (error) {
      console.log(`::error::${file.name} didn't download from ${file.from}: ${error.message.split("\n")[0]}`);
      failed.push(file.name);
    }
  }
  writeFileSync(join(dir, "failed.txt"), failed.join("\n"));
} else if (command === "publish") {
  const files = mirrored.map((f) => join(dir, f.name)).filter((path) => existsSync(path));
  const rows = mirrored
    .filter((f) => existsSync(join(dir, f.name)))
    .map((f) => `| ${f.name} | ${f.kind === "music" ? `${f.title}: ${f.mood.join(", ")}` : f.use} | ${f.licence} | ${f.credit} |`);
  const notes = [
    "Free models, voices, music and sound effects for the video-xoshaka skill. The skill downloads what it needs from here by itself (GitHub stays reachable where other sites are blocked); nothing here is needed by hand.",
    "",
    "Each file keeps its own licence below. The non-commercial ones (marked) are for personal videos only. Samples of every voice and the whole music library, made from these files by the same workflow, are attached as samples-*.mp3 and music-preview.mp3 when that test has run.",
    "",
    "| File | What it is | Licence | Credit |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "Supertonic 3's weights are under the OpenRAIL-M licence: using them means accepting its use restrictions (among them no impersonating a person without consent and disclosing machine-generated content). Built from scripts/free-assets.json.",
  ].join("\n");
  writeFileSync(join(dir, "notes.md"), notes);
  const gh = (args) => execFileSync("gh", args, { stdio: "inherit" });
  let exists = true;
  try {
    execFileSync("gh", ["release", "view", TAG], { stdio: "ignore" });
  } catch {
    exists = false;
  }
  if (!exists) gh(["release", "create", TAG, "--title", "Free assets (models, voices, music)", "--notes-file", join(dir, "notes.md")]);
  // A few files at a time, so one slow upload doesn't hold everything back.
  for (let i = 0; i < files.length; i += 4) gh(["release", "upload", TAG, ...files.slice(i, i + 4), "--clobber"]);
  gh(["release", "edit", TAG, "--notes-file", join(dir, "notes.md")]);
  const size = files.reduce((n, path) => n + statSync(path).size, 0);
  console.log(`Published ${files.length} files (${mb(size)}) on the ${TAG} release.`);
} else {
  console.log(readdirSync(".").join(" "));
  throw new Error("Usage: node .github/free-assets.mjs download|publish <dir>");
}
