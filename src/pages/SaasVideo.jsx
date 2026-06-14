import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateSaasVideo } from "../services/ai/saasVideo/generateSaasVideo";
import { getSaasVideoProjects, deleteProject, invalidateProjectCaches } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker";

const T = {
  bg:      "#090b11",
  surface: "#0e1018",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#38bdf8",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  success: "#22c55e",
  danger:  "#f87171",
};

// Must match SAAS_STATUS_STEPS in the server pipeline
const STATUS_STEPS = [
  "Reading your website…",
  "Directing your video…",
  "Writing the script…",
  "Recording the voiceover…",
  "Sourcing footage…",
  "Designing your scenes…",
  "Quality-checking every frame…",
  "Composing the timeline…",
  "Almost ready…",
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual",       label: "Casual" },
  { id: "energetic",    label: "Energetic" },
  { id: "minimal",      label: "Minimal" },
];

const SCENE_COUNTS = [
  { id: "auto", label: "Auto" },
  { id: "3",    label: "3 scenes" },
  { id: "4",    label: "4 scenes" },
  { id: "5",    label: "5 scenes" },
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

function VideoCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const meta       = project.safe_project_json?.raw_ai_json ?? {};
  const thumbSrc   = project.safe_project_json?.meta?.thumbnail ?? null;
  const thumbIsVid = !!thumbSrc && /\.(mp4|webm|mov)(\?|$)/i.test(thumbSrc);
  const screenshot = meta.harvest?.screenshotUrls?.[0] ?? null;
  const previewText = project.safe_project_json?.full_script
    ?? project.safe_project_json?.layers?.find(l => l.type === "text")?.content
    ?? null;

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const editorHref = `/video-editor/${project.id}`;
  const navClick = e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(editorHref, { state: { from: "/saas-video" } }); } };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background: T.surface, borderRadius: 14, overflow: "hidden",
        border: `1px solid ${hovering ? "rgba(56,189,248,0.25)" : T.border}`,
        transition: "all 0.2s", transform: hovering ? "translateY(-2px)" : "none",
        boxShadow: hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <a href={editorHref} onClick={navClick} style={{ display: "block", textDecoration: "none" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden", background: "#060a14" }}>
          {thumbIsVid ? (
            <VideoThumb src={thumbSrc} playing={hovering} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : thumbSrc || screenshot ? (
            <img src={thumbSrc || screenshot} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 12px",
              background: "linear-gradient(135deg, #060a14 0%, #0a1a28 60%, #081420 100%)",
            }}>
              {previewText ? (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)",
                  textAlign: "center", lineHeight: 1.45, padding: "0 4px",
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 8, WebkitBoxOrient: "vertical",
                }}>
                  {previewText}
                </div>
              ) : (
                <span style={{ fontSize: 32, opacity: 0.3 }}>🚀</span>
              )}
            </div>
          )}

          {meta.pipeline === "saas_video_v3" && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5,
              background: "rgba(56,189,248,0.85)", color: "#06222e", backdropFilter: "blur(4px)",
            }}>v3</div>
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
        <div style={{ fontSize: 11, color: "#55667a" }}>{timeLabel(project.updated_at)}</div>
      </a>
    </div>
  );
}

function VideoListing() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getSaasVideoProjects()
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
        <div style={{ width: 24, height: 24, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "sv2-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🚀</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No SaaS videos yet</div>
        <div style={{ fontSize: 14, color: T.muted }}>Switch to Create New and paste your product's URL</div>
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

function PillRow({ options, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => !disabled && onChange(opt.id)}
            style={{
              padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: active ? 700 : 500,
              background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.03)",
              color:      active ? "#7dd3fc" : T.muted,
              border: `1px solid ${active ? "rgba(56,189,248,0.4)" : T.border}`,
              cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
              fontFamily: "inherit", opacity: disabled ? 0.5 : 1,
            }}
          >{opt.label}</button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {children}
    </div>
  );
}

