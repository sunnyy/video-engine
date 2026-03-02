import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const transitionOptions = [
  "none",
  "crossfade",
  "slideLeft",
  "slideRight",
  "zoomIn",
  "zoomOut",
  "blurFade",
];

export default function TransitionSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  return (
    <div className="w-1/2">
      <h4 className="mb-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Beat Transition
      </h4>

      <select
        value={beat.transition?.type || "none"}
        onChange={(e) =>
          updateBeat(beat.id, {
            transition: {
              type: e.target.value,
            },
          })
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {transitionOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}