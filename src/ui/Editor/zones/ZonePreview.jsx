import React from "react";

export default function ZonePreview({ zone, mode = "content" }) {

  const content = zone?.content || {};
  const background = zone?.background || {};

  const renderBackground = () => {

    if (!background?.kind) return null;

    if (background.kind === "color") {
      return (
        <div
          className="absolute inset-0"
          style={{ background: background.color }}
        />
      );
    }

    if (background.kind === "asset") {

      const asset = background.asset || {};

      if (asset.type === "image") {
        return (
          <img
            src={asset.src}
            className="absolute inset-0 w-full h-full object-cover"
          />
        );
      }

      if (asset.type === "video") {
        return (
          <video
            src={asset.src}
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        );
      }

    }

    return null;

  };

  const renderContent = () => {

    if (!content?.kind) return null;

    if (content.kind === "color") {

      return (
        <div
          className="absolute inset-0"
          style={{ background: content.color }}
        />
      );

    }

    if (content.kind === "asset") {

      const asset = content.asset || {};

      if (asset.type === "image") {
        return (
          <img
            src={asset.src}
            className="absolute inset-0 w-full h-full object-cover"
          />
        );
      }

      if (asset.type === "video") {
        return (
          <video
            src={asset.src}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        );
      }

    }

    if (content.kind === "block") {

      return (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold bg-gray-100">
          {content.block?.type || "Block"}
        </div>
      );

    }

    return null;

  };

  return (

    <div className="relative w-full h-[140px] border rounded overflow-hidden bg-gray-200">

      {mode === "background" && renderBackground()}

      {mode === "content" && (

        <>
          {renderBackground()}
          {renderContent()}
        </>

      )}

    </div>

  );

}