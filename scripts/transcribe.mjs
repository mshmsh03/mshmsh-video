// Speech to captions with a time for every word, offline, from GitHub-hosted
// models (so it works in the Claude app's cloud workspace too):
// - English: NVIDIA's Parakeet TDT 0.6B v2 (CC BY 4.0, credit NVIDIA), the most
//   accurate open English model, with measured word times. 480 MB, once.
// - Other languages (Arabic, Persian, Turkish, French, ...): OpenAI's Whisper
//   large-v3-turbo (MIT), 560 MB once, slower. It gives phrases, not words, so
//   each phrase's words are spread over it by length.
// Neither knows Kurdish (Sorani or Kurmanji): for a Kurdish recording use the
// script's own words with make-voice's pause timing ("voice": "recorded").
// Long files are cut at pauses first (Silero VAD, MIT).
//
//   node scripts/transcribe.mjs <audio or video> [--lang en] [--out public/captions/<name>.json] [--srt]
//
// Writes Remotion's Caption JSON (text, startMs, endMs, timestampMs,
// confidence), the shape @remotion/captions and createTikTokStyleCaptions()
// take; --srt writes an .srt next to it. Read the text before using it: names
// and numbers come out as heard. make-voice.mjs uses the same code to time a
// "recorded" English narration word by word against the script.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, ensureModel, fetchAsset, loadSherpa, MODELS, THREADS } from "./voice-engines.mjs";

const RATE = 16000;
export const PARAKEET = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8";
export const WHISPER = "sherpa-onnx-whisper-turbo";

let sherpa;
const recognizers = new Map();
const recognizer = async (lang) => {
  const english = lang === "en";
  const key = english ? "en" : `whisper:${lang}`;
  if (recognizers.has(key)) return recognizers.get(key);
  sherpa ??= await loadSherpa("Transcribing");
  let modelConfig;
  if (english) {
    const dir = ensureModel(PARAKEET, "encoder.int8.onnx", "about 480 MB");
    modelConfig = {
      transducer: { encoder: join(dir, "encoder.int8.onnx"), decoder: join(dir, "decoder.int8.onnx"), joiner: join(dir, "joiner.int8.onnx") },
      tokens: join(dir, "tokens.txt"),
      modelType: "nemo_transducer",
    };
  } else {
    const dir = ensureModel(WHISPER, "turbo-encoder.int8.onnx", "about 560 MB");
    modelConfig = {
      whisper: {
        encoder: join(dir, "turbo-encoder.int8.onnx"),
        decoder: join(dir, "turbo-decoder.int8.onnx"),
        language: lang === "auto" ? "" : lang,
        task: "transcribe",
      },
      tokens: join(dir, "turbo-tokens.txt"),
    };
  }
  const made = new sherpa.OfflineRecognizer({
    featConfig: { sampleRate: RATE, featureDim: english ? 80 : 128 },
    modelConfig: { ...modelConfig, numThreads: THREADS, debug: 0 },
  });
  recognizers.set(key, made);
  return made;
};

// Stretches of speech, at most 20 s each, with where they start (seconds),
// padded by 0.15 s so no word loses its first sound. Decoding speech without
// the long silences keeps Parakeet from dropping words (it lost a whole
// sentence after a 1.3 s pause in a test) and its times from drifting.
const speechParts = async (samples) => {
  sherpa ??= await loadSherpa("Transcribing");
  const model = fetchAsset("silero_vad.onnx", join(MODELS, "vad"));
  const vad = new sherpa.Vad(
    {
      sileroVad: { model, threshold: 0.45, minSilenceDuration: 0.4, minSpeechDuration: 0.2, windowSize: 512, maxSpeechDuration: 20 },
      sampleRate: RATE,
      numThreads: 1,
      debug: 0,
    },
    Math.ceil(samples.length / RATE) + 30,
  );
  const parts = [];
  const pad = Math.round(0.15 * RATE);
  const take = () => {
    while (!vad.isEmpty()) {
      const { samples: s, start } = vad.front(false);
      const from = Math.max(0, start - pad, parts.length ? parts[parts.length - 1].end : 0);
      const end = Math.min(samples.length, start + s.length + pad);
      parts.push({ samples: samples.slice(from, end), at: from / RATE, end });
      vad.pop();
    }
  };
  for (let i = 0; i < samples.length; i += 512) {
    vad.acceptWaveform(samples.subarray(i, Math.min(samples.length, i + 512)));
    take();
  }
  vad.flush();
  take();
  return parts;
};

// Parakeet's word pieces back into words. A piece starting with a space opens a
// word; punctuation joins the word before it.
const piecesToWords = (result, at) => {
  const words = [];
  result.tokens.forEach((piece, k) => {
    const start = at + result.timestamps[k];
    const end = start + (result.durations?.[k] ?? 0.08);
    const opens = piece.startsWith(" ") || words.length === 0;
    const text = piece.trim();
    if (!text) return;
    if (opens && !/^[.,!?;:%)\]}'"]+$/.test(text)) words.push({ text, start, end });
    else {
      const last = words[words.length - 1];
      last.text += text;
      last.end = Math.max(last.end, end);
    }
  });
  return words;
};

