/**
 * Header.jsx
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../../store/useProjectStore";
import { getUserProjects, renameProject } from "../../services/projects/projectService";
import validateProject from "../../core/validateProject";

export default function Header() {
  const navigate          = useNavigate();
  const project           = useProjectStore((s) => s.project);
  const databaseId        = useProjectStore((s) => s.databaseId);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);
  const storedName        = useProjectStore((s) => s.projectName);
  const setProjectName    = useProjectStore((s) => s.setProjectName);

  const [resolution,   setResolution]   = useState("1080p");
  const [progress,     setProgress]     = useState(null);
  const [downloadUrl,  setDownloadUrl]  = useState(null);
  const [projectList,  setProjectList]  = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renaming,     setRenaming]     = useState(false);
  const [nameVal,      setNameVal]      = useState("");
  const dropdownRef = useRef(null);

  // These MUST be above any conditional returns (React hooks rules)
  useEffect(() => {
    getUserProjects().then(setProjectList).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!project) return null;

  const projectName = storedName || "Untitled Project";

  const handleModeChange = (mode) => {
    if (mode === project.meta.mode) return;
    updateProjectMeta({ meta: { mode } });
  };

  const handleOrientationChange = (orientation) => {
    if (orientation === project.meta.orientation) return;
    const isVertical = orientation === "9:16";
    updateProjectMeta({
      meta: {
        orientation,
        width:  isVertical ? 1080 : 1920,
        height: isVertical ? 1920 : 1080,
      },
    });
  };

  const handleRename = async () => {
    if (!nameVal.trim() || !databaseId) return;
    await renameProject(databaseId, nameVal.trim());
    setProjectName(nameVal.trim());
    setRenaming(false);
  };

  const handleExport = async () => {
    const result = validateProject(project);
    if (!result.valid) { alert(result.errors.join("\n")); return; }
    setProgress(0);
    setDownloadUrl(null);

    try {
      const res = await fetch("http://localhost:5000/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, resolution }),
      });
      const { jobId } = await res.json();

      const interval = setInterval(async () => {
        const statusRes = await fetch(`http://localhost:5000/api/render-status/${jobId}`);
        const status    = await statusRes.json();
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
    <div className="flex items-center justify-between px-5 py-[10px] border-b border-[rgba(255,255,255,0.06)] bg-[#111118] shrink-0">

      {/* Left — logo + project dropdown */}
      <div className="flex items-center gap-3">

        {/* Back to dashboard */}
        <button onClick={() => navigate("/")}
          className="flex items-center gap-1 text-[#77777f] hover:text-[#e8e8f0] transition-colors text-[16px] bg-transparent border-0 cursor-pointer">
          ← <span className="hidden sm:inline">Home</span>
        </button>

        <div className="w-[1px] h-[18px] bg-[rgba(255,255,255,0.08)]" />

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-[40px] h-[26px] flex items-center justify-center rounded-[5px] bg-[#f5c518] text-[#0b0b10] font-bold text-[20px]"
            style={{ fontFamily:"'Syne',sans-serif" }}>VE</div>
        </div>

        {/* Project name + dropdown */}
        <div ref={dropdownRef} className="relative">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
                className="bg-[#1c1c28] border border-[#7c5cfc] rounded-[6px] px-2 py-[4px] text-[16px] text-[#e8e8f0] focus:outline-none w-[180px]"
              />
              <button onClick={handleRename}
                className="text-[15px] text-[#88888f] bg-transparent border-0 cursor-pointer">✓</button>
              <button onClick={() => setRenaming(false)}
                className="text-[15px] text-[#88888f] bg-transparent border-0 cursor-pointer">✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setDropdownOpen(o => !o); setNameVal(projectName); }}
              className="flex items-center gap-1 text-[15px] font-bold text-[#e8e8f0] bg-transparent border-0 cursor-pointer hover:text-[#a78fff] transition-colors"
              style={{ fontFamily:"'Syne',sans-serif" }}>
              {projectName}
              <span className="text-[#55556a] text-[12px] ml-1">▾</span>
            </button>
          )}

          {dropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[260px] bg-[#1c1c28] border border-[rgba(255,255,255,0.1)] rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
              {/* Rename */}
              <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
                <button onClick={() => { setRenaming(true); setDropdownOpen(false); }}
                  className="w-full text-left text-[13px] text-[#9494a8] hover:text-[#e8e8f0] bg-transparent border-0 cursor-pointer py-1">
                  ✏️ Rename project
                </button>
              </div>

              {/* Recent projects */}
              <div className="px-3 py-2">
                <div className="text-[14px] font-bold tracking-widest uppercase text-[#55556a] mb-2"
                  style={{ fontFamily:"'JetBrains Mono',monospace" }}>Recent Projects</div>
                {projectList.slice(0, 8).map(p => (
                  <button key={p.id}
                    onClick={() => { navigate(`/editor/${p.id}`); setDropdownOpen(false); }}
                    className={`w-full text-left px-2 py-[6px] rounded-[6px] text-[15px] transition-all bg-transparent border-0 cursor-pointer
                      ${p.id === databaseId ? "text-[#a78fff] bg-[rgba(124,92,252,0.1)]" : "text-[#9494a8] hover:text-[#e8e8f0] hover:bg-[rgba(255,255,255,0.04)]"}`}>
                    {p.name || "Untitled"}
                    <span className="ml-2 text-[12px] text-[#55556a]">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
                <button onClick={() => navigate("/")}
                  className="w-full text-left px-2 py-[6px] mt-1 rounded-[6px] text-[12px] text-[#7c5cfc] hover:bg-[rgba(124,92,252,0.1)] bg-transparent border-0 cursor-pointer transition-all">
                  View all projects →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-3">

        {/* Mode toggle */}
        <div className="flex bg-[#1c1c28] rounded-[6px] p-[2px]">
          {[["talking_head","Talking Head"],["faceless","Faceless"]].map(([val, label]) => (
            <button key={val} onClick={() => handleModeChange(val)}
              className={`px-3 py-[4px] text-[13px] rounded-[4px] border-0 transition cursor-pointer
                ${project.meta.mode === val ? "bg-[#111118] text-[#e8e8f0]" : "text-[#9494a8] hover:text-[#e8e8f0]"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Orientation toggle */}
        <div className="flex bg-[#1c1c28] rounded-[6px] p-[2px]">
          {[["9:16","9:16"],["16:9","16:9"]].map(([val, label]) => (
            <button key={val} onClick={() => handleOrientationChange(val)}
              className={`px-3 py-[4px] text-[13px] font-mono rounded-[4px] border-0 transition cursor-pointer
                ${project.meta.orientation === val
                  ? "bg-[#f5c518] text-[#0b0b10] font-bold"
                  : "text-[#55556a] hover:text-[#e8e8f0]"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Resolution */}
        <select value={resolution} onChange={e => setResolution(e.target.value)}
          className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] text-[#e8e8f0] text-[13px] px-3 py-[5px] rounded-[6px] cursor-pointer focus:outline-none">
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>

        {/* Export */}
        <button onClick={handleExport} disabled={progress !== null}
          className="flex items-center gap-2 bg-[#f5c518] text-[#0b0b10] font-bold text-[14px] px-4 py-[6px] rounded-[6px] hover:shadow-[0_0_16px_rgba(245,197,24,0.3)] transition disabled:opacity-50 cursor-pointer border-0">
          {progress !== null ? `${progress}%` : "Export"}
        </button>

        {downloadUrl && (
          <a href={downloadUrl} download
            className="bg-[#2dd4bf] text-[#0b0b10] font-semibold text-[14px] px-4 py-[6px] rounded-[6px]">
            Download
          </a>
        )}

      </div>
    </div>
  );
}
