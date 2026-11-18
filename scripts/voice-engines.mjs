// Shared by make-voice.mjs and voice-samples.mjs: audio helpers, and the
// narrator engines that aren't Kokoro or Edge. The voice name picks one:
//
// - pocket:<voice>  Kyutai's Pocket TTS, offline, English. <voice> is a preset
//   (bill_boerst, caro_davy, peter_yearsley, stuart_bell: CC0; alba: CC BY 4.0;
//   bria, loona: demo clips that come with the model), or the path to a clean
//   10 to 20 s recording whose voice it copies. Copy only the person's own
//   voice, or one they have permission to use.
// - supertonic:<F1..F5|M1..M5>  Supertonic 3, offline and fast, 31 languages
//   including Arabic, no Kurdish. The language comes from "lang" in story.json
//   (en, ar, fr, ...) or from the script the line is written in.
// - gemini:<Voice>  Google's Gemini TTS, online, free tier with an API key in
//   GEMINI_API_KEY. 30 voices (Kore, Charon, Puck, ...), over 100 languages
//   including Arabic and Central Kurdish (Sorani). "voiceStyle" in story.json
//   sets the delivery ("warm and unhurried"), "voiceModel" the model.
//
// Pocket and Supertonic run through sherpa-onnx (npm i -D sherpa-onnx-node@2.0.1).
// Their models, about 100 MB each, download once from sherpa-onnx's GitHub
// releases into ~/.cache/video-xoshaka/models (VIDEO_XOSHAKA_MODELS moves it),
// so every project shares one copy.

import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const engineOf = (voice = "") => {
  if (/^pocket:/.test(voice)) return "pocket";
  if (/^supertonic:/.test(voice)) return "supertonic";
  if (/^gemini:/.test(voice)) return "gemini";
  if (/^(f5|mms):/.test(voice) || voice === "recorded") return "raw";
  // Edge voice names look like "ar-IQ-RanaNeural"; Kokoro's like "af_heart".
  if (/^[a-z]{2,3}-.+Neural$/.test(voice)) return "edge";
  return "kokoro";
};

// --- Audio helpers ---------------------------------------------------------------

// Where the speech starts and ends, keeping a little air around it.
export const speechRange = (samples, sr) => {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const threshold = peak * 0.02;
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < threshold) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < threshold) last--;
  return [Math.max(0, first - Math.round(0.03 * sr)), Math.min(samples.length, last + Math.round(0.08 * sr))];
};

// Cut the model's leading and trailing silence, keeping a little air.
export const trim = (samples, sr) => samples.slice(...speechRange(samples, sr));

// Every scene at the same loudness (-20 dBFS RMS), never above -1 dBFS.
export const normalize = (samples) => {
  let sum = 0;
  let peak = 0;
  for (const v of samples) {
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak === 0) return samples;
  const gain = Math.min(0.1 / Math.sqrt(sum / samples.length), 0.89 / peak);
  return samples.map((v) => v * gain);
};

export const writeWav = (path, samples, sr) => {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2);
  });
  writeFileSync(path, buf);
};

// Mono samples from a 16-bit PCM WAV buffer (channels averaged).
export const parseWav = (buf) => {
  let pos = 12;
  let channels = 1;
  let sampleRate = 24000;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(pos + 10);
      sampleRate = buf.readUInt32LE(pos + 12);
    }
    if (id === "data") {
      // Streamed WAVs can carry a size of 0 or 0xFFFFFFFF: read to the end.
      const end = size && pos + 8 + size <= buf.length ? pos + 8 + size : buf.length;
      const frames = Math.floor((end - pos - 8) / (2 * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += buf.readInt16LE(pos + 8 + (i * channels + c) * 2);
        samples[i] = sum / channels / 32768;
      }
      return { samples, sampleRate };
    }
    pos += 8 + size + (size % 2);
  }
  throw new Error("Not a PCM WAV: no data chunk");
};

// npx is a .cmd on Windows, which Node only runs through a shell: pass one
// quoted command string there instead of an argument list.
export const npx = (args, options) =>
  process.platform === "win32"
    ? execSync(`npx ${args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ")}`, options)
    : execFileSync("npx", args, options);