// Whisper gives a phrase: its words share the phrase's time by length.
const spread = (text, start, end) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let t = start;
  return words.map((w, k) => {
    const length = ((end - start) * weights[k]) / total;
    const word = { text: w, start: t, end: t + length };
    t += length;
    return word;
  });
};

// Every word heard in mono 16 kHz samples, with start and end in seconds.
export const transcribeWords = async (samples, lang = "en") => {
  const rec = await recognizer(lang);
  const parts = await speechParts(samples);
  const words = [];
  for (const part of parts) {
    const stream = rec.createStream();
    stream.acceptWaveform({ sampleRate: RATE, samples: part.samples });
    rec.decode(stream);
    const result = rec.getResult(stream);
    if (lang === "en" && result.timestamps?.length) words.push(...piecesToWords(result, part.at));
    else if (result.text.trim()) {
      // Whisper invents "Thank you." over silence and music; drop a lone one.
      if (/^(thank you\.?|thanks for watching!?|you)$/i.test(result.text.trim()) && part.samples.length / RATE < 2) continue;
      words.push(...spread(result.text, part.at + 0.05, part.at + part.samples.length / RATE - 0.05));
    }
  }
  return words;
};

export const toCaptions = (words) =>
  words.map((w, k) => ({
    text: (k === 0 ? "" : " ") + w.text,
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
    timestampMs: Math.round(((w.start + w.end) / 2) * 1000),
    confidence: null,
  }));

const norm = (w) => w.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");

// Gives the script's own words (with their spelling and punctuation) the times
// of the words heard. Words the recognizer heard differently ("300" said as
// "three hundred") share the time between their neighbours. Returns null when
// fewer than half the words match: the recording doesn't follow the script.
export const alignToScript = (text, heard, duration) => {
  const words = text.trim().split(/\s+/);
  const a = words.map(norm);
  const b = heard.map((h) => norm(h.text));
  const n = a.length;
  const m = b.length;
  const common = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      common[i][j] = a[i] && a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }
  const times = words.map(() => null);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] && a[i] === b[j]) {
      times[i] = { start: heard[j].start, end: heard[j].end };
      i++;
      j++;
    } else if (common[i + 1][j] >= common[i][j + 1]) i++;
    else j++;
  }
  const matched = times.filter(Boolean).length;
  if (matched < Math.max(1, words.length / 2)) return null;
  // Unmatched runs fill the gap between the matched words around them.
  for (let k = 0; k < n; ) {
    if (times[k]) {
      k++;
      continue;
    }
    let end = k;
    while (end < n && !times[end]) end++;
    const from = k > 0 ? times[k - 1].end : Math.max(0, (times[end]?.start ?? duration) - 0.4 * (end - k));
    const to = end < n ? times[end].start : Math.min(duration, from + 0.4 * (end - k));
    const weights = words.slice(k, end).map((w) => norm(w).length + 1);
    const total = weights.reduce((x, y) => x + y, 0);
    let t = from;
    for (let q = k; q < end; q++) {
      const length = ((to - from) * weights[q - k]) / total;
      times[q] = { start: t, end: t + length };
      t += length;
    }
    k = end;
  }
  return {
    captions: toCaptions(words.map((w, k) => ({ text: w, ...times[k] }))),
    matched: `${matched}/${words.length} words timed from the recording`,
  };
};

const srtTime = (ms) => {
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
};

// Cues of up to 7 words, broken at sentence ends and pauses over 0.6 s.
const toSrt = (captions) => {
  const cues = [];
  let cue = [];
  captions.forEach((c, k) => {
    cue.push(c);
    const next = captions[k + 1];
    if (!next || cue.length >= 7 || /[.!?؟]$/.test(c.text) || next.startMs - c.endMs > 600) {
      cues.push(cue);
      cue = [];
    }
  });
  return cues
    .map((q, k) => `${k + 1}\n${srtTime(q[0].startMs)} --> ${srtTime(q[q.length - 1].endMs)}\n${q.map((c) => c.text).join("").trim()}\n`)
    .join("\n");
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const input = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.match(/^--(lang|out)$/));
  if (!input || !existsSync(input)) {
    console.log("Usage: node scripts/transcribe.mjs <audio or video> [--lang en|ar|fa|tr|...|auto] [--out file.json] [--srt]");
    process.exit(1);
  }
  const lang = option("lang", "en");
  if (/^(ckb|ku|kmr|sdh)$/.test(lang)) throw new Error("No free model here knows Kurdish. Time a Kurdish recording from the script with make-voice (\"voice\": \"recorded\").");
  const out = option("out", join("public", "captions", `${basename(input, extname(input))}.json`));
  const started = Date.now();
  const words = await transcribeWords(decode(input, RATE), lang);
  const captions = toCaptions(words);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(captions, null, 1)}\n`);
  if (args.includes("--srt")) writeFileSync(out.replace(/\.json$/, "") + ".srt", toSrt(captions));
  console.log(captions.map((c) => c.text).join("").trim());
  console.log(
    `\n${out}: ${captions.length} words in ${((Date.now() - started) / 1000).toFixed(1)} s. ` +
      (lang === "en" ? "Parakeet TDT 0.6B v2 by NVIDIA, CC BY 4.0." : "Whisper large-v3-turbo by OpenAI, MIT; word times spread over each phrase.") +
      " Check names and numbers before using it.",
  );
}
