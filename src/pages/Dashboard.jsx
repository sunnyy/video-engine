import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProjects, deleteProject } from "../services/projects/projectService";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";

function ProjectCard({ project, onDelete }) {
  const [hovering, setHovering] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Try to find a thumbnail from the first beat
  const beats    = project.safe_project_json?.beats || [];
  const firstBeat = beats[0];
  let thumb = null;

  if (firstBeat) {
    const zones = firstBeat.zones || {};
    for (const zone of Object.values(zones)) {
      const src = zone.content?.asset?.src;
      if (src) { thumb = src; break; }
    }
    if (!thumb) {
      const bg = firstBeat.layoutBackground;
      if (bg?.type === "image" || bg?.type === "video") thumb = bg.value;
    }
  }

  const bgColor = firstBeat?.layoutBackground?.type === "color"
    ? firstBeat.layoutBackground.value
    : "#111118";

  const updatedAt = new Date(project.updated_at);
  const now       = new Date();
  const diffMs    = now - updatedAt;
  const diffDays  = Math.floor(diffMs / 86400000);
  const timeLabel = diffDays === 0
    ? "Today"
    : diffDays === 1
    ? "Yesterday"
    : diffDays < 7
    ? `${diffDays} days ago`
    : updatedAt.toLocaleDateString();

  const beatCount = beats.length;
  const duration  = project.safe_project_json?.duration_sec
    ? `${Math.round(project.safe_project_json.duration_sec)}s`
    : null;
  const orientation = project.safe_project_json?.meta?.orientation || "9:16";

  const handleDelete = (e) => {
    e.preventDefault();    // don't follow the <a> link
    e.stopPropagation();
    if (confirming) {
      onDelete(project.id);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
    }
  };

  return (
    <a
      href={`/editor/${project.id}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      className="group relative block rounded-[14px] overflow-hidden border transition-all duration-200"
      style={{
        textDecoration: "none",
        background:     "#111118",
        borderColor:    hovering ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)",
        boxShadow:      hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
        transform:      hovering ? "translateY(-2px)" : "none",
      }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ paddingTop: orientation === "9:16" ? "56.25%" : "56.25%", background: bgColor }}>
        {thumb ? (
          <img
            src={thumb}
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: bgColor }}>
            <div className="text-[32px] opacity-20">🎬</div>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold text-white"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
            {orientation}
          </span>
          {beatCount > 0 && (
            <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold text-white"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
              {beatCount} beats
            </span>
          )}
        </div>

        {duration && (
          <div className="absolute bottom-2 right-2 px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold text-white"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", fontFamily: "'JetBrains Mono', monospace" }}>
            {duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-[#e8e8f0] truncate"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            {project.name || "Untitled"}
          </div>
          <div className="text-[11px] text-[#55556a] mt-[2px]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {timeLabel}
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="shrink-0 w-[28px] h-[28px] rounded-[6px] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border-0 cursor-pointer"
          style={{
            background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
            color:      confirming ? "#f87171" : "#55556a",
          }}
          title={confirming ? "Click again to confirm" : "Delete project"}
        >
          {confirming ? "!" : "✕"}
        </button>
      </div>
    </a>
  );
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const { balance, fetchCredits } = useCreditsStore();

  useEffect(() => {
    getUserProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
    fetchCredits();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      setProjects(p => p.filter(x => x.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const filtered = projects.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[36px] h-[24px] flex items-center justify-center rounded-[4px] bg-[#f5c518] text-[#0b0b10] font-bold text-[16px]"
            style={{ fontFamily: "'Syne', sans-serif" }}>VE</div>
          <span className="text-[16px] font-bold text-[#e8e8f0]"
            style={{ fontFamily: "'Syne', sans-serif" }}>VideoEngine</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-3 py-[6px] rounded-[6px] text-[13px] font-mono border"
            style={{ background: "#111118", borderColor: "rgba(255,255,255,0.06)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}>
            ⚡ {balance ?? "—"} credits
          </div>
          <button
            onClick={() => navigate("/image-generation")}
            className="flex items-center gap-2 px-4 py-[8px] rounded-[8px] text-[13px] font-semibold border cursor-pointer transition-all hover:opacity-90"
            style={{ background: "rgba(124,92,252,0.1)", borderColor: "rgba(124,92,252,0.35)", color: "#a78bfa" }}>
            🖼 Image Studio
          </button>
          <button
            onClick={() => navigate("/new")}
            className="flex items-center gap-2 px-4 py-[8px] rounded-[8px] text-[13px] font-bold text-[#0b0b10] border-0 cursor-pointer transition-all hover:opacity-90"
            style={{ background: "#f5c518" }}>
            + New Project
          </button>
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="px-3 py-[7px] rounded-[8px] text-[13px] text-[#f87171] border border-[rgba(248,113,113,0.2)] bg-transparent cursor-pointer hover:bg-[rgba(248,113,113,0.08)] transition-all">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-8">

        {/* Title + search */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-[22px] font-bold text-[#e8e8f0]"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            Your Projects
            {!loading && (
              <span className="ml-2 text-[14px] font-normal text-[#55556a]">
                ({projects.length})
              </span>
            )}
          </h1>
          {projects.length > 4 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none w-[220px]"
            />
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-[48px]">🎬</div>
            <div className="text-[18px] font-bold text-[#e8e8f0]">No projects yet</div>
            <div className="text-[14px] text-[#55556a]">Create your first AI video to get started</div>
            <button
              onClick={() => navigate("/new")}
              className="mt-2 px-6 py-[10px] rounded-[10px] text-[14px] font-bold text-[#0b0b10] border-0 cursor-pointer"
              style={{ background: "#f5c518" }}>
              + Create First Project
            </button>
          </div>
        )}

        {!loading && filtered.length === 0 && projects.length > 0 && (
          <div className="text-center py-16 text-[#55556a]">No projects match "{search}"</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}