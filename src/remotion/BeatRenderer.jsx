import React from "react";
import { layoutRegistry } from "../core/layoutRegistry";
import AudioCueRenderer from "./elements/AudioCueRenderer";
import OverlayRenderer from "./elements/OverlayRenderer";

export default function BeatRenderer({ beat, project }) {

  const layoutName = beat?.layout || "FullZone";
  const layout = layoutRegistry[layoutName];

  if (!layout) return null;

  const LayoutComponent = layout.component;

  const zones = beat.zones || {};
  const components = beat.components || {};
  const overlays = beat.overlays || {};

  return (
    <>
      <LayoutComponent
        beat={beat}
        project={project}
        zones={zones}
        components={components}
        layoutMeta={layout}
      />

      <OverlayRenderer overlays={overlays} />

      <AudioCueRenderer beat={beat} />
    </>
  );
}