import type React from "react";
import {
  AbsoluteFill,
  Img,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useLayout } from "../layout";
import { colors, monoFont } from "../theme";
import { findLogo } from "./media";
import { ease } from "./motion";
import { Title } from "./Title";

type EndCardProps = {
  // Seconds into the scene when the logo arrives.
  readonly at?: number;
  // The brand or person's name, under the logo (or alone, without a logo).
  readonly name?: string;
  // The call to action, exactly as the person gave it: a handle, a link, a
  // phone number, a date. It lands last and holds.
  readonly cta?: string;
  // Sets the call to action in the mono font: an install command, a URL, a handle.
  readonly ctaMono?: boolean;
  // public/brand/<logo>.svg|png|webp; "logo" by default. Never redrawn.
  readonly logo?: string;
  // Share of the frame's width the logo takes (15 to 30% reads as an end card).
  readonly logoWidth?: number;
  readonly background?: string;
};

// The end card: the real logo carried in once, with weight, then the name,
// then the call to action held for the last 1.5 to 3 s (story-and-comedy.md,
// "The brand and the end card"). Give its scene enough `hold` in story.json.
export const EndCard: React.FC<EndCardProps> = ({
  at = 0.2,
  name,
  cta,
  ctaMono = false,
  logo = "logo",
  logoWidth = 0.24,
  background = colors.background,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const file = findLogo(logo);
  const start = at * fps;
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  const t = interpolate(frame, [start, start + 0.55 * fps], [0, 1], {
    ...clamp,
    easing: ease.arrive,
  });
  const nameAt = at + (file ? 0.45 : 0);
  const ctaAt = nameAt + (name ? 0.5 : 0);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
        gap: 36 * (layout.width / 1080),
      }}
    >
      {file ? (
        <Interactive.Div
          name="Logo"
          style={{
            width: layout.width * logoWidth,
            opacity: t,
            scale: String(0.82 + 0.18 * t),
            filter: t < 1 ? `blur(${(1 - t) * 10}px)` : undefined,
          }}
        >
          <Img
            src={file.src}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Interactive.Div>
      ) : null}
      {name ? (
        <Title
          text={name}
          at={nameAt}
          entrance="line"
          size={layout.titleSize * (file ? 0.8 : 1.7)}
        />
      ) : null}
      {cta ? (
        <Title
          text={cta}
          at={ctaAt}
          entrance={ctaMono ? "line" : "words"}
          size={Math.max(
            layout.minText * 1.6,
            layout.titleSize * (file ? 0.42 : 0.6),
          )}
          weight={500}
          color={colors.accent}
          style={
            ctaMono
              ? { fontFamily: monoFont, letterSpacing: "normal" }
              : undefined
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
