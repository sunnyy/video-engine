import React from "react";
import { AbsoluteFill } from "remotion";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function FloatingLayout({ beat, project }) {
  const asset = beat.assets?.main;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#111",
      }}
    >
      {asset ? (
        <AssetRenderer asset={asset} />
      ) : (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(135deg, #222, #111)",
          }}
        />
      )}

      {beat.caption?.show && (
        <Caption beat={beat} project={project} />
      )}

      <ComponentsRenderer
        components={beat.components}
      />
    </AbsoluteFill>
  );
}