import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function TransitionSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  return (
    <div>
      <h4 className="mb-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Transition
      </h4>

      <div className="flex gap-3">
        <select
          value={beat.transition.type}
          onChange={(e) =>
            updateBeat(beat.id, {
              transition: {
                ...beat.transition,
                type: e.target.value,
              },
            })
          }
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="cut">Cut</option>
          <option value="fade">Fade</option>
        </select>

        <input
          type="number"
          step={0.1}
          min={0}
          value={beat.transition.duration}
          onChange={(e) =>
            updateBeat(beat.id, {
              transition: {
                ...beat.transition,
                duration: Number(e.target.value),
              },
            })
          }
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}