// Any audio file to mono samples at `sr`, with ffmpeg or the copy bundled with
// Remotion when ffmpeg isn't on the PATH. That copy can't write raw samples, so
// both go through a 16-bit WAV in the system's temp folder (never next to the
// source, which may be a .wav itself).
export const decode = (file, sr) => {
  const wav = join(tmpdir(), `voice-${process.pid}-${basename(file).replace(/\W+/g, "_")}.wav`);
  const args = ["-v", "error", "-y", "-i", file, "-ac", "1", "-ar", String(sr), "-c:a", "pcm_s16le", wav];
  try {
    execFileSync("ffmpeg", args);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    npx(["remotion", "ffmpeg", ...args]);
  }
  const { samples } = parseWav(readFileSync(wav));
  rmSync(wav, { force: true });
  return samples;
};

// --- Model downloads -------------------------------------------------------------

export const MODELS = process.env.VIDEO_XOSHAKA_MODELS ?? join(homedir(), ".cache", "video-xoshaka", "models");
const RELEASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models";

// curl and tar ship with Windows 10 and later, macOS and Linux. Both run from
// inside the folder with relative names: Git Bash's GNU tar reads "C:\..." as a
// remote host.
const download = (url, dir, name) => {
  mkdirSync(dir, { recursive: true });
  execFileSync("curl", ["-fL", "--retry", "3", "--progress-bar", "-o", `${name}.part`, url], {
    cwd: dir,
    stdio: ["ignore", "inherit", "inherit"],
  });
  renameSync(join(dir, `${name}.part`), join(dir, name));
  return join(dir, name);
};

export const ensureModel = (name, check) => {
  const dir = join(MODELS, name);
  if (existsSync(join(dir, check))) return dir;
  console.log(`Downloading ${name} (once, about 100 MB) into ${MODELS}`);
  download(`${RELEASE}/${name}.tar.bz2`, MODELS, `${name}.tar.bz2`);
  execFileSync("tar", ["-xjf", `${name}.tar.bz2`], { cwd: MODELS, stdio: "inherit" });
  rmSync(join(MODELS, `${name}.tar.bz2`), { force: true });
  if (!existsSync(join(dir, check))) throw new Error(`${name} didn't unpack as expected: ${join(dir, check)} is missing`);
  return dir;
};

const loadSherpa = async (voice) => {
  try {
    return (await import("sherpa-onnx-node")).default;
  } catch (error) {
    throw new Error(`${voice} runs on sherpa-onnx. Install it in the project: npm i -D sherpa-onnx-node@2.0.1\n(${error.message})`);
  }
};
const THREADS = Math.max(1, Math.min(8, availableParallelism() - 1));

// --- Pocket TTS --------------------------------------------------------------------

export const POCKET_MODEL = "sherpa-onnx-pocket-tts-int8-2026-01-26";
// Kyutai's tts-voices: voice-zero is CC0, alba-mackenna CC BY 4.0. Its expresso
// and ears folders are non-commercial, so they aren't offered.
export const POCKET_PRESETS = {
  alba: "alba-mackenna/casual.wav",
  bill_boerst: "voice-zero/bill_boerst.wav",
  caro_davy: "voice-zero/caro_davy.wav",
  peter_yearsley: "voice-zero/peter_yearsley.wav",
  stuart_bell: "voice-zero/stuart_bell.wav",
};
const AUDIO_FILE = /\.(wav|flac|mp3|m4a|ogg|opus|webm|aac)$/i;

const pocketReference = (name, modelDir) => {
  if (AUDIO_FILE.test(name)) {
    if (!existsSync(name)) throw new Error(`pocket: no recording at ${name}`);
    return resolve(name);
  }
  const bundled = join(modelDir, "test_wavs", `${name}.wav`);
  if (existsSync(bundled)) return bundled;
  const preset = POCKET_PRESETS[name];
  if (!preset) {
    throw new Error(`pocket:${name} is neither a preset (${[...Object.keys(POCKET_PRESETS), "bria", "loona"].join(", ")}) nor a recording (.wav, .m4a, .mp3)`);
  }
  const dir = join(MODELS, "pocket-voices");
  if (existsSync(join(dir, `${name}.wav`))) return join(dir, `${name}.wav`);
  console.log(`Downloading the Pocket voice "${name}"`);
  return download(`https://huggingface.co/kyutai/tts-voices/resolve/main/${preset}`, dir, `${name}.wav`);
};

