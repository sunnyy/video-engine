import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useCreditsStore } from "../store/useCreditsStore";
import { useProjectsStore } from "../store/useProjectsStore";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/profileService";
import { serverFetch } from "../services/serverApi";
import { invalidateProjectCaches } from "../services/projects/projectService";
import { generatePromptVideo, planPromptVideo } from "../services/ai/promptVideo/generatePromptVideo";
import { planSocialVideo, produceSocialVideo } from "../services/ai/socialVideo/generateSocialVideo";
import ScriptConfirmModal from "../ui/ScriptConfirmModal";
import { generateSaasVideo } from "../services/ai/saasVideo/generateSaasVideo";
import { generateProductVideo, scrapeProductUrl } from "../services/ai/productVideo/generateProductVideo";
import { planTypographyVideo, produceTypographyVideo } from "../services/ai/typographyVideo/generateTypographyVideo";
import { generateCaptions } from "../services/captions/generateCaptions";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import { captionStylePresets, captionStyleLabels } from "../core/registries/captionTimelineRegistry.jsx";
import { VoiceLanguageField, DurationField, StyleField, OrientationField, SelectField } from "../ui/fields/index.js";
import { SERVICE_FIELDS } from "../config/serviceFields.js";
import { Sparkles, Clapperboard, ShoppingBag, MessageCircle, Type, Captions, ArrowUp, Megaphone, Contrast, Droplet, Target, Film, Image as ImageIcon, ImagePlus, Video, MoveVertical, Loader2 } from "lucide-react";
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
  { id: "ai-video",        label: "Prompt to Video",  Icon: Sparkles,      accent: "#f59e0b", kind: "chat", to: "/ai-video" },
  { id: "promo-video",     label: "SaaS Video",       Icon: Clapperboard,  accent: "#f5c518", kind: "chat", to: "/promo-video" },
  { id: "product-video",   label: "Product Video",    Icon: ShoppingBag,   accent: "#f97316", kind: "chat", to: "/product-video" },
  { id: "social-video",    label: "Social to Video",  Icon: MessageCircle, accent: "#22d3ee", kind: "chat", to: "/social-video" },
  { id: "typography-video",label: "Typography Video", Icon: Type,          accent: "#7c5cfc", kind: "chat", to: "/typography-video" },
  { id: "video-captions",  label: "Auto Captions",    Icon: Captions,      accent: "#34d399", kind: "chat", to: "/video-captions" },
];

const AI = SERVICES[0].accent; // amber, the AI Video accent

// Stylish, non-revealing labels — must match the server's PROMPT_STATUS_STEPS.
const STATUS_STEPS = [
  "Warming up the studio…", "Shaping your vision…", "Finding the angle…",
  "Bringing it to life…", "Adding the spark…", "Polishing every frame…",
  "Composing the final cut…", "Almost ready…",
];

const EXAMPLE_PROMPTS = [
  "Explain why the Roman Empire fell, in a dramatic way.",
  "Top 3 most underrated sci-fi movies of the 2010s.",
  "iPhone vs Android in 2026 — settle it.",
];

// Stylish, non-revealing — must match the Social pipeline's emitted step() strings.
const SOCIAL_STATUS = [
  "Tuning in…",
  "Shaping the story…",
  "Adding the spark…",
  "Setting the mood…",
  "Bringing it to life…",
  "Putting it together…",
  "Almost ready…",
];

const SAAS_STATUS = [
  "Studying your brand…",
  "Crafting the concept…",
  "Bringing it to life…",
  "Almost ready…",
];

const PRODUCT_STATUS = [
  "Setting up the shoot…",
  "Crafting the concept…",
  "Bringing it to life…",
  "Designing the look…",
  "Almost ready…",
];

const TYPO_STATUS = [
  "Shaping your vision…",
  "Adding the spark…",
  "Designing the look…",
  "Composing the final cut…",
  "Almost ready…",
];

