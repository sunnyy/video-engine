import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateStructuredShort } from "../services/ai/generateStructuredShort";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject, updateProject, deleteProject } from "../services/projects/projectService";
import { getCredits } from "../services/credits/creditService";
import { estimateCreditCost, CREDIT_COSTS } from "../core/utils/creditCosts";
import { serverFetch } from "../services/serverApi";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";

/* ── Options ──────────────────────────────────────────────── */


const LANGUAGES = [
  { value: "auto", label: "Auto — match topic" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "arabic", label: "Arabic" },
  { value: "portuguese", label: "Portuguese" },
];

const MODES = [
  { value: "faceless", label: "Faceless" },
  { value: "talking_head", label: "Talking Head" },
];

const AUDIENCES = [
  { value: "general", label: "General Audience" },
  { value: "teens", label: "Teens / Gen Z" },
  { value: "professionals", label: "Professionals" },
  { value: "creators", label: "Creators / Builders" },
  { value: "parents", label: "Parents / Families" },
];

const TONES = [
  { value: "auto", label: "Auto — AI picks" },
  { value: "bold", label: "Bold / Aggressive" },
  { value: "conversational", label: "Conversational" },
  { value: "educational", label: "Educational" },
  { value: "funny", label: "Funny / Witty" },
  { value: "emotional", label: "Emotional / Empathy" },
];

const ORIENTATIONS = [
  { value: "9:16", label: "9:16  — Vertical (TikTok / Reels)" },
  { value: "16:9", label: "16:9  — Horizontal (YouTube)" },
];

/* ── Small form helpers ───────────────────────────────────── */