const pocketSpeaker = async (voice) => {
  const sherpa = await loadSherpa(voice);
  const dir = ensureModel(POCKET_MODEL, "lm_main.int8.onnx");
  const name = voice.slice("pocket:".length);
  // 20 s of reference is plenty; longer only slows it down.
  const referenceAudio = decode(pocketReference(name, dir), 24000).slice(0, 20 * 24000);
  const tts = new sherpa.OfflineTts({
    model: {
      pocket: {
        lmFlow: join(dir, "lm_flow.int8.onnx"),
        lmMain: join(dir, "lm_main.int8.onnx"),
        encoder: join(dir, "encoder.onnx"),
        decoder: join(dir, "decoder.int8.onnx"),
        textConditioner: join(dir, "text_conditioner.onnx"),
        vocabJson: join(dir, "vocab.json"),
        tokenScoresJson: join(dir, "token_scores.json"),
      },
      numThreads: THREADS,
    },
  });
  return {
    speak: async (text, speed = 1) => {
      if (/[\u0600-\u06FF]/.test(text)) throw new Error("Pocket TTS speaks English, not Arabic or Kurdish: use supertonic:, gemini: or edge for this line.");
      const audio = tts.generate({
        text,
        sid: 0,
        speed,
        generationConfig: new sherpa.GenerationConfig({ referenceAudio, referenceSampleRate: 24000, speed }),
      });
      return { samples: Float32Array.from(audio.samples), sampleRate: audio.sampleRate };
    },
  };
};

// --- Supertonic 3 -------------------------------------------------------------------

export const SUPERTONIC_MODEL = "sherpa-onnx-supertonic-3-tts-int8-2026-05-11";
// Speaker ids in voice.bin, in this order (F1-F5 measured higher-pitched than
// M1-M5 on 2026-11-18).
export const SUPERTONIC_VOICES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"];
const SUPERTONIC_LANGS = "en ko ja ar bg cs da de el es et fi fr hi hr hu id it lt lv nl pl pt ro ru sk sl sv tr uk vi".split(" ");
// Letters Sorani uses and Arabic doesn't.
export const KURDISH_LETTERS = /[ڕڵێۆە]/;

const supertonicSpeaker = async (voice, { lang } = {}) => {
  const name = voice.slice("supertonic:".length).toUpperCase();
  const sid = SUPERTONIC_VOICES.indexOf(name);
  if (sid < 0) throw new Error(`${voice}: Supertonic's voices are ${SUPERTONIC_VOICES.join(", ")}`);
  if (lang && !SUPERTONIC_LANGS.includes(lang)) throw new Error(`Supertonic doesn't speak "${lang}". It speaks ${SUPERTONIC_LANGS.join(" ")}.`);
  const sherpa = await loadSherpa(voice);
  const dir = ensureModel(SUPERTONIC_MODEL, "vocoder.int8.onnx");
  const tts = new sherpa.OfflineTts({
    model: {
      supertonic: {
        durationPredictor: join(dir, "duration_predictor.int8.onnx"),
        textEncoder: join(dir, "text_encoder.int8.onnx"),
        vectorEstimator: join(dir, "vector_estimator.int8.onnx"),
        vocoder: join(dir, "vocoder.int8.onnx"),
        ttsJson: join(dir, "tts.json"),
        unicodeIndexer: join(dir, "unicode_indexer.bin"),
        voiceStyle: join(dir, "voice.bin"),
      },
      numThreads: THREADS,
    },
  });
  return {
    speak: async (text, speed = 1) => {
      if (KURDISH_LETTERS.test(text)) {
        throw new Error("Supertonic can't speak Kurdish (it would read it as Arabic). Use a gemini: voice or f5: for Sorani.");
      }
      const language = lang ?? (/[\u0600-\u06FF]/.test(text) ? "ar" : "en");
      const audio = tts.generate({
        text,
        sid,
        speed,
        generationConfig: new sherpa.GenerationConfig({ sid, speed, numSteps: 10, extra: { lang: language } }),
      });
      return { samples: Float32Array.from(audio.samples), sampleRate: audio.sampleRate };
    },
  };
};

// --- Gemini TTS ----------------------------------------------------------------------

