/**
 * ElementRenderer.jsx
 * src/remotion/elements/ElementRenderer.jsx
 *
 * Renders a single element zone inside a Remotion composition.
 * Used by LayoutRenderer for zones with type === "element".
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { elementsRegistry } from "../../core/elementsRegistry";

export default function ElementRenderer({ zone, beatDurationSec }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elementId = zone.content?.elementId;
  const entry     = elementId ? elementsRegistry[elementId] : null;
  if (!entry) return null;

  const props      = { ...entry.defaultProps, ...(zone.content?.props || {}) };
  const startFrame = Math.round((zone.start ?? 0) * fps);
  const endFrame   = zone.end != null
    ? Math.round(zone.end * fps)
    : Math.round(beatDurationSec * fps);

  if (frame < startFrame || frame >= endFrame) return null;

  // Fade-in for all elements
  const local      = frame - startFrame;
  const fadeDur    = Math.min(12, endFrame - startFrame);
  const opacity    = interpolate(local, [0, fadeDur], [0, 1], { extrapolateRight: "clamp" });

  const containerStyle = {
    position: "absolute",
    left:     `${zone.x      ?? 0}%`,
    top:      `${zone.y      ?? 0}%`,
    width:    `${zone.width  ?? 10}%`,
    height:   `${zone.height ?? 10}%`,
    zIndex:   zone.zIndex ?? 5,
    opacity:  (props.opacity ?? 1) * opacity,
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle}>
      {entry.render(props)}
    </div>
  );
}
