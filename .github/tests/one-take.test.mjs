// Tests for the one-take voice route: gemini-take.mjs against a stand-in for
// Google's API on this machine (no key, no internet), then split-take.mjs on
// what it saved. Run from the repo root:
//   node --test .github/tests/*.test.mjs

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { GEMINI_MODEL, parseWav, writeWav } from "../../scripts/voice-engines.mjs";

const SCRIPTS = fileURLToPath(new URL("../../scripts/", import.meta.url));
const SR = 24000;
const BREATH = 0.12 + 0.18; // the silence split-take keeps before and after a scene
const PAUSE = "Leave a full second of silence between paragraphs";

const scratch = (t) => {
  const dir = mkdtempSync(join(tmpdir(), "mshmsh-video-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const put = (root, path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

// A script run the way a person runs it, in a project folder. The real key in
// this machine's environment is replaced, and the model setting cleared, so a
// test never depends on them and never sends them anywhere.
const run = async (script, args, cwd, env = {}) => {
  const clean = { ...process.env, ...env };
  delete clean.GEMINI_TTS_MODEL;
  delete clean.GOOGLE_API_KEY;
  if (!env.GEMINI_API_KEY) delete clean.GEMINI_API_KEY;
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [join(SCRIPTS, script), ...args], { cwd, env: clean });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
};

// --- A stand-in voice: a tone for the words, silence for the pauses ---------------------

const tone = (seconds) => Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => 0.3 * Math.sin((2 * Math.PI * 180 * i) / SR));
const silence = (seconds) => new Float32Array(Math.round(seconds * SR));
const join2 = (parts) => {
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  return all;
};
const letters = (text) => (text.match(/\p{L}/gu) ?? []).length;
// One line: 60 ms a letter, a quarter-second pause at each comma.
const phrases = (line) => line.split(/[,،]/).map((phrase) => letters(phrase) * 0.06);
const spoken = (line) => phrases(line).reduce((a, b) => a + b, 0) + (phrases(line).length - 1) * 0.25;
const sayLine = (line) => join2(phrases(line).flatMap((seconds, i) => (i ? [silence(0.25), tone(seconds)] : [tone(seconds)])));
// A whole take: the lines with `gap` seconds of silence between them.
const sayAll = (lines, gap = 1) => join2([silence(0.3), ...lines.flatMap((line, i) => (i ? [silence(gap), sayLine(line)] : [sayLine(line)])), silence(0.4)]);
const seconds = (file) => {
  const { samples, sampleRate } = parseWav(readFileSync(file));
  return samples.length / sampleRate;
};
const near = (actual, expected, what) => assert.ok(Math.abs(actual - expected) < 0.04, `${what}: ${actual.toFixed(2)} s, expected about ${expected.toFixed(2)} s`);

const SCENES = [
  { id: "hook", text: "A short opening line." },
  { id: "middle", text: "A longer line, with a comma in the middle, and then one more part." },
  { id: "end", text: "The closing words." },
];
const saveTake = (dir, name, scenes, audio) => {
  mkdirSync(join(dir, "out", "voice-takes"), { recursive: true });
  writeWav(join(dir, "out", "voice-takes", `${name}.wav`), audio, SR);
  put(dir, `out/voice-takes/${name}.json`, JSON.stringify({ scenes: scenes.map(({ id, text }) => ({ id, text })) }));
  return `out/voice-takes/${name}.wav`;
};

// --- split-take.mjs --------------------------------------------------------------------

test("split-take cuts at the pauses between scenes, not the ones inside a scene", async (t) => {
  const dir = scratch(t);
  const take = saveTake(dir, "take1", SCENES, sayAll(SCENES.map((s) => s.text)));

  const result = await run("split-take.mjs", [take], dir);

  assert.equal(result.code, 0, result.stderr);
  for (const scene of SCENES) near(seconds(join(dir, "out", "voice-raw", `${scene.id}.wav`)), spoken(scene.text) + BREATH, scene.id);
  assert.match(result.stdout, /every scene's pace is within range/);
});

test("split-take saves a one-scene take as that scene's file", async (t) => {
  // gemini-take --only <id> speaks one line again. The first splitter crashed on such a take.
  const dir = scratch(t);
  const scene = { id: "intro", text: "One line, with a pause in it." };
  const take = saveTake(dir, "take4-intro", [scene], sayAll([scene.text]));

  const result = await run("split-take.mjs", [take], dir);

  assert.equal(result.code, 0, result.stderr);
  near(seconds(join(dir, "out", "voice-raw", "intro.wav")), spoken(scene.text) + BREATH, "intro");
  assert.deepEqual(readdirSync(join(dir, "out", "voice-raw")), ["intro.wav"]);
});

test("split-take writes where --out says", async (t) => {
  const dir = scratch(t);
  const take = saveTake(dir, "take1", SCENES, sayAll(SCENES.map((s) => s.text)));

  const result = await run("split-take.mjs", [take, "--out", "elsewhere"], dir);

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(readdirSync(join(dir, "elsewhere")).sort(), ["end.wav", "hook.wav", "middle.wav"]);
  assert.equal(existsSync(join(dir, "out", "voice-raw")), false);
});

test("split-take stops when the take has no gaps to cut at", async (t) => {
  const dir = scratch(t);
  const take = saveTake(dir, "take1", SCENES, join2([silence(0.3), tone(6), silence(0.4)]));

  const result = await run("split-take.mjs", [take], dir);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /0 pauses for 2 boundaries/);
  assert.equal(existsSync(join(dir, "out", "voice-raw")), false);
});

// --- gemini-take.mjs -------------------------------------------------------------------

// Answers like Google's Interactions API: audio for each paragraph of the text it was sent.
const standIn = async (t) => {
  const requests = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const sent = JSON.parse(body);
      const part = sent.input[0].content[0];
      requests.push({ path: req.url, key: req.headers["x-goog-api-key"], model: sent.model, voice: sent.generation_config.speech_config[0].voice, text: part.text, style: part.annotations?.[0]?.style });
      const audio = sayAll(part.text.split("\n\n"));
      const pcm = Buffer.alloc(audio.length * 2);
      audio.forEach((v, i) => pcm.writeInt16LE(Math.round(v * 32767), i * 2));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ steps: [{ content: [{ type: "audio", mime_type: `audio/L16;rate=${SR}`, data: pcm.toString("base64") }] }] }));
    });
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  t.after(() => server.close());
  return { requests, env: { GEMINI_API_KEY: "stand-in-key", GEMINI_API_BASE: `http://127.0.0.1:${server.address().port}` } };
};
const STORY = {
  voice: "recorded",
  voiceStyle: "Warm and unhurried.",
  scenes: [SCENES[0], { ...SCENES[1], text: "It has 419 of them, and a comma, and then one more part.", say: SCENES[1].text }, SCENES[2]],
};

