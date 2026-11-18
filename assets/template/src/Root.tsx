import type React from "react";
import { Composition } from "remotion";
import { StoryVideo } from "./story/StoryVideo";
import { STORY_VOICE } from "./story/voice";

// One composition per cut. setup-project.mjs writes the size and platform from
// the brief's format: 1080x1920 (9:16), 1920x1080 (16:9), 1080x1080 (1:1) or
// 1080x1350 (4:5); platform "reels" (Reels, TikTok, Shorts), "whatsapp",
// "landscape" or "feed" sets the safe zones (layout.ts).
export const RemotionRoot: React.FC = () => (
  <Composition
    id="StoryVideo"
    component={StoryVideo}
    durationInFrames={STORY_VOICE.totalFrames}
    fps={STORY_VOICE.fps}
    width={1080}
    height={1920}
    defaultProps={{ platform: "whatsapp" as const }}
  />
);
