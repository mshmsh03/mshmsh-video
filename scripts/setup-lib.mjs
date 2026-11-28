// The steps of setup-project.mjs that need no network and no project, kept
// apart so .github/tests/ can run them. Not copied into a video project.

import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

// What create-video writes into a new project.
export const SCAFFOLD = new Set(["package.json", "package-lock.json", "node_modules", "src", "public", "tsconfig.json", "remotion.config.ts", ".gitignore", ".prettierrc", "eslint.config.mjs", "README.md"]);

// The names already in the folder that stop the scaffold from moving in.
export const scaffoldClash = (names) => names.filter((name) => SCAFFOLD.has(name));

// Moves the scaffold's files and folders from the temporary folder into the project.
export const moveScaffoldIn = (from, to) => {
  for (const name of readdirSync(from)) renameSync(join(from, name), join(to, name));
};

// The subsets of a Google font that a theme role loads.
export const subsetsFor = (role, font) => (font.info?.subsets?.includes(role.subset) ? [role.subset] : []);
