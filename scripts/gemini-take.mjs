// Speaks the whole story in ONE Gemini request, one paragraph per scene, and
// keeps the take as a WAV. Gemini's free tier allowed ten speech requests a
// day for each model (2026-11-19), so a request per scene (make-voice's way)
// runs out half way through a ten-scene video; one take also keeps the voice
// and its mood the same in every scene. split-take.mjs then cuts the take into
// out/voice-raw/<id>.wav, and make-voice reads those with "voice": "recorded".
//
//   node scripts/gemini-take.mjs [name] [--voice gemini:Charon] [--style "..."]
//     [--model <id>] [--only id,id] [--speed 1] [--story src/story/story.json]
//
// name     The take's file name in out/voice-takes/; default the next free
//          take1, take2, ... A take is never written over: each cost a request.
// --voice  Default: story.json's voice when it is a gemini: one, else gemini:Charon.
// --style  The delivery; default story.json's "voiceStyle". With more than one
//          scene, a request for a full second of silence between paragraphs is
//          added to it: that silence is where split-take cuts.
// --model  Default: story.json's "voiceModel", else GEMINI_TTS_MODEL, else the
//          skill's own. The daily limit is counted for each model.
// --only   Speak just these scenes again, in one request (a line that changed).
//          Give the same --voice, --style and --model as the take it joins.
//
// Needs GEMINI_API_KEY in the terminal (never in a file).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { GEMINI_MODEL, makeSpeaker, writeWav } from "./voice-engines.mjs";

const stop = (message) => {
  console.error(message);
  process.exit(1);
};
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DIR = "out/voice-takes";
const PAUSE = "Leave a full second of silence between paragraphs";

// Everything that can stop the take is checked before the request is spent.
let name = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (name && !/^[\w-]+$/.test(name)) stop(`"${name}" can't be a take's name: letters, digits, - and _ only`);
if (name && existsSync(`${DIR}/${name}.wav`)) stop(`${DIR}/${name}.wav is already there, and a take is never written over: give this one another name`);
if (!name) {
  let n = 1;
  while (existsSync(`${DIR}/take${n}.wav`)) n++;
  name = `take${n}`;
}
const storyPath = option("story") ?? "src/story/story.json";
if (!existsSync(storyPath)) stop(`${storyPath} isn't there: run this in the video's project folder`);
const story = JSON.parse(readFileSync(storyPath, "utf8"));
const words = (scene) => String(scene.say ?? scene.text ?? "").replace(/\s+/g, " ").trim();
const only = option("only")?.split(",").map((id) => id.trim()).filter(Boolean);
const unknown = (only ?? []).filter((id) => !story.scenes.some((s) => s.id === id));
if (unknown.length) stop(`No scene called ${unknown.join(", ")} in ${storyPath}. Its scenes: ${story.scenes.map((s) => s.id).join(", ")}`);
const scenes = story.scenes.filter((s) => (!only || only.includes(s.id)) && words(s));
if (!scenes.length) stop(`${storyPath} has no scene with words to speak`);
const voice = option("voice") ?? (/^gemini:/.test(story.voice ?? "") ? story.voice : "gemini:Charon");
if (!/^gemini:./.test(voice)) stop(`gemini-take speaks gemini: voices (gemini:Charon, gemini:Kore, ...), not "${voice}"`);
// The model is settled here, so the take's notes name the one that spoke it.
const model = option("model") ?? story.voiceModel ?? (process.env.GEMINI_TTS_MODEL || GEMINI_MODEL);
const speed = Number(option("speed") ?? story.speed ?? 1);
if (!(speed > 0)) stop(`--speed must be a number above 0, not "${option("speed")}"`);
const delivery = String(option("style") ?? story.voiceStyle ?? "").trim().replace(/[.\s]+$/, "");
const style = [delivery, scenes.length > 1 && !/silence between paragraphs/i.test(delivery) ? PAUSE : ""].filter(Boolean).join(". ");

// One paragraph per scene; the blank line between them is where the pause goes.
const text = scenes.map(words).join("\n\n");
const speaker = await makeSpeaker(voice, { style: style || undefined, model });
const started = Date.now();
const audio = await speaker.speak(text, speed);
mkdirSync(DIR, { recursive: true });
const file = `${DIR}/${name}.wav`;
writeWav(file, audio.samples, audio.sampleRate);
writeFileSync(`${DIR}/${name}.json`, `${JSON.stringify({ voice, model, style, made: new Date().toISOString(), scenes: scenes.map((s) => ({ id: s.id, text: words(s) })) }, null, 2)}\n`);
console.log(`${file}: ${(audio.samples.length / audio.sampleRate).toFixed(1)} s for ${scenes.length} scene${scenes.length === 1 ? "" : "s"} (${voice}, ${model}), in ${((Date.now() - started) / 1000).toFixed(0)} s`);
console.log(`Next: node scripts/split-take.mjs ${file}`);
