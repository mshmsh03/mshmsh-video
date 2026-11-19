// Cuts the subject out of a photo (a person, a product, a pet, a car) onto a
// transparent background, offline: for text behind a person, a product
// floating over a brand colour, or a sticker that pops in. Uses rembg (MIT)
// with IS-Net (Apache-2.0, 180 MB once, about 2 GB of memory), all free for
// client work. rembg's own default model, BRIA RMBG, is non-commercial, so this
// script always names a free one.
//
//   node scripts/cutout.mjs public/photos/me.jpg            public/photos/me-cutout.png
//   node scripts/cutout.mjs public/photos                   every photo in the folder
//   --model u2net | birefnet-general-lite | birefnet-portrait | isnet-anime
//       u2net is lighter (1.2 GB of memory); the BiRefNet ones have finer hair
//       edges but need 8 GB or more (one ran out on an 8 GB machine)
//   --crop    trim the empty edges, for a sticker
//
// Needs Python with rembg: python -m pip install "rembg[cpu,cli]"
// Models download from rembg's GitHub releases into ~/.cache/video-xoshaka/models/rembg.
// For a cut-out of a moving person in a clip, use `hf remove-background` (hyperframes.md).

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { MODELS } from "./voice-engines.mjs";

// Free for any use: IS-Net and U2-Net Apache-2.0, BiRefNet MIT, the anime
// model Apache-2.0. Never bria-rmbg (CC BY-NC) or the cloud ones.
const FREE_MODELS = {
  "isnet-general-use": "IS-Net, Apache-2.0",
  u2net: "U2-Net, Apache-2.0",
  "birefnet-general-lite": "BiRefNet lite, MIT",
  "birefnet-general": "BiRefNet, MIT",
  "birefnet-portrait": "BiRefNet portrait, MIT",
  "isnet-anime": "IS-Net anime, Apache-2.0",
};
const args = process.argv.slice(2);
const i = args.indexOf("--model");
const model = i >= 0 ? args[i + 1] : "isnet-general-use";
if (!FREE_MODELS[model]) throw new Error(`--model is one of ${Object.keys(FREE_MODELS).join(", ")} (all free for client work)`);
const crop = args.includes("--crop");
const input = args.find((a, k) => !a.startsWith("--") && (i < 0 || k !== i + 1));
if (!input || !existsSync(input)) {
  console.log("Usage: node scripts/cutout.mjs <photo or folder> [--model isnet-general-use] [--crop]");
  process.exit(1);
}
const PHOTO = /\.(jpe?g|png|webp|bmp)$/i;
const files = statSync(input).isDirectory()
  ? readdirSync(input).filter((f) => PHOTO.test(f) && !/-cutout\.png$/i.test(f)).map((f) => join(input, f))
  : [input];
if (files.length === 0) throw new Error(`No photos in ${input}`);

const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
try {
  execFileSync(PYTHON, ["-c", "import rembg"], { stdio: "ignore" });
} catch {
  console.log(`rembg isn't installed for ${PYTHON}. Install it, then run this again:\n  ${PYTHON} -m pip install "rembg[cpu,cli]"`);
  process.exit(1);
}

const jobs = files.map((file) => ({ in: file, out: join(dirname(file), `${basename(file, extname(file))}-cutout.png`) }));
const code = `
import json, sys
from rembg import new_session, remove
from PIL import Image
jobs, model, crop = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3] == "1"
session = new_session(model)
for job in jobs:
    out = remove(Image.open(job["in"]).convert("RGB"), session=session)
    if crop:
        box = out.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if box:
            out = out.crop(box)
    out.save(job["out"])
    alpha = out.getchannel("A").histogram()
    print(json.dumps({"out": job["out"], "size": out.size, "clear": round(100 * alpha[0] / sum(alpha))}), flush=True)
`;
const result = execFileSync(PYTHON, ["-c", code, JSON.stringify(jobs), model, crop ? "1" : "0"], {
  env: { ...process.env, U2NET_HOME: join(MODELS, "rembg") },
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 1 << 24,
});
for (const line of result.toString().trim().split("\n")) {
  const done = JSON.parse(line);
  const warn = done.clear > 97 ? " (almost nothing kept: try --model u2net, or a photo where the subject stands out)" : done.clear < 5 ? " (nearly nothing removed)" : "";
  console.log(`${done.out}: ${done.size.join("x")}, ${done.clear}% transparent${warn}`);
}
console.log(`${FREE_MODELS[model]}: free for client work. Look at each cut-out on a coloured background before using it.`);
