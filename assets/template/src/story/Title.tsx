import type React from "react";
import {
  Interactive,
  interpolate,
  interpolateColors,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useLayout } from "../layout";
import { colors, headingFont } from "../theme";
import { ease } from "./motion";
import { dirOf, isRtl } from "./text";

type Entrance = "words" | "line" | "grey" | "rise" | "none";

type TitleProps = {
  readonly text: string;
  // Seconds into the scene when it starts. Time it to a word: wordAt(id, "…").
  readonly at?: number;
  // How it enters (motion.md, "Titles"). Vary it within a video:
  // - "words": each word sharpens in from a blur, 0.067 s apart, no movement
  // - "line":  the whole line sharpens in at once
  // - "grey":  each word turns from light grey to the ink colour
  // - "rise":  fades and rises (the template's old default; use it sparingly)
  readonly entrance?: Entrance;
  // Seconds into the scene when it leaves (a quick blur-out). Leave it out to
  // hold until the scene ends.
  readonly outAt?: number;
  // Words drawn in the accent colour: one carries the meaning.
  readonly accent?: string | readonly string[];
  readonly size?: number;
  readonly color?: string;
  readonly top?: number;
  readonly align?: "start" | "center";
  readonly weight?: number;
  readonly style?: React.CSSProperties;
};

// A title that lands and then holds dead still. Arabic and Kurdish titles enter
// word by word or as a line, never letter by letter, which would break the
// joined letters.
export const Title: React.FC<TitleProps> = ({
  text,
  at = 0.2,
  entrance = "words",
  outAt,
  accent,
  size,
  color = colors.text,
  top,
  align = "center",
  weight = 700,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const start = at * fps;
  const accents = (typeof accent === "string" ? [accent] : (accent ?? [])).map(
    (a) => a.toLowerCase(),
  );
  const words = text.split(/\s+/).filter(Boolean);
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const leave =
    outAt === undefined
      ? 0
      : interpolate(frame, [outAt * fps, outAt * fps + 0.15 * fps], [0, 1], {
          ...clamp,
          easing: ease.exit,
        });

  const whole =
    entrance === "line"
      ? interpolate(frame, [start, start + 0.18 * fps], [0, 1], {
          ...clamp,
          easing: ease.arrive,
        })
      : entrance === "rise"
        ? interpolate(frame, [start, start + 0.6 * fps], [0, 1], {
            ...clamp,
            easing: ease.arrive,
          })
        : 1;

  return (
    <Interactive.Div
      name="Title"
      style={{
        position: top === undefined ? "relative" : "absolute",
        top,
        left: top === undefined ? undefined : layout.left,
        right: top === undefined ? undefined : layout.right,
        direction: dirOf(text),
        textAlign: align,
        fontFamily: headingFont,
        fontSize: size ?? layout.titleSize,
        fontWeight: weight,
        lineHeight: 1.05,
        letterSpacing: isRtl(text) ? "normal" : "-0.02em",
        color,
        opacity:
          (entrance === "line" || entrance === "rise" ? whole : 1) *
          (1 - leave),
        filter:
          entrance === "line"
            ? `blur(${(1 - whole) * 8}px)`
            : leave > 0
              ? `blur(${leave * 8}px)`
              : undefined,
        translate:
          entrance === "rise" ? `0px ${(1 - whole) * 40}px` : undefined,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const wStart = start + i * 0.067 * fps;
        const t =
          entrance === "words" || entrance === "grey"
            ? interpolate(frame, [wStart, wStart + 0.13 * fps], [0, 1], {
                ...clamp,
                easing: ease.arrive,
              })
            : 1;
        const isAccent = accents.includes(
          word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""),
        );
        const ink = isAccent ? colors.accent : color;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: entrance === "words" ? t : 1,
              filter:
                entrance === "words" && t < 1
                  ? `blur(${(1 - t) * 6}px)`
                  : undefined,
              color:
                entrance === "grey"
                  ? interpolateColors(t, [0, 1], [colors.muted, ink])
                  : ink,
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </Interactive.Div>
  );
};
