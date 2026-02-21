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

      <div className="flex gap-4 overflow-x-auto pb-2">
        <AssetSlot
          label="Main"
          asset={beat.assets.main}
          onClick={() => setOpenSlot("main")}
        />

        {beat.visual_mode === "dual" && (
          <AssetSlot
            label="Secondary"
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
    <div className="flex-shrink-0 w-[120px]">
      <div className="mb-2 text-[10px] font-medium text-gray-500 uppercase">
        {label}
      </div>

      <div
        onClick={onClick}
        className="group relative h-[160px] w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-indigo-500"
      >
        {!asset && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400 text-center px-2">
            Select
          </div>
        )}

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

            <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white">
              {asset.type === "upload"
                ? "Upload"
                : asset.type === "background"
                ? "BG"
                : "Library"}
            </div>

            <div className="absolute right-1 top-1 rounded bg-white px-1 py-0.5 text-[9px] shadow">
              Replace
            </div>
          </>
        )}
      </div>
    </div>
  );
}