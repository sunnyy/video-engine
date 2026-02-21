import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import AssetPicker from "./AssetPicker";

export default function AssetsSection({ beat, project }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [openSlot, setOpenSlot] = useState(null);

  const handleSelect = (asset) => {
    updateBeat(beat.id, {
      assets: {
        ...beat.assets,
        [openSlot]: asset,
      },
    });

    setOpenSlot(null);
  };

  return (
    <div>
      <h4 className="mb-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Assets
      </h4>

      <div className="space-y-6">
        <AssetSlot
          label="Main Asset"
          asset={beat.assets.main}
          onClick={() => setOpenSlot("main")}
        />

        {beat.visual_mode === "dual" && (
          <AssetSlot
            label="Secondary Asset"
            asset={beat.assets.secondary}
            onClick={() => setOpenSlot("secondary")}
          />
        )}
      </div>

      {openSlot && (
        <AssetPicker
          orientation={project.meta.orientation}
          onSelect={handleSelect}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

function AssetSlot({ label, asset, onClick }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-gray-500 uppercase">
        {label}
      </div>

      <div
        onClick={onClick}
        className="group relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-indigo-500"
      >
        {!asset && (
          <span className="text-sm text-gray-400">
            Click to select asset
          </span>
        )}

        {/* Background Preview */}
        {asset?.type === "background" && (
          <div
            className="h-full w-full"
            style={
              asset.value?.color
                ? { background: asset.value.color }
                : { background: asset.value?.gradient }
            }
          />
        )}

        {/* Image / Upload Preview */}
        {asset?.type !== "background" &&
          asset?.src && (
            <img
              src={asset.src}
              className="h-full w-full object-cover"
            />
          )}

        {asset && (
          <>
            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/40" />

            <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              {asset.type === "upload"
                ? "Uploaded"
                : asset.type === "background"
                ? "Background"
                : "Library"}
            </div>

            <div className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs shadow">
              Replace
            </div>
          </>
        )}
      </div>
    </div>
  );
}