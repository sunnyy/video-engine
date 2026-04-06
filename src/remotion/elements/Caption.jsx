import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { captionStyleRegistry } from "../../core/captionStyleRegistry.jsx";
import { getLayoutSafeAreas }   from "../../core/getLayoutSafeAreas";

// Resolve caption.position (number 0-100) with backward compat for old string values
function resolvePositionY(position) {
  if (typeof position === "number") return Math.max(0, Math.min(100, position));
  if (position === "top")    return 15;
  if (position === "middle") return 50;
  return 80; // "bottom" or default
}

export default function Caption({ caption, beat, project }) {

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── early exits ── */
  if (!caption?.show || !caption?.text) return null;

  const startFrame = Math.floor(beat.start_sec * fps);
  const endFrame   = Math.floor(beat.end_sec * fps);
  if (frame < startFrame || frame >= endFrame) return null;

  const localFrame = frame - startFrame;

  /* ── resolve style ── */
  const styleKey   = caption.style || "wordBlaze";
  const styleEntry = captionStyleRegistry[styleKey] ?? captionStyleRegistry.wordBlaze;

  const brandColor = project?.meta?.brand?.color
    ?? project?.meta?.brand_color
    ?? project?.visualIdentity?.colorStory?.accent
    ?? "#00F2EA";

  const brandFont = project?.meta?.brand?.font ?? null;

  /* ── resolve position + safe areas ── */
  const positionY   = resolvePositionY(caption.position);
  const safeAreas   = getLayoutSafeAreas(beat.layout);
  const captionSafe = safeAreas?.caption || {};

  /* ── render caption style ── */
  // Beat duration in seconds — used for caption word timing
  const beatDuration = beat.end_sec - beat.start_sec || beat.duration_sec || 3;

  // Only use beat-aware timing if duration is reasonable (>1s)
  const safeBeatDuration = beatDuration >= 1 ? beatDuration : null;

  const rendered = styleEntry.render({
    text:         caption.text,
    frame:        localFrame,
    fps,
    brandColor,
    brandFont,
    beatDuration: safeBeatDuration,
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      <div
        style={{
          position:  "absolute",
          top:       `${positionY}%`,
          left:      captionSafe.left  ?? 40,
          right:     captionSafe.right ?? 40,
          transform: "translateY(-50%)",
          display:   "flex",
          justifyContent: "center",
        }}
      >
        <div style={{
          width: "100%",
          maxWidth: 960,
          lineHeight: 1.1,
          fontFamily: brandFont ? `'${brandFont}', sans-serif` : undefined,
        }}>
          {rendered}
        </div>
      </div>
    </AbsoluteFill>
  );
}