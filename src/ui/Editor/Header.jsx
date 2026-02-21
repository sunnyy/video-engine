import React, { useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { buildSafeProject } from "../../normalize/normalizeProject";

export default function Header() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const fileRef = useRef();

  if (!project) return null;

  const handleModeChange = (mode) => {
    if (mode === project.meta.mode) return;

    let updated = {
      ...project,
      meta: {
        ...project.meta,
        mode,
      },
    };

    // Switching to talking head requires avatar step
    if (mode === "talking_head") {
      updated = {
        ...updated,
        avatar: null,
        workflow: {
          ...updated.workflow,
          avatar_completed: false,
        },
      };
    }

    // If switching to faceless, fix invalid layouts
    if (mode === "faceless") {
      updated.beats = updated.beats.map((beat) => ({
        ...beat,
        visual_mode: beat.visual_mode === "split" || beat.visual_mode === "floating" ? "full" : beat.visual_mode,
      }));
    }

    const safe = buildSafeProject(updated);
    setProject(safe);
  };

  const handleOrientationChange = (orientation) => {
    if (orientation === project.meta.orientation) return;

    const updated = buildSafeProject({
      ...project,
      meta: {
        ...project.meta,
        orientation,
      },
    });

    setProject(updated);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const updated = {
      ...project,
      avatar: {
        src: url,
        duration_sec: 60,
        speed: 1,
      },
      workflow: {
        ...project.workflow,
        avatar_completed: true,
      },
    };

    setProject(updated);
  };

  return (
    <div className="flex items-center justify-between border-b px-6 py-3 bg-white">
      <div className="font-bold text-lg">Video Engine</div>

      <div className="flex items-center gap-4">
        {/* Mode Toggle */}
        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => handleModeChange("talking_head")}
            className={`px-4 py-2 ${project.meta.mode === "talking_head" ? "bg-black text-white" : "bg-white"}`}
          >
            Talking Head
          </button>
          <button
            onClick={() => handleModeChange("faceless")}
            className={`px-4 py-2 ${project.meta.mode === "faceless" ? "bg-black text-white" : "bg-white"}`}
          >
            Faceless
          </button>
        </div>

        {/* Orientation Toggle */}
        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => handleOrientationChange("9:16")}
            className={`px-3 py-2 ${project.meta.orientation === "9:16" ? "bg-black text-white" : "bg-white"}`}
          >
            9:16
          </button>
          <button
            onClick={() => handleOrientationChange("16:9")}
            className={`px-3 py-2 ${project.meta.orientation === "16:9" ? "bg-black text-white" : "bg-white"}`}
          >
            16:9
          </button>
        </div>

        {/* Avatar Upload */}
        {project.meta.mode === "talking_head" && (
          <>
            <button onClick={() => fileRef.current.click()} className="rounded bg-black px-4 py-2 text-white">
              Upload Talking Head Video
            </button>

            <input type="file" accept="video/*" ref={fileRef} onChange={handleUpload} className="hidden" />
          </>
        )}

        <button className="bg-yellow-400 px-5 py-2 rounded font-semibold">Export</button>
      </div>
    </div>
  );
}