// The free tier's TTS model when this was written (2026-11-18); "voiceModel" in
// story.json or GEMINI_TTS_MODEL picks another (gemini-3.8-flash-tts, ...).
export const GEMINI_MODEL = "gemini-3.1-flash-tts-preview";
export const GEMINI_VOICES =
  "Zephyr Puck Charon Kore Fenrir Leda Orus Aoede Callirrhoe Autonoe Enceladus Iapetus Umbriel Algieba Despina Erinome Algenib Rasalgethi Laomedeia Achernar Alnilam Schedar Gacrux Pulcherrima Achird Zubenelgenubi Vindemiatrix Sadachbia Sadaltager Sulafat".split(
    " ",
  );
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// Base64 audio anywhere in the reply: steps[].content[].data from the
// Interactions API, candidates[].content.parts[].inlineData from generateContent.
export const findAudio = (node) => {
  const found = [];
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const mime = value.mime_type ?? value.mimeType ?? "";
    if (typeof value.data === "string" && value.data.length > 64 && (!mime || /^audio\//i.test(mime))) found.push({ data: value.data, mime });
    for (const [key, child] of Object.entries(value)) if (key !== "data") walk(child);
  };
  walk(node);
  return found;
};

// One reply's audio as mono samples: WAV chunks (the default) or raw 16-bit PCM.
export const audioFrom = (json) => {
  const parts = findAudio(json).map(({ data, mime }) => {
    const buf = Buffer.from(data, "base64");
    if (buf.toString("ascii", 0, 4) === "RIFF") return parseWav(buf);
    const samples = new Float32Array(Math.floor(buf.length / 2));
    for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(i * 2) / 32768;
    return { samples, sampleRate: Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000) };
  });
  if (parts.length === 0) throw new Error(`gemini: the reply had no audio: ${JSON.stringify(json).slice(0, 300)}`);
  const total = parts.reduce((n, p) => n + p.samples.length, 0);
  const samples = new Float32Array(total);
  let at = 0;
  for (const part of parts) {
    samples.set(part.samples, at);
    at += part.samples.length;
  }
  return { samples, sampleRate: parts[0].sampleRate };
};

// Gemini has no speed setting; pace goes into the style instead.
const paceHint = (speed) =>
  speed >= 1.15 ? "speaking quickly" : speed >= 1.05 ? "speaking a little faster than usual" : speed <= 0.9 ? "speaking slowly" : speed <= 0.95 ? "speaking a little slower than usual" : "";

const geminiSpeaker = async (voice, { style, model } = {}) => {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(`${voice} needs a free Gemini API key: make one at https://aistudio.google.com/apikey and set GEMINI_API_KEY in the terminal (never in a project file).`);
  }
  const name = voice.slice("gemini:".length);
  if (!GEMINI_VOICES.includes(name)) console.log(`  (gemini: "${name}" isn't one of the 30 listed voices; trying it anyway)`);
  const base = process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta";
  const chosen = model ?? process.env.GEMINI_TTS_MODEL ?? GEMINI_MODEL;

  const post = async (url, body) => {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
      const text = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 6) {
        const hinted = Number(res.headers.get("retry-after")) || Number(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(text)?.[1]);
        const wait = Math.min(120, hinted || 15 * attempt);
        console.log(`  gemini: ${res.status === 429 ? "rate limit" : `server error ${res.status}`}, trying again in ${Math.round(wait)}s`);
        await sleep(wait * 1000);
        continue;
      }
      const error = new Error(`gemini ${res.status}: ${text.slice(0, 500)}`);
      error.status = res.status;
      throw error;
    }
  };

  return {
    speak: async (text, speed = 1) => {
      const delivery = [style, paceHint(speed)].filter(Boolean).join(", ");
      try {
        // The Interactions API, as documented on 2026-11-18.
        return audioFrom(
          await post(`${base}/interactions`, {
            model: chosen,
            input: [
              {
                type: "user_input",
                content: [{ type: "text", text, ...(delivery ? { annotations: [{ type: "speech_metadata", style: delivery }] } : {}) }],
              },
            ],
            response_format: { type: "audio" },
            generation_config: { speech_config: [{ voice: name }] },
          }),
        );
      } catch (error) {
        if (![400, 404].includes(error.status)) throw error;
        // The older generateContent route, for models or keys without Interactions.
        try {
          return audioFrom(
            await post(`${base}/models/${chosen}:generateContent`, {
              contents: [{ parts: [{ text: delivery ? `Say this, ${delivery}: ${text}` : text }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: name } } },
              },
            }),
          );
        } catch (second) {
          throw new Error(`${error.message}\nThe generateContent route failed too: ${second.message}`);
        }
      }
    },
  };
};

