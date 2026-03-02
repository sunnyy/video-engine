import React from "react";
import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { assetAnimationRegistry } from "../../core/assetAnimationRegistry";

export default function AssetRenderer({ asset, beat, slot }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!asset) return null;

  const objectFit = asset.object_fit || "cover";

  const animationKey =
    beat?.asset_settings?.[slot]?.animation || "none";

  const animation =
    assetAnimationRegistry[animationKey]?.() ||
    assetAnimationRegistry.none();

  let style = {};

  // 🔥 If animation is none → render static
  if (animation.type !== "none") {
    const duration = animation.duration || 20;

    const progress = interpolate(frame, [0, duration], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    const springProgress = spring({
      frame,
      fps,
      config: {
        damping: 12,
        stiffness: 120,
        mass: 0.6,
      },
    });

    switch (animation.type) {
      case "fade":
        style.opacity = progress;
        break;

      case "slideY":
        style.transform = `translateY(${interpolate(
          progress,
          [0, 1],
          [animation.from, 0]
        )}px)`;
        style.opacity = progress;
        break;

      case "slideX":
        style.transform = `translateX(${interpolate(
          progress,
          [0, 1],
          [animation.from, 0]
        )}px)`;
        style.opacity = progress;
        break;

      case "scale":
        style.transform = `scale(${interpolate(
          progress,
          [0, 1],
          [animation.from, 1]
        )})`;
        style.opacity = progress;
        break;

      case "springScale":
        style.transform = `scale(${interpolate(
          springProgress,
          [0, 1],
          [animation.from, 1]
        )})`;
        style.opacity = springProgress;
        break;

      case "blur":
        style.filter = `blur(${interpolate(
          progress,
          [0, 1],
          [animation.from, 0]
        )}px)`;
        style.opacity = progress;
        break;

      case "combo":
        style.transform = `scale(${interpolate(
          progress,
          [0, 1],
          [animation.scaleFrom, 1]
        )})`;
        style.filter = `blur(${interpolate(
          progress,
          [0, 1],
          [animation.blurFrom, 0]
        )}px)`;
        style.opacity = progress;
        break;

      default:
        break;
    }
  }

  const source = asset.url || asset.src;
  const isVideo =
    source?.toLowerCase().endsWith(".mp4") ||
    source?.toLowerCase().endsWith(".webm");

  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      {isVideo ? (
        <Video
          src={source}
          muted
          loop
          style={{
            width: "100%",
            height: "100%",
            objectFit,
          }}
        />
      ) : (
        <img
          src={source}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
          }}
        />
      )}
    </AbsoluteFill>
  );
}