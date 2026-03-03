import React, { useRef, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { buildSafeProject } from "../../normalize/normalizeProject";
import validateProject from "../../core/validateProject";

export default function Header() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [resolution, setResolution] = useState("1080p");
  const [progress, setProgress] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

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

    if (mode === "faceless") {
      updated = {
        ...updated,
        beats: updated.beats.map((beat) => ({
          ...beat,
          visual_mode:
            beat.visual_mode === "split" || beat.visual_mode === "floating"
              ? "full"
              : beat.visual_mode,
        })),
      };
    }

    setProject(buildSafeProject(updated));
  };

  const handleOrientationChange = (orientation) => {
    if (orientation === project.meta.orientation) return;

    setProject(
      buildSafeProject({
        ...project,
        meta: {
          ...project.meta,
          orientation,
        },
      })
    );
  };

  const handleExport = async () => {
    const result = validateProject(project);
    if (!result.valid) {
      alert(result.errors.join("\n"));
      return;
    }

    setProgress(0);
    setDownloadUrl(null);

    try {
      const res = await fetch("http://localhost:5000/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, resolution }),
      });

      const data = await res.json();
      const jobId = data.jobId;

      const interval = setInterval(async () => {
        const statusRes = await fetch(
          `http://localhost:5000/api/render-status/${jobId}`
        );
        const status = await statusRes.json();

        setProgress(status.progress);

        if (status.done) {
          clearInterval(interval);
          setProgress(null);
          setDownloadUrl(status.url);
        }
      }, 500);
    } catch (err) {
      console.error(err);
      setProgress(null);
      alert("Render failed");
    }
  };

  return (
    <div className="flex items-center justify-between border-b px-6 py-3 bg-white">
      <div className="font-bold text-lg">Video Engine</div>

      <div className="flex items-center gap-4">
        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => handleModeChange("talking_head")}
            className={`px-4 py-2 ${
              project.meta.mode === "talking_head"
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            Talking Head
          </button>
          <button
            onClick={() => handleModeChange("faceless")}
            className={`px-4 py-2 ${
              project.meta.mode === "faceless"
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            Faceless
          </button>
        </div>

        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => handleOrientationChange("9:16")}
            className={`px-3 py-2 ${
              project.meta.orientation === "9:16"
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            9:16
          </button>
          <button
            onClick={() => handleOrientationChange("16:9")}
            className={`px-3 py-2 ${
              project.meta.orientation === "16:9"
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            16:9
          </button>
        </div>

        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>

        <button
          onClick={handleExport}
          disabled={progress !== null}
          className="bg-yellow-400 px-5 py-2 rounded text-black font-semibold disabled:opacity-50"
        >
          {progress !== null ? `Rendering ${progress}%` : "Export"}
        </button>

        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="bg-green-500 text-white px-5 py-2 rounded font-semibold"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}