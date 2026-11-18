import type React from "react";
import {
  Interactive,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { headingFont, monoFont } from "../theme";
import { Sfx } from "./Sfx";
import { dirOf, letterSpacingFor } from "./text";

type StampProps = {
  // Seconds into the scene: time it to the word, wordAt(id, "pressure") + 0.25.
  readonly at: number;
  readonly text: string;
  // A smaller second line ("sleep: not invited").
  readonly note?: string;
  readonly color?: string;
  readonly rotate?: number;
  // Keeps shaking after it lands, for "STRESS LEVEL: 99%".
  readonly shake?: boolean;
  readonly size?: number;
  readonly sound?: string | null;
  readonly style?: React.CSSProperties;
};

// A rubber stamp slammed onto the frame: the funny style's deadpan stamp and
// stress stamp (story-and-comedy.md, the gag table).
export const Stamp: React.FC<StampProps> = ({
  at,
  text,
  note,
  color = "#E5534B",
  rotate = -8,
  shake = false,
  size = 72,
  sound = "sfx/vine-boom.wav",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = Math.round(at * fps);
  const boom = sound ? (
    <Sfx src={sound} at={hit} volume={0.5} name="Stamp" />
  ) : null;
  if (frame < hit) return <>{boom}</>;
  const scale = interpolate(frame, [hit, hit + 3], [2.2, 1], {
    extrapolateRight: "clamp",
  });
  const jitter = shake
    ? 5
    : interpolate(frame, [hit + 3, hit + 9], [6, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const dx = (random(`sx${frame}`) - 0.5) * 2 * jitter;
  const dy = (random(`sy${frame}`) - 0.5) * 2 * jitter;

  return (
    <>
      {boom}
      <Interactive.Div
        name="Stamp"
        style={{
          position: "absolute",
          padding: `${size * 0.22}px ${size * 0.42}px`,
          border: `${Math.max(6, size * 0.1)}px solid ${color}`,
          borderRadius: size * 0.16,
          color,
          direction: dirOf(text),
          fontFamily: headingFont,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: letterSpacingFor(text, "0.04em"),
          textAlign: "center",
          rotate: `${rotate}deg`,
          scale: String(scale),
          translate: `${dx}px ${dy}px`,
          mixBlendMode: "normal",
          ...style,
        }}
      >
        {text}
        {note ? (
          <div
            style={{
              marginTop: size * 0.2,
              fontFamily: monoFont,
              fontSize: size * 0.45,
              fontWeight: 500,
            }}
          >
            {note}
          </div>
        ) : null}
      </Interactive.Div>
    </>
  );
};
