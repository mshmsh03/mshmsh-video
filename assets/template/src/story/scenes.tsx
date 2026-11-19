import type React from "react";
import { colors } from "../theme";
import { BeatScene } from "./scenes/BeatScene";
import { FreezeScene } from "./scenes/FreezeScene";

// One entry per scene id in story.json: this is the file you write for each
// video. A scene without an entry plays as a placeholder (its id, its "board"
// line and the real narration), so the whole video previews as an animatic
// from the moment the script is approved, and scenes are filled in one by one.
//
// Time every visual to a word: wordAt("<id>", "<word>") * fps (voice.ts).
// Shared pieces: BeatScene, FreezeScene, Title, EndCard, PhotoFill, PhotoCard,
// Laptop/Phone/Shot/ShotVideo, Cursor, Stamp, Counter, Terminal, Sfx, and the
// moves in motion.ts. Positions come from useLayout() (layout.ts).
export const SCENES: Record<string, React.FC> = {
  freeze: () => (
    <FreezeScene
      id="freeze"
      clip="me"
      freezeAt={1.3}
      sticker="Yep. That's me."
      pointAt={{ x: 700, y: 700 }}
      kicker="A true story"
      title={
        <>
          My life with <span style={{ color: colors.accent }}>Claude</span>
        </>
      }
      hideWords={[[0, 2]]}
    />
  ),
  beginning: () => (
    <BeatScene id="beginning" chapter="Chapter 1 · The beginning" />
  ),
  end: () => <BeatScene id="end" showCaptions={false} />,
};
