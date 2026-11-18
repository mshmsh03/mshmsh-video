import { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";

// Where things go on screen, worked out from the composition's size and the
// platform it's posted to, so the same components fit 9:16, 16:9, 1:1 and 4:5
// without retyping positions (styles.md, "Formats and safe zones").
//
// "reels" (Reels, TikTok, Shorts): the app covers about the bottom 400 px and
// the right 140 px, so captions sit higher. "whatsapp": Status covers far less.
// "landscape" and "feed" need no app margin.
export type Platform = "reels" | "whatsapp" | "landscape" | "feed";

export const PlatformContext = createContext<Platform | null>(null);

export type Layout = {
  readonly width: number;
  readonly height: number;
  readonly shape: "vertical" | "landscape" | "square";
  readonly platform: Platform;
  // Side margins; the right one is wider on Reels, under the app's buttons.
  readonly left: number;
  readonly right: number;
  readonly chapterTop: number;
  // The band the scene's visuals live in.
  readonly visualTop: number;
  readonly visualBottom: number;
  readonly captionTop: number;
  readonly captionSize: number;
  // About how many characters fit on one caption line at captionSize.
  readonly captionMaxChars: number;
  readonly titleSize: number;
  readonly labelSize: number;
  // The smallest text a viewer should have to read: 2.6% of the short side.
  readonly minText: number;
};

export const layoutFor = (
  width: number,
  height: number,
  platform?: Platform | null,
): Layout => {
  const ratio = height / width;
  // Everything below is designed at 1080 on the short side, then scaled.
  const k = Math.min(width, height) / 1080;
  const minText = Math.ceil(28 * k);
  if (ratio > 1.5) {
    const p = platform ?? "whatsapp";
    const reels = p === "reels";
    const captionTop = (reels ? 1300 : 1470) * k;
    return {
      width,
      height,
      shape: "vertical",
      platform: p,
      left: 100 * k,
      right: (reels ? 160 : 100) * k,
      chapterTop: (reels ? 200 : 180) * k,
      visualTop: 300 * k,
      visualBottom: captionTop - 70 * k,
      captionTop,
      captionSize: 64 * k,
      captionMaxChars: reels ? 24 : 26,
      titleSize: 120 * k,
      labelSize: 40 * k,
      minText,
    };
  }
  if (ratio < 0.75) {
    return {
      width,
      height,
      shape: "landscape",
      platform: platform ?? "landscape",
      left: 120 * k,
      right: 120 * k,
      chapterTop: 70 * k,
      visualTop: 160 * k,
      visualBottom: 840 * k,
      captionTop: 892 * k,
      captionSize: 56 * k,
      captionMaxChars: 46,
      titleSize: 96 * k,
      labelSize: 34 * k,
      minText,
    };
  }
  // Square (1:1) and portrait feed (4:5).
  return {
    width,
    height,
    shape: "square",
    platform: platform ?? "feed",
    left: 90 * k,
    right: 90 * k,
    chapterTop: 80 * k,
    visualTop: 170 * k,
    visualBottom: height - 330 * k,
    captionTop: height - 290 * k,
    captionSize: 56 * k,
    captionMaxChars: 30,
    titleSize: 96 * k,
    labelSize: 34 * k,
    minText,
  };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height, useContext(PlatformContext));
};
