# Remotion reference

How Remotion itself works: the API facts, components, packages and gotchas behind every Remotion build. This folder replaces Remotion's separate agent skills, so nothing else needs installing. It was written for this skill in its own words from Remotion's public guidance as of Remotion 4.0.547 (November 2026); API names, props, flags and package names are Remotion's. Open only the file the task needs.

## Which file

| File | Read it when |
| --- | --- |
| `setup-and-upkeep.md` | a project won't start, the Studio misbehaves, Remotion needs upgrading, an API detail needs the current docs, or someone asks about the licence |
| `animation-timing.md` | writing any moving value: `interpolate`, clamping, `Easing.bezier` and `Easing.spring`, several keyframes, values Studio can edit |
| `animation-sequencing.md` | placing or trimming things in time: the timing props and their order, `<Sequence>`, `<Series>`, `<TransitionSeries>`, many-scene videos |
| `animation-transitions.md` | joining scenes: the presentations, timing, overlays, custom presentations, the total length |
| `animation-motion-blur.md` | a fast move needs real blur |
| `look-effects.md` | any effect: the `effects` prop, the full effect list, light leaks, `<HtmlInCanvas>`, custom effects, turning on WebGL for renders |
| `look-color.md` | grading footage: colour correction, levels, curves, LUTs |
| `text-rtl.md` | animating Kurdish or Arabic text by hand (letter reveals, joining, direction) |
| `text-layout.md` | marking words on screen (highlight, circle, underline) or fitting text into a space |
| `fonts.md` | a font beyond what `setup-project.mjs` wrote |
| `images-gifs-lottie.md` | pictures, cropping, stickers, GIFs, Lottie |
| `3d.md` | a 3D shot with `@remotion/three` |
| `audio.md` | placing, trimming or fading sound, dead air at a clip's ends, audio drawn as bars or a wave |
| `video-clips.md` | the person's own clips, a timeline of clips, cutting a person out of the background, trimming with FFmpeg |
| `project-compositions.md` | another format, a second cut or a thumbnail, a length that follows a file, Zod props forms, a scene with its own Studio timeline |
| `captions.md` | Remotion's own caption tools: Whisper, `.srt` import, captions editable in Studio |
| `media-info.md` | a length or size that should follow a media file (Mediabunny) |
| `render.md` | unusual render flags, a transparent video (ProRes 4444 or WebM), an OpenTimelineIO export for Resolve or Premiere |
| `interactivity.md` | writing a composition someone will edit in Studio |
| `maps.md` | a 2D map: which technique is free (MapLibre, static) and which needs a key, routes and markers, render stability |
| `maps-3d.md` | a real 3D flight with CesiumJS |
| `elements.md` | Remotion Elements: ready-made components added from a URL |
| `apps.md` | a video inside an app: `<Player>`, rendering from Node, cloud rendering |

Screen recordings of a real site or app: `../screen-demo.md`.

## When these files and the pipeline disagree

This skill's own files (SKILL.md, production.md, motion.md, music.md, the scripts and the template) are tested on the author's Windows PC, so they win for anything they cover. Remotion's general advice says otherwise in these places, on purpose:

- **Browser:** `render.mjs` and `stills.mjs` switch to the installed Chrome or Edge when Remotion can't download its own. Keep that.
- **Stills:** use `stills.mjs`, not `render --frames`, once scenes have audio (production.md, "Pitfalls"). Exception: map, Cesium, effects and 3D scenes need WebGL, so use `npx remotion still ... --gl=angle` for those, and render with `node scripts/render.mjs -- --gl=angle --concurrency=1`.
- **WebGL:** effects, light leaks, `<HtmlInCanvas>` in WebGL mode, 3D and maps need `Config.setChromiumOpenGlRenderer("angle")` in `remotion.config.ts`. The template doesn't set it; add it the first time a project uses one of them.
- **Captions:** this pipeline keeps captions in JSON (`voice.json`, `transcribe.mjs`, `cut-silence.mjs`), so they aren't editable in Studio's caption editor. `captions.md` covers Studio-editable captions for when the person wants that.
- **Transcription:** `scripts/transcribe.mjs` runs on the CPU. `@remotion/whisper-webgpu` needs a GPU this PC doesn't have.
- **Sound effects:** downloaded into `public/sfx/` and played with `<Sfx>`, not streamed from remotion.media.
- **Fonts for Kurdish:** Cairo and Tajawal, which Remotion suggests for Arabic, lack Sorani letters. Use production.md's checked list.
- **Text size and margins:** styles.md's minimums and safe zones win.
- **Editable in Studio:** the template computes motion in `motion.ts` helpers and builds scenes with `.map()`, so Studio shows those values read-only. That is fine. When the person will edit in Studio, follow `interactivity.md` for the parts they'll touch.
- **Motion blur and light leaks:** the current APIs are the transition `motionBlur` prop, `<HtmlInCanvasMotionBlur>` and `lightLeak()` from `@remotion/effects/light-leak` (4.0.500 and up). The older `<CameraMotionBlur>`, `<Trail>` and `@remotion/light-leaks` still work in older projects.
- **Images:** Remotion now names `<CanvasImage>` its default image component; the template's `<Img>` still works.
- **Versions:** much of the newer API needs Remotion 4.0.5xx. `setup-project.mjs` installs the latest; an older project may need `setup-and-upkeep.md`, "Upgrading".

## Always

- Preserve the person's own edits. If they changed code outside the chat, build on it; assume it was on purpose or ask.
- Drive every animation from `useCurrentFrame()`. CSS transitions, CSS animations and Tailwind animation classes don't render.
- Open the Studio preview early; render a file only when asked or when delivering.
