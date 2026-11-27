# NOTICE

The files in this `hyperframes/` folder come from HeyGen's HyperFrames project:

- Source: https://github.com/heygen-com/hyperframes (folder `skills/`)
- Commit: `4c92e37a708662240c1a96d53d0565332a1aea8d`, taken 2026-11-27
- Copyright HeyGen. Licensed under the Apache License, Version 2.0 (see `LICENSE` in this folder).
  The rest of mshmsh-video is under its own MIT licence; this folder stays under Apache-2.0.

## Included

Seven HeyGen skills, copied as guides inside mshmsh-video (not installed as separate skills):
`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `remotion-to-hyperframes`,
`reverse-any-video`, `style-sampling`.

Not included: HeyGen's `figma` and `slideshow` skills.

## Changes made for mshmsh-video

Every changed file is listed here, as Apache-2.0 section 4(b) asks. Changed Markdown files also carry
the line `<!-- Modified for mshmsh-video: see hyperframes/NOTICE.md -->` near the top.

Throughout:

- Each skill's `SKILL.md` was renamed to `GUIDE.md`, so skill installers and Claude Code do not load
  these as separate skills. The text of the seven `GUIDE.md` files is otherwise as listed below.
- The usage beacon (`npx hyperframes events --skill=...`), the `skill_completed` event and the
  `feedback` / `--search-miss` reports were removed. mshmsh-video never sends usage events or feedback
  reports; telemetry stays off (`HYPERFRAMES_NO_TELEMETRY=1`). Factual descriptions of the CLI's
  telemetry and `feedback` command were kept.
- No script logic was changed.

Files:

| File | What changed |
|---|---|
| `hyperframes/GUIDE.md` (was `SKILL.md`) | `<SKILLS>` defined as mshmsh-video's `hyperframes/` folder; beacon removed for the telemetry line; added the "Inside mshmsh-video" note (sibling = `<SKILLS>/<name>/GUIDE.md`, figma/slideshow not included, never install skills); deck/Figma pointers marked not included |
| `hyperframes-cli/GUIDE.md` (was `SKILL.md`) | Same header changes; `present` row marks `/slideshow` not included; after-render `feedback` instruction replaced by the telemetry line |
| `hyperframes-registry/GUIDE.md` (was `SKILL.md`) | Same header changes; "nothing fits" now tells the person instead of sending `feedback --search-miss` |
| `media-use/GUIDE.md` (was `SKILL.md`) | Same header changes |
| `remotion-to-hyperframes/GUIDE.md` (was `SKILL.md`) | Same header changes |
| `reverse-any-video/GUIDE.md` (was `SKILL.md`) | Same header changes |
| `style-sampling/GUIDE.md` (was `SKILL.md`) | Same header changes |
| `hyperframes/references/plugin-installation.md` | `<SKILLS>` redefined for mshmsh-video; beacon mention removed; skill-update advice replaced; "Plugin installs" section rewritten to say mshmsh-video always runs the launcher in standalone mode |
| `hyperframes/references/skill-lifecycle.md` | Core/on-demand lists replaced by included/not-included; `skills` commands marked as HeyGen's install path not to run; `npx skills add` line replaced; launcher location named |
| `hyperframes/references/format.md` | `SKILL.md` -> `GUIDE.md` |
| `hyperframes/references/sound.md` | `SKILL.md` -> `GUIDE.md` |
| `hyperframes/references/look.md` | `/figma` and `/slideshow` marked not included |
| `hyperframes/references/types/launch.md` | `/figma` marked not included |
| `hyperframes-cli/references/feedback.md` | Feedback-report instructions replaced by the telemetry line plus a factual note on the `feedback` command |
| `hyperframes-cli/references/preview-render.md` | "feedback (report after rendering)" section replaced by the telemetry line plus a factual note |
| `hyperframes-cli/references/init-and-scaffold.md` | Skill-install advice replaced ("already included in mshmsh-video"); `media-use` skill pointer -> `<SKILLS>/media-use/GUIDE.md` |
| `hyperframes-cli/references/upgrade-info-misc.md` | Standalone/plugin wording -> "from mshmsh-video"; `media-use` skill pointer -> its guide |
| `hyperframes-cli/references/unattended.md` | "reverse-any-video skill" -> `/reverse-any-video` guide |
| `hyperframes-registry/references/search.md` | `feedback --search-miss` reporting replaced by telling the person plus the telemetry line |
| `hyperframes-registry/references/discovery.md` | `SKILL.md` -> `GUIDE.md` |
| `media-use/audio/references/bgm.md` | `../../SKILL.md` -> `../../GUIDE.md` |
| `media-use/audio/references/tts.md` | `../../SKILL.md` -> `../../GUIDE.md` |
| `media-use/audio/references/captions/motion.md` | `SKILL.md` -> `GUIDE.md` |
| `media-use/references/heygen.md` | `SKILL.md` -> `GUIDE.md` |
| `media-use/references/setup-providers.md` | `SKILL.md` -> `GUIDE.md` |
| `remotion-to-hyperframes/references/limitations.md` | "media-use skill's mixing reference" -> `<SKILLS>/media-use/references/mixing.md` |
| `remotion-to-hyperframes/scripts/tests/boxSizing.test.mjs` | Reads `GUIDE.md` instead of `SKILL.md` (path fix only) |
| `reverse-any-video/references/start.md` | `skill_completed` event instructions removed for the telemetry line |
| `style-sampling/references/remix.md` | `SKILL.md` -> `GUIDE.md`; "hyperframes skill" and "style-sampling skill" pointers -> mshmsh-video guides |

Comments inside other scripts that mention `SKILL.md` (for example in `media-use/audio/scripts/`) were
left as they are; read them as the folder's `GUIDE.md`.
