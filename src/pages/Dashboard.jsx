import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreditsStore } from "../store/useCreditsStore";
import { useProjectsStore } from "../store/useProjectsStore";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/profileService";
import { serverFetch } from "../services/serverApi";
import { invalidateProjectCaches } from "../services/projects/projectService";
import { generateAiVideo, planAiVideo } from "../services/ai/aiVideo/generateAiVideo";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker";
import AppLayout from "../ui/AppLayout";
import Onboarding from "./Onboarding";
import FeedbackModal from "../ui/components/FeedbackModal";

/**
 * Dashboard — prompt-first creation hub.
 * A hero chatbox that morphs per selected video service (AI Video wired as the
 * first template; other services route to their existing Create pages until
 * converted), service pills, and a grid (user projects for now; curated demos later).
 * AppLayout (left nav) and all service pages/APIs are untouched.
 */

const T = {
  bg:      "#090b11",
  surface: "#0e1018",
  surface2:"#14141e",
  border:  "rgba(255,255,255,0.08)",
  text:    "#e8eaf0",
  muted:   "#8896a8",
  faint:   "#55667a",
  danger:  "#f87171",
  success: "#22c55e",
};

// Video services as pills. kind:"chat" → morphs the chatbox here; kind:"nav" →
// routes to the existing Create page (converted later, you'll guide each).
const SERVICES = [
  { id: "ai-video",        label: "AI Video",         emoji: "✨", accent: "#f59e0b", kind: "chat", to: "/ai-video" },
  { id: "promo-video",     label: "Promo Video",      emoji: "🎬", accent: "#f5c518", kind: "nav",  to: "/promo-video" },
  { id: "product-video",   label: "Product Video",    emoji: "🛍️", accent: "#f97316", kind: "nav",  to: "/product-video" },
  { id: "social-video",    label: "Social to Video",  emoji: "💬", accent: "#22d3ee", kind: "nav",  to: "/social-video" },
  { id: "typography-video",label: "Typography Video", emoji: "🔤", accent: "#7c5cfc", kind: "nav",  to: "/typography-video" },
  { id: "video-captions",  label: "Add Captions",     emoji: "🎯", accent: "#34d399", kind: "nav",  to: "/video-captions" },
];

const AI = SERVICES[0].accent; // amber, the AI Video accent

const STYLES = [
  { id: "auto",            label: "Auto",            desc: "Director picks from your topic", colors: ["#8896a8", "#38bdf8"] },
  { id: "editorial_retro", label: "Editorial Retro", desc: "Vintage print, bold two-tone",   colors: ["#c2410c", "#1e3a8a"] },
  { id: "minimal",         label: "Minimal",         desc: "Quiet, spacious, restrained",    colors: ["#f8fafc", "#0f172a"] },
  { id: "bold_pop",        label: "Bold Pop",        desc: "Loud blocks, huge type",         colors: ["#ec4899", "#facc15"] },
  { id: "dark_cinematic",  label: "Dark Cinematic",  desc: "Moody, filmic, atmospheric",     colors: ["#0a0a0a", "#f59e0b"] },
  { id: "corporate_clean", label: "Corporate",       desc: "Polished, structured, trusted",  colors: ["#1e40af", "#f8fafc"] },
  { id: "meme_chaos",      label: "Meme Energy",     desc: "Internet-native chaos",          colors: ["#ef4444", "#fde047"] },
];

const DURATIONS = [{ id: 30, label: "30s" }, { id: 45, label: "45s" }, { id: 60, label: "60s" }];

const STATUS_STEPS = [
  "Researching your topic…", "Directing the film…", "Recording the voiceover…",
  "Creating your visuals…", "Designing every beat…", "Quality-checking every frame…",
  "Composing the timeline…", "Almost ready…",
];

