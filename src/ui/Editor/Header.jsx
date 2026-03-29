import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import validateProject from "../../core/validateProject";

export default function Header() {

  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [resolution, setResolution] = useState("1080p");
  const [progress, setProgress] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  if (!project) return null;

  const handleModeChange = async (mode) => {

    if (mode === project.meta.mode) return;

    await updateProjectMeta({
      meta: {
        ...project.meta,
        mode
      }
    });

  };

  const handleOrientationChange = async (orientation) => {

    if (orientation === project.meta.orientation) return;

    await updateProjectMeta({
      meta: {
        ...project.meta,
        orientation
      }
    });

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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project,
          resolution
        })
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

    <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#111118]">

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-[26px] h-[26px] flex items-center justify-center rounded-[6px] bg-[#f5c518] text-[#0b0b10] font-bold text-[12px]">
          VE
        </div>
        <span
          className="text-[14px] font-bold text-[#e8e8f0]"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          VideoEngine
        </span>
      </div>

      <div className="flex items-center gap-3">

        {/* Mode */}
        <div className="flex bg-[#1c1c28] rounded-[6px] p-[2px]">

          <button
            onClick={() => handleModeChange("talking_head")}
            className={`px-3 py-[4px] text-[12px] rounded-[4px] transition ${
              project.meta.mode === "talking_head"
                ? "bg-[#111118] text-[#e8e8f0]"
                : "text-[#9494a8]"
            }`}
          >
            Talking Head
          </button>

          <button
            onClick={() => handleModeChange("faceless")}
            className={`px-3 py-[4px] text-[12px] rounded-[4px] transition ${
              project.meta.mode === "faceless"
                ? "bg-[#111118] text-[#e8e8f0]"
                : "text-[#9494a8]"
            }`}
          >
            Faceless
          </button>

        </div>

        {/* Orientation */}
        <div className="flex bg-[#1c1c28] rounded-[6px] p-[2px]">

          <button
            onClick={() => handleOrientationChange("9:16")}
            className={`px-3 py-[4px] text-[11px] font-mono rounded-[4px] transition ${
              project.meta.orientation === "9:16"
                ? "bg-[#f5c518] text-[#0b0b10]"
                : "text-[#55556a]"
            }`}
          >
            9:16
          </button>

          <button
            onClick={() => handleOrientationChange("16:9")}
            className={`px-3 py-[4px] text-[11px] font-mono rounded-[4px] transition ${
              project.meta.orientation === "16:9"
                ? "bg-[#f5c518] text-[#0b0b10]"
                : "text-[#55556a]"
            }`}
          >
            16:9
          </button>

        </div>

        {/* Resolution */}
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] text-[#e8e8f0] text-[12px] px-3 py-[5px] rounded-[6px]"
        >
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={progress !== null}
          className="flex items-center gap-2 bg-[#f5c518] text-[#0b0b10] font-bold text-[12px] px-4 py-[6px] rounded-[6px] hover:shadow-[0_0_16px_rgba(245,197,24,0.3)] transition disabled:opacity-50"
        >
          {progress !== null ? `Rendering ${progress}%` : "Export"}
        </button>

        {downloadUrl && (

          <a
            href={downloadUrl}
            download
            className="bg-[#2dd4bf] text-[#0b0b10] font-semibold text-[12px] px-4 py-[6px] rounded-[6px]"
          >
            Download
          </a>

        )}

      </div>

    </div>

  );

}