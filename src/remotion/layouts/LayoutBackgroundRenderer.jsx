import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate
} from "remotion";

import { assetTransitions } from "../../core/assetTransitions";
import { assetMotions } from "../../core/assetMotions";

export default function LayoutBackgroundRenderer({ background, beat }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!background) return null;

  const type = background.type || "color";
  const value = background.value;
  const fit = background.objectFit || "cover";

  const enterKey = background.enterTransition || "fadeIn";
  const exitKey = background.exitTransition || "none";
  const motionKey = background.motion || "none";

  const enter = assetTransitions[enterKey]
    ? assetTransitions[enterKey]()
    : assetTransitions.none();

  const exit = assetTransitions[exitKey]
    ? assetTransitions[exitKey]()
    : assetTransitions.none();

  const motion = assetMotions[motionKey]
    ? assetMotions[motionKey]()
    : assetMotions.none();

  const beatFrames = Math.floor((beat?.duration_sec || 2) * fps);

  let style = {};
  let transformParts = [];

  /* ENTER */

  if (enter.type !== "none") {

    const progress = interpolate(
      frame,
      [0, enter.duration || 16],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    switch (enter.type) {

      case "fadeIn":
        style.opacity = progress;
        break;

      case "slideX":
        transformParts.push(
          `translateX(${interpolate(progress,[0,1],[enter.from || 300,0])}px)`
        );
        break;

      case "slideY":
        transformParts.push(
          `translateY(${interpolate(progress,[0,1],[enter.from || 200,0])}px)`
        );
        break;

      case "scale":
        transformParts.push(
          `scale(${interpolate(progress,[0,1],[enter.from || 0.7,1])})`
        );
        break;

      case "blur":
        style.filter = `blur(${interpolate(progress,[0,1],[enter.from || 40,0])}px)`;
        break;

      default:
        break;
    }

  }

  /* MOTION */

  if (motion.type !== "none") {

    switch (motion.type) {

      case "scaleDrift":
        transformParts.push(
          `scale(${interpolate(
            frame,
            [0, beatFrames],
            [motion.scaleStart || 1.05, motion.scaleEnd || 1.2]
          )})`
        );
        break;

      case "drift":

        transformParts.push(
          `scale(${interpolate(
            frame,
            [0, beatFrames],
            [motion.scaleStart || 1.1, motion.scaleEnd || 1.2]
          )})`
        );

        transformParts.push(
          `translateX(${interpolate(
            frame,
            [0, beatFrames],
            [motion.xStart || 0, motion.xEnd || 0]
          )}px)`
        );

        transformParts.push(
          `translateY(${interpolate(
            frame,
            [0, beatFrames],
            [motion.yStart || 0, motion.yEnd || 0]
          )}px)`
        );

        break;

      case "kenburns":

        transformParts.push(
          `scale(${interpolate(frame,[0,beatFrames],[1.05,1.2])})`
        );

        transformParts.push(
          `translateX(${interpolate(frame,[0,beatFrames],[0,-60])}px)`
        );

        transformParts.push(
          `translateY(${interpolate(frame,[0,beatFrames],[0,-40])}px)`
        );

        break;

      default:
        break;

    }

  }

  /* EXIT */

  if (exit.type !== "none") {

    const exitStart = beatFrames - (exit.duration || 16);

    const progress = interpolate(
      frame,
      [exitStart, beatFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    switch (exit.type) {

      case "fadeOut":
        style.opacity = interpolate(progress,[0,1],[1,0]);
        break;

      case "slideX":
        transformParts.push(
          `translateX(${interpolate(progress,[0,1],[0,exit.to || 300])}px)`
        );
        break;

      case "slideY":
        transformParts.push(
          `translateY(${interpolate(progress,[0,1],[0,exit.to || 200])}px)`
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

  const baseStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: fit,
    zIndex: 0,
    ...style
  };

  if (type === "color" || type === "gradient") {
    return <div style={{ ...baseStyle, background: value }} />;
  }

  if (type === "image") {
    return <img src={value} style={baseStyle} />;
  }

  if (type === "video") {
    return (
      <video
        src={value}
        autoPlay
        muted
        loop
        style={baseStyle}
      />
    );
  }

  return null;

}