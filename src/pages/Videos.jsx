/**
 * Dashboard.jsx
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteProject } from "../services/projects/projectService";
import { useProjectsStore } from "../store/useProjectsStore";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/profileService";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";
import Onboarding from "./Onboarding";
import FeedbackModal from "../ui/components/FeedbackModal";

/* ── Niche → gradient map ── */
const NICHE_GRADIENTS = {
  finance:       "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
  fitness:       "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
  tech:          "linear-gradient(135deg,#0d0d1a,#1a0533,#2d1b69)",
  technology:    "linear-gradient(135deg,#0d0d1a,#1a0533,#2d1b69)",
  entertainment: "linear-gradient(135deg,#1a0a00,#3d1a00,#7a2d00)",
  food:          "linear-gradient(135deg,#1a0a0a,#3d1515,#6b2020)",
  travel:        "linear-gradient(135deg,#001a2c,#003459,#006494)",
  business:      "linear-gradient(135deg,#0d1117,#161b22,#21262d)",
  education:     "linear-gradient(135deg,#0a1628,#0d2137,#112a4a)",
  health:        "linear-gradient(135deg,#0a1f0a,#0d2e0d,#0f3d0f)",
  fashion:       "linear-gradient(135deg,#1a0a1a,#2d0d2d,#4a1a4a)",
  sports:        "linear-gradient(135deg,#1a1a0a,#2d2d0d,#3d3d10)",
  gaming:        "linear-gradient(135deg,#0d001a,#1a0033,#2d0052)",
  beauty:        "linear-gradient(135deg,#1a0a12,#2d0d1e,#4a1a33)",
  real_estate:   "linear-gradient(135deg,#0a1419,#0d1e26,#112733)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg,#111118,#1a1a28,#16161f)";

function nicheGradient(niche) {
  if (!niche) return DEFAULT_GRADIENT;
  return NICHE_GRADIENTS[niche.toLowerCase().replace(/\s+/g, "_")] || DEFAULT_GRADIENT;
}

/* ── Niche pill color ── */
const NICHE_PILL_COLORS = {
  finance:       { bg: "rgba(245,197,24,0.15)",  color: "#f5c518" },
  fitness:       { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  tech:          { bg: "rgba(124,92,252,0.15)",  color: "#a78bfa" },
  technology:    { bg: "rgba(124,92,252,0.15)",  color: "#a78bfa" },
  entertainment: { bg: "rgba(251,146,60,0.15)",  color: "#fb923c" },
  food:          { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  travel:        { bg: "rgba(6,182,212,0.15)",   color: "#22d3ee" },
  business:      { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  education:     { bg: "rgba(59,130,246,0.15)",  color: "#93c5fd" },
  health:        { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
  gaming:        { bg: "rgba(167,139,250,0.15)", color: "#c4b5fd" },
  beauty:        { bg: "rgba(236,72,153,0.15)",  color: "#f472b6" },
};
function nichePillStyle(niche) {
  if (!niche) return null;
  return NICHE_PILL_COLORS[niche.toLowerCase().replace(/\s+/g, "_")] || { bg: "rgba(255,255,255,0.08)", color: "#9494a8" };
}

/* ── Time label ── */
function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

/* ── ProjectCard ── */
function ProjectCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  const meta        = project.safe_project_json?.meta || {};
  const beats       = project.safe_project_json?.beats || [];
  const firstBeat   = beats[0];
  const niche       = meta.niche || null;
  const orientation = meta.orientation || "9:16";
  const beatCount   = beats.length;
  const duration    = project.safe_project_json?.duration_sec
    ? `${Math.round(project.safe_project_json.duration_sec)}s`
    : null;

  let thumb   = null;
  let thumbBg = null;

  if (meta.thumbnail) thumb = meta.thumbnail;
  if (!thumb && firstBeat) {
    const zones = firstBeat.zones || {};
    for (const zone of Object.values(zones)) {
      const src = zone.content?.asset?.src;
      if (src) { thumb = src; break; }
    }
  }
  if (!thumb && firstBeat) {
    const bg = firstBeat.layoutBackground;
    if (bg?.type === "image" || bg?.type === "video") thumb = bg.value;
  }
  if (!thumb && firstBeat?.layoutBackground?.type === "color") {
    thumbBg = firstBeat.layoutBackground.value;
  }
  if (!thumb && !thumbBg) thumbBg = nicheGradient(niche);

  const pillStyle = nichePillStyle(niche);

  const handleDelete = (e) => {
    e.preventDefault();
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
      <div className="relative overflow-hidden" style={{ paddingTop: "56.25%", background: thumbBg || "#111118" }}>
        {thumb ? (
          <img src={thumb} className="absolute inset-0 w-full h-full object-cover"
            onError={e => { e.target.style.display = "none"; }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: thumbBg || nicheGradient(niche) }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15 }}>
              <rect x="2" y="2" width="20" height="20" rx="3" stroke="white" strokeWidth="1.5"/>
              <path d="M10 8l6 4-6 4V8z" fill="white"/>
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold text-white"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
            {orientation}
          </span>
          {beatCount > 0 && (
            <span className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold text-white"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
              {beatCount} beats
            </span>
          )}
        </div>

        {duration && (
          <div className="absolute bottom-2 right-2 px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold text-white"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", fontFamily: "'JetBrains Mono',monospace" }}>
            {duration}
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="px-3 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-[#e8e8f0] truncate" style={{ fontFamily: "'Syne',sans-serif" }}>
            {project.name || "Untitled"}
          </div>
          <div className="flex items-center gap-2 mt-[4px]">
            <span className="text-[13px] text-[#77777f]" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {timeLabel(project.updated_at)}
            </span>
            {niche && pillStyle && (
              <span className="px-[6px] py-[1px] rounded-[4px] text-[11px] font-semibold capitalize"
                style={{ background: pillStyle.bg, color: pillStyle.color }}>
                {niche}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="shrink-0 w-[26px] h-[26px] rounded-[6px] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border-0 cursor-pointer text-[12px]"
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

const PAGE_SIZE = 12;

/* ── Videos ── */
export default function Videos() {
  const navigate = useNavigate();
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [userId,         setUserId]         = useState(null);
  const { projects, loading, fetchProjects, removeProject } = useProjectsStore();

  useEffect(() => {
    fetchProjects();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const lsKey = `onboarding_done_${user.id}`;
        if (localStorage.getItem(lsKey)) return;
        getProfile(user.id).then(profile => {
          if (profile === null) return;
          if (profile?.onboarding_completed) {
            localStorage.setItem(lsKey, "1");
          } else {
            setShowOnboarding(true);
          }
        }).catch(() => {});
      }
    });

    if (!localStorage.getItem("feedback_prompted")) {
      serverFetch("/api/feedback/mine").then(r => r.json()).then(({ count }) => {
        if (count === 0) {
          setTimeout(() => {
            localStorage.setItem("feedback_prompted", "true");
            setShowFeedback(true);
          }, 3000);
        } else {
          localStorage.setItem("feedback_prompted", "true");
        }
      }).catch(() => {});
    }
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      removeProject(id);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const videoProjects = projects.filter(p => p.source !== "product_ad");
  const filtered = videoProjects.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearch = (val) => { setSearch(val); setPage(1); };

  return (
    <AppLayout>
      {showOnboarding && userId && (
        <Onboarding userId={userId} onComplete={() => {
          localStorage.setItem(`onboarding_done_${userId}`, "1");
          setShowOnboarding(false);
        }} />
      )}

      {showFeedback && (
        <FeedbackModal context="post_visit" onClose={() => setShowFeedback(false)} />
      )}

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}
      >
        <h1 className="text-[20px] font-bold text-[#f5c518]" style={{ fontFamily: "'Syne',sans-serif" }}>
          Videos
          {!loading && (
            <span className="ml-2 text-[15px] font-normal text-[#77777f]">({videoProjects.length})</span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          {videoProjects.length > 4 && (
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search videos…"
              className="bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[6px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none w-[200px]"
            />
          )}
          <button
            onClick={() => navigate("/new")}
            className="flex items-center gap-2 px-4 py-[7px] rounded-[8px] text-[15px] font-bold text-[#0b0b10] border-0 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "#f5c518" }}
          >
            + New Video
          </button>
        </div>
      </div>

      {/* Grid area */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && videoProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-[48px]">🎬</div>
            <div className="text-[20px] font-bold text-[#e8e8f0]">No projects yet</div>
            <div className="text-[16px] text-[#77777f]">Create your first AI video to get started</div>
            <button
              onClick={() => navigate("/new")}
              className="mt-2 px-6 py-[10px] rounded-[10px] text-[16px] font-bold text-[#0b0b10] border-0 cursor-pointer"
              style={{ background: "#f5c518" }}
            >
              + Create First Project
            </button>
          </div>
        )}

        {!loading && filtered.length === 0 && videoProjects.length > 0 && (
          <div className="text-center py-16 text-[15px] text-[#77777f]">No projects match "{search}"</div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {paginated.map(p => (
                <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-[6px] rounded-[7px] text-[13px] font-semibold border-0 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-default"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8" }}
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="w-[32px] h-[32px] rounded-[7px] text-[13px] font-bold border-0 cursor-pointer transition-all"
                    style={{
                      background: n === page ? "#7c5cfc" : "rgba(255,255,255,0.06)",
                      color:      n === page ? "#fff"     : "#a0a0b8",
                    }}
                  >
                    {n}
                  </button>
                ))}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-[6px] rounded-[7px] text-[13px] font-semibold border-0 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-default"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8" }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
