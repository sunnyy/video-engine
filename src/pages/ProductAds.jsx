import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { getProductAdProjects, deleteProject } from "../services/projects/projectService";
import { AdGenerator } from "./NewProductAd";

const STEP_LABELS = { 2: "Analyzed", 3: "Visuals ready", 4: "Clips ready", 5: "Complete" };

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function AdCard({ project, onDelete, onResume }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const isComplete  = (project.steps_completed ?? 0) >= 5 || project.safe_project_json != null;
  const stepLabel   = STEP_LABELS[project.steps_completed] ?? "In Progress";
  const productType = project.raw_ai_json?.analysis?.product_analysis?.product_type;

  const d = project.raw_ai_json || {};
  const firstSceneImg = d.images ? Object.values(d.images).find(v => v?.url)?.url : null;
  const rawPreview = d.base_image_url || firstSceneImg || d.product_image_url || null;
  const firstBeatVideoSrc = project.safe_project_json?.beats?.[0]?.zones?.z1?.content?.asset?.src || null;
  const previewImg    = rawPreview || null;
  const previewVideo  = !rawPreview ? firstBeatVideoSrc : null;

  function handleClick() {
    if (isComplete) {
      navigate(`/editor/${project.id}`);
    } else {
      onResume(project.id);
    }
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background:   "#111118",
        border:       `1px solid ${hovering ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14,
        overflow:     "hidden",
        cursor:       "pointer",
        transition:   "all 0.2s",
        transform:    hovering ? "translateY(-2px)" : "none",
        boxShadow:    hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Thumbnail */}
      <div style={{ paddingTop: "56.25%", position: "relative", background: "linear-gradient(135deg,#1a0a1a,#2d0d2d,#4a1a4a)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {previewImg
            ? <img src={previewImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : previewVideo
            ? <video src={previewVideo} preload="metadata" muted playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onLoadedMetadata={e => { e.target.currentTime = 0.1; }}
                onError={e => { e.target.style.display = "none"; }} />
            : <span style={{ fontSize: 32, opacity: 0.4 }}>🎬</span>
          }
        </div>
        {/* Status badge */}
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span style={{
            padding:      "3px 8px",
            borderRadius: 5,
            fontSize:     10,
            fontWeight:   700,
            background:   isComplete ? "rgba(34,197,94,0.2)" : "rgba(245,197,24,0.2)",
            color:        isComplete ? "#4ade80"              : "#f5c518",
            border:       `1px solid ${isComplete ? "rgba(34,197,94,0.3)" : "rgba(245,197,24,0.3)"}`,
          }}>
            {isComplete ? "Complete" : `Step ${project.steps_completed ?? "?"} — ${stepLabel}`}
          </span>
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Outfit',sans-serif" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: "#77777f", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{timeLabel(project.updated_at)}</span>
            {productType && <span style={{ color: "#9494a8" }}>· {productType}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: isComplete ? "#7c5cfc" : "#f5c518" }}>
            {isComplete ? "Edit →" : "Resume →"}
          </span>
          <button
            onClick={handleDelete}
            style={{
              width:      26, height: 26,
              borderRadius: 6,
              border:     "none",
              cursor:     "pointer",
              fontSize:   11,
              background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
              color:      confirming ? "#f87171"               : "#55556a",
              opacity:    hovering ? 1 : 0,
              transition: "opacity 0.15s",
              display:    "flex", alignItems: "center", justifyContent: "center",
            }}
            title={confirming ? "Click again to confirm" : "Delete"}
          >
            {confirming ? "!" : "✕"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Listing ── */
function VideoListing({ onResume }) {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getProductAdProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  const isProjectComplete = p => (p.steps_completed ?? 0) >= 5 || p.safe_project_json != null;
  const incomplete = projects.filter(p => !isProjectComplete(p));
  const complete   = projects.filter(p =>  isProjectComplete(p));

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pa-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>📦</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No product videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to generate your first one</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      {/* In-progress */}
      {incomplete.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#77777f", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            In Progress
          </div>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {incomplete.map(p => <AdCard key={p.id} project={p} onDelete={handleDelete} onResume={onResume} />)}
          </div>
        </div>
      )}

      {/* Completed */}
      {complete.length > 0 && (
        <div>
          {incomplete.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: "#77777f", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Completed
            </div>
          )}
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {complete.map(p => <AdCard key={p.id} project={p} onDelete={handleDelete} onResume={onResume} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function ProductAds() {
  const [tab,      setTab]      = useState("videos");
  const [resumeId, setResumeId] = useState(null);

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  const handleResume = (id) => {
    setResumeId(id);
    setTab("create");
  };

  const handleTabChange = (id) => {
    if (id !== "create") setResumeId(null);
    setTab(id);
  };

  return (
    <AppLayout>
      <style>{`@keyframes pa-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>
            Product Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                style={{
                  padding: "8px 20px",
                  border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "videos"
          ? <VideoListing onResume={handleResume} />
          : <div style={{ flex: 1, overflowY: "auto" }}><AdGenerator resumeId={resumeId} /></div>
        }
      </div>
    </AppLayout>
  );
}
