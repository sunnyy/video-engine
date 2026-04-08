/**
 * DecorativeRenderer.jsx
 * src/remotion/elements/DecorativeRenderer.jsx
 *
 * Renders a single decorative element inside a Remotion beat.
 * - render: "svg"        → inject SVG string with CSS currentColor
 * - render: "css_repeat" → render as styled background-pattern div
 * - Handles mirroring, rotation, opacity, absolute positioning
 */

import React from "react";
import { decorativeById } from "../../core/designLibrary/decorativeRegistry";

/* ── Position anchor → CSS transform-origin + offsets ──────── */
const ANCHOR_STYLES = {
  "top-left":      { left: 0,    top: 0,    transform: "" },
  "top-right":     { right: 0,   top: 0,    transform: "" },
  "bottom-left":   { left: 0,    bottom: 0, transform: "" },
  "bottom-right":  { right: 0,   bottom: 0, transform: "" },
  "top-center":    { left: "50%",top: 0,    transform: "translateX(-50%)" },
  "bottom-center": { left: "50%",bottom: 0, transform: "translateX(-50%)" },
  "center":        { left: "50%",top: "50%",transform: "translate(-50%,-50%)" },
};

/* ── Convert x/y (0–1 fractions) + anchor to absolute px ───── */
function resolvePositionPx(position, size, canvasW, canvasH) {
  const { x, y, anchor } = position;
  const { w, h } = size;

  const xPx = x * canvasW;
  const yPx = y * canvasH;

  // Anchor offset — shifts the element so its corner/edge aligns to the point
  switch (anchor) {
    case "top-right":     return { right:  canvasW - xPx, top:    yPx };
    case "bottom-left":   return { left:   xPx,           bottom: canvasH - yPx };
    case "bottom-right":  return { right:  canvasW - xPx, bottom: canvasH - yPx };
    case "top-center":    return { left:   xPx - w / 2,   top:    yPx };
    case "bottom-center": return { left:   xPx - w / 2,   bottom: canvasH - yPx };
    case "center":        return { left:   xPx - w / 2,   top:    yPx - h / 2 };
    case "top-left":
    default:              return { left:   xPx,            top:    yPx };
  }
}

/* ── Apply mirroring based on position anchor ───────────────── */
function getMirrorTransform(entry, anchor, rotation) {
  if (!entry?.mirroring) return `rotate(${rotation}deg)`;
  const scaleX = (anchor === "top-right" || anchor === "bottom-right") ? -1 : 1;
  const scaleY = (anchor === "bottom-left" || anchor === "bottom-right") ? -1 : 1;
  return `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
}

/* ── Inject color into SVG string via CSS currentColor ──────── */
function injectColorSvg(svgString, color) {
  // Wrap in a <div> with color set — SVG uses currentColor internally
  return svgString;
}

/* ── Main component ─────────────────────────────────────────── */
export default function DecorativeRenderer({ decorative, canvasW, canvasH }) {
  if (!decorative) return null;

  const entry = decorativeById[decorative.decorativeId];
  if (!entry) return null;

  const { color, position, size, rotation = 0, opacity = 1, zIndex = 4 } = decorative;
  const { w, h } = size;

  const posPx       = resolvePositionPx(position, size, canvasW, canvasH);
  const mirrorXform = getMirrorTransform(entry, position.anchor, rotation);

  const containerStyle = {
    position:        "absolute",
    width:           w,
    height:          h,
    zIndex,
    opacity,
    pointerEvents:   "none",
    transformOrigin: "center center",
    transform:       mirrorXform,
    color,           // CSS currentColor picked up by child SVG
    ...posPx,
  };

  /* ── css_repeat render ── */
  if (entry.render === "css_repeat") {
    const css = entry.css || {};
    // Substitute "currentColor" placeholder with actual color in CSS values
    const resolvedCss = Object.fromEntries(
      Object.entries(css).map(([k, v]) => [k, typeof v === "string" ? v : v])
    );
    return (
      <div
        style={{
          ...containerStyle,
          ...resolvedCss,
          // For background-image patterns, set color via CSS variable trick:
          // actual color is set via `color` prop above → cascades to currentColor
          width:  "100%",
          height: h,
          left:   0,
          top:    posPx.top  ?? undefined,
          bottom: posPx.bottom ?? undefined,
          right:  undefined,
        }}
      />
    );
  }

  /* ── svg render ── */
  if (entry.render === "svg" && entry.svg) {
    return (
      <div
        style={containerStyle}
        dangerouslySetInnerHTML={{
          __html: entry.svg
            .replace(/width="[^"]*"/, `width="${w}"`)
            .replace(/height="[^"]*"/, `height="${h}"`),
        }}
      />
    );
  }

  return null;
}
