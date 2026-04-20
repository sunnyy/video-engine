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
import { getLayoutDef } from "../core/registries/layoutRegistry.js";
import LayoutBackgroundRenderer from "./layouts/LayoutBackgroundRenderer.jsx";

export default function BeatRenderer({ beat, project, previewMode = false, sequenceStartFrame = 0 }) {

  const layoutId = beat?.layout || null;
  // During rendering, layout defs are embedded in project.meta.layoutDefs by the server
  // so Chromium never needs to call Supabase. Fall back to the live registry for the
  // web editor preview, and to inlineLayoutDef for unsaved admin layouts.
  // Never fall back to getAllLayouts()[0] — that would render a random layout on blank beats.
  const layoutDef = layoutId
    ? (project?.meta?.layoutDefs?.[layoutId]
        ?? getLayoutDef(layoutId)
        ?? project?.meta?.inlineLayoutDef
        ?? null)
    : null;

  const overlays = Array.isArray(beat.overlays) ? beat.overlays : [];

  // No layout assigned — render just the background (blank canvas for from-scratch beats)
  if (!layoutDef) {
    const bg = beat?.layoutBackground || { type: "color", value: "#111118" };
    return (
      <AbsoluteFill>
        <LayoutBackgroundRenderer background={bg} beat={beat} />
        <OverlayRenderer overlays={overlays} />
        <SFXRenderer beat={beat} />
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
