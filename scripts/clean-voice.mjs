// Cleans a voice recording: takes out background noise (hum, hiss, fans,
// traffic, room tone) with DPDFNet, a 10 MB speech-enhancement model by Ceva
// (Apache-2.0) that runs offline at 48 kHz through sherpa-onnx-node, so the
// voice keeps its full range. On a phone-style test (pink noise and mains hum
// under a voice) DNSMOS rated the noisy take 2.98, the cleaned one 3.44 and the
// clean original 3.48; ffmpeg's RNNoise filter reached 3.21.
//
// make-voice.mjs runs it on every "recorded" scene by itself ("clean": false in
// story.json turns that off). By hand:
//
//   node scripts/clean-voice.mjs <file>                 <file>-clean.wav, or for a
//                                                       video <file>-clean.mp4 (picture copied)
//   node scripts/clean-voice.mjs <file> <out>           a chosen output
//   node scripts/clean-voice.mjs <folder> [out-folder]  every audio and video file in it
//   --keep <dB>   remove at most this much noise: 12 to 24 leaves a natural room tone
//
// It only removes noise. It can't fix a voice that is too far from the phone,
// clipped, or talked over by someone else: ask for a new take in a quiet room.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, fetchAsset, loadSherpa, MODELS, npx, THREADS, writeWav } from "./voice-engines.mjs";

export const CLEAN_MODEL = "dpdfnet2_48khz_hr.onnx";
const RATE = 48000;
const AUDIO = /\.(wav|flac|mp3|m4a|aac|ogg|opus|webm|mp4|mov|mkv)$/i;
const VIDEO = /\.(mp4|mov|mkv|webm)$/i;

const denoisers = new Map();
const denoiser = async (keep) => {
  const key = keep ?? 0;
  if (!denoisers.has(key)) {
    const sherpa = await loadSherpa("Cleaning a recording");
    const model = fetchAsset(CLEAN_MODEL, join(MODELS, "denoise"));
    denoisers.set(
      key,
      new sherpa.OfflineSpeechDenoiser({
        model: { dpdfnet: { model, ...(keep ? { attenuationLimitDb: keep } : {}) }, numThreads: THREADS, debug: 0 },
      }),
    );
  }
  return denoisers.get(key);
};

// Mono samples at 48 kHz in, cleaned samples at 48 kHz out.
export const cleanSamples = async (samples, keep) => (await denoiser(keep)).run({ samples, sampleRate: RATE }).samples;

const hasVideo = (file) => {
  if (!VIDEO.test(file)) return false;
  try {
    return execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=codec_type", "-of", "csv=p=0", file])
      .toString()
      .includes("video");
  } catch {
    return /\.(mp4|mov|mkv)$/i.test(file);
  }
};

const ffmpeg = (args) => {
  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    npx(["remotion", "ffmpeg", ...args], { stdio: ["ignore", "ignore", "inherit"] });
  }
};

// Cleans one file. Audio comes out as a 48 kHz mono WAV; a video keeps its
// picture untouched and gets the cleaned sound.
export const cleanFile = async (file, out, keep) => {
  const video = hasVideo(file);
  const target = out ?? join(dirname(file), `${basename(file, extname(file))}-clean.${video ? "mp4" : "wav"}`);
  mkdirSync(dirname(target), { recursive: true });
  const cleaned = await cleanSamples(decode(file, RATE), keep);
  if (!video) {
    writeWav(target, cleaned, RATE);
    return target;
  }
  const wav = join(tmpdir(), `clean-${process.pid}.wav`);
  writeWav(wav, cleaned, RATE);
  ffmpeg(["-v", "error", "-y", "-i", file, "-i", wav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", target]);
  rmSync(wav, { force: true });
  return target;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--keep");
  const keep = i >= 0 ? Number(args[i + 1]) : undefined;
  const [input, output] = args.filter((a, k) => !a.startsWith("--") && (i < 0 || k !== i + 1));
  if (!input || !existsSync(input)) {
    console.log("Usage: node scripts/clean-voice.mjs <file or folder> [out] [--keep <dB>]");
    process.exit(1);
  }
  const files = statSync(input).isDirectory()
    ? readdirSync(input).filter((f) => AUDIO.test(f) && !/-clean\.(wav|mp4)$/.test(f)).map((f) => join(input, f))
    : [input];
  if (files.length === 0) throw new Error(`No audio or video files in ${input}`);
  const folder = statSync(input).isDirectory() ? (output ?? join(dirname(input), `${basename(input)}-clean`)) : null;
  for (const file of files) {
    const started = Date.now();
    const target = folder
      ? join(folder, `${basename(file, extname(file))}.${hasVideo(file) ? "mp4" : "wav"}`)
      : output;
    const done = await cleanFile(file, target, keep);
    console.log(`${file} -> ${done} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  }
  console.log("DPDFNet by Ceva, Apache-2.0. Listen before using: it can't fix a distant, clipped or talked-over voice.");
}
