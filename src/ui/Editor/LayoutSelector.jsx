import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const LAYOUTS = [
  { id: "full", label: "Full View" },
  { id: "split", label: "Split View" },
  { id: "floating", label: "Floating Avatar" },
  { id: "dual", label: "Dual Asset" },
];

export default function LayoutSelector({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {LAYOUTS.map((layout) => {
        const active = beat.visual_mode === layout.id;

        return (
          <button
            key={layout.id}
            onClick={() =>
              updateBeat(beat.id, {
                visual_mode: layout.id,
              })
            }
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: active
                ? "2px solid #6c5ce7"
                : "1px solid #ccc",
              background: active ? "#f3f0ff" : "#fff",
              cursor: "pointer",
            }}
          >
            {layout.label}
          </button>
        );
      })}
    </div>
  );
}