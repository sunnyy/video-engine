import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function VideoOverlaySection() {

  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  if (!project) return null;

  const overlays = project.overlays || [];

  const updateProject = async (newOverlays) => {
    await updateProjectMeta({
      overlays: newOverlays
    });
  };

  const addOverlay = async () => {

    const newOverlay = {
      id: "video_overlay_" + Date.now(),
      type: "text",
      text: "Overlay Text",
      size: 60,
      color: "#ffffff",
      motion: "pop",
      position: {
        top: "200px",
        left: "50%"
      }
    };

    await updateProject([...overlays, newOverlay]);

  };

  const updateOverlay = async (overlayId, updates) => {

    const updated = overlays.map((o) => {
      if (o.id !== overlayId) return o;
      return { ...o, ...updates };
    });

    await updateProject(updated);

  };

  const removeOverlay = async (overlayId) => {

    const filtered = overlays.filter((o) => o.id !== overlayId);

    await updateProject(filtered);

  };

  return (
    <div className="flex-1 w-[75%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl ml-4">

      <h3 className="m-0 text-lg font-semibold">
        Video Overlays
      </h3>

      <div className="mt-4 mb-4">
        <button
          onClick={addOverlay}
          className="text-xs px-3 py-1 rounded bg-black text-white"
        >
          + Add Overlay
        </button>
      </div>

      {overlays.length === 0 && (
        <div className="text-sm text-gray-500">
          No video overlays added
        </div>
      )}

      {overlays.map((o) => (
        <div
          key={o.id}
          className="border rounded p-3 mb-3 bg-white text-xs"
        >

          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold">{o.type}</div>

            <button
              onClick={() => removeOverlay(o.id)}
              className="text-red-500"
            >
              Delete
            </button>
          </div>

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