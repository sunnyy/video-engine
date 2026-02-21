import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const STYLES = ["clean", "bold", "highlighted"];
const ANIMATIONS = ["fade", "pop"];

export default function CaptionsSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  return (
    <div>
      <h4 className="mb-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Captions
      </h4>

      <label className="mb-3 flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={beat.caption.show}
          onChange={(e) =>
            updateBeat(beat.id, {
              caption: {
                ...beat.caption,
                show: e.target.checked,
              },
            })
          }
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        Show Captions
      </label>

      <div className="flex gap-3">
        <select
          value={beat.caption.style}
          onChange={(e) =>
            updateBeat(beat.id, {
              caption: {
                ...beat.caption,
                style: e.target.value,
              },
            })
          }
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STYLES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={beat.caption.animation}
          onChange={(e) =>
            updateBeat(beat.id, {
              caption: {
                ...beat.caption,
                animation: e.target.value,
              },
            })
          }
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ANIMATIONS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
    </div>
  );
}