import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function LayoutSettingsSection({ beat }) {
  const project = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);

  if (!project) return null;

  const { visual_mode, content_type } = beat;
  const mode = project.meta.mode;

  const showAvatarFit =
    mode === "talking_head" &&
    (
      visual_mode === "split" ||
      visual_mode === "floating" ||
      (visual_mode === "full" && content_type === "avatar")
    );

  const showMainAssetFit =
    visual_mode === "dual" ||
    visual_mode === "split" ||
    visual_mode === "floating" ||
    (visual_mode === "full" && content_type === "asset");

  const showSecondaryAssetFit =
    visual_mode === "dual";

  return (
    <div className="mt-8">
      <h4 className="mb-3 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Layout Settings
      </h4>

      {showAvatarFit && (
        <div className="mb-4">
          <label className="block mb-2 text-xs text-gray-500 uppercase">
            Avatar Fit
          </label>
          <select
            value={beat.avatar_object_fit || "cover"}
            onChange={(e) =>
              updateBeat(beat.id, {
                avatar_object_fit: e.target.value,
              })
            }
            className="w-40 border rounded px-3 py-2 text-sm"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
          </select>
        </div>
      )}

      {showMainAssetFit && (
        <div className="mb-4">
          <label className="block mb-2 text-xs text-gray-500 uppercase">
            Main Asset Fit
          </label>
          <select
            value={beat.assets?.main?.object_fit || "cover"}
            onChange={(e) =>
              updateBeat(beat.id, {
                assets: {
                  ...beat.assets,
                  main: {
                    ...beat.assets.main,
                    object_fit: e.target.value,
                  },
                },
              })
            }
            className="w-40 border rounded px-3 py-2 text-sm"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
          </select>
        </div>
      )}

      {showSecondaryAssetFit && (
        <div>
          <label className="block mb-2 text-xs text-gray-500 uppercase">
            Secondary Asset Fit
          </label>
          <select
            value={beat.assets?.secondary?.object_fit || "cover"}
            onChange={(e) =>
              updateBeat(beat.id, {
                assets: {
                  ...beat.assets,
                  secondary: {
                    ...beat.assets.secondary,
                    object_fit: e.target.value,
                  },
                },
              })
            }
            className="w-40 border rounded px-3 py-2 text-sm"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
          </select>
        </div>
      )}
    </div>
  );
}