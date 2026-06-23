import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generatePromptVideo, planPromptVideo } from "../services/ai/promptVideo/generatePromptVideo";
import { getPromptVideoProjects, deleteProject, invalidateProjectCaches } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker";
import { creditsForDuration } from "../core/utils/creditCosts";

const T = {
  bg:      "#090b11",
  surface: "#0e1018",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#f59e0b",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  success: "#22c55e",
  danger:  "#f87171",
};

// Must match PROMPT_STATUS_STEPS in the server pipeline
// Stylish, non-revealing labels — must match the server's PROMPT_STATUS_STEPS.
const STATUS_STEPS = [
  "Warming up the studio…",
  "Shaping your vision…",
  "Finding the angle…",
  "Bringing it to life…",
  "Adding the spark…",
  "Polishing every frame…",
  "Composing the final cut…",
  "Almost ready…",
];

const STYLES = [
  { id: "auto",            label: "Auto",            desc: "Director picks from your topic", colors: ["#8896a8", "#38bdf8"] },
  { id: "editorial_retro", label: "Editorial Retro", desc: "Vintage print, bold two-tone",   colors: ["#c2410c", "#1e3a8a"] },
  { id: "minimal",         label: "Minimal",         desc: "Quiet, spacious, restrained",    colors: ["#f8fafc", "#0f172a"] },
  { id: "bold_pop",        label: "Bold Pop",        desc: "Loud blocks, huge type",         colors: ["#ec4899", "#facc15"] },
  { id: "dark_cinematic",  label: "Dark Cinematic",  desc: "Moody, filmic, atmospheric",     colors: ["#0a0a0a", "#f59e0b"] },
  { id: "corporate_clean", label: "Corporate",       desc: "Polished, structured, trusted",  colors: ["#1e40af", "#f8fafc"] },
  { id: "meme_chaos",      label: "Meme Energy",     desc: "Internet-native chaos",          colors: ["#ef4444", "#fde047"] },
];

const DURATIONS = [
  { id: 30, label: "30s" },
  { id: 45, label: "45s" },
  { id: 60, label: "60s" },
];

