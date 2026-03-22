import React from "react";
import { AbsoluteFill } from "remotion";
import { layoutRegistry } from "../core/layoutRegistry";
import AssetRenderer from "./elements/AssetRenderer";
import AudioCueRenderer from "./elements/AudioCueRenderer";

export default function BeatRenderer({ beat, project }) {

  const layoutName = beat?.layout || "FullZone";

  const layout = layoutRegistry[layoutName];

  if (!layout) return null;

  const LayoutComponent = layout.component;

  const zones = beat.zones || {};
  const components = beat.components || {};
  const heading = beat.heading || null;
  const caption = beat.caption || null;

  const backgroundZone =
    Object.values(zones).find((z) => z?.type === "background") || null;

  return (
    <>
      {backgroundZone && (
        <AbsoluteFill>
          <AssetRenderer
            zone={backgroundZone}
            beat={beat}
            slot="background"
          />
        </AbsoluteFill>
      )}

      <LayoutComponent
        beat={beat}
        project={project}
        zones={zones}
        heading={heading}
        components={components}
        caption={caption}
        layoutMeta={layout}
      />

      <AudioCueRenderer beat={beat} />
    </>
  );

}