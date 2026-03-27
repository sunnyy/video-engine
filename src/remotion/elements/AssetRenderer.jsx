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

import { assetTransitions } from "../../core/assetTransitions";
import { assetMotions } from "../../core/assetMotions";

export default function AssetRenderer({ zone, beat, slot }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const source = zone?.src || null;
  const objectFit = zone?.objectFit || "cover";

  const beatFrames = Math.floor((beat?.duration_sec || 2) * fps);
  const localFrame = frame;

  const enterKey =
    zone?.enterTransition ||
    beat?.asset_settings?.[slot]?.enterTransition ||
    "fadeIn";

  const exitKey =
    zone?.exitTransition ||
    beat?.asset_settings?.[slot]?.exitTransition ||
    "none";

  const motionKey =
    zone?.motion ||
    beat?.asset_settings?.[slot]?.motion ||
    "none";

  const enter = assetTransitions[enterKey]
    ? assetTransitions[enterKey]()
    : assetTransitions.none();

  const exit = assetTransitions[exitKey]
    ? assetTransitions[exitKey]()
    : assetTransitions.none();

  const motion = assetMotions[motionKey]
    ? assetMotions[motionKey]()
    : assetMotions.none();

  let style = {};
  let transformParts = [];

  /* ---------- ENTER ---------- */

  if (enter.type !== "none") {

    const progress = interpolate(
      localFrame,
      [0, enter.duration || 16],
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

    switch (enter.type) {

      case "fadeIn":
        style.opacity = progress;
        break;

      case "slideY":
        transformParts.push(
          `translateY(${interpolate(progress,[0,1],[enter.from || 200,0])}px)`
        );
        break;

      case "slideX":
        transformParts.push(
          `translateX(${interpolate(progress,[0,1],[enter.from || 300,0])}px)`
        );
        break;

      case "scale":
        transformParts.push(
          `scale(${interpolate(progress,[0,1],[enter.from || 0.7,1])})`
        );
        break;

      case "springScale":
        transformParts.push(
          `scale(${interpolate(springProgress,[0,1],[enter.from || 1.4,1])})`
        );
        break;

      case "blur":
        style.filter = `blur(${interpolate(progress,[0,1],[enter.from || 40,0])}px)`;
        break;

      case "wipe":
        style.clipPath = `inset(0 ${interpolate(progress,[0,1],[100,0])}% 0 0)`;
        break;

      default:
        break;

    }

  }

  /* ---------- MOTION ---------- */

  if (motion.type !== "none") {

    switch (motion.type) {

      case "scaleDrift":
        transformParts.push(
          `scale(${interpolate(
            localFrame,
            [0, beatFrames],
            [motion.scaleStart || 1.05, motion.scaleEnd || 1.2]
          )})`
        );
        break;

      case "drift":
        transformParts.push(
          `scale(${interpolate(
            localFrame,
            [0, beatFrames],
            [motion.scaleStart || 1.1, motion.scaleEnd || 1.2]
          )})`
        );

        transformParts.push(
          `translateX(${interpolate(
            localFrame,
            [0, beatFrames],
            [motion.xStart || 0, motion.xEnd || 0]
          )}px)`
        );

        transformParts.push(
          `translateY(${interpolate(
            localFrame,
            [0, beatFrames],
            [motion.yStart || 0, motion.yEnd || 0]
          )}px)`
        );
        break;

      case "kenburns":
        transformParts.push(
          `scale(${interpolate(localFrame,[0,beatFrames],[1.05,1.2])})`
        );

        transformParts.push(
          `translateX(${interpolate(localFrame,[0,beatFrames],[0,-60])}px)`
        );

        transformParts.push(
          `translateY(${interpolate(localFrame,[0,beatFrames],[0,-40])}px)`
        );
        break;

      default:
        break;

    }

  }

  /* ---------- EXIT ---------- */

  if (exit.type !== "none") {

    const exitStart = beatFrames - (exit.duration || 16);

    const progress = interpolate(
      localFrame,
      [exitStart, beatFrames],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      }
    );

    switch (exit.type) {

      case "fadeOut":
        style.opacity = interpolate(progress,[0,1],[1,0]);
        break;

      case "slideY":
        transformParts.push(
          `translateY(${interpolate(progress,[0,1],[0,exit.to || 200])}px)`
        );
        break;

      case "slideX":
        transformParts.push(
          `translateX(${interpolate(progress,[0,1],[0,exit.to || 300])}px)`
        );
        break;

      case "scale":
        transformParts.push(
          `scale(${interpolate(progress,[0,1],[1,exit.to || 0.7])})`
        );
        break;

      case "blur":
        style.filter = `blur(${interpolate(progress,[0,1],[0,exit.to || 40])}px)`;
        break;

      default:
        break;

    }

  }

  if (transformParts.length) {
    style.transform = transformParts.join(" ");
  }

  if (!source) return null;

  const isVideo =
    source.toLowerCase().endsWith(".mp4") ||
    source.toLowerCase().endsWith(".webm");

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