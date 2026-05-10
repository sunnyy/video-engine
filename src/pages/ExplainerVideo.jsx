import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { generateExplainerVideo } from "../services/ai/generateExplainerVideo";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject, updateProject, deleteProject } from "../services/projects/projectService";
import { useProjectsStore } from "../store/useProjectsStore";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import { serverFetch } from "../services/serverApi";
import { ProjectCard } from "./Videos";

const LANGUAGES = [
  { value: "english",  label: "English"  },
  { value: "hindi",    label: "Hindi"    },
  { value: "hinglish", label: "Hinglish" },
];

const LOADING_STEPS = {
  transcribing: "Transcribing audio…",
  segmenting:   "Segmenting into beats…",
  building:     "Building layout…",
};

const sectionLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
  textTransform: "uppercase", marginBottom: 10, color: "#666680",
};

const UploadIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

/* ── Generator form ── */
function GeneratorForm() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const fileRef      = useRef(null);
  const [creditModal, setCreditModal] = useState(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl,  setVideoUrl]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const [language,  setLanguage]  = useState("english");
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState(null);
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);

  const stepMessage = LOADING_STEPS[step] || "Building your video…";
  const canGenerate = !!(videoUrl && !loading && !uploading);

  const uploadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("video/")) {
      setError("Please select a video file (MP4, MOV, or WebM).");
      return;
    }
    setError("");
    setUploading(true);
    setVideoFile(file);
    setVideoUrl(null);

    try {
      const form = new FormData();
      form.append("video", file);
      const res = await serverFetch("/api/upload-avatar", { method: "POST", body: form });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      setVideoUrl(data.url);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
      setVideoFile(null);
    }

    setUploading(false);
  }, []);

  const handleFilePick = e => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRunClick = async () => {
    if (!canGenerate) return;
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.explainer_video;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  };

  const handleRun = async () => {
    setCreditModal(null);
    if (!canGenerate) return;
    setError("");
    setLoading(true);
    setStep("transcribing");

    let projectId;
    try {
      const placeholder = buildSafeProject({
        meta:     { orientation: "9:16", mode: "talking_head" },
        script:   { text: "" },
        audio:    { tts: null, music: null },
        beats:    [],
        workflow: { script_completed: false, beats_initialized: false },
      });
      const saved = await createProject({
        name:        videoFile?.name?.replace(/\.[^.]+$/, "") || "Explainer Video",
        rawAI:       {},
        safeProject: placeholder,
        source:      "explainer",
      });
      projectId = saved.id;

      setStep("segmenting");
      const result = await generateExplainerVideo({ videoFile, videoUrl, language });

      setStep("building");
      const safeProject = buildSafeProject({
        meta:     result.meta,
        script:   result.script,
        audio:    result.audio,
        beats:    result.beats,
        workflow: result.workflow,
        avatar:   result.avatar,
      });

      await updateProject(projectId, safeProject, {
        raw_ai_json: JSON.stringify({
          language,
          video_type:   "explainer",
          avatar_url:   videoUrl,
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
          <div style={{ position: "relative", width: 88, height: 88 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "2px solid rgba(124,92,252,0.15)",
              borderTopColor: "#7c5cfc",
              animation: "ev-spin 1.3s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 20, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,92,252,0.45) 0%, transparent 100%)",
              animation: "ev-pulse 1.8s ease-in-out infinite",
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

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 24, padding: "12px 16px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          fontSize: 13, color: "#f87171",
        }}>
          {error}
        </div>
      )}

      {/* STEP 1 — Upload */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabel}>Step 1 — Upload Your Video</div>
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? "#7c5cfc" : videoUrl ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 14,
            background: dragging ? "rgba(124,92,252,0.06)" : videoUrl ? "rgba(124,92,252,0.04)" : "#0d0d16",
            padding: "44px 24px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={handleFilePick}
          />

          {uploading ? (
            <div>
              <div style={{
                width: 36, height: 36, margin: "0 auto 14px",
                border: "2px solid rgba(124,92,252,0.2)",
                borderTopColor: "#7c5cfc",
                borderRadius: "50%",
                animation: "ev-spin 1s linear infinite",
              }} />
              <div style={{ fontSize: 14, color: "#9090b0" }}>Uploading…</div>
            </div>
          ) : videoUrl ? (
            <div>
              <div style={{ fontSize: 28, color: "#7c5cfc", marginBottom: 10 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", marginBottom: 4 }}>
                {videoFile?.name || "Video uploaded"}
              </div>
              <div style={{ fontSize: 12, color: "#555570" }}>Click to replace</div>
            </div>
          ) : (
            <div>
              <div style={{ color: "#444460", marginBottom: 12 }}>
                <UploadIcon />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#9090b0", marginBottom: 4 }}>
                Drop your video here
              </div>
              <div style={{ fontSize: 12, color: "#444460" }}>
                or click to browse — MP4, MOV, WebM
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2 — Language */}
      <div style={{ marginBottom: 36 }}>
        <div style={sectionLabel}>Step 2 — Language</div>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGUAGES.map(lang => {
            const active = language === lang.value;
            return (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
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

      {/* Generate */}
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
        {loading ? stepMessage : "Build Explainer · 13 credits →"}
      </button>

      {creditModal && (
        <CreditConfirmModal
          service="Explainer Video"
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

  const explainerProjects = projects.filter(p => p.source === "explainer");

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "ev-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (explainerProjects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🎙️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No explainer videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to generate your first one</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {explainerProjects.map(p => (
          <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function ExplainerVideo() {
  const [tab, setTab] = useState("videos");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`
        @keyframes ev-spin  { to { transform: rotate(360deg); } }
        @keyframes ev-pulse {
          0%,100% { opacity: 0.3; transform: scale(0.9); }
          50%     { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>
            Explainer Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 20px",
                  border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
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
