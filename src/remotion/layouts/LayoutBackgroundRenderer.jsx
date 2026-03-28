import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring
} from "remotion";

import { transitionsRegistry } from "../../core/transitionsRegistry";
import { motionsRegistry } from "../../core/motionsRegistry";

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

  const enter =
    transitionsRegistry.enter[enterKey]
      ? transitionsRegistry.enter[enterKey]()
      : transitionsRegistry.enter.none();

  const exit =
    transitionsRegistry.exit[exitKey]
      ? transitionsRegistry.exit[exitKey]()
      : transitionsRegistry.exit.none();

  const motion =
    motionsRegistry[motionKey]
      ? motionsRegistry[motionKey]()
      : motionsRegistry.none();

  const beatFrames = Math.floor((beat?.duration_sec || 2) * fps);

  let style = {};
  let transformParts = [];

  /* ENTER */

  if (enter.layer === "entry") {

    const progress = interpolate(
      frame,
      [0, enter.duration || 16],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    switch (enter.type) {

      case "fade":
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

    }

  }

  /* MOTION */

  if (motion.type !== "none") {

    switch (motion.type) {

      case "scaleDrift":

        transformParts.push(
          `scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart || 1.05,motion.scaleEnd || 1.2])})`
        );

        break;

      case "drift":

        transformParts.push(
          `scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart || 1.1,motion.scaleEnd || 1.2])})`
        );

        transformParts.push(
          `translateX(${interpolate(frame,[0,beatFrames],[motion.xStart || 0,motion.xEnd || 0])}px)`
        );

        transformParts.push(
          `translateY(${interpolate(frame,[0,beatFrames],[motion.yStart || 0,motion.yEnd || 0])}px)`
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

      case "parallax":

        transformParts.push(
          `translateX(${interpolate(frame,[0,beatFrames],[motion.xStart || 0,motion.xEnd || 0])}px)`
        );

        break;

      case "float":

        transformParts.push(
          `translateY(${Math.sin(frame * (motion.speed || 0.5)) * (motion.amplitude || 10)}px)`
        );

        break;

      case "breathing":

        transformParts.push(
          `scale(${interpolate(Math.sin(frame * (motion.speed || 0.5)),[-1,1],[motion.scaleStart || 1,motion.scaleEnd || 1.05])})`
        );

        break;

      case "orbit":

        transformParts.push(
          `translateX(${Math.sin(frame * (motion.speed || 0.4)) * (motion.radius || 40)}px)`
        );

        transformParts.push(
          `translateY(${Math.cos(frame * (motion.speed || 0.4)) * (motion.radius || 20)}px)`
        );

        break;

      case "arcPan":

        transformParts.push(
          `translateX(${interpolate(frame,[0,beatFrames],[motion.xStart || -80,motion.xEnd || 80])}px)`
        );

        transformParts.push(
          `translateY(${interpolate(frame,[0,beatFrames],[motion.yStart || 40,motion.yEnd || -40])}px)`
        );

        break;

      case "droneRise":

        transformParts.push(
          `translateY(${interpolate(frame,[0,beatFrames],[motion.yStart || 120,motion.yEnd || -40])}px)`
        );

        transformParts.push(
          `scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart || 1.05,motion.scaleEnd || 1.2])})`
        );

        break;

      case "microZoom":

        transformParts.push(
          `scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart || 1,motion.scaleEnd || 1.12])})`
        );

        break;

      case "bounce":

        const bounce = spring({
          frame,
          fps,
          config: { damping: 8, stiffness: 120 }
        });

        transformParts.push(
          `scale(${interpolate(bounce,[0,1],[motion.scaleStart || 1.3,motion.scaleEnd || 1])})`
        );

        break;

    }

  }

  /* EXIT */

  if (exit.layer === "exit") {

    const exitStart = beatFrames - (exit.duration || 16);

    const progress = interpolate(
      frame,
      [exitStart, beatFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    switch (exit.type) {

      case "fade":
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