import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function ContentSection({ beat }) {

  const updateBeat = useProjectStore((s) => s.updateBeat);

  return (
    <div className="w-full flex flex-col">

      <div className="w-full flex flex-wrap items-end">

        <div className="flex flex-col w-[60%]">

          <h4 className="text-sm font-semibold uppercase mb-2">
            Caption
          </h4>

          <textarea
            value={beat.spoken || ""}
            onChange={(e) =>
              updateBeat(beat.id, { spoken: e.target.value })
            }
            className="w-[90%] border rounded-md p-3 text-sm"
          />

        </div>

        <div className="flex flex-col items-center ml-4">

          <h4 className="text-sm font-semibold uppercase mb-2">
            Duration
          </h4>

          <input
            type="number"
            min={1}
            value={beat.duration_sec}
            onChange={(e) =>
              updateBeat(beat.id, {
                duration_sec: Number(e.target.value),
              })
            }
            className="w-16 border rounded-md px-3 py-2 text-sm"
          />

        </div>

      </div>

    </div>
  );
}