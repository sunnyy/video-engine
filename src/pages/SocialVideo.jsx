import { useState, useEffect } from "react";
import { useNavigate }        from "react-router-dom";
import { generateSocialVideo }   from "../services/ai/socialVideo/generateSocialVideo";
import { getSocialVideoProjects, deleteProject } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";

const T = {
  bg:      "#090b11",
  surface: "#0e1018",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#1d9bf0",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  success: "#22c55e",
  danger:  "#f87171",
};

const STATUS_STEPS = [
  "Fetching post content…",
  "Writing script…",
  "Designing scenes…",
  "Generating voiceover…",
  "Building timeline…",
  "Saving project…",
];

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function detectPlatformLabel(url) {
  if (!url) return null;
  if (/twitter\.com|x\.com/i.test(url)) return "Twitter / X";
  return "Social URL";
}

function VideoCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const meta = project.safe_project_json?.raw_ai_json ?? {};

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  return (
    <div
      onClick={() => navigate(`/video-editor/${project.id}`, { state: { from: "/social-video" } })}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background:   T.surface,
        border:       `1px solid ${hovering ? "rgba(29,155,240,0.4)" : T.border}`,
        borderRadius: 14,
        overflow:     "hidden",
        cursor:       "pointer",
        transition:   "all 0.2s",
        transform:    hovering ? "translateY(-2px)" : "none",
        boxShadow:    hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ paddingTop: "56.25%", position: "relative", background: "linear-gradient(135deg,#060a14,#0d1a28,#0a1420)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32, opacity: 0.35 }}>📱</span>
        </div>
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 5 }}>
          <span style={{
            padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
            background: "rgba(34,197,94,0.2)", color: "#4ade80",
            border: "1px solid rgba(34,197,94,0.3)",
          }}>Complete</span>
          {meta.platform && (
            <span style={{
              padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
              background: "rgba(29,155,240,0.2)", color: "#60c8ff",
              border: "1px solid rgba(29,155,240,0.3)",
            }}>{meta.platform}</span>
          )}
        </div>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          {meta.author && (
            <div style={{ fontSize: 11, color: T.accent, marginTop: 1 }}>{meta.author}</div>
          )}
          <div style={{ fontSize: 11, color: "#55667a", marginTop: 2 }}>{timeLabel(project.updated_at)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>Edit →</span>
          <button
            onClick={handleDelete}
            style={{
              width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
              background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
              color:      confirming ? "#f87171"               : "#55667a",
              opacity: hovering ? 1 : 0, transition: "opacity 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={confirming ? "Click again to confirm" : "Delete"}
          >{confirming ? "!" : "✕"}</button>
        </div>
      </div>
    </div>
  );
}

function VideoListing() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getSocialVideoProjects()
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

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "sv-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>📱</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No social videos yet</div>
        <div style={{ fontSize: 14, color: T.muted }}>Switch to Create New and paste a tweet URL</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {projects.map(p => <VideoCard key={p.id} project={p} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}

function GeneratorForm() {
  const navigate = useNavigate();
  const [url,         setUrl]         = useState("");
  const [loading,     setLoading]     = useState(false);
  const [statusStep,  setStatusStep]  = useState(0);
  const [error,       setError]       = useState(null);

  const platformLabel = detectPlatformLabel(url.trim());
  const canGenerate   = !!url.trim() && !loading;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setStatusStep(0);

    try {
      const result = await generateSocialVideo(
        { url: url.trim() },
        ({ step }) => {
          const idx = STATUS_STEPS.indexOf(step);
          if (idx !== -1) setStatusStep(idx);
        },
      );
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/social-video" } });
    } catch (err) {
      if (err.code === "NO_CREDITS") {
        setError("Not enough credits. You need 15 credits to generate a social video.");
      } else {
        setError(err.message || "Generation failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📱</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Turn a tweet into a video
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Paste any Twitter/X post URL. AI fetches the content, writes a viral script, and builds a ready-to-post short.
          </p>
        </div>

        {/* URL input */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Post URL
          </div>
          <div style={{ position: "relative" }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="https://twitter.com/user/status/..."
              disabled={loading}
              style={{
                width: "100%", padding: "12px 14px", paddingRight: platformLabel ? 120 : 14,
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${url.trim() ? "rgba(29,155,240,0.35)" : T.border}`,
                borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
                outline: "none", opacity: loading ? 0.5 : 1, transition: "border-color 0.2s",
              }}
            />
            {platformLabel && !loading && (
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                background: "rgba(29,155,240,0.15)", color: "#60c8ff",
                border: "1px solid rgba(29,155,240,0.3)",
                pointerEvents: "none",
              }}>{platformLabel}</span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
            {error}
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div style={{ marginBottom: 24, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>
              {STATUS_STEPS[statusStep]}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {STATUS_STEPS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusStep ? T.accent : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {STATUS_STEPS.map((label, i) => (
                <div key={i} style={{ fontSize: 12, color: i === statusStep ? T.text : i < statusStep ? T.success : T.muted, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, width: 10 }}>{i < statusStep ? "✓" : i === statusStep ? "▶" : "○"}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: "100%", padding: "14px 24px",
            background: canGenerate ? T.accent : "rgba(29,155,240,0.25)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {loading ? "Generating…" : "Generate Social Video"}
        </button>

        {/* Info */}
        {!loading && (
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { icon: "🐦", label: "Twitter / X",  desc: "Paste any public tweet URL" },
              { icon: "🎙️", label: "AI Voiceover",  desc: "ElevenLabs, word-synced" },
              { icon: "⚡", label: "15 Credits",    desc: "Per generation" },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{ padding: "14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c0ccd8" }}>{label}</div>
                <div style={{ fontSize: 11, color: "#45556a", marginTop: 3 }}>{desc}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function SocialVideo() {
  const [tab, setTab] = useState("create");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes sv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#090b11", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Social Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(29,155,240,0.12)" : "transparent",
                  color:      tab === t.id ? "#60c8ff"               : "#55667a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {tab === "videos" ? <VideoListing /> : <GeneratorForm />}

      </div>
    </AppLayout>
  );
}
