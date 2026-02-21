import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const ALL_LAYOUTS = [
  { key: "full", label: "Full View" },
  { key: "dual", label: "Dual Asset" },
  { key: "split", label: "Split Avatar" },
  { key: "floating", label: "Floating Avatar" },
];

export default function LayoutSelector({ beat }) {
  const project = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);

  if (!project) return null;

  const mode = project.meta.mode;

  const allowedLayouts =
    mode === "faceless"
      ? ALL_LAYOUTS.filter(
          (l) => l.key === "full" || l.key === "dual"
        )
      : ALL_LAYOUTS;

  const handleSelect = (layout) => {
    updateBeat(beat.id, {
      visual_mode: layout,
    });
  };

  const handleContentType = (type) => {
    updateBeat(beat.id, {
      content_type: type,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        {allowedLayouts.map((layout) => (
          <button
            key={layout.key}
            onClick={() => handleSelect(layout.key)}
            className={`px-4 py-2 border rounded ${
              beat.visual_mode === layout.key
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            {layout.label}
          </button>
        ))}
      </div>

      {/* Full layout content toggle */}
      {beat.visual_mode === "full" &&
        project.meta.mode === "talking_head" && (
          <div className="flex gap-3">
            <button
              onClick={() =>
                handleContentType("avatar")
              }
              className={`px-4 py-2 border rounded ${
                beat.content_type === "avatar"
                  ? "bg-black text-white"
                  : "bg-white"
              }`}
            >
              Avatar
            </button>

            <button
              onClick={() =>
                handleContentType("asset")
              }
              className={`px-4 py-2 border rounded ${
                beat.content_type === "asset"
                  ? "bg-black text-white"
                  : "bg-white"
              }`}
            >
              Asset
            </button>
          </div>
        )}
    </div>
  );
}