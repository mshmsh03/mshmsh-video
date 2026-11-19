import { Audio } from "@remotion/media";
import type React from "react";
import { useVideoConfig } from "remotion";
import { findStatic } from "./media";

type SfxProps = {
  // public/<src>, e.g. "sfx/whoosh.wav". Several takes ("sfx/whoosh.wav",
  // "sfx/whoosh-2.wav") rotate by `take`, so a repeated sound doesn't repeat
  // exactly (music.md, "Sound design").
  readonly src: string | readonly string[];
  // Frame (within the current sequence) where the picture happens. The sound's
  // loudest point should land one frame after it; `lead` moves the file's start
  // earlier by that many frames when its peak comes late (hf audio --only moments).
  readonly at: number;
  readonly lead?: number;
  readonly take?: number;
  readonly volume?: number;
  readonly name?: string;
};

// A sound effect that plays only when its file exists, so a missing download
// is a silent gap in the preview, not a failed render.
export const Sfx: React.FC<SfxProps> = ({
  src,
  at,
  lead = 0,
  take = 0,
  volume = 0.5,
  name,
}) => {
  const { fps } = useVideoConfig();
  const takes = (typeof src === "string" ? [src] : [...src]).filter((s) =>
    findStatic(s),
  );
  if (takes.length === 0) return null;
  const file = findStatic(takes[take % takes.length]);
  if (!file) return null;
  return (
    <Audio
      name={name ?? file.name.replace(/^sfx\//, "")}
      src={file.src}
      from={Math.max(0, Math.round(at - lead + 1))}
      volume={volume}
      premountFor={fps}
    />
  );
};
