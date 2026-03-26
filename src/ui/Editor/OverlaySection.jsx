import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function OverlaySection({ beat }) {

  const updateBeat = useProjectStore((s) => s.updateBeat);

  if (!beat) return null;

  const overlays = beat.overlays || [];

  const addOverlay = async () => {

    const newOverlay = {
      id: "overlay_" + Date.now(),
      type: "text",
      text: "Overlay Text",
      size: 60,
      color: "#ffffff",
      motion: "pop",
      width: 300,
      height: 120,
      position: {
        top: "200px",
        left: "50%"
      }
    };

    await updateBeat(beat.id, {
      overlays: [...overlays, newOverlay]
    });

  };

  const updateOverlay = async (overlayId, updates) => {

    const updated = overlays.map((o) => {
      if (o.id !== overlayId) return o;
      return { ...o, ...updates };
    });

    await updateBeat(beat.id, {
      overlays: updated
    });

  };

  const removeOverlay = async (overlayId) => {

    const filtered = overlays.filter((o) => o.id !== overlayId);

    await updateBeat(beat.id, {
      overlays: filtered
    });

  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">

      <div className="flex items-center justify-between mb-3">

        <div className="font-semibold text-sm">
          Overlays
        </div>

        <button
          onClick={addOverlay}
          className="text-xs px-3 py-1 rounded bg-black text-white"
        >
          + Add Overlay
        </button>

      </div>

      {overlays.length === 0 && (
        <div className="text-xs text-gray-500">
          No overlays added
        </div>
      )}

      {overlays.map((o) => (
        <div
          key={o.id}
          className="border rounded p-3 mb-3 bg-white text-xs"
        >

          <div className="flex justify-between items-center mb-2">

            <select
              value={o.type}
              onChange={(e) =>
                updateOverlay(o.id, { type: e.target.value })
              }
              className="border rounded px-2 py-1"
            >
              <option value="text">Text</option>
              <option value="badge">Badge</option>
              <option value="highlight">Highlight</option>
              <option value="cta">CTA</option>
              <option value="arrow">Arrow</option>
              <option value="circle">Circle</option>
              <option value="rectangle">Rectangle</option>
            </select>

            <button
              onClick={() => removeOverlay(o.id)}
              className="text-red-500"
            >
              Delete
            </button>

          </div>

          {(o.type === "text" || o.type === "badge" || o.type === "highlight" || o.type === "cta") && (
            <div className="mb-2">
              <label className="block mb-1">Text</label>
              <input
                value={o.text || ""}
                onChange={(e) =>
                  updateOverlay(o.id, { text: e.target.value })
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-2">

            <div>
              <label className="block mb-1">Size</label>
              <input
                type="number"
                value={o.size || 60}
                onChange={(e) =>
                  updateOverlay(o.id, { size: Number(e.target.value) })
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block mb-1">Top</label>
              <input
                value={o.position?.top || ""}
                onChange={(e) =>
                  updateOverlay(o.id, {
                    position: { ...o.position, top: e.target.value }
                  })
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block mb-1">Left</label>
              <input
                value={o.position?.left || ""}
                onChange={(e) =>
                  updateOverlay(o.id, {
                    position: { ...o.position, left: e.target.value }
                  })
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>

          </div>

          {o.type === "rectangle" && (
            <div className="grid grid-cols-2 gap-2 mb-2">

              <div>
                <label className="block mb-1">Width</label>
                <input
                  type="number"
                  value={o.width || 300}
                  onChange={(e) =>
                    updateOverlay(o.id, { width: Number(e.target.value) })
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block mb-1">Height</label>
                <input
                  type="number"
                  value={o.height || 120}
                  onChange={(e) =>
                    updateOverlay(o.id, { height: Number(e.target.value) })
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>

            </div>
          )}

          <div className="grid grid-cols-2 gap-2">

            <div>
              <label className="block mb-1">Color</label>
              <input
                type="color"
                value={o.color || "#ffffff"}
                onChange={(e) =>
                  updateOverlay(o.id, { color: e.target.value })
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block mb-1">Motion</label>
              <select
                value={o.motion || "pop"}
                onChange={(e) =>
                  updateOverlay(o.id, { motion: e.target.value })
                }
                className="w-full border rounded px-2 py-1"
              >
                <option value="pop">Pop</option>
                <option value="fade">Fade</option>
                <option value="slideUp">Slide Up</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>

          </div>

        </div>
      ))}

    </div>
  );

}