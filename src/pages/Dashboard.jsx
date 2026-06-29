import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useCreditsStore } from "../store/useCreditsStore";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/profileService";
import { serverFetch } from "../services/serverApi";
import { invalidateProjectCaches } from "../services/projects/projectService";
import { generatePromptVideo, planPromptVideo } from "../services/ai/promptVideo/generatePromptVideo";
import { planSocialVideo, produceSocialVideo } from "../services/ai/socialVideo/generateSocialVideo";
import ScriptConfirmModal from "../ui/ScriptConfirmModal";
import { generateSaasVideo, planSaasVideo } from "../services/ai/saasVideo/generateSaasVideo";
import { generateProductVideo, planProductVideo, scrapeProductUrl } from "../services/ai/productVideo/generateProductVideo";
import { planTypographyVideo, produceTypographyVideo } from "../services/ai/typographyVideo/generateTypographyVideo";
import { generateCaptions } from "../services/captions/generateCaptions";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import { captionStylePresets, captionStyleLabels } from "../core/registries/captionTimelineRegistry.jsx";
import { VoiceLanguageField, DurationField, OrientationField, SelectField, ReviewToggleField, LookField, CaptionStyleField } from "../ui/fields/index.js";
import { SERVICE_FIELDS } from "../config/serviceFields.js";
import { creditsForDuration } from "../core/utils/creditCosts.js";
import { getReviewScriptFirst, setReviewScriptFirst } from "../core/utils/reviewScriptPref.js";
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
  const [theme,       setTheme]       = useState("auto");
  const [accentColor, setAccentColor] = useState(null);
  const [accentColor2, setAccentColor2] = useState(null);

  const [planning,   setPlanning]   = useState(false);
  const [planData,   setPlanData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [error,      setError]      = useState(null);
  const [reviewFirst, setReviewFirstState] = useState(getReviewScriptFirst());
  const reviewFirstSet = (v) => { setReviewFirstState(v); setReviewScriptFirst(v); };

  const canPlan = !!prompt.trim() && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? STATUS_STEPS[statusStep] : "Planning your video…", loading ? { step: statusStep, total: STATUS_STEPS.length } : null);
  }, [planning, loading, statusStep, onBusy]);

  // Plan the script. With review on, open the modal; with review off, produce directly.
  async function handlePlan() {
    if (!prompt.trim() || planning || loading) return;
    setPlanning(true); setError(null);
    try {
      const result = await planPromptVideo({ prompt: prompt.trim(), styleId, targetDuration: duration, language, orientation, theme, accentColor, accentColor2 });
      if (reviewFirst) setPlanData(result);
      else await produce(result, result.plan.film.beats);
    } catch (err) {
      setError(err.message || "Planning failed. Please try again.");
    } finally {
      setPlanning(false);
    }
  }

  async function produce(planResult, editedBeats) {
    if (!planResult || loading) return;
    setPlanData(null); setLoading(true); setError(null); setStatusStep(2);
    // Carry the user's (possibly edited) script lines into the plan; visuals stay as planned.
    const plan = { ...planResult.plan, film: { ...planResult.plan.film, beats: editedBeats } };
    try {
      const result = await generatePromptVideo(
        { prompt: prompt.trim(), styleId, targetDuration: duration, language, voiceId, orientation, plan, theme, accentColor, accentColor2 },
        ({ step }) => { const i = STATUS_STEPS.indexOf(step); if (i !== -1) setStatusStep(i); },
      );
      invalidateProjectCaches("ai_video", "all");
      if (result.incomplete) { navigate("/projects", { state: { from: "/dashboard" } }); return; }
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? `Not enough credits — you need ${creditsForDuration(duration)} to produce this video.` : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      {/* The box */}
      <div style={{ background: T.surface, border: `1px solid ${prompt.trim() ? "rgba(245,158,11,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }} className="vq-chatbox">
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
            <LookField styleId={styleId} onStyleChange={setStyleId} styleOptions={cfg.shared.style.options}
              theme={theme} onThemeChange={setTheme} accentColor={accentColor} onAccentChange={setAccentColor}
              accentColor2={accentColor2} onAccentChange2={setAccentColor2} accent={AI} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={AI} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={AI} />
            <ReviewToggleField value={reviewFirst} onChange={reviewFirstSet} accent={AI} />
          </div>
          {/* Right: orientation (accent) + send */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={AI} tinted />
            <button
              onClick={() => handlePlan()}
              disabled={!canPlan}
              title={reviewFirst ? "Review the script first" : "Generate video"}
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
          onConfirm={(beats) => produce(planData, beats)}
          onCancel={() => setPlanData(null)}
          accent={AI}
          title="Review your script"
          confirmLabel={`Looks good — Produce Video (${creditsForDuration(duration)} credits)`}
        />
      )}

      {/* Producing progress */}
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
  const [theme,         setTheme]         = useState("auto");
  const [accentColor,   setAccentColor]   = useState(null);
  const [accentColor2,  setAccentColor2]  = useState(null);
  const [includeAuthor, setIncludeAuthor] = useState(false);
  const [plan,          setPlan]          = useState(null);
  const [planning,      setPlanning]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [statusStep,    setStatusStep]    = useState(0);
  const [error,         setError]         = useState(null);
  const [reviewFirst,   setReviewFirstState] = useState(getReviewScriptFirst());
  const reviewFirstSet = (v) => { setReviewFirstState(v); setReviewScriptFirst(v); };

  const canGo = !!url.trim() && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? SOCIAL_STATUS[statusStep] : "Reading the post…", loading ? { step: statusStep, total: SOCIAL_STATUS.length } : null);
  }, [planning, loading, statusStep, onBusy]);

  // Fetch + script. With review on, open the modal; with review off, produce directly.
  async function handleStart() {
    if (!canGo) return;
    setPlanning(true); setError(null);
    try {
      const p = await planSocialVideo({ url: url.trim(), targetDuration: duration, language, theme, accentColor, accentColor2 });
      if (reviewFirst) setPlan(p);
      else await produce(p, p.scenes);
    } catch (err) {
      setError(err.message || "Couldn't read that post.");
    } finally {
      setPlanning(false);
    }
  }

  // Build the video from the confirmed/edited script.
  async function produce(planObj, editedScenes) {
    setPlan(null); setLoading(true); setError(null); setStatusStep(0);
    try {
      const result = await produceSocialVideo(
        { ...planObj, scenes: editedScenes },
        { voiceId, language, includeAuthor, styleId, orientation },
        ({ step }) => { const i = SOCIAL_STATUS.indexOf(step); if (i !== -1) setStatusStep(i); },
      );
      invalidateProjectCaches("social_video", "all");
      if (result.incomplete) { navigate("/projects", { state: { from: "/dashboard" } }); return; }
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits — you need 15 to generate a social video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${url.trim() ? "rgba(34,211,238,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }} className="vq-chatbox">
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
            <LookField styleId={styleId} onStyleChange={setStyleId} styleOptions={cfg.shared.style.options}
              theme={theme} onThemeChange={setTheme} accentColor={accentColor} onAccentChange={setAccentColor}
              accentColor2={accentColor2} onAccentChange2={setAccentColor2} accent={SA} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={SA} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={SA} />
            <ReviewToggleField value={reviewFirst} onChange={reviewFirstSet} accent={SA} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={SA} tinted />
            <button onClick={handleStart} disabled={!canGo} title={reviewFirst ? "Review the script first" : "Generate video"}
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

      {plan && (
        <ScriptConfirmModal
          scenes={plan.scenes}
          onConfirm={(scenes) => produce(plan, scenes)}
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
  const tone = cfg.specific.tone.default;  // sent to backend; no longer user-facing
  const [theme,       setTheme]       = useState("auto");
  const [accentColor, setAccentColor] = useState(null);
  const [accentColor2, setAccentColor2] = useState(null);
  const [planning,    setPlanning]    = useState(false);
  const [plan,        setPlan]        = useState(null);   // { full_script } when reviewing
  const [loading,     setLoading]     = useState(false);
  const [statusStep,  setStatusStep]  = useState(0);
  const [error,       setError]       = useState(null);
  const [reviewFirst, setReviewFirstState] = useState(getReviewScriptFirst());
  const reviewFirstSet = (v) => { setReviewFirstState(v); setReviewScriptFirst(v); };

  const canGo = (mode === "url" ? !!url.trim() : (!!productName.trim() && !!description.trim())) && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? SAAS_STATUS[statusStep] : "Writing your script…", loading ? { step: statusStep, total: SAAS_STATUS.length } : null);
  }, [planning, loading, statusStep, onBusy]);

  function buildPayload(script) {
    return {
      video_type: "faceless", video_goal: "saas_promo",
      product_name:        mode === "info" ? productName.trim() : "",
      product_url:         mode === "url"  ? url.trim() : null,
      text_source:         mode === "url"  ? "url" : "manual",
      product_description: mode === "info" ? description.trim() : "",
      notes: null, format_ratio: orientation, language, tone,
      has_talking_head: false, has_voiceover: false, has_script: !!script,
      has_logo: false, has_screenshots: false, has_recordings: false,
      talking_head_segments: null, talking_head_url: null, voiceover_url: null,
      logo_url: null, logo_width: null, logo_height: null, script: script || null,
      pipeline_version: "v2",
      visual_style: styleId, theme, accent_color: accentColor, accent_color_2: accentColor2, typography_style: "modern",
      voice_id: voiceId, target_duration: duration,
    };
  }

  // With review on, write the script and open the modal; with review off, produce directly.
  async function handleStart() {
    if (!canGo) return;
    if (reviewFirst) {
      setPlanning(true); setError(null);
      try {
        const full_script = await planSaasVideo(buildPayload(null));
        setPlan({ full_script });
      } catch (err) {
        setError(err.code === "NO_CREDITS" ? "Not enough credits for a SaaS video." : (err.message || "Couldn't build that script."));
      } finally {
        setPlanning(false);
      }
    } else {
      await produce(null);
    }
  }

  async function produce(script) {
    setPlan(null); setLoading(true); setError(null); setStatusStep(0);
    try {
      const result = await generateSaasVideo(buildPayload(script), ({ step }) => setStatusStep(step));
      invalidateProjectCaches("promo_video", "all");
      if (result.incomplete) { navigate("/projects", { state: { from: "/dashboard" } }); return; }
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits for a SaaS video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  const filled = mode === "url" ? url.trim() : (productName.trim() || description.trim());

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${filled ? "rgba(245,197,24,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }} className="vq-chatbox">
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
            onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
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
            <LookField styleId={styleId} onStyleChange={setStyleId} styleOptions={cfg.shared.style.options}
              theme={theme} onThemeChange={setTheme} accentColor={accentColor} onAccentChange={setAccentColor}
              accentColor2={accentColor2} onAccentChange2={setAccentColor2} accent={SC} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={SC} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={SC} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ReviewToggleField value={reviewFirst} onChange={reviewFirstSet} accent={SC} />
            <OrientationField value={orientation} onChange={setOrientation} accent={SC} tinted />
            <button onClick={handleStart} disabled={!canGo} title={reviewFirst ? "Review the script first" : "Generate"}
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? SC : "rgba(245,197,24,0.25)", color: "#1c1408", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {plan && (
        <ScriptConfirmModal
          scenes={[{ script: plan.full_script }]}
          scriptKey="script"
          singleBlock
          onConfirm={(scenes) => produce(scenes[0]?.script ?? plan.full_script)}
          onCancel={() => setPlan(null)}
          accent={SC}
          title="Review your script"
          sub="Your whole video is built from this narration — tweak it before we generate."
        />
      )}

      {/* Service-specific fields below the box */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
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
  const [planning,    setPlanning]    = useState(false);
  const [plan,        setPlan]        = useState(null);   // { plan, full_script } when reviewing
  const [loading,     setLoading]     = useState(false);
  const [statusIdx,   setStatusIdx]   = useState(0);
  const [error,       setError]       = useState(null);
  const [reviewFirst, setReviewFirstState] = useState(getReviewScriptFirst());
  const reviewFirstSet = (v) => { setReviewFirstState(v); setReviewScriptFirst(v); };

  const hasInput = mode === "upload" ? !!imageFile : !!productUrl.trim();
  const canGo = hasInput && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? PRODUCT_STATUS[statusIdx] : "Writing your script…", loading ? { step: statusIdx, total: PRODUCT_STATUS.length } : null);
  }, [planning, loading, statusIdx, onBusy]);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  // Resolve the product image (upload or scrape) → returns the base params for plan/produce.
  async function resolveInputs() {
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
    return {
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
    };
  }

  // With review on, plan the script and open the modal; with review off, produce directly.
  async function handleStart() {
    if (!canGo) return;
    if (reviewFirst) {
      setPlanning(true); setError(null);
      try {
        const base = await resolveInputs();
        const { plan: builtPlan, full_script } = await planProductVideo(base);
        setPlan({ base, plan: builtPlan, full_script });
      } catch (err) {
        setError(err.code === "NO_CREDITS" ? "Not enough credits for a product video." : (err.message || "Couldn't build that script."));
      } finally {
        setPlanning(false);
      }
    } else {
      setLoading(true); setError(null); setStatusIdx(0);
      try { await produce(await resolveInputs(), null, null); }
      catch (err) { setError(err.code === "NO_CREDITS" ? "Not enough credits for a product video." : (err.message || "Generation failed.")); setLoading(false); }
    }
  }

  async function produce(base, approvedPlan, script) {
    setPlan(null); setLoading(true); setError(null); setStatusIdx(0);
    try {
      const result = await generateProductVideo(
        { ...base, plan: approvedPlan, script },
        ({ step }) => { if (typeof step === "number") setStatusIdx(step); },
      );
      invalidateProjectCaches("product_video", "all");
      if (result.incomplete) { navigate("/projects", { state: { from: "/dashboard" } }); return; }
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits for a product video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${hasInput ? "rgba(249,115,22,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }} className="vq-chatbox">
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
            onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
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
            <ReviewToggleField value={reviewFirst} onChange={reviewFirstSet} accent={PC} />
            <OrientationField value={orientation} onChange={setOrientation} accent={PC} tinted />
            <button onClick={handleStart} disabled={!canGo} title={reviewFirst ? "Review the script first" : "Generate"}
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? PC : "rgba(249,115,22,0.25)", color: "#221207", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {plan && (
        <ScriptConfirmModal
          scenes={plan.plan?.scenes ?? [{ script_segment: plan.full_script }]}
          scriptKey="script_segment"
          onConfirm={(scenes) => {
            const edited = scenes.map(s => ({ ...s, spoken: (s.script_segment || "").trim() }));
            const full_script = edited.map(s => (s.script_segment || "").trim()).filter(Boolean).join(" ");
            produce(plan.base, { ...plan.plan, scenes: edited }, full_script);
          }}
          onCancel={() => setPlan(null)}
          accent={PC}
          title="Review your script"
          sub="Tweak any line — the voiceover is built from these."
        />
      )}

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
  const [theme,       setTheme]       = useState("auto");
  const [accentColor, setAccentColor] = useState(null);
  const [accentColor2, setAccentColor2] = useState(null);
  const [plan,        setPlan]        = useState(null);
  const [planning,    setPlanning]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [statusStep,  setStatusStep]  = useState(0);
  const [error,       setError]       = useState(null);
  const [reviewFirst, setReviewFirstState] = useState(getReviewScriptFirst());
  const reviewFirstSet = (v) => { setReviewFirstState(v); setReviewScriptFirst(v); };

  const canGo = !!input.trim() && !planning && !loading;

  useEffect(() => {
    onBusy?.(planning || loading, loading ? TYPO_STATUS[statusStep] : "Building your script…", loading ? { step: statusStep, total: TYPO_STATUS.length } : null);
  }, [planning, loading, statusStep, onBusy]);

  // Build the script. With review on, open the modal; with review off, produce directly.
  async function handleStart() {
    if (!canGo) return;
    setPlanning(true); setError(null);
    try {
      const p = await planTypographyVideo({ input: input.trim(), inputType, targetDuration: duration, language, styleId, theme, accentColor, accentColor2 });
      if (reviewFirst) setPlan(p);
      else await produce(p, p.scenes);
    } catch (err) {
      setError(err.message || "Couldn't build that script.");
    } finally {
      setPlanning(false);
    }
  }

  // Build the video from the confirmed/edited script.
  async function produce(planObj, editedScenes) {
    setPlan(null); setLoading(true); setError(null); setStatusStep(0);
    try {
      const result = await produceTypographyVideo(
        { ...planObj, scenes: editedScenes },
        { voiceId, language, orientation },
        ({ step }) => { if (typeof step === "number") setStatusStep(step); },
      );
      invalidateProjectCaches("typography_video", "all");
      if (result.incomplete) { navigate("/projects", { state: { from: "/dashboard" } }); return; }
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/dashboard" } });
    } catch (err) {
      setError(err.code === "NO_CREDITS" ? "Not enough credits for a typography video." : (err.message || "Generation failed."));
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${input.trim() ? "rgba(124,92,252,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }} className="vq-chatbox">
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
            <LookField styleId={styleId} onStyleChange={setStyleId} styleOptions={cfg.shared.style.options}
              theme={theme} onThemeChange={setTheme} accentColor={accentColor} onAccentChange={setAccentColor}
              accentColor2={accentColor2} onAccentChange2={setAccentColor2} accent={TC} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={TC} />
            <DurationField value={duration} onChange={setDuration} options={cfg.shared.duration.options} accent={TC} />
            <ReviewToggleField value={reviewFirst} onChange={reviewFirstSet} accent={TC} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <OrientationField value={orientation} onChange={setOrientation} accent={TC} tinted />
            <button onClick={handleStart} disabled={!canGo} title={reviewFirst ? "Review the script first" : "Generate video"}
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

      {plan && (
        <ScriptConfirmModal
          scenes={plan.scenes}
          scriptKey="voiceover"
          onConfirm={(scenes) => produce(plan, scenes)}
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
    onBusy?.(loading, CAPTION_STATUS[statusStep], loading ? { step: statusStep, total: CAPTION_STATUS.length } : null);
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
      <div style={{ background: T.surface, border: `1px solid ${file ? "rgba(52,211,153,0.35)" : T.border}`, borderRadius: 18, padding: 16, transition: "border-color 0.2s" }} className="vq-chatbox">
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
            <CaptionStyleField value={captionStyle} onChange={setCaptionStyle} options={CAPTION_STYLE_OPTIONS} accent={CC} />
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

    </div>
  );
}

/* ── Samples showcase — admin-curated outcomes per service (Pinterest/masonry) ── */
// Keep in sync with SERVICES in src/pages/admin/Samples.jsx.
const SAMPLE_SERVICE_LABELS = {
  // Video services
  ai_videos:        "Prompt to Video",
  saas_video:       "SaaS Video",
  product_video:    "Product Video",
  social_video:     "Social to Video",
  typography_video: "Typography Video",
  captions:         "Auto Captions",
  // Image services
  thumbnails:    "Thumbnail",
  posters:       "Poster",
  social_posts:  "Banner / Post",
  product_ads:   "Product Ad",
  virtual_tryon: "Virtual Try-On",
};

// Click-to-play lightbox — plays with sound (controls + autoPlay), mirrors the landing page.
function SampleLightbox({ sample, onClose }) {
  useEffect(() => {
    if (!sample) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sample, onClose]);
  if (!sample) return null;
  const isVid = sample.type === "video";
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(4,6,12,0.86)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 22, background: "none", border: "none", color: "#fff", fontSize: 34, lineHeight: 1, cursor: "pointer", opacity: 0.85 }}>×</button>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "min(92vw, 520px)", maxHeight: "90vh", display: "flex" }}>
        {isVid
          ? <video src={sample.src} poster={sample.poster || undefined} controls autoPlay playsInline style={{ width: "100%", maxHeight: "90vh", borderRadius: 14, display: "block", background: "#000" }} />
          : <img src={sample.src} alt="" style={{ width: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 14, display: "block" }} />}
      </div>
    </div>,
    document.body,
  );
}

function SampleCard({ sample, onOpen }) {
  const [hov, setHov] = useState(false);
  const vidRef = useRef(null);
  const isVid  = sample.type === "video";
  const label  = SAMPLE_SERVICE_LABELS[sample.service_key] || sample.service_key;

  // Only play videos while they're on screen — keeps a long grid smooth.
  useEffect(() => {
    if (!isVid) return;
    const el = vidRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [isVid]);

  return (
    <div className="sample-card"
      onClick={() => onOpen?.(sample)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: "relative", borderRadius: 14, overflow: "hidden", cursor: "pointer", border: `1px solid ${hov ? "rgba(124,92,252,0.4)" : T.border}`, background: T.surface, transition: "border-color 0.2s, transform 0.2s", transform: hov ? "translateY(-2px)" : "none" }}>
      {isVid ? (
        <video ref={vidRef} src={sample.src} poster={sample.poster || undefined} muted loop playsInline preload="metadata"
          style={{ width: "100%", display: "block", background: "#060a14" }} />
      ) : (
        <img src={sample.src} alt={label} loading="lazy" style={{ width: "100%", display: "block", background: "#060a14" }} />
      )}
      <div style={{ position: "absolute", left: 20, top: 20, padding: "4px 9px", borderRadius: 7, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(6px)", border: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.text, opacity: hov ? 1 : 0.85, transition: "opacity 0.2s" }}>
        {label}
      </div>
    </div>
  );
}

function SamplesGrid() {
  const [samples, setSamples] = useState(null); // null = loading
  const [active, setActive] = useState(null);   // sample opened in the lightbox

  useEffect(() => {
    let alive = true;
    serverFetch("/api/admin/samples/public?limit=60")
      .then(r => r.json())
      .then(d => { if (alive) setSamples((d.samples || []).filter(s => s.src)); })
      .catch(() => { if (alive) setSamples([]); });
    return () => { alive = false; };
  }, []);

  if (samples === null) {
    return (
      <div style={{ padding: "48px 40px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.faint }}>
          <div style={{ width: 16, height: 16, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13 }}>Loading samples…</span>
        </div>
      </div>
    );
  }
  if (!samples.length) return null; // nothing curated yet — hide the section entirely

  return (
    <div style={{ padding: "40px 40px 80px" }}>
      <style>{`
        .samples-masonry { column-count: 5; column-gap: 16px; }
        @media (max-width: 1100px) { .samples-masonry { column-count: 3; } }
        @media (max-width: 760px)  { .samples-masonry { column-count: 2; } }
        @media (max-width: 460px)  { .samples-masonry { column-count: 2; column-gap: 10px; } }
        .sample-card { break-inside: avoid; -webkit-column-break-inside: avoid; page-break-inside: avoid; margin-bottom: 16px; }
      `}</style>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, letterSpacing: "-0.01em" }}>
          See what you can make
        </h2>
        <p style={{ fontSize: 13.5, color: T.muted, marginTop: 6 }}>
          Real outcomes from every service — pick one above and create your own.
        </p>
      </div>
      <div className="samples-masonry">
        {samples.map(s => <SampleCard key={s.id} sample={s} onOpen={setActive} />)}
      </div>
      <SampleLightbox sample={active} onClose={() => setActive(null)} />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { balance } = useCreditsStore();
  const [selected,       setSelected]       = useState("ai-video");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [userId,         setUserId]         = useState(null);
  const [userName,       setUserName]       = useState("");

  // Generation lock: while a chatbox is planning/producing, block service switches,
  // clicks elsewhere, and page unload so the in-flight job isn't orphaned on the front end.
  const [busy,        setBusy]        = useState(false);
  const [busyStatus,  setBusyStatus]  = useState("");
  const [busyProgress, setBusyProgress] = useState(null); // { step, total } during produce; null = indeterminate
  const reportBusy = useCallback((b, s, prog) => { setBusy(b); if (b) { setBusyStatus(s || "Creating your video…"); setBusyProgress(prog ?? null); } }, []);

  // Resume an intended destination saved before Google sign-in (e.g. a plan checkout the
  // visitor clicked while logged out). OAuth always lands on /dashboard, so we redirect here.
  useEffect(() => {
    const next = localStorage.getItem("vq_post_login");
    if (next) { localStorage.removeItem("vq_post_login"); navigate(next); }
  }, [navigate]);

  // Warn on refresh / tab close / external navigation while a job is running.
  useEffect(() => {
    if (!busy) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  useEffect(() => {
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

  return (
    <AppLayout>
      <style>{`
        @keyframes pv-spin { to { transform: rotate(360deg); } }
        /* Tab header sits flush on top of the chatbox: flatten the box's top edge so the two read as one card. */
        .vq-chatbox { border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; border-top: none !important; }
      `}</style>

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
            // Portaled to document.body (outside the app font scope) — set the font here so
            // children inherit it instead of the browser-default serif.
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.14)", borderTopColor: AI, borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text, fontFamily: "'Outfit',sans-serif", textAlign: "center", padding: "0 24px" }}>
            {busyStatus || "Creating your video…"}
          </div>
          {/* Step progress (moved here from the inline chatbox bars) — shown during produce */}
          {busyProgress && busyProgress.total > 0 && (
            <div style={{ display: "flex", gap: 5, width: 340, maxWidth: "80vw" }}>
              {Array.from({ length: busyProgress.total }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= busyProgress.step ? AI : "rgba(255,255,255,0.14)", transition: "background 0.3s" }} />
              ))}
            </div>
          )}
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
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px 20px" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, letterSpacing: "-0.02em" }}>
              {userName ? `What are we making, ${userName}?` : "What are we making today?"}
            </h1>
            <p style={{ fontSize: 14, marginTop: 8, color: T.muted }}>
              Pick a video type, then describe your idea.
            </p>
          </div>

          {/* Service tabs — sit inside the create surface as the chatbox header (connected to the box below). */}
          <div style={{
            display: "flex", gap: 14, alignItems: "center",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: "18px 18px 0 0",
            padding: "0 16px", overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap",
          }}>
            {SERVICES.map(svc => {
              const active = selected === svc.id;
              return (
                <button key={svc.id} onClick={() => pickService(svc)} disabled={busy}
                  style={{
                    background: "none", border: "none", borderBottom: `2px solid ${active ? svc.accent : "transparent"}`,
                    marginBottom: -1, paddingTop: 14, paddingBottom: 13, cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                    color: active ? "#fff" : T.muted, display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
                    opacity: busy && !active ? 0.5 : 1, transition: "color 0.15s",
                  }}>
                  <svc.Icon size={15} color={active ? svc.accent : T.muted} />{svc.label}
                </button>
              );
            })}
          </div>

          {/* Chatbox (morphs per selected service) — its box top is flattened to merge with the tabs above. */}
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

        {/* Samples — admin-curated showcase of what each service produces */}
        <SamplesGrid />
      </div>
    </AppLayout>
  );
}
