import React from "react";
import AssetRenderer from "../elements/AssetRenderer";
import ComponentsRenderer from "../elements/ComponentsRenderer";

export default function QuoteCard({
  zones,
  heading,
  components,
  beat,
  project,
  layoutMeta
}) {

  const background = zones?.z1;
  const headingSafe = layoutMeta?.safeAreas?.heading || {};
  const hasHeading = heading && heading.trim() !== "";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* Background */}
      {background && (
        <AssetRenderer zone={background} beat={beat} slot="z1" />
      )}

      {/* Heading */}
      {hasHeading && (
        <div
          style={{
            position: "absolute",
            left: headingSafe.left || 120,
            right: headingSafe.right || 120,
            top: headingSafe.top || 140,
            padding: 40,
            background: "rgba(0,0,0,0.55)",
            borderRadius: 24,
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {heading}
          </div>
        </div>
      )}

      {/* Center Quote Area */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70%",
          maxWidth: 900,
          zIndex: 6,
          textAlign: "center",
        }}
      >
        <ComponentsRenderer
          components={components}
          beat={beat}
          project={project}
        />
      </div>

    </div>
  );
}