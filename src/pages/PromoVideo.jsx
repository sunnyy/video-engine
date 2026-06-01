import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { serverFetch } from "../services/serverApi";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import AppLayout from "../ui/AppLayout";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#0a0a10",
  surface: "#111118",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#f5c518",
  text:    "#e8e8f0",
  muted:   "#9494a8",
  success: "#22c55e",
  danger:  "#f87171",
};

const C = {
  inp:  { padding: "9px 12px", background: "#35354a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#b0b0cc", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" },
  btnG: { padding: "9px 18px", background: "rgba(255,255,255,0.07)", color: "#c0c0d8", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "tiktok",         label: "TikTok"         },
  { id: "reels",          label: "Reels"          },
  { id: "youtube_shorts", label: "YouTube Shorts" },
  { id: "linkedin",       label: "LinkedIn"       },
];

const LANGUAGES = [
  { id: "en", label: "English" }, { id: "es", label: "Spanish" },
  { id: "fr", label: "French"  }, { id: "de", label: "German"  },
  { id: "pt", label: "Portuguese" }, { id: "hi", label: "Hindi" },
  { id: "ja", label: "Japanese" }, { id: "zh", label: "Chinese" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual",       label: "Casual"       },
  { id: "energetic",    label: "Energetic"    },
  { id: "minimal",      label: "Minimal"      },
];

const DURATIONS = [
  { id: 15, label: "15s" },
  { id: 30, label: "30s" },
  { id: 60, label: "60s" },
  { id: 90, label: "90s" },
];

const STATUS_META = {
  draft:            { label: "Draft",        color: "#9090c0", bg: "rgba(144,144,192,0.12)" },
  script_generated: { label: "Plan Ready",   color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  waiting_assets:   { label: "Needs Assets", color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  assets_ready:     { label: "Assets Ready", color: "#a78bfa", bg: "rgba(124,92,252,0.12)"  },
  ready_for_render: { label: "Queued",       color: "#f5c518", bg: "rgba(245,197,24,0.12)"  },
  rendering:        { label: "Rendering…",   color: "#f5c518", bg: "rgba(245,197,24,0.12)"  },
  rendered:         { label: "Complete",     color: "#4ade80", bg: "rgba(34,197,94,0.12)"   },
  failed:           { label: "Failed",       color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const RENDER_MESSAGES = [
  "Generating your voiceovers…",
  "Assembling scenes…",
  "Rendering video…",
];

const WIZARD_STEPS = ["Video Type", "Setup", "Assets", "Generating"];

// ── Upload helper (client-side Supabase, promo-specific paths) ────────────────
async function uploadPromoFile(file, folder) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const ext  = file.name.split(".").pop();
  const name = `${crypto.randomUUID()}.${ext}`;
  const key  = `${user.id}/promo-${folder}/${name}`;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${supabase.storageUrl}/object/user-assets/${key}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error("Upload failed"));
    xhr.onerror = reject;
    xhr.send(file);
  });
  return `${supabase.storageUrl}/object/public/user-assets/${key}`;
}

// ── Video thumbnail — seeks to first frame so the browser paints it ───────────
function VideoThumb({ src, style }) {
  const ref = useRef();
  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={() => { if (ref.current) ref.current.currentTime = 0.1; }}
      style={style}
    />
  );
}

// ── Small reusables ───────────────────────────────────────────────────────────
function Spinner({ size = 16, color = T.accent }) {
  return (
    <span style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "pv-spin 0.7s linear infinite",
      display: "inline-block",
    }} />
  );
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["yes", "no"].map(opt => {
        const active = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)}
            style={{
              padding: "8px 20px", borderRadius: 8, cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              background: active ? "rgba(245,197,24,0.08)" : "rgba(255,255,255,0.04)",
              border: active ? "1.5px solid rgba(245,197,24,0.35)" : "1.5px solid rgba(255,255,255,0.1)",
              color: active ? T.accent : T.muted,
            }}>
            {opt === "yes" ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

function FileUploadRow({ label, accept, url, uploading, onFile, onClear, inputRef, loadingLabel = "Uploading…", doneLabel = "File ready" }) {
  return (
    <div>
      {url ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
          <span style={{ fontSize: 14 }}>✓</span>
          <span style={{ flex: 1, fontSize: 12, color: T.success, fontWeight: 600 }}>{doneLabel}</span>
          <button onClick={onClear} style={{ ...C.btnG, fontSize: 11, padding: "3px 10px", color: T.danger, borderColor: "rgba(248,113,113,0.2)" }}>Remove</button>
        </div>
      ) : (
        <button disabled={uploading} onClick={() => inputRef.current?.click()}
          style={{ ...C.btnG, display: "flex", alignItems: "center", gap: 8, opacity: uploading ? 0.6 : 1, cursor: uploading ? "not-allowed" : "pointer" }}>
          {uploading ? <Spinner size={12} /> : "↑"}
          {uploading ? loadingLabel : label}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── My Projects tab ───────────────────────────────────────────────────────────
const PAGE_SIZE = 14;

function ProjectsTab({ onCreateNew }) {
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);

  useEffect(() => {
    setLoading(true);
    serverFetch(`/api/promo-video/list?page=${page}&limit=${PAGE_SIZE}`)
      .then(r => r.json())
      .then(d => {
        setProjects(d.projects || []);
        setTotalPages(Math.max(1, Math.ceil((d.total ?? 0) / PAGE_SIZE)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  async function handleDelete(id) {
    try {
      await serverFetch(`/api/promo-video/${id}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {}
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner size={28} />
    </div>
  );

  if (projects.length === 0 && page === 1) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 48 }}>🎬</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No promo videos yet</div>
      <div style={{ fontSize: 14, color: T.muted }}>Create your first one to get started</div>
      <button onClick={onCreateNew} style={{ ...C.btnY, marginTop: 8 }}>Create First Video →</button>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...C.btnG, padding: "7px 14px", fontSize: 13, opacity: page === 1 ? 0.35 : 1 }}>
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{
                width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: n === page ? 800 : 500,
                background: n === page ? T.accent : "rgba(255,255,255,0.06)",
                color:      n === page ? "#000"   : T.muted,
              }}>
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...C.btnG, padding: "7px 14px", fontSize: 13, opacity: page === totalPages ? 0.35 : 1 }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onDelete }) {
  const navigate               = useNavigate();
  const [hov,  setHov]         = useState(false);
  const [conf, setConf]        = useState(false);
  const isComplete             = p.status === "rendered";
  const sm                     = STATUS_META[p.status] || STATUS_META.draft;
  const initial                = (p.product_name || "V")[0].toUpperCase();
  // First scene image asset for non-rendered preview
  const previewImage = !isComplete
    ? (p.scenes?.find(s => s.asset_url && !/\.(mp4|webm|mov)(\?|$)/i.test(s.asset_url))?.asset_url ?? null)
    : null;

  function handleClick() {
    if (isComplete && p.editor_project_id) navigate(`/video-editor/${p.editor_project_id}`);
    else navigate(`/promo-video/${p.id}`);
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (conf) { onDelete(p.id); }
    else { setConf(true); setTimeout(() => setConf(false), 2500); }
  }

  function timeLabel(str) {
    const diff = Math.floor((Date.now() - new Date(str)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7)  return `${diff} days ago`;
    return new Date(str).toLocaleDateString();
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConf(false); }}
      style={{
        background: T.surface, borderRadius: 14, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hov ? "rgba(245,197,24,0.25)" : T.border}`,
        transition: "all 0.2s", transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}>

      {/* Thumbnail */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden", background: "#0b0b14" }}>
        {isComplete && p.video_url ? (
          <VideoThumb src={p.video_url} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : previewImage ? (
          <img src={previewImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #13131f 0%, #1a1a2e 60%, #0d1224 100%)",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color: "rgba(245,197,24,0.6)",
              fontFamily: "'Outfit',sans-serif",
            }}>
              {initial}
            </div>
          </div>
        )}

        {/* Play icon overlay on rendered */}
        {isComplete && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: hov ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.25)", transition: "background 0.2s",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: "rgba(245,197,24,0.92)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "#000", paddingLeft: 2,
              transform: hov ? "scale(1.12)" : "scale(1)", transition: "transform 0.15s",
            }}>▶</div>
          </div>
        )}

        {/* Status badge — only non-complete */}
        {!isComplete && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5,
            background: sm.bg, color: sm.color, backdropFilter: "blur(4px)",
          }}>{sm.label}</div>
        )}

        {/* Delete button — top-left, hover only */}
        <button onClick={handleDelete} title={conf ? "Click again to confirm" : "Delete"}
          style={{
            position: "absolute", top: 8, left: 8,
            width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer",
            background: conf ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.55)",
            color: conf ? "#fff" : "#999", fontSize: 13, fontWeight: 700,
            opacity: hov ? 1 : 0, transition: "opacity 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>
          {conf ? "!" : "✕"}
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: "11px 13px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
          {p.product_name}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
          {p.video_type === "talking_head" ? "Talking Head" : "Faceless"}
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "#55556a" }}>
          {p.duration_seconds && <span style={{ color: "#7070a0", fontWeight: 600 }}>{p.duration_seconds}s</span>}
          {p.total_scenes ? <span style={{ marginLeft: 4 }}>· {p.total_scenes} scenes</span> : null}
          <span style={{ marginLeft: "auto" }}>{p.created_at ? timeLabel(p.created_at) : ""}</span>
        </div>
      </div>
    </div>
  );
}

// ── Create wizard ─────────────────────────────────────────────────────────────
function CreateWizard({ prefill, initialState, onViewProjects }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 — Product Info
  const [productName, setProductName] = useState(prefill?.product_name ?? "Vidquence");
  const [productUrl,  setProductUrl]  = useState(prefill?.product_url ?? "https://vidquence.com/");
  const [productDesc, setProductDesc] = useState(prefill?.product_description ?? "Vidquence is a full-stack AI-powered short-form video creation platform built for content creators, marketers, and agencies. At its core is an automated video generation engine that takes a topic or script, runs it through a multi-stage AI pipeline — script generation, beat classification, layout selection, asset sourcing, DNA-based styling — and produces a complete 9:16 video ready for TikTok, Instagram Reels, and YouTube Shorts.");
  const [platform,    setPlatform]    = useState(prefill?.target_platform ?? "tiktok");
  const [duration,    setDuration]    = useState(prefill?.duration_seconds ?? 15);
  const [language,    setLanguage]    = useState(prefill?.language ?? "en");
  const [tone,        setTone]        = useState(prefill?.tone ?? "professional");
  const [logoUrl,     setLogoUrl]     = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const logoRef = useRef();

  // Step 2 — Video Type
  const [videoType,    setVideoType]    = useState("faceless");
  const [hasTHVideo,   setHasTHVideo]   = useState(null); // null | "yes" | "no"
  const [thUrl,        setThUrl]        = useState(null);
  const [thLoading,    setThLoading]    = useState(false);
  const [hasScript,    setHasScript]    = useState(null);
  const [scriptText,   setScriptText]   = useState("");
  const [hasVoiceover, setHasVoiceover] = useState(null);
  const [voUrl,        setVoUrl]        = useState(null);
  const [voLoading,    setVoLoading]    = useState(false);
  const thRef = useRef();
  const voRef = useRef();

  // Step 3 — Asset Collection
  const [projectId,     setProjectId]     = useState(null);
  const [assetManifest, setAssetManifest] = useState(null);
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [uploadStatus,  setUploadStatus]  = useState({});
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState("");
  const sceneFileRefs   = useRef({});
  const createdRef      = useRef(false);
  const thFileRef       = useRef(null);   // local File object — uploaded to Supabase only at render time
  const bgTranscribeRef = useRef(null);   // in-flight /transcribe-th promise

  // Step 4 — Generating
  const [msgIdx,       setMsgIdx]       = useState(0);
  const [renderError,  setRenderError]  = useState("");
  const pollRef = useRef(null);

  // Reset prefill when it changes
  useEffect(() => {
    if (!prefill) return;
    setProductName(prefill.product_name ?? "");
    setProductUrl(prefill.product_url ?? "");
    setProductDesc(prefill.product_description ?? "");
    setPlatform(prefill.target_platform ?? "tiktok");
    setDuration(prefill.duration_seconds ?? 30);
    setLanguage(prefill.language ?? "en");
    setTone(prefill.tone ?? "professional");
    setStep(0);
  }, [prefill]);

  // Resume an existing project loaded from URL param
  useEffect(() => {
    if (!initialState?.project) return;
    const p = initialState.project;

    // Pre-fill step 1 fields so Back navigation works
    setProductName(p.product_name || "");
    setProductUrl(p.product_url || "");
    setProductDesc(p.product_description || "");
    setPlatform(p.target_platform || "tiktok");
    setDuration(p.duration_seconds || 30);
    setLanguage(p.language || "en");
    setTone(p.tone || "professional");
    if (p.video_type === "talking_head" || p.has_talking_head) setVideoType("talking_head");

    setProjectId(p.id);

    const s = p.status;
    if (s === "script_generated" || s === "waiting_assets" || s === "assets_ready") {
      if (initialState.assetManifest) setAssetManifest(initialState.assetManifest);
      setStep(2);
    } else if (s === "ready_for_render" || s === "rendering") {
      setStep(3);
    } else if (s === "rendered" && p.editor_project_id) {
      navigate(`/video-editor/${p.editor_project_id}`, { replace: true });
    }
    // "draft" → stay on step 0 with pre-filled form
  }, [initialState]);

  // Step 4: status message cycling
  useEffect(() => {
    if (step !== 3 || renderError) return;
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % RENDER_MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, [step, renderError]);

  // Step 4: polling
  useEffect(() => {
    if (step !== 3 || !projectId || renderError) return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await serverFetch(`/api/promo-video/${projectId}`);
        const data = await res.json();
        const p    = data.project;
        if (!p) return;
        if (p.status === "rendered") {
          clearInterval(pollRef.current);
          if (p.editor_project_id) {
            navigate(`/video-editor/${p.editor_project_id}`, { replace: true });
          } else if (p.video_url) {
            window.open(p.video_url, "_blank");
            setRenderError("Video ready — editor project not created. Video opened in new tab.");
          } else {
            setRenderError("Render completed but no output found. Check the dashboard.");
          }
        } else if (p.status === "failed") {
          clearInterval(pollRef.current);
          setRenderError(p.error_message || "Render failed. Please try again.");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [step, projectId, renderError]);

  // Derived validation
  const step1ValidTH = !!thUrl;
  const step1ValidFaceless =
    productName.trim().length > 0 && productDesc.trim().length > 0 &&
    (hasVoiceover === "yes" && !!voUrl ||
     hasVoiceover === "no" && hasScript === "yes" && scriptText.trim().length > 0 ||
     hasVoiceover === "no" && hasScript === "no");
  const step1Valid = videoType === "talking_head" ? step1ValidTH : step1ValidFaceless;

  // ── File upload helpers ──
  async function handleLogoFile(file) {
    setLogoLoading(true);
    try { setLogoUrl(await uploadPromoFile(file, "logos")); }
    catch { /* ignore */ }
    setLogoLoading(false);
  }

  async function handleThFile(file) {
    setThLoading(true);
    thFileRef.current = file;
    try {
      // Send file directly to server — no Supabase roundtrip
      bgTranscribeRef.current = serverFetch("/api/promo-video/transcribe-th", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "video/mp4",
          "X-File-Ext":   file.name.split(".").pop(),
        },
        body: file,
      }).then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed");
        return data;
      });
      await bgTranscribeRef.current;
      setThUrl("ready"); // sentinel — actual file is in thFileRef
    } catch (e) {
      console.error("[handleThFile]", e.message);
      thFileRef.current   = null;
      bgTranscribeRef.current = null;
      setThUrl(null);
    }
    setThLoading(false);
  }

  async function handleVoFile(file) {
    setVoLoading(true);
    try { setVoUrl(await uploadPromoFile(file, "voiceovers")); }
    catch { /* ignore */ }
    setVoLoading(false);
  }

  // ── Create project (Step 3) ──
  async function createProject() {
    setCreating(true);
    setCreateError("");
    try {
      const isTH = videoType === "talking_head";

      // For TH: transcription already in flight — await it here (usually already done)
      let thSegments = null;
      if (isTH && bgTranscribeRef.current) {
        const transcribeResult = await bgTranscribeRef.current;
        thSegments = transcribeResult.scenes;
      }

      const payload = {
        project_id:              projectId || undefined, // update existing draft if available
        video_type:              isTH ? "talking_head" : "faceless",
        video_goal:              isTH ? "onboarding_demo" : "saas_promo",
        product_name:            productName.trim(),
        product_url:             productUrl.trim() || null,
        product_description:     productDesc.trim(),
        target_platform:         platform,
        language,
        tone,
        duration_seconds:        duration,
        has_talking_head:        isTH && hasTHVideo === "yes",
        has_voiceover:           !isTH && hasVoiceover === "yes",
        has_script:              !isTH && (hasVoiceover === "yes" || hasScript === "yes"),
        has_logo:                !!logoUrl,
        has_screenshots:         false,
        has_recordings:          false,
        talking_head_segments:   thSegments,
        talking_head_url:        null,
        voiceover_url:           voUrl   || null,
        logo_url:                logoUrl || null,
        script:                  !isTH && hasVoiceover !== "yes" && hasScript === "yes" ? scriptText : null,
      };

      const res  = await serverFetch("/api/promo-video/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate scene plan");

      setProjectId(data.project.id);
      setAssetManifest(data.assetManifest);

      // Auto-upload pre-staged voiceover / logo files to matching scenes
      const required = data.assetManifest?.user_required || [];
      const autoUploads = [];
      for (const item of required) {
        let url = null;
        if (item.asset_type === "user_recording_audio" && voUrl) url = voUrl;
        if (item.scene_type === "logo_outro" && logoUrl) url = logoUrl;
        if (url) autoUploads.push(autoUploadScene(data.project.id, item.scene_id, url));
      }
      if (autoUploads.length) {
        await Promise.allSettled(autoUploads);
        const freshRes  = await serverFetch(`/api/promo-video/${data.project.id}`);
        const freshData = await freshRes.json();
        if (freshData.assetManifest) setAssetManifest(freshData.assetManifest);
      }
      return true;
    } catch (e) {
      setCreateError(e.message);
      return false;
    } finally {
      setCreating(false);
    }
  }

  async function autoUploadScene(pid, sceneId, url) {
    await serverFetch(`/api/promo-video/${pid}/upload-asset`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ scene_id: sceneId, asset_url: url }),
    });
  }

  // ── Per-scene upload ──
  function getSceneRef(sceneId) {
    if (!sceneFileRefs.current[sceneId]) sceneFileRefs.current[sceneId] = { current: null };
    return sceneFileRefs.current[sceneId];
  }

  async function handleSceneFile(sceneId, file) {
    setUploadStatus(s => ({ ...s, [sceneId]: "uploading" }));
    try {
      const asset = await uploadUserAsset(file, null, null, "project", projectId);
      const res   = await serverFetch(`/api/promo-video/${projectId}/upload-asset`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scene_id: sceneId, asset_url: asset.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAssetManifest(data.assetManifest);
      setUploadStatus(s => ({ ...s, [sceneId]: "done" }));
    } catch {
      setUploadStatus(s => ({ ...s, [sceneId]: "error" }));
    }
  }

  // ── Generate video ──
  async function handleGenerate() {
    setGenerating(true);
    setGenError("");
    try {
      // TH: upload local file to Supabase now (deferred from creation time)
      let thUploadedUrl = null;
      if (videoType === "talking_head" && thFileRef.current) {
        thUploadedUrl = await uploadPromoFile(thFileRef.current, "talking-head");
      }

      const res = await serverFetch(`/api/promo-video/${projectId}/render`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ talking_head_url: thUploadedUrl }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to start render");
      }
      setStep(3);
    } catch (e) {
      setGenError(e.message);
    }
    setGenerating(false);
  }

  // ── Step indicator ──
  function StepBar() {
    if (step === 3) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
        {WIZARD_STEPS.slice(0, 3).map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, flexShrink: 0,
                background: i < step ? "rgba(34,197,94,0.2)" : i === step ? T.accent : "rgba(255,255,255,0.06)",
                color:      i < step ? T.success           : i === step ? "#000"  : "#55556a",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 700 : 500, color: i === step ? T.accent : i < step ? T.success : "#55556a", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: i < step ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)", margin: "0 10px" }} />}
          </div>
        ))}
      </div>
    );
  }

  // ── Render ──
  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
        <StepBar />

        {/* ─── Step 0: Video Type ─── */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>What kind of video?</div>
              <div style={{ fontSize: 14, color: T.muted }}>Choose the style that fits your brand.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { id: "faceless",     icon: "🎬", title: "Faceless",      desc: "Stock footage, captions, and AI voiceover. No camera required." },
                { id: "talking_head", icon: "🎥", title: "Talking Head",  desc: "You on camera. Personal, direct, and authentic." },
              ].map(({ id, icon, title, desc }) => (
                <button key={id} onClick={() => setVideoType(id)}
                  style={{
                    padding: 28, borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    background: videoType === id ? "rgba(245,197,24,0.06)" : "rgba(255,255,255,0.02)",
                    border: videoType === id ? "2px solid rgba(245,197,24,0.55)" : "2px solid rgba(255,255,255,0.1)",
                  }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: videoType === id ? T.accent : T.text, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(1)} style={{ ...C.btnY, width: "100%", padding: "13px 24px", fontSize: 15 }}>
              Next: Setup →
            </button>
          </div>
        )}

        {/* ─── Step 1: Type-specific setup ─── */}
        {step === 1 && videoType === "talking_head" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

            <div>
              <label style={C.lbl}>Upload Your Video <span style={{ color: T.danger }}>*</span></label>
              <FileUploadRow
                label="Upload talking head video" accept="video/*"
                url={thUrl} uploading={thLoading}
                loadingLabel="Transcribing…"
                doneLabel="Video ready — transcription done"
                onFile={handleThFile}
                onClear={() => { setThUrl(null); thFileRef.current = null; bgTranscribeRef.current = null; }}
                inputRef={thRef} />
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Your audio becomes the voiceover. We transcribe it automatically.</div>
            </div>

            <div>
              <label style={C.lbl}>Product Name <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional — used for branding)</span></label>
              <input style={C.inp} value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Vidquence" maxLength={80} />
            </div>

            <div>
              <label style={C.lbl}>Target Platform</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    style={{ padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                      background: platform === p.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.04)",
                      border: platform === p.id ? "1.5px solid rgba(245,197,24,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                      color: platform === p.id ? T.accent : T.muted }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={C.lbl}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label style={C.lbl}>Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={C.lbl}>Logo <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <FileUploadRow label="Upload Logo" accept="image/*" url={logoUrl} uploading={logoLoading}
                onFile={handleLogoFile} onClear={() => setLogoUrl(null)} inputRef={logoRef} />
            </div>

            {createError && (
              <div style={{ padding: "14px 18px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
                ✕ {createError}
                <button onClick={() => setCreateError("")} style={{ ...C.btnG, fontSize: 11, padding: "3px 10px", marginLeft: 12 }}>Dismiss</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button
                onClick={async () => { const ok = await createProject(); if (ok) setStep(2); }}
                disabled={!step1ValidTH || creating}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15, opacity: step1ValidTH && !creating ? 1 : 0.4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {creating ? <><Spinner size={14} color="#000" /> Building plan…</> : "Next: Review Assets →"}
              </button>
            </div>
          </div>
        )}

        {step === 1 && videoType === "faceless" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

            <div>
              <label style={C.lbl}>Product Name <span style={{ color: T.danger }}>*</span></label>
              <input style={C.inp} value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Vidquence" maxLength={80} />
            </div>

            <div>
              <label style={C.lbl}>Product URL <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <input style={C.inp} value={productUrl} onChange={e => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com" />
            </div>

            <div>
              <label style={C.lbl}>Product Description <span style={{ color: T.danger }}>*</span></label>
              <textarea style={{ ...C.inp, resize: "vertical", minHeight: 90, lineHeight: 1.5 }}
                value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="What does your product do? What problem does it solve?"
                maxLength={500} />
              <div style={{ fontSize: 11, color: "#55556a", marginTop: 3, textAlign: "right" }}>{productDesc.length}/500</div>
            </div>

            <div>
              <label style={C.lbl}>Target Platform</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    style={{
                      padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                      background: platform === p.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.04)",
                      border: platform === p.id ? "1.5px solid rgba(245,197,24,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                      color: platform === p.id ? T.accent : T.muted,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={C.lbl}>Duration</label>
              <div style={{ display: "flex", gap: 10 }}>
                {DURATIONS.map(d => (
                  <button key={d.id} onClick={() => setDuration(d.id)}
                    style={{
                      flex: 1, padding: "14px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 15, fontWeight: 800,
                      background: duration === d.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.03)",
                      border: duration === d.id ? "1.5px solid rgba(245,197,24,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                      color: duration === d.id ? T.accent : T.muted,
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={C.lbl}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label style={C.lbl}>Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={C.lbl}>Logo <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional — adds a logo outro scene)</span></label>
              <FileUploadRow
                label="Upload Logo" accept="image/*"
                url={logoUrl} uploading={logoLoading}
                onFile={handleLogoFile}
                onClear={() => setLogoUrl(null)}
                inputRef={logoRef} />
            </div>

            <div>
              <label style={C.lbl}>Product Description <span style={{ color: T.danger }}>*</span></label>
              <textarea style={{ ...C.inp, resize: "vertical", minHeight: 90, lineHeight: 1.5 }}
                value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="What does your product do? What problem does it solve?" maxLength={500} />
              <div style={{ fontSize: 11, color: "#55556a", marginTop: 3, textAlign: "right" }}>{productDesc.length}/500</div>
            </div>

            <div>
              <label style={C.lbl}>Target Platform</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    style={{ padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                      background: platform === p.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.04)",
                      border: platform === p.id ? "1.5px solid rgba(245,197,24,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                      color: platform === p.id ? T.accent : T.muted }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={C.lbl}>Duration</label>
              <div style={{ display: "flex", gap: 10 }}>
                {DURATIONS.map(d => (
                  <button key={d.id} onClick={() => setDuration(d.id)}
                    style={{ flex: 1, padding: "14px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 15, fontWeight: 800,
                      background: duration === d.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.03)",
                      border: duration === d.id ? "1.5px solid rgba(245,197,24,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                      color: duration === d.id ? T.accent : T.muted }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={C.lbl}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label style={C.lbl}>Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={C.lbl}>Logo <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <FileUploadRow label="Upload Logo" accept="image/*" url={logoUrl} uploading={logoLoading}
                onFile={handleLogoFile} onClear={() => setLogoUrl(null)} inputRef={logoRef} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px", background: T.surface, borderRadius: 12, border: `1px solid ${T.border}` }}>
              <label style={{ ...C.lbl, marginBottom: 6 }}>Do you have a voiceover recording?</label>
              <YesNo value={hasVoiceover} onChange={v => { setHasVoiceover(v); if (v === "yes") { setHasScript(null); setScriptText(""); } }} />
              {hasVoiceover === "yes" && (
                <div style={{ marginTop: 8 }}>
                  <FileUploadRow label="Upload voiceover" accept="audio/*" url={voUrl} uploading={voLoading}
                    onFile={handleVoFile} onClear={() => setVoUrl(null)} inputRef={voRef} />
                </div>
              )}
              {hasVoiceover === "no" && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ ...C.lbl, marginBottom: 6 }}>Do you have a script?</label>
                  <YesNo value={hasScript} onChange={setHasScript} />
                  {hasScript === "yes" && (
                    <textarea style={{ ...C.inp, marginTop: 6, resize: "vertical", minHeight: 80, lineHeight: 1.5 }}
                      placeholder="Paste your script here…" value={scriptText} onChange={e => setScriptText(e.target.value)} />
                  )}
                  {hasScript === "no" && (
                    <div style={{ fontSize: 11, color: T.muted }}>AI will write the script and voiceover automatically.</div>
                  )}
                </div>
              )}
            </div>

            {createError && (
              <div style={{ padding: "14px 18px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
                ✕ {createError}
                <button onClick={() => setCreateError("")} style={{ ...C.btnG, fontSize: 11, padding: "3px 10px", marginLeft: 12 }}>Dismiss</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button
                onClick={async () => { const ok = await createProject(); if (ok) setStep(2); }}
                disabled={!step1ValidFaceless || creating}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15, opacity: step1ValidFaceless && !creating ? 1 : 0.4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {creating ? <><Spinner size={14} color="#000" /> Building plan…</> : "Next: Review Assets →"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Asset Collection ─── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {assetManifest && (
              <>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 6 }}>
                    {(assetManifest.user_required || []).length === 0
                      ? "Ready to generate your video"
                      : "Your video needs these assets"}
                  </div>
                  {(assetManifest.user_required || []).length > 0 && (
                    <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                      Upload what you have. Skip anything — you can add it in the editor later.
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(assetManifest.user_required || []).map((item) => {
                    const upSt = uploadStatus[item.scene_id];
                    const isDone = item.status === "resolved" || upSt === "done";
                    const ref   = getSceneRef(item.scene_id);
                    return (
                      <div key={item.scene_id} style={{ background: T.surface, border: `1px solid ${isDone ? "rgba(34,197,94,0.2)" : T.border}`, borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid rgba(255,255,255,0.05)`, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.muted, flexShrink: 0 }}>
                            {item.scene_id}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.06)", color: "#9090c0" }}>
                            {(item.scene_type || "scene").toUpperCase()}
                          </span>
                          {isDone && <span style={{ fontSize: 12, color: T.success, marginLeft: "auto" }}>✓ Uploaded</span>}
                        </div>
                        <div style={{ padding: "14px 16px" }}>
                          {item.asset_hint && (
                            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
                              {item.asset_hint}
                            </div>
                          )}
                          {!isDone && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button
                                  disabled={upSt === "uploading"}
                                  onClick={() => ref.current?.click()}
                                  style={{ ...C.btnG, fontSize: 12, padding: "7px 16px", display: "flex", alignItems: "center", gap: 6, opacity: upSt === "uploading" ? 0.6 : 1, cursor: upSt === "uploading" ? "not-allowed" : "pointer" }}>
                                  {upSt === "uploading" ? <Spinner size={12} /> : "↑"}
                                  {upSt === "uploading" ? "Uploading…" : "Upload File"}
                                </button>
                                {upSt === "error" && <span style={{ fontSize: 11, color: T.danger }}>Failed — try again</span>}
                              </div>
                              <button onClick={() => setUploadStatus(s => ({ ...s, [item.scene_id]: "done" }))}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.muted, textAlign: "left", padding: 0, textDecoration: "underline" }}>
                                Skip — add in editor later
                              </button>
                            </div>
                          )}
                          <input ref={el => { ref.current = el; }} type="file" accept="image/*,video/*,audio/*" style={{ display: "none" }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleSceneFile(item.scene_id, f); e.target.value = ""; }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {genError && (
                  <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 13, color: T.danger }}>
                    ✕ {genError}
                  </div>
                )}

                {(() => {
                  const required = assetManifest.user_required || [];
                  const anyUploading = required.some(item => uploadStatus[item.scene_id] === "uploading");
                  const allDecided  = required.every(item =>
                    item.status === "resolved" ||
                    uploadStatus[item.scene_id] === "done" ||
                    uploadStatus[item.scene_id] === "error"
                  );
                  const canGenerate = !generating && !anyUploading && allDecided;
                  return (
                    <button onClick={handleGenerate} disabled={!canGenerate}
                      style={{ ...C.btnY, width: "100%", padding: "15px 24px", fontSize: 16, opacity: canGenerate ? 1 : 0.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: canGenerate ? "pointer" : "not-allowed" }}>
                      {generating    ? <><Spinner size={16} color="#000" /> Starting…</>   :
                       anyUploading  ? <><Spinner size={16} color="#000" /> Uploading…</>  :
                       !allDecided   ? "Upload or skip each asset to continue"             :
                       "✦ Generate Video"}
                    </button>
                  );
                })()}

                <div style={{ fontSize: 11, color: "#55556a", textAlign: "center" }}>
                  Skipped assets will appear as placeholders in the editor.
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button onClick={() => { setStep(1); }} style={{ ...C.btnG, fontSize: 12, padding: "6px 16px" }}>
                    ← Back
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step 4: Generating ─── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, paddingTop: 60, textAlign: "center" }}>
            {!renderError ? (
              <>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(245,197,24,0.15)" }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: T.accent, animation: "pv-spin 1s linear infinite" }} />
                  <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: "rgba(245,197,24,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    🎬
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 10 }}>
                    Creating Your Video
                  </div>
                  <div style={{ fontSize: 15, color: T.accent, fontWeight: 600, minHeight: 24 }}>
                    {RENDER_MESSAGES[msgIdx]}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, maxWidth: 380 }}>
                  This usually takes 2–5 minutes. You'll be taken directly to the editor when it's ready.
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {RENDER_MESSAGES.map((_, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === msgIdx ? T.accent : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48 }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>Render Failed</div>
                  <div style={{ fontSize: 13, color: T.muted, maxWidth: 380, lineHeight: 1.6 }}>
                    {renderError}
                  </div>
                </div>
                <button onClick={() => { setStep(0); setRenderError(""); setProjectId(null); setAssetManifest(null); createdRef.current = false; }}
                  style={{ ...C.btnY, padding: "11px 28px" }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PromoVideo() {
  const navigate                          = useNavigate();
  const { projectId: paramProjectId }     = useParams();
  const [tab,          setTab]            = useState("create");
  const [prefill,      setPrefill]        = useState(null);
  const [initialState, setInitialState]   = useState(null);

  // When URL has a projectId, fetch the project and resume
  useEffect(() => {
    if (!paramProjectId) return;
    setTab("create");
    serverFetch(`/api/promo-video/${paramProjectId}`)
      .then(r => r.json())
      .then(d => {
        if (d.project) setInitialState({ project: d.project, assetManifest: d.assetManifest });
      })
      .catch(() => {});
  }, [paramProjectId]);

  function handleRetry(project) {
    setPrefill(project);
    setInitialState(null);
    setTab("create");
  }

  function handleCreateNew() {
    setInitialState(null);
    setPrefill(null);
    window.history.replaceState({}, "", "/promo-video");
    setTab("create");
  }

  const tabs = [
    { id: "projects", label: "My Projects" },
    { id: "create",   label: "Create New"  },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Promo Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => t.id === "create" ? handleCreateNew() : setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(245,197,24,0.1)" : "transparent",
                  color:      tab === t.id ? T.accent : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif", cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "projects"
          ? <ProjectsTab onCreateNew={handleCreateNew} />
          : <CreateWizard
              key={initialState?.project?.id ?? prefill?.id ?? "new"}
              prefill={prefill}
              initialState={initialState}
              onViewProjects={() => setTab("projects")}
            />
        }
      </div>
    </AppLayout>
  );
}
