/**
 * LayoutZoneRenderer.jsx
 * src/remotion/layouts/LayoutZoneRenderer.jsx
 *
 * borderRadius, boxShadow, scale passed directly into AssetRenderer
 * so they animate with the asset, not sit on an empty wrapper.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import AssetRenderer    from "../elements/AssetRenderer";
import AvatarLayer      from "../elements/AvatarLayer";
import blockRegistry    from "../../core/blockRegistry";
import { getLayoutSafeAreas } from "../../core/getLayoutSafeAreas";

export default function LayoutZoneRenderer({ zone, slot, beat, project }) {
  if (!zone) return null;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Styling — passed through to AssetRenderer ── */
  const borderRadius = Number(zone.style?.borderRadius ?? 0);
  const shadowBlur   = Number(zone.style?.shadowBlur   ?? 0);
  const scale        = Number(zone.style?.scale        ?? 1);

  const boxShadow = shadowBlur > 0
    ? `0 ${Math.round(shadowBlur * 0.4)}px ${shadowBlur}px rgba(0,0,0,0.65)`
    : undefined;

  const safe      = getLayoutSafeAreas(beat.layout);
  const blockSafe = safe?.blocks || {};

  const content    = zone.content    || {};
  const background = zone.background || {};
  const block      = content.block;

  let BlockRenderer = null;
  let variant       = "default";
  if (block?.type) {
    const entry   = blockRegistry[block.type];
    BlockRenderer = entry?.renderer || null;
    variant       = block?.variant  || entry?.variants?.[0] || "default";
  }

  const focus = zone.focus || "secondary";
  const focusStyle =
    focus === "primary"    ? { zIndex: 5 } :
    focus === "background" ? { zIndex: 1, opacity: 0.85 } :
                             { zIndex: 3 };

  const zoneIndex   = parseInt(slot.replace("z", ""), 10) - 1 || 0;
  const stagger     = beat?.choreography?.stagger_ms || 0;
  const delayFrames = Math.floor((stagger * zoneIndex) / 1000 * fps);
  const visible     = frame >= delayFrames;

  const assetMissing =
    content.kind === "asset" && (!content.asset || !content.asset.src);

  const bgOpacity = background.asset?.opacity ?? 1;
  const bgBlur    = background.asset?.blur    ?? 0;

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      overflow: "hidden", opacity: visible ? 1 : 0, ...focusStyle,
    }}>

      {/* Background — always edge to edge, no styling */}
      {background.kind === "color" && (
        <div style={{
          position: "absolute", inset: 0,
          background: background.color,
          backgroundSize: background.backgroundSize || "auto",
        }} />
      )}

      {background.kind === "asset" && background.asset?.src && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: bgOpacity,
          filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined,
        }}>
          <AssetRenderer
            zone={{
              src:             background.asset.src,
              objectFit:       background.asset.objectFit       || "cover",
              enterTransition: background.asset.enterTransition || "fadeIn",
              exitTransition:  background.asset.exitTransition  || "none",
              motion:          background.asset.motion          || "none",
              type:            background.asset.type,
              /* no borderRadius/shadow on background asset */
            }}
            beat={beat}
            slot={`${slot}_bg`}
          />
        </div>
      )}

      {/* Content asset — borderRadius, boxShadow, scale on the media element itself */}
      {content.kind === "asset" && content.asset?.src && (
        <AssetRenderer
          zone={{
            src:             content.asset.src,
            objectFit:       content.asset.objectFit       || "cover",
            enterTransition: content.asset.enterTransition || "fadeIn",
            exitTransition:  content.asset.exitTransition  || "none",
            motion:          content.asset.motion          || "none",
            type:            content.asset.type,
            borderRadius,
            boxShadow,
            scale,
          }}
          beat={beat}
          slot={slot}
        />
      )}

      {content.kind === "avatar" && (
        <div style={{ position: "absolute", inset: 0 }}>
          <AvatarLayer beat={beat} project={project} />
        </div>
      )}

      {content.kind === "color" && (
        <div style={{
          position: "absolute", inset: 0,
          background: content.color,
          borderRadius: borderRadius > 0 ? borderRadius : undefined,
          boxShadow,
          transform: scale < 1 ? `scale(${scale})` : undefined,
        }} />
      )}

      {assetMissing && (
        <div style={{
          position: "absolute", inset: 0,
          border: "2px dashed rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.2)",
        }}>
          ⚠ Asset Required
        </div>
      )}

      {BlockRenderer && (
        <div style={{
          position: "absolute",
          top:    blockSafe.top    ?? 0,
          left:   blockSafe.left   ?? 0,
          right:  blockSafe.right  ?? 0,
          bottom: blockSafe.bottom ?? 0,
        }}>
          <BlockRenderer
            block={block} variant={variant}
            zone={zone} beat={beat} project={project}
          />
        </div>
      )}

    </div>
  );
}