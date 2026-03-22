import React from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";

export default function LayoutSelector({ beat }) {
  const project = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);

  if (!project) return null;

  const mode = project.meta?.mode;

  const orientation =
    project.meta?.orientation === "9:16"
      ? "vertical"
      : project.meta?.orientation === "16:9"
        ? "horizontal"
        : project.meta?.width > project.meta?.height
          ? "horizontal"
          : "vertical";

  const layouts = Object.entries(layoutRegistry)
    .filter(([name, layout]) => {
      if (layout.orientations && !layout.orientations.includes(orientation)) return false;

      if (mode === "faceless") {
        const prefersAvatar = layout.capability?.prefersAvatar ?? false;

        if (prefersAvatar) return false;
      }

      return true;
    })
    .map(([name]) => name);

  const handleSelect = (layout) => {
    updateBeat(beat.id, { layout });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm text-black font-semibold uppercase m-0 mb-2">Layout</h4>

      <div className="flex gap-3 flex-wrap">
        {layouts.map((layout) => (
          <button
            key={layout}
            onClick={() => handleSelect(layout)}
            className={`px-4 py-2 border rounded ${beat.layout === layout ? "bg-black text-white" : "bg-white"}`}
          >
            {layout}
          </button>
        ))}
      </div>
    </div>
  );
}
