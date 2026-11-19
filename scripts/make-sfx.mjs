// Sound effects made in code: no download, no licence to check, the same file
// every time. setup-project.mjs uses them when remotion.media can't be reached
// (the Claude app's cloud workspace blocks it); they're plainer than recorded
// effects, so swap in real ones when you can.
//
//   node scripts/make-sfx.mjs [names] [--out public/sfx]
//
// Names: whoosh, mouse-click, ding, pop, tick, riser, paper, chime, error,
// boom (also written as vine-boom), scratch (also record-scratch). No names
// writes them all.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeWav } from "./voice-engines.mjs";

const RATE = 44100;

// A repeatable noise source, so every run writes the same files.
const noise = (seed) => {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
};

// A resonant band-pass (Chamberlin state-variable filter) whose centre can move.
const bandPass = () => {
  let low = 0;
  let band = 0;
  return (input, hz, q = 0.5) => {
    const f = 2 * Math.sin((Math.PI * Math.min(hz, RATE / 7)) / RATE);
    low += f * band;
    const high = input - low - q * band;
    band += f * high;
    return band;
  };
};

const make = (seconds, fn) => {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / RATE, i / out.length);
  // Peak at -3 dBFS.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  return peak ? out.map((v) => (v / peak) * 0.7) : out;
};

// A struck bell: a few inharmonic partials, each fading at its own speed.
const bell = (t, hz) =>
  [
    [1, 1, 2.2],
    [2.0, 0.5, 3.5],
    [2.76, 0.35, 5],
    [5.4, 0.15, 9],
  ].reduce((sum, [ratio, level, decay]) => sum + level * Math.sin(2 * Math.PI * hz * ratio * t) * Math.exp(-decay * t), 0) *
  Math.min(1, t * 2000);

const SOUNDS = {
  whoosh: () => {
    const rand = noise(7);
    const filter = bandPass();
    return make(0.65, (t, p) => filter(rand(), 300 + 2600 * Math.sin(Math.PI * p) ** 2, 0.7) * Math.sin(Math.PI * p) ** 1.5);
  },
  "mouse-click": () => {
    const rand = noise(11);
    return make(0.06, (t) => rand() * Math.exp(-t * 900) * 0.6 + Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 300) + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 120) * 0.5);
  },
  ding: () => make(1.6, (t) => bell(t, 1318.5)),
  chime: () => make(1.3, (t) => bell(t, 1046.5) + (t > 0.14 ? bell(t - 0.14, 1568) : 0)),
  pop: () => {
    let phase = 0;
    return make(0.14, (t) => {
      phase += (2 * Math.PI * (300 + 700 * Math.exp(-t * 40))) / RATE;
      return Math.sin(phase) * Math.exp(-t * 28) * Math.min(1, t * 3000);
    });
  },
  tick: () => make(0.035, (t) => Math.sin(2 * Math.PI * 4200 * t) * Math.exp(-t * 600)),
  riser: () => {
    const rand = noise(3);
    const filter = bandPass();
    let phase = 0;
    return make(1.5, (t, p) => {
      phase += (2 * Math.PI * (180 + 1100 * p * p)) / RATE;
      return (filter(rand(), 400 + 5000 * p * p, 0.8) * 0.8 + Math.sin(phase) * 0.35) * p ** 2.2 * Math.min(1, (1 - p) * 40);
    });
  },
  paper: () => {
    const rand = noise(5);
    const filter = bandPass();
    return make(0.45, (t, p) => {
      const flutter = 0.55 + 0.45 * Math.sin(2 * Math.PI * 23 * t + Math.sin(2 * Math.PI * 7 * t) * 2);
      return filter(rand(), 2500 + 1500 * Math.sin(Math.PI * p), 1.2) * flutter * Math.sin(Math.PI * p);
    });
  },
  error: () =>
    make(0.55, (t) => {
      const on = t < 0.22 || (t > 0.3 && t < 0.52);
      const square = Math.sign(Math.sin(2 * Math.PI * 220 * t)) + Math.sign(Math.sin(2 * Math.PI * 233 * t));
      return on ? square * 0.4 * Math.exp(-((t % 0.3) * 3)) : 0;
    }),
  boom: () => {
    const rand = noise(13);
    let phase = 0;
    return make(1.4, (t) => {
      phase += (2 * Math.PI * (45 + 40 * Math.exp(-t * 12))) / RATE;
      return Math.tanh(Math.sin(phase) * 2.5 * Math.exp(-t * 2.6)) + rand() * Math.exp(-t * 60) * 0.4;
    });
  },
  scratch: () => {
    const rand = noise(17);
    const filter = bandPass();
    return make(0.55, (t, p) => {
      const sweep = (t * 7) % 1;
      return filter(rand(), 500 + 2400 * sweep, 0.35) * (0.4 + 0.6 * Math.abs(Math.sin(Math.PI * 7 * t))) * Math.min(1, (1 - p) * 8);
    });
  },
};
// The names setup-project asks remotion.media for.
const ALIASES = { "vine-boom": "boom", "record-scratch": "scratch" };

export const SFX_NAMES = [...Object.keys(SOUNDS), ...Object.keys(ALIASES)];

// Writes the named effects into dir; returns the names it knew.
export const writeSfx = (names, dir) => {
  mkdirSync(dir, { recursive: true });
  const written = [];
  for (const name of names) {
    const sound = SOUNDS[name] ?? SOUNDS[ALIASES[name]];
    if (!sound) continue;
    writeWav(join(dir, `${name}.wav`), sound(), RATE);
    written.push(name);
  }
  return written;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--out");
  const out = i >= 0 ? args[i + 1] : "public/sfx";
  const names = (args.find((a, j) => !a.startsWith("--") && args[j - 1] !== "--out") ?? Object.keys(SOUNDS).join(",")).split(",");
  const written = writeSfx(names, out);
  const unknown = names.filter((n) => !written.includes(n));
  console.log(`${out}: ${written.join(", ")}${unknown.length ? `\nUnknown: ${unknown.join(", ")} (known: ${SFX_NAMES.join(", ")})` : ""}`);
}
