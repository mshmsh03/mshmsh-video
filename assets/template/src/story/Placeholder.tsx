import type React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../layout";
import { colors, headingFont, monoFont } from "../theme";
import { Narration } from "./Narration";
import { dirOf } from "./text";

// Stands in for a scene that isn't built yet: its id and its storyboard line
// ("board" in story.json), with the real narration and captions. Right after
// the script gate the whole video plays as an animatic, so the length, pacing
// and caption breaks can be judged before any scene is built.
export const Placeholder: React.FC<{
  readonly id: string;
  readonly board?: string;
  readonly index: number;
}> = ({ id, board, index }) => {
  const layout = useLayout();
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: colors.panel }} />
      <div
        style={{
          position: "absolute",
          left: layout.left,
          right: layout.right,
          top: layout.visualTop,
          bottom: layout.height - layout.visualBottom,
          border: `3px dashed ${colors.border}`,
          borderRadius: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: 48,
        }}
      >
        <div
          style={{
            fontFamily: monoFont,
            fontSize: layout.labelSize,
            color: colors.accent,
          }}
        >
          {String(index + 1).padStart(2, "0")} · {id}
        </div>
        {board ? (
          <div
            style={{
              direction: dirOf(board),
              fontFamily: headingFont,
              fontSize: layout.minText * 1.9,
              lineHeight: 1.25,
              color: colors.text,
            }}
          >
            {board}
          </div>
        ) : (
          <div
            style={{
              fontFamily: headingFont,
              fontSize: layout.minText * 1.6,
              color: colors.muted,
            }}
          >
            Not built yet
          </div>
        )}
      </div>
      <Narration id={id} />
    </>
  );
};
