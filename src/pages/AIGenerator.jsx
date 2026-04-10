import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateStructuredShort } from "../services/ai/generateStructuredShort";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject, updateProject, deleteProject } from "../services/projects/projectService";

/* ── Options ──────────────────────────────────────────────── */

const VIDEO_TYPES = [
  { value: "auto", label: "Auto — AI decides" },
  { value: "viral", label: "Viral / Hook" },
  { value: "entertainment", label: "Entertainment" },
  { value: "news", label: "News" },
  { value: "explainer", label: "Explainer" },
  { value: "opinion", label: "Opinion / Hot Take" },
  { value: "story", label: "Story / Narrative" },
];

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

const DURATIONS = [
  { value: "short", label: "Short  (15–30 sec)" },
  { value: "medium", label: "Medium (30–60 sec)" },
  { value: "long", label: "Long   (60+ sec)" },
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
function buildAdvancedSummary({ tone, videoType, mode, audience, brandColor }) {
  const parts = [];
  if (videoType !== "auto") parts.push(VIDEO_TYPES.find((o) => o.value === videoType)?.label || videoType);
  if (tone !== "auto") parts.push(TONES.find((o) => o.value === tone)?.label || tone);
  if (mode !== "faceless") parts.push("Talking Head");
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
  const [durationCategory, setDurationCategory] = useState("short");

  // Advanced fields (collapsed by default)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [audience, setAudience] = useState("general");
  const [tone, setTone] = useState("auto");
  const [videoType, setVideoType] = useState("auto");
  const [mode, setMode] = useState("faceless");
  const [language, setLanguage] = useState("english");
  const [brandColor, setBrandColor] = useState("");
  const [generateImages, setGenerateImages] = useState(true);
  const [generateTTS, setGenerateTTS] = useState(true);
  const [ttsVoice, setTtsVoice] = useState("female_warm");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError("");
    setLoading(true);

    // "auto" values get passed as-is — the prompt instructs AI to infer them
    const effectiveBrandColor = brandColor.trim() || null;

    let projectId;
    try {
      const placeholder = buildSafeProject({
        meta: { orientation, mode, videoType, language, brand_color: effectiveBrandColor, audience, tone },
        script: { text: "", emotionalArc: [] },
        dna: null,
        audio: { tts: null, music: null },
        beats: [],
        workflow: { script_completed: false, avatar_completed: false, beats_initialized: false },
      });
      const saved = await createProject({ name: topic.slice(0, 60), rawAI: {}, safeProject: placeholder });
      projectId = saved.id;

      const aiResult = await generateStructuredShort({
        topic,
        context: "",
        videoType,
        mode,
        language,
        orientation,
        durationCategory,
        generateImages,
        generateTTS,
        ttsVoice,
        brandColor: effectiveBrandColor,
        audience,
        tone,
        projectId,
        onProgress: () => {},
      });

      const safeProject = buildSafeProject({
        meta: { orientation, mode, videoType, language, brand_color: effectiveBrandColor, audience, tone },
        script: { text: aiResult.script, emotionalArc: aiResult.meta?.emotionalArc },
        dna: aiResult.meta?.dna || null,
        audio: aiResult.audio || { tts: null, music: null },
        beats: aiResult.beats,
        workflow: { script_completed: true, avatar_completed: false, beats_initialized: true },
      });

      await updateProject(projectId, safeProject);
      navigate(`/editor/${projectId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Generation failed. Please try again.");
      if (projectId) deleteProject(projectId).catch(() => {});
    }
    setLoading(false);
  };

  const LOADING_MESSAGES = [
    "Crafting your story…",
    "Building your vision…",
    "Bringing ideas to life…",
    "Designing your moments…",
    "Weaving it all together…",
    "Shaping something great…",
    "Putting the pieces in place…",
    "Making it cinematic…",
  ];

  const [msgIdx, setMsgIdx] = useState(0);
  const msgTimer = useRef(null);

  useEffect(() => {
    if (loading) {
      setMsgIdx(0);
      msgTimer.current = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2600);
    } else {
      clearInterval(msgTimer.current);
    }
    return () => clearInterval(msgTimer.current);
  }, [loading]);

  const advancedSummary = buildAdvancedSummary({
    tone,
    videoType,
    mode,
    audience,
    brandColor: brandColor.trim(),
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "#0f0f18" }}>
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
              0%   { opacity: 0; transform: translateY(8px); }
              15%  { opacity: 1; transform: translateY(0);   }
              85%  { opacity: 1; transform: translateY(0);   }
              100% { opacity: 0; transform: translateY(-6px);}
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
              key={msgIdx}
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#e8e8f0",
                fontFamily: "'Syne', sans-serif",
                marginBottom: 10,
                animation: "ai-fade-msg 2.6s ease forwards",
              }}
            >
              {LOADING_MESSAGES[msgIdx]}
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

      <div
        className="w-full max-w-[520px] rounded-[20px] border border-[rgba(255,255,255,0.12)] p-8 flex flex-col gap-5"
        style={{ background: "#13132a" }}
      >
        {/* Header */}
        <div>
          <h2 className="text-[22px] font-bold text-[#e8e8f0] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
            Create New Video
          </h2>
          <p className="text-[14px] text-[#8888a8]">
            AI writes the script · Engine assembles the video
          </p>
        </div>

        {/* ── Visible fields ── */}

        {/* Topic */}
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

        {/* Orientation + Duration + Language */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Orientation</Label>
            <Select value={orientation} onChange={setOrientation} options={ORIENTATIONS} />
          </div>
          <div>
            <Label>Duration</Label>
            <Select value={durationCategory} onChange={setDurationCategory} options={DURATIONS} />
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onChange={setLanguage} options={LANGUAGES} />
          </div>
        </div>

        {/* ── AI Generation toggles ── */}
        <div className="flex flex-col gap-3 p-4 rounded-[12px] border bg-[#0E0D22]">
          {/* Auto-generate images */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[#e8e8f0]">Auto-generate images</div>
              <span className="text-[12px] text-[#aaaaae]">Uses credits.</span>
            </div>
            <Toggle value={generateImages} onChange={setGenerateImages} />
          </div>

          {/* Generate TTS */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[#e8e8f0]">Generate AI voice (TTS)</div>
              <span className="text-[12px] text-[#aaaaae]">Uses credits.</span>
            </div>
            <Toggle value={generateTTS} onChange={setGenerateTTS} />
          </div>

          {/* Voice picker */}
          {generateTTS && (
            <div className="grid grid-cols-2 gap-[6px]">
              {[
                { key: "female_warm", label: "Female — Warm", sub: "Nova" },
                { key: "female_clear", label: "Female — Clear", sub: "Shimmer" },
                { key: "male_deep", label: "Male — Deep", sub: "Onyx" },
                { key: "male_neutral", label: "Male — Neutral", sub: "Echo" },
              ].map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => setTtsVoice(key)}
                  className="flex flex-col items-start px-3 py-[7px] rounded-[8px] border cursor-pointer transition-all text-left"
                  style={
                    ttsVoice === key
                      ? { background: "rgba(124,92,252,0.12)", borderColor: "#7c5cfc" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                  }
                >
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: ttsVoice === key ? "#a78bfa" : "#d8d8f0" }}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: ttsVoice === key ? "#7c5cfc" : "#8888a8" }}>
                    {sub}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Advanced Options collapsible ── */}
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.12)] overflow-hidden">
          {/* Toggle header */}
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#16162a] cursor-pointer border-0 text-left transition-colors hover:bg-[#1c1c32]"
          >
            <span
              className="text-[11px] font-bold tracking-widest uppercase text-[#8888a8]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Advanced Options
            </span>
            <span
              style={{
                color: "#8888a8",
                fontSize: 12,
                transition: "transform 0.2s",
                display: "inline-block",
                transform: advancedOpen ? "rotate(180deg)" : "none",
              }}
            >
              ▾
            </span>
          </button>

          {/* Summary line when collapsed */}
          {!advancedOpen && (
            <div className="px-4 py-[10px] bg-[#13132a] border-t border-[rgba(255,255,255,0.08)]">
              <span className="text-[12px] text-[#8888a8]">{advancedSummary}</span>
            </div>
          )}

          {/* Expanded content */}
          {advancedOpen && (
            <div className="px-4 pb-4 pt-3 bg-[#13132a] border-t border-[rgba(255,255,255,0.08)] flex flex-col gap-4">
              {/* Row: Audience + Tone */}
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

              {/* Row: Video Type */}
              <div>
                <Label>Video Type</Label>
                <Select value={videoType} onChange={setVideoType} options={VIDEO_TYPES} />
              </div>

              {/* Row: Mode + Brand Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mode</Label>
                  <Select value={mode} onChange={setMode} options={MODES} />
                </div>
                <div>
                  <Label>
                    Brand Color{" "}
                    <span className="text-[#8888a8] normal-case tracking-normal font-normal">(optional)</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={brandColor || "#7c5cfc"}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-[36px] h-[36px] rounded-[6px] border border-[rgba(255,255,255,0.12)] cursor-pointer bg-[#21213a] p-[2px]"
                    />
                    <input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#optional"
                      className="flex-1 bg-[#21213a] border border-[rgba(255,255,255,0.12)] rounded-[8px] px-3 py-[8px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors font-mono"
                    />
                    {brandColor && (
                      <button
                        onClick={() => setBrandColor("")}
                        className="text-[#8888a8] hover:text-[#e8e8f0] text-[16px] leading-none border-0 bg-transparent cursor-pointer"
                        title="Clear"
                      >
                        ×
                      </button>
                    )}
                  </div>
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
        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full rounded-[10px] py-[13px] text-[14px] font-bold transition-all"
          style={{
            fontFamily: "'Syne', sans-serif",
            background: loading || !topic.trim() ? "#252540" : "#f0e040",
            color: loading || !topic.trim() ? "#8888a8" : "#0f0f18",
            cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating…" : "Generate Video"}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.09)]" />
          <span className="text-[11px] text-[#8888a8]">or</span>
          <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.09)]" />
        </div>

        {/* Start from scratch */}
        <button
          onClick={handleScratch}
          disabled={loading}
          className="w-full py-[9px] rounded-[8px] text-[13px] font-bold border border-[rgba(255,255,255,0.14)] text-[#b0b0cc] hover:text-[#e8e8f0] hover:border-[rgba(255,255,255,0.2)] bg-transparent cursor-pointer transition-all"
        >
          Start from Scratch — Empty Project
        </button>
      </div>
    </div>
  );
}
