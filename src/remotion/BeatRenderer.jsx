import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { layoutRegistry } from "../core/layoutRegistry.js";
import AudioCueRenderer from "./elements/AudioCueRenderer";
import OverlayRenderer from "./elements/OverlayRenderer";
import GrainOverlay from "./effects/GrainOverlay";
import VignetteLayer from "./effects/VignetteLayer";

export default function BeatRenderer({ beat, project }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const layoutName = beat?.layout || "FullZone";
  const layout = layoutRegistry[layoutName];

  if (!layout) return null;

  const LayoutComponent = layout.component;

  const zones = beat.zones || {};
  const components = beat.components || {};
  const overlays = beat.overlays || {};

  const beatStart = Math.floor((beat.start_sec || 0) * fps);
  const beatEnd = Math.floor((beat.end_sec || 0) * fps);

  const localFrame = frame - beatStart;
  const beatFrames = beatEnd - beatStart;

  let style = {};

  /* PATTERN INTERRUPT */

  const interruptPoints = [0.4, 0.75];

  interruptPoints.forEach((p) => {

    const interruptFrame = beatFrames * p;

    const progress = interpolate(
      localFrame,
      [interruptFrame - 4, interruptFrame],
      [1.08, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      }
    );

    if (localFrame >= interruptFrame - 4 && localFrame <= interruptFrame) {
      style.transform = `scale(${progress})`;
    }

  });

  return (

    <AbsoluteFill style={style}>

      <LayoutComponent
        beat={beat}
        project={project}
        zones={zones}
        components={components}
        layoutMeta={layout}
      />

      <OverlayRenderer overlays={overlays} />

      <AudioCueRenderer beat={beat} />

      <GrainOverlay intensity={0.25} />

      <VignetteLayer strength={0.35} />

    </AbsoluteFill>

  );

}