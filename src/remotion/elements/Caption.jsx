import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { captionStyleRegistry } from "../../core/captionStyleRegistry.jsx";
import { captionPositions } from "../../core/captionPositionRegistry";
import { getLayoutSafeAreas } from "../../core/getLayoutSafeAreas";
import { layoutRegistry } from "../../core/layoutRegistry.js";

export default function Caption({ caption, beat, project }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── early exits ── */
  if (!caption?.show || !caption?.text) return null;

  const layout = layoutRegistry[beat.layout];
  const captionStrategy = layout?.captionStrategy || "always";
  if (captionStrategy === "never") return null;
  if (captionStrategy === "auto") {
    const hasComponents = beat.components && Object.keys(beat.components).length > 0;
    if (hasComponents) return null;
  }

  const startFrame = Math.floor(beat.start_sec * fps);
  const endFrame   = Math.floor(beat.end_sec * fps);
  if (frame < startFrame || frame >= endFrame) return null;

  const localFrame = frame - startFrame;

  /* ── resolve style ── */
  const styleKey    = caption.style || "wordBlaze";
  const styleEntry  = captionStyleRegistry[styleKey] ?? captionStyleRegistry.wordBlaze;
  const brandColor  = project?.meta?.brand_color
    ?? project?.visualIdentity?.colorStory?.accent
    ?? "#00F2EA";

  /* ── resolve position + safe areas ── */
  const positionConfig = captionPositions[caption.position || "bottom"]
    ?? captionPositions.bottom;
  const safeAreas   = getLayoutSafeAreas(beat.layout);
  const captionSafe = safeAreas?.caption || {};

  /* ── render caption style ── */
  const rendered = styleEntry.render({
    text:       caption.text,
    frame:      localFrame,
    fps,
    brandColor,
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft:   captionSafe.left   ?? 40,
        paddingRight:  captionSafe.right  ?? 40,
        paddingTop:    captionSafe.top    ?? 40,
        paddingBottom: captionSafe.bottom ?? 60,
        ...positionConfig.container,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          lineHeight: 1.1,
        }}
      >
        {rendered}
      </div>
    </AbsoluteFill>
  );
}