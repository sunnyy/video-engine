import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import AvatarLayer from "../elements/AvatarLayer";
import blockRegistry from "../../core/blockRegistry";
import { getLayoutSafeAreas } from "../../core/getLayoutSafeAreas";

export default function LayoutZoneRenderer({
  zone,
  slot,
  beat,
  project,
  components,
  layoutMeta
}) {

  if (!zone) return null;

  const padding = zone.style?.padding || {};
  const safe = getLayoutSafeAreas(beat.layout);
  const blockSafe = safe?.blocks || {};

  const content = zone.content || {};
  const background = zone.background || {};
  const block = content.block;

  const contentBox = {
    position: "absolute",
    top: padding.top || 0,
    right: padding.right || 0,
    bottom: padding.bottom || 0,
    left: padding.left || 0,
    overflow: "visible"
  };

  let BlockRenderer = null;
  let variant = "default";

  if (block?.type) {
    const entry = blockRegistry[block.type];
    BlockRenderer = entry?.renderer || null;
    variant = block?.variant || "default";
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden"
      }}
    >

      {/* BACKGROUND */}

      {background.kind === "color" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: background.color
          }}
        />
      )}

      {background.kind === "asset" && background.asset?.type === "image" && (
        <img
          src={background.asset.src}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: background.asset.objectFit || "cover"
          }}
        />
      )}

      {background.kind === "asset" && background.asset?.type === "video" && (
        <video
          src={background.asset.src}
          autoPlay
          muted
          loop
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: background.asset.objectFit || "cover"
          }}
        />
      )}

      {/* CONTENT */}

      <div style={contentBox}>

        {content.kind === "avatar" && (
          <AvatarLayer beat={beat} project={project} />
        )}

        {content.kind === "color" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: content.color
            }}
          />
        )}

        {content.kind === "asset" && (
          <AssetRenderer
            zone={{
              src: content.asset?.src,
              objectFit: content.asset?.objectFit,
              animation: content.asset?.animation,
              type: content.asset?.type
            }}
            beat={beat}
            slot={slot}
          />
        )}

        {BlockRenderer && (
          <div
            style={{
              position: "absolute",
              top: blockSafe.top || 0,
              left: blockSafe.left || 0,
              right: blockSafe.right || 0,
              bottom: blockSafe.bottom || 0
            }}
          >
            <BlockRenderer
              block={block}
              variant={variant}
              zone={zone}
              beat={beat}
              project={project}
            />
          </div>
        )}

      </div>

    </div>
  );
}