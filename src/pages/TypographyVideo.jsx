import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateTypographyVideo } from "../services/ai/typographyVideo/generateTypographyVideo";
import { getTypographyVideoProjects, deleteProject, invalidateProjectCaches } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker";

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

const DURATION_OPTIONS = [
  { value: 20, label: "Quick",      description: "~15–20s · 3–5 scenes",  hint: "Single idea or hook" },
  { value: 40, label: "Standard",   description: "~35–45s · 7–10 scenes", hint: "Facts, story, 5 tools" },
  { value: 75, label: "Deep Dive",  description: "~60–80s · 12–18 scenes", hint: "Full breakdown" },
];

const STATUS_STEPS = [
  "Crafting your story…",
  "Adding your voice…",
  "Building your visuals…",
  "Putting it all together…",
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

function VideoThumb({ src, style, playing }) {
  const ref = useRef();
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) { v.play().catch(() => {}); }
    else { v.pause(); v.currentTime = 0.1; }
  }, [playing]);
  return (
    <video ref={ref} src={src} muted playsInline loop preload="auto"
      onLoadedData={() => { if (ref.current && !playing) ref.current.currentTime = 0.1; }}
      style={style} />
  );
}

/* ── Project card ── */
function VideoCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const thumbSrc    = project.safe_project_json?.meta?.thumbnail ?? null;
  const thumbIsVid  = !!thumbSrc && /\.(mp4|webm|mov)(\?|$)/i.test(thumbSrc);
  const previewText = project.safe_project_json?.meta?.script?.voiceoverScript
    ?? project.safe_project_json?.meta?.script?.scenes?.[0]?.voiceover
    ?? null;
  const palette     = project.safe_project_json?.meta?.script?.palette;
  const bgColor     = palette?.background ?? "#0f0820";
  const accentColor = palette?.accent     ?? "#7c5cfc";

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const editorHref = `/video-editor/${project.id}`;
  const navClick = e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(editorHref, { state: { from: "/typography-video" } }); } };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background: T.surface, borderRadius: 14, overflow: "hidden",
        border: `1px solid ${hovering ? "rgba(124,92,252,0.25)" : T.border}`,
        transition: "all 0.2s", transform: hovering ? "translateY(-2px)" : "none",
        boxShadow: hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <a href={editorHref} onClick={navClick} style={{ display: "block", textDecoration: "none" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden", background: bgColor }}>
          {thumbIsVid ? (
            <VideoThumb src={thumbSrc} playing={hovering} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : thumbSrc ? (
            <img src={thumbSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 12px",
              background: `linear-gradient(135deg, ${bgColor} 0%, #1a0a2e 60%, #2d1060 100%)`,
            }}>
              {previewText ? (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)",
                  textAlign: "center", lineHeight: 1.5, padding: "0 4px",
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 10, WebkitBoxOrient: "vertical",
                }}>
                  {previewText}
                </div>
              ) : (
                <span style={{ fontSize: 28, opacity: 0.3 }}>✍️</span>
              )}
            </div>
          )}

          {thumbIsVid && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: hovering ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.22)", transition: "background 0.3s",
              pointerEvents: "none",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: "rgba(124,92,252,0.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "#fff", paddingLeft: 2,
                opacity: hovering ? 0 : 1, transition: "opacity 0.25s",
              }}>▶</div>
            </div>
          )}

          <button onClick={handleDelete} title={confirming ? "Click again to confirm" : "Delete"}
            style={{
              position: "absolute", top: 8, left: 8,
              width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer",
              background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.55)",
              color: confirming ? "#fff" : "#999", fontSize: 13, fontWeight: 700,
              opacity: hovering ? 1 : 0, transition: "opacity 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}>
            {confirming ? "!" : "✕"}
          </button>
        </div>
      </a>

      <a href={editorHref} onClick={navClick} style={{ display: "block", textDecoration: "none", color: "inherit", padding: "11px 13px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
          {project.name}
        </div>
        <div style={{ fontSize: 11, color: "#77777f" }}>{timeLabel(project.updated_at)}</div>
      </a>
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
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {projects.map(p => <VideoCard key={p.id} project={p} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}

/* ── Generator form tab ── */
function GeneratorForm() {
  const navigate = useNavigate();
  const [inputType,      setInputType]      = useState("topic");
  const [input,          setInput]          = useState("What happens if you stop blinking");
  const [targetDuration, setTargetDuration] = useState(40);
  const [language,       setLanguage]       = useState("en");
  const [voiceId,        setVoiceId]        = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error,     setError]     = useState(null);

  async function handleGenerate() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setStatusIdx(0);

    try {
      const result = await generateTypographyVideo(
        { input: input.trim(), inputType, targetDuration, voiceId, language },
        ({ step }) => setStatusIdx(step),
      );
      invalidateProjectCaches("typography_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/typography-video" } });
    } catch (err) {
      setError(err.message || "Generation failed. Please try again.");
      setLoading(false);
    }
  }

  const canGenerate = !!input.trim() && !loading;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 24px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✍️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Turn any idea into a text video
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Give a topic or paste your own script and get a polished, animated text video ready to post.
          </p>
        </div>

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

        {/* Duration */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Length
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATION_OPTIONS.map(opt => {
              const sel = targetDuration === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => !loading && setTargetDuration(opt.value)}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "12px 8px", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    background: sel ? "rgba(124,92,252,0.1)" : "rgba(255,255,255,0.04)",
                    border: sel ? `1.5px solid rgba(124,92,252,0.45)` : `1.5px solid ${T.border}`,
                    opacity: loading ? 0.6 : 1, transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: sel ? T.accent : T.text }}>{opt.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: sel ? "rgba(167,139,250,0.9)" : T.muted }}>{opt.description}</span>
                  <span style={{ fontSize: 10, color: "#55556a" }}>{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language + Voice */}
        <div style={{ marginBottom: 28 }}>
          <LanguageVoicePicker
            language={language}
            onLanguageChange={setLanguage}
            voiceId={voiceId}
            onVoiceChange={setVoiceId}
            disabled={loading}
            accentColor={T.accent}
            border={T.border}
          />
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
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: T.text }}>
              Generating your video…
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {STATUS_STEPS.slice(0, -1).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusIdx ? T.accent : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
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
