// The steps of setup-project.mjs that need no network and no project, kept
// apart so .github/tests/ can run them. Not copied into a video project.

import { existsSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

// What create-video writes into a new project. A folder that has one of these
// but no package.json holds something else, so setup refuses it. public/ is
// not on the list: SKILL.md has the person's photos put in public/photos
// during the interview, before the project exists.
export const SCAFFOLD = new Set(["package.json", "package-lock.json", "node_modules", "src", "tsconfig.json", "remotion.config.ts", ".gitignore", ".prettierrc", "eslint.config.mjs", "README.md"]);

// The names already in the folder that stop the blank project from moving in.
export const scaffoldClash = (names) => names.filter((name) => SCAFFOLD.has(name));

// Moves the blank project from its temporary folder into the project folder,
// around whatever is already there. A folder on both sides is merged; a file
// on both sides stays the person's. Returns the files that stayed theirs.
export const moveScaffoldIn = (from, to) => {
  const stayed = [];
  for (const name of readdirSync(from)) {
    const source = join(from, name);
    const target = join(to, name);
    if (!existsSync(target)) renameSync(source, target);
    else if (statSync(source).isDirectory() && statSync(target).isDirectory()) stayed.push(...moveScaffoldIn(source, target).map((path) => `${name}/${path}`));
    else stayed.push(name);
  }
  return stayed;
};

// Google fonts checked to have every Sorani letter (production.md, "Arabic and
// Kurdish captions"; a test keeps the two lists the same).
export const SORANI_FONTS = [
  "Noto Kufi Arabic",
  "Noto Sans Arabic",
  "Noto Naskh Arabic",
  "IBM Plex Sans Arabic",
  "Vazirmatn",
  "Mada",
  "Beiruti",
  "Fustat",
  "Estedad",
  "Zain",
  "Kufam",
  "Reem Kufi",
  "Amiri",
  "Scheherazade New",
  "Lateef",
  "Harmattan",
  "Parastoo",
  "Playpen Sans Arabic",
  "Aref Ruqaa",
  "Jomhuria",
  "Katibeh",
];
const SORANI_IDS = new Set(SORANI_FONTS.map((name) => name.replace(/[^A-Za-z0-9]/g, "")));

// True for a font with Arabic letters that isn't on the checked Sorani list:
// some Kurdish letters would come from another font in the middle of a word.
// `font` is { id, info } as setup-project's googleFont() returns it.
export const lacksSorani = (font) => Boolean(font.info?.subsets?.includes("arabic")) && !SORANI_IDS.has(font.id);

// The subsets of a Google font that a theme role loads. `script` is the
// video's: "latin", "arabic" or "sorani". The heading, body and mono roles
// load Latin; when the font named for one of them has Arabic letters too
// (design.md: "body IBM Plex Sans Arabic") and the video is in Arabic script,
// it loads those as well, or its Kurdish and Arabic words would quietly come
// from the script font instead. A font without every Sorani letter stays
// Latin in a Kurdish video, so a word is never set in two fonts.
export const subsetsFor = (role, font, script = "latin") => {
  const has = (subset) => Boolean(font.info?.subsets?.includes(subset));
  const subsets = has(role.subset) ? [role.subset] : [];
  if (role.subset === "latin" && script !== "latin" && has("arabic") && !(script === "sorani" && lacksSorani(font))) subsets.push("arabic");
  return subsets;
};
