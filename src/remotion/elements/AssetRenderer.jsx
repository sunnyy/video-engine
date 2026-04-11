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

import { transitionsRegistry } from "../../core/registries/transitionsRegistry";
import { motionsRegistry } from "../../core/registries/motionsRegistry";

export default function AssetRenderer({ zone, beat, slot }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const source    = zone?.src       || null;
  const objectFit = zone?.objectFit || "cover";

  /* ── Visual styling passed from LayoutZoneRenderer ── */
  const borderRadius = zone?.borderRadius ?? 0;
  const boxShadow    = zone?.boxShadow    || undefined;
  const scale        = zone?.scale        ?? 1;

  const beatFrames = Math.floor((beat?.duration_sec || 2) * fps);

  const enterKey   = zone?.enterTransition || beat?.asset_settings?.[slot]?.enterTransition || "fadeIn";
  const exitKey    = zone?.exitTransition  || beat?.asset_settings?.[slot]?.exitTransition  || "none";
  const motionKey  = zone?.motion          || beat?.asset_settings?.[slot]?.motion          || "none";
  const enterDelay = zone?.enterDelay || 0;

  const enter  = transitionsRegistry.enter[enterKey]  ? transitionsRegistry.enter[enterKey]()  : transitionsRegistry.enter.none();
  const exit   = transitionsRegistry.exit[exitKey]    ? transitionsRegistry.exit[exitKey]()    : transitionsRegistry.exit.none();
  const motion = motionsRegistry[motionKey]            ? motionsRegistry[motionKey]()            : motionsRegistry.none();

  let style = {};
  let transformParts = [];

  /* Apply scale first so it combines with motion/enter transforms */
  if (scale < 1) {
    transformParts.push(`scale(${scale})`);
  }

  const localFrame = Math.max(frame - enterDelay, 0);

  /* ── ENTER ── */
  if (enter.layer === "entry") {
    const progress = interpolate(localFrame, [0, enter.duration || 16], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic)
    });
    const springProgress = spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 120, mass: 0.6 } });

    switch (enter.type) {
      case "fade":       style.opacity = progress; break;
      case "slideY":     transformParts.push(`translateY(${interpolate(progress,[0,1],[enter.from||200,0])}px)`); break;
      case "slideX":     transformParts.push(`translateX(${interpolate(progress,[0,1],[enter.from||300,0])}px)`); break;
      case "scale":      transformParts.push(`scale(${interpolate(progress,[0,1],[enter.from||0.7,1])})`); break;
      case "springScale":transformParts.push(`scale(${interpolate(springProgress,[0,1],[enter.from||1.4,1])})`); break;
      case "blur":       style.filter = `blur(${interpolate(progress,[0,1],[enter.from||40,0])}px)`; break;
      case "wipe":       style.clipPath = `inset(0 ${interpolate(progress,[0,1],[100,0])}% 0 0)`; break;
      default: break;
    }
  }

  /* ── MOTION ── */
  if (motion.type !== "none") {
    switch (motion.type) {
      case "scaleDrift":
        transformParts.push(`scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart||1.05,motion.scaleEnd||1.2])})`);
        break;
      case "drift":
        transformParts.push(`scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart||1.1,motion.scaleEnd||1.2])})`);
        transformParts.push(`translateX(${interpolate(frame,[0,beatFrames],[motion.xStart||0,motion.xEnd||0])}px)`);
        transformParts.push(`translateY(${interpolate(frame,[0,beatFrames],[motion.yStart||0,motion.yEnd||0])}px)`);
        break;
      case "parallax":
        transformParts.push(`translateX(${interpolate(frame,[0,beatFrames],[motion.xStart||0,motion.xEnd||0])}px)`);
        break;
      case "float":
        transformParts.push(`translateY(${Math.sin(frame*(motion.speed||0.5))*(motion.amplitude||10)}px)`);
        break;
      case "breathing":
        transformParts.push(`scale(${interpolate(Math.sin(frame*(motion.speed||0.5)),[-1,1],[motion.scaleStart||1,motion.scaleEnd||1.05])})`);
        break;
      case "orbit":
        transformParts.push(`translateX(${Math.sin(frame*(motion.speed||0.4))*(motion.radius||40)}px)`);
        transformParts.push(`translateY(${Math.cos(frame*(motion.speed||0.4))*(motion.radius||20)}px)`);
        break;
      case "arcPan":
        transformParts.push(`translateX(${interpolate(frame,[0,beatFrames],[motion.xStart||-80,motion.xEnd||80])}px)`);
        transformParts.push(`translateY(${interpolate(frame,[0,beatFrames],[motion.yStart||40,motion.yEnd||-40])}px)`);
        break;
      case "droneRise":
        transformParts.push(`translateY(${interpolate(frame,[0,beatFrames],[motion.yStart||120,motion.yEnd||-40])}px)`);
        transformParts.push(`scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart||1.05,motion.scaleEnd||1.2])})`);
        break;
      case "microZoom":
        transformParts.push(`scale(${interpolate(frame,[0,beatFrames],[motion.scaleStart||1,motion.scaleEnd||1.12])})`);
        break;
      case "bounce":
        const bounce = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
        transformParts.push(`scale(${interpolate(bounce,[0,1],[motion.scaleStart||1.3,motion.scaleEnd||1])})`);
        break;
      default: break;
    }
  }

  /* ── EXIT ── */
  if (exit.layer === "exit") {
    const exitStart = beatFrames - (exit.duration || 16);
    const progress  = interpolate(frame, [exitStart, beatFrames], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp"
    });
    switch (exit.type) {
      case "fade":  style.opacity = interpolate(progress,[0,1],[1,0]); break;
      case "slideY":transformParts.push(`translateY(${interpolate(progress,[0,1],[0,exit.to||200])}px)`); break;
      case "slideX":transformParts.push(`translateX(${interpolate(progress,[0,1],[0,exit.to||300])}px)`); break;
      case "scale": transformParts.push(`scale(${interpolate(progress,[0,1],[1,exit.to||0.7])})`); break;
      case "blur":  style.filter = `blur(${interpolate(progress,[0,1],[0,exit.to||40])}px)`; break;
      default: break;
    }
  }

  if (transformParts.length) {
    style.transform = transformParts.join(" ");
  }

  if (!source) return null;

  const isVideo =
    source.toLowerCase().endsWith(".mp4") ||
    source.toLowerCase().endsWith(".webm");

  /* ── Border radius + shadow applied directly to Video/Img ── */
  const mediaStyle = {
    width:        "100%",
    height:       "100%",
    objectFit,
    borderRadius: borderRadius > 0 ? borderRadius : undefined,
    boxShadow:    boxShadow    || undefined,
  };

  return (
    <AbsoluteFill style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", overflow: "hidden",
    }}>
      <div style={{ width: "100%", height: "100%", ...style }}>
        {isVideo ? (
          <Video src={source} muted loop style={mediaStyle} />
        ) : (
          <Img src={source} style={mediaStyle} />
        )}
      </div>
    </AbsoluteFill>
  );
}