const EXAMPLE_PROMPTS = [
  "Who's the better late night host: Stephen Colbert or Jimmy Kimmel? Make it fun, under 45 seconds.",
  "Explain why the Roman Empire fell, in a dramatic way.",
  "Top 3 most underrated sci-fi movies of the 2010s.",
  "iPhone vs Android in 2026 — settle it.",
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
  const firstImage = meta.beats?.find(b => b.asset?.kind === "image" || b.asset?.kind === "cutout")?.asset?.src ?? null;
  const previewText = project.safe_project_json?.full_script ?? null;

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const editorHref = `/video-editor/${project.id}`;
  const navClick = e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(editorHref, { state: { from: "/ai-video" } }); } };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background: T.surface, borderRadius: 14, overflow: "hidden",
        border: `1px solid ${hovering ? "rgba(245,158,11,0.3)" : T.border}`,
        transition: "all 0.2s", transform: hovering ? "translateY(-2px)" : "none",
        boxShadow: hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <a href={editorHref} onClick={navClick} style={{ display: "block", textDecoration: "none" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden", background: "#060a14" }}>
          {thumbIsVid ? (
            <VideoThumb src={thumbSrc} playing={hovering} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : thumbSrc || firstImage ? (
            <img src={thumbSrc || firstImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 12px",
              background: "linear-gradient(135deg, #060a14 0%, #1c1408 60%, #120d05 100%)",
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
                <span style={{ fontSize: 32, opacity: 0.3 }}>✨</span>
              )}
            </div>
          )}

          {meta.style_id && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5,
              background: "rgba(245,158,11,0.88)", color: "#1c1408", backdropFilter: "blur(4px)",
            }}>{meta.style_id.replace("_", " ")}</div>
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
    getPromptVideoProjects()
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
        <div style={{ width: 24, height: 24, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>✨</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No prompt videos yet</div>
        <div style={{ fontSize: 14, color: T.muted }}>Switch to Create New and describe any video you can imagine</div>
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

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {children}
    </div>
  );
}

function GeneratorForm() {
  const navigate = useNavigate();
  const [prompt,     setPrompt]     = useState("");
  const [styleId,    setStyleId]    = useState("auto");
  const [duration,   setDuration]   = useState(30);
  const [language,   setLanguage]   = useState("en");
  const [voiceId,    setVoiceId]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [planning,   setPlanning]   = useState(false);
  const [planData,   setPlanData]   = useState(null); // { plan, summary }
  const [revision,   setRevision]   = useState("");
  const [statusStep, setStatusStep] = useState(0);
  const [error,      setError]      = useState(null);

  const canGenerate = !!prompt.trim() && !loading && !planning;

  async function handlePlan(reviseText = "") {
    if (!prompt.trim() || planning || loading) return;
    setPlanning(true);
    setError(null);
    try {
      const result = await planPromptVideo({
        prompt: prompt.trim(), styleId, targetDuration: duration, language, revision: reviseText,
      });
      setPlanData(result);
      setRevision("");
    } catch (err) {
      setError(err.message || "Planning failed. Please try again.");
    } finally {
      setPlanning(false);
    }
  }

  async function handleProduce() {
    if (!planData || loading) return;
    setLoading(true);
    setError(null);
    setStatusStep(2); // research + direction already done in the plan

    try {
      const result = await generatePromptVideo(
        { prompt: prompt.trim(), styleId, targetDuration: duration, language, voiceId, plan: planData.plan },
        ({ step }) => {
          const idx = STATUS_STEPS.indexOf(step);
          if (idx !== -1) setStatusStep(idx);
        },
      );
      invalidateProjectCaches("ai_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/ai-video" } });
    } catch (err) {
      if (err.code === "NO_CREDITS") {
        setError(`Not enough credits. You need ${creditsForDuration(duration)} credits to produce this video.`);
      } else {
        setError(err.message || "Generation failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Describe it. Watch it.
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Any topic, any take — researched, scripted, narrated, and designed beat by beat with a locked visual style.
          </p>
        </div>

        {/* Prompt */}
        <div style={{ marginBottom: 22 }}>
          <FieldLabel>Your prompt</FieldLabel>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={EXAMPLE_PROMPTS[0]}
            disabled={loading}
            rows={4}
            style={{
              width: "100%", padding: "13px 15px", boxSizing: "border-box", resize: "vertical",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${prompt.trim() ? "rgba(245,158,11,0.4)" : T.border}`,
              borderRadius: 12, color: T.text, fontSize: 14, fontFamily: "inherit", lineHeight: 1.5,
              outline: "none", opacity: loading ? 0.5 : 1, transition: "border-color 0.2s",
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {EXAMPLE_PROMPTS.slice(1).map((p, i) => (
              <button key={i} onClick={() => !loading && setPrompt(p)}
                style={{
                  fontSize: 11, color: T.muted, background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${T.border}`, borderRadius: 100, padding: "5px 11px",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                {p.length > 48 ? p.slice(0, 48) + "…" : p}
              </button>
            ))}
          </div>
        </div>

        {/* Style picker */}
        <div style={{ marginBottom: 22 }}>
          <FieldLabel>Visual style</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
            {STYLES.map(s => {
              const active = styleId === s.id;
              return (
                <button key={s.id} onClick={() => !loading && setStyleId(s.id)}
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    background: active ? "rgba(245,158,11,0.10)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(245,158,11,0.45)" : T.border}`,
                    fontFamily: "inherit", transition: "all 0.15s", opacity: loading ? 0.5 : 1,
                  }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 7 }}>
                    {s.colors.map((c, i) => (
                      <div key={i} style={{ width: 16, height: 16, borderRadius: 5, background: c, border: "1px solid rgba(255,255,255,0.15)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#fbbf24" : T.text }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "#55667a", marginTop: 2, lineHeight: 1.3 }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: 22 }}>
          <FieldLabel>Duration</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATIONS.map(d => {
              const active = duration === d.id;
              return (
                <button key={d.id} onClick={() => !loading && setDuration(d.id)}
                  style={{
                    padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: active ? 700 : 500,
                    background: active ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.03)",
                    color: active ? "#fbbf24" : T.muted,
                    border: `1px solid ${active ? "rgba(245,158,11,0.45)" : T.border}`,
                    cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1,
                  }}>{d.label}</button>
              );
            })}
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

        {/* Plan preview — review the script before spending credits */}
        {planData && !loading && (
          <div style={{ marginBottom: 24, padding: "20px 22px", background: T.surface, border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{planData.summary.projectName}</div>
              <button onClick={() => setPlanData(null)} style={{ background: "none", border: "none", color: "#55667a", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[`~${planData.summary.estSeconds}s`, `${planData.summary.beatCount} beats`, `${planData.summary.shotCount} shots`, planData.summary.styleId.replace("_", " "), planData.summary.musicMood].map((chip, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>{chip}</span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, marginBottom: 12, maxHeight: 150, overflowY: "auto" }}>
              {planData.summary.script}
            </div>
            {planData.summary.references?.length > 0 && (
              <div style={{ fontSize: 11, color: "#55667a", marginBottom: 14 }}>
                Covers: {planData.summary.references.join(" · ")}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && revision.trim() && handlePlan(revision)}
                placeholder='Want changes? e.g. "make it funnier", "focus on the passengers"'
                disabled={planning}
                style={{
                  flex: 1, padding: "10px 12px", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                  borderRadius: 8, color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={() => revision.trim() && handlePlan(revision)} disabled={planning || !revision.trim()}
                style={{
                  padding: "10px 16px", borderRadius: 8, border: `1px solid ${T.border}`,
                  background: "rgba(255,255,255,0.05)", color: T.text, fontSize: 12, fontWeight: 700,
                  cursor: planning ? "wait" : "pointer", fontFamily: "inherit",
                }}>
                {planning ? "Revising…" : "Revise"}
              </button>
            </div>
            <button onClick={handleProduce}
              style={{
                width: "100%", padding: "13px 24px", background: T.accent, color: "#1c1408",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}>
              Looks good — Produce Video ({creditsForDuration(duration)} credits)
            </button>
          </div>
        )}

        {/* Phase 1: free plan */}
        {!planData && (
          <button
            onClick={() => handlePlan()}
            disabled={!canGenerate}
            style={{
              width: "100%", padding: "14px 24px",
              background: canGenerate ? T.accent : "rgba(245,158,11,0.25)",
              color: "#1c1408", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 800,
              cursor: canGenerate ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "background 0.2s",
            }}
          >
            {planning ? "Planning your video…" : "Create Video Plan (free)"}
          </button>
        )}

      </div>
    </div>
  );
}

export default function PromptVideo() {
  const [tab, setTab] = useState("create");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#090b11", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Prompt to Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(245,158,11,0.12)" : "transparent",
                  color:      tab === t.id ? "#fbbf24"               : "#55667a",
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
