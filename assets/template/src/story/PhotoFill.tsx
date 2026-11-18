import { Video } from "@remotion/media";
import type React from "react";
import {
  AbsoluteFill,
  AnimatedImage,
  Img,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, headingFont } from "../theme";
import { findMedia, isGifFile, isVideoFile } from "./media";
import { kenBurns } from "./motion";

type PhotoFillProps = {
  // public/photos/<base>.(jpg|png|webp|gif|mp4|mov|webm)
  readonly base: string;
  // A slow push over the shot: scale `from` to `to` across `frames` (the
  // scene's length by default). 1.0 to 1.08 reads warm; 1 to 1 holds still.
  readonly from?: number;
  readonly to?: number;
  readonly frames?: number;
  // Which part of the picture stays in frame when it's cropped (0 to 1).
  readonly focusX?: number;
  readonly focusY?: number;
  // The reaction zoom: the picture slams in (a hit has no easing) and shakes.
  // Seconds into the scene. Pair it with a boom and a music silence.
  readonly slamAt?: number;
  readonly shakeSeconds?: number;
  // Darkens the bottom so captions or a title read over the picture.
  readonly scrim?: boolean;
  // Shown when the file isn't there yet.
  readonly fallback?: string;
  readonly style?: React.CSSProperties;
};

// A full-frame photo or clip of the person's own, with a slow push (a tribute,
// a memory) or a slam and shake (the funny style's reaction zoom). The move is
// on a wrapper, never on the media element itself (motion.md, "The right
// mechanism").
export const PhotoFill: React.FC<PhotoFillProps> = ({
  base,
  from = 1,
  to = 1.08,
  frames,
  focusX = 0.5,
  focusY = 0.5,
  slamAt,
  shakeSeconds = 0.5,
  scrim = false,
  fallback,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const media = findMedia(base);
  const position = `${focusX * 100}% ${focusY * 100}%`;
  let scale = kenBurns(frame, frames ?? durationInFrames, from, to);
  let shakeX = 0;
  let shakeY = 0;
  let opacity = 1;
  if (slamAt !== undefined) {
    const hit = Math.round(slamAt * fps);
    opacity = frame >= hit ? 1 : 0;
    // Two frames from 1.25 to 1: the hit itself is near-instant.
    scale *= interpolate(frame, [hit, hit + 2], [1.25, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const shakeEnd = hit + shakeSeconds * fps;
    if (frame >= hit && frame < shakeEnd) {
      const amount = interpolate(frame, [hit, shakeEnd], [28, 0]);
      shakeX = (random(`x${frame}`) - 0.5) * 2 * amount;
      shakeY = (random(`y${frame}`) - 0.5) * 2 * amount;
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.panel,
        overflow: "hidden",
        opacity,
        ...style,
      }}
    >
      <AbsoluteFill
        style={{
          scale: String(scale),
          translate: `${shakeX}px ${shakeY}px`,
          transformOrigin: position,
        }}
      >
        {media && isVideoFile(media.name) ? (
          <Video
            src={media.src}
            muted
            loop
            objectFit="cover"
            style={{ width: "100%", height: "100%", objectPosition: position }}
          />
        ) : media && isGifFile(media.name) ? (
          <AnimatedImage
            src={media.src}
            fit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : media ? (
          <Img
            src={media.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: position,
            }}
          />
        ) : (
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              color: colors.muted,
              fontFamily: headingFont,
              fontSize: 48,
            }}
          >
            {fallback ?? `photos/${base}`}
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      {scrim ? (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(transparent 45%, rgba(0, 0, 0, 0.72) 85%)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
