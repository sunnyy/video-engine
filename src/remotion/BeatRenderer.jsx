/**
 * BeatRenderer.jsx
 * src/remotion/BeatRenderer.jsx
 *
 * Uses universal LayoutRenderer instead of per-layout JSX components.
 * Looks up layout definition from layoutRegistry and passes to LayoutRenderer.
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

import LayoutRenderer from "./layouts/LayoutRenderer.jsx";
import SFXRenderer from "./elements/SFXRenderer.jsx";
import OverlayRenderer from "./elements/OverlayRenderer";
import { getLayoutDef } from "../core/layoutRegistry.js";

export default function BeatRenderer({ beat, project, previewMode = false }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const layoutId = beat?.layout || "FullBleed";
  const layoutDef = getLayoutDef(layoutId);

  const overlays = Array.isArray(beat.overlays) ? beat.overlays : [];

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
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    if (localFrame >= interruptFrame - 4 && localFrame <= interruptFrame) {
      style.transform = `scale(${progress})`;
    }
  });

  if (!layoutDef) {
    return (
      <AbsoluteFill style={{ background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#fff", fontSize: 18 }}>Layout not found: {layoutId}</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={style}>

      <LayoutRenderer
        beat={beat}
        project={project}
        layoutDef={layoutDef}
        previewMode={previewMode}
      />

      <OverlayRenderer overlays={overlays} />

      <SFXRenderer beat={beat} />

    </AbsoluteFill>
  );
}
