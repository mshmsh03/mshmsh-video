import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type Platform, PlatformContext } from "../layout";
import { colors, monoFont } from "../theme";
import { findMusic } from "./media";
import { Placeholder } from "./Placeholder";
import { SCENES } from "./scenes";
import { Sfx } from "./Sfx";
import story from "./story.json";
import { IS_DRAFT_VOICE, STORY_VOICE, wordAt } from "./voice";

// The timeline, built from story.json and voice.json: you shouldn't need to
// edit this file. Scenes are written in scenes.tsx; their order, transitions,
// music and silences come from story.json:
//
//   "music": { "start": "<scene id>", "gain": 0.5, "duck": 0.6, "offset": 12.3, "fadeOut": 3 }
//     start:  the scene the music bed starts on (default: the first)
//     gain:   10 ** ((-24 - trackRmsDb) / 20), about -24 dBFS between lines (music.md)
//     duck:   how far it dips under the narrator (0.6 is about 8 dB)
//     offset: seconds into the track to start from, its strongest section (hf audio --only sections)
//   per scene:
//     "enter": "fade" (default) | "slide" | "wipe" | "cut" — the transition into it.
//              slide and wipe get a whoosh; a cut has no overlap. Change it, then re-run make-voice.
//     "silence": "<word>" or { "word": "…", "after": 0.3, "seconds": 1.3 } — the music cuts out on it.
//     "board": the storyboard's "on screen" line, shown while the scene is a placeholder.

type Enter = "fade" | "slide" | "wipe" | "cut";
type Silence =
  | string
  | {
      readonly word: string;
      readonly after?: number;
      readonly seconds?: number;
    };
type StoryScene = {
  readonly id: string;
  readonly enter?: Enter;
  readonly silence?: Silence;
  readonly board?: string;
};
type MusicConfig = {
  readonly start?: string;
  readonly gain?: number;
  readonly duck?: number;
  readonly offset?: number;
  readonly fadeOut?: number;
};
type StoryFile = {
  readonly direction?: "ltr" | "rtl";
  readonly music?: MusicConfig;
  readonly scenes: readonly StoryScene[];
};

const STORY = story as unknown as StoryFile;
const WHOOSHES = ["sfx/whoosh.wav", "sfx/whoosh-2.wav", "sfx/whoosh-3.wav"];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

const storyScene = (id: string): StoryScene =>
  STORY.scenes.find((s) => s.id === id) ?? { id };

export const StoryVideo: React.FC<{ readonly platform?: Platform }> = ({
  platform,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const T = STORY_VOICE.transitionFrames;
  const forward = STORY.direction === "rtl" ? "from-left" : "from-right";
  const startFrame = (id: string) => {
    const scene = STORY_VOICE.scenes.find((s) => s.id === id);
    return scene ? Math.round(scene.startSeconds * fps) : 0;
  };

  // Music: one bed under the whole video from music.start, dipping under every
  // line, cutting out on the silences, fading over the last seconds.
  const music = findMusic();
  const cfg = STORY.music ?? {};
  const gain = cfg.gain ?? 0.5;
  const duck = cfg.duck ?? 0.6;
  const musicStart = cfg.start ? startFrame(cfg.start) : 0;
  const silences = STORY.scenes.flatMap((s) => {
    if (!s.silence) return [];
    const {
      word,
      after = 0.3,
      seconds = 1.3,
    } = typeof s.silence === "string" ? { word: s.silence } : s.silence;
    const at = Math.round(
      (startFrame(s.id) / fps + wordAt(s.id, word) + after) * fps,
    );
    return [{ at, seconds }];
  });
  const talking = Math.max(
    0,
    ...STORY_VOICE.scenes.map((s) => {
      const from = s.startSeconds * fps + s.voiceFrom;
      const to = from + s.voiceSeconds * fps;
      return s.voiceSeconds > 0
        ? Math.min(
            smoothstep((frame - from + 6) / 6),
            smoothstep((to - frame + 10) / 10),
          )
        : 0;
    }),
  );
  const silence = Math.min(
    1,
    ...silences.map(({ at, seconds }) =>
      interpolate(
        frame,
        [at - 2, at, at + seconds * fps, at + (seconds + 0.5) * fps],
        [1, 0, 0, 1],
        clamp,
      ),
    ),
  );
  const ending = interpolate(
    frame,
    [durationInFrames - (cfg.fadeOut ?? 3) * fps, durationInFrames - 1],
    [1, 0],
    clamp,
  );
  const musicVolume = gain * (1 - duck * talking) * silence * ending;

  let whoosh = 0;
  const timeline = STORY_VOICE.scenes.flatMap((s, i) => {
    const enter = storyScene(s.id).enter ?? "fade";
    const Scene = SCENES[s.id];
    const items: React.ReactElement[] = [];
    if (i > 0 && enter !== "cut") {
      const timing = linearTiming({ durationInFrames: T });
      const key = `t-${s.id}`;
      items.push(
        enter === "slide" ? (
          <TransitionSeries.Transition
            key={key}
            presentation={slide({ direction: forward })}
            timing={timing}
          />
        ) : enter === "wipe" ? (
          <TransitionSeries.Transition
            key={key}
            presentation={wipe({ direction: forward })}
            timing={timing}
          />
        ) : (
          <TransitionSeries.Transition
            key={key}
            presentation={fade()}
            timing={timing}
          />
        ),
      );
    }
    items.push(
      <TransitionSeries.Sequence
        key={s.id}
        name={s.id}
        durationInFrames={s.durationInFrames}
        premountFor={fps}
      >
        {Scene ? (
          <Scene />
        ) : (
          <Placeholder id={s.id} board={storyScene(s.id).board} index={i} />
        )}
      </TransitionSeries.Sequence>,
    );
    return items;
  });

  return (
    <PlatformContext.Provider value={platform ?? null}>
      <AbsoluteFill style={{ backgroundColor: colors.background }}>
        <TransitionSeries>{timeline}</TransitionSeries>
        {music ? (
          <Audio
            name="Music"
            src={music.src}
            from={musicStart}
            trimBefore={Math.round((cfg.offset ?? 0) * fps)}
            volume={musicVolume}
            premountFor={fps}
          />
        ) : null}
        {STORY_VOICE.scenes.map((s, i) => {
          const enter = storyScene(s.id).enter ?? "fade";
          if (i === 0 || (enter !== "slide" && enter !== "wipe")) return null;
          return (
            <Sfx
              key={s.id}
              name={`Whoosh into ${s.id}`}
              src={WHOOSHES}
              take={whoosh++}
              at={startFrame(s.id) + Math.floor(T / 3)}
              volume={0.35}
            />
          );
        })}
        {IS_DRAFT_VOICE ? (
          <div
            style={{
              position: "absolute",
              left: 24,
              top: 24,
              padding: "6px 14px",
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontFamily: monoFont,
              fontSize: 30,
            }}
          >
            draft timing · silent voice
          </div>
        ) : null}
      </AbsoluteFill>
    </PlatformContext.Provider>
  );
};