const CAPTION_STATUS = [
  "Reading your video…",
  "Finding the words…",
  "Styling your captions…",
  "Almost ready…",
];

const CAPTION_STYLE_OPTIONS = Object.keys(captionStylePresets).map(k => ({ id: k, label: captionStyleLabels[k] || k }));

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString();
}

/* ── AI Video chatbox (the morphing create surface) ── */
function PromptVideoChatbox({ onBusy }) {
  const navigate = useNavigate();
  const [prompt,   setPrompt]   = useState("");
  const cfg = SERVICE_FIELDS["ai-video"];
  const [styleId,  setStyleId]  = useState(cfg.shared.style.default);
  const [duration, setDuration] = useState(cfg.shared.duration.default);
  const [language, setLanguage] = useState(cfg.shared.voiceLanguage.default.language);
  const [voiceId,  setVoiceId]  = useState(cfg.shared.voiceLanguage.default.voiceId);
  const [orientation, setOrientation] = useState(cfg.shared.orientation?.default ?? "9:16");

  const [planning,   setPlanning]   = useState(false);
  const [planData,   setPlanData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [error,      setError]      = useState(null);

  const canPlan = !!prompt.trim() && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? STATUS_STEPS[statusStep] : "Planning your video…");
  }, [planning, loading, statusStep, onBusy]);

  async function handlePlan() {
    if (!prompt.trim() || planning || loading) return;
    setPlanning(true); setError(null);
    try {
      const result = await planPromptVideo({ prompt: prompt.trim(), styleId, targetDuration: duration, language, orientation });
      setPlanData(result);
    } catch (err) {
      setError(err.message || "Planning failed. Please try again.");
    } finally {
      setPlanning(false);
    }
  }

  async function handleProduce(editedBeats) {
    if (!planData || loading) return;
    setPlanData(null); setLoading(true); setError(null); setStatusStep(2);
    // Carry the user's edited script lines into the plan; visuals stay as planned.
    const plan = { ...planData.plan, film: { ...planData.plan.film, beats: editedBeats } };
    try {
      const result = await generatePromptVideo(
        { prompt: prompt.trim(), styleId, targetDuration: duration, language, voiceId, orientation, plan },
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
          {/* Left: shared field chips (from src/ui/fields) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StyleField value={styleId} onChange={setStyleId} options={cfg.shared.style.options} accent={AI} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={AI} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={AI} />
          </div>
          {/* Right: orientation (accent) + send */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={AI} tinted />
            <button
              onClick={() => handlePlan()}
              disabled={!canPlan}
              title="Create a free plan"
              style={{
                width: 40, height: 40, borderRadius: 10, border: "none",
                cursor: canPlan ? "pointer" : "not-allowed", fontSize: 18, fontWeight: 800,
                background: canPlan ? AI : "rgba(245,158,11,0.25)", color: "#1c1408",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><ArrowUp size={18} strokeWidth={2.5} /></button>
          </div>
        </div>
      </div>

      {/* Example prompts */}
      {!planData && !loading && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, justifyContent: "center" }}>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => setPrompt(p)}
              style={{ fontSize: 11, color: T.muted, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 10, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>
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

      {/* Script confirmation — editable lines only; no internal analysis shown */}
      {planData && !loading && (
        <ScriptConfirmModal
          scenes={planData.plan.film.beats}
          scriptKey="script_line"
          onConfirm={handleProduce}
          onCancel={() => setPlanData(null)}
          accent={AI}
          title="Review your script"
          confirmLabel="Looks good — Produce Video (75 credits)"
        />
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

    </div>
  );
}

/* ── Social to Video chatbox (URL primary input) ── */
function SocialChatbox({ onBusy }) {
  const navigate = useNavigate();
  const cfg = SERVICE_FIELDS["social-video"];
  const SA = cfg.accent;
  const [url,           setUrl]           = useState("");
  const [styleId,       setStyleId]       = useState(cfg.shared.style.default);
  const [duration,      setDuration]      = useState(cfg.shared.duration.default);
  const [language,      setLanguage]      = useState(cfg.shared.voiceLanguage.default.language);
  const [voiceId,       setVoiceId]       = useState(cfg.shared.voiceLanguage.default.voiceId);
  const [orientation,   setOrientation]   = useState(cfg.shared.orientation?.default ?? "9:16");
  const [includeAuthor, setIncludeAuthor] = useState(false);
  const [plan,          setPlan]          = useState(null);
  const [planning,      setPlanning]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [statusStep,    setStatusStep]    = useState(0);
  const [error,         setError]         = useState(null);

  const canGo = !!url.trim() && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? SOCIAL_STATUS[statusStep] : "Reading the post…");
  }, [planning, loading, statusStep, onBusy]);

  // Phase 1: fetch + script → open the confirmation modal.
  async function handleStart() {
    if (!canGo) return;
    setPlanning(true); setError(null);
    try {
      setPlan(await planSocialVideo({ url: url.trim(), targetDuration: duration, language }));
    } catch (err) {
      setError(err.message || "Couldn't read that post.");
    } finally {
      setPlanning(false);
    }
  }

  // Phase 2: build the video from the confirmed/edited script.
  async function handleProduce(editedScenes) {
    setPlan(null); setLoading(true); setError(null); setStatusStep(0);
    try {
      const result = await produceSocialVideo(
        { ...plan, scenes: editedScenes },
        { voiceId, language, includeAuthor, styleId, orientation },
        ({ step }) => { const i = SOCIAL_STATUS.indexOf(step); if (i !== -1) setStatusStep(i); },
      );
      invalidateProjectCaches("social_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits — you need 15 to generate a social video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${url.trim() ? "rgba(34,211,238,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Twitter/X, Instagram, or LinkedIn post URL…"
          disabled={loading || planning}
          onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
          style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 16, fontFamily: "inherit", padding: "8px 0", minHeight: 36 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StyleField value={styleId} onChange={setStyleId} options={cfg.shared.style.options} accent={SA} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={SA} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={SA} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={SA} tinted />
            <button onClick={handleStart} disabled={!canGo} title="Review script"
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? SA : "rgba(34,211,238,0.25)", color: "#04222a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {planning ? <Loader2 size={18} style={{ animation: "pv-spin 0.7s linear infinite" }} /> : <ArrowUp size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>

      {/* Service-specific field: include author credit */}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setIncludeAuthor(v => !v)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 10, background: includeAuthor ? `${SA}1c` : "rgba(255,255,255,0.03)", border: `1px solid ${includeAuthor ? SA + "66" : T.border}`, color: includeAuthor ? "#fff" : T.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {includeAuthor ? "☑" : "☐"} Include author credit
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 16, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{SOCIAL_STATUS[statusStep]}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {SOCIAL_STATUS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusStep ? SA : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>
      )}

      {plan && (
        <ScriptConfirmModal
          scenes={plan.scenes}
          onConfirm={handleProduce}
          onCancel={() => setPlan(null)}
          accent={SA}
        />
      )}
    </div>
  );
}

/* ── SaaS Video chatbox (faceless one-shot: create→render→poll) ── */
function SaasChatbox({ onBusy }) {
  const navigate = useNavigate();
  const cfg = SERVICE_FIELDS["promo-video"];
  const SC = cfg.accent;
  const [mode,        setMode]        = useState("url"); // "url" | "info"
  const [url,         setUrl]         = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [styleId,     setStyleId]     = useState(cfg.shared.style.default);
  const [duration,    setDuration]    = useState(cfg.shared.duration.default);
  const [language,    setLanguage]    = useState(cfg.shared.voiceLanguage.default.language);
  const [voiceId,     setVoiceId]     = useState(cfg.shared.voiceLanguage.default.voiceId);
  const [orientation, setOrientation] = useState(cfg.shared.orientation?.default ?? "9:16");
  const [tone,        setTone]        = useState(cfg.specific.tone.default);
  const [theme,       setTheme]       = useState(cfg.specific.theme.default);
  const [accent,      setAccent]      = useState(cfg.specific.accent.default);
  const [loading,     setLoading]     = useState(false);
  const [statusStep,  setStatusStep]  = useState(0);
  const [error,       setError]       = useState(null);

  const canGo = (mode === "url" ? !!url.trim() : (!!productName.trim() && !!description.trim())) && !loading;

  useEffect(() => {
    onBusy?.(loading, SAAS_STATUS[statusStep]);
  }, [loading, statusStep, onBusy]);

  async function handleGenerate() {
    if (!canGo) return;
    setLoading(true); setError(null); setStatusStep(0);
    const payload = {
      video_type: "faceless", video_goal: "saas_promo",
      product_name:        mode === "info" ? productName.trim() : "",
      product_url:         mode === "url"  ? url.trim() : null,
      text_source:         mode === "url"  ? "url" : "manual",
      product_description: mode === "info" ? description.trim() : "",
      notes: null, format_ratio: orientation, language, tone,
      has_talking_head: false, has_voiceover: false, has_script: false,
      has_logo: false, has_screenshots: false, has_recordings: false,
      talking_head_segments: null, talking_head_url: null, voiceover_url: null,
      logo_url: null, logo_width: null, logo_height: null, script: null,
      pipeline_version: "v2",
      visual_style: styleId, theme, accent_color: accent, typography_style: "modern",
      voice_id: voiceId, target_duration: duration,
    };
    try {
      const result = await generateSaasVideo(payload, ({ step }) => setStatusStep(step));
      invalidateProjectCaches("promo_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits for a SaaS video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  const filled = mode === "url" ? url.trim() : (productName.trim() || description.trim());

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${filled ? "rgba(245,197,24,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[["url", "Website URL"], ["info", "No website"]].map(([m, l]) => {
            const sel = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? SC + "66" : T.border}`, background: sel ? `${SC}1c` : "rgba(255,255,255,0.03)", color: sel ? "#fff" : T.muted }}>
                {l}
              </button>
            );
          })}
        </div>

        {mode === "url" ? (
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="Your SaaS website URL — e.g. https://yourapp.com"
            disabled={loading}
            onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
            style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 16, fontFamily: "inherit", padding: "8px 0", minHeight: 36 }}
          />
        ) : (
          <>
            <input
              value={productName} onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name" disabled={loading}
              style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 16, fontFamily: "inherit", padding: "6px 0" }}
            />
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your product does…" disabled={loading} rows={2}
              style={{ width: "100%", boxSizing: "border-box", resize: "none", border: "none", outline: "none", background: "transparent", color: T.muted, fontSize: 14, fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StyleField value={styleId} onChange={setStyleId} options={cfg.shared.style.options} accent={SC} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={SC} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={SC} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={SC} tinted />
            <button onClick={handleGenerate} disabled={!canGo} title="Generate"
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? SC : "rgba(245,197,24,0.25)", color: "#1c1408", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Service-specific fields below the box */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <SelectField icon={<Megaphone size={16} />} label="Tone"  value={tone}  onChange={setTone}  options={cfg.specific.tone.options}  accent={SC} />
        <SelectField icon={<Contrast size={16} />}  label="Theme" value={theme} onChange={setTheme} options={cfg.specific.theme.options} accent={SC} />
        <SelectField icon={<Droplet size={16} />}   label="Accent" value={accent} onChange={setAccent} options={cfg.specific.accent.options} accent={SC} />
        <button onClick={() => navigate("/promo-video")}
          style={{ marginLeft: "auto", fontSize: 12, color: T.faint, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          More options (talking-head, assets) →
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 16, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{SAAS_STATUS[statusStep]}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {SAAS_STATUS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusStep ? SC : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>SaaS renders take ~30s–2min — hang tight.</div>
        </div>
      )}
    </div>
  );
}

/* ── Product Video chatbox (image-upload or product URL → one-shot generate) ── */
function ProductChatbox({ onBusy }) {
  const navigate = useNavigate();
  const cfg = SERVICE_FIELDS["product-video"];
  const PC = cfg.accent;
  const fileRef = useRef(null);
  const [mode,        setMode]        = useState("upload"); // "upload" | "url"
  const [imageFile,   setImageFile]   = useState(null);
  const [imagePreview,setImagePreview]= useState(null);
  const [productUrl,  setProductUrl]  = useState("");
  const [brand,       setBrand]       = useState("");
  const [goal,        setGoal]        = useState(cfg.specific.goal.default);
  const [length,      setLength]      = useState(cfg.specific.length.default);
  const [visuals,     setVisuals]     = useState(cfg.specific.visuals.default);
  const [language,    setLanguage]    = useState(cfg.shared.voiceLanguage.default.language);
  const [voiceId,     setVoiceId]     = useState(cfg.shared.voiceLanguage.default.voiceId);
  const [orientation, setOrientation] = useState(cfg.shared.orientation?.default ?? "9:16");
  const [loading,     setLoading]     = useState(false);
  const [statusIdx,   setStatusIdx]   = useState(0);
  const [error,       setError]       = useState(null);

  const hasInput = mode === "upload" ? !!imageFile : !!productUrl.trim();
  const canGo = hasInput && !loading;

  useEffect(() => {
    onBusy?.(loading, PRODUCT_STATUS[statusIdx]);
  }, [loading, statusIdx, onBusy]);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function handleGenerate() {
    if (!canGo) return;
    setLoading(true); setError(null); setStatusIdx(0);
    try {
      let productImageUrl, scrapedBrand = "", scrapedDesc = "";
      if (mode === "upload") {
        const asset = await uploadUserAsset(imageFile, "image", null, "project", null);
        productImageUrl = asset.url;
      } else {
        const data = await scrapeProductUrl(productUrl.trim());
        productImageUrl = data.productImageUrl;
        scrapedBrand = data.brandName || "";
        scrapedDesc  = data.productDescription || "";
        if (!productImageUrl) throw new Error("No product image found at that URL — try uploading instead.");
      }
      const goalCfg    = cfg.specific.goal.options.find(g => g.id === goal);
      const effVisuals = (visuals === "hybrid" && length === 1) ? "image" : visuals; // hybrid needs multi-scene
      const result = await generateProductVideo({
        productImageUrl,
        logoUrl: null,
        brandName: brand.trim() || scrapedBrand,
        productDescription: scrapedDesc,
        goal,
        ctaText: goalCfg?.cta || "Shop Now",
        offerText: "",
        website: mode === "url" ? productUrl.trim() : "",
        visualMode: effVisuals,
        orientation,
        voice_id: voiceId,
        language,
        sceneCount: length,
      }, ({ step }) => { if (typeof step === "number") setStatusIdx(step); });
      invalidateProjectCaches("product_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits for a product video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${hasInput ? "rgba(249,115,22,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[["upload", "Upload image"], ["url", "Product URL"]].map(([m, l]) => {
            const sel = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? PC + "66" : T.border}`, background: sel ? `${PC}1c` : "rgba(255,255,255,0.03)", color: sel ? "#fff" : T.muted }}>
                {l}
              </button>
            );
          })}
        </div>

        {mode === "upload" ? (
          <div
            onClick={() => !loading && fileRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: `1.5px dashed ${imagePreview ? PC + "66" : T.border}`, cursor: loading ? "default" : "pointer", background: "rgba(255,255,255,0.02)" }}>
            {imagePreview
              ? <img src={imagePreview} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover" }} />
              : <span style={{ display: "flex", color: T.muted }}><ImagePlus size={22} /></span>}
            <span style={{ fontSize: 14, color: imagePreview ? T.text : T.muted, fontWeight: imagePreview ? 700 : 500 }}>
              {imagePreview ? (imageFile?.name || "Product image ready") : "Upload a product photo"}
            </span>
            {imagePreview && (
              <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                style={{ marginLeft: "auto", fontSize: 12, color: T.faint, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
          </div>
        ) : (
          <input
            value={productUrl} onChange={(e) => setProductUrl(e.target.value)}
            placeholder="Amazon / Flipkart / store product URL…" disabled={loading}
            onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
            style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 16, fontFamily: "inherit", padding: "8px 0", minHeight: 36 }}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={PC} />
            <SelectField icon={<Target size={16} />} label="Goal"    value={goal}    onChange={setGoal}    options={cfg.specific.goal.options}    accent={PC} />
            <SelectField icon={<Film size={16} />}   label="Length"  value={length}  onChange={setLength}  options={cfg.specific.length.options}  accent={PC} />
            <SelectField icon={<ImageIcon size={16} />} label="Visuals" value={visuals} onChange={setVisuals} options={cfg.specific.visuals.options} accent={PC} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={PC} tinted />
            <button onClick={handleGenerate} disabled={!canGo} title="Generate"
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? PC : "rgba(249,115,22,0.25)", color: "#221207", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Service-specific below: brand + more options */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <input
          value={brand} onChange={(e) => setBrand(e.target.value)}
          placeholder="Brand name (optional)" disabled={loading}
          style={{ flex: "0 1 240px", padding: "8px 12px", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={() => navigate("/product-video")}
          style={{ marginLeft: "auto", fontSize: 12, color: T.faint, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          More options (offer, logo, description) →
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 16, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{PRODUCT_STATUS[statusIdx]}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {PRODUCT_STATUS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusIdx ? PC : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Typography Video chatbox (topic/script → kinetic text video) ── */
function TypographyChatbox({ onBusy }) {
  const navigate = useNavigate();
  const cfg = SERVICE_FIELDS["typography-video"];
  const TC = cfg.accent;
  const [inputType,   setInputType]   = useState("topic"); // "topic" | "script"
  const [input,       setInput]       = useState("");
  const [styleId,     setStyleId]     = useState(cfg.shared.style.default);
  const [duration,    setDuration]    = useState(cfg.shared.duration.default);
  const [language,    setLanguage]    = useState(cfg.shared.voiceLanguage.default.language);
  const [voiceId,     setVoiceId]     = useState(cfg.shared.voiceLanguage.default.voiceId);
  const [orientation, setOrientation] = useState(cfg.shared.orientation?.default ?? "9:16");
  const [plan,        setPlan]        = useState(null);
  const [planning,    setPlanning]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [statusStep,  setStatusStep]  = useState(0);
  const [error,       setError]       = useState(null);

  const canGo = !!input.trim() && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? TYPO_STATUS[statusStep] : "Building your script…");
  }, [planning, loading, statusStep, onBusy]);

  // Phase 1: script → open the confirmation modal.
  async function handleStart() {
    if (!canGo) return;
    setPlanning(true); setError(null);
    try {
      setPlan(await planTypographyVideo({ input: input.trim(), inputType, targetDuration: duration, language, styleId }));
    } catch (err) {
      setError(err.message || "Couldn't build that script.");
    } finally {
      setPlanning(false);
    }
  }

  // Phase 2: build the video from the confirmed/edited script.
  async function handleProduce(editedScenes) {
    setPlan(null); setLoading(true); setError(null); setStatusStep(0);
    try {
      const result = await produceTypographyVideo(
        { ...plan, scenes: editedScenes },
        { voiceId, language, orientation },
        ({ step }) => { if (typeof step === "number") setStatusStep(step); },
      );
      invalidateProjectCaches("typography_video", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits for a typography video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${input.trim() ? "rgba(124,92,252,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }}>
        {/* Topic / Script toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[["topic", "Topic"], ["script", "Script"]].map(([m, l]) => {
            const sel = inputType === m;
            return (
              <button key={m} onClick={() => setInputType(m)}
                style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? TC + "66" : T.border}`, background: sel ? `${TC}1c` : "rgba(255,255,255,0.03)", color: sel ? "#fff" : T.muted }}>
                {l}
              </button>
            );
          })}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputType === "topic" ? "A topic — e.g. Why most habits fail" : "Paste your full script — each sentence becomes a scene…"}
          disabled={loading || planning}
          rows={inputType === "script" ? 4 : 2}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart(); }}
          style={{ width: "100%", boxSizing: "border-box", resize: "none", border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 16, fontFamily: "inherit", lineHeight: 1.5, minHeight: 44 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StyleField value={styleId} onChange={setStyleId} options={cfg.shared.style.options} accent={TC} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={TC} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={TC} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={TC} tinted />
            <button onClick={handleStart} disabled={!canGo} title="Review script"
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? TC : "rgba(124,92,252,0.25)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {planning ? <Loader2 size={18} style={{ animation: "pv-spin 0.7s linear infinite" }} /> : <ArrowUp size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 16, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{TYPO_STATUS[statusStep]}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {TYPO_STATUS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusStep ? TC : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>
      )}

      {plan && (
        <ScriptConfirmModal
          scenes={plan.scenes}
          scriptKey="voiceover"
          onConfirm={handleProduce}
          onCancel={() => setPlan(null)}
          accent={TC}
        />
      )}
    </div>
  );
}

/* ── Add Captions chatbox (video upload → transcribe → styled captions) ── */
function CaptionsChatbox({ onBusy }) {
  const navigate = useNavigate();
  const cfg = SERVICE_FIELDS["video-captions"];
  const CC = cfg.accent;
  const fileRef = useRef(null);
  const [file,         setFile]         = useState(null);
  const [captionStyle, setCaptionStyle] = useState(cfg.specific.captionStyle.default);
  const [position,     setPosition]     = useState(cfg.specific.position.default);
  const [loading,      setLoading]      = useState(false);
  const [statusStep,   setStatusStep]   = useState(0);
  const [error,        setError]        = useState(null);

  const canGo = !!file && !loading;

  useEffect(() => {
    onBusy?.(loading, CAPTION_STATUS[statusStep]);
  }, [loading, statusStep, onBusy]);

  async function handleGenerate() {
    if (!canGo) return;
    setLoading(true); setError(null); setStatusStep(0);
    try {
      const result = await generateCaptions(
        { file, captionStyle, captionPos: position },
        ({ step }) => { if (typeof step === "number") setStatusStep(step); },
      );
      invalidateProjectCaches("caption_studio", "all");
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits to caption this video." : (err.message || "Captioning failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${file ? "rgba(52,211,153,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }}>
        <div
          onClick={() => !loading && fileRef.current?.click()}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1.5px dashed ${file ? CC + "66" : T.border}`, cursor: loading ? "default" : "pointer", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ display: "flex", color: file ? CC : T.muted }}><Video size={22} /></span>
          <span style={{ fontSize: 14, color: file ? T.text : T.muted, fontWeight: file ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file ? file.name : "Upload a video to caption"}
          </span>
          {file && (
            <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
              style={{ marginLeft: "auto", fontSize: 12, color: T.faint, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
          )}
          <input ref={fileRef} type="file" accept="video/mp4,video/mov,video/webm,video/avi,video/quicktime" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} style={{ display: "none" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SelectField icon={<Captions size={16} />}     label="Caption style" value={captionStyle} onChange={setCaptionStyle} options={CAPTION_STYLE_OPTIONS} accent={CC} />
            <SelectField icon={<MoveVertical size={16} />} label="Position"      value={position}     onChange={setPosition}     options={cfg.specific.position.options} accent={CC} />
          </div>
          <button onClick={handleGenerate} disabled={!canGo} title="Add captions"
            style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? CC : "rgba(52,211,153,0.25)", color: "#04231a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 16, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{CAPTION_STATUS[statusStep]}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {CAPTION_STATUS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= statusStep ? CC : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>
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

  // Generation lock: while a chatbox is planning/producing, block service switches,
  // clicks elsewhere, and page unload so the in-flight job isn't orphaned on the front end.
  const [busy,       setBusy]       = useState(false);
  const [busyStatus, setBusyStatus] = useState("");
  const reportBusy = useCallback((b, s) => { setBusy(b); if (b) setBusyStatus(s || "Creating your video…"); }, []);

  // Warn on refresh / tab close / external navigation while a job is running.
  useEffect(() => {
    if (!busy) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

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
    if (busy) return; // locked while a generation is running
    if (svc.kind === "nav") { navigate(svc.to); return; }
    setSelected(svc.id);
  }

  const recent = [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 12);

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Generation lock overlay — blocks all interaction (incl. the sidebar) until the
          in-flight plan/produce finishes, so switching services can't orphan the job. */}
      {busy && createPortal(
        <div
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: "fixed", inset: 0, zIndex: 100000,
            background: "rgba(6,7,12,0.82)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
            cursor: "wait",
          }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.14)", borderTopColor: AI, borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text, fontFamily: "'Outfit',sans-serif", textAlign: "center", padding: "0 24px" }}>
            {busyStatus || "Creating your video…"}
          </div>
          <div style={{ fontSize: 12.5, color: T.muted, maxWidth: 340, textAlign: "center", lineHeight: 1.55, padding: "0 24px" }}>
            Please keep this tab open — don't refresh or leave the page while we build your video.
          </div>
        </div>,
        document.body,
      )}

      {showOnboarding && userId && (
        <Onboarding userId={userId} onComplete={() => { localStorage.setItem(`onboarding_done_${userId}`, "1"); setShowOnboarding(false); }} />
      )}
      {showFeedback && <FeedbackModal context="post_visit" onClose={() => setShowFeedback(false)} />}

      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "56px 24px 20px" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, letterSpacing: "-0.02em" }}>
              {userName ? `What are we making, ${userName}?` : "What are we making today?"}
            </h1>
            <p style={{ fontSize: 14, marginTop: 8, color: T.muted }}>
              Pick a video type, then describe your idea.
            </p>
          </div>

          {/* Service pills (above the chatbox) */}
          <div style={{ display: "flex", gap: 10, flexWrap: "nowrap", justifyContent: "center", marginBottom: 30 }}>
            {SERVICES.map(svc => {
              const active = selected === svc.id;
              return (
                <button key={svc.id} onClick={() => pickService(svc)} disabled={busy}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "10px 15px", borderRadius: 10, whiteSpace: "nowrap",
                    background: active ? `${svc.accent}1c` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? svc.accent + "66" : T.border}`,
                    color: active ? "#fff" : T.muted, fontSize: 12, fontWeight: 700,
                    cursor: busy ? "not-allowed" : "pointer", opacity: busy && !active ? 0.5 : 1, fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}>
                  <svc.Icon size={15} />{svc.label}
                </button>
              );
            })}
          </div>

          {/* Chatbox (morphs per selected service) */}
          <div>
            {selected === "ai-video"      ? <PromptVideoChatbox onBusy={reportBusy} />
              : selected === "social-video" ? <SocialChatbox onBusy={reportBusy} />
              : selected === "promo-video"  ? <SaasChatbox onBusy={reportBusy} />
              : selected === "product-video"? <ProductChatbox onBusy={reportBusy} />
              : selected === "typography-video" ? <TypographyChatbox onBusy={reportBusy} />
              : selected === "video-captions"   ? <CaptionsChatbox onBusy={reportBusy} />
              : <div style={{ padding: 28, textAlign: "center", color: T.muted, border: `1px dashed ${T.border}`, borderRadius: 14 }}>Opening…</div>}
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
