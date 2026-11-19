import { Easing, interpolate, spring } from "remotion";

// Moves for the scenes, named by the job they do (motion.md). Every helper
// takes the current frame and a start frame and returns style values, so it
// can sit in a `style={{ ...helper(...) }}` and stays frame-exact.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Eases by job (motion.md, "Eases and springs in Remotion").
export const ease = {
  // An arrival that lands on a long tail.
  arrive: Easing.bezier(0.16, 1, 0.3, 1),
  // A camera move or a colour flood.
  camera: Easing.inOut(Easing.cubic),
  // A zoom through, or an exit: accelerates away.
  exit: Easing.in(Easing.poly(4)),
};

// Fades an element in while it rises into place. One entrance among several:
// don't give every element this one.
export const fadeUp = (
  frame: number,
  start: number,
  fps: number,
  distance = 40,
) => ({
  opacity: interpolate(frame, [start, start + 0.35 * fps], [0, 1], clamp),
  translate: interpolate(
    frame,
    [start, start + 0.6 * fps],
    [`0px ${distance}px`, "0px 0px"],
    { ...clamp, easing: ease.arrive },
  ),
});

// Pops an element in with a little overshoot, like a sticker slapped on. For
// stickers only, not for UI or titles.
export const popIn = (frame: number, start: number, fps: number) => ({
  opacity: interpolate(frame, [start, start + 2], [0, 1], clamp),
  scale: interpolate(frame, [start, start + 0.45 * fps], [1.8, 1], {
    ...clamp,
    easing: Easing.spring({ damping: 9 }),
    output: "perceptual-scale",
  }),
});

export const appear = (frame: number, start: number, fps: number) =>
  interpolate(frame, [start, start + 0.3 * fps], [0, 1], clamp);

// The whole element sharpens in from a blur, without moving: 8 px over about
// 0.18 s.
export const blurIn = (
  frame: number,
  start: number,
  fps: number,
  blur = 8,
  seconds = 0.18,
) => {
  const t = interpolate(frame, [start, start + seconds * fps], [0, 1], {
    ...clamp,
    easing: ease.arrive,
  });
  return { opacity: t, filter: `blur(${(1 - t) * blur}px)` };
};

// Leaves with a blur and a fade, 40 to 50% quicker than it came in.
export const blurOut = (
  frame: number,
  start: number,
  fps: number,
  blur = 8,
  seconds = 0.15,
) => {
  const t = interpolate(frame, [start, start + seconds * fps], [0, 1], {
    ...clamp,
    easing: ease.exit,
  });
  return { opacity: 1 - t, filter: `blur(${t * blur}px)` };
};

// A 0 to 1 spring named by how much it bounces (the damping ratio): 1 never
// bounces, 0.7 to 0.85 reads premium, 0.4 to 0.6 playful, under 0.3 a cartoon.
// Use it on position and size, never on opacity or colour.
export const springBy = (
  frame: number,
  start: number,
  fps: number,
  bounce = 0.8,
) =>
  spring({
    frame: frame - start,
    fps,
    config: { damping: bounce * 20, stiffness: 100, mass: 1 },
  });

// A slow push across a whole shot, for photos (1.0 to 1.08 reads warm).
export const kenBurns = (
  frame: number,
  durationInFrames: number,
  from = 1,
  to = 1.08,
) =>
  interpolate(frame, [0, Math.max(1, durationInFrames)], [from, to], {
    ...clamp,
    easing: ease.camera,
  });

// Frame of beat number `i` on a music grid. Computed from the index every time,
// never by adding a rounded beat again and again, which drifts.
export const beatFrame = (
  i: number,
  bpm: number,
  fps: number,
  offsetFrames = 0,
) => Math.round(offsetFrames + (i * fps * 60) / bpm);

// A blur that peaks at a fast move's fastest frame (6 to 12 px for text, 15 to
// 20 px for a full-frame move), from `start` over `frames`.
export const moveBlur = (
  frame: number,
  start: number,
  frames: number,
  peak = 10,
) =>
  `blur(${interpolate(frame, [start, start + frames / 2, start + frames], [0, peak, 0], clamp)}px)`;
