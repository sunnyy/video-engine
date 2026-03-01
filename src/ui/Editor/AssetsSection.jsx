import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import AssetPicker from "./AssetPicker";

export default function AssetsSection({ beat, project }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [openSlot, setOpenSlot] = useState(null);
  const databaseId = useProjectStore((s) => s.databaseId);

  const handleSelect = (asset) => {
    if (asset.type === "background") {
      updateBeat(beat.id, {
        assets: {
          ...beat.assets,
          [openSlot]: asset,
        },
      });
    } else {
      updateBeat(beat.id, {
        assetAttach: asset,
        zone: openSlot,
      });
    }

    setOpenSlot(null);
  };

  const handleRemove = (slot) => {
    updateBeat(beat.id, {
      assets: {
        ...beat.assets,
        [slot]: null,
      },
    });
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
          onRemove={() => handleRemove("main")}
        />

        {beat.visual_mode === "dual" && (
          <AssetSlot
            label="Secondary"
            asset={beat.assets.secondary}
            onClick={() => setOpenSlot("secondary")}
            onRemove={() => handleRemove("secondary")}
          />
        )}
      </div>

      {openSlot && (
        <AssetPicker
          projectId={databaseId}
          orientation={project.meta.orientation}
          onSelect={handleSelect}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

function AssetSlot({ label, asset, onClick, onRemove }) {
  return (
    <div className="flex-shrink-0 w-[120px]">
      <div className="mb-2 text-[10px] font-medium text-gray-500 uppercase">
        {label}
      </div>

      <div
        onClick={onClick}
        className="group relative h-[140px] w-full cursor-pointer overflow-hidden rounded-lg border border-solid border-gray-300 bg-gray-50 hover:border-indigo-500"
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

        {asset?.type !== "background" && asset?.url && (
          asset.url.endsWith(".mp4") ? (
            <video
              src={asset.url}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          ) : (
            <img
              src={asset.url}
              className="h-full w-full object-cover"
              alt=""
            />
          )
        )}

        {asset && (
          <>
            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/40" />

            <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white">
              {asset.source === "project"
                ? "Upload"
                : asset.type === "background"
                ? "BG"
                : "Library"}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute right-1 top-1 rounded bg-red-600 px-1 py-0.5 text-[9px] text-white shadow"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}