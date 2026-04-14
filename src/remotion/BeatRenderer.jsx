/**
 * BeatRenderer.jsx
 * src/remotion/BeatRenderer.jsx
 *
 * Uses universal LayoutRenderer instead of per-layout JSX components.
 * Looks up layout definition from layoutRegistry and passes to LayoutRenderer.
 */

import { AbsoluteFill } from "remotion";

import LayoutRenderer from "./layouts/LayoutRenderer.jsx";
import SFXRenderer from "./elements/SFXRenderer.jsx";
import OverlayRenderer from "./elements/OverlayRenderer";
import { getLayoutDef, getAllLayouts } from "../core/registries/layoutRegistry.js";

export default function BeatRenderer({ beat, project, previewMode = false, sequenceStartFrame = 0 }) {

  const layoutId = beat?.layout || "FullBleed";
  // project.meta.inlineLayoutDef is injected by the admin LayoutEditor for unsaved/"new" layouts
  // so the canvas shows the correct zones without needing a registry entry.
  // Only fall back to first layout as last resort when DB is empty.
  const layoutDef = getLayoutDef(layoutId)
    ?? project?.meta?.inlineLayoutDef
    ?? getAllLayouts()[0]?.def
    ?? null;

  const overlays = Array.isArray(beat.overlays) ? beat.overlays : [];

  if (!layoutDef) {
    return (
      <AbsoluteFill style={{ background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#555", fontSize: 14 }}>No layouts in database yet</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>

      <LayoutRenderer
        beat={beat}
        project={project}
        layoutDef={layoutDef}
        previewMode={previewMode}
        sequenceStartFrame={sequenceStartFrame}
      />

      <OverlayRenderer overlays={overlays} />

      <SFXRenderer beat={beat} />

    </AbsoluteFill>
  );
}
