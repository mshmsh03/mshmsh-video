// Scene lengths from the music's beat grid, for a video with no narration
// (production.md, "No narration: the music is the clock"). Run from the
// project root:
//
//   node scripts/make-timing.mjs [--story src/story/story.json] [--out src/story/timing.json]
//
// story.json needs "bpm" (from `hf beats`), and a whole number of "beats" per
// scene; "fps" and "transitionFrames" default to 30 and 15. Trim the music so
// one of its beats falls on frame 0. Each scene starts exactly on its beat:
// every frame is computed from the beat's index, never by adding rounded
// beats, which drifts. It writes the same shape make-voice.mjs writes, with no
// voice, so `stills.mjs <id> review --voice <out>` works, and it warns when a
// scene is too short to read its "text" (0.5 s + 0.3 s a word).

import { readFileSync, writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const storyPath = arg("story", "src/story/story.json");
const outPath = arg("out", "src/story/timing.json");

const story = JSON.parse(readFileSync(storyPath, "utf8"));
const fps = story.fps ?? 30;
const transitionFrames = story.transitionFrames ?? 15;
if (!(story.bpm > 0)) throw new Error(`${storyPath} needs "bpm" (hf beats <track> --json)`);
const framesPerBeat = (fps * 60) / story.bpm;
const frameAt = (beat) => Math.round(beat * framesPerBeat);

let beat = 0;
const scenes = story.scenes.map((scene, i) => {
  if (!Number.isInteger(scene.beats) || scene.beats < 1) {
    throw new Error(`Scene "${scene.id}" needs a whole number of "beats"`);
  }
  const start = frameAt(beat);
  const next = frameAt(beat + scene.beats);
  beat += scene.beats;
  // The scene overlaps the next one by the transition, so the next starts on
  // its beat; a next scene that enters on a hard cut ("enter": "cut") doesn't.
  const last = i === story.scenes.length - 1;
  const cutNext = !last && story.scenes[i + 1].enter === "cut";
  const words = (scene.text ?? "").split(/\s+/).filter(Boolean).length;
  const need = words ? 0.5 + 0.3 * words : 0;
  const shown = (next - start) / fps;
  console.log(
    `${scene.id}: beat ${beat - scene.beats}, ${scene.beats} beats, ${shown.toFixed(2)}s` +
      (words ? `, ${words} words need ${need.toFixed(1)}s${shown < need ? "  TOO SHORT" : ""}` : ""),
  );
  return {
    id: scene.id,
    src: null,
    durationInFrames: next - start + (last || cutNext ? 0 : transitionFrames),
    overlap: i === 0 || scene.enter === "cut" ? 0 : transitionFrames,
    voiceFrom: 0,
    voiceSeconds: 0,
    startSeconds: Number((start / fps).toFixed(4)),
    captions: [],
  };
});

const totalFrames = frameAt(beat);
writeFileSync(outPath, `${JSON.stringify({ fps, transitionFrames, bpm: story.bpm, totalFrames, scenes }, null, 2)}\n`);
console.log(`${scenes.length} scenes, ${beat} beats, ${(totalFrames / fps).toFixed(2)}s = ${totalFrames} frames -> ${outPath}`);