test("gemini-take speaks the whole story in one request, and split-take cuts it per scene", async (t) => {
  const dir = scratch(t);
  put(dir, "src/story/story.json", JSON.stringify(STORY));
  const google = await standIn(t);

  const spoke = await run("gemini-take.mjs", [], dir, google.env);

  assert.equal(spoke.code, 0, spoke.stderr);
  assert.equal(google.requests.length, 1);
  const [request] = google.requests;
  assert.equal(request.path, "/interactions");
  assert.equal(request.key, "stand-in-key");
  // One paragraph per scene, each scene's `say` where it has one.
  assert.equal(request.text, SCENES.map((s) => s.text).join("\n\n"));
  assert.equal(request.style, `Warm and unhurried. ${PAUSE}`);
  assert.equal(request.voice, "Charon");
  assert.equal(request.model, GEMINI_MODEL);
  // No name given: the first free one.
  const saved = JSON.parse(readFileSync(join(dir, "out", "voice-takes", "take1.json"), "utf8"));
  assert.deepEqual(saved.scenes, SCENES.map(({ id, text }) => ({ id, text })));
  assert.equal(saved.voice, "gemini:Charon");
  assert.equal(saved.model, GEMINI_MODEL);
  assert.match(spoke.stdout, /split-take\.mjs out\/voice-takes\/take1\.wav/);

  const split = await run("split-take.mjs", ["out/voice-takes/take1.wav"], dir);

  assert.equal(split.code, 0, split.stderr);
  for (const scene of SCENES) near(seconds(join(dir, "out", "voice-raw", `${scene.id}.wav`)), spoken(scene.text) + BREATH, scene.id);
});

test("gemini-take --only speaks one line again, and it lands in that scene's file", async (t) => {
  const dir = scratch(t);
  put(dir, "src/story/story.json", JSON.stringify(STORY));
  const google = await standIn(t);

  const spoke = await run("gemini-take.mjs", ["take2-end", "--only", "end", "--voice", "gemini:Kore", "--model", "another-tts-model", "--style", "Brisk and clear"], dir, google.env);

  assert.equal(spoke.code, 0, spoke.stderr);
  assert.equal(google.requests.length, 1);
  const [request] = google.requests;
  assert.equal(request.text, SCENES[2].text);
  // One paragraph: no pause to ask for.
  assert.equal(request.style, "Brisk and clear");
  assert.equal(request.voice, "Kore");
  assert.equal(request.model, "another-tts-model");

  const split = await run("split-take.mjs", ["out/voice-takes/take2-end.wav"], dir);

  assert.equal(split.code, 0, split.stderr);
  assert.deepEqual(readdirSync(join(dir, "out", "voice-raw")), ["end.wav"]);
  near(seconds(join(dir, "out", "voice-raw", "end.wav")), spoken(SCENES[2].text) + BREATH, "end");
});

test("gemini-take never spends a request it can't use", async (t) => {
  const dir = scratch(t);
  put(dir, "src/story/story.json", JSON.stringify(STORY));
  put(dir, "out/voice-takes/take1.wav", "an earlier take");
  const google = await standIn(t);

  // A scene that isn't in the story.
  const typo = await run("gemini-take.mjs", ["take9", "--only", "ending"], dir, google.env);
  assert.equal(typo.code, 1);
  assert.match(typo.stderr, /No scene called ending/);
  // A take that is already there.
  const again = await run("gemini-take.mjs", ["take1"], dir, google.env);
  assert.equal(again.code, 1);
  assert.match(again.stderr, /never written over/);
  assert.equal(readFileSync(join(dir, "out", "voice-takes", "take1.wav"), "utf8"), "an earlier take");
  // A voice from another engine.
  const other = await run("gemini-take.mjs", ["take9", "--voice", "af_heart"], dir, google.env);
  assert.equal(other.code, 1);
  assert.match(other.stderr, /gemini: voices/);

  assert.equal(google.requests.length, 0);
});
