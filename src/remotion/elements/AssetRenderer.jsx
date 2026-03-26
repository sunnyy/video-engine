import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing
} from "remotion";

import { assetAnimationRegistry } from "../../core/assetAnimationRegistry";

export default function AssetRenderer({ zone, beat, slot }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!zone) return null;

  const source = zone.src || null;
  if (!source) return null;

  const objectFit = zone.objectFit || "cover";

  const animationKey =
    zone?.animation ||
    beat?.asset_settings?.[slot]?.animation ||
    "none";

  const animation =
    assetAnimationRegistry[animationKey]
      ? assetAnimationRegistry[animationKey]()
      : assetAnimationRegistry.none();

  const localFrame = frame;
  const beatFrames = Math.floor((beat.duration_sec || 3) * fps);

  let style = {};

  if (animation.type !== "none") {

    const duration = animation.duration || 20;

    const progress = interpolate(
      localFrame,
      [0, duration],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic)
      }
    );

    const springProgress = spring({
      frame: localFrame,
      fps,
      config: {
        damping: 12,
        stiffness: 120,
        mass: 0.6
      }
    });

    switch (animation.type) {

      case "fade":
        style.opacity = progress;
        break;

      case "slideY":
        style.transform = `translateY(${interpolate(progress,[0,1],[animation.from || 200,0])}px)`;
        break;

      case "slideX":
        style.transform = `translateX(${interpolate(progress,[0,1],[animation.from || 300,0])}px)`;
        break;

      case "scale":
        style.transform = `scale(${interpolate(progress,[0,1],[animation.from || 0.7,1])})`;
        break;

      case "springScale":
        style.transform = `scale(${interpolate(springProgress,[0,1],[animation.from || 1.4,1])})`;
        break;

      case "blur":
        style.filter = `blur(${interpolate(progress,[0,1],[animation.from || 40,0])}px)`;
        break;

      case "combo":
        style.transform = `scale(${interpolate(progress,[0,1],[animation.scaleFrom || 1.2,1])})`;
        style.filter = `blur(${interpolate(progress,[0,1],[animation.blurFrom || 20,0])}px)`;
        break;

      case "zoomSlow":
        style.transform = `scale(${interpolate(localFrame,[0,beatFrames],[1,1.15])})`;
        break;

      case "kenburns":
        style.transform = `
          scale(${interpolate(localFrame,[0,beatFrames],[1.05,1.2])})
          translateX(${interpolate(localFrame,[0,beatFrames],[0,-60])}px)
          translateY(${interpolate(localFrame,[0,beatFrames],[0,-40])}px)
        `;
        break;

      case "pushSlow":
        style.transform = `scale(${interpolate(
          localFrame,
          [0, beatFrames],
          [animation.scaleStart || 1.05, animation.scaleEnd || 1.25]
        )})`;
        break;

      case "drift":
        style.transform = `
          scale(${interpolate(localFrame,[0,beatFrames],[animation.scaleStart || 1.1,animation.scaleEnd || 1.2])})
          translateX(${interpolate(localFrame,[0,beatFrames],[animation.xStart || 0,animation.xEnd || 0])}px)
          translateY(${interpolate(localFrame,[0,beatFrames],[animation.yStart || 0,animation.yEnd || 0])}px)
        `;
        break;

      default:
        break;

    }

  }

  const isVideo =
    source?.toLowerCase().endsWith(".mp4") ||
    source?.toLowerCase().endsWith(".webm");

  return (

    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}
    >

      <div
        style={{
          width: "100%",
          height: "100%",
          ...style
        }}
      >

        {isVideo ? (

          <Video
            src={source}
            muted
            loop
            style={{
              width: "100%",
              height: "100%",
              objectFit
            }}
          />

        ) : (

          <Img
            src={source}
            style={{
              width: "100%",
              height: "100%",
              objectFit
            }}
          />

        )}

      </div>

    </AbsoluteFill>

  );

}