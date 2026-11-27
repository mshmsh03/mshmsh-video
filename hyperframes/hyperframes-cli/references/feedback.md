<!-- Modified for mshmsh-video: see hyperframes/NOTICE.md -->

# Feedback reports

mshmsh-video never sends usage events or feedback reports; telemetry stays off (`HYPERFRAMES_NO_TELEMETRY=1`).

For reference only: the CLI's `feedback` command (`--rating <0-10>`, `--comment`, `--search-miss`, `--file-issue`) sends a report to HeyGen's maintainers, linked to the HeyGen account when signed in; `--file-issue` also publishes a minimal repro to a public URL. Under mshmsh-video it is never run.
