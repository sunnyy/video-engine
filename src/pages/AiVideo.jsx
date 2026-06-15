import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateAiVideo } from "../services/ai/aiVideo/generateAiVideo";
import { getAiVideoProjects, deleteProject, invalidateProjectCaches } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";

const T = {
  bg:      "#090b11",
  surface: "#0e1018",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#8b5cf6",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  danger:  "#f87171",
};

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function VideoCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const previewText = project.safe_project_json?.full_script ?? null;
  const editorHref  = `/video-editor/${project.id}`;
  const navClick = e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(editorHref, { state: { from: "/ai-video" } }); } };

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) onDelete(project.id);
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background: T.surface, borderRadius: 14, overflow: "hidden",
        border: `1px solid ${hovering ? "rgba(139,92,246,0.35)" : T.border}`,
        transition: "all 0.2s", transform: hovering ? "translateY(-2px)" : "none",
      }}
    >
      <a href={editorHref} onClick={navClick} style={{ display: "block", textDecoration: "none" }}>
        <div style={{
          position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden",
          background: "radial-gradient(700px 600px at 50% 30%, rgba(139,92,246,0.25), transparent 62%), linear-gradient(135deg, #0c0a18 0%, #07060f 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 12px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)", textAlign: "center", lineHeight: 1.5 }}>
            {previewText || "Transformation"}
          </div>
          <button onClick={handleDelete} title={confirming ? "Click again to confirm" : "Delete"}
            style={{
              position: "absolute", top: 8, left: 8, width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer",
              background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.55)",
              color: confirming ? "#fff" : "#999", fontSize: 13, fontWeight: 700,
              opacity: hovering ? 1 : 0, transition: "opacity 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            {confirming ? "!" : "✕"}
          </button>
        </div>
      </a>
      <a href={editorHref} onClick={navClick} style={{ display: "block", textDecoration: "none", color: "inherit", padding: "11px 13px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
          {project.name}
        </div>
        <div style={{ fontSize: 11, color: "#55667a" }}>{timeLabel(project.updated_at)}</div>
      </a>
    </div>
  );
}

function VideoListing() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAiVideoProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try { await deleteProject(id); setProjects(prev => prev.filter(p => p.id !== id)); }
    catch (e) { console.error("Delete failed", e); }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "av-spin 0.8s linear infinite" }} />
      </div>
    );
  }
  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🔀</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No AI videos yet</div>
        <div style={{ fontSize: 14, color: T.muted }}>Switch to Create New to build a transformation</div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {projects.map(p => <VideoCard key={p.id} project={p} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}

const EXAMPLES = [
  "Why short-form video wins attention in 2026",
  "3 habits that quietly compound into success",
  "The case for shipping before you're ready",
];

function GeneratorForm() {
  const navigate = useNavigate();
  const [topic,   setTopic]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleGenerate(useDemo = false) {
    if (loading) return;
    if (!useDemo && !topic.trim()) return;
    setLoading(true); setError(null);
    try {
      const result = await generateAiVideo(useDemo ? {} : { topic: topic.trim() });
      invalidateProjectCaches("ai_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/ai-video" } });
    } catch (err) {
      setError(err.message || "Generation failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔀</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Premium UI, premium motion
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.55 }}>
            Drop a topic. The director scripts it into beats, GPT designs each frame, and every element
            flies in and out with real cinematic motion.
          </p>
        </div>

        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={EXAMPLES[0]}
          disabled={loading}
          rows={3}
          style={{
            width: "100%", padding: "13px 15px", boxSizing: "border-box", resize: "vertical",
            background: "rgba(255,255,255,0.04)", border: `1px solid ${topic.trim() ? "rgba(139,92,246,0.4)" : T.border}`,
            borderRadius: 12, color: T.text, fontSize: 14, fontFamily: "inherit", lineHeight: 1.5,
            outline: "none", opacity: loading ? 0.5 : 1, transition: "border-color 0.2s", marginBottom: 8,
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => !loading && setTopic(ex)}
              style={{ fontSize: 11, color: T.muted, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 100, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>
              {ex.length > 42 ? ex.slice(0, 42) + "…" : ex}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 18, padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
            {error}
          </div>
        )}

        <button
          onClick={() => handleGenerate(false)}
          disabled={loading || !topic.trim()}
          style={{
            width: "100%", padding: "14px 24px",
            background: (loading || !topic.trim()) ? "rgba(139,92,246,0.3)" : T.accent,
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800,
            cursor: (loading || !topic.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {loading ? "Directing, designing & animating…" : "Generate AI Video"}
        </button>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={() => handleGenerate(true)} disabled={loading}
            style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
            or run the motion demo (no topic)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AiVideo() {
  const [tab, setTab] = useState("create");
  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];
  return (
    <AppLayout>
      <style>{`@keyframes av-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#090b11", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            AI Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(139,92,246,0.12)" : "transparent",
                  color:      tab === t.id ? "#a78bfa"               : "#55667a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif", cursor: "pointer", transition: "all 0.15s",
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
