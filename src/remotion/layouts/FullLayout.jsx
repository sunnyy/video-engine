import React from "react";
import { AbsoluteFill } from "remotion";
import AssetRenderer from "../elements/AssetRenderer";
import Caption from "../elements/Caption";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function FullLayout({ beat, project }) {
  const isTalkingHead =
    project.meta.mode === "talking_head";

  const contentType =
    beat.content_type ||
    (isTalkingHead ? "avatar" : "asset");

  const showAsset =
    contentType === "asset" &&
    beat.assets?.main;

  const showAvatar =
    contentType === "avatar";

  return (
    <AbsoluteFill style={{ position: "relative" }}>
      {showAsset && (
        <AbsoluteFill style={{ zIndex: 1 }}>
          <AssetRenderer
            asset={beat.assets.main}
            beat={beat}
            slot="main"
          />
        </AbsoluteFill>
      )}

      {!showAsset && !showAvatar && (
        <AbsoluteFill
          style={{
            background: "linear-gradient(135deg, #222, #111)",
            zIndex: 1,
          }}
        />
      )}

      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <ComponentsRenderer components={beat.components} />
      </div>
    </AbsoluteFill>
  );
}