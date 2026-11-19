import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "./motion";
import { Sfx } from "./Sfx";

export type CursorStop = {
  // Seconds into the scene when the cursor arrives here.
  readonly at: number;
  readonly x: number;
  readonly y: number;
  // Click on arrival. The click is what causes the next thing on screen, on
  // the same frame (styles.md, "Device mockups or the UI itself").
  readonly click?: boolean;
};

type CursorProps = {
  // The first stop is where it starts; put it off screen so it enters.
  readonly path: readonly CursorStop[];
  // Height in px. 4 to 7% of the frame reads on a phone.
  readonly size?: number;
  // A click sound per click, when public/sfx/mouse-click.wav exists.
  readonly clickSound?: string | null;
};

// A big cursor that travels between points on a camera ease and clicks. Time
// what each click does to the same `at` the click has.
export const Cursor: React.FC<CursorProps> = ({
  path,
  size = 96,
  clickSound = "sfx/mouse-click.wav",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (t >= a.at) {
      // Travel takes the time between stops, at most 0.7 s, ending on arrival.
      const travel = Math.min(0.7, b.at - a.at);
      const k = interpolate(t, [b.at - travel, b.at], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: ease.camera,
      });
      x = a.x + (b.x - a.x) * k;
      y = a.y + (b.y - a.y) * k;
    }
  }
  const clicks = path.filter((p) => p.click);
  const press = clicks.reduce((s, c) => {
    const f = c.at * fps;
    return Math.min(
      s,
      interpolate(frame, [f, f + 2, f + 6], [1, 0.82, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }, 1);

  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x,
          top: y,
          scale: String(press),
          transformOrigin: "10% 10%",
          overflow: "visible",
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))",
        }}
      >
        <path
          d="M3 2 L3 19 L7.6 14.6 L10.6 21.4 L13.6 20.1 L10.7 13.5 L17 13.5 Z"
          fill="white"
          stroke="black"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
      {clickSound
        ? clicks.map((c, i) => (
            <Sfx
              key={i}
              src={clickSound}
              at={Math.round(c.at * fps)}
              volume={0.45}
              name={`Click ${i + 1}`}
            />
          ))
        : null}
    </>
  );
};
