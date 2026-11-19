import { Video } from "@remotion/media";
import type React from "react";
import { interpolate, Series, staticFile, useVideoConfig } from "remotion";

// What scripts/cut-silence.mjs writes next to a clip: the parts to keep, in
// seconds of the original.
export type Cuts = {
  readonly src: string;
  readonly parts: readonly { readonly from: number; readonly to: number }[];
};

const frames = (part: Cuts["parts"][number], fps: number) =>
  Math.max(1, Math.round(part.to * fps) - Math.round(part.from * fps));

// How long the cut plays, in frames: the scene's length.
export const cutLength = (cuts: Cuts, fps: number) =>
  cuts.parts.reduce((total, part) => total + frames(part, fps), 0);

// A talking clip with its pauses cut out, played straight from the original
// file part by part, so loosening a cut is an edit to the JSON, not a
// re-render. Each part fades its sound over one frame so the cuts don't click.
// It fills its parent, so size it with a wrapper (a device frame, a padded
// box) like any clip.
export const CutClip: React.FC<{
  readonly cuts: Cuts;
  readonly volume?: number;
  readonly muted?: boolean;
  readonly style?: React.CSSProperties;
}> = ({ cuts, volume = 1, muted = false, style }) => {
  const { fps } = useVideoConfig();
  return (
    // A positioned box, so each part fills the parent's content area.
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Series>
        {cuts.parts.map((part, k) => {
          const length = frames(part, fps);
          return (
            <Series.Sequence
              key={k}
              durationInFrames={length}
              premountFor={fps}
              name={`Part ${k + 1}`}
            >
              <Video
                src={staticFile(cuts.src)}
                trimBefore={Math.round(part.from * fps)}
                trimAfter={Math.round(part.from * fps) + length}
                muted={muted}
                volume={(f) =>
                  volume *
                  interpolate(f, [0, 1, length - 1, length], [0, 1, 1, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                }
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  ...style,
                }}
              />
            </Series.Sequence>
          );
        })}
      </Series>
    </div>
  );
};
