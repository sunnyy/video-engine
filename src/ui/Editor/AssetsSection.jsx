import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import AssetPicker from "./AssetPicker";

const animationOptions = [
  "none",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "zoomIn",
  "zoomOut",
  "punch",
  "blurIn",
  "cinematicReveal",
];

const fitOptions = ["cover", "contain"];

export default function AssetsSection({ beat, project }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [openSlot, setOpenSlot] = useState(null);
  const databaseId = useProjectStore((s) => s.databaseId);

  const assetSettings = beat.asset_settings || {};

  const updateObjectFit = (slot, value) => {
    updateBeat(beat.id, {
      assets: {
        ...beat.assets,
        [slot]: {
          ...beat.assets?.[slot],
          object_fit: value,
        },
      },
    });
  };

  const updateAnimation = (slot, value) => {
    updateBeat(beat.id, {
      asset_settings: {
        ...assetSettings,
        [slot]: {
          ...assetSettings?.[slot],
          animation: value,
        },
      },
    });
  };

  const handleSelect = (asset) => {
    updateBeat(beat.id, {
      assets: {
        ...beat.assets,
        [openSlot]: asset,
      },
    });

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

  const renderSlot = (slot, label) => {
    const asset = beat.assets?.[slot];
    const slotAnimation = assetSettings?.[slot]?.animation || "none";
    const slotFit = asset?.object_fit || "cover";

    return (
      <div key={slot} className="flex gap-6 items-start">
        <AssetSlot
          label={label}
          asset={asset}
          onClick={() => setOpenSlot(slot)}
          onRemove={() => handleRemove(slot)}
        />

        {asset && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs font-medium mb-1 uppercase text-gray-500">
                Object Fit
              </div>
              <select
                value={slotFit}
                onChange={(e) =>
                  updateObjectFit(slot, e.target.value)
                }
                className="border px-2 py-1 text-sm rounded"
              >
                {fitOptions.map((fit) => (
                  <option key={fit} value={fit}>
                    {fit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-medium mb-1 uppercase text-gray-500">
                Animation
              </div>
              <select
                value={slotAnimation}
                onChange={(e) =>
                  updateAnimation(slot, e.target.value)
                }
                className="border px-2 py-1 text-sm rounded"
              >
                {animationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h4 className="mb-4 text-sm text-black font-semibold uppercase tracking-wide">
        Assets
      </h4>

      <div className="flex gap-8">
        {renderSlot("main", "Main")}

        {beat.visual_mode === "dual" &&
          renderSlot("secondary", "Secondary")}
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
    <div className="w-[120px]">
      <div className="mb-2 text-[10px] font-medium text-gray-500 uppercase">
        {label}
      </div>

      <div
        onClick={onClick}
        className="group relative h-[140px] w-full cursor-pointer overflow-hidden rounded-lg border border-gray-300 bg-gray-50 hover:border-indigo-500"
      >
        {!asset && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Select
          </div>
        )}

        {asset?.url &&
          (asset.url.endsWith(".mp4") ? (
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
          ))}

        {asset && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute right-1 top-1 rounded bg-red-600 px-1 py-0.5 text-xs text-white"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}