// --- Kokoro ---------------------------------------------------------------------------

// kokoro-js downloads its model from Hugging Face. Where it can't (the Claude
// app's cloud workspace blocks Hugging Face) or isn't installed, the same model
// runs through Python instead (kokoro-voice.py, model from GitHub).
// KOKORO_ENGINE=python goes straight to Python.
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const KOKORO_PY = fileURLToPath(new URL("kokoro-voice.py", import.meta.url));

export const kokoroSpeaker = () => {
  let tts;
  let python = process.env.KOKORO_ENGINE === "python";
  const viaPython = (text, voice, speed) => {
    const out = join(tmpdir(), `kokoro-${process.pid}-${Date.now()}.wav`);
    try {
      execFileSync(PYTHON, [KOKORO_PY], {
        input: JSON.stringify({ voice, speed, lines: [{ text, out }] }),
        stdio: ["pipe", "inherit", "inherit"],
      });
    } catch (error) {
      throw new Error(`Kokoro through Python failed (${PYTHON} ${KOKORO_PY}). It needs: ${PYTHON} -m pip install kokoro-onnx soundfile\n${error.message}`);
    }
    const audio = parseWav(readFileSync(out));
    rmSync(out, { force: true });
    return audio;
  };
  return {
    speak: async (text, voice, speed = 1) => {
      if (!python) {
        try {
          if (!tts) {
            const { KokoroTTS } = await import("kokoro-js");
            tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
          }
          const audio = await tts.generate(text, { voice, speed });
          return { samples: audio.audio, sampleRate: audio.sampling_rate };
        } catch (error) {
          if (tts) throw error;
          console.log(`  kokoro-js couldn't load (${error.message.split("\n")[0]}): using Kokoro through Python instead`);
          python = true;
        }
      }
      return viaPython(text, voice, speed);
    },
  };
};

// --- What each voice may be used for ------------------------------------------------

// One line per voice for the samples list, the brief and the delivery message.
export const licenceOf = (voice) => {
  const engine = engineOf(voice);
  const name = voice.split(":")[1] ?? "";
  if (engine === "kokoro") return "Kokoro, Apache-2.0: fine for client work";
  if (engine === "pocket") {
    if (AUDIO_FILE.test(name)) return "Pocket, a copied voice: only with the speaker's permission; model CC BY 4.0 (credit Kyutai)";
    if (name === "alba") return "Pocket, voice CC BY 4.0 (credit Alba Mackenna), model CC BY 4.0 (credit Kyutai): fine for client work";
    if (POCKET_PRESETS[name]) return "Pocket, voice CC0, model CC BY 4.0 (credit Kyutai): fine for client work";
    return "Pocket demo clip: for trying only, not for client work";
  }
  if (engine === "supertonic") return "Supertonic, OpenRAIL-M: client work allowed, but no imitating real people and label it as an AI voice";
  if (engine === "gemini") return "Gemini free tier: Google may read and keep the text to improve its products, so no confidential scripts";
  if (engine === "edge") return "Edge read-aloud: personal videos; for client work use the same voice through Azure Speech (paid)";
  if (/^f5:/.test(voice)) return "F5 Central Kurdish, CC BY-NC-ND 4.0: personal videos only";
  if (/^mms:/.test(voice)) return "MMS, non-commercial: a stand-in while building";
  return "a recording: check who owns it";
};

// --- One entry point -------------------------------------------------------------------

// A speaker for any voice handled here: speak(text, speed) gives mono samples.
export const makeSpeaker = async (voice, options = {}) => {
  const engine = engineOf(voice);
  if (engine === "pocket") return pocketSpeaker(voice);
  if (engine === "supertonic") return supertonicSpeaker(voice, options);
  if (engine === "gemini") return geminiSpeaker(voice, options);
  throw new Error(`${voice} isn't a pocket:, supertonic: or gemini: voice`);
};