const EXAMPLE_PROMPTS = [
  "Explain why the Roman Empire fell, in a dramatic way.",
  "Top 3 most underrated sci-fi movies of the 2010s.",
  "iPhone vs Android in 2026 — settle it.",
];

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString();
}

/* ── Modal shell ── */
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "100%", maxHeight: "86vh", overflowY: "auto", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px 24px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Chip (compact field that opens a modal) ── */
function Chip({ icon, label, value, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 12,
        background: hov ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        transition: "background 0.15s",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{label}</span>
        <span style={{ fontSize: 10, color: T.faint }}>{value}</span>
      </span>
    </button>
  );
}

/* ── AI Video chatbox (the morphing create surface) ── */
function AiVideoChatbox() {
  const navigate = useNavigate();
  const [prompt,   setPrompt]   = useState("");
  const [styleId,  setStyleId]  = useState("auto");
  const [duration, setDuration] = useState(30);
  const [language, setLanguage] = useState("en");
  const [voiceId,  setVoiceId]  = useState(null);

  const [styleOpen, setStyleOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const [planning,   setPlanning]   = useState(false);
  const [planData,   setPlanData]   = useState(null);
  const [revision,   setRevision]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [error,      setError]      = useState(null);

  const canPlan = !!prompt.trim() && !planning && !loading;
  const styleLabel = STYLES.find(s => s.id === styleId)?.label ?? "Auto";

  async function handlePlan(reviseText = "") {
    if (!prompt.trim() || planning || loading) return;
    setPlanning(true); setError(null);
    try {
      const result = await planAiVideo({ prompt: prompt.trim(), styleId, targetDuration: duration, language, revision: reviseText });
      setPlanData(result); setRevision("");
    } catch (err) {
      setError(err.message || "Planning failed. Please try again.");
    } finally {
      setPlanning(false);
    }
  }

  async function handleProduce() {
    if (!planData || loading) return;
    setLoading(true); setError(null); setStatusStep(2);
    try {
      const result = await generateAiVideo(
        { prompt: prompt.trim(), styleId, targetDuration: duration, language, voiceId, plan: planData.plan },
        ({ step }) => { const i = STATUS_STEPS.indexOf(step); if (i !== -1) setStatusStep(i); },
      );
      invalidateProjectCaches("ai_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits — you need 75 to produce this video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      {/* The box */}
      <div style={{ background: T.surface, border: `1px solid ${prompt.trim() ? "rgba(245,158,11,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your video idea — any topic, any take…"
          disabled={loading}
          rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePlan(); }}
          style={{
            width: "100%", boxSizing: "border-box", resize: "none", border: "none", outline: "none",
            background: "transparent", color: T.text, fontSize: 16, fontFamily: "inherit", lineHeight: 1.5,
            minHeight: 52,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
          {/* Left: chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip icon="🎨" label="Style" value={styleLabel} onClick={() => !loading && setStyleOpen(true)} />
            <Chip icon="🎙️" label="Voice" value={voiceId ? "Custom" : "Default"} onClick={() => !loading && setVoiceOpen(true)} />
          </div>
          {/* Right: duration + send */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 100, padding: 3 }}>
              {DURATIONS.map(d => {
                const active = duration === d.id;
                return (
                  <button key={d.id} onClick={() => !loading && setDuration(d.id)}
                    style={{
                      padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: active ? 700 : 500,
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: active ? "rgba(245,158,11,0.16)" : "transparent",
                      color: active ? "#fbbf24" : T.muted,
                    }}>{d.label}</button>
                );
              })}
            </div>
            <button
              onClick={() => handlePlan()}
              disabled={!canPlan}
              title="Create a free plan"
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "none",
                cursor: canPlan ? "pointer" : "not-allowed", fontSize: 18, fontWeight: 800,
                background: canPlan ? AI : "rgba(245,158,11,0.25)", color: "#1c1408",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>↑</button>
          </div>
        </div>
      </div>

      {/* Example prompts */}
      {!planData && !loading && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, justifyContent: "center" }}>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => setPrompt(p)}
              style={{ fontSize: 11, color: T.muted, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 100, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>
              {p.length > 44 ? p.slice(0, 44) + "…" : p}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {/* Planning hint */}
      {planning && (
        <div style={{ marginTop: 14, fontSize: 13, color: T.muted, textAlign: "center" }}>Planning your video…</div>
      )}

      {/* Plan preview */}
      {planData && !loading && (
        <div style={{ marginTop: 16, padding: "20px 22px", background: T.surface, border: "1px solid rgba(245,158,11,0.3)", borderRadius: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{planData.summary.projectName}</div>
            <button onClick={() => setPlanData(null)} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {[`~${planData.summary.estSeconds}s`, `${planData.summary.beatCount} beats`, `${planData.summary.shotCount} shots`, planData.summary.styleId?.replace("_", " "), planData.summary.musicMood].filter(Boolean).map((chip, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>{chip}</span>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, marginBottom: 12, maxHeight: 150, overflowY: "auto" }}>
            {planData.summary.script}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && revision.trim() && handlePlan(revision)}
              placeholder='Want changes? e.g. "make it funnier"'
              disabled={planning}
              style={{ flex: 1, padding: "10px 12px", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={() => revision.trim() && handlePlan(revision)} disabled={planning || !revision.trim()}
              style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", color: T.text, fontSize: 12, fontWeight: 700, cursor: planning ? "wait" : "pointer", fontFamily: "inherit" }}>
              {planning ? "Revising…" : "Revise"}
            </button>
          </div>
          <button onClick={handleProduce}
            style={{ width: "100%", padding: "13px 24px", background: AI, color: "#1c1408", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            Looks good — Produce Video (75 credits)
          </button>
        </div>
      )}

      {/* Producing progress */}
      {loading && (
        <div style={{ marginTop: 16, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{STATUS_STEPS[statusStep]}</div>
          <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
            {STATUS_STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusStep ? AI : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {styleOpen && (
        <Modal title="Visual style" onClose={() => setStyleOpen(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {STYLES.map(s => {
              const active = styleId === s.id;
              return (
                <button key={s.id} onClick={() => { setStyleId(s.id); setStyleOpen(false); }}
                  style={{ textAlign: "left", padding: "11px 13px", borderRadius: 10, cursor: "pointer", background: active ? "rgba(245,158,11,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(245,158,11,0.45)" : T.border}`, fontFamily: "inherit" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 7 }}>
                    {s.colors.map((c, i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 5, background: c, border: "1px solid rgba(255,255,255,0.15)" }} />)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#fbbf24" : T.text }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: T.faint, marginTop: 2, lineHeight: 1.3 }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {voiceOpen && (
        <Modal title="Language & voice" onClose={() => setVoiceOpen(false)}>
          <LanguageVoicePicker
            language={language}
            onLanguageChange={setLanguage}
            voiceId={voiceId}
            onVoiceChange={setVoiceId}
            disabled={false}
            accentColor={AI}
            border={T.border}
          />
          <button onClick={() => setVoiceOpen(false)}
            style={{ marginTop: 18, width: "100%", padding: "11px", borderRadius: 10, border: "none", background: AI, color: "#1c1408", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            Done
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ── Project card (grid) ── */
function ProjectCard({ project }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const thumb = project.safe_project_json?.meta?.thumbnail
    || (project.safe_project_json?.layers || []).find(l => l.type === "image" && l.src)?.src
    || null;
  const isVid = !!thumb && /\.(mp4|webm|mov)(\?|$)/i.test(thumb);
  const href = `/video-editor/${project.id}`;

  return (
    <a
      href={href}
      onClick={(e) => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(href, { state: { from: "/dashboard" } }); } }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "block", textDecoration: "none", borderRadius: 14, overflow: "hidden", border: `1px solid ${hov ? "rgba(124,92,252,0.35)" : T.border}`, background: T.surface, transition: "all 0.2s", transform: hov ? "translateY(-2px)" : "none" }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", background: "#060a14", overflow: "hidden" }}>
        {thumb ? (
          isVid
            ? <video src={thumb} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0f0820,#1a0a2e,#2d1060)" }}>
            <span style={{ fontSize: 28, opacity: 0.35 }}>🎬</span>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name || "Untitled"}</div>
        <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{timeLabel(project.updated_at)}</div>
      </div>
    </a>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { balance } = useCreditsStore();
  const { projects, loading, fetchProjects } = useProjectsStore();

  const [selected,       setSelected]       = useState("ai-video");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [userId,         setUserId]         = useState(null);
  const [userName,       setUserName]       = useState("");

  useEffect(() => {
    fetchProjects();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.name?.split(" ")[0] || "");
      const lsKey = `onboarding_done_${user.id}`;
      if (localStorage.getItem(lsKey)) return;
      getProfile(user.id).then(profile => {
        if (profile === null) return;
        if (profile?.onboarding_completed) localStorage.setItem(lsKey, "1");
        else setShowOnboarding(true);
      }).catch(() => {});
    });
    if (!localStorage.getItem("feedback_prompted")) {
      serverFetch("/api/feedback/mine").then(r => r.json()).then(({ count }) => {
        if (count === 0) {
          setTimeout(() => { localStorage.setItem("feedback_prompted", "true"); setShowFeedback(true); }, 3000);
        } else { localStorage.setItem("feedback_prompted", "true"); }
      }).catch(() => {});
    }
  }, []);

  function pickService(svc) {
    if (svc.kind === "nav") { navigate(svc.to); return; }
    setSelected(svc.id);
  }

  const recent = [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 12);

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      {showOnboarding && userId && (
        <Onboarding userId={userId} onComplete={() => { localStorage.setItem(`onboarding_done_${userId}`, "1"); setShowOnboarding(false); }} />
      )}
      {showFeedback && <FeedbackModal context="post_visit" onClose={() => setShowFeedback(false)} />}

      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px 80px" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, letterSpacing: "-0.02em" }}>
              {userName ? `What are we making, ${userName}?` : "What are we making today?"}
            </h1>
            <p style={{ fontSize: 14, marginTop: 8, color: T.muted }}>
              Describe it — we'll research, script, narrate, and design it for you.
            </p>
          </div>

          {/* Chatbox (morphs per selected service) */}
          <div style={{ marginBottom: 16 }}>
            {selected === "ai-video"
              ? <AiVideoChatbox />
              : <div style={{ padding: 28, textAlign: "center", color: T.muted, border: `1px dashed ${T.border}`, borderRadius: 18 }}>Opening…</div>}
          </div>

          {/* Service pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", justifyContent: "center", marginBottom: 4 }}>
            {SERVICES.map(svc => {
              const active = selected === svc.id;
              return (
                <button key={svc.id} onClick={() => pickService(svc)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 100, whiteSpace: "nowrap",
                    background: active ? `${svc.accent}1c` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? svc.accent + "66" : T.border}`,
                    color: active ? "#fff" : T.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}>
                  <span style={{ fontSize: 14 }}>{svc.emoji}</span>{svc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid — full width (user projects for now; curated demos later) */}
        <div style={{ padding: "48px 40px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.faint, fontFamily: "'JetBrains Mono',monospace" }}>
              Your videos
            </div>
            <button onClick={() => navigate("/videos")} style={{ fontSize: 13, border: "none", cursor: "pointer", background: "transparent", color: "#7c5cfc", fontFamily: "inherit" }}>
              View all →
            </button>
          </div>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: T.faint }}>
              <div style={{ width: 16, height: 16, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : recent.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.faint, fontSize: 14 }}>
              Nothing yet — describe a video above to make your first one.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
              {recent.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
