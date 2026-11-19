// Which browser Remotion renders with, for render.mjs and stills.mjs. Remotion
// downloads its own headless Chrome the first time. Where that download is
// blocked (the Claude app's cloud workspace, some office networks), a Chrome or
// Edge already on the machine does the job instead, so the render still runs.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const INSTALLED =
  process.platform === "win32"
    ? [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

// The browser to pass to Remotion, or null for Remotion's own.
export const pickBrowser = (explicit) => {
  if (explicit) return explicit;
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  const win = process.platform === "win32";
  // Downloads Remotion's browser if it isn't there yet; quick when it is.
  const ensure = spawnSync("npx", ["remotion", "browser", "ensure"], { encoding: "utf8", shell: win, timeout: 300000 });
  if (ensure.status === 0) return null;
  const found = INSTALLED.find((path) => existsSync(path));
  if (!found) {
    const why = `${ensure.stdout ?? ""}${ensure.stderr ?? ""}`.trim().slice(-800);
    throw new Error(`Remotion couldn't download its browser and no Chrome was found. Install Chrome, or pass --browser-executable <path>.\n${why}`);
  }
  console.log(`Remotion couldn't download its browser here, so rendering with ${found}.`);
  return found;
};
