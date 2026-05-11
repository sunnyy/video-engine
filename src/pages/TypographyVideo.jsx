import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { generateTypographyVideo } from "../services/ai/generateTypographyVideo";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject, updateProject, deleteProject } from "../services/projects/projectService";
import { useProjectsStore } from "../store/useProjectsStore";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import VoiceSelector from "../ui/VoiceSelector";
import { ProjectCard } from "./Videos";

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "hindi",   label: "Hindi"   },
];

const LOADING_STEPS = {
  splitting: "Splitting your script…",
  designing: "Designing visuals…",
  voiceover: "Generating voiceover…",
};

const sectionLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
  textTransform: "uppercase", marginBottom: 10, color: "#666680",
};

/* ── Generator form ── */
function GeneratorForm() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);

  const [inputMode,       setInputMode]       = useState("topic");
  const [topic,           setTopic]           = useState("");
  const [script,          setScript]          = useState("");
  const [language,        setLanguage]        = useState("english");
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [stopSignal,      setStopSignal]      = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [step,            setStep]            = useState(null);
  const [error,           setError]           = useState("");

  const stepMessage = LOADING_STEPS[step] || "Building your reel…";
  const inputValue  = inputMode === "topic" ? topic : script;
  const canGenerate = !!(inputValue.trim() && selectedVoiceId && !loading);

  const handleRunClick = async () => {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.typography_video;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  };

  const handleRun = async () => {
    setCreditModal(null);
    setError("");
    setLoading(true);
    setStep("splitting");

    const useTopic = inputMode === "topic";
    const nameText = useTopic ? topic.trim() : (script.trim().slice(0, 60) || "Typography Video");
    let projectId;

    try {
      const placeholder = buildSafeProject({
        meta:     { orientation: "9:16", mode: "faceless" },
        script:   { text: "" },
        audio:    { tts: null, music: null },
        beats:    [],
        workflow: { script_completed: false, beats_initialized: false },
      });
      const saved = await createProject({
        name:        nameText,
        rawAI:       {},
        safeProject: placeholder,
        source:      "typography",
      });
      projectId = saved.id;

      setStep("designing");
      const result = await generateTypographyVideo({
        topic:    useTopic ? topic.trim() : null,
        script:   useTopic ? null : script.trim(),
        language,
        audience: "general",
        voiceId:  selectedVoiceId,
      });

      const safeProject = buildSafeProject({
        meta:     result.meta,
        script:   result.script,
        audio:    result.audio,
        beats:    result.beats,
        workflow: result.workflow,
      });

      await updateProject(projectId, safeProject, {
        raw_ai_json: JSON.stringify({
          language,
          video_type:   "typography",
          generated_at: new Date().toISOString(),
        }),
      });

      fetchCredits();
      navigate(`/editor/${projectId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Generation failed. Please try again.");
      if (projectId) deleteProject(projectId).catch(() => {});
    }

    setLoading(false);
    setStep(null);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px", maxWidth: 680, width: "100%" }}>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 32,
          background: "rgba(8,8,13,0.94)", backdropFilter: "blur(10px)",
        }}>
          <style>{`
            @keyframes tr-spin { to { transform: rotate(360deg); } }
            @keyframes tr-pulse {
              0%,100% { opacity: 0.3; transform: scale(0.9); }
              50%     { opacity: 0.7; transform: scale(1.1); }
            }
          `}</style>
          <div style={{ position: "relative", width: 88, height: 88 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "2px solid rgba(124,92,252,0.15)",
              borderTopColor: "#7c5cfc",
              animation: "tr-spin 1.3s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 20, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,92,252,0.45) 0%, transparent 100%)",
              animation: "tr-pulse 1.8s ease-in-out infinite",
            }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
              {stepMessage}
            </div>
            <div style={{ fontSize: 11, color: "#9090b0", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
              THIS MAY TAKE A MOMENT
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: 24, padding: "12px 16px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          fontSize: 13, color: "#f87171",
        }}>
          {error}
        </div>
      )}

      {/* STEP 1 — Input */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabel}>Step 1 — What do you want to say?</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { mode: "topic",  label: "📝  Enter Topic"  },
            { mode: "script", label: "✏️  Enter Script" },
          ].map(({ mode, label }) => {
            const active = inputMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                disabled={loading}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 10,
                  border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(124,92,252,0.18)" : "#111118",
                  color: active ? "#a78bfa" : "#555570",
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {inputMode === "topic" ? (
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canGenerate && handleRun()}
            placeholder="What's your video about?"
            disabled={loading}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#111118", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "13px 16px", fontSize: 14,
              color: "#e8e8f0", outline: "none",
            }}
          />
        ) : (
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="Paste your script here..."
            rows={6}
            disabled={loading}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#111118", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "13px 16px", fontSize: 14,
              color: "#e8e8f0", outline: "none", resize: "vertical",
              fontFamily: "inherit", lineHeight: 1.5,
            }}
          />
        )}
      </div>

      {/* STEP 2 — Language */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabel}>Step 2 — Language</div>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGUAGES.map(lang => {
            const active = language === lang.value;
            return (
              <button
                key={lang.value}
                onClick={() => { setLanguage(lang.value); setStopSignal(s => s + 1); }}
                disabled={loading}
                style={{
                  padding: "8px 22px", borderRadius: 999, border: "none",
                  background: active ? "#7c5cfc" : "rgba(255,255,255,0.06)",
                  color: active ? "#fff" : "#8080a0",
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3 — Voice */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionLabel}>Step 3 — Voice</div>
        <VoiceSelector
          language={language}
          selectedVoiceId={selectedVoiceId}
          onSelect={setSelectedVoiceId}
          stopSignal={stopSignal}
        />
      </div>

      <button
        onClick={handleRunClick}
        disabled={!canGenerate}
        style={{
          width: "100%", padding: "14px 0",
          borderRadius: 12, border: "none",
          background: canGenerate ? "#f5c518" : "rgba(245,197,24,0.12)",
          color: canGenerate ? "#0b0b10" : "#44441a",
          fontSize: 15, fontWeight: 800,
          fontFamily: "'Outfit', sans-serif",
          cursor: canGenerate ? "pointer" : "not-allowed",
          transition: "all 0.2s", letterSpacing: "0.01em",
        }}
      >
        {loading ? stepMessage : "Create Typography Video · 15 credits →"}
      </button>

      {creditModal && (
        <CreditConfirmModal
          service="Typography Video"
          breakdown={creditModal.breakdown}
          total={creditModal.total}
          balance={creditModal.balance}
          onConfirm={handleRun}
          onCancel={() => setCreditModal(null)}
          onTopUp={() => { setCreditModal(null); window.location.href = "/credits"; }}
        />
      )}
    </div>
  );
}

/* ── Listing ── */
function VideoListing() {
  const { projects, loading, fetchProjects, removeProject } = useProjectsStore();

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      removeProject(id);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const typographyProjects = projects.filter(p => p.source === "typography");

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "tr-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (typographyProjects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>✍️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No typography videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to generate your first one</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {typographyProjects.map(p => (
          <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function TypographyVideo() {
  const [tab, setTab] = useState("videos");

  const tabs = [
    { id: "videos",  label: "My Videos"  },
    { id: "create",  label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes tr-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Typography Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px",
                  border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "videos" ? <VideoListing /> : <GeneratorForm />}
      </div>
    </AppLayout>
  );
}
