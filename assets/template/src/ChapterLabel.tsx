import type React from "react";
import {
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useLayout } from "./layout";
import { dirOf, isRtl } from "./story/text";
import { colors, monoFont } from "./theme";

export const ChapterLabel: React.FC<{
  readonly chapter: string;
  readonly top?: number;
}> = ({ chapter, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();

  if (!chapter) {
    return null;
  }

  // Kurdish and Arabic chapter labels get no letter-spacing and no uppercase:
  // both break the joined letters, and Arabic script has no capitals.
  const rtl = isRtl(chapter);
  return (
    <Interactive.Div
      name="Chapter"
      style={{
        position: "absolute",
        left: layout.left,
        right: layout.right,
        top: top ?? layout.chapterTop,
        display: "flex",
        alignItems: "center",
        gap: 24,
        direction: dirOf(chapter),
        fontFamily: monoFont,
        fontSize: layout.labelSize,
        letterSpacing: rtl ? "normal" : "0.04em",
        textTransform: rtl ? "none" : "uppercase",
        color: colors.muted,
        opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div
        style={{
          width: 48,
          height: 4,
          flexShrink: 0,
          backgroundColor: colors.accent,
        }}
      />
      {chapter}
    </Interactive.Div>
  );
};
