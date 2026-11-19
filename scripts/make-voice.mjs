// Narrates a story.json. Writes one WAV per scene and a voice.json with each
// scene's length in frames and word timings for the captions. The voice name
// picks the engine:
// - Kokoro ("af_heart"): local and free, offline after the first ~330 MB
//   model download. Needs `npm i -D kokoro-js`; where kokoro-js can't download
//   its model, the same voices run through Python (kokoro-voice.py).
// - Microsoft Edge ("ar-IQ-RanaNeural"): free and online, many languages
//   including Arabic, with measured word timings. Needs Python with
//   `python -m pip install edge-tts` (scripts/edge-voice.py), and ffmpeg or the
//   copy bundled with Remotion.
// - Sorani Kurdish ("f5:studio-male"): spoken beforehand by tts/speak_story.py
//   (F5-TTS Central Kurdish, offline, slow on a CPU); this script reads its
//   files. See toolbox.md, "Sorani voices".
// - Recorded ("recorded"): audio made elsewhere, one file per scene in
//   out/voice-raw/<id>.wav (or .flac, .mp3, .m4a, .ogg): the person's own
//   recording (one take per scene, a breath of silence at each end), or an
//   ElevenLabs or HeyGen download. Words are timed from the pauses.
// - Pocket TTS ("pocket:alba", or "pocket:voice/me.wav" to copy a voice),
//   Supertonic 3 ("supertonic:F2"), Gemini ("gemini:Charon") and Vekol
//   ("vekol", Sorani, offline): see voice-engines.mjs. Words are timed from
//   the pauses, as for Kokoro.
//
// - Draft (--draft): no voice at all. Each line's length is estimated from its
//   words and the WAVs are silent, so the Studio preview and the scenes can be
//   built the moment the script is approved, before a voice is picked or
//   downloaded. Run it again without --draft for the real voice; every
//   wordAt(...) keeps working, only the times shift.
//
// Scenes whose words, voice and speed haven't changed since the last run are
// reused from public/voice/ instead of spoken again (a one-line fix re-speaks
// one scene). --fresh speaks everything again.
//
// Run from the Remotion project root:
//   node scripts/make-voice.mjs [--draft] [--fresh] [--story src/story/story.json]
//     [--out src/story/voice.json] [--audio public/voice] [--raw out/voice-raw]

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decode, engineOf, kokoroSpeaker, makeSpeaker, normalize, speechRange, trim, writeWav } from "./voice-engines.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const STORY = arg("story", "src/story/story.json");
const OUT = arg("out", "src/story/voice.json");
const AUDIO_DIR = arg("audio", "public/voice");
// Where tts/speak_story.py left the Sorani recordings (f5:/mms: voices).
const RAW_DIR = arg("raw", "out/voice-raw");
// voice.json refers to the WAVs relative to public/.
const AUDIO_SRC = AUDIO_DIR.replace(/^public\//, "");
const DRAFT = process.argv.includes("--draft");
const FRESH = process.argv.includes("--fresh");

const story = JSON.parse(readFileSync(STORY, "utf8"));
const { fps, transitionFrames, leadIn, tail } = story;
// The last run, to reuse scenes that haven't changed.
let previous = null;
try {
  previous = JSON.parse(readFileSync(OUT, "utf8"));
} catch {}
// Edge voice names look like "ar-IQ-RanaNeural"; Kokoro's like "af_heart".
const ENGINE = engineOf(story.voice);
const EDGE = ENGINE === "edge";
// Sorani voices ("f5:studio-male") are spoken beforehand by tts/speak_story.py
// (from the skill's scripts/sorani/) into out/voice-raw/<id>.flac. "recorded"
// takes any audio already made, one file per scene in out/voice-raw/<id>.*
// (wav, flac, mp3, m4a, ogg, opus, webm): the person's own recording, or an
// ElevenLabs or HeyGen download. Either way this script trims, normalizes and
// times them like Kokoro's.
const RAW = ENGINE === "raw";
// pocket:, supertonic: and gemini: voices (voice-engines.mjs).
const EXTRA = ["pocket", "supertonic", "gemini", "vekol"].includes(ENGINE);
const engineOptions = { lang: story.lang, style: story.voiceStyle, model: story.voiceModel };
const rawFile = (id) => {
  for (const ext of ["flac", "wav", "mp3", "m4a", "ogg", "opus", "webm"]) {
    const path = `${RAW_DIR}/${id}.${ext}`;
    if (existsSync(path)) return path;
  }
  throw new Error(`No audio for scene "${id}": put it in ${RAW_DIR}/${id}.wav (or .flac, .mp3, .m4a, .ogg).`);
};

// Gaps of at least 90 ms inside the speech, in seconds.
const findPauses = (samples, sr) => {
  const win = Math.round(0.01 * sr);
  const levels = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += samples[j] * samples[j];
    levels.push(Math.sqrt(sum / win));
  }
  const threshold = Math.max(...levels) * 0.05;
  const pauses = [];
  let runStart = -1;
  levels.forEach((level, k) => {
    if (level < threshold) {
      if (runStart < 0) runStart = k;
    } else {
      if (runStart > 0 && k - runStart >= 9) {
        pauses.push({ start: runStart * 0.01, end: k * 0.01, length: (k - runStart) * 0.01 });
      }
      runStart = -1;
    }
  });
  return pauses;
};

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
// Roughly how long a word takes to say: its letters, or for "300" the letters
// of "three hundred"; a year like 2026 counts about five letters a digit.
const spokenLength = (word) => {
  const letters = word.replace(/[^\p{L}]/gu, "").length;
  const digits = word.replace(/[^0-9]/g, "");
  if (!digits) return letters;
  const n = Number(digits);
  if (n >= 1000) return digits.length * 5 + letters;
  const hundreds = Math.floor(n / 100);
  return ((hundreds ? ONES[hundreds].length + 7 : 0) + (n % 100 ? 7 : 0) || 4) + letters;
};
// The same for each written word when `say` spells it differently ("٢٠ی" read
// as "بیستی", "PHP" as "پی ئێچ پی"): the words both share line up, and each
// run that differs takes the letters of what was actually said.
const spokenLengths = (words, said) => {
  const letters = (w) => spokenLength(w.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x6f0));
  const n = words.length;
  const m = said.length;
  const common = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      common[i][j] =
        words[i] === said[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }
  const lengths = words.map(letters);
  let i = 0;
  let j = 0;
  let runI = 0;
  let runJ = 0;
  const flush = () => {
    if (i === runI) return;
    const heard = said.slice(runJ, j).reduce((a, w) => a + letters(w), 0);
    const own = words.slice(runI, i).map((w) => letters(w) || 1);
    const ownTotal = own.reduce((a, b) => a + b, 0);
    own.forEach((l, k) => (lengths[runI + k] = (heard * l) / ownTotal));
  };
  while (i < n && j < m) {
    if (words[i] === said[j]) {
      flush();
      i++;
      j++;
      runI = i;
      runJ = j;
    } else if (common[i + 1][j] >= common[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  i = n;
  j = m;
  flush();
  return lengths;
};
// Periods that don't end a sentence: titles, times, "e.g." and friends.
const ABBREVIATION = /^(Mr|Mrs|Ms|Dr|St|Jr|vs|etc|e\.g|i\.e|a\.m|p\.m)\.$/i;

// Pairs clause breaks (after , . : ?) with the pauses heard nearest to where
// each break should fall, keeping both in order. Unmatched pauses are hesitations
// inside a clause; unmatched breaks are commas read without a stop.
const alignBreaks = (breaks, pauses) => {
  const SKIP_BREAK = 0.35;
  const SKIP_PAUSE = 0.08;
  const cost = breaks.map(() => pauses.map(() => 0));
  const n = breaks.length;
  const m = pauses.length;
  const dp = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => i * SKIP_BREAK + j * SKIP_PAUSE),
  );
  const step = Array.from({ length: n + 1 }, () => Array(m + 1).fill(""));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cost[i - 1][j - 1] = Math.abs(breaks[i - 1].expected - pauses[j - 1].mid);
      const options = [
        [dp[i - 1][j - 1] + cost[i - 1][j - 1], "match"],
        [dp[i - 1][j] + SKIP_BREAK, "skipBreak"],
        [dp[i][j - 1] + SKIP_PAUSE, "skipPause"],
      ];
      [dp[i][j], step[i][j]] = options.reduce((a, b) => (b[0] < a[0] ? b : a));
    }
  }
  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (step[i][j] === "match") {
      pairs.unshift([breaks[i - 1], pauses[j - 1]]);
      i--;
      j--;
    } else if (step[i][j] === "skipBreak") {
      i--;
    } else {
      j--;
    }
  }
  return pairs;
};