function Label({ children }) {
  return (
    <label
      className="block text-[14px] font-semibold uppercase tracking-wider text-[#8888a8] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#21213a] border border-[rgba(255,255,255,0.12)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-[40px] h-[22px] rounded-full relative transition-all shrink-0 mt-[2px] border-0 cursor-pointer"
      style={{ background: value ? "#7c5cfc" : "#252540", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: value ? 20 : 3,
          width: 14,
          height: 14,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

/* ── Advanced summary line ────────────────────────────────── */
function buildAdvancedSummary({ tone, audience, brandColor }) {
  const parts = [];
  if (tone !== "auto") parts.push(TONES.find((o) => o.value === tone)?.label || tone);
  if (audience !== "general") parts.push(AUDIENCES.find((o) => o.value === audience)?.label || audience);
  if (brandColor) parts.push("Brand color set");
  return parts.length ? parts.join(" · ") : "All defaults — AI decides";
}

/* ── Main component ───────────────────────────────────────── */

export default function AIGenerator() {
  const navigate = useNavigate();

  // Visible fields
  const [topic, setTopic] = useState("");
  const [orientation, setOrientation] = useState("9:16");


  // Advanced fields (collapsed by default)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [audience, setAudience] = useState("general");
  const [tone, setTone] = useState("auto");
  const [mode, setMode] = useState("faceless");
  const [language, setLanguage] = useState("english");
  const [brandColor, setBrandColor] = useState("");
  const [generateImages, setGenerateImages] = useState(true);
  const [generateTTS, setGenerateTTS] = useState(true);
  const [ttsVoice, setTtsVoice] = useState("female_warm");

  // Talking head mode state
  const [thVideoFile, setThVideoFile] = useState(null);
  const [thVideoUrl,  setThVideoUrl]  = useState(null);  // local blob preview
  const videoInputRef = useRef(null);

  const [loading,     setLoading]     = useState(false);
  const [loadingStep, setLoadingStep] = useState(null); // null | 'transcribing' | 'uploading' | 'script' | 'voice'
  const [error,       setError]       = useState("");

  // Credit pre-flight
  const [creditModal, setCreditModal] = useState(null); // null | { estimate, balance, canAfford }

  const handleScratch = async () => {
    setLoading(true);
    try {
      const defaultBeat = {
        id: crypto.randomUUID(),
        order: 0,
        layout: "FullBleed",
        layoutBackground: { type: "color", value: "#111118" },
        zones: { z1: { type: "asset", content: {}, style: {}, background: {} } },
        caption: { show: true, text: "", style: "wordBlaze", position: 80, emphasis_words: [] },
        spoken: "",
        intent: "explanation",
        energy: 0.5,
        duration_sec: 4,
        start_sec: 0,
        end_sec: 4,
        transition: { type: "cut", duration: 0.3 },
        overlays: [],
        audio_cues: [],
        blocks: [],
      };
      const safeProject = buildSafeProject({
        meta: { orientation: "9:16", mode: "faceless", fps: 25, width: 1080, height: 1920 },
        script: { text: "", emotionalArc: "" },
        audio: { tts: null, music: null },
        beats: [defaultBeat],
        workflow: { script_completed: false, avatar_completed: false, beats_initialized: false },
      });
      const saved = await createProject({ name: "Untitled Project", rawAI: {}, safeProject });
      navigate(`/editor/${saved.id}`);
    } catch (err) {
      setError(err.message || "Failed to create project.");
    }
    setLoading(false);
  };

  // Step 1 — validate inputs and show cost estimate before starting
  const handlePreFlight = async () => {
    setError("");

    if (mode === "talking_head") {
      if (!thVideoFile) { setError("Please upload your talking head video."); return; }
    } else {
      if (!topic.trim()) { setError("Please enter a topic."); return; }
    }

    let estimate;
    if (mode === "talking_head") {
      const C = CREDIT_COSTS;
      const beatCount = 8;
      const images    = generateImages ? beatCount * C.ai_image : 0;
      const total = C.base_generation + C.transcription + images + C.export_local;
      estimate = { total, breakdown: { base: C.base_generation, transcription: C.transcription, images, export: C.export_local, beatCount } };
    } else {
      estimate = estimateCreditCost("medium", { tts: generateTTS, aiImages: generateImages });
    }

    const credits = await getCredits();
    const balance = credits?.balance ?? 0;
    setCreditModal({ estimate, balance, canAfford: balance >= estimate.total });
  };

  // Step 2 — user confirmed, run the fully-automated generation pipeline
  const handleGenerate = async () => {
    setCreditModal(null);
    setError("");
    setLoading(true);
    setLoadingStep("script");

    const effectiveBrandColor = brandColor.trim() || null;
    let talkingHead      = null;
    let effectiveTopic   = topic.trim();
    let avatarSrc        = null; // final avatar video URL, set by end of each TH path

    /* ─────────────────────────── Upload Video path ─────────────────────── */
    if (mode === "talking_head") {
      try {
        // 1. Transcribe
        setLoadingStep("transcribing");
        const formData = new FormData();
        formData.append("video", thVideoFile);
        const transRes  = await serverFetch("/api/transcribe", { method: "POST", body: formData });
        const transText = await transRes.text();
        if (!transRes.ok) throw new Error(JSON.parse(transText)?.error || "Transcription failed");
        const transData = JSON.parse(transText);
        if (!effectiveTopic) effectiveTopic = transData.transcript.slice(0, 80);
        talkingHead = { type: "upload", transcript: transData.transcript, segments: transData.segments };

        // 2. Compress + upload video via server (bypasses Supabase client-side bucket size limit)
        setLoadingStep("uploading");
        const uploadForm = new FormData();
        uploadForm.append("video", thVideoFile);
        const uploadRes  = await serverFetch("/api/upload-avatar", { method: "POST", body: uploadForm });
        const uploadText = await uploadRes.text();
        if (!uploadRes.ok) throw new Error(JSON.parse(uploadText)?.error || "Video upload failed");
        avatarSrc = JSON.parse(uploadText).url;
      } catch (err) {
        setError(err.message || "Video processing failed. Please try again.");
        setLoading(false); setLoadingStep(null);
        return;
      }
    }

    let projectId;
    try {
      const projectName = (effectiveTopic || "Talking Head Video").slice(0, 60);
      const placeholder = buildSafeProject({
        meta: { orientation, mode, language, brand_color: effectiveBrandColor, audience, tone },
        script: { text: "", emotionalArc: [] },
        dna: null, audio: { tts: null, music: null }, beats: [],
        workflow: { script_completed: false, avatar_completed: false, beats_initialized: false },
      });
      const saved = await createProject({ name: projectName, rawAI: {}, safeProject: placeholder });
      projectId = saved.id;

      /* Script + images (no TTS for talking head — audio comes from uploaded video) */
      setLoadingStep("script");
      const needsTTS = mode !== "talking_head" && generateTTS;
      const aiResult = await generateStructuredShort({
        topic: effectiveTopic,
        context: "",
        mode, language, orientation,
        generateImages,
        generateTTS: needsTTS,
        ttsVoice,
        brandColor: effectiveBrandColor,
        audience, tone, projectId,
        talkingHead,
        onProgress: (step) => {
          if (step === "voiceover") setLoadingStep("voice");
        },
      });

      const safeProject = buildSafeProject({
        meta: { orientation, mode, language, brand_color: effectiveBrandColor, audience, tone },
        script: { text: aiResult.script, emotionalArc: aiResult.meta?.emotionalArc },
        dna: aiResult.meta?.dna || null,
        audio: aiResult.audio || { tts: null, music: null },
        beats: aiResult.beats,
        workflow: { script_completed: true, avatar_completed: !!avatarSrc, beats_initialized: true },
        talkingHead: talkingHead ? { type: talkingHead.type } : null,
        avatar: avatarSrc ? { src: avatarSrc, type: "video" } : null,
      });

      await updateProject(projectId, safeProject);
      navigate(`/editor/${projectId}`, { state: { showReviewPrompt: true } });
    } catch (err) {
      console.error(err);
      setError(err.message || "Generation failed. Please try again.");
      if (projectId) deleteProject(projectId).catch(() => {});
    }
    setLoading(false);
    setLoadingStep(null);
  };

  const STEP_MESSAGE_POOLS = {
    transcribing: [
      "Listening closely…",
      "Absorbing every word…",
      "Reading between the frames…",
      "Decoding your story…",
    ],
    uploading: [
      "Preparing your content…",
      "Beaming it up…",
      "Syncing to the cloud…",
      "Securing your footage…",
    ],
    script: [
      "Crafting your narrative…",
      "Shaping the story arc…",
      "Painting with motion…",
      "Composing the sequence…",
      "Assembling the moments…",
      "Directing the vision…",
      "Sculpting your message…",
      "Weaving the timeline…",
      "Designing the experience…",
      "Building something great…",
      "Conjuring the magic…",
      "Making it cinematic…",
    ],
    voice: [
      "Finding the perfect voice…",
      "Breathing life into words…",
      "Tuning the performance…",
      "Giving it a voice…",
    ],
    _default: [
      "Igniting the engine…",
      "Warming up the studio…",
      "Charging the creative core…",
      "Calibrating the magic…",
    ],
  };

  const [msgIndex, setMsgIndex] = useState(0);
  const msgStepRef = useRef(null);

  useEffect(() => {
    if (!loading) { setMsgIndex(0); msgStepRef.current = null; return; }
    if (loadingStep !== msgStepRef.current) { setMsgIndex(0); msgStepRef.current = loadingStep; }
    const pool = STEP_MESSAGE_POOLS[loadingStep] ?? STEP_MESSAGE_POOLS._default;
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % pool.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [loading, loadingStep]);

  const _pool = STEP_MESSAGE_POOLS[loadingStep] ?? STEP_MESSAGE_POOLS._default;
  const currentLoadingMessage = _pool[msgIndex % _pool.length];

  const advancedSummary = buildAdvancedSummary({
    tone,
    audience,
    brandColor: brandColor.trim(),
  });

  return (
    <div className="min-h-screen flex flex-col text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* ── Header ── */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-3 flex items-center justify-between shrink-0" style={{ background: "#111118" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/videos")}
            className="text-[#77777f] hover:text-[#e8e8f0] transition-colors text-[14px] bg-transparent border-0 cursor-pointer">
            ← Videos
          </button>
          <div className="w-[1px] h-[18px] bg-[rgba(255,255,255,0.08)]" />
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
          <span className="text-[15px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne',sans-serif" }}>
            Create Video
          </span>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 overflow-y-auto">
      <div className="w-full max-w-[520px] flex flex-col gap-6">

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            background: "rgba(8,8,13,0.93)",
            backdropFilter: "blur(10px)",
          }}
        >
          <style>{`
            @keyframes ai-spin-cw  { to { transform: rotate(360deg);  } }
            @keyframes ai-spin-ccw { to { transform: rotate(-360deg); } }
            @keyframes ai-pulse-glow {
              0%, 100% { opacity: 0.35; transform: scale(0.92); }
              50%       { opacity: 0.75; transform: scale(1.08); }
            }
            @keyframes ai-dot {
              0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
              40%            { opacity: 1;   transform: scale(1.2); }
            }
            @keyframes ai-fade-msg {
              0%   { opacity: 0; transform: translateY(10px); }
              12%  { opacity: 1; transform: translateY(0);    }
              88%  { opacity: 1; transform: translateY(0);    }
              100% { opacity: 0; transform: translateY(-8px); }
            }
          `}</style>

          <div style={{ position: "relative", width: 128, height: 128 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2.5px solid rgba(124,92,252,0.18)",
                borderTopColor: "#7c5cfc",
                borderRightColor: "rgba(124,92,252,1)",
                animation: "ai-spin-cw 1.6s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 18,
                borderRadius: "50%",
                border: "2px solid rgba(167,139,250,0.12)",
                borderBottomColor: "#a78bfa",
                borderLeftColor: "rgba(167,139,250,1)",
                animation: "ai-spin-ccw 1.1s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 36,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(124,92,252,0.55) 0%, rgba(124,92,252,0.1) 60%, transparent 100%)",
                animation: "ai-pulse-glow 2.2s ease-in-out infinite",
              }}
            />
          </div>

          <div style={{ textAlign: "center", minHeight: 72 }}>
            <div
              key={currentLoadingMessage}
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#e8e8f0",
                fontFamily: "'Syne', sans-serif",
                marginBottom: 10,
                animation: "ai-fade-msg 3s ease forwards",
              }}
            >
              {currentLoadingMessage}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#9090b0",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
              }}
            >
              THIS MAY TAKE A MOMENT
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#7c5cfc",
                  animation: `ai-dot 1.4s ease-in-out ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

        {/* Header */}
        <div>
          <h2 className="text-[22px] font-bold text-[#e8e8f0] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
            Create New Video
          </h2>
        </div>

        {/* ── Step 1: Mode selection ── */}
        <div className="flex flex-col gap-2">
          <Label>Video Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "faceless",     icon: "🎬", title: "Faceless",      sub: "AI builds visuals automatically" },
              { value: "talking_head", icon: "🎤", title: "Talking Head",  sub: "Upload your video, we build around it" },
            ].map(({ value, icon, title, sub }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className="flex flex-col items-start gap-1.5 px-4 py-4 rounded-[12px] border cursor-pointer transition-all text-left"
                style={mode === value
                  ? { background: "rgba(124,92,252,0.14)", borderColor: "#7c5cfc" }
                  : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <span className="text-[22px] leading-none">{icon}</span>
                <span className="text-[14px] font-bold leading-tight" style={{ color: mode === value ? "#e8e8f0" : "#aaaacc" }}>{title}</span>
                <span className="text-[11px] leading-snug" style={{ color: mode === value ? "#9b8ff0" : "#666688" }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Step 2: Content input ── */}
        {mode === "faceless" ? (
          <div>
            <Label>Topic</Label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this video about? Be specific."
              rows={3}
              className="w-[95%] bg-[#11111a] border border-[rgba(255,255,255,0.12)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none transition-colors"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Label>Avatar Video</Label>
            <p className="text-[12px] text-[#8888a8] leading-relaxed -mt-1">
              We'll extract your script automatically and build a produced video around it. Self-recorded or AI-generated (HeyGen, D-ID, Synthesia, etc.) both work.
            </p>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setThVideoFile(f);
                setThVideoUrl(URL.createObjectURL(f));
              }}
            />
            {!thVideoUrl ? (
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full py-8 rounded-[10px] border-2 border-dashed border-[rgba(124,92,252,0.3)] text-[13px] text-[#8888a8] hover:border-[rgba(124,92,252,0.6)] hover:text-[#a89bfa] transition-all cursor-pointer bg-transparent"
              >
                Click to select video
              </button>
            ) : (
              <div className="relative rounded-[10px] overflow-hidden border border-[rgba(255,255,255,0.1)]">
                <video src={thVideoUrl} className="w-full max-h-[160px] object-cover" controls />
                <button
                  onClick={() => { setThVideoFile(null); setThVideoUrl(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgba(0,0,0,0.7)] text-white text-xs flex items-center justify-center border border-white/20 cursor-pointer"
                >×</button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Basic settings ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Orientation</Label>
            <Select value={orientation} onChange={setOrientation} options={ORIENTATIONS} />
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onChange={setLanguage} options={LANGUAGES} />
          </div>
        </div>

        {/* ── Step 4: AI Options (faceless only) ── */}
        {mode === "faceless" && (
          <div className="flex flex-col gap-3 p-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0E0D22]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[#e8e8f0]">Auto-generate images</div>
                <span className="text-[12px] text-[#aaaaae]">Uses credits.</span>
              </div>
              <Toggle value={generateImages} onChange={setGenerateImages} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[#e8e8f0]">Generate AI voice (TTS)</div>
                <span className="text-[12px] text-[#aaaaae]">Uses credits.</span>
              </div>
              <Toggle value={generateTTS} onChange={setGenerateTTS} />
            </div>
            {generateTTS && (
              <div className="grid grid-cols-2 gap-[6px]">
                {[
                  { key: "female_warm",  label: "Female — Warm",  sub: "Nova"    },
                  { key: "female_clear", label: "Female — Clear", sub: "Shimmer" },
                  { key: "male_deep",    label: "Male — Deep",    sub: "Onyx"    },
                  { key: "male_neutral", label: "Male — Neutral", sub: "Echo"    },
                ].map(({ key, label, sub }) => (
                  <button key={key} onClick={() => setTtsVoice(key)}
                    className="flex flex-col items-start px-3 py-[7px] rounded-[8px] border cursor-pointer transition-all text-left"
                    style={ttsVoice === key
                      ? { background: "rgba(124,92,252,0.12)", borderColor: "#7c5cfc" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <span className="text-[12px] font-semibold" style={{ color: ttsVoice === key ? "#a78bfa" : "#d8d8f0" }}>{label}</span>
                    <span className="text-[10px] font-mono"     style={{ color: ttsVoice === key ? "#7c5cfc" : "#8888a8" }}>{sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Talking head: images toggle — still useful for non-avatar beats */}
        {mode === "talking_head" && (
          <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0E0D22]">
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[#e8e8f0]">Auto-generate images</div>
              <span className="text-[12px] text-[#aaaaae]">For non-avatar beats. Uses credits.</span>
            </div>
            <Toggle value={generateImages} onChange={setGenerateImages} />
          </div>
        )}

        {/* ── Step 5: Advanced Options (collapsed) ── */}
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.12)] overflow-hidden">
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#16162a] cursor-pointer border-0 text-left transition-colors hover:bg-[#1c1c32]"
          >
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#8888a8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Advanced Options
            </span>
            <span style={{ color: "#8888a8", fontSize: 12, display: "inline-block", transition: "transform 0.2s", transform: advancedOpen ? "rotate(180deg)" : "none" }}>▾</span>
          </button>
          {!advancedOpen && (
            <div className="px-4 py-[10px] bg-[#13132a] border-t border-[rgba(255,255,255,0.08)]">
              <span className="text-[12px] text-[#8888a8]">{advancedSummary}</span>
            </div>
          )}
          {advancedOpen && (
            <div className="px-4 pb-4 pt-3 bg-[#13132a] border-t border-[rgba(255,255,255,0.08)] flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={audience} onChange={setAudience} options={AUDIENCES} />
                </div>
                <div>
                  <Label>Tone</Label>
                  <Select value={tone} onChange={setTone} options={TONES} />
                </div>
              </div>
              <div>
                <Label>
                  Brand Color <span className="text-[#8888a8] normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={brandColor || "#7c5cfc"} onChange={(e) => setBrandColor(e.target.value)}
                    className="w-[36px] h-[36px] rounded-[6px] border border-[rgba(255,255,255,0.12)] cursor-pointer bg-[#21213a] p-[2px]" />
                  <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#optional"
                    className="flex-1 bg-[#21213a] border border-[rgba(255,255,255,0.12)] rounded-[8px] px-3 py-[8px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors font-mono" />
                  {brandColor && (
                    <button onClick={() => setBrandColor("")} className="text-[#8888a8] hover:text-[#e8e8f0] text-[16px] leading-none border-0 bg-transparent cursor-pointer">×</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-[14px] text-[#f87171] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[8px] px-3 py-2">
            {error}
          </div>
        )}

        {/* Generate button */}
        {(() => {
          const disabled = loading
            || (mode === "faceless"     && !topic.trim())
            || (mode === "talking_head" && !thVideoFile);
          return (
            <button onClick={handlePreFlight} disabled={disabled}
              className="w-full rounded-[10px] py-[13px] text-[14px] font-bold transition-all"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: disabled ? "#252540" : "#f0e040",
                color:      disabled ? "#8888a8" : "#0f0f18",
                cursor:     disabled ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Generating…" : "Generate Video"}
            </button>
          );
        })()}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.09)]" />
          <span className="text-[11px] text-[#8888a8]">or</span>
          <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.09)]" />
        </div>

        <button onClick={handleScratch} disabled={loading}
          className="w-full py-[9px] rounded-[8px] text-[13px] font-bold border border-[rgba(255,255,255,0.14)] text-[#b0b0cc] hover:text-[#e8e8f0] hover:border-[rgba(255,255,255,0.2)] bg-transparent cursor-pointer transition-all"
        >
          Start from Scratch — Empty Project
        </button>
      </div>

      {/* ── Credit pre-flight modal ── */}
      {creditModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(6,6,14,0.88)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#13132a", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18, padding: 32, width: "100%", maxWidth: 420,
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            {/* Header */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                Credit Estimate
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>
                {creditModal.canAfford ? "Ready to generate" : "Insufficient credits"}
              </div>
            </div>

            {/* Breakdown table */}
            <div style={{ background: "#0e0e1e", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                ["Base generation", creditModal.estimate.breakdown.base],
                ...(creditModal.estimate.breakdown.tts > 0           ? [["AI voice (TTS)",       creditModal.estimate.breakdown.tts]]           : []),
                ...(creditModal.estimate.breakdown.images > 0        ? [[`AI images (${creditModal.estimate.breakdown.beatCount} beats × 2)`, creditModal.estimate.breakdown.images]] : []),
                ...(creditModal.estimate.breakdown.transcription > 0 ? [["Video transcription",   creditModal.estimate.breakdown.transcription]] : []),
                ["Export", creditModal.estimate.breakdown.export],
              ].map(([label, cost], i, arr) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  fontSize: 14, color: "rgba(255,255,255,0.65)",
                }}>
                  <span>{label}</span>
                  <span style={{ color: cost === "—" ? "#666" : "#a78bfa", fontWeight: 600 }}>{cost === "—" ? "—" : `⚡ ${cost}`}</span>
                </div>
              ))}
              {/* Total */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 16px", borderTop: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(124,92,252,0.07)",
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0" }}>Estimated Total</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#7c5cfc" }}>⚡ {creditModal.estimate.total}</span>
              </div>
            </div>

            {/* Balance row */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", borderRadius: 10,
              background: creditModal.canAfford ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.08)",
              border: `1px solid ${creditModal.canAfford ? "rgba(34,197,94,0.2)" : "rgba(249,115,22,0.25)"}`,
            }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Your balance</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: creditModal.canAfford ? "#22c55e" : "#f97316" }}>
                ⚡ {creditModal.balance}
              </span>
            </div>

            {/* Insufficient warning */}
            {!creditModal.canAfford && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                You need <strong style={{ color: "#f97316" }}>⚡ {creditModal.estimate.total - creditModal.balance} more credits</strong> to generate this video.
                Disable AI images or TTS above to reduce cost, or purchase more credits.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setCreditModal(null)}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 9, fontSize: 14, fontWeight: 600,
                  background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#8888a8", cursor: "pointer",
                }}
              >
                Cancel
              </button>

              {creditModal.canAfford ? (
                <button
                  onClick={handleGenerate}
                  style={{
                    flex: 2, padding: "11px 0", borderRadius: 9, fontSize: 14, fontWeight: 700,
                    background: "#f0e040", border: "none", color: "#0f0f18", cursor: "pointer",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  Generate — ⚡ {creditModal.estimate.total}
                </button>
              ) : (
                <button
                  onClick={() => setCreditModal(null)}
                  style={{
                    flex: 2, padding: "11px 0", borderRadius: 9, fontSize: 14, fontWeight: 700,
                    background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.35)",
                    color: "#f97316", cursor: "pointer",
                  }}
                >
                  Purchase Credits
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