function GeneratorForm() {
  const navigate = useNavigate();
  const [url,             setUrl]             = useState("");
  const [showDetails,     setShowDetails]     = useState(false);
  const [productName,     setProductName]     = useState("");
  const [description,     setDescription]     = useState("");
  const [tone,            setTone]            = useState("professional");
  const [sceneCount,      setSceneCount]      = useState("auto");
  const [includeCaptions, setIncludeCaptions] = useState(false);
  const [language,        setLanguage]        = useState("en");
  const [voiceId,         setVoiceId]         = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [statusStep,      setStatusStep]      = useState(0);
  const [error,           setError]           = useState(null);

  const canGenerate = (!!url.trim() || !!description.trim()) && !loading;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setStatusStep(0);

    try {
      const result = await generateSaasVideo(
        {
          url: url.trim() || null,
          productName: productName.trim(),
          description: description.trim(),
          tone, sceneCount, language, voiceId, includeCaptions,
        },
        ({ step }) => {
          const idx = STATUS_STEPS.indexOf(step);
          if (idx !== -1) setStatusStep(idx);
        },
      );
      invalidateProjectCaches("saas_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/saas-video" } });
    } catch (err) {
      if (err.code === "NO_CREDITS") {
        setError("Not enough credits for a SaaS video generation.");
      } else {
        setError(err.message || "Generation failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 650, margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🚀</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Paste your URL. Get a promo video.
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            We read your site, screenshot your product, source real footage, write the script, and design every scene — voiceover, music, motion, and transitions included.
          </p>
        </div>

        {/* URL input */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel>Product URL</FieldLabel>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="https://yourproduct.com"
            disabled={loading}
            style={{
              width: "100%", padding: "12px 14px", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${url.trim() ? "rgba(56,189,248,0.35)" : T.border}`,
              borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
              outline: "none", opacity: loading ? 0.5 : 1, transition: "border-color 0.2s",
            }}
          />
        </div>

        {/* Scene count */}
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Scenes</FieldLabel>
          <PillRow options={SCENE_COUNTS} value={sceneCount} onChange={setSceneCount} disabled={loading} />
        </div>

        {/* Tone */}
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Tone</FieldLabel>
          <PillRow options={TONES} value={tone} onChange={setTone} disabled={loading} />
        </div>

        {/* Language + Voice */}
        <div style={{ marginBottom: 20 }}>
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

        {/* Captions toggle */}
        <div
          onClick={() => !loading && setIncludeCaptions(v => !v)}
          style={{
            marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12,
            padding: "14px 16px", borderRadius: 10,
            background: includeCaptions ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${includeCaptions ? "rgba(56,189,248,0.3)" : T.border}`,
            cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
            background: includeCaptions ? T.accent : "transparent",
            border: `2px solid ${includeCaptions ? T.accent : "#445566"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            {includeCaptions && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#06222e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: includeCaptions ? T.text : T.muted, lineHeight: 1.3 }}>
              Burned-in captions
            </div>
            <div style={{ fontSize: 12, color: "#45556a", marginTop: 3, lineHeight: 1.4 }}>
              Off by default — the designed scenes carry the script. Turn on for caption-style delivery.
            </div>
          </div>
        </div>

        {/* Optional details */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowDetails(v => !v)}
            disabled={loading}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: T.muted, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 10 }}>{showDetails ? "▼" : "▶"}</span>
            Details (optional — we read most of this from your site)
          </button>
          {showDetails && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <FieldLabel>Product name</FieldLabel>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Override the detected name"
                  disabled={loading}
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                    borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your product do, and for whom? (required only if you don't provide a URL)"
                  disabled={loading}
                  rows={3}
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box", resize: "vertical",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                    borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>
            </div>
          )}
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
            background: canGenerate ? T.accent : "rgba(56,189,248,0.25)",
            color: "#06222e", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {loading ? "Generating…" : "Generate SaaS Video"}
        </button>

      </div>
    </div>
  );
}

export default function SaasVideo() {
  const [tab, setTab] = useState("create");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes sv2-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#090b11", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            SaaS Video 2.0
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(56,189,248,0.12)" : "transparent",
                  color:      tab === t.id ? "#7dd3fc"               : "#55667a",
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
