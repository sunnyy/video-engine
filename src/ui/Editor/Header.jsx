/**
 * Header.jsx
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../../store/useProjectStore";
import { useProjectsStore } from "../../store/useProjectsStore";
import { getUserProjects, renameProject } from "../../services/projects/projectService";
import { signOut } from "../../services/auth/authService";
import validateProject from "../../core/validateProject";
import { serverFetch } from "../../services/serverApi";
import { useCreditsStore } from "../../store/useCreditsStore";


export default function Header({ progress, setProgress }) {
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  const databaseId = useProjectStore((s) => s.databaseId);
  const invalidateProjects = useProjectsStore((s) => s.invalidate);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);
  const setAvatar = useProjectStore((s) => s.setAvatar);
  const storedName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);

  const [resolution, setResolution] = useState("1080p");
  const [projectList, setProjectList] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rendersOpen, setRendersOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [avatarProgress, setAvatarProgress] = useState(null); // null | 'uploading' | 'generating' | 'polling' | 'done' | string (error)
  const dropdownRef = useRef(null);
  const rendersRef  = useRef(null);
  const avatarInputRef = useRef(null);

  const renders      = useProjectStore((s) => s.renders);
  const fetchRenders = useProjectStore((s) => s.fetchRenders);
  const { balance, fetchCredits } = useCreditsStore();

  // These MUST be above any conditional returns (React hooks rules)
  useEffect(() => {
    getUserProjects()
      .then(setProjectList)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCredits();
  }, []);

  useEffect(() => {
    if (databaseId) fetchRenders(databaseId);
  }, [databaseId]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (rendersRef.current && !rendersRef.current.contains(e.target)) {
        setRendersOpen(false);
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
        width: isVertical ? 1080 : 1920,
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
    // Clamp transition durations before validation — never block export for this
    const clampedProject = {
      ...project,
      beats: (project?.beats || []).map((beat) => {
        const beatDuration = (beat.end_sec ?? 0) - (beat.start_sec ?? 0);
        const maxTransition = beatDuration * 0.8;
        if (beat.transition?.duration && beatDuration > 0 && beat.transition.duration > maxTransition) {
          return { ...beat, transition: { ...beat.transition, duration: Math.round(maxTransition * 100) / 100 } };
        }
        return beat;
      }),
    };

    const result = validateProject(clampedProject);
    if (!result.valid) {
      alert(result.errors.join("\n"));
      return;
    }
    setProgress(0);

    try {
      const res = await serverFetch("/api/render", {
        method: "POST",
        body: JSON.stringify({ project: clampedProject, resolution, projectId: databaseId }),
      });
      const { jobId } = await res.json();

      const interval = setInterval(async () => {
        const statusRes = await serverFetch(`/api/render-status/${jobId}`);
        const status = await statusRes.json();
        setProgress(status.progress);
        if (status.done) {
          clearInterval(interval);
          setProgress(null);
          if (databaseId) fetchRenders(databaseId);
          fetchCredits();
        }
      }, 500);
    } catch (err) {
      console.error(err);
      setProgress(null);
      alert("Render failed");
    }
  };

  /* ── Avatar assignment handlers ── */
  const handleAvatarUpload = async (file) => {
    if (!file || !databaseId) return;
    try {
      setAvatarProgress("uploading");
      const formData = new FormData();
      formData.append("video", file);
      const res  = await serverFetch("/api/upload-avatar", { method: "POST", body: formData });
      const text = await res.text();
      if (!res.ok) throw new Error(JSON.parse(text)?.error || "Upload failed");
      const { url } = JSON.parse(text);
      await setAvatar({ src: url, type: "video" });
      setAvatarProgress("done");
    } catch (err) {
      setAvatarProgress(err.message || "Upload failed");
    }
  };

  const isTalkingHead = project?.meta?.mode === "talking_head";
  const hasAvatar = !!project?.avatar?.src;

  return (
    <div className="flex items-center justify-between px-5 border-b border-[rgba(255,255,255,0.06)] bg-[#111118] shrink-0">
      {/* Left — logo + project dropdown */}
      <div className="flex items-center gap-3">
        {/* Back to dashboard */}
        <button
          onClick={() => { invalidateProjects(); navigate("/videos"); }}
          className="flex items-center gap-1 text-[#77777f] hover:text-[#e8e8f0] transition-colors text-[16px] bg-transparent border-0 cursor-pointer"
        >
          ← <span className="hidden sm:inline">Home</span>
        </button>

        <div className="w-[1px] h-[18px] bg-[rgba(255,255,255,0.08)]" />

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </div>

        {/* Project name + dropdown */}
        <div ref={dropdownRef} className="relative">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="bg-[#1c1c28] border border-[#7c5cfc] rounded-[6px] px-2 py-[4px] text-[16px] text-[#e8e8f0] focus:outline-none w-[180px]"
              />
              <button
                onClick={handleRename}
                className="text-[15px] text-[#88888f] bg-transparent border-0 cursor-pointer"
              >
                ✓
              </button>
              <button
                onClick={() => setRenaming(false)}
                className="text-[15px] text-[#88888f] bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDropdownOpen((o) => !o);
                setNameVal(projectName);
              }}
              className="flex items-center gap-1 text-[15px] font-bold text-[#e8e8f0] bg-transparent border-0 cursor-pointer hover:text-[#a78fff] transition-colors"
              style={{ fontFamily: "'Syne',sans-serif" }}
            >
              {projectName}
              <span className="text-[#55556a] text-[12px] ml-1">▾</span>
            </button>
          )}

          {dropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[260px] bg-[#1c1c28] border border-[rgba(255,255,255,0.1)] rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
              {/* Rename */}
              <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={() => {
                    setRenaming(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left text-[13px] text-[#9494a8] hover:text-[#e8e8f0] bg-transparent border-0 cursor-pointer py-1"
                >
                  ✏️ Rename project
                </button>
              </div>

              {/* Recent projects */}
              <div className="px-3 py-2">
                <div
                  className="text-[14px] font-bold tracking-widest uppercase text-[#55556a] mb-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}
                >
                  Recent Projects
                </div>
                {projectList.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate(`/editor/${p.id}`);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-[6px] rounded-[6px] text-[15px] transition-all bg-transparent border-0 cursor-pointer
                      ${p.id === databaseId ? "text-[#a78fff] bg-[rgba(124,92,252,0.1)]" : "text-[#9494a8] hover:text-[#e8e8f0] hover:bg-[rgba(255,255,255,0.04)]"}`}
                  >
                    {p.name || "Untitled"}
                    <span className="ml-2 text-[12px] text-[#55556a]">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => { invalidateProjects(); navigate("/videos"); }}
                  className="w-full text-left px-2 py-[6px] mt-1 rounded-[6px] text-[12px] text-[#7c5cfc] hover:bg-[rgba(124,92,252,0.1)] bg-transparent border-0 cursor-pointer transition-all"
                >
                  View all projects →
                </button>
              </div>
              <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/login");
                  }}
                  className="w-full text-left text-[13px] text-[#f87171] hover:text-[#fca5a5] bg-transparent border-0 cursor-pointer py-1"
                >
                  Sign out
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
          {[
            ["talking_head", "Talking Head"],
            ["faceless", "Faceless"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleModeChange(val)}
              className={`px-3 py-[4px] text-[13px] rounded-[4px] border-0 transition cursor-pointer
                ${
                  project.meta.mode === val
                    ? "bg-[#f5c518] text-[#0b0b10] font-bold"
                    : "bg-[#111118] text-[#55556a] hover:text-[#9494a8]"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Talking Head — Avatar Assignment */}
        {isTalkingHead && (
          <>
            <input
              ref={avatarInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarUpload(f);
                e.target.value = "";
              }}
            />
            {hasAvatar ? (
              <div
                className="flex items-center gap-1.5 px-3 py-[5px] rounded-[6px] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] text-[12px] text-[#22c55e] font-medium cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                title="Click to replace avatar video"
              >
                ▶ Avatar set — click to replace
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarProgress === "uploading"}
                  className="flex items-center gap-1.5 px-3 py-[5px] rounded-[6px] text-[12px] font-semibold border cursor-pointer transition-all"
                  style={{ background: "rgba(124,92,252,0.1)", borderColor: "rgba(124,92,252,0.35)", color: "#a78bfa" }}
                  title="Upload talking head video"
                >
                  {avatarProgress === "uploading" ? "Uploading…" : "▶ Upload Avatar Video"}
                </button>
                {avatarProgress && avatarProgress !== "uploading" && avatarProgress !== "done" && (
                  <span className="text-[11px] text-[#f87171] max-w-[140px] truncate" title={avatarProgress}>
                    {avatarProgress}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* Orientation toggle */}
        <div className="flex bg-[#1c1c28] rounded-[6px] p-[2px] gap-[2px]">
          {[
            ["9:16", /* portrait phone */
              <svg key="p" width="14" height="18" viewBox="0 0 14 18" fill="none">
                <rect x="1" y="1" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            ],
            ["16:9", /* landscape */
              <svg key="l" width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect x="1" y="1" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            ],
          ].map(([val, icon]) => (
            <button
              key={val}
              onClick={() => handleOrientationChange(val)}
              title={val}
              className={`px-[8px] py-[4px] rounded-[4px] border-0 transition cursor-pointer flex items-center justify-center
                ${
                  project.meta.orientation === val
                    ? "bg-[#f5c518] text-[#0b0b10]"
                    : "bg-transparent text-[#55556a] hover:text-[#9494a8]"
                }`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Resolution */}
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] text-[#e8e8f0] text-[13px] px-3 py-[5px] rounded-[6px] cursor-pointer focus:outline-none"
        >
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>

        {/* Credit balance */}
        <div
          className="flex items-center gap-1 px-3 py-[5px] rounded-[6px] bg-[#16161f] border border-[rgba(255,255,255,0.06)] text-[13px] font-mono"
          style={{ color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}
        >
          ⚡ {balance ?? "—"}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={progress !== null}
          className="flex items-center gap-2 bg-[#f5c518] text-[#0b0b10] font-bold text-[14px] px-4 py-[6px] rounded-[6px] hover:shadow-[0_0_16px_rgba(245,197,24,0.3)] transition disabled:opacity-50 cursor-pointer border-0"
        >
          {progress !== null ? `${progress}%` : "Export"}
        </button>

        {/* Renders — persists across refreshes */}
        {renders.length > 0 && (
          <div ref={rendersRef} className="relative">
            {renders.length === 1 ? (
              <a
                href={renders[0].video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#2dd4bf] text-[#0b0b10] font-semibold text-[14px] px-4 py-[6px] rounded-[6px] border-0 cursor-pointer no-underline"
                style={{ textDecoration: "none" }}
              >
                Download
              </a>
            ) : (
              <>
                <button
                  onClick={() => setRendersOpen((o) => !o)}
                  className="flex items-center gap-1.5 bg-[#2dd4bf] text-[#0b0b10] font-semibold text-[14px] px-4 py-[6px] rounded-[6px] border-0 cursor-pointer"
                >
                  Downloads ({renders.length}) <span className="text-[11px]">▾</span>
                </button>
                {rendersOpen && (
                  <div className="absolute top-[calc(100%+6px)] right-0 w-[300px] bg-[#1c1c28] border border-[rgba(255,255,255,0.1)] rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                    {renders.map((r, i) => (
                      <a
                        key={r.id}
                        href={r.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-[10px] text-[13px] text-[#9494a8] hover:text-[#e8e8f0] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                        style={{ textDecoration: "none" }}
                      >
                        <span>
                          {i === 0 && <span className="text-[#2dd4bf] text-[11px] font-semibold mr-1.5">LATEST</span>}
                          {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[11px] text-[#55556a]">↓ MP4</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="text-[13px] text-[#f87171] bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity px-1"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
