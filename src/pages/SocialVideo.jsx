import { useState, useEffect, useRef } from "react";
import { useNavigate }        from "react-router-dom";
import { generateSocialVideo }   from "../services/ai/socialVideo/generateSocialVideo";
import { getSocialVideoProjects, deleteProject, invalidateProjectCaches } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker";
import { creditsForDuration } from "../core/utils/creditCosts";

const T = {
  bg:      "#090b11",
  surface: "#0e1018",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#7c5cfc",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  success: "#22c55e",
  danger:  "#f87171",
};

// Stylish, non-revealing — must match the Social pipeline's emitted step() strings.
const STATUS_STEPS = [
  "Tuning in…",
  "Shaping the story…",
  "Adding the spark…",
  "Setting the mood…",
  "Bringing it to life…",
  "Putting it together…",
  "Almost ready…",
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
  if (/twitter\.com|x\.com/i.test(url))   return "Twitter / X";
  if (/instagram\.com/i.test(url))         return "Instagram";
  if (/linkedin\.com/i.test(url))          return "LinkedIn";
  return "Social URL";
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
  const previewText = project.safe_project_json?.meta?.script?.voiceoverScript
    ?? project.safe_project_json?.layers?.[0]?.text
    ?? null;

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const editorHref = `/video-editor/${project.id}`;
  const navClick = e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(editorHref, { state: { from: "/social-video" } }); } };

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
        <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden", background: "#060a14" }}>
          {thumbIsVid ? (
            <VideoThumb src={thumbSrc} playing={hovering} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : thumbSrc ? (
            <img src={thumbSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 12px",
              background: "linear-gradient(135deg, #060a14 0%, #0d1a28 60%, #0a1420 100%)",
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
                <span style={{ fontSize: 32, opacity: 0.3 }}>📱</span>
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

          {meta.platform && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5,
              background: "rgba(124,92,252,0.85)", color: "#fff", backdropFilter: "blur(4px)",
            }}>{meta.platform}</div>
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
        {meta.author && (
          <div style={{ fontSize: 11, color: T.accent, marginBottom: 2 }}>{meta.author}</div>
        )}
        <div style={{ fontSize: 11, color: "#55667a" }}>{timeLabel(project.updated_at)}</div>
      </a>
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
        <div style={{ fontSize: 14, color: T.muted }}>Switch to Create New and paste a social media post URL</div>
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

function GeneratorForm() {
  const navigate = useNavigate();
  const [url,           setUrl]           = useState("");
  const [includeAuthor, setIncludeAuthor] = useState(false);
  const [language,      setLanguage]      = useState("en");
  const [voiceId,       setVoiceId]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [statusStep,    setStatusStep]    = useState(0);
  const [error,         setError]         = useState(null);

  const platformLabel = detectPlatformLabel(url.trim());
  const canGenerate   = !!url.trim() && !loading;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setStatusStep(0);

    try {
      const result = await generateSocialVideo(
        { url: url.trim(), includeAuthor, voiceId, language },
        ({ step }) => {
          const idx = STATUS_STEPS.indexOf(step);
          if (idx !== -1) setStatusStep(idx);
        },
      );
      invalidateProjectCaches("social_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/social-video" } });
    } catch (err) {
      if (err.code === "NO_CREDITS") {
        setError(`Not enough credits. You need ${creditsForDuration(15)} credits to generate a social video.`);
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
          <div style={{ fontSize: 40, marginBottom: 10 }}>📱</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Turn any post into a video
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Paste a Twitter/X, Instagram, or LinkedIn URL and get a ready-to-post short video in minutes.
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
              placeholder="https://twitter.com/… or instagram.com/… or linkedin.com/…"
              disabled={loading}
              style={{
                width: "100%", padding: "12px 14px", paddingRight: platformLabel ? 120 : 14,
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: `1px solid ${url.trim() ? "rgba(124,92,252,0.35)" : T.border}`,
                borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
                outline: "none", opacity: loading ? 0.5 : 1, transition: "border-color 0.2s",
              }}
            />
            {platformLabel && !loading && (
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                background: "rgba(124,92,252,0.15)", color: "#a78bfa",
                border: "1px solid rgba(124,92,252,0.3)",
                pointerEvents: "none",
              }}>{platformLabel}</span>
            )}
          </div>
        </div>

        {/* Language + Voice */}
        <div style={{ marginBottom: 24 }}>
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

        {/* Author toggle */}
        <div
          onClick={() => !loading && setIncludeAuthor(v => !v)}
          style={{
            marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12,
            padding: "14px 16px", borderRadius: 10,
            background: includeAuthor ? "rgba(124,92,252,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${includeAuthor ? "rgba(124,92,252,0.3)" : T.border}`,
            cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
            background: includeAuthor ? T.accent : "transparent",
            border: `2px solid ${includeAuthor ? T.accent : "#445566"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            {includeAuthor && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: includeAuthor ? T.text : T.muted, lineHeight: 1.3 }}>
              Include author credit
            </div>
            <div style={{ fontSize: 12, color: "#45556a", marginTop: 3, lineHeight: 1.4 }}>
              Shows the author's handle on the final scene as a small attribution
            </div>
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
            background: canGenerate ? T.accent : "rgba(124,92,252,0.25)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {loading ? "Generating…" : "Generate Social Video"}
        </button>


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
                  background: tab === t.id ? "rgba(124,92,252,0.12)" : "transparent",
                  color:      tab === t.id ? "#a78bfa"               : "#55667a",
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
