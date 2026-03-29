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

    <div className="flex-1 w-[75%] min-w-[320px] overflow-y-auto border-r border-[rgba(255,255,255,0.06)] bg-[#0b0b10] px-6 py-5 ml-4">

      <h3
        className="m-0 text-[16px] font-bold text-[#e8e8f0] mb-4"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Video Overlays
      </h3>

      <div className="mb-5">

        <button
          onClick={addOverlay}
          className="text-[11px] px-3 py-[4px] rounded-[6px] bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] text-[#e8e8f0] hover:border-[#7c5cfc] transition"
        >
          + Add Overlay
        </button>

      </div>

      {overlays.length === 0 && (
        <div className="text-[12px] text-[#55556a]">
          No video overlays added
        </div>
      )}

      {overlays.map((o) => (
        <div
          key={o.id}
          className="border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3 mb-3 bg-[#16161f] text-[11px]"
        >

          <div className="flex justify-between items-center mb-2">

            <div className="font-semibold text-[#e8e8f0]">
              {o.type}
            </div>

            <button
              onClick={() => removeOverlay(o.id)}
              className="text-[#f87171]"
            >
              Delete
            </button>

          </div>

          <div className="mb-2">
            <label className="block mb-1 text-[#55556a]">
              Text
            </label>

            <input
              value={o.text || ""}
              onChange={(e) =>
                updateOverlay(o.id, { text: e.target.value })
              }
              className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[4px] text-[#e8e8f0]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">

            <div>
              <label className="block mb-1 text-[#55556a]">
                Size
              </label>

              <input
                type="number"
                value={o.size || 60}
                onChange={(e) =>
                  updateOverlay(o.id, { size: Number(e.target.value) })
                }
                className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[4px] text-[#e8e8f0]"
              />
            </div>

            <div>
              <label className="block mb-1 text-[#55556a]">
                Top
              </label>

              <input
                value={o.position?.top || ""}
                onChange={(e) =>
                  updateOverlay(o.id, {
                    position: { ...o.position, top: e.target.value }
                  })
                }
                className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[4px] text-[#e8e8f0]"
              />
            </div>

            <div>
              <label className="block mb-1 text-[#55556a]">
                Left
              </label>

              <input
                value={o.position?.left || ""}
                onChange={(e) =>
                  updateOverlay(o.id, {
                    position: { ...o.position, left: e.target.value }
                  })
                }
                className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[4px] text-[#e8e8f0]"
              />
            </div>

          </div>

          <div className="grid grid-cols-2 gap-2">

            <div>
              <label className="block mb-1 text-[#55556a]">
                Color
              </label>

              <input
                type="color"
                value={o.color || "#ffffff"}
                onChange={(e) =>
                  updateOverlay(o.id, { color: e.target.value })
                }
                className="w-full h-[28px] bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px]"
              />
            </div>

            <div>
              <label className="block mb-1 text-[#55556a]">
                Motion
              </label>

              <select
                value={o.motion || "pop"}
                onChange={(e) =>
                  updateOverlay(o.id, { motion: e.target.value })
                }
                className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[4px] text-[#e8e8f0]"
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