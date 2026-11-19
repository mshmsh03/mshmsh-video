"""Speaks lines with Kokoro through Python (kokoro-onnx), for machines where
kokoro-js can't download its model from Hugging Face (the Claude app's cloud
workspace blocks it). Same Kokoro v1.0 model and voices, fetched once from
GitHub into the shared model cache. make-voice.mjs and voice-samples.mjs call
it on their own when kokoro-js fails.

Input on stdin: {"voice": "af_heart", "speed": 1.0, "lines": [{"text": "...", "out": "x.wav"}]}
Needs: python -m pip install kokoro-onnx soundfile
"""

import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

MODELS = Path(os.environ.get("VIDEO_XOSHAKA_MODELS") or Path.home() / ".cache" / "video-xoshaka" / "models")
DIR = MODELS / "kokoro-onnx-v1.0"
# Where each file comes from: this repo's free-assets release first, then the original.
FREE = json.loads(Path(__file__).with_name("free-assets.json").read_text(encoding="utf-8"))
RELEASE = os.environ.get("VIDEO_XOSHAKA_ASSETS") or FREE["release"]


def fetch(name):
    path = DIR / name
    if path.exists():
        return path
    DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {name} (once) into {DIR}", file=sys.stderr)
    entry = next(f for f in FREE["files"] if f["name"] == name)
    part = path.with_name(path.name + ".part")
    failure = None
    for url in (f"{RELEASE}/{name}", entry["from"]):
        try:
            with urllib.request.urlopen(url, timeout=60) as response, open(part, "wb") as out:
                shutil.copyfileobj(response, out, 1 << 20)
            part.replace(path)
            return path
        except OSError as error:  # urllib's HTTP and network errors are OSErrors
            failure = error
    part.unlink(missing_ok=True)
    sys.exit(f"Couldn't download {name}: {failure}")


def main():
    try:
        import soundfile
        from kokoro_onnx import Kokoro
    except ImportError:
        sys.exit("Kokoro through Python needs: python -m pip install kokoro-onnx soundfile")
    job = json.load(sys.stdin)
    voice = job["voice"]
    kokoro = Kokoro(str(fetch("kokoro-v1.0.onnx")), str(fetch("voices-v1.0.bin")))
    # British voices start with b (bf_emma), American ones with a (af_heart).
    lang = "en-gb" if voice.startswith("b") else "en-us"
    for line in job["lines"]:
        samples, rate = kokoro.create(line["text"], voice=voice, speed=float(job.get("speed") or 1.0), lang=lang)
        soundfile.write(line["out"], samples, rate)


if __name__ == "__main__":
    main()
