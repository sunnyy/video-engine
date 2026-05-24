import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateTypographyVideo } from "../services/ai/typographyVideo/generateTypographyVideo";
import { createProject } from "../services/projects/projectService";
import { getTypographyVideoProjects, deleteProject } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";

const T = {
  bg:      "#0a0a10",
  surface: "#111118",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#7c5cfc",
  text:    "#e8e8f0",
  muted:   "#9494a8",
  success: "#22c55e",
  danger:  "#f87171",
};

const STYLES = ["Bold & Minimal", "High Energy", "Dark & Moody", "Clean & Professional"];

const STATUS_STEPS = [
  "Writing script…",
  "Generating voiceover…",
  "Syncing word timestamps…",
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

/* ── Project card ── */
function VideoCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  return (
    <div
      onClick={() => navigate(`/video-editor/${project.id}`)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background:   T.surface,
        border:       `1px solid ${hovering ? "rgba(124,92,252,0.4)" : T.border}`,
        borderRadius: 14,
        overflow:     "hidden",
        cursor:       "pointer",
        transition:   "all 0.2s",
        transform:    hovering ? "translateY(-2px)" : "none",
        boxShadow:    hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ paddingTop: "56.25%", position: "relative", background: "linear-gradient(135deg,#0f0820,#1a0a2e,#2d1060)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32, opacity: 0.35 }}>✍️</span>
        </div>
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span style={{
            padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
            background: "rgba(34,197,94,0.2)", color: "#4ade80",
            border: "1px solid rgba(34,197,94,0.3)",
          }}>Complete</span>
        </div>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: "#77777f", marginTop: 3 }}>{timeLabel(project.updated_at)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>Edit →</span>
          <button
            onClick={handleDelete}
            style={{
              width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
              background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
              color:      confirming ? "#f87171"               : "#55556a",
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

/* ── Listing tab ── */
function VideoListing() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getTypographyVideoProjects()
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
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "tv-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>✍️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No typography videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to generate your first one</div>
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

/* ── Generator form tab ── */
function GeneratorForm() {
  const navigate = useNavigate();
  const [inputType, setInputType] = useState("topic");
  const [input,     setInput]     = useState("");
  const [style,     setStyle]     = useState("Bold & Minimal");
  const [loading,   setLoading]   = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error,     setError]     = useState(null);

  async function handleGenerate() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setStatusIdx(0);

    const stepTimer = setInterval(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_STEPS.length - 2));
    }, 3500);

    try {
      const result = await generateTypographyVideo({ input: input.trim(), inputType, style });

      clearInterval(stepTimer);
      setStatusIdx(STATUS_STEPS.length - 1);

      const project = await createProject({
        name: result.projectName,
        rawAI: { projectName: result.projectName },
        safeProject: {
          layers: result.layers,
          meta: {
            fps:         result.fps,
            duration:    result.duration,
            orientation: "9:16",
            mode:        "faceless",
          },
        },
        source: "typography_video",
      });

      navigate(`/video-editor/${project.id}`);
    } catch (err) {
      clearInterval(stepTimer);
      setError(err.message || "Generation failed. Please try again.");
      setLoading(false);
    }
  }

  const canGenerate = !!input.trim() && !loading;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 24px 60px" }}>

        {/* Input type toggle */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Input Type
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["topic", "script"].map((t) => (
              <button
                key={t}
                onClick={() => { if (!loading) { setInputType(t); setInput(""); } }}
                disabled={loading}
                style={{
                  padding: "9px 20px", border: "none", borderRadius: 10,
                  background: inputType === t ? T.accent : "rgba(255,255,255,0.05)",
                  color:      inputType === t ? "#fff"   : T.muted,
                  fontSize: 13, fontWeight: inputType === t ? 700 : 500,
                  fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s", opacity: loading ? 0.6 : 1,
                }}
              >
                {t === "topic" ? "Topic / Idea" : "Full Script"}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {inputType === "topic" ? "Topic" : "Script"}
          </div>
          {inputType === "topic" ? (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Why most people fail to build habits"
              disabled={loading}
              style={{
                width: "100%", padding: "10px 13px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
                outline: "none", opacity: loading ? 0.5 : 1,
              }}
            />
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"Paste your full script here…\n\nEach sentence will become a scene with phrases revealed one-by-one."}
              disabled={loading}
              rows={8}
              style={{
                width: "100%", padding: "10px 13px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
                outline: "none", resize: "vertical", lineHeight: 1.6,
                opacity: loading ? 0.5 : 1,
              }}
            />
          )}
        </div>

        {/* Style */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Style
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => !loading && setStyle(s)}
                disabled={loading}
                style={{
                  padding: "9px 16px", border: "none", borderRadius: 10,
                  background: style === s ? T.accent : "rgba(255,255,255,0.05)",
                  color:      style === s ? "#fff"   : T.muted,
                  fontSize: 13, fontWeight: style === s ? 700 : 500,
                  fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s", opacity: loading ? 0.6 : 1,
                }}
              >
                {s}
              </button>
            ))}
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
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {STATUS_STEPS[statusIdx]}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {STATUS_STEPS.slice(0, -1).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusIdx ? T.accent : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {STATUS_STEPS.slice(0, -1).map((label, i) => (
                <div key={i} style={{ fontSize: 12, color: i === statusIdx ? T.text : i < statusIdx ? T.success : T.muted, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, width: 10 }}>{i < statusIdx ? "✓" : i === statusIdx ? "▶" : "○"}</span>
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
            background: canGenerate ? T.accent : "rgba(124,92,252,0.35)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {loading ? "Generating…" : "Generate Video"}
        </button>

        {/* Info cards */}
        {!loading && (
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { icon: "🎙️", label: "AI Voiceover",  desc: "Nova voice, normalized audio" },
              { icon: "⏱️", label: "Word Sync",      desc: "Phrases timed to speech" },
              { icon: "⚡", label: "15 Credits",     desc: "Per generation" },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{ padding: "14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c0c0d8" }}>{label}</div>
                <div style={{ fontSize: 11, color: "#55556a", marginTop: 3 }}>{desc}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Main page ── */
export default function TypographyVideo() {
  const [tab, setTab] = useState("create");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes tv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Typography Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color:      tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
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