// Pins clause breaks to pauses in the audio, then spreads each clause's words
// over its time by how long they take to say.
const timeWords = (text, pauses, duration, spoken = text) => {
  const words = text.split(/\s+/);
  const lengths = spokenLengths(words, spoken.split(/\s+/));
  const isBreak = (word, i) =>
    i < words.length - 1 && /[.,:;?!،؛؟]$/.test(word) && !ABBREVIATION.test(word);

  // Where each break would fall if speech ran at an even pace, with extra time
  // for the stop itself.
  const weights = words.map((w, i) => lengths[i] + 1 + (isBreak(w, i) ? 3 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const breaks = [];
  let acc = 0;
  words.forEach((word, i) => {
    acc += weights[i];
    if (isBreak(word, i)) breaks.push({ i, expected: 0.03 + ((duration - 0.11) * acc) / total });
  });

  const pairs = alignBreaks(
    breaks,
    pauses.map((p) => ({ ...p, mid: (p.start + p.end) / 2 })),
  );

  const segments = [];
  let w0 = 0;
  let t0 = 0.03;
  for (const [b, pause] of pairs) {
    segments.push({ w0, w1: b.i, t0, t1: pause.start });
    w0 = b.i + 1;
    t0 = pause.end;
  }
  segments.push({ w0, w1: words.length - 1, t0, t1: duration - 0.08 });
  const m = pairs.length;

  const captions = [];
  for (const { w0: from, w1: to, t0: start, t1: end } of segments) {
    const slice = words.slice(from, to + 1);
    const weights = slice.map((_, k) => lengths[from + k] + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = start;
    slice.forEach((word, k) => {
      const length = ((end - start) * weights[k]) / total;
      captions.push({
        text: (from + k === 0 ? "" : " ") + word,
        startMs: Math.round(t * 1000),
        endMs: Math.round((t + length) * 1000),
        timestampMs: Math.round((t + length / 2) * 1000),
        confidence: null,
      });
      t += length;
    });
  }
  return { captions, matched: `${m}/${breaks.length} breaks` };
};

const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const EDGE_SCRIPT = fileURLToPath(new URL("edge-voice.py", import.meta.url));

// Speaks a line through scripts/edge-voice.py and returns when each word is
// said, in seconds. A speed of 1.1 becomes Edge's rate "+10%".
const edgeSpeak = (text, voice, speed, out) => {
  const percent = Math.round((speed - 1) * 100);
  const words = execFileSync(PYTHON, [EDGE_SCRIPT], {
    input: JSON.stringify({ text, voice, rate: `${percent >= 0 ? "+" : ""}${percent}%`, out }),
    stdio: ["pipe", "pipe", "inherit"],
  });
  return JSON.parse(words);
};

// Edge reports each word without its punctuation. Finds those words in the
// spoken line and gives their times to the script's own words, so captions keep
// the punctuation that breaks them into phrases. `shift` is the silence trimmed
// off the start. Returns null when `say` and `text` differ in word count.
// Edge starts a word that follows a pause inside the silence, 120 to 160 ms
// before it is heard (measured 2026-10-21), so such a word starts where the
// sound comes back.
const edgeCaptions = (text, spoken, words, shift, pauses) => {
  const shown = text.trim().split(/\s+/);
  const said = spoken.trim().split(/\s+/);
  if (shown.length !== said.length) return null;
  const ranges = [];
  let pos = 0;
  for (const word of said) {
    const at = spoken.indexOf(word, pos);
    ranges.push([at, at + word.length]);
    pos = at + word.length;
  }
  const times = said.map(() => null);
  let from = 0;
  for (const word of words) {
    const at = spoken.indexOf(word.text, from);
    if (at < 0) continue;
    from = at + word.text.length;
    const k = ranges.findIndex(([start, end]) => at >= start && at < end);
    if (k >= 0) times[k] = { start: times[k]?.start ?? word.start, end: word.end };
  }
  // A word Edge didn't report (a lone dash, an emoji) shows as the one before ends.
  let previousEnd = 0;
  const captions = shown.map((word, k) => {
    let start = times[k] ? Math.max(0, times[k].start - shift) : previousEnd;
    const pause = pauses.find((p) => start >= p.start - 0.02 && start < p.end);
    if (times[k] && pause) start = pause.end;
    const end = times[k] ? Math.max(start, times[k].end - shift) : previousEnd;
    previousEnd = end;
    return {
      text: (k === 0 ? "" : " ") + word,
      startMs: Math.round(start * 1000),
      endMs: Math.round(end * 1000),
      timestampMs: Math.round(((start + end) / 2) * 1000),
      confidence: null,
    };
  });
  return { captions, matched: `${times.filter(Boolean).length}/${said.length} words timed by Edge` };
};

// Kokoro loads only when a scene really has to be spoken (kokoro-js, or the
// same model through Python where kokoro-js can't download it).
const kokoro = kokoroSpeaker();

// A draft line's length: about 15 letters a second at speed 1, plus the stops.
const draftSeconds = (text, speed) => {
  const words = text.trim().split(/\s+/);
  const letters = spokenLengths(words, words).reduce((a, b) => a + b, 0);
  const stops = words.filter((w, i) => i < words.length - 1 && /[.,:;?!،؛؟]$/.test(w)).length;
  return (0.15 + letters * 0.066 + words.length * 0.05 + stops * 0.25) / (speed || 1);
};

// What a scene's sound depends on. Same key, same WAV: reuse it.
const keyOf = (scene, spoken) => {
  let source = "";
  if (RAW && !DRAFT) {
    try {
      const { size, mtimeMs } = statSync(rawFile(scene.id));
      source = `${size}:${Math.round(mtimeMs)}`;
    } catch {}
  }
  // A copied Pocket voice changes when its recording does; Gemini's sound
  // depends on its style and model, Supertonic's on the language.
  const extra = [];
  if (EXTRA && !DRAFT) {
    const reference = story.voice.slice("pocket:".length);
    if (ENGINE === "pocket" && existsSync(reference)) {
      const { size, mtimeMs } = statSync(reference);
      extra.push(`${size}:${Math.round(mtimeMs)}`);
    }
    if (ENGINE === "gemini") extra.push(story.voiceStyle ?? "", story.voiceModel ?? "");
    if (ENGINE === "supertonic") extra.push(story.lang ?? "");
  }
  return createHash("sha1")
    .update(JSON.stringify([DRAFT ? "draft" : story.voice, story.speed ?? 1, spoken, scene.text, source, ...extra]))
    .digest("hex")
    .slice(0, 12);
};

// The pocket:, supertonic: or gemini: engine loads only when a scene really
// has to be spoken.
let speaker;
const extraSpeaker = async () => (speaker ??= await makeSpeaker(story.voice, engineOptions));

mkdirSync(AUDIO_DIR, { recursive: true });
// Edge's own MP3s, kept for reference; the video plays the WAVs.
const EDGE_DIR = "out/voice-edge";
if (EDGE && !DRAFT) mkdirSync(EDGE_DIR, { recursive: true });
const scenes = [];
let cursor = 0;
for (const [index, scene] of story.scenes.entries()) {
  // A scene overlaps the one before it by the transition, unless it enters on
  // a hard cut ("enter": "cut").
  const overlap = index === 0 || scene.enter === "cut" ? 0 : transitionFrames;
  cursor -= overlap;
  const spoken = scene.say ?? scene.text;
  const key = keyOf(scene, spoken);
  const lead = scene.lead ?? leadIn;
  const cached = FRESH ? null : previous?.scenes?.find((s) => s.id === scene.id && s.key === key);
  if (cached && existsSync(`${AUDIO_DIR}/${scene.id}.wav`)) {
    const durationInFrames = Math.ceil((lead + cached.voiceSeconds + tail + (scene.hold ?? 0)) * fps);
    scenes.push({
      ...cached,
      src: `${AUDIO_SRC}/${scene.id}.wav`,
      durationInFrames,
      overlap,
      voiceFrom: Math.round(lead * fps),
      startSeconds: Number((cursor / fps).toFixed(3)),
    });
    console.log(`${scene.id}: ${cached.voiceSeconds.toFixed(2)}s voice, ${durationInFrames} frames, unchanged (reused)`);
    cursor += durationInFrames;
    continue;
  }
  let sr;
  let samples;
  let edgeTimed = null;
  if (DRAFT) {
    sr = 24000;
    samples = new Float32Array(Math.round(draftSeconds(spoken, story.speed) * sr));
  } else if (EDGE) {
    sr = 24000;
    const mp3 = `${EDGE_DIR}/${scene.id}.mp3`;
    const words = edgeSpeak(spoken, story.voice, story.speed ?? 1, mp3);
    const decoded = decode(mp3, sr);
    const [start, end] = speechRange(decoded, sr);
    samples = normalize(decoded.slice(start, end));
    edgeTimed = edgeCaptions(scene.text, spoken, words, start / sr, findPauses(samples, sr));
  } else if (RAW) {
    sr = 24000;
    samples = normalize(trim(decode(rawFile(scene.id), sr), sr));
  } else if (EXTRA) {
    const audio = await (await extraSpeaker()).speak(spoken, story.speed ?? 1);
    sr = audio.sampleRate;
    samples = normalize(trim(audio.samples, sr));
  } else {
    const audio = await kokoro.speak(spoken, story.voice, story.speed ?? 1);
    sr = audio.sampleRate;
    samples = normalize(trim(audio.samples, sr));
  }
  writeWav(`${AUDIO_DIR}/${scene.id}.wav`, samples, sr);

  const voiceSeconds = samples.length / sr;
  // Kokoro, Pocket, Supertonic, Gemini and the Sorani voices give no word
  // times, so they're estimated from the pauses; so are Edge's when `say` and `text` differ in word count. A
  // draft has no pauses, so its words are spread by length.
  const timed = edgeTimed ?? timeWords(scene.text, DRAFT ? [] : findPauses(samples, sr), voiceSeconds, spoken);
  const { captions } = timed;
  const matched = DRAFT ? "draft (estimated, silent)" : timed.matched;
  // A scene can hold the voice back with its own "lead" (seconds).
  const durationInFrames = Math.ceil((lead + voiceSeconds + tail + (scene.hold ?? 0)) * fps);
  scenes.push({
    id: scene.id,
    key,
    src: `${AUDIO_SRC}/${scene.id}.wav`,
    durationInFrames,
    overlap,
    voiceFrom: Math.round(lead * fps),
    voiceSeconds: Number(voiceSeconds.toFixed(3)),
    startSeconds: Number((cursor / fps).toFixed(3)),
    captions,
  });
  console.log(`${scene.id}: ${voiceSeconds.toFixed(2)}s voice, ${durationInFrames} frames, ${matched}`);
  cursor += durationInFrames;
}

const totalFrames = cursor;
writeFileSync(
  OUT,
  `${JSON.stringify({ fps, transitionFrames, totalFrames, ...(DRAFT ? { draft: true } : {}), scenes }, null, 2)}\n`,
);
console.log(`total: ${(totalFrames / fps).toFixed(2)}s (${totalFrames} frames)${DRAFT ? ", DRAFT timings: run again without --draft for the real voice" : ""}`);
