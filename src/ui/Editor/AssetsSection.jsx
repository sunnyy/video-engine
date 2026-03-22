import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
import { assetAnimationRegistry } from "../../core/assetAnimationRegistry";
import AssetPicker from "./AssetPicker";

const ANIMATIONS = Object.keys(assetAnimationRegistry);

export default function AssetsSection({ beat, project }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const databaseId = useProjectStore((s) => s.databaseId);

  const layout = layoutRegistry[beat.layout];
  if (!layout || !layout.zones) return null;

  const mode = project.meta?.mode;

  const zoneSlots = layout.zones;
  const zones = beat.zones || {};
  const assetSettings = beat.asset_settings || {};

  const [openSlot, setOpenSlot] = useState(null);

  const forceAsset = (slot) => {
    updateBeat(beat.id, {
      zones: {
        ...zones,
        [slot]: {
          ...(zones?.[slot] || {}),
          type: "asset",
        },
      },
    });
  };

  const setZoneType = (slot, type) => {
    updateBeat(beat.id, {
      zones: {
        ...zones,
        [slot]: {
          ...(zones?.[slot] || {}),
          type,
          src: type === "avatar" ? null : zones?.[slot]?.src || null,
          objectFit: "cover",
        },
      },
    });
  };

  const updateZoneAsset = (slot, asset) => {
    const isBackground = asset.type === "background";

    if (isBackground) {
      updateBeat(beat.id, {
        zones: {
          ...zones,
          [slot]: {
            type: "background",
            color: asset.color || null,
            gradient: asset.gradient || null,
          },
        },
      });
      return;
    }

    updateBeat(beat.id, {
      zones: {
        ...zones,
        [slot]: {
          type: "asset",
          src: asset.url,
          objectFit: "cover",
        },
      },
    });
  };

  const setAssetAnimation = (slot, animation) => {
    updateBeat(beat.id, {
      asset_settings: {
        ...(beat.asset_settings || {}),
        [slot]: {
          ...(assetSettings?.[slot] || {}),
          animation,
        },
      },
    });
  };

  const removeZone = (slot) => {
    updateBeat(beat.id, {
      zones: {
        ...zones,
        [slot]: {
          ...zones?.[slot],
          src: null,
        },
      },
    });
  };

  const setObjectFit = (slot, value) => {
    updateBeat(beat.id, {
      zones: {
        ...zones,
        [slot]: {
          ...zones?.[slot],
          objectFit: value,
        },
      },
    });
  };

  const renderPreview = (zone) => {
    if (zone.type === "background") {
      return (
        <div
          className="h-full w-full"
          style={{ background: zone.color || zone.gradient }}
        />
      );
    }

    if (!zone.src) return null;

    if (zone.src.endsWith(".mp4") || zone.src.endsWith(".webm")) {
      return <video src={zone.src} muted className="h-full w-full object-cover" />;
    }

    return <img src={zone.src} className="h-full w-full object-cover" />;
  };

  const renderSlot = (slot) => {
    const zone = zones?.[slot] || {};
    const isAvatar = zone.type === "avatar";

    const avatarAllowed = mode === "talking_head" && layout.supportsAvatar === true;

    const animation = assetSettings?.[slot]?.animation || "pushSlow";

    return (
      <div key={slot} className="w-[140px]">

        <div className="mb-2 text-[10px] font-medium text-gray-500 uppercase">
          {slot}
        </div>

        {avatarAllowed && (
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setZoneType(slot, "avatar")}
              className={`text-xs px-2 py-[2px] border rounded ${
                zone.type === "avatar" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Avatar
            </button>

            <button
              onClick={() => setZoneType(slot, "asset")}
              className={`text-xs px-2 py-[2px] border rounded ${
                zone.type === "asset" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Asset
            </button>
          </div>
        )}

        {!avatarAllowed && isAvatar && (
          <div className="mb-2">
            <button
              onClick={() => forceAsset(slot)}
              className="text-xs px-2 py-[2px] border rounded bg-red-100"
            >
              Switch to Asset
            </button>
          </div>
        )}

        {(zone.type !== "avatar" || !avatarAllowed) && (
          <div
            onClick={() => setOpenSlot(slot)}
            className="group relative h-[120px] w-full cursor-pointer overflow-hidden rounded-lg border border-gray-300 bg-gray-50 hover:border-indigo-500"
          >
            {!zone?.src && zone.type !== "background" && (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                Select
              </div>
            )}

            {(zone?.src || zone.type === "background") && (
              <>
                {renderPreview(zone)}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeZone(slot);
                  }}
                  className="absolute right-1 top-1 rounded bg-red-600 px-1 py-0.5 text-xs text-white"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        {zone.type === "asset" && zone.src && (

          <>

            <div className="mt-2 flex gap-1">

              <button
                onClick={() => setObjectFit(slot, "cover")}
                className={`text-[10px] px-2 py-[2px] border rounded ${
                  zone.objectFit === "cover" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Cover
              </button>

              <button
                onClick={() => setObjectFit(slot, "contain")}
                className={`text-[10px] px-2 py-[2px] border rounded ${
                  zone.objectFit === "contain" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Contain
              </button>

            </div>

            <select
              value={animation}
              onChange={(e) => setAssetAnimation(slot, e.target.value)}
              className="mt-2 w-full text-[11px] border rounded px-2 py-1"
            >

              {ANIMATIONS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}

            </select>

          </>

        )}

      </div>
    );
  };

  const handleSelect = (asset) => {
    updateZoneAsset(openSlot, asset);
    setOpenSlot(null);
  };

  return (
    <div>
      <h4 className="mb-4 text-sm text-black font-semibold uppercase tracking-wide">
        Assets
      </h4>

      <div className="flex gap-6">
        {zoneSlots.map(renderSlot)}
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