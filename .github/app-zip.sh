#!/usr/bin/env bash
# Builds the Claude app copy of the skill in <out>/mshmsh-video and fails if it
# has more than 200 files (the Claude app's limit for an uploaded skill zip).
# The app copy leaves out what only runs in Claude Code on a PC: the test cases
# in evals/, and HyperFrames' scripts, sounds, fonts and test files, plus the
# reverse-any-video and remotion-to-hyperframes guides (both need the CLI to
# render and compare frames). Every HyperFrames guide that plans a video stays.
# Usage, from the repo root: bash .github/app-zip.sh <out>
set -euo pipefail
out="${1:?usage: app-zip.sh <out-dir>}"
dir="$out/mshmsh-video"
rm -rf "$dir"
mkdir -p "$dir"
git archive HEAD | tar -x -C "$dir"
cd "$dir"
rm -rf .github .gitignore .gitattributes evals
rm -rf hyperframes/reverse-any-video hyperframes/remotion-to-hyperframes
find hyperframes -type f ! -name '*.md' ! -name LICENSE -delete
find hyperframes -depth -type d -empty -delete
count=$(find . -type f | wc -l)
echo "Claude app copy: $count files (limit 200)"
if [ "$count" -gt 200 ]; then
  echo "::error::The Claude app copy has $count files; the app takes at most 200. Leave more out in .github/app-zip.sh."
  exit 1
fi
