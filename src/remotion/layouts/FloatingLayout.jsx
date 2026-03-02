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
        zIndex: 0, // allow avatar to appear above
      }}
    >
      {asset ? (
        <AssetRenderer
          asset={asset}
          beat={beat}
          slot="main"
        />
      ) : (
        <AbsoluteFill
          style={{
            background: "linear-gradient(135deg, #222, #111)",
          }}
        />
      )}

      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <ComponentsRenderer components={beat.components} />
      </div>
    </AbsoluteFill>
  );
}