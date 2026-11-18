import type React from "react";
import { AbsoluteFill } from "remotion";
import { ChapterLabel } from "../../ChapterLabel";
import { Narration } from "../Narration";
import type { SceneId } from "../voice";

type BeatSceneProps = {
  readonly id: SceneId;
  readonly chapter?: string;
  readonly hideWords?: readonly (readonly [number, number])[];
  readonly showCaptions?: boolean;
  // Overrides the caption position from layout.ts.
  readonly captionTop?: number;
  // Captions over a photo or clip get a soft backing.
  readonly scrim?: boolean;
  // This scene's world: a background colour (or any CSS background). Scenes
  // that visit different worlds don't share one dark canvas.
  readonly background?: string;
  // The scene's visuals: devices, cards, terminals, counters, stickers...
  // Keep them inside layout.visualTop to layout.visualBottom (useLayout()).
  readonly children?: React.ReactNode;
};

// The frame most scenes share: a chapter label up top, the visuals, and the
// narrator's line with captions at the bottom.
export const BeatScene: React.FC<BeatSceneProps> = ({
  id,
  chapter = "",
  hideWords,
  showCaptions = true,
  captionTop,
  scrim,
  background,
  children,
}) => (
  <>
    {background ? <AbsoluteFill style={{ background }} /> : null}
    <ChapterLabel chapter={chapter} />
    {children}
    <Narration
      id={id}
      hideWords={hideWords}
      showCaptions={showCaptions}
      top={captionTop}
      scrim={scrim}
    />
  </>
);
