import { AnimatedEmoji, type EmojiName } from "@remotion/animated-emoji";
import type React from "react";
import {
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { findStatic } from "./media";
import { popIn } from "./motion";
import { Sfx } from "./Sfx";

type EmojiProps = {
  // One of Google's 411 animated emoji (node scripts/free-emoji.mjs lists
  // them), downloaded first: node scripts/free-emoji.mjs get <name>
  readonly name: EmojiName;
  // Seconds into the scene when it pops in: time it to the word,
  // wordAt(id, "party") + 0.1.
  readonly at?: number;
  // Width and height in pixels.
  readonly size?: number;
  // The file's resolution: "1" is 1024 px, "0.5" for small emoji, "2" for 4K.
  readonly scale?: "0.5" | "1" | "2";
  // How fast the loop plays.
  readonly speed?: number;
  // A sound on the pop, or null for none.
  readonly sound?: string | null;
  readonly style?: React.CSSProperties;
};

// An animated emoji that pops in like a sticker and keeps looping, from
// public/emoji/. CC BY 4.0: credit "Animated emoji by Google" in the
// description or end card (public/emoji/CREDITS.txt). A missing download
// leaves nothing, like a missing sound, so the preview never breaks.
export const Emoji: React.FC<EmojiProps> = ({
  name,
  at = 0,
  size = 240,
  scale = "1",
  speed = 1,
  sound = "sfx/pop.wav",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round(at * fps);
  if (!findStatic(`emoji/${name}-${scale}x.webm`)) return null;
  const pop = popIn(frame, start, fps);
  return (
    <>
      {sound ? (
        <Sfx src={sound} at={start} volume={0.4} name={`Emoji ${name}`} />
      ) : null}
      <Sequence from={start} layout="none" name={`Emoji ${name}`}>
        <div style={{ width: size, height: size, ...pop, ...style }}>
          <AnimatedEmoji
            emoji={name}
            scale={scale}
            playbackRate={speed}
            calculateSrc={({ emoji, scale: s, format }) =>
              staticFile(
                `emoji/${emoji}-${s}x.${format === "hevc" ? "mp4" : "webm"}`,
              )
            }
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </Sequence>
    </>
  );
};
