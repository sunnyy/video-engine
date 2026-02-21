import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function ContentSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Content
      </h4>

      <textarea
        value={beat.spoken}
        placeholder="Spoken text"
        onChange={(e) =>
          updateBeat(beat.id, { spoken: e.target.value })
        }
        className="w-[90%] rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="mt-4 flex items-center gap-4">
        <input
          type="number"
          min={1}
          value={beat.duration_sec}
          onChange={(e) =>
            updateBeat(beat.id, {
              duration_sec: Number(e.target.value),
            })
          }
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={beat.visible}
            onChange={(e) =>
              updateBeat(beat.id, {
                visible: e.target.checked,
              })
            }
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Visible
        </label> */}
      </div>
    </div>
  